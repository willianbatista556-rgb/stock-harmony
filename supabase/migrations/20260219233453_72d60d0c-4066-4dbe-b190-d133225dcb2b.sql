
-- 1. New RPC: transferencia_enviar (debit origin, set em_transito)
CREATE OR REPLACE FUNCTION public.transferencia_enviar(p_transferencia_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_empresa_id uuid;
  v_origem_id uuid;
  v_destino_id uuid;
  v_status text;
  v_item RECORD;
  v_saldo_atual numeric;
BEGIN
  SELECT empresa_id, origem_id, destino_id, status
    INTO v_empresa_id, v_origem_id, v_destino_id, v_status
  FROM transferencias
  WHERE id = p_transferencia_id AND empresa_id = get_user_empresa_id(auth.uid());

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Transferência não encontrada ou sem permissão';
  END IF;

  IF v_status != 'pendente' THEN
    RAISE EXCEPTION 'Transferência precisa estar pendente para enviar (status: %)', v_status;
  END IF;

  FOR v_item IN SELECT * FROM transferencia_itens WHERE transferencia_id = p_transferencia_id
  LOOP
    INSERT INTO estoque_saldos (empresa_id, local_id, produto_id, saldo)
    VALUES (v_empresa_id, v_origem_id, v_item.produto_id, 0)
    ON CONFLICT (empresa_id, local_id, produto_id) DO NOTHING;

    SELECT saldo INTO v_saldo_atual
    FROM estoque_saldos
    WHERE empresa_id = v_empresa_id AND local_id = v_origem_id AND produto_id = v_item.produto_id
    FOR UPDATE;

    IF COALESCE(v_saldo_atual, 0) < v_item.qtd THEN
      RAISE EXCEPTION 'Estoque insuficiente de "%" na origem (disponível: %, solicitado: %)',
        COALESCE(v_item.nome_snapshot, v_item.produto_id::text), COALESCE(v_saldo_atual, 0), v_item.qtd;
    END IF;

    UPDATE estoque_saldos SET saldo = saldo - v_item.qtd, updated_at = now()
    WHERE empresa_id = v_empresa_id AND local_id = v_origem_id AND produto_id = v_item.produto_id;

    INSERT INTO movimentacoes_estoque (empresa_id, local_id, produto_id, origem, ref_id, tipo, quantidade, usuario_id)
    VALUES (v_empresa_id, v_origem_id, v_item.produto_id, 'transferencia', p_transferencia_id, 'saida', v_item.qtd, auth.uid());

    INSERT INTO movimentacoes (empresa_id, produto_id, deposito_id, origem, ref_id, tipo, qtd, usuario_id, observacao)
    VALUES (v_empresa_id, v_item.produto_id, v_origem_id, 'transferencia', p_transferencia_id, 'saida', -v_item.qtd, auth.uid(), 'Transferência enviada (em trânsito)');
  END LOOP;

  UPDATE transferencias SET status = 'em_transito' WHERE id = p_transferencia_id;
END;
$$;

-- 2. Update transferencia_confirmar: only credits destination
CREATE OR REPLACE FUNCTION public.transferencia_confirmar(p_transferencia_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_empresa_id uuid;
  v_destino_id uuid;
  v_status text;
  v_item RECORD;
BEGIN
  SELECT empresa_id, destino_id, status
    INTO v_empresa_id, v_destino_id, v_status
  FROM transferencias
  WHERE id = p_transferencia_id AND empresa_id = get_user_empresa_id(auth.uid());

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Transferência não encontrada ou sem permissão';
  END IF;

  IF v_status != 'em_transito' THEN
    RAISE EXCEPTION 'Transferência precisa estar em trânsito para confirmar recebimento (status: %)', v_status;
  END IF;

  FOR v_item IN SELECT * FROM transferencia_itens WHERE transferencia_id = p_transferencia_id
  LOOP
    INSERT INTO estoque_saldos (empresa_id, local_id, produto_id, saldo)
    VALUES (v_empresa_id, v_destino_id, v_item.produto_id, v_item.qtd)
    ON CONFLICT (empresa_id, local_id, produto_id) DO UPDATE SET saldo = estoque_saldos.saldo + v_item.qtd, updated_at = now();

    INSERT INTO movimentacoes_estoque (empresa_id, local_id, produto_id, origem, ref_id, tipo, quantidade, usuario_id)
    VALUES (v_empresa_id, v_destino_id, v_item.produto_id, 'transferencia', p_transferencia_id, 'entrada', v_item.qtd, auth.uid());

    INSERT INTO movimentacoes (empresa_id, produto_id, deposito_id, origem, ref_id, tipo, qtd, usuario_id, observacao)
    VALUES (v_empresa_id, v_item.produto_id, v_destino_id, 'transferencia', p_transferencia_id, 'entrada', v_item.qtd, auth.uid(), 'Transferência recebida (confirmada)');
  END LOOP;

  UPDATE transferencias
  SET status = 'confirmada', confirmado_por = auth.uid(), confirmado_em = now()
  WHERE id = p_transferencia_id;
END;
$$;

-- 3. Update transferencia_cancelar: reverse origin debit if em_transito
CREATE OR REPLACE FUNCTION public.transferencia_cancelar(p_transferencia_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_empresa_id uuid;
  v_origem_id uuid;
  v_status text;
  v_item RECORD;
BEGIN
  SELECT empresa_id, origem_id, status INTO v_empresa_id, v_origem_id, v_status
  FROM transferencias
  WHERE id = p_transferencia_id AND empresa_id = get_user_empresa_id(auth.uid());

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Transferência não encontrada ou sem permissão';
  END IF;

  IF v_status NOT IN ('pendente', 'em_transito') THEN
    RAISE EXCEPTION 'Só é possível cancelar transferências pendentes ou em trânsito (status: %)', v_status;
  END IF;

  IF v_status = 'em_transito' THEN
    FOR v_item IN SELECT * FROM transferencia_itens WHERE transferencia_id = p_transferencia_id
    LOOP
      UPDATE estoque_saldos SET saldo = saldo + v_item.qtd, updated_at = now()
      WHERE empresa_id = v_empresa_id AND local_id = v_origem_id AND produto_id = v_item.produto_id;

      INSERT INTO movimentacoes_estoque (empresa_id, local_id, produto_id, origem, ref_id, tipo, quantidade, usuario_id)
      VALUES (v_empresa_id, v_origem_id, v_item.produto_id, 'transferencia_cancelamento', p_transferencia_id, 'entrada', v_item.qtd, auth.uid());

      INSERT INTO movimentacoes (empresa_id, produto_id, deposito_id, origem, ref_id, tipo, qtd, usuario_id, observacao)
      VALUES (v_empresa_id, v_item.produto_id, v_origem_id, 'transferencia_cancelamento', p_transferencia_id, 'entrada', v_item.qtd, auth.uid(), 'Cancelamento de transferência em trânsito');
    END LOOP;
  END IF;

  UPDATE transferencias SET status = 'cancelada' WHERE id = p_transferencia_id;
END;
$$;

-- 4. Update transferencia_criar: always pendente (full flow)
CREATE OR REPLACE FUNCTION public.transferencia_criar(p_empresa_id uuid, p_origem_id uuid, p_destino_id uuid, p_itens jsonb, p_imediata boolean DEFAULT false, p_observacao text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_transf_id uuid;
  v_item jsonb;
  v_produto_nome text;
BEGIN
  IF p_empresa_id != get_user_empresa_id(auth.uid()) THEN
    RAISE EXCEPTION 'Empresa não corresponde ao usuário';
  END IF;

  IF p_origem_id = p_destino_id THEN
    RAISE EXCEPTION 'Origem e destino devem ser diferentes';
  END IF;

  INSERT INTO transferencias (empresa_id, origem_id, destino_id, usuario_id, status, observacao)
  VALUES (p_empresa_id, p_origem_id, p_destino_id, auth.uid(), 'pendente', p_observacao)
  RETURNING id INTO v_transf_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    SELECT nome INTO v_produto_nome FROM produtos
    WHERE id = (v_item->>'produto_id')::uuid AND empresa_id = p_empresa_id AND ativo = true;

    IF v_produto_nome IS NULL THEN
      RAISE EXCEPTION 'Produto % não encontrado ou inativo', (v_item->>'produto_id');
    END IF;

    INSERT INTO transferencia_itens (transferencia_id, produto_id, qtd, nome_snapshot)
    VALUES (v_transf_id, (v_item->>'produto_id')::uuid, (v_item->>'qtd')::numeric, v_produto_nome);
  END LOOP;

  RETURN v_transf_id;
END;
$$;
