
-- Create venda_itens table for POS line items
CREATE TABLE public.venda_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id),
  qtd NUMERIC NOT NULL DEFAULT 1,
  preco_unit NUMERIC NOT NULL,
  desconto NUMERIC DEFAULT 0,
  subtotal NUMERIC GENERATED ALWAYS AS ((qtd * preco_unit) - COALESCE(desconto, 0)) STORED
);

-- Enable RLS
ALTER TABLE public.venda_itens ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view sale items"
ON public.venda_itens FOR SELECT
USING (EXISTS (
  SELECT 1 FROM vendas v WHERE v.id = venda_itens.venda_id 
  AND v.empresa_id = get_user_empresa_id(auth.uid())
));

CREATE POLICY "Operators+ can manage sale items"
ON public.venda_itens FOR ALL
USING (EXISTS (
  SELECT 1 FROM vendas v WHERE v.id = venda_itens.venda_id 
  AND v.empresa_id = get_user_empresa_id(auth.uid())
));

-- Create pagamentos table for mixed payments
CREATE TABLE public.pagamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  forma TEXT NOT NULL CHECK (forma IN ('dinheiro', 'credito', 'debito', 'pix')),
  valor NUMERIC NOT NULL,
  troco NUMERIC DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payments"
ON public.pagamentos FOR SELECT
USING (EXISTS (
  SELECT 1 FROM vendas v WHERE v.id = pagamentos.venda_id 
  AND v.empresa_id = get_user_empresa_id(auth.uid())
));

CREATE POLICY "Operators+ can manage payments"
ON public.pagamentos FOR ALL
USING (EXISTS (
  SELECT 1 FROM vendas v WHERE v.id = pagamentos.venda_id 
  AND v.empresa_id = get_user_empresa_id(auth.uid())
));

-- Add status to vendas
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'aberta';
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS desconto NUMERIC DEFAULT 0;
