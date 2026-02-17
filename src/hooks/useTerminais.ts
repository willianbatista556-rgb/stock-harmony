import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Terminal {
  id: string;
  empresa_id: string;
  deposito_id: string;
  nome: string;
  ativo: boolean;
  criado_em: string;
}

export function useTerminais() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['terminais', profile?.empresa_id],
    queryFn: async () => {
      if (!profile?.empresa_id) return [];
      const { data, error } = await supabase
        .from('terminais')
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return (data || []) as Terminal[];
    },
    enabled: !!profile?.empresa_id,
  });
}

export function useCreateTerminal() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ nome, depositoId }: { nome: string; depositoId: string }) => {
      if (!profile?.empresa_id) throw new Error('Empresa não encontrada');
      const { data, error } = await supabase
        .from('terminais')
        .insert({
          empresa_id: profile.empresa_id,
          deposito_id: depositoId,
          nome,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Terminal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminais'] });
      toast.success('Terminal criado!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar terminal: ' + error.message);
    },
  });
}
