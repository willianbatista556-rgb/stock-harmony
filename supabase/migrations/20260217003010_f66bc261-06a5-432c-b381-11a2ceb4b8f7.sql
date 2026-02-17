
-- Add identificador column to terminais
ALTER TABLE public.terminais
  ADD COLUMN IF NOT EXISTS identificador text;

-- Backfill existing rows with their id as identificador
UPDATE public.terminais SET identificador = id::text WHERE identificador IS NULL;

-- Now make it NOT NULL
ALTER TABLE public.terminais ALTER COLUMN identificador SET NOT NULL;

-- Unique constraint per empresa
ALTER TABLE public.terminais
  ADD CONSTRAINT uq_terminais_empresa_identificador UNIQUE (empresa_id, identificador);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_terminais_empresa ON public.terminais(empresa_id);
CREATE INDEX IF NOT EXISTS idx_caixas_empresa_status ON public.caixas(empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_caixas_terminal_status ON public.caixas(terminal_id, status);
