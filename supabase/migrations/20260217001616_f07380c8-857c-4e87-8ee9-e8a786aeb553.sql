-- Enforce: only 1 open caixa per deposit at a time
CREATE UNIQUE INDEX uq_caixa_aberto_por_deposito
  ON public.caixas (deposito_id)
  WHERE (status = 'aberto');