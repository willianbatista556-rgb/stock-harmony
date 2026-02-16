
-- 1. Tabela de sessões de caixa
CREATE TABLE public.caixas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  usuario_id UUID NOT NULL,
  deposito_id UUID NOT NULL REFERENCES public.depositos(id),
  valor_abertura NUMERIC NOT NULL DEFAULT 0,
  valor_fechamento NUMERIC,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado')),
  aberto_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fechado_em TIMESTAMP WITH TIME ZONE,
  observacao_fechamento TEXT
);

ALTER TABLE public.caixas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view caixas" ON public.caixas
  FOR SELECT USING (empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Operators+ can manage caixas" ON public.caixas
  FOR ALL USING (empresa_id = get_user_empresa_id(auth.uid()));

-- Index for finding open register quickly
CREATE INDEX idx_caixas_status_usuario ON public.caixas (usuario_id, status) WHERE status = 'aberto';

-- 2. Movimentações de caixa (sangria, suprimento, venda)
CREATE TABLE public.caixa_movimentacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caixa_id UUID NOT NULL REFERENCES public.caixas(id),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('venda', 'sangria', 'suprimento', 'abertura')),
  valor NUMERIC NOT NULL,
  descricao TEXT,
  venda_id UUID REFERENCES public.vendas(id),
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  usuario_id UUID NOT NULL
);

ALTER TABLE public.caixa_movimentacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view caixa_movimentacoes" ON public.caixa_movimentacoes
  FOR SELECT USING (empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Operators+ can manage caixa_movimentacoes" ON public.caixa_movimentacoes
  FOR ALL USING (empresa_id = get_user_empresa_id(auth.uid()));

-- Index for aggregations
CREATE INDEX idx_caixa_mov_caixa ON public.caixa_movimentacoes (caixa_id);
CREATE INDEX idx_caixa_mov_criado ON public.caixa_movimentacoes (empresa_id, criado_em);

-- 3. View: Fluxo de caixa diário
CREATE OR REPLACE VIEW public.vw_fluxo_caixa_diario
WITH (security_invoker = true) AS
SELECT
  cm.empresa_id,
  DATE(cm.criado_em) AS dia,
  SUM(CASE WHEN cm.tipo IN ('venda', 'suprimento', 'abertura') THEN cm.valor ELSE 0 END) AS entradas,
  SUM(CASE WHEN cm.tipo = 'sangria' THEN ABS(cm.valor) ELSE 0 END) AS saidas,
  SUM(CASE WHEN cm.tipo IN ('venda', 'suprimento', 'abertura') THEN cm.valor ELSE 0 END)
    - SUM(CASE WHEN cm.tipo = 'sangria' THEN ABS(cm.valor) ELSE 0 END) AS saldo,
  COUNT(*) AS num_movimentacoes
FROM public.caixa_movimentacoes cm
GROUP BY cm.empresa_id, DATE(cm.criado_em);

-- 4. Update finalizar_venda to register cash movement when caixa is open
CREATE OR REPLACE FUNCTION public.finalizar_venda(
  p_empresa_id uuid, p_usuario_id uuid, p_deposito_id uuid,
  p_total numeric, p_desconto numeric, p_itens jsonb, p_pagamentos jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_venda_id UUID;
  v_item JSONB;
  v_pag JSONB;
  v_produto_id UUID;
  v_qtd NUMERIC;
  v_preco_unit NUMERIC;
  v_item_desconto NUMERIC;
  v_estoque_atual NUMERIC;
  v_estoque_id UUID;
  v_caixa_id UUID;
BEGIN
  -- Validate empresa_id matches user
  IF p_empresa_id != get_user_empresa_id(p_usuario_id) THEN
    RAISE EXCEPTION 'Empresa não corresponde ao usuário';
  END IF;

  -- Validate deposit belongs to empresa
  IF NOT EXISTS (SELECT 1 FROM depositos WHERE id = p_deposito_id AND empresa_id = p_empresa_id) THEN
    RAISE EXCEPTION 'Depósito não encontrado';
  END IF;

  -- Check if user has an open register
  SELECT id INTO v_caixa_id
  FROM caixas
  WHERE usuario_id = p_usuario_id AND status = 'aberto'
  LIMIT 1;

  -- 1. Create venda
  INSERT INTO vendas (empresa_id, usuario_id, total, status, desconto)
  VALUES (p_empresa_id, p_usuario_id, p_total, 'finalizada', p_desconto)
  RETURNING id INTO v_venda_id;

  -- 2. Process items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    v_produto_id := (v_item->>'produto_id')::UUID;
    v_qtd := (v_item->>'qtd')::NUMERIC;
    v_preco_unit := (v_item->>'preco_unit')::NUMERIC;
    v_item_desconto := COALESCE((v_item->>'desconto')::NUMERIC, 0);

    IF NOT EXISTS (SELECT 1 FROM produtos WHERE id = v_produto_id AND empresa_id = p_empresa_id AND ativo = true) THEN
      RAISE EXCEPTION 'Produto % não encontrado ou inativo', v_produto_id;
    END IF;

    IF v_qtd <= 0 THEN
      RAISE EXCEPTION 'Quantidade deve ser maior que zero';
    END IF;

    INSERT INTO venda_itens (venda_id, produto_id, qtd, preco_unit, desconto)
    VALUES (v_venda_id, v_produto_id, v_qtd, v_preco_unit, v_item_desconto);

    INSERT INTO movimentacoes (tipo, origem, produto_id, deposito_id, qtd, custo_unit, empresa_id, usuario_id)
    VALUES ('saida', 'venda', v_produto_id, p_deposito_id, -v_qtd, v_preco_unit, p_empresa_id, p_usuario_id);

    SELECT id, COALESCE(qtd, 0) INTO v_estoque_id, v_estoque_atual
    FROM estoque
    WHERE produto_id = v_produto_id AND deposito_id = p_deposito_id
    FOR UPDATE;

    IF v_estoque_id IS NOT NULL THEN
      IF v_estoque_atual < v_qtd THEN
        RAISE EXCEPTION 'Estoque insuficiente para produto %. Disponível: %, Solicitado: %',
          v_produto_id, v_estoque_atual, v_qtd;
      END IF;
      UPDATE estoque SET qtd = v_estoque_atual - v_qtd, atualizado_em = now() WHERE id = v_estoque_id;
    ELSE
      RAISE EXCEPTION 'Produto % sem registro de estoque no depósito', v_produto_id;
    END IF;
  END LOOP;

  -- 3. Insert pagamentos
  FOR v_pag IN SELECT * FROM jsonb_array_elements(p_pagamentos)
  LOOP
    INSERT INTO pagamentos (venda_id, forma, valor, troco)
    VALUES (v_venda_id, (v_pag->>'forma')::TEXT, (v_pag->>'valor')::NUMERIC, COALESCE((v_pag->>'troco')::NUMERIC, 0));
  END LOOP;

  -- 4. Validate total paid
  DECLARE
    v_total_pago NUMERIC;
  BEGIN
    SELECT COALESCE(SUM(valor), 0) INTO v_total_pago FROM pagamentos WHERE venda_id = v_venda_id;
    IF v_total_pago < p_total THEN
      RAISE EXCEPTION 'Pagamento insuficiente. Total: %, Pago: %', p_total, v_total_pago;
    END IF;
  END;

  -- 5. Register cash movement if register is open
  IF v_caixa_id IS NOT NULL THEN
    INSERT INTO caixa_movimentacoes (caixa_id, empresa_id, tipo, valor, venda_id, usuario_id, descricao)
    VALUES (v_caixa_id, p_empresa_id, 'venda', p_total, v_venda_id, p_usuario_id, 'Venda PDV');
  END IF;

  RETURN v_venda_id;
END;
$$;
