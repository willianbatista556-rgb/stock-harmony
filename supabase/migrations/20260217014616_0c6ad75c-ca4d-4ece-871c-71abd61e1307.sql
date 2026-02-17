
-- Company-level stock config
CREATE TABLE IF NOT EXISTS public.empresa_config (
  empresa_id uuid PRIMARY KEY REFERENCES empresas(id),
  bloquear_venda_sem_estoque boolean NOT NULL DEFAULT true,
  permitir_estoque_negativo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.empresa_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresa_config_select"
ON public.empresa_config FOR SELECT
USING (empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "empresa_config_insert"
ON public.empresa_config FOR INSERT
WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "empresa_config_update"
ON public.empresa_config FOR UPDATE
USING (empresa_id = get_user_empresa_id(auth.uid()))
WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()));

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_empresa_config_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_empresa_config_updated_at
BEFORE UPDATE ON public.empresa_config
FOR EACH ROW
EXECUTE FUNCTION public.update_empresa_config_updated_at();
