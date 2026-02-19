
-- Add divergencia columns to transferencias
ALTER TABLE public.transferencias
ADD COLUMN IF NOT EXISTS justificativa_divergencia text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tem_divergencia boolean NOT NULL DEFAULT false;

-- Update confirmar RPC to accept justificativa
CREATE OR REPLACE FUNCTION public.transferencia_confirmar(
  p_transferencia_id uuid,
  p_local_id uuid DEFAULT NULL,
  p_justificativa text DEFAULT NULL
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_empresa_id uuid;
  v_origem_id uuid;
  v_destino_id uuid;
  v_status text;
  v_item RECORD;
  v_saldo_atual numeric;
  v_tem_divergencia boolean := false;
BEGIN
  SELECT empresa_id, origem_id, destino_id, status
    INTO v_empresa_id, v_origem_id, v_destino_id, v_status
  FROM transferencias
  WHERE id = p_transferencia_id AND empresa_id = get_user_empresa_id(auth.uid());

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Transferência não encontrada ou sem permissão';
  END IF;
  IF v_status != 'em_recebimento' THEN
    RAISE EXCEPTION 'Transferência precisa estar em recebimento para confirmar (status: %)', v_status;
  END IF;

  -- Validate user is at the destination location
  IF p_local_id IS NOT NULL AND p_local_id != v_destino_id THEN
    RAISE EXCEPTION 'Você não está no local de destino desta transferência';
  END IF;

  -- Check for divergence
  SELECT EXISTS(
    SELECT 1 FROM transferencia_itens
    WHERE transferencia_id = p_transferencia_id
    AND qtd_conferida != qtd
  ) INTO v_tem_divergencia;

  -- Require justificativa if divergence exists
  IF v_tem_divergencia AND (p_justificativa IS NULL OR trim(p_justificativa) = '') THEN
    RAISE EXCEPTION 'Justificativa obrigatória quando há divergência na conferência';
  END IF;

  FOR v_item IN SELECT * FROM transferencia_itens WHERE transferencia_id = p_transferencia_id
  LOOP
    -- Debit origin
    INSERT INTO estoque_saldos (empresa_id, local_id, produto_id, saldo)
    VALUES (v_empresa_id, v_origem_id, v_item.produto_id, 0)
    ON CONFLICT (empresa_id, local_id, produto_id) DO NOTHING;

    SELECT saldo INTO v_saldo_atual
    FROM estoque_saldos
    WHERE empresa_id = v_empresa_id AND local_id = v_origem_id AND produto_id = v_item.produto_id
    FOR UPDATE;

    IF COALESCE(v_saldo_atual, 0) < v_item.qtd THEN
      RAISE EXCEPTION 'Estoque insuficiente de "%" na origem (disponível: %, solicitado: %)',
        COALESCE(v_item.nome_snapshot, v_item.produto_id::text), COALESCE(v_saldo_atual, 0), v_item.qtd;
    END IF;

    UPDATE estoque_saldos SET saldo = saldo - v_item.qtd, updated_at = now()
    WHERE empresa_id = v_empresa_id AND local_id = v_origem_id AND produto_id = v_item.produto_id;

    INSERT INTO movimentacoes_estoque (empresa_id, local_id, produto_id, origem, ref_id, tipo, quantidade, usuario_id)
    VALUES (v_empresa_id, v_origem_id, v_item.produto_id, 'transferencia', p_transferencia_id, 'saida', v_item.qtd, auth.uid());

    INSERT INTO movimentacoes (empresa_id, produto_id, deposito_id, origem, ref_id, tipo, qtd, usuario_id, observacao)
    VALUES (v_empresa_id, v_item.produto_id, v_origem_id, 'transferencia', p_transferencia_id, 'saida', -v_item.qtd, auth.uid(), 'Transferência confirmada (saída origem)');

    -- Credit destination
    INSERT INTO estoque_saldos (empresa_id, local_id, produto_id, saldo)
    VALUES (v_empresa_id, v_destino_id, v_item.produto_id, v_item.qtd)
    ON CONFLICT (empresa_id, local_id, produto_id) DO UPDATE SET saldo = estoque_saldos.saldo + v_item.qtd, updated_at = now();

    INSERT INTO movimentacoes_estoque (empresa_id, local_id, produto_id, origem, ref_id, tipo, quantidade, usuario_id)
    VALUES (v_empresa_id, v_destino_id, v_item.produto_id, 'transferencia', p_transferencia_id, 'entrada', v_item.qtd, auth.uid());

    INSERT INTO movimentacoes (empresa_id, produto_id, deposito_id, origem, ref_id, tipo, qtd, usuario_id, observacao)
    VALUES (v_empresa_id, v_item.produto_id, v_destino_id, 'transferencia', p_transferencia_id, 'entrada', v_item.qtd, auth.uid(), 'Transferência confirmada (entrada destino)');
  END LOOP;

  UPDATE transferencias
  SET status = 'confirmada',
      confirmado_por = auth.uid(),
      confirmado_em = now(),
      tem_divergencia = v_tem_divergencia,
      justificativa_divergencia = CASE WHEN v_tem_divergencia THEN p_justificativa ELSE NULL END
  WHERE id = p_transferencia_id;
END;
$function$;
