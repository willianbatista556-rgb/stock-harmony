
-- Updated flow: rascunho → pendente_envio → em_recebimento → confirmada
-- Stock only moves on confirmada (debit origin + credit destination atomically)

CREATE OR REPLACE FUNCTION public.transferencia_criar(
  p_empresa_id uuid, p_origem_id uuid, p_destino_id uuid,
  p_itens jsonb, p_imediata boolean DEFAULT false, p_observacao text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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
  VALUES (p_empresa_id, p_origem_id, p_destino_id, auth.uid(), 'rascunho', p_observacao)
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

-- Enviar: rascunho → pendente_envio (no stock movement)
CREATE OR REPLACE FUNCTION public.transferencia_enviar(p_transferencia_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_empresa_id uuid;
  v_status text;
BEGIN
  SELECT empresa_id, status INTO v_empresa_id, v_status
  FROM transferencias
  WHERE id = p_transferencia_id AND empresa_id = get_user_empresa_id(auth.uid());

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Transferência não encontrada ou sem permissão';
  END IF;
  IF v_status != 'rascunho' THEN
    RAISE EXCEPTION 'Transferência precisa estar em rascunho para enviar (status: %)', v_status;
  END IF;

  UPDATE transferencias SET status = 'pendente_envio' WHERE id = p_transferencia_id;
END;
$$;

-- Receber: pendente_envio → em_recebimento (no stock movement, just marks receiving)
CREATE OR REPLACE FUNCTION public.transferencia_receber(p_transferencia_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_empresa_id uuid;
  v_status text;
BEGIN
  SELECT empresa_id, status INTO v_empresa_id, v_status
  FROM transferencias
  WHERE id = p_transferencia_id AND empresa_id = get_user_empresa_id(auth.uid());

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Transferência não encontrada ou sem permissão';
  END IF;
  IF v_status != 'pendente_envio' THEN
    RAISE EXCEPTION 'Transferência precisa estar pendente de envio para receber (status: %)', v_status;
  END IF;

  UPDATE transferencias SET status = 'em_recebimento' WHERE id = p_transferencia_id;
END;
$$;

-- Confirmar: em_recebimento → confirmada (debit origin + credit destination)
CREATE OR REPLACE FUNCTION public.transferencia_confirmar(p_transferencia_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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
  IF v_status != 'em_recebimento' THEN
    RAISE EXCEPTION 'Transferência precisa estar em recebimento para confirmar (status: %)', v_status;
  END IF;

  FOR v_item IN SELECT * FROM transferencia_itens WHERE transferencia_id = p_transferencia_id
  LOOP
    -- Debit origin
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
    VALUES (v_empresa_id, v_item.produto_id, v_origem_id, 'transferencia', p_transferencia_id, 'saida', -v_item.qtd, auth.uid(), 'Transferência confirmada (saída origem)');

    -- Credit destination
    INSERT INTO estoque_saldos (empresa_id, local_id, produto_id, saldo)
    VALUES (v_empresa_id, v_destino_id, v_item.produto_id, v_item.qtd)
    ON CONFLICT (empresa_id, local_id, produto_id) DO UPDATE SET saldo = estoque_saldos.saldo + v_item.qtd, updated_at = now();

    INSERT INTO movimentacoes_estoque (empresa_id, local_id, produto_id, origem, ref_id, tipo, quantidade, usuario_id)
    VALUES (v_empresa_id, v_destino_id, v_item.produto_id, 'transferencia', p_transferencia_id, 'entrada', v_item.qtd, auth.uid());

    INSERT INTO movimentacoes (empresa_id, produto_id, deposito_id, origem, ref_id, tipo, qtd, usuario_id, observacao)
    VALUES (v_empresa_id, v_item.produto_id, v_destino_id, 'transferencia', p_transferencia_id, 'entrada', v_item.qtd, auth.uid(), 'Transferência confirmada (entrada destino)');
  END LOOP;

  UPDATE transferencias
  SET status = 'confirmada', confirmado_por = auth.uid(), confirmado_em = now()
  WHERE id = p_transferencia_id;
END;
$$;

-- Cancelar: only from rascunho, pendente_envio, or em_recebimento (no stock to reverse)
CREATE OR REPLACE FUNCTION public.transferencia_cancelar(p_transferencia_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_empresa_id uuid;
  v_status text;
BEGIN
  SELECT empresa_id, status INTO v_empresa_id, v_status
  FROM transferencias
  WHERE id = p_transferencia_id AND empresa_id = get_user_empresa_id(auth.uid());

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Transferência não encontrada ou sem permissão';
  END IF;

  IF v_status NOT IN ('rascunho', 'pendente_envio', 'em_recebimento') THEN
    RAISE EXCEPTION 'Só é possível cancelar transferências não confirmadas (status: %)', v_status;
  END IF;

  UPDATE transferencias SET status = 'cancelada' WHERE id = p_transferencia_id;
END;
$$;
