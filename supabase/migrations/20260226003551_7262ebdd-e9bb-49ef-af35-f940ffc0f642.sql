
-- Contas a Pagar
CREATE TABLE public.contas_pagar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  descricao text NOT NULL,
  valor numeric NOT NULL,
  vencimento date NOT NULL,
  pago_em date,
  status text NOT NULL DEFAULT 'pendente',
  categoria text,
  fornecedor_id uuid REFERENCES public.fornecedores(id),
  observacao text,
  usuario_id uuid NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contas_pagar" ON public.contas_pagar
  FOR SELECT USING (empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Operators+ can manage contas_pagar" ON public.contas_pagar
  FOR ALL USING (empresa_id = get_user_empresa_id(auth.uid()));

-- Contas a Receber
CREATE TABLE public.contas_receber (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  descricao text NOT NULL,
  valor numeric NOT NULL,
  vencimento date NOT NULL,
  recebido_em date,
  status text NOT NULL DEFAULT 'pendente',
  cliente_id uuid REFERENCES public.clientes(id),
  parcela integer NOT NULL DEFAULT 1,
  total_parcelas integer NOT NULL DEFAULT 1,
  venda_id uuid REFERENCES public.vendas(id),
  observacao text,
  usuario_id uuid NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contas_receber ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contas_receber" ON public.contas_receber
  FOR SELECT USING (empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Operators+ can manage contas_receber" ON public.contas_receber
  FOR ALL USING (empresa_id = get_user_empresa_id(auth.uid()));

-- Indexes
CREATE INDEX idx_contas_pagar_empresa ON public.contas_pagar(empresa_id);
CREATE INDEX idx_contas_pagar_vencimento ON public.contas_pagar(vencimento);
CREATE INDEX idx_contas_pagar_status ON public.contas_pagar(status);
CREATE INDEX idx_contas_receber_empresa ON public.contas_receber(empresa_id);
CREATE INDEX idx_contas_receber_vencimento ON public.contas_receber(vencimento);
CREATE INDEX idx_contas_receber_status ON public.contas_receber(status);
