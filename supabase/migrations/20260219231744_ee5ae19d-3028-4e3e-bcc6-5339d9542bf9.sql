
-- Transferências entre locais
CREATE TABLE public.transferencias (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  origem_id uuid NOT NULL REFERENCES public.depositos(id),
  destino_id uuid NOT NULL REFERENCES public.depositos(id),
  usuario_id uuid NOT NULL,
  confirmado_por uuid,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'confirmada', 'cancelada')),
  observacao text,
  criado_em timestamp with time zone NOT NULL DEFAULT now(),
  confirmado_em timestamp with time zone,
  CONSTRAINT origem_diferente_destino CHECK (origem_id != destino_id)
);

CREATE TABLE public.transferencia_itens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transferencia_id uuid NOT NULL REFERENCES public.transferencias(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.produtos(id),
  qtd numeric NOT NULL CHECK (qtd > 0),
  nome_snapshot text
);

ALTER TABLE public.transferencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transferencia_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view transferencias"
  ON public.transferencias FOR SELECT
  USING (empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Operators+ can manage transferencias"
  ON public.transferencias FOR ALL
  USING (empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Users can view transferencia_itens"
  ON public.transferencia_itens FOR SELECT
  USING (EXISTS (SELECT 1 FROM transferencias t WHERE t.id = transferencia_itens.transferencia_id AND t.empresa_id = get_user_empresa_id(auth.uid())));

CREATE POLICY "Operators+ can manage transferencia_itens"
  ON public.transferencia_itens FOR ALL
  USING (EXISTS (SELECT 1 FROM transferencias t WHERE t.id = transferencia_itens.transferencia_id AND t.empresa_id = get_user_empresa_id(auth.uid())));

-- RPC: Create transfer (immediate or pending)
CREATE OR REPLACE FUNCTION public.transferencia_criar(
  p_empresa_id uuid,
  p_origem_id uuid,
  p_destino_id uuid,
  p_itens jsonb,
  p_imediata boolean DEFAULT false,
  p_observacao text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_transf_id uuid;
  v_item jsonb;
  v_produto_nome text;
  v_saldo_atual numeric;
  v_status text;
BEGIN
  IF p_empresa_id != get_user_empresa_id(auth.uid()) THEN
    RAISE EXCEPTION 'Empresa não corresponde ao usuário';
  END IF;

  IF p_origem_id = p_destino_id THEN
    RAISE EXCEPTION 'Origem e destino devem ser diferentes';
  END IF;

  v_status := CASE WHEN p_imediata THEN 'confirmada' ELSE 'pendente' END;

  INSERT INTO transferencias (empresa_id, origem_id, destino_id, usuario_id, status, observacao, confirmado_por, confirmado_em)
  VALUES (p_empresa_id, p_origem_id, p_destino_id, auth.uid(), v_status, p_observacao,
          CASE WHEN p_imediata THEN auth.uid() ELSE NULL END,
          CASE WHEN p_imediata THEN now() ELSE NULL END)
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

    IF p_imediata THEN
      -- Lock and validate source stock
      INSERT INTO estoque_saldos (empresa_id, local_id, produto_id, saldo)
      VALUES (p_empresa_id, p_origem_id, (v_item->>'produto_id')::uuid, 0)
      ON CONFLICT (empresa_id, local_id, produto_id) DO NOTHING;

      SELECT saldo INTO v_saldo_atual
      FROM estoque_saldos
      WHERE empresa_id = p_empresa_id AND local_id = p_origem_id AND produto_id = (v_item->>'produto_id')::uuid
      FOR UPDATE;

      IF COALESCE(v_saldo_atual, 0) < (v_item->>'qtd')::numeric THEN
        RAISE EXCEPTION 'Estoque insuficiente de "%" na origem (disponível: %, solicitado: %)',
          v_produto_nome, COALESCE(v_saldo_atual, 0), (v_item->>'qtd')::numeric;
      END IF;

      -- Debit source
      UPDATE estoque_saldos SET saldo = saldo - (v_item->>'qtd')::numeric, updated_at = now()
      WHERE empresa_id = p_empresa_id AND local_id = p_origem_id AND produto_id = (v_item->>'produto_id')::uuid;

      -- Credit destination
      INSERT INTO estoque_saldos (empresa_id, local_id, produto_id, saldo)
      VALUES (p_empresa_id, p_destino_id, (v_item->>'produto_id')::uuid, (v_item->>'qtd')::numeric)
      ON CONFLICT (empresa_id, local_id, produto_id) DO UPDATE SET saldo = estoque_saldos.saldo + (v_item->>'qtd')::numeric, updated_at = now();

      -- Ledger: saída da origem
      INSERT INTO movimentacoes_estoque (empresa_id, local_id, produto_id, origem, ref_id, tipo, quantidade, usuario_id)
      VALUES (p_empresa_id, p_origem_id, (v_item->>'produto_id')::uuid, 'transferencia', v_transf_id, 'saida', (v_item->>'qtd')::numeric, auth.uid());

      -- Ledger: entrada no destino
      INSERT INTO movimentacoes_estoque (empresa_id, local_id, produto_id, origem, ref_id, tipo, quantidade, usuario_id)
      VALUES (p_empresa_id, p_destino_id, (v_item->>'produto_id')::uuid, 'transferencia', v_transf_id, 'entrada', (v_item->>'qtd')::numeric, auth.uid());

      -- Legacy sync
      INSERT INTO movimentacoes (empresa_id, produto_id, deposito_id, origem, ref_id, tipo, qtd, usuario_id, observacao)
      VALUES (p_empresa_id, (v_item->>'produto_id')::uuid, p_origem_id, 'transferencia', v_transf_id, 'saida', -(v_item->>'qtd')::numeric, auth.uid(), 'Transferência para destino');
      INSERT INTO movimentacoes (empresa_id, produto_id, deposito_id, origem, ref_id, tipo, qtd, usuario_id, observacao)
      VALUES (p_empresa_id, (v_item->>'produto_id')::uuid, p_destino_id, 'transferencia', v_transf_id, 'entrada', (v_item->>'qtd')::numeric, auth.uid(), 'Transferência da origem');
    END IF;
  END LOOP;

  RETURN v_transf_id;
END;
$$;

-- RPC: Confirm pending transfer
CREATE OR REPLACE FUNCTION public.transferencia_confirmar(p_transferencia_id uuid)
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
    RAISE EXCEPTION 'Transferência não está pendente (status: %)', v_status;
  END IF;

  FOR v_item IN SELECT * FROM transferencia_itens WHERE transferencia_id = p_transferencia_id
  LOOP
    -- Lock source
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

    -- Debit source
    UPDATE estoque_saldos SET saldo = saldo - v_item.qtd, updated_at = now()
    WHERE empresa_id = v_empresa_id AND local_id = v_origem_id AND produto_id = v_item.produto_id;

    -- Credit destination
    INSERT INTO estoque_saldos (empresa_id, local_id, produto_id, saldo)
    VALUES (v_empresa_id, v_destino_id, v_item.produto_id, v_item.qtd)
    ON CONFLICT (empresa_id, local_id, produto_id) DO UPDATE SET saldo = estoque_saldos.saldo + v_item.qtd, updated_at = now();

    -- Ledger
    INSERT INTO movimentacoes_estoque (empresa_id, local_id, produto_id, origem, ref_id, tipo, quantidade, usuario_id)
    VALUES (v_empresa_id, v_origem_id, v_item.produto_id, 'transferencia', p_transferencia_id, 'saida', v_item.qtd, auth.uid());
    INSERT INTO movimentacoes_estoque (empresa_id, local_id, produto_id, origem, ref_id, tipo, quantidade, usuario_id)
    VALUES (v_empresa_id, v_destino_id, v_item.produto_id, 'transferencia', p_transferencia_id, 'entrada', v_item.qtd, auth.uid());

    -- Legacy sync
    INSERT INTO movimentacoes (empresa_id, produto_id, deposito_id, origem, ref_id, tipo, qtd, usuario_id, observacao)
    VALUES (v_empresa_id, v_item.produto_id, v_origem_id, 'transferencia', p_transferencia_id, 'saida', -v_item.qtd, auth.uid(), 'Transferência confirmada');
    INSERT INTO movimentacoes (empresa_id, produto_id, deposito_id, origem, ref_id, tipo, qtd, usuario_id, observacao)
    VALUES (v_empresa_id, v_item.produto_id, v_destino_id, 'transferencia', p_transferencia_id, 'entrada', v_item.qtd, auth.uid(), 'Transferência confirmada');
  END LOOP;

  UPDATE transferencias
  SET status = 'confirmada', confirmado_por = auth.uid(), confirmado_em = now()
  WHERE id = p_transferencia_id;
END;
$$;

-- RPC: Cancel pending transfer
CREATE OR REPLACE FUNCTION public.transferencia_cancelar(p_transferencia_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

  IF v_status != 'pendente' THEN
    RAISE EXCEPTION 'Só é possível cancelar transferências pendentes (status: %)', v_status;
  END IF;

  UPDATE transferencias SET status = 'cancelada' WHERE id = p_transferencia_id;
END;
$$;
