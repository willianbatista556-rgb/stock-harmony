
-- Add closure fields to caixas
ALTER TABLE caixas
  ADD COLUMN IF NOT EXISTS valor_contado numeric(12,2),
  ADD COLUMN IF NOT EXISTS diferenca numeric(12,2);

-- Indexes for closure queries
CREATE INDEX IF NOT EXISTS idx_vendas_caixa ON vendas(caixa_id, data);
CREATE INDEX IF NOT EXISTS idx_pagamentos_venda ON pagamentos(venda_id);
