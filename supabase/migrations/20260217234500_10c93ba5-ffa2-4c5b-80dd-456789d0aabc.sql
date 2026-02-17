
CREATE OR REPLACE FUNCTION public.inventario_count_barcode(
  p_inventario_id uuid,
  p_barcode text,
  p_quantidade numeric DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_produto_id uuid;
  v_empresa_id uuid;
  v_status text;
  v_max_contagem integer;
BEGIN
  -- Validate inventory status and ownership
  SELECT empresa_id, status
    INTO v_empresa_id, v_status
  FROM inventarios
  WHERE id = p_inventario_id
    AND empresa_id = get_user_empresa_id(auth.uid());

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Inventário não encontrado ou sem permissão';
  END IF;

  IF v_status != 'em_contagem' THEN
    RAISE EXCEPTION 'Inventário não está em contagem (status: %)', v_status;
  END IF;

  -- Find product by EAN or SKU
  SELECT id INTO v_produto_id
  FROM produtos
  WHERE empresa_id = v_empresa_id
    AND ativo = true
    AND (ean = p_barcode OR sku = p_barcode)
  LIMIT 1;

  IF v_produto_id IS NULL THEN
    RAISE EXCEPTION 'Produto não encontrado para o código: %', p_barcode;
  END IF;

  -- Get current counting round
  SELECT COALESCE(MAX(contagem), 1) INTO v_max_contagem
  FROM inventario_itens
  WHERE inventario_id = p_inventario_id;

  -- Upsert: increment qty if exists, insert if not
  INSERT INTO inventario_itens (inventario_id, produto_id, qtd_contada, contagem)
  VALUES (p_inventario_id, v_produto_id, COALESCE(p_quantidade, 1), v_max_contagem)
  ON CONFLICT (inventario_id, produto_id) DO UPDATE
  SET qtd_contada = inventario_itens.qtd_contada + COALESCE(p_quantidade, 1);
  
  -- Note: we only update on same contagem. For versioned recontagem,
  -- the unique constraint would need (inventario_id, produto_id, contagem).
  -- Current schema uses (inventario_id, produto_id) so this works for the active round.
END;
$$;
