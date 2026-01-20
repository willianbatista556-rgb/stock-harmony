import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Movimentacao {
  id: string;
  tipo: string;
  origem: string;
  produto_id: string;
  deposito_id: string;
  qtd: number;
  custo_unit: number | null;
  observacao: string | null;
  data: string | null;
  usuario_id: string | null;
  empresa_id: string;
  produto?: { nome: string; sku: string | null };
  deposito?: { nome: string };
}

export function useMovimentacoes() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['movimentacoes', profile?.empresa_id],
    queryFn: async () => {
      if (!profile?.empresa_id) return [];
      
      const { data, error } = await supabase
        .from('movimentacoes')
        .select(`
          *,
          produto:produtos(nome, sku),
          deposito:depositos(nome)
        `)
        .eq('empresa_id', profile.empresa_id)
        .order('data', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as Movimentacao[];
    },
    enabled: !!profile?.empresa_id,
  });
}

interface CreateMovimentacaoData {
  tipo: 'entrada' | 'saida' | 'ajuste';
  origem: string;
  produto_id: string;
  deposito_id: string;
  qtd: number;
  custo_unit?: number;
  observacao?: string;
}

export function useCreateMovimentacao() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateMovimentacaoData) => {
      if (!profile?.empresa_id) throw new Error('Empresa não encontrada');

      // Insert movimentacao
      const { data: movimentacao, error: movError } = await supabase
        .from('movimentacoes')
        .insert({
          tipo: data.tipo,
          origem: data.origem,
          produto_id: data.produto_id,
          deposito_id: data.deposito_id,
          qtd: data.tipo === 'saida' ? -Math.abs(data.qtd) : data.qtd,
          custo_unit: data.custo_unit || null,
          observacao: data.observacao || null,
          empresa_id: profile.empresa_id,
          usuario_id: user?.id || null,
        })
        .select()
        .single();

      if (movError) throw movError;

      // Update estoque
      const { data: estoqueExistente } = await supabase
        .from('estoque')
        .select('id, qtd')
        .eq('produto_id', data.produto_id)
        .eq('deposito_id', data.deposito_id)
        .single();

      const qtdFinal = data.tipo === 'saida' ? -Math.abs(data.qtd) : data.qtd;

      if (estoqueExistente) {
        const { error: updateError } = await supabase
          .from('estoque')
          .update({ 
            qtd: (estoqueExistente.qtd || 0) + qtdFinal,
            atualizado_em: new Date().toISOString()
          })
          .eq('id', estoqueExistente.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('estoque')
          .insert({
            produto_id: data.produto_id,
            deposito_id: data.deposito_id,
            qtd: qtdFinal,
          });

        if (insertError) throw insertError;
      }

      return movimentacao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimentacoes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Movimentação registrada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao registrar movimentação: ' + error.message);
    },
  });
}
