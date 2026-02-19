
-- 1. Create estoque_saldos table
CREATE TABLE public.estoque_saldos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  local_id uuid NOT NULL REFERENCES public.depositos(id),
  produto_id uuid NOT NULL REFERENCES public.produtos(id),
  saldo numeric NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, local_id, produto_id)
);

ALTER TABLE public.estoque_saldos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view estoque_saldos"
  ON public.estoque_saldos FOR SELECT
  USING (empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Operators+ can manage estoque_saldos"
  ON public.estoque_saldos FOR ALL
  USING (empresa_id = get_user_empresa_id(auth.uid()));

-- 2. Create movimentacoes_estoque table
CREATE TABLE public.movimentacoes_estoque (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  local_id uuid NOT NULL REFERENCES public.depositos(id),
  produto_id uuid NOT NULL REFERENCES public.produtos(id),
  origem text NOT NULL,
  ref_id uuid,
  tipo text NOT NULL,
  quantidade numeric NOT NULL,
  usuario_id uuid,
  criado_em timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view movimentacoes_estoque"
  ON public.movimentacoes_estoque FOR SELECT
  USING (empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Operators+ can manage movimentacoes_estoque"
  ON public.movimentacoes_estoque FOR ALL
  USING (empresa_id = get_user_empresa_id(auth.uid()));

-- 3. Seed estoque_saldos from existing estoque data
INSERT INTO public.estoque_saldos (empresa_id, local_id, produto_id, saldo, updated_at)
SELECT p.empresa_id, e.deposito_id, e.produto_id, COALESCE(e.qtd, 0), COALESCE(e.atualizado_em, now())
FROM public.estoque e
JOIN public.produtos p ON p.id = e.produto_id
ON CONFLICT (empresa_id, local_id, produto_id) DO NOTHING;

-- 4. Update pdv_finalizar_venda RPC to use new tables + p_local_id
CREATE OR REPLACE FUNCTION public.pdv_finalizar_venda(
  p_empresa_id uuid,
  p_caixa_id uuid,
  p_cliente_id uuid,
  p_deposito_id uuid,
  p_local_id uuid,
  p_subtotal numeric,
  p_desconto numeric,
  p_total numeric,
  p_itens jsonb,
  p_pagamentos jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_venda_id uuid;
  v_item jsonb;
  v_pag jsonb;
  v_produto_nome text;
  v_estoque_atual numeric;
  v_qtd numeric;
  v_bloquear boolean;
  v_permitir_negativo boolean;
BEGIN
  -- Validate empresa
  IF p_empresa_id != get_user_empresa_id(auth.uid()) THEN
    RAISE EXCEPTION 'Empresa não corresponde ao usuário';
  END IF;

  -- Load stock config
  SELECT bloquear_venda_sem_estoque, permitir_estoque_negativo
    INTO v_bloquear, v_permitir_negativo
  FROM empresa_config
  WHERE empresa_id = p_empresa_id;

  IF v_bloquear IS NULL THEN
    v_bloquear := true;
    v_permitir_negativo := false;
  END IF;

  -- 1. Create venda
  INSERT INTO vendas (empresa_id, caixa_id, cliente_id, usuario_id, subtotal, desconto, total, status)
  VALUES (p_empresa_id, p_caixa_id, p_cliente_id, auth.uid(), p_subtotal, p_desconto, p_total, 'finalizada')
  RETURNING id INTO v_venda_id;

  -- 2. Items + stock via estoque_saldos
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    v_qtd := (v_item->>'qtd')::numeric;

    SELECT nome INTO v_produto_nome FROM produtos
    WHERE id = (v_item->>'produto_id')::uuid AND empresa_id = p_empresa_id AND ativo = true;

    IF v_produto_nome IS NULL THEN
      RAISE EXCEPTION 'Produto % não encontrado ou inativo', (v_item->>'produto_id');
    END IF;

    -- Insert item with snapshot
    INSERT INTO venda_itens (venda_id, produto_id, qtd, preco_unit, desconto, nome_snapshot)
    VALUES (
      v_venda_id,
      (v_item->>'produto_id')::uuid,
      v_qtd,
      (v_item->>'preco_unit')::numeric,
      COALESCE((v_item->>'desconto')::numeric, 0),
      v_produto_nome
    );

    -- Ensure saldo row exists
    INSERT INTO estoque_saldos (empresa_id, local_id, produto_id, saldo)
    VALUES (p_empresa_id, p_local_id, (v_item->>'produto_id')::uuid, 0)
    ON CONFLICT (empresa_id, local_id, produto_id) DO NOTHING;

    -- Lock saldo row
    SELECT saldo INTO v_estoque_atual
    FROM estoque_saldos
    WHERE empresa_id = p_empresa_id
      AND local_id = p_local_id
      AND produto_id = (v_item->>'produto_id')::uuid
    FOR UPDATE;

    -- Enforce stock rules
    IF v_bloquear = true AND v_permitir_negativo = false THEN
      IF COALESCE(v_estoque_atual, 0) < v_qtd THEN
        RAISE EXCEPTION 'Estoque insuficiente: "%" (disponível: %, solicitado: %)', v_produto_nome, COALESCE(v_estoque_atual, 0), v_qtd;
      END IF;
    END IF;

    -- Update saldo
    UPDATE estoque_saldos
    SET saldo = saldo - v_qtd, updated_at = now()
    WHERE empresa_id = p_empresa_id
      AND local_id = p_local_id
      AND produto_id = (v_item->>'produto_id')::uuid;

    -- Ledger in new table
    INSERT INTO movimentacoes_estoque (empresa_id, local_id, produto_id, origem, ref_id, tipo, quantidade, usuario_id)
    VALUES (p_empresa_id, p_local_id, (v_item->>'produto_id')::uuid, 'venda', v_venda_id, 'saida', v_qtd, auth.uid());

    -- Keep legacy tables in sync
    INSERT INTO movimentacoes (empresa_id, produto_id, deposito_id, origem, ref_id, tipo, qtd, custo_unit, usuario_id)
    VALUES (p_empresa_id, (v_item->>'produto_id')::uuid, p_deposito_id, 'venda', v_venda_id, 'saida', -v_qtd, (v_item->>'preco_unit')::numeric, auth.uid());
  END LOOP;

  -- 3. Payments + cash movement
  FOR v_pag IN SELECT * FROM jsonb_array_elements(p_pagamentos)
  LOOP
    INSERT INTO pagamentos (venda_id, forma, valor, troco, taxa)
    VALUES (
      v_venda_id,
      (v_pag->>'forma')::text,
      (v_pag->>'valor')::numeric,
      COALESCE((v_pag->>'troco')::numeric, 0),
      COALESCE((v_pag->>'taxa')::numeric, 0)
    );

    IF p_caixa_id IS NOT NULL THEN
      INSERT INTO caixa_movimentacoes (empresa_id, caixa_id, origem, ref_id, tipo, valor, venda_id, usuario_id, descricao)
      VALUES (p_empresa_id, p_caixa_id, 'venda', v_venda_id, 'venda',
              (v_pag->>'valor')::numeric - COALESCE((v_pag->>'taxa')::numeric, 0),
              v_venda_id, auth.uid(), 'Venda PDV');
    END IF;
  END LOOP;

  -- 4. Validate total paid
  DECLARE
    v_total_pago numeric;
  BEGIN
    SELECT COALESCE(SUM(valor), 0) INTO v_total_pago FROM pagamentos WHERE venda_id = v_venda_id;
    IF v_total_pago < p_total THEN
      RAISE EXCEPTION 'Pagamento insuficiente. Total: %, Pago: %', p_total, v_total_pago;
    END IF;
  END;

  RETURN v_venda_id;
END;
$$;
