
-- Feature flags granulares por empresa
CREATE TABLE public.empresa_features (
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  chave text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa_id, chave)
);

ALTER TABLE public.empresa_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own empresa features"
  ON public.empresa_features
  FOR SELECT
  TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Admin can manage empresa features"
  ON public.empresa_features
  FOR ALL
  TO authenticated
  USING (
    empresa_id = get_user_empresa_id(auth.uid())
    AND (has_role(auth.uid(), 'Admin'::app_role) OR has_role(auth.uid(), 'Gerente'::app_role))
  );

-- Seed default features for existing empresas
INSERT INTO public.empresa_features (empresa_id, chave, ativo)
SELECT e.id, f.chave, true
FROM public.empresas e
CROSS JOIN (
  VALUES ('lotes'), ('grade'), ('comissao'), ('crediario'), ('orcamentos'), ('multi_preco'), ('transferencias')
) AS f(chave)
ON CONFLICT DO NOTHING;

-- Function to check feature flag
CREATE OR REPLACE FUNCTION public.has_feature(p_empresa_id uuid, p_chave text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT ativo FROM empresa_features WHERE empresa_id = p_empresa_id AND chave = p_chave),
    true  -- default to enabled if no row
  );
$$;
