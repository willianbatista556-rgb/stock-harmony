
-- =============================================
-- PERFORMANCE INDEXES
-- =============================================

-- Movimentacoes: queries by empresa + date range
CREATE INDEX IF NOT EXISTS idx_movimentacoes_empresa_data ON movimentacoes (empresa_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_empresa_tipo_data ON movimentacoes (empresa_id, tipo, data DESC);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_produto_data ON movimentacoes (produto_id, data DESC);

-- Estoque lookups
CREATE INDEX IF NOT EXISTS idx_estoque_produto_deposito ON estoque (produto_id, deposito_id);
CREATE INDEX IF NOT EXISTS idx_estoque_saldos_empresa_local ON estoque_saldos (empresa_id, local_id);

-- Vendas
CREATE INDEX IF NOT EXISTS idx_vendas_empresa_data ON vendas (empresa_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_vendas_caixa ON vendas (caixa_id) WHERE status = 'finalizada';
CREATE INDEX IF NOT EXISTS idx_venda_itens_venda ON venda_itens (venda_id);
CREATE INDEX IF NOT EXISTS idx_venda_itens_produto ON venda_itens (produto_id);

-- Audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_empresa_criado ON audit_log (empresa_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_acao ON audit_log (empresa_id, acao);

-- Produtos
CREATE INDEX IF NOT EXISTS idx_produtos_empresa_ativo ON produtos (empresa_id) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_produtos_ean ON produtos (empresa_id, ean) WHERE ean IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_produtos_sku ON produtos (empresa_id, sku) WHERE sku IS NOT NULL;

-- =============================================
-- VIEW: Margem por produto (últimos 30 dias)
-- =============================================
CREATE OR REPLACE VIEW public.vw_margem_produto
WITH (security_invoker = true) AS
SELECT
  p.empresa_id,
  p.id AS produto_id,
  p.nome AS produto_nome,
  p.sku,
  p.categoria_id,
  COALESCE(p.custo_medio, 0) AS custo_medio,
  COALESCE(p.preco_venda, 0) AS preco_venda,
  CASE WHEN COALESCE(p.preco_venda, 0) > 0 AND COALESCE(p.custo_medio, 0) > 0
    THEN ROUND(((p.preco_venda - p.custo_medio) / p.preco_venda) * 100, 1)
    ELSE 0
  END AS margem_percentual,
  COALESCE(p.preco_venda, 0) - COALESCE(p.custo_medio, 0) AS margem_absoluta,
  COALESCE(vendas_30d.qtd_vendida, 0) AS qtd_vendida_30d,
  COALESCE(vendas_30d.receita, 0) AS receita_30d,
  COALESCE(vendas_30d.qtd_vendida, 0) * (COALESCE(p.preco_venda, 0) - COALESCE(p.custo_medio, 0)) AS lucro_bruto_30d
FROM produtos p
LEFT JOIN (
  SELECT
    vi.produto_id,
    SUM(vi.qtd) AS qtd_vendida,
    SUM(vi.qtd * vi.preco_unit) AS receita
  FROM venda_itens vi
  JOIN vendas v ON v.id = vi.venda_id
  WHERE v.status = 'finalizada'
    AND v.data >= NOW() - INTERVAL '30 days'
  GROUP BY vi.produto_id
) vendas_30d ON vendas_30d.produto_id = p.id
WHERE p.ativo = true;

-- =============================================
-- VIEW: Faturamento por filial (últimos 30 dias)
-- =============================================
CREATE OR REPLACE VIEW public.vw_faturamento_filial
WITH (security_invoker = true) AS
SELECT
  d.empresa_id,
  d.id AS deposito_id,
  d.nome AS deposito_nome,
  d.tipo AS deposito_tipo,
  COALESCE(vendas_data.total_vendas, 0) AS total_vendas,
  COALESCE(vendas_data.num_vendas, 0) AS num_vendas,
  COALESCE(vendas_data.ticket_medio, 0) AS ticket_medio,
  COALESCE(vendas_data.total_itens, 0) AS total_itens
FROM depositos d
LEFT JOIN (
  SELECT
    c.deposito_id,
    SUM(v.total) AS total_vendas,
    COUNT(v.id) AS num_vendas,
    ROUND(AVG(v.total), 2) AS ticket_medio,
    SUM(vi_agg.total_itens) AS total_itens
  FROM vendas v
  JOIN caixas c ON c.id = v.caixa_id
  LEFT JOIN (
    SELECT venda_id, SUM(qtd) AS total_itens
    FROM venda_itens
    GROUP BY venda_id
  ) vi_agg ON vi_agg.venda_id = v.id
  WHERE v.status = 'finalizada'
    AND v.data >= NOW() - INTERVAL '30 days'
  GROUP BY c.deposito_id
) vendas_data ON vendas_data.deposito_id = d.id;

-- =============================================
-- VIEW: Giro de estoque (últimos 30 dias)
-- =============================================
CREATE OR REPLACE VIEW public.vw_giro_estoque
WITH (security_invoker = true) AS
SELECT
  p.empresa_id,
  p.id AS produto_id,
  p.nome AS produto_nome,
  p.sku,
  COALESCE(estoque_total.saldo, 0) AS estoque_atual,
  COALESCE(saidas_30d.total_saidas, 0) AS saidas_30d,
  CASE WHEN COALESCE(estoque_total.saldo, 0) > 0
    THEN ROUND(COALESCE(saidas_30d.total_saidas, 0) / estoque_total.saldo, 2)
    ELSE 0
  END AS indice_giro,
  CASE
    WHEN COALESCE(estoque_total.saldo, 0) = 0 AND COALESCE(saidas_30d.total_saidas, 0) > 0 THEN 'ruptura'
    WHEN COALESCE(saidas_30d.total_saidas, 0) = 0 THEN 'parado'
    WHEN COALESCE(saidas_30d.total_saidas, 0) / NULLIF(estoque_total.saldo, 0) >= 2 THEN 'alto'
    WHEN COALESCE(saidas_30d.total_saidas, 0) / NULLIF(estoque_total.saldo, 0) >= 0.5 THEN 'medio'
    ELSE 'baixo'
  END AS classificacao_giro
FROM produtos p
LEFT JOIN (
  SELECT produto_id, SUM(saldo) AS saldo
  FROM estoque_saldos
  GROUP BY produto_id
) estoque_total ON estoque_total.produto_id = p.id
LEFT JOIN (
  SELECT produto_id, SUM(ABS(qtd)) AS total_saidas
  FROM movimentacoes
  WHERE tipo = 'saida'
    AND data >= NOW() - INTERVAL '30 days'
  GROUP BY produto_id
) saidas_30d ON saidas_30d.produto_id = p.id
WHERE p.ativo = true;

-- =============================================
-- VIEW: Curva ABC
-- =============================================
CREATE OR REPLACE VIEW public.vw_curva_abc
WITH (security_invoker = true) AS
WITH vendas_produto AS (
  SELECT
    p.empresa_id,
    p.id AS produto_id,
    p.nome AS produto_nome,
    p.sku,
    COALESCE(SUM(vi.qtd * vi.preco_unit), 0) AS receita_total
  FROM produtos p
  LEFT JOIN venda_itens vi ON vi.produto_id = p.id
  LEFT JOIN vendas v ON v.id = vi.venda_id AND v.status = 'finalizada' AND v.data >= NOW() - INTERVAL '90 days'
  WHERE p.ativo = true
  GROUP BY p.empresa_id, p.id, p.nome, p.sku
),
ranked AS (
  SELECT *,
    SUM(receita_total) OVER (PARTITION BY empresa_id ORDER BY receita_total DESC) AS receita_acumulada,
    SUM(receita_total) OVER (PARTITION BY empresa_id) AS receita_empresa_total,
    ROW_NUMBER() OVER (PARTITION BY empresa_id ORDER BY receita_total DESC) AS ranking
  FROM vendas_produto
)
SELECT
  empresa_id,
  produto_id,
  produto_nome,
  sku,
  receita_total,
  ranking,
  ROUND((receita_acumulada / NULLIF(receita_empresa_total, 0)) * 100, 1) AS percentual_acumulado,
  CASE
    WHEN (receita_acumulada / NULLIF(receita_empresa_total, 0)) * 100 <= 80 THEN 'A'
    WHEN (receita_acumulada / NULLIF(receita_empresa_total, 0)) * 100 <= 95 THEN 'B'
    ELSE 'C'
  END AS classe
FROM ranked;
