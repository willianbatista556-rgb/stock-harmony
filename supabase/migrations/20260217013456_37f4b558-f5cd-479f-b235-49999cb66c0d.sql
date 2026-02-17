
CREATE OR REPLACE FUNCTION public.caixa_fechar(
  p_caixa_id uuid,
  p_valor_contado numeric,
  p_observacao text default null
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_resumo jsonb;
  v_sugestao numeric(12,2);
  v_diferenca numeric(12,2);
BEGIN
  -- Validate ownership + open status
  IF NOT EXISTS (
    SELECT 1 FROM caixas
    WHERE id = p_caixa_id
      AND status = 'aberto'
      AND empresa_id = get_user_empresa_id(auth.uid())
  ) THEN
    RAISE EXCEPTION 'Caixa não está aberto ou sem permissão.';
  END IF;

  v_resumo := caixa_resumo(p_caixa_id);
  v_sugestao := (v_resumo->>'sugestao_saldo_final')::numeric;
  v_diferenca := COALESCE(p_valor_contado, 0) - COALESCE(v_sugestao, 0);

  UPDATE caixas
  SET status = 'fechado',
      fechado_em = now(),
      valor_fechamento = v_sugestao,
      valor_contado = p_valor_contado,
      diferenca = v_diferenca,
      observacao_fechamento = p_observacao
  WHERE id = p_caixa_id;
END;
$$;
