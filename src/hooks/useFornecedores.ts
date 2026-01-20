import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Fornecedor {
  id: string;
  nome: string;
  cnpj_cpf: string | null;
  email: string | null;
  telefone: string | null;
  criado_em: string | null;
  empresa_id: string;
}

export function useFornecedores() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['fornecedores', profile?.empresa_id],
    queryFn: async () => {
      if (!profile?.empresa_id) return [];
      
      const { data, error } = await supabase
        .from('fornecedores')
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .order('nome');

      if (error) throw error;
      return data as Fornecedor[];
    },
    enabled: !!profile?.empresa_id,
  });
}

export function useCreateFornecedor() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: { nome: string; cnpj_cpf?: string; email?: string; telefone?: string }) => {
      if (!profile?.empresa_id) throw new Error('Empresa não encontrada');

      const { data: fornecedor, error } = await supabase
        .from('fornecedores')
        .insert({
          nome: data.nome,
          cnpj_cpf: data.cnpj_cpf || null,
          email: data.email || null,
          telefone: data.telefone || null,
          empresa_id: profile.empresa_id,
        })
        .select()
        .single();

      if (error) throw error;
      return fornecedor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
      toast.success('Fornecedor criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar fornecedor: ' + error.message);
    },
  });
}

export function useUpdateFornecedor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; nome: string; cnpj_cpf?: string; email?: string; telefone?: string }) => {
      const { data: fornecedor, error } = await supabase
        .from('fornecedores')
        .update({
          nome: data.nome,
          cnpj_cpf: data.cnpj_cpf || null,
          email: data.email || null,
          telefone: data.telefone || null,
        })
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      return fornecedor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
      toast.success('Fornecedor atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar fornecedor: ' + error.message);
    },
  });
}

export function useDeleteFornecedor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('fornecedores')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
      toast.success('Fornecedor excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir fornecedor: ' + error.message);
    },
  });
}
