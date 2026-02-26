
-- ═══════════════════════════════════════════════════════════════
-- AUDIT LOG: Immutable, append-only audit trail
-- ═══════════════════════════════════════════════════════════════

-- 1. Main audit_log table (immutable — no UPDATE/DELETE allowed)
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  usuario_id uuid,
  acao text NOT NULL,           -- 'login', 'logout', 'insert', 'update', 'delete', 'venda', 'estoque_ajuste', etc.
  tabela text,                  -- source table name
  registro_id uuid,             -- affected record id
  dados_antes jsonb,            -- snapshot before (for update/delete)
  dados_depois jsonb,           -- snapshot after (for insert/update)
  ip_address text,
  user_agent text,
  metadata jsonb,               -- extra context
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- Indexes for fast queries
CREATE INDEX idx_audit_log_empresa ON public.audit_log(empresa_id);
CREATE INDEX idx_audit_log_criado ON public.audit_log(criado_em DESC);
CREATE INDEX idx_audit_log_acao ON public.audit_log(acao);
CREATE INDEX idx_audit_log_tabela ON public.audit_log(tabela);
CREATE INDEX idx_audit_log_usuario ON public.audit_log(usuario_id);

-- RLS: read-only for authenticated users of the same empresa
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company audit logs"
  ON public.audit_log FOR SELECT TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));

-- Allow inserts (from triggers/functions only, never direct user inserts via API)
CREATE POLICY "System can insert audit logs"
  ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()));

-- NO UPDATE or DELETE policies = immutable by design

-- 2. Helper function to write audit entries (used by triggers)
CREATE OR REPLACE FUNCTION public.audit_write(
  p_empresa_id uuid,
  p_usuario_id uuid,
  p_acao text,
  p_tabela text DEFAULT NULL,
  p_registro_id uuid DEFAULT NULL,
  p_dados_antes jsonb DEFAULT NULL,
  p_dados_depois jsonb DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_log (empresa_id, usuario_id, acao, tabela, registro_id, dados_antes, dados_depois, metadata)
  VALUES (p_empresa_id, p_usuario_id, p_acao, p_tabela, p_registro_id, p_dados_antes, p_dados_depois, p_metadata);
END;
$$;

-- 3. Generic audit trigger for DELETE operations on critical tables
CREATE OR REPLACE FUNCTION public.audit_on_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id uuid;
BEGIN
  -- Try to get empresa_id from the deleted row
  IF TG_TABLE_NAME IN ('produtos', 'categorias', 'depositos', 'fornecedores', 'clientes') THEN
    v_empresa_id := OLD.empresa_id;
  ELSE
    v_empresa_id := get_user_empresa_id(auth.uid());
  END IF;

  PERFORM audit_write(
    v_empresa_id,
    auth.uid(),
    'delete',
    TG_TABLE_NAME,
    OLD.id,
    to_jsonb(OLD),
    NULL,
    jsonb_build_object('trigger', TG_NAME)
  );
  RETURN OLD;
END;
$$;

-- 4. Audit trigger for UPDATE on critical tables (captures before/after)
CREATE OR REPLACE FUNCTION public.audit_on_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id uuid;
BEGIN
  IF TG_TABLE_NAME IN ('produtos', 'categorias', 'depositos', 'fornecedores', 'clientes', 'empresas') THEN
    v_empresa_id := COALESCE(NEW.empresa_id, OLD.empresa_id);
  ELSE
    v_empresa_id := get_user_empresa_id(auth.uid());
  END IF;

  -- Only log if something actually changed
  IF to_jsonb(OLD) IS DISTINCT FROM to_jsonb(NEW) THEN
    PERFORM audit_write(
      v_empresa_id,
      auth.uid(),
      'update',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      jsonb_build_object('trigger', TG_NAME)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 5. Attach audit triggers to critical tables

-- Produtos
CREATE TRIGGER trg_audit_produtos_delete AFTER DELETE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.audit_on_delete();
CREATE TRIGGER trg_audit_produtos_update AFTER UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.audit_on_update();

-- Categorias
CREATE TRIGGER trg_audit_categorias_delete AFTER DELETE ON public.categorias FOR EACH ROW EXECUTE FUNCTION public.audit_on_delete();

-- Depositos
CREATE TRIGGER trg_audit_depositos_delete AFTER DELETE ON public.depositos FOR EACH ROW EXECUTE FUNCTION public.audit_on_delete();

-- Fornecedores
CREATE TRIGGER trg_audit_fornecedores_delete AFTER DELETE ON public.fornecedores FOR EACH ROW EXECUTE FUNCTION public.audit_on_delete();

-- Clientes
CREATE TRIGGER trg_audit_clientes_delete AFTER DELETE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.audit_on_delete();

-- Empresas (update only — no delete)
CREATE TRIGGER trg_audit_empresas_update AFTER UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION public.audit_on_update();

-- Estoque saldos (update = ajuste)
CREATE TRIGGER trg_audit_estoque_update AFTER UPDATE ON public.estoque_saldos FOR EACH ROW EXECUTE FUNCTION public.audit_on_update();

-- 6. Audit function for login events (call from frontend after successful auth)
CREATE OR REPLACE FUNCTION public.audit_login()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id uuid;
BEGIN
  v_empresa_id := get_user_empresa_id(auth.uid());
  IF v_empresa_id IS NOT NULL THEN
    PERFORM audit_write(v_empresa_id, auth.uid(), 'login', 'auth', auth.uid(), NULL, NULL, NULL);
  END IF;
END;
$$;
