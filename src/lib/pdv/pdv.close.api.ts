import { supabase } from '@/integrations/supabase/client';

export type CaixaResumo = {
  empresa_id: string;
  saldo_inicial: number;
  total_vendas: number;
  mov_entrada: number;
  mov_saida: number;
  por_metodo: Array<{ metodo: string; valor: number }>;
  sugestao_saldo_final: number;
};

export async function getCaixaResumo(caixaId: string) {
  const { data, error } = await supabase.rpc('caixa_resumo', { p_caixa_id: caixaId });
  if (error) throw new Error(error.message);
  return data as unknown as CaixaResumo;
}

export async function fecharCaixaRPC(params: {
  caixaId: string;
  valorContado: number;
  observacao?: string;
}) {
  const { error } = await supabase.rpc('caixa_fechar', {
    p_caixa_id: params.caixaId,
    p_valor_contado: params.valorContado,
    p_observacao: params.observacao ?? null,
  });
  if (error) throw new Error(error.message);
}
