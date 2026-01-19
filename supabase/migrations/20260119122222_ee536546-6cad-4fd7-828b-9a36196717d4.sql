-- Criar trigger para novos usuários (estava faltando)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== TABELA DE ALERTAS DE ESTOQUE =====
CREATE TABLE IF NOT EXISTS public.alertas_estoque (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('estoque_baixo', 'estoque_zerado', 'ruptura_iminente')),
    resolvido BOOLEAN DEFAULT FALSE,
    criado_em TIMESTAMPTZ DEFAULT now(),
    resolvido_em TIMESTAMPTZ
);

-- Índices para alertas
CREATE INDEX IF NOT EXISTS idx_alertas_empresa_resolvido ON public.alertas_estoque(empresa_id, resolvido);
CREATE INDEX IF NOT EXISTS idx_alertas_produto ON public.alertas_estoque(produto_id);

-- RLS para alertas
ALTER TABLE public.alertas_estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view alerts"
ON public.alertas_estoque
FOR SELECT
USING (empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "System can manage alerts"
ON public.alertas_estoque
FOR ALL
USING (empresa_id = get_user_empresa_id(auth.uid()));

-- ===== VIEW: RESUMO DO INVENTÁRIO =====
CREATE OR REPLACE VIEW public.vw_inventario_resumo AS
SELECT
    p.empresa_id,
    COUNT(DISTINCT p.id) as total_produtos,
    COALESCE(SUM(e.qtd), 0) as total_estoque,
    COALESCE(SUM(e.qtd * p.custo_medio), 0) as valor_total,
    COUNT(DISTINCT CASE WHEN e.qtd <= p.estoque_min THEN p.id END) as produtos_estoque_baixo,
    COUNT(DISTINCT CASE WHEN e.qtd = 0 THEN p.id END) as produtos_zerados
FROM public.produtos p
LEFT JOIN public.estoque e ON e.produto_id = p.id
WHERE p.ativo = true
GROUP BY p.empresa_id;

-- ===== VIEW: MOVIMENTAÇÕES DIÁRIAS =====
CREATE OR REPLACE VIEW public.vw_movimentacoes_diarias AS
SELECT
    m.empresa_id,
    DATE(m.data) as dia,
    SUM(CASE WHEN m.tipo = 'entrada' THEN m.qtd ELSE 0 END) as total_entradas,
    SUM(CASE WHEN m.tipo = 'saida' THEN m.qtd ELSE 0 END) as total_saidas,
    SUM(CASE WHEN m.tipo = 'ajuste' THEN m.qtd ELSE 0 END) as total_ajustes,
    COUNT(*) as total_movimentacoes
FROM public.movimentacoes m
GROUP BY m.empresa_id, DATE(m.data)
ORDER BY dia DESC;

-- ===== VIEW: CONSUMO MÉDIO DIÁRIO (últimos 30 dias) =====
CREATE OR REPLACE VIEW public.vw_consumo_medio_diario AS
SELECT
    m.empresa_id,
    m.produto_id,
    p.nome as produto_nome,
    COALESCE(SUM(m.qtd) / NULLIF(COUNT(DISTINCT DATE(m.data)), 0), 0) as consumo_medio_diario,
    SUM(m.qtd) as total_saidas_30d,
    COUNT(DISTINCT DATE(m.data)) as dias_com_saida
FROM public.movimentacoes m
JOIN public.produtos p ON p.id = m.produto_id
WHERE m.tipo = 'saida'
  AND m.data >= NOW() - INTERVAL '30 days'
GROUP BY m.empresa_id, m.produto_id, p.nome;

-- ===== VIEW: PREVISÃO DE RUPTURA =====
CREATE OR REPLACE VIEW public.vw_previsao_ruptura AS
SELECT
    p.empresa_id,
    p.id as produto_id,
    p.nome as produto_nome,
    p.sku,
    p.estoque_min,
    COALESCE(e.qtd_total, 0) as estoque_atual,
    COALESCE(cmd.consumo_medio_diario, 0) as consumo_medio_diario,
    CASE 
        WHEN COALESCE(cmd.consumo_medio_diario, 0) = 0 THEN NULL
        ELSE ROUND(COALESCE(e.qtd_total, 0) / cmd.consumo_medio_diario)
    END as dias_para_ruptura,
    CASE
        WHEN COALESCE(e.qtd_total, 0) = 0 THEN 'critico'
        WHEN COALESCE(e.qtd_total, 0) <= COALESCE(p.estoque_min, 0) THEN 'baixo'
        WHEN COALESCE(cmd.consumo_medio_diario, 0) > 0 
             AND COALESCE(e.qtd_total, 0) / cmd.consumo_medio_diario <= 7 THEN 'alerta'
        WHEN COALESCE(cmd.consumo_medio_diario, 0) > 0 
             AND COALESCE(e.qtd_total, 0) / cmd.consumo_medio_diario <= 15 THEN 'atencao'
        ELSE 'normal'
    END as status_estoque
FROM public.produtos p
LEFT JOIN (
    SELECT produto_id, SUM(qtd) as qtd_total
    FROM public.estoque
    GROUP BY produto_id
) e ON e.produto_id = p.id
LEFT JOIN public.vw_consumo_medio_diario cmd ON cmd.produto_id = p.id
WHERE p.ativo = true;

-- ===== VIEW: PRODUTOS MAIS MOVIMENTADOS =====
CREATE OR REPLACE VIEW public.vw_produtos_top_movimentados AS
SELECT
    m.empresa_id,
    m.produto_id,
    p.nome as produto_nome,
    SUM(m.qtd) as total_movimentado,
    COUNT(*) as num_movimentacoes
FROM public.movimentacoes m
JOIN public.produtos p ON p.id = m.produto_id
WHERE m.data >= NOW() - INTERVAL '30 days'
GROUP BY m.empresa_id, m.produto_id, p.nome
ORDER BY total_movimentado DESC;

-- ===== VIEW: ESTOQUE POR DEPÓSITO =====
CREATE OR REPLACE VIEW public.vw_estoque_por_deposito AS
SELECT
    d.empresa_id,
    d.id as deposito_id,
    d.nome as deposito_nome,
    d.tipo as deposito_tipo,
    COUNT(DISTINCT e.produto_id) as num_produtos,
    COALESCE(SUM(e.qtd), 0) as total_itens,
    COALESCE(SUM(e.qtd * p.custo_medio), 0) as valor_total
FROM public.depositos d
LEFT JOIN public.estoque e ON e.deposito_id = d.id
LEFT JOIN public.produtos p ON p.id = e.produto_id
GROUP BY d.empresa_id, d.id, d.nome, d.tipo;

-- ===== FUNÇÃO: VERIFICAR E CRIAR ALERTAS =====
CREATE OR REPLACE FUNCTION public.check_stock_alerts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_produto produtos%ROWTYPE;
    v_estoque_total NUMERIC;
    v_empresa_id UUID;
    v_alerta_existe BOOLEAN;
BEGIN
    -- Obter dados do produto
    SELECT * INTO v_produto FROM produtos WHERE id = NEW.produto_id;
    
    IF NOT FOUND THEN
        RETURN NEW;
    END IF;
    
    v_empresa_id := v_produto.empresa_id;
    
    -- Calcular estoque total do produto
    SELECT COALESCE(SUM(qtd), 0) INTO v_estoque_total
    FROM estoque WHERE produto_id = NEW.produto_id;
    
    -- Verificar se já existe alerta ativo
    SELECT EXISTS(
        SELECT 1 FROM alertas_estoque 
        WHERE produto_id = NEW.produto_id 
        AND resolvido = false
    ) INTO v_alerta_existe;
    
    -- Se estoque zerado
    IF v_estoque_total = 0 AND NOT v_alerta_existe THEN
        INSERT INTO alertas_estoque (empresa_id, produto_id, tipo)
        VALUES (v_empresa_id, NEW.produto_id, 'estoque_zerado');
    -- Se estoque baixo
    ELSIF v_estoque_total > 0 AND v_estoque_total <= COALESCE(v_produto.estoque_min, 0) AND NOT v_alerta_existe THEN
        INSERT INTO alertas_estoque (empresa_id, produto_id, tipo)
        VALUES (v_empresa_id, NEW.produto_id, 'estoque_baixo');
    -- Se estoque normalizado, resolver alertas
    ELSIF v_estoque_total > COALESCE(v_produto.estoque_min, 0) AND v_alerta_existe THEN
        UPDATE alertas_estoque 
        SET resolvido = true, resolvido_em = NOW()
        WHERE produto_id = NEW.produto_id AND resolvido = false;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger para verificar alertas após mudança no estoque
DROP TRIGGER IF EXISTS tr_check_stock_alerts ON public.estoque;
CREATE TRIGGER tr_check_stock_alerts
    AFTER INSERT OR UPDATE OF qtd ON public.estoque
    FOR EACH ROW
    EXECUTE FUNCTION public.check_stock_alerts();

-- Adicionar coluna atualizado_em em estoque se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'estoque' 
        AND column_name = 'atualizado_em'
    ) THEN
        ALTER TABLE public.estoque ADD COLUMN atualizado_em TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;