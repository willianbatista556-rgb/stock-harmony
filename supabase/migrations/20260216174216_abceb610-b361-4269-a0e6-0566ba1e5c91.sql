
-- Atomic function to finalize a sale in a single transaction
-- Handles: venda, itens, pagamentos, movimentações, estoque (with row locking)
CREATE OR REPLACE FUNCTION public.finalizar_venda(
  p_empresa_id UUID,
  p_usuario_id UUID,
  p_deposito_id UUID,
  p_total NUMERIC,
  p_desconto NUMERIC,
  p_itens JSONB,
  p_pagamentos JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
BEGIN
  -- Validate empresa_id matches user
  IF p_empresa_id != get_user_empresa_id(p_usuario_id) THEN
    RAISE EXCEPTION 'Empresa não corresponde ao usuário';
  END IF;

  -- Validate deposit belongs to empresa
  IF NOT EXISTS (SELECT 1 FROM depositos WHERE id = p_deposito_id AND empresa_id = p_empresa_id) THEN
    RAISE EXCEPTION 'Depósito não encontrado';
  END IF;

  -- 1. Create venda
  INSERT INTO vendas (empresa_id, usuario_id, total, status, desconto)
  VALUES (p_empresa_id, p_usuario_id, p_total, 'finalizada', p_desconto)
  RETURNING id INTO v_venda_id;

  -- 2. Process items: insert venda_itens + movimentações + update estoque
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    v_produto_id := (v_item->>'produto_id')::UUID;
    v_qtd := (v_item->>'qtd')::NUMERIC;
    v_preco_unit := (v_item->>'preco_unit')::NUMERIC;
    v_item_desconto := COALESCE((v_item->>'desconto')::NUMERIC, 0);

    -- Validate product belongs to empresa
    IF NOT EXISTS (SELECT 1 FROM produtos WHERE id = v_produto_id AND empresa_id = p_empresa_id AND ativo = true) THEN
      RAISE EXCEPTION 'Produto % não encontrado ou inativo', v_produto_id;
    END IF;

    -- Validate quantity
    IF v_qtd <= 0 THEN
      RAISE EXCEPTION 'Quantidade deve ser maior que zero';
    END IF;

    -- Insert venda_item
    INSERT INTO venda_itens (venda_id, produto_id, qtd, preco_unit, desconto)
    VALUES (v_venda_id, v_produto_id, v_qtd, v_preco_unit, v_item_desconto);

    -- Insert movimentacao (saída)
    INSERT INTO movimentacoes (tipo, origem, produto_id, deposito_id, qtd, custo_unit, empresa_id, usuario_id)
    VALUES ('saida', 'venda', v_produto_id, p_deposito_id, -v_qtd, v_preco_unit, p_empresa_id, p_usuario_id);

    -- Update estoque with row lock (FOR UPDATE prevents race conditions)
    SELECT id, COALESCE(qtd, 0) INTO v_estoque_id, v_estoque_atual
    FROM estoque
    WHERE produto_id = v_produto_id AND deposito_id = p_deposito_id
    FOR UPDATE;

    IF v_estoque_id IS NOT NULL THEN
      -- Check sufficient stock
      IF v_estoque_atual < v_qtd THEN
        RAISE EXCEPTION 'Estoque insuficiente para produto %. Disponível: %, Solicitado: %', 
          v_produto_id, v_estoque_atual, v_qtd;
      END IF;

      UPDATE estoque 
      SET qtd = v_estoque_atual - v_qtd, atualizado_em = now()
      WHERE id = v_estoque_id;
    ELSE
      -- No stock record exists — cannot sell what doesn't exist
      RAISE EXCEPTION 'Produto % sem registro de estoque no depósito', v_produto_id;
    END IF;
  END LOOP;

  -- 3. Insert pagamentos
  FOR v_pag IN SELECT * FROM jsonb_array_elements(p_pagamentos)
  LOOP
    INSERT INTO pagamentos (venda_id, forma, valor, troco)
    VALUES (
      v_venda_id, 
      (v_pag->>'forma')::TEXT, 
      (v_pag->>'valor')::NUMERIC, 
      COALESCE((v_pag->>'troco')::NUMERIC, 0)
    );
  END LOOP;

  -- 4. Validate total paid covers total
  DECLARE
    v_total_pago NUMERIC;
  BEGIN
    SELECT COALESCE(SUM(valor), 0) INTO v_total_pago
    FROM pagamentos WHERE venda_id = v_venda_id;
    
    IF v_total_pago < p_total THEN
      RAISE EXCEPTION 'Pagamento insuficiente. Total: %, Pago: %', p_total, v_total_pago;
    END IF;
  END;

  RETURN v_venda_id;
END;
$$;
