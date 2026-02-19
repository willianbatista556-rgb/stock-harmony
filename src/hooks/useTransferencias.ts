import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Transferencia {
  id: string;
  empresa_id: string;
  origem_id: string;
  destino_id: string;
  usuario_id: string;
  confirmado_por: string | null;
  status: 'pendente' | 'confirmada' | 'cancelada';
  observacao: string | null;
  criado_em: string;
  confirmado_em: string | null;
  origem?: { nome: string };
  destino?: { nome: string };
  transferencia_itens?: TransferenciaItem[];
}

export interface TransferenciaItem {
  id: string;
  transferencia_id: string;
  produto_id: string;
  qtd: number;
  nome_snapshot: string | null;
}

export function useTransferencias() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['transferencias', profile?.empresa_id],
    queryFn: async () => {
      if (!profile?.empresa_id) return [];

      const { data, error } = await supabase
        .from('transferencias')
        .select(`
          *,
          origem:depositos!transferencias_origem_id_fkey(nome),
          destino:depositos!transferencias_destino_id_fkey(nome),
          transferencia_itens(id, produto_id, qtd, nome_snapshot)
        `)
        .eq('empresa_id', profile.empresa_id)
        .order('criado_em', { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as Transferencia[];
    },
    enabled: !!profile?.empresa_id,
  });
}

interface CriarTransferenciaParams {
  origemId: string;
  destinoId: string;
  itens: { produto_id: string; qtd: number }[];
  imediata: boolean;
  observacao?: string;
}

export function useCriarTransferencia() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ origemId, destinoId, itens, imediata, observacao }: CriarTransferenciaParams) => {
      if (!profile?.empresa_id) throw new Error('Empresa não encontrada');

      const { data, error } = await supabase.rpc('transferencia_criar', {
        p_empresa_id: profile.empresa_id,
        p_origem_id: origemId,
        p_destino_id: destinoId,
        p_itens: itens,
        p_imediata: imediata,
        p_observacao: observacao || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['transferencias'] });
      queryClient.invalidateQueries({ queryKey: ['estoque-deposito'] });
      queryClient.invalidateQueries({ queryKey: ['movimentacoes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(vars.imediata ? 'Transferência realizada!' : 'Transferência criada (pendente)');
    },
    onError: (error: Error) => {
      toast.error('Erro na transferência: ' + error.message);
    },
  });
}

export function useConfirmarTransferencia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('transferencia_confirmar', {
        p_transferencia_id: id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transferencias'] });
      queryClient.invalidateQueries({ queryKey: ['estoque-deposito'] });
      queryClient.invalidateQueries({ queryKey: ['movimentacoes'] });
      toast.success('Transferência confirmada!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao confirmar: ' + error.message);
    },
  });
}

export function useCancelarTransferencia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('transferencia_cancelar', {
        p_transferencia_id: id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transferencias'] });
      toast.success('Transferência cancelada.');
    },
    onError: (error: Error) => {
      toast.error('Erro ao cancelar: ' + error.message);
    },
  });
}
