
CREATE OR REPLACE FUNCTION public.transferencia_iniciar_recebimento(p_transferencia_id uuid)
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
    RAISE EXCEPTION 'Transferência não está pendente para recebimento.';
  END IF;

  UPDATE transferencias SET status = 'em_recebimento' WHERE id = p_transferencia_id;
END;
$$;
