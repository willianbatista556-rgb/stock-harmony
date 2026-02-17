import { supabase } from '@/integrations/supabase/client';

export type CashMoveType = 'entrada' | 'saida';
export type CashMoveOrigin = 'suprimento' | 'sangria';

export async function criarMovimentacaoCaixa(params: {
  empresaId: string;
  caixaId: string;
  tipo: CashMoveType;
  origem: CashMoveOrigin;
  valor: number;
  descricao?: string;
}) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('Usuário não autenticado.');

  const { error } = await supabase.from('caixa_movimentacoes').insert({
    empresa_id: params.empresaId,
    caixa_id: params.caixaId,
    origem: params.origem,
    ref_id: null,
    tipo: params.tipo,
    valor: params.valor,
    descricao: params.descricao ?? null,
    usuario_id: userId,
  });

  if (error) throw new Error(error.message);
}
