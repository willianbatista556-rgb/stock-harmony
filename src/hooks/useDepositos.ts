import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Deposito {
  id: string;
  nome: string;
  tipo: string | null;
  criado_em: string | null;
  empresa_id: string;
}

export function useDepositos() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['depositos', profile?.empresa_id],
    queryFn: async () => {
      if (!profile?.empresa_id) return [];
      
      const { data, error } = await supabase
        .from('depositos')
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .order('nome');

      if (error) throw error;
      return data as Deposito[];
    },
    enabled: !!profile?.empresa_id,
  });
}

export function useCreateDeposito() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: { nome: string; tipo: string }) => {
      if (!profile?.empresa_id) throw new Error('Empresa não encontrada');

      const { data: deposito, error } = await supabase
        .from('depositos')
        .insert({
          nome: data.nome,
          tipo: data.tipo,
          empresa_id: profile.empresa_id,
        })
        .select()
        .single();

      if (error) throw error;
      return deposito;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depositos'] });
      toast.success('Depósito criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar depósito: ' + error.message);
    },
  });
}

export function useUpdateDeposito() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; nome: string; tipo: string }) => {
      const { data: deposito, error } = await supabase
        .from('depositos')
        .update({ nome: data.nome, tipo: data.tipo })
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      return deposito;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depositos'] });
      toast.success('Depósito atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar depósito: ' + error.message);
    },
  });
}

export function useDeleteDeposito() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('depositos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depositos'] });
      toast.success('Depósito excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir depósito: ' + error.message);
    },
  });
}
