
-- ════════════════════════════════════════════════════════════════
-- Inventário: header + itens + RPC de aplicação de ajustes
-- ════════════════════════════════════════════════════════════════

-- 1. Tabela inventarios (header)
CREATE TABLE public.inventarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  deposito_id UUID NOT NULL REFERENCES depositos(id),
  usuario_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'em_andamento'
    CHECK (status IN ('em_andamento', 'finalizado', 'aplicado', 'cancelado')),
  observacao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalizado_em TIMESTAMPTZ,
  aplicado_em TIMESTAMPTZ
);

ALTER TABLE public.inventarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view inventarios"
  ON public.inventarios FOR SELECT
  USING (empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Operators+ can manage inventarios"
  ON public.inventarios FOR ALL
  USING (empresa_id = get_user_empresa_id(auth.uid()));

-- 2. Tabela inventario_itens (contagens)
CREATE TABLE public.inventario_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventario_id UUID NOT NULL REFERENCES inventarios(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos(id),
  qtd_contada NUMERIC NOT NULL DEFAULT 0,
  qtd_sistema NUMERIC,         -- snapshot no momento da finalização
  diferenca NUMERIC,            -- qtd_contada - qtd_sistema
  nome_snapshot TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inventario_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view inventario_itens"
  ON public.inventario_itens FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM inventarios i
    WHERE i.id = inventario_itens.inventario_id
      AND i.empresa_id = get_user_empresa_id(auth.uid())
  ));

CREATE POLICY "Operators+ can manage inventario_itens"
  ON public.inventario_itens FOR ALL
  USING (EXISTS (
    SELECT 1 FROM inventarios i
    WHERE i.id = inventario_itens.inventario_id
      AND i.empresa_id = get_user_empresa_id(auth.uid())
  ));

-- Unique constraint: um produto por inventário (contagens somam via upsert)
CREATE UNIQUE INDEX idx_inventario_itens_unique
  ON public.inventario_itens (inventario_id, produto_id);

-- 3. RPC: Finalizar inventário (snapshot do estoque atual + calcula divergências)
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

  IF v_status != 'em_andamento' THEN
    RAISE EXCEPTION 'Inventário não está em andamento (status: %)', v_status;
  END IF;

  -- Snapshot: preenche qtd_sistema e diferença para cada item contado
  UPDATE inventario_itens ii
  SET qtd_sistema = COALESCE(e.qtd, 0),
      diferenca = ii.qtd_contada - COALESCE(e.qtd, 0),
      nome_snapshot = p.nome
  FROM produtos p
  LEFT JOIN estoque e ON e.produto_id = p.id AND e.deposito_id = v_deposito_id
  WHERE ii.inventario_id = p_inventario_id
    AND ii.produto_id = p.id;

  UPDATE inventarios
  SET status = 'finalizado', finalizado_em = now()
  WHERE id = p_inventario_id;
END;
$$;

-- 4. RPC: Aplicar ajustes de inventário (gera movimentações)
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
BEGIN
  SELECT empresa_id, deposito_id, status
    INTO v_empresa_id, v_deposito_id, v_status
  FROM inventarios
  WHERE id = p_inventario_id
    AND empresa_id = get_user_empresa_id(auth.uid());

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Inventário não encontrado ou sem permissão';
  END IF;

  IF v_status != 'finalizado' THEN
    RAISE EXCEPTION 'Inventário precisa estar finalizado para aplicar ajustes (status: %)', v_status;
  END IF;

  FOR v_item IN
    SELECT produto_id, qtd_contada, COALESCE(diferenca, 0) AS dif, nome_snapshot
    FROM inventario_itens
    WHERE inventario_id = p_inventario_id
      AND COALESCE(diferenca, 0) != 0
  LOOP
    -- Insert movimentação de ajuste
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

    -- Upsert estoque
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
  SET status = 'aplicado', aplicado_em = now()
  WHERE id = p_inventario_id;
END;
$$;
