
CREATE OR REPLACE FUNCTION public.finalizar_venda(
  p_empresa_id uuid,
  p_usuario_id uuid,
  p_deposito_id uuid,
  p_total numeric,
  p_desconto numeric,
  p_itens jsonb,
  p_pagamentos jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  v_subtotal NUMERIC;
  v_produto_nome TEXT;
BEGIN
  -- Validate empresa_id matches user
  IF p_empresa_id != get_user_empresa_id(p_usuario_id) THEN
    RAISE EXCEPTION 'Empresa não corresponde ao usuário';
  END IF;

  -- Validate deposit belongs to empresa
  IF NOT EXISTS (SELECT 1 FROM depositos WHERE id = p_deposito_id AND empresa_id = p_empresa_id) THEN
    RAISE EXCEPTION 'Depósito não encontrado';
  END IF;

  -- Get open register (optional)
  SELECT id INTO v_caixa_id
  FROM caixas
  WHERE usuario_id = p_usuario_id AND status = 'aberto'
  LIMIT 1;

  -- Calculate subtotal (before discount)
  v_subtotal := p_total + p_desconto;

  -- 1. Create venda with caixa_id and subtotal
  INSERT INTO vendas (empresa_id, usuario_id, caixa_id, total, subtotal, desconto, status)
  VALUES (p_empresa_id, p_usuario_id, v_caixa_id, p_total, v_subtotal, p_desconto, 'finalizada')
  RETURNING id INTO v_venda_id;

  -- 2. Process items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    v_produto_id := (v_item->>'produto_id')::UUID;
    v_qtd := (v_item->>'qtd')::NUMERIC;
    v_preco_unit := (v_item->>'preco_unit')::NUMERIC;
    v_item_desconto := COALESCE((v_item->>'desconto')::NUMERIC, 0);

    -- Get product name for snapshot
    SELECT nome INTO v_produto_nome FROM produtos
    WHERE id = v_produto_id AND empresa_id = p_empresa_id AND ativo = true;

    IF v_produto_nome IS NULL THEN
      RAISE EXCEPTION 'Produto % não encontrado ou inativo', v_produto_id;
    END IF;

    IF v_qtd <= 0 THEN
      RAISE EXCEPTION 'Quantidade deve ser maior que zero';
    END IF;

    -- Insert item with nome_snapshot
    INSERT INTO venda_itens (venda_id, produto_id, qtd, preco_unit, desconto, nome_snapshot)
    VALUES (v_venda_id, v_produto_id, v_qtd, v_preco_unit, v_item_desconto, v_produto_nome);

    -- Stock movement with ref_id
    INSERT INTO movimentacoes (tipo, origem, produto_id, deposito_id, qtd, custo_unit, empresa_id, usuario_id, ref_id)
    VALUES ('saida', 'venda', v_produto_id, p_deposito_id, -v_qtd, v_preco_unit, p_empresa_id, p_usuario_id, v_venda_id);

    -- Lock and update stock
    SELECT id, COALESCE(qtd, 0) INTO v_estoque_id, v_estoque_atual
    FROM estoque
    WHERE produto_id = v_produto_id AND deposito_id = p_deposito_id
    FOR UPDATE;

    IF v_estoque_id IS NOT NULL THEN
      IF v_estoque_atual < v_qtd THEN
        RAISE EXCEPTION 'Estoque insuficiente para produto %. Disponível: %, Solicitado: %',
          v_produto_nome, v_estoque_atual, v_qtd;
      END IF;
      UPDATE estoque SET qtd = v_estoque_atual - v_qtd, atualizado_em = now() WHERE id = v_estoque_id;
    ELSE
      RAISE EXCEPTION 'Produto "%" sem registro de estoque no depósito', v_produto_nome;
    END IF;
  END LOOP;

  -- 3. Insert payments
  FOR v_pag IN SELECT * FROM jsonb_array_elements(p_pagamentos)
  LOOP
    INSERT INTO pagamentos (venda_id, forma, valor, troco, taxa)
    VALUES (
      v_venda_id,
      (v_pag->>'forma')::TEXT,
      (v_pag->>'valor')::NUMERIC,
      COALESCE((v_pag->>'troco')::NUMERIC, 0),
      COALESCE((v_pag->>'taxa')::NUMERIC, 0)
    );
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

  -- 5. Register cash movement with ref_id and origem
  IF v_caixa_id IS NOT NULL THEN
    INSERT INTO caixa_movimentacoes (caixa_id, empresa_id, tipo, valor, venda_id, ref_id, origem, usuario_id, descricao)
    VALUES (v_caixa_id, p_empresa_id, 'venda', p_total, v_venda_id, v_venda_id, 'venda', p_usuario_id, 'Venda PDV');
  END IF;

  RETURN v_venda_id;
END;
$function$;
