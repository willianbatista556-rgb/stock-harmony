
-- Orçamentos (cabeçalho)
CREATE TABLE public.orcamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  usuario_id UUID NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id),
  subtotal NUMERIC NOT NULL DEFAULT 0,
  desconto NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  observacao TEXT,
  validade DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  status TEXT NOT NULL DEFAULT 'ativo',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Itens do orçamento
CREATE TABLE public.orcamento_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  orcamento_id UUID NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id),
  nome_snapshot TEXT,
  qtd NUMERIC NOT NULL DEFAULT 1,
  preco_unit NUMERIC NOT NULL,
  desconto NUMERIC DEFAULT 0,
  subtotal NUMERIC
);

-- RLS on orcamentos
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Gerente can manage orcamentos"
  ON public.orcamentos FOR ALL
  USING (
    empresa_id = get_user_empresa_id(auth.uid())
    AND (has_role(auth.uid(), 'Admin') OR has_role(auth.uid(), 'Gerente'))
  );

CREATE POLICY "Users can view orcamentos"
  ON public.orcamentos FOR SELECT
  USING (empresa_id = get_user_empresa_id(auth.uid()));

-- RLS on orcamento_itens
ALTER TABLE public.orcamento_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Gerente can manage orcamento_itens"
  ON public.orcamento_itens FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM orcamentos o
      WHERE o.id = orcamento_itens.orcamento_id
      AND o.empresa_id = get_user_empresa_id(auth.uid())
      AND (has_role(auth.uid(), 'Admin') OR has_role(auth.uid(), 'Gerente'))
    )
  );

CREATE POLICY "Users can view orcamento_itens"
  ON public.orcamento_itens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orcamentos o
      WHERE o.id = orcamento_itens.orcamento_id
      AND o.empresa_id = get_user_empresa_id(auth.uid())
    )
  );
