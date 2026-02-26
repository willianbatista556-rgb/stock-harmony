
-- 1. Add grade fields (tamanho, cor) + comissão to produtos
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS tamanho text,
  ADD COLUMN IF NOT EXISTS cor text,
  ADD COLUMN IF NOT EXISTS comissao_percentual numeric;

-- 2. Create produto_precos (multiple prices per product)
CREATE TABLE IF NOT EXISTS public.produto_precos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  nome text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.produto_precos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view produto_precos"
  ON public.produto_precos FOR SELECT
  USING (empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Operators+ can manage produto_precos"
  ON public.produto_precos FOR ALL
  USING (empresa_id = get_user_empresa_id(auth.uid()));

-- 3. Create produto_lotes (lots with expiry per product+location)
CREATE TABLE IF NOT EXISTS public.produto_lotes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  local_id uuid NOT NULL REFERENCES public.depositos(id),
  lote text NOT NULL,
  validade date,
  quantidade numeric NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.produto_lotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view produto_lotes"
  ON public.produto_lotes FOR SELECT
  USING (empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Operators+ can manage produto_lotes"
  ON public.produto_lotes FOR ALL
  USING (empresa_id = get_user_empresa_id(auth.uid()));

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_produto_precos_produto ON public.produto_precos(produto_id);
CREATE INDEX IF NOT EXISTS idx_produto_lotes_produto ON public.produto_lotes(produto_id);
CREATE INDEX IF NOT EXISTS idx_produto_lotes_validade ON public.produto_lotes(validade) WHERE validade IS NOT NULL;
