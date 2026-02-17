
-- ════════════════════════════════════════════════════════════════
-- Inventário profissional: status, snapshot, recontagem
-- ════════════════════════════════════════════════════════════════

-- 1. Migrar dados existentes antes de alterar constraint
UPDATE inventarios SET status = 'rascunho' WHERE status = 'em_andamento';
UPDATE inventarios SET status = 'fechado' WHERE status IN ('finalizado', 'aplicado');

-- 2. Atualizar CHECK de status
ALTER TABLE inventarios DROP CONSTRAINT IF EXISTS inventarios_status_check;
ALTER TABLE inventarios ADD CONSTRAINT inventarios_status_check
  CHECK (status IN ('rascunho', 'em_contagem', 'fechado', 'cancelado'));

-- 3. Adicionar coluna iniciado_em
ALTER TABLE inventarios ADD COLUMN IF NOT EXISTS iniciado_em TIMESTAMPTZ;

-- 4. Tabela de snapshot (foto do estoque no momento do início)
CREATE TABLE public.inventario_snapshot (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventario_id UUID NOT NULL REFERENCES inventarios(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos(id),
  qtd_esperada NUMERIC NOT NULL DEFAULT 0,
  UNIQUE(inventario_id, produto_id)
);

ALTER TABLE public.inventario_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view inventario_snapshot"
  ON public.inventario_snapshot FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM inventarios i
    WHERE i.id = inventario_snapshot.inventario_id
      AND i.empresa_id = get_user_empresa_id(auth.uid())
  ));

CREATE POLICY "Operators+ can manage inventario_snapshot"
  ON public.inventario_snapshot FOR ALL
  USING (EXISTS (
    SELECT 1 FROM inventarios i
    WHERE i.id = inventario_snapshot.inventario_id
      AND i.empresa_id = get_user_empresa_id(auth.uid())
  ));

-- 5. Coluna de contagem nos itens (1ª, 2ª recontagem…)
ALTER TABLE inventario_itens ADD COLUMN IF NOT EXISTS contagem INTEGER NOT NULL DEFAULT 1;

-- Atualizar unique index para incluir contagem
DROP INDEX IF EXISTS idx_inventario_itens_unique;
CREATE UNIQUE INDEX idx_inventario_itens_unique
  ON inventario_itens (inventario_id, produto_id, contagem);

-- 6. RPC: Iniciar inventário (rascunho → em_contagem + snapshot do estoque)
CREATE OR REPLACE FUNCTION public.inventario_iniciar(p_inventario_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_empresa_id UUID;
  v_deposito_id UUID;
  v_status TEXT;
BEGIN
  SELECT empresa_id, deposito_id, status
    INTO v_empresa_id, v_deposito_id, v_status
  FROM inventarios
  WHERE id = p_inventario_id
    AND empresa_id = get_user_empresa_id(auth.uid());

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Inventário não encontrado ou sem permissão';
  END IF;

  IF v_status != 'rascunho' THEN
    RAISE EXCEPTION 'Inventário precisa estar em rascunho para iniciar (status: %)', v_status;
  END IF;

  -- Snapshot: captura TODO o estoque do depósito neste momento
  INSERT INTO inventario_snapshot (inventario_id, produto_id, qtd_esperada)
  SELECT p_inventario_id, e.produto_id, COALESCE(e.qtd, 0)
  FROM estoque e
  JOIN produtos p ON p.id = e.produto_id AND p.empresa_id = v_empresa_id AND p.ativo = true
  WHERE e.deposito_id = v_deposito_id;

  UPDATE inventarios
  SET status = 'em_contagem', iniciado_em = now()
  WHERE id = p_inventario_id;
END;
$$;

-- 7. Atualizar RPC finalizar (em_contagem → fechado, usa snapshot)
CREATE OR REPLACE FUNCTION public.inventario_finalizar(p_inventario_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_empresa_id UUID;
  v_deposito_id UUID;
  v_status TEXT;
BEGIN
  SELECT empresa_id, deposito_id, status
    INTO v_empresa_id, v_deposito_id, v_status
  FROM inventarios
  WHERE id = p_inventario_id
    AND empresa_id = get_user_empresa_id(auth.uid());

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Inventário não encontrado ou sem permissão';
  END IF;

  IF v_status != 'em_contagem' THEN
    RAISE EXCEPTION 'Inventário não está em contagem (status: %)', v_status;
  END IF;

  -- Preenche qtd_sistema a partir do snapshot (não do estoque atual!)
  UPDATE inventario_itens ii
  SET qtd_sistema = COALESCE(s.qtd_esperada, 0),
      diferenca = ii.qtd_contada - COALESCE(s.qtd_esperada, 0),
      nome_snapshot = p.nome
  FROM produtos p
  LEFT JOIN inventario_snapshot s
    ON s.inventario_id = p_inventario_id AND s.produto_id = p.id
  WHERE ii.inventario_id = p_inventario_id
    AND ii.produto_id = p.id;

  UPDATE inventarios
  SET status = 'fechado', finalizado_em = now()
  WHERE id = p_inventario_id;
END;
$$;

-- 8. RPC: Iniciar recontagem (fechado → em_contagem, cria itens contagem=N+1 para divergentes)
CREATE OR REPLACE FUNCTION public.inventario_iniciar_recontagem(p_inventario_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_empresa_id UUID;
  v_status TEXT;
  v_max_contagem INTEGER;
  v_nova_contagem INTEGER;
  v_count INTEGER;
BEGIN
  SELECT empresa_id, status
    INTO v_empresa_id, v_status
  FROM inventarios
  WHERE id = p_inventario_id
    AND empresa_id = get_user_empresa_id(auth.uid());

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Inventário não encontrado ou sem permissão';
  END IF;

  IF v_status != 'fechado' THEN
    RAISE EXCEPTION 'Inventário precisa estar fechado para recontagem (status: %)', v_status;
  END IF;

  -- Determinar próxima contagem
  SELECT COALESCE(MAX(contagem), 1) INTO v_max_contagem
  FROM inventario_itens WHERE inventario_id = p_inventario_id;

  v_nova_contagem := v_max_contagem + 1;

  -- Criar itens de recontagem apenas para os divergentes da última contagem
  INSERT INTO inventario_itens (inventario_id, produto_id, qtd_contada, contagem)
  SELECT inventario_id, produto_id, 0, v_nova_contagem
  FROM inventario_itens
  WHERE inventario_id = p_inventario_id
    AND contagem = v_max_contagem
    AND COALESCE(diferenca, 0) != 0;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'Não há itens divergentes para recontar';
  END IF;

  -- Voltar status para em_contagem
  UPDATE inventarios
  SET status = 'em_contagem', finalizado_em = NULL
  WHERE id = p_inventario_id;

  RETURN v_nova_contagem;
END;
$$;

-- 9. Atualizar aplicar ajustes para usar a contagem mais recente
CREATE OR REPLACE FUNCTION public.inventario_aplicar_ajustes(p_inventario_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_empresa_id UUID;
  v_deposito_id UUID;
  v_status TEXT;
  v_item RECORD;
  v_estoque_id UUID;
  v_max_contagem INTEGER;
BEGIN
  SELECT empresa_id, deposito_id, status
    INTO v_empresa_id, v_deposito_id, v_status
  FROM inventarios
  WHERE id = p_inventario_id
    AND empresa_id = get_user_empresa_id(auth.uid());

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Inventário não encontrado ou sem permissão';
  END IF;

  IF v_status != 'fechado' THEN
    RAISE EXCEPTION 'Inventário precisa estar fechado para aplicar ajustes (status: %)', v_status;
  END IF;

  -- Usar a contagem mais recente de cada produto
  SELECT COALESCE(MAX(contagem), 1) INTO v_max_contagem
  FROM inventario_itens WHERE inventario_id = p_inventario_id;

  FOR v_item IN
    SELECT ii.produto_id, ii.qtd_contada, COALESCE(ii.diferenca, 0) AS dif, ii.nome_snapshot
    FROM inventario_itens ii
    WHERE ii.inventario_id = p_inventario_id
      AND ii.contagem = v_max_contagem
      AND COALESCE(ii.diferenca, 0) != 0
  LOOP
    INSERT INTO movimentacoes (
      empresa_id, produto_id, deposito_id, origem, ref_id,
      tipo, qtd, usuario_id, observacao
    ) VALUES (
      v_empresa_id, v_item.produto_id, v_deposito_id,
      'inventario', p_inventario_id,
      CASE WHEN v_item.dif > 0 THEN 'entrada' ELSE 'saida' END,
      v_item.dif,
      auth.uid(),
      'Ajuste de inventário: ' || COALESCE(v_item.nome_snapshot, '')
    );

    SELECT id INTO v_estoque_id
    FROM estoque
    WHERE produto_id = v_item.produto_id AND deposito_id = v_deposito_id
    FOR UPDATE;

    IF v_estoque_id IS NOT NULL THEN
      UPDATE estoque
      SET qtd = v_item.qtd_contada, atualizado_em = now()
      WHERE id = v_estoque_id;
    ELSE
      INSERT INTO estoque (produto_id, deposito_id, qtd)
      VALUES (v_item.produto_id, v_deposito_id, v_item.qtd_contada);
    END IF;
  END LOOP;

  UPDATE inventarios
  SET status = 'fechado', aplicado_em = now()
  WHERE id = p_inventario_id;
END;
$$;
