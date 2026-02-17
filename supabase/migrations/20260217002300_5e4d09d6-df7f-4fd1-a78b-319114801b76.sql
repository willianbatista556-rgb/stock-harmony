
-- ══════════════════════════════════════════════════════════════
-- 1. Tabela: terminais (ponto físico de venda)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE public.terminais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  deposito_id uuid NOT NULL REFERENCES public.depositos(id),
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- Índice: busca rápida por empresa
CREATE INDEX idx_terminais_empresa ON public.terminais(empresa_id);

-- RLS
ALTER TABLE public.terminais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view terminais"
  ON public.terminais FOR SELECT
  USING (empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Admin/Gerente can manage terminais"
  ON public.terminais FOR ALL
  USING (
    empresa_id = get_user_empresa_id(auth.uid())
    AND (has_role(auth.uid(), 'Admin') OR has_role(auth.uid(), 'Gerente'))
  );

-- ══════════════════════════════════════════════════════════════
-- 2. Ajuste na tabela caixas: adicionar terminal_id
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.caixas
  ADD COLUMN terminal_id uuid REFERENCES public.terminais(id);

-- Drop old unique index (per deposito) and create new one (per terminal)
DROP INDEX IF EXISTS uq_caixa_aberto_por_deposito;

CREATE UNIQUE INDEX uq_caixa_aberto_por_terminal
  ON public.caixas (terminal_id)
  WHERE (status = 'aberto');
