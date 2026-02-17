-- Índice para relatório/fechamento de caixa
CREATE INDEX IF NOT EXISTS idx_caixa_mov_caixa_criado
ON caixa_movimentacoes (caixa_id, criado_em);