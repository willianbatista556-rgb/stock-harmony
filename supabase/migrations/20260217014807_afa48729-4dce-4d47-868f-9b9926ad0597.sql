
CREATE OR REPLACE FUNCTION public.pdv_finalizar_venda(
  p_empresa_id uuid,
  p_caixa_id uuid,
  p_cliente_id uuid,
  p_deposito_id uuid,
  p_subtotal numeric,
  p_desconto numeric,
  p_total numeric,
  p_itens jsonb,
  p_pagamentos jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_venda_id uuid;
  v_item jsonb;
  v_pag jsonb;
  v_produto_nome text;
  v_estoque_id uuid;
  v_estoque_atual numeric;
  v_qtd numeric;
  v_bloquear boolean;
  v_permitir_negativo boolean;
BEGIN
  -- Validate empresa
  IF p_empresa_id != get_user_empresa_id(auth.uid()) THEN
    RAISE EXCEPTION 'Empresa não corresponde ao usuário';
  END IF;

  -- Load stock config (defaults: block=true, negative=false)
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

  -- 2. Items + stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    v_qtd := (v_item->>'qtd')::numeric;

    -- Get product name for snapshot
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

    -- Stock: lock row, validate, update
    SELECT id, COALESCE(qtd, 0) INTO v_estoque_id, v_estoque_atual
    FROM estoque
    WHERE produto_id = (v_item->>'produto_id')::uuid AND deposito_id = p_deposito_id
    FOR UPDATE;

    -- Enforce stock rules based on empresa_config
    IF v_bloquear AND NOT v_permitir_negativo THEN
      IF v_estoque_id IS NULL THEN
        RAISE EXCEPTION 'Produto "%" sem estoque no depósito', v_produto_nome;
      END IF;
      IF v_estoque_atual < v_qtd THEN
        RAISE EXCEPTION 'Estoque insuficiente: "%" (disponível: %, solicitado: %)', v_produto_nome, v_estoque_atual, v_qtd;
      END IF;
    ELSIF v_bloquear AND v_permitir_negativo THEN
      -- Allow negative but must have stock record
      IF v_estoque_id IS NULL THEN
        RAISE EXCEPTION 'Produto "%" sem estoque no depósito', v_produto_nome;
      END IF;
    END IF;
    -- If not blocking: skip validation, allow sale even without stock record

    IF v_estoque_id IS NOT NULL THEN
      UPDATE estoque SET qtd = v_estoque_atual - v_qtd, atualizado_em = now() WHERE id = v_estoque_id;
    END IF;

    -- Stock movement ledger
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

    -- Cash ledger (net of fees)
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
