
-- 1. Create clientes table (referenced by vendas.cliente_id)
CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id),
  nome text NOT NULL,
  cpf_cnpj text,
  telefone text,
  email text,
  endereco text,
  observacao text,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view clients"
  ON public.clientes FOR SELECT
  USING (empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Operators+ can manage clients"
  ON public.clientes FOR ALL
  USING (empresa_id = get_user_empresa_id(auth.uid()));

CREATE INDEX idx_clientes_empresa ON public.clientes(empresa_id);
CREATE INDEX idx_clientes_cpf_cnpj ON public.clientes(cpf_cnpj);

-- 2. Add missing columns to vendas
ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS caixa_id uuid REFERENCES caixas(id),
  ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES clientes(id),
  ADD COLUMN IF NOT EXISTS subtotal numeric(12,2);

-- 3. Add nome_snapshot to venda_itens
ALTER TABLE public.venda_itens
  ADD COLUMN IF NOT EXISTS nome_snapshot text;

-- 4. Add taxa to pagamentos
ALTER TABLE public.pagamentos
  ADD COLUMN IF NOT EXISTS taxa numeric(12,2) NOT NULL DEFAULT 0;

-- 5. Add ref_id to movimentacoes (generic reference to venda_id, compra_id, etc.)
ALTER TABLE public.movimentacoes
  ADD COLUMN IF NOT EXISTS ref_id uuid;

-- 6. Add ref_id to caixa_movimentacoes (generic reference beyond just venda_id)
ALTER TABLE public.caixa_movimentacoes
  ADD COLUMN IF NOT EXISTS ref_id uuid,
  ADD COLUMN IF NOT EXISTS origem text;
