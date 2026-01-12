-- Extensão para LTREE (navegação em árvore)
CREATE EXTENSION IF NOT EXISTS ltree;

-- 1.1 EMPRESAS
CREATE TABLE empresas (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cnpj          VARCHAR(14) UNIQUE,
    nome          TEXT NOT NULL,
    ramo          TEXT CHECK (ramo IN ('comércio','serviços','alimentação','indústria','e-commerce','outro')),
    ativa         BOOLEAN DEFAULT TRUE,
    criado_em     TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2 PERFIS DE USUÁRIOS (ligado ao auth.users)
CREATE TABLE profiles (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    empresa_id    UUID REFERENCES empresas(id) ON DELETE CASCADE,
    email         TEXT,
    nome          TEXT,
    avatar_url    TEXT,
    ativo         BOOLEAN DEFAULT TRUE,
    ult_acesso    TIMESTAMPTZ,
    criado_em     TIMESTAMPTZ DEFAULT NOW()
);

-- 1.3 ENUM E TABELA DE ROLES (separada por segurança)
CREATE TYPE public.app_role AS ENUM ('Admin', 'Gerente', 'Operador', 'View');

CREATE TABLE user_roles (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role          app_role NOT NULL DEFAULT 'Operador',
    UNIQUE(user_id, role)
);

-- Função para verificar role (evita recursão em RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função para obter empresa do usuário
CREATE OR REPLACE FUNCTION public.get_user_empresa_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id FROM public.profiles WHERE user_id = _user_id
$$;

-- 1.4 CATEGORIAS (self-referente para subníveis)
CREATE TABLE categorias (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id    UUID REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
    pai_id        UUID REFERENCES categorias(id),
    nome          TEXT NOT NULL,
    path          LTREE,
    criado_em     TIMESTAMPTZ DEFAULT NOW()
);

-- 1.5 PRODUTOS
CREATE TABLE produtos (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id    UUID REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
    sku           TEXT,
    ean           TEXT,
    nome          TEXT NOT NULL,
    categoria_id  UUID REFERENCES categorias(id),
    marca         TEXT,
    unidade       TEXT DEFAULT 'UN',
    estoque_min   NUMERIC(12,4) DEFAULT 0,
    estoque_max   NUMERIC(12,4),
    custo_medio   NUMERIC(12,2) DEFAULT 0,
    preco_venda   NUMERIC(12,2),
    ativo         BOOLEAN DEFAULT TRUE,
    criado_em     TIMESTAMPTZ DEFAULT NOW()
);

-- 1.6 DEPÓSITOS / FILIAIS
CREATE TABLE depositos (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id    UUID REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
    nome          TEXT NOT NULL,
    tipo          TEXT CHECK (tipo IN ('físico','virtual')) DEFAULT 'físico',
    criado_em     TIMESTAMPTZ DEFAULT NOW()
);

-- 1.7 ESTOQUE (linha por produto + depósito)
CREATE TABLE estoque (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id    UUID REFERENCES produtos(id) ON DELETE CASCADE NOT NULL,
    deposito_id   UUID REFERENCES depositos(id) ON DELETE CASCADE NOT NULL,
    qtd           NUMERIC(12,4) DEFAULT 0,
    atualizado_em TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(produto_id, deposito_id)
);

-- 1.8 MOVIMENTAÇÕES
CREATE TABLE movimentacoes (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id    UUID REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
    produto_id    UUID REFERENCES produtos(id) NOT NULL,
    deposito_id   UUID REFERENCES depositos(id) NOT NULL,
    tipo          TEXT CHECK (tipo IN ('entrada','saida','ajuste','transferencia')) NOT NULL,
    origem        TEXT CHECK (origem IN ('compra','venda','devolucao','perda','consumo','ajuste')) NOT NULL,
    qtd           NUMERIC(12,4) NOT NULL,
    custo_unit    NUMERIC(12,4),
    data          TIMESTAMPTZ DEFAULT NOW(),
    usuario_id    UUID REFERENCES auth.users(id),
    observacao    TEXT
);

-- 1.9 FORNECEDORES
CREATE TABLE fornecedores (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id    UUID REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
    cnpj_cpf      TEXT,
    nome          TEXT NOT NULL,
    telefone      TEXT,
    email         TEXT,
    criado_em     TIMESTAMPTZ DEFAULT NOW()
);

-- 1.10 COMPRAS
CREATE TABLE compras (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id    UUID REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
    fornecedor_id UUID REFERENCES fornecedores(id),
    numero_nota   TEXT,
    data          DATE DEFAULT CURRENT_DATE,
    total         NUMERIC(12,2) DEFAULT 0,
    usuario_id    UUID REFERENCES auth.users(id),
    criado_em     TIMESTAMPTZ DEFAULT NOW()
);

-- 1.11 ITENS DA COMPRA
CREATE TABLE compra_itens (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compra_id     UUID REFERENCES compras(id) ON DELETE CASCADE NOT NULL,
    produto_id    UUID REFERENCES produtos(id) NOT NULL,
    qtd           NUMERIC(12,4) NOT NULL,
    custo_unit    NUMERIC(12,4) NOT NULL
);

-- 1.12 VENDAS
CREATE TABLE vendas (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id    UUID REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
    data          TIMESTAMPTZ DEFAULT NOW(),
    total         NUMERIC(12,2) DEFAULT 0,
    usuario_id    UUID REFERENCES auth.users(id)
);

-- 1.13 LOGS DE AUDITORIA
CREATE TABLE logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id    UUID,
    usuario_id    UUID,
    tabela        TEXT,
    registro_id   UUID,
    acao          TEXT,
    alteracao     JSONB,
    data          TIMESTAMPTZ DEFAULT NOW()
);

-- ÍNDICES ESSENCIAIS
CREATE INDEX ix_mov_prod_data ON movimentacoes(produto_id, data DESC);
CREATE INDEX ix_estoque_prod_dep ON estoque(produto_id, deposito_id);
CREATE INDEX ix_logs_empresa_data ON logs(empresa_id, data DESC);
CREATE INDEX ix_produtos_empresa ON produtos(empresa_id);
CREATE INDEX ix_categorias_empresa ON categorias(empresa_id);
CREATE INDEX ix_depositos_empresa ON depositos(empresa_id);

-- RLS em todas as tabelas
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE depositos ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE compra_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para user_roles
CREATE POLICY "Users can view own roles" ON user_roles FOR SELECT USING (auth.uid() = user_id);

-- Políticas RLS para empresas (baseado na empresa do usuário)
CREATE POLICY "Users can view their company" ON empresas FOR SELECT USING (id = public.get_user_empresa_id(auth.uid()));
CREATE POLICY "Admins can update company" ON empresas FOR UPDATE USING (id = public.get_user_empresa_id(auth.uid()) AND public.has_role(auth.uid(), 'Admin'));

-- Políticas RLS para categorias
CREATE POLICY "Users can view categories" ON categorias FOR SELECT USING (empresa_id = public.get_user_empresa_id(auth.uid()));
CREATE POLICY "Operators+ can manage categories" ON categorias FOR ALL USING (empresa_id = public.get_user_empresa_id(auth.uid()));

-- Políticas RLS para produtos
CREATE POLICY "Users can view products" ON produtos FOR SELECT USING (empresa_id = public.get_user_empresa_id(auth.uid()));
CREATE POLICY "Operators+ can manage products" ON produtos FOR ALL USING (empresa_id = public.get_user_empresa_id(auth.uid()));

-- Políticas RLS para depositos
CREATE POLICY "Users can view deposits" ON depositos FOR SELECT USING (empresa_id = public.get_user_empresa_id(auth.uid()));
CREATE POLICY "Admins can manage deposits" ON depositos FOR ALL USING (empresa_id = public.get_user_empresa_id(auth.uid()) AND (public.has_role(auth.uid(), 'Admin') OR public.has_role(auth.uid(), 'Gerente')));

-- Políticas RLS para estoque
CREATE POLICY "Users can view stock" ON estoque FOR SELECT USING (
    EXISTS (SELECT 1 FROM produtos p WHERE p.id = estoque.produto_id AND p.empresa_id = public.get_user_empresa_id(auth.uid()))
);
CREATE POLICY "Operators+ can manage stock" ON estoque FOR ALL USING (
    EXISTS (SELECT 1 FROM produtos p WHERE p.id = estoque.produto_id AND p.empresa_id = public.get_user_empresa_id(auth.uid()))
);

-- Políticas RLS para movimentacoes
CREATE POLICY "Users can view movements" ON movimentacoes FOR SELECT USING (empresa_id = public.get_user_empresa_id(auth.uid()));
CREATE POLICY "Operators+ can insert movements" ON movimentacoes FOR INSERT WITH CHECK (empresa_id = public.get_user_empresa_id(auth.uid()));

-- Políticas RLS para fornecedores
CREATE POLICY "Users can view suppliers" ON fornecedores FOR SELECT USING (empresa_id = public.get_user_empresa_id(auth.uid()));
CREATE POLICY "Operators+ can manage suppliers" ON fornecedores FOR ALL USING (empresa_id = public.get_user_empresa_id(auth.uid()));

-- Políticas RLS para compras
CREATE POLICY "Users can view purchases" ON compras FOR SELECT USING (empresa_id = public.get_user_empresa_id(auth.uid()));
CREATE POLICY "Operators+ can manage purchases" ON compras FOR ALL USING (empresa_id = public.get_user_empresa_id(auth.uid()));

-- Políticas RLS para compra_itens
CREATE POLICY "Users can view purchase items" ON compra_itens FOR SELECT USING (
    EXISTS (SELECT 1 FROM compras c WHERE c.id = compra_itens.compra_id AND c.empresa_id = public.get_user_empresa_id(auth.uid()))
);
CREATE POLICY "Operators+ can manage purchase items" ON compra_itens FOR ALL USING (
    EXISTS (SELECT 1 FROM compras c WHERE c.id = compra_itens.compra_id AND c.empresa_id = public.get_user_empresa_id(auth.uid()))
);

-- Políticas RLS para vendas
CREATE POLICY "Users can view sales" ON vendas FOR SELECT USING (empresa_id = public.get_user_empresa_id(auth.uid()));
CREATE POLICY "Operators+ can manage sales" ON vendas FOR ALL USING (empresa_id = public.get_user_empresa_id(auth.uid()));

-- Políticas RLS para logs
CREATE POLICY "Users can view logs" ON logs FOR SELECT USING (empresa_id = public.get_user_empresa_id(auth.uid()));
CREATE POLICY "System can insert logs" ON logs FOR INSERT WITH CHECK (empresa_id = public.get_user_empresa_id(auth.uid()));

-- Trigger para criar profile automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, nome)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.email));
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'Operador');
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();