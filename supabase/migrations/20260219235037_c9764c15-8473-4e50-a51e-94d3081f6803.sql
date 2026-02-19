
-- Add qtd_conferida column to track barcode scanning during receiving
ALTER TABLE public.transferencia_itens 
ADD COLUMN IF NOT EXISTS qtd_conferida numeric NOT NULL DEFAULT 0;

-- RPC: Scan barcode during receiving - increments qtd_conferida
CREATE OR REPLACE FUNCTION public.transferencia_bipar_item(
  p_transferencia_id uuid,
  p_barcode text,
  p_quantidade numeric DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_empresa_id uuid;
  v_status text;
  v_produto_id uuid;
  v_produto_nome text;
  v_item_id uuid;
  v_qtd_esperada numeric;
  v_qtd_conferida numeric;
BEGIN
  -- Validate transfer ownership and status
  SELECT empresa_id, status INTO v_empresa_id, v_status
  FROM transferencias
  WHERE id = p_transferencia_id AND empresa_id = get_user_empresa_id(auth.uid());

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Transferência não encontrada ou sem permissão';
  END IF;
  IF v_status != 'em_recebimento' THEN
    RAISE EXCEPTION 'Transferência não está em recebimento (status: %)', v_status;
  END IF;

  -- Find product by EAN or SKU
  SELECT id, nome INTO v_produto_id, v_produto_nome
  FROM produtos
  WHERE empresa_id = v_empresa_id
    AND ativo = true
    AND (ean = p_barcode OR sku = p_barcode)
  LIMIT 1;

  IF v_produto_id IS NULL THEN
    RAISE EXCEPTION 'Produto não encontrado para o código: %', p_barcode;
  END IF;

  -- Find matching transfer item
  SELECT id, qtd, qtd_conferida INTO v_item_id, v_qtd_esperada, v_qtd_conferida
  FROM transferencia_itens
  WHERE transferencia_id = p_transferencia_id AND produto_id = v_produto_id;

  IF v_item_id IS NULL THEN
    RAISE EXCEPTION 'Produto "%" não faz parte desta transferência', v_produto_nome;
  END IF;

  -- Increment conferida
  UPDATE transferencia_itens
  SET qtd_conferida = qtd_conferida + COALESCE(p_quantidade, 1)
  WHERE id = v_item_id;

  RETURN jsonb_build_object(
    'produto_id', v_produto_id,
    'produto_nome', v_produto_nome,
    'qtd_esperada', v_qtd_esperada,
    'qtd_conferida', v_qtd_conferida + COALESCE(p_quantidade, 1),
    'status', CASE
      WHEN (v_qtd_conferida + COALESCE(p_quantidade, 1)) = v_qtd_esperada THEN 'ok'
      WHEN (v_qtd_conferida + COALESCE(p_quantidade, 1)) > v_qtd_esperada THEN 'excesso'
      ELSE 'pendente'
    END
  );
END;
$function$;

-- RPC: Reset conferencia for a transfer (re-scan)
CREATE OR REPLACE FUNCTION public.transferencia_resetar_conferencia(p_transferencia_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  IF v_status != 'em_recebimento' THEN
    RAISE EXCEPTION 'Transferência não está em recebimento';
  END IF;

  UPDATE transferencia_itens SET qtd_conferida = 0 WHERE transferencia_id = p_transferencia_id;
END;
$function$;
