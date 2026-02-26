
-- ═══════════════════════════════════════════════════════════════
-- SaaS Plans, Subscriptions & Limits
-- ═══════════════════════════════════════════════════════════════

-- 1. Plans table (public, readable by all authenticated)
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  descricao text,
  preco_mensal numeric NOT NULL DEFAULT 0,
  preco_anual numeric,
  ativo boolean NOT NULL DEFAULT true,
  destaque boolean NOT NULL DEFAULT false,
  ordem integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view plans"
  ON public.plans FOR SELECT TO authenticated
  USING (true);

-- 2. Plan limits table
CREATE TABLE public.plan_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  chave text NOT NULL,
  valor integer NOT NULL DEFAULT 0,
  UNIQUE (plan_id, chave)
);

ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view plan_limits"
  ON public.plan_limits FOR SELECT TO authenticated
  USING (true);

-- 3. Subscriptions table (1 per empresa)
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE UNIQUE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'ativa',
  inicio timestamptz NOT NULL DEFAULT now(),
  fim timestamptz,
  stripe_subscription_id text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "System can manage subscriptions"
  ON public.subscriptions FOR ALL TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));

-- Index for fast lookups
CREATE INDEX idx_subscriptions_empresa ON public.subscriptions(empresa_id);
CREATE INDEX idx_subscriptions_plan ON public.subscriptions(plan_id);
CREATE INDEX idx_plan_limits_plan ON public.plan_limits(plan_id);

-- 4. Seed default plans
INSERT INTO public.plans (id, nome, descricao, preco_mensal, preco_anual, destaque, ordem) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Grátis', 'Ideal para começar. Funcionalidades básicas.', 0, 0, false, 1),
  ('00000000-0000-0000-0000-000000000002', 'Essencial', 'Para pequenos negócios em crescimento.', 79.90, 799, false, 2),
  ('00000000-0000-0000-0000-000000000003', 'Profissional', 'Gestão completa multi-filial.', 149.90, 1499, true, 3),
  ('00000000-0000-0000-0000-000000000004', 'Enterprise', 'Sob medida para grandes operações.', 299.90, 2999, false, 4);

-- 5. Seed limits per plan
-- Keys: max_usuarios, max_filiais, max_produtos, mod_pdv, mod_financeiro, mod_inventario, mod_transferencias, mod_relatorios, mod_dre
INSERT INTO public.plan_limits (plan_id, chave, valor) VALUES
  -- Grátis
  ('00000000-0000-0000-0000-000000000001', 'max_usuarios', 1),
  ('00000000-0000-0000-0000-000000000001', 'max_filiais', 1),
  ('00000000-0000-0000-0000-000000000001', 'max_produtos', 50),
  ('00000000-0000-0000-0000-000000000001', 'mod_pdv', 1),
  ('00000000-0000-0000-0000-000000000001', 'mod_financeiro', 0),
  ('00000000-0000-0000-0000-000000000001', 'mod_inventario', 0),
  ('00000000-0000-0000-0000-000000000001', 'mod_transferencias', 0),
  ('00000000-0000-0000-0000-000000000001', 'mod_relatorios', 0),
  ('00000000-0000-0000-0000-000000000001', 'mod_dre', 0),
  -- Essencial
  ('00000000-0000-0000-0000-000000000002', 'max_usuarios', 3),
  ('00000000-0000-0000-0000-000000000002', 'max_filiais', 2),
  ('00000000-0000-0000-0000-000000000002', 'max_produtos', 500),
  ('00000000-0000-0000-0000-000000000002', 'mod_pdv', 1),
  ('00000000-0000-0000-0000-000000000002', 'mod_financeiro', 1),
  ('00000000-0000-0000-0000-000000000002', 'mod_inventario', 1),
  ('00000000-0000-0000-0000-000000000002', 'mod_transferencias', 0),
  ('00000000-0000-0000-0000-000000000002', 'mod_relatorios', 1),
  ('00000000-0000-0000-0000-000000000002', 'mod_dre', 0),
  -- Profissional
  ('00000000-0000-0000-0000-000000000003', 'max_usuarios', 10),
  ('00000000-0000-0000-0000-000000000003', 'max_filiais', 5),
  ('00000000-0000-0000-0000-000000000003', 'max_produtos', 5000),
  ('00000000-0000-0000-0000-000000000003', 'mod_pdv', 1),
  ('00000000-0000-0000-0000-000000000003', 'mod_financeiro', 1),
  ('00000000-0000-0000-0000-000000000003', 'mod_inventario', 1),
  ('00000000-0000-0000-0000-000000000003', 'mod_transferencias', 1),
  ('00000000-0000-0000-0000-000000000003', 'mod_relatorios', 1),
  ('00000000-0000-0000-0000-000000000003', 'mod_dre', 1),
  -- Enterprise
  ('00000000-0000-0000-0000-000000000004', 'max_usuarios', 9999),
  ('00000000-0000-0000-0000-000000000004', 'max_filiais', 9999),
  ('00000000-0000-0000-0000-000000000004', 'max_produtos', 99999),
  ('00000000-0000-0000-0000-000000000004', 'mod_pdv', 1),
  ('00000000-0000-0000-0000-000000000004', 'mod_financeiro', 1),
  ('00000000-0000-0000-0000-000000000004', 'mod_inventario', 1),
  ('00000000-0000-0000-0000-000000000004', 'mod_transferencias', 1),
  ('00000000-0000-0000-0000-000000000004', 'mod_relatorios', 1),
  ('00000000-0000-0000-0000-000000000004', 'mod_dre', 1);

-- 6. Helper function: get current plan limits for a company
CREATE OR REPLACE FUNCTION public.get_empresa_limits(p_empresa_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_object_agg(pl.chave, pl.valor),
    '{}'::jsonb
  )
  FROM subscriptions s
  JOIN plan_limits pl ON pl.plan_id = s.plan_id
  WHERE s.empresa_id = p_empresa_id
    AND s.status = 'ativa';
$$;

-- 7. Helper function: get current usage counts
CREATE OR REPLACE FUNCTION public.get_empresa_usage(p_empresa_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'usuarios', (SELECT count(*) FROM profiles WHERE empresa_id = p_empresa_id AND ativo = true),
    'filiais', (SELECT count(*) FROM depositos WHERE empresa_id = p_empresa_id),
    'produtos', (SELECT count(*) FROM produtos WHERE empresa_id = p_empresa_id AND ativo = true)
  );
$$;

-- 8. Auto-assign free plan to new companies (trigger)
CREATE OR REPLACE FUNCTION public.auto_assign_free_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO subscriptions (empresa_id, plan_id, status)
  VALUES (NEW.id, '00000000-0000-0000-0000-000000000001', 'ativa')
  ON CONFLICT (empresa_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_assign_free_plan
  AFTER INSERT ON public.empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_free_plan();

-- 9. Assign free plan to existing companies without subscription
INSERT INTO subscriptions (empresa_id, plan_id, status)
SELECT e.id, '00000000-0000-0000-0000-000000000001', 'ativa'
FROM empresas e
WHERE NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.empresa_id = e.id);
