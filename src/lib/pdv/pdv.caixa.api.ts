import { supabase } from '@/integrations/supabase/client';

export type CaixaMovTipo = 'sangria' | 'suprimento';

export interface CaixaMovPayload {
  caixaId: string;
  empresaId: string;
  usuarioId: string;
  tipo: CaixaMovTipo;
  valor: number;
  descricao?: string;
}

export async function registrarCaixaMov(payload: CaixaMovPayload) {
  const { caixaId, empresaId, usuarioId, tipo, valor, descricao } = payload;

  const { data, error } = await supabase
    .from('caixa_movimentacoes')
    .insert({
      caixa_id: caixaId,
      empresa_id: empresaId,
      usuario_id: usuarioId,
      tipo,
      origem: tipo, // sangria or suprimento
      valor: tipo === 'sangria' ? -Math.abs(valor) : Math.abs(valor),
      descricao: descricao || (tipo === 'sangria' ? 'Sangria' : 'Suprimento'),
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}
