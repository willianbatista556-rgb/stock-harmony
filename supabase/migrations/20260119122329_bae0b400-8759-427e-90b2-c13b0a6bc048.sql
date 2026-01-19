-- Corrigir Security Definer Views para usar Security Invoker
-- Isso garante que as views respeitem as RLS policies do usuário que está fazendo a query

ALTER VIEW public.vw_inventario_resumo SET (security_invoker = true);
ALTER VIEW public.vw_movimentacoes_diarias SET (security_invoker = true);
ALTER VIEW public.vw_consumo_medio_diario SET (security_invoker = true);
ALTER VIEW public.vw_previsao_ruptura SET (security_invoker = true);
ALTER VIEW public.vw_produtos_top_movimentados SET (security_invoker = true);
ALTER VIEW public.vw_estoque_por_deposito SET (security_invoker = true);