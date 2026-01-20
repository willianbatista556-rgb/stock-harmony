-- Enable RLS on all analytical views
ALTER VIEW public.vw_inventario_resumo SET (security_invoker = true);
ALTER VIEW public.vw_movimentacoes_diarias SET (security_invoker = true);
ALTER VIEW public.vw_consumo_medio_diario SET (security_invoker = true);
ALTER VIEW public.vw_previsao_ruptura SET (security_invoker = true);
ALTER VIEW public.vw_produtos_top_movimentados SET (security_invoker = true);
ALTER VIEW public.vw_estoque_por_deposito SET (security_invoker = true);

-- Add input validation constraints to prevent oversized or invalid data

-- Produtos table constraints
ALTER TABLE public.produtos ADD CONSTRAINT produtos_nome_length CHECK (length(nome) <= 200);
ALTER TABLE public.produtos ADD CONSTRAINT produtos_sku_length CHECK (length(sku) <= 50);
ALTER TABLE public.produtos ADD CONSTRAINT produtos_ean_length CHECK (length(ean) <= 50);
ALTER TABLE public.produtos ADD CONSTRAINT produtos_marca_length CHECK (length(marca) <= 100);
ALTER TABLE public.produtos ADD CONSTRAINT produtos_valid_prices CHECK (COALESCE(custo_medio, 0) >= 0 AND COALESCE(preco_venda, 0) >= 0);
ALTER TABLE public.produtos ADD CONSTRAINT produtos_valid_stock_limits CHECK (COALESCE(estoque_min, 0) >= 0 AND COALESCE(estoque_max, 0) >= 0);

-- Movimentacoes table constraints
ALTER TABLE public.movimentacoes ADD CONSTRAINT movimentacoes_qtd_nonzero CHECK (qtd != 0);
ALTER TABLE public.movimentacoes ADD CONSTRAINT movimentacoes_observacao_length CHECK (length(observacao) <= 500);
ALTER TABLE public.movimentacoes ADD CONSTRAINT movimentacoes_valid_custo CHECK (COALESCE(custo_unit, 0) >= 0);

-- Depositos table constraints  
ALTER TABLE public.depositos ADD CONSTRAINT depositos_nome_length CHECK (length(nome) <= 100);

-- Categorias table constraints
ALTER TABLE public.categorias ADD CONSTRAINT categorias_nome_length CHECK (length(nome) <= 100);

-- Fornecedores table constraints
ALTER TABLE public.fornecedores ADD CONSTRAINT fornecedores_nome_length CHECK (length(nome) <= 200);
ALTER TABLE public.fornecedores ADD CONSTRAINT fornecedores_telefone_length CHECK (length(telefone) <= 20);
ALTER TABLE public.fornecedores ADD CONSTRAINT fornecedores_email_length CHECK (length(email) <= 255);
ALTER TABLE public.fornecedores ADD CONSTRAINT fornecedores_cnpj_cpf_length CHECK (length(cnpj_cpf) <= 20);

-- Empresas table constraints
ALTER TABLE public.empresas ADD CONSTRAINT empresas_nome_length CHECK (length(nome) <= 200);

-- Profiles table constraints
ALTER TABLE public.profiles ADD CONSTRAINT profiles_nome_length CHECK (length(nome) <= 200);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_length CHECK (length(email) <= 255);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_avatar_url_length CHECK (length(avatar_url) <= 500);

-- Estoque constraints
ALTER TABLE public.estoque ADD CONSTRAINT estoque_valid_qtd CHECK (COALESCE(qtd, 0) >= 0);

-- Compras constraints
ALTER TABLE public.compras ADD CONSTRAINT compras_numero_nota_length CHECK (length(numero_nota) <= 50);
ALTER TABLE public.compras ADD CONSTRAINT compras_valid_total CHECK (COALESCE(total, 0) >= 0);

-- Compra_itens constraints
ALTER TABLE public.compra_itens ADD CONSTRAINT compra_itens_valid_values CHECK (qtd > 0 AND custo_unit >= 0);

-- Alertas_estoque constraints  
ALTER TABLE public.alertas_estoque ADD CONSTRAINT alertas_tipo_length CHECK (length(tipo) <= 50);