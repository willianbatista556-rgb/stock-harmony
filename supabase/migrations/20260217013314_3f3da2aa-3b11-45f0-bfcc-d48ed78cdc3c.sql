
CREATE OR REPLACE FUNCTION public.caixa_resumo(p_caixa_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_empresa_id uuid;
  v_saldo_inicial numeric(12,2);
  v_total_vendas numeric(12,2);
  v_total_mov_entrada numeric(12,2);
  v_total_mov_saida numeric(12,2);
  v_por_metodo jsonb;
  v_sugestao numeric(12,2);
BEGIN
  -- Validate caller owns this caixa
  SELECT empresa_id, valor_abertura
    INTO v_empresa_id, v_saldo_inicial
  FROM caixas
  WHERE id = p_caixa_id
    AND empresa_id = get_user_empresa_id(auth.uid());

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Caixa não encontrado ou sem permissão';
  END IF;

  -- Total vendas finalizadas neste caixa
  SELECT COALESCE(SUM(total), 0)
    INTO v_total_vendas
  FROM vendas
  WHERE caixa_id = p_caixa_id
    AND status = 'finalizada';

  -- Movimentos manuais (suprimento = entrada, sangria = saída)
  SELECT
    COALESCE(SUM(CASE WHEN origem = 'suprimento' THEN valor ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN origem = 'sangria'    THEN ABS(valor) ELSE 0 END), 0)
    INTO v_total_mov_entrada, v_total_mov_saida
  FROM caixa_movimentacoes
  WHERE caixa_id = p_caixa_id
    AND origem IN ('suprimento', 'sangria');

  -- Vendas por forma de pagamento
  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('metodo', forma, 'valor', total_metodo)),
    '[]'::jsonb
  )
  INTO v_por_metodo
  FROM (
    SELECT p.forma, COALESCE(SUM(p.valor - p.taxa), 0) AS total_metodo
    FROM pagamentos p
    JOIN vendas v ON v.id = p.venda_id
    WHERE v.caixa_id = p_caixa_id
      AND v.status = 'finalizada'
    GROUP BY p.forma
    ORDER BY p.forma
  ) t;

  -- Sugestão de saldo final
  v_sugestao := COALESCE(v_saldo_inicial, 0)
              + COALESCE(v_total_vendas, 0)
              + COALESCE(v_total_mov_entrada, 0)
              - COALESCE(v_total_mov_saida, 0);

  RETURN jsonb_build_object(
    'empresa_id',            v_empresa_id,
    'saldo_inicial',         COALESCE(v_saldo_inicial, 0),
    'total_vendas',          COALESCE(v_total_vendas, 0),
    'mov_entrada',           COALESCE(v_total_mov_entrada, 0),
    'mov_saida',             COALESCE(v_total_mov_saida, 0),
    'por_metodo',            v_por_metodo,
    'sugestao_saldo_final',  COALESCE(v_sugestao, 0)
  );
END;
$$;
