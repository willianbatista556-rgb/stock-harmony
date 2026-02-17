
CREATE OR REPLACE FUNCTION public.ensure_cliente_balcao(p_empresa_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id
  FROM clientes
  WHERE empresa_id = p_empresa_id
    AND upper(nome) = 'CLIENTE BALCAO'
    AND ativo = true
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO clientes (empresa_id, nome, ativo)
  VALUES (p_empresa_id, 'CLIENTE BALCAO', true)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
