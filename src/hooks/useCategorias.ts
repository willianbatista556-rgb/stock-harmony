import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Categoria {
  id: string;
  nome: string;
  pai_id: string | null;
  criado_em: string | null;
  empresa_id: string;
}

export function useCategorias() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['categorias', profile?.empresa_id],
    queryFn: async () => {
      if (!profile?.empresa_id) return [];
      
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .order('nome');

      if (error) throw error;
      return data as Categoria[];
    },
    enabled: !!profile?.empresa_id,
  });
}

export function useCreateCategoria() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: { nome: string; pai_id?: string | null }) => {
      if (!profile?.empresa_id) throw new Error('Empresa não encontrada');

      const { data: categoria, error } = await supabase
        .from('categorias')
        .insert({
          nome: data.nome,
          pai_id: data.pai_id || null,
          empresa_id: profile.empresa_id,
        })
        .select()
        .single();

      if (error) throw error;
      return categoria;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias'] });
      toast.success('Categoria criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar categoria: ' + error.message);
    },
  });
}

export function useUpdateCategoria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; nome: string; pai_id?: string | null }) => {
      const { data: categoria, error } = await supabase
        .from('categorias')
        .update({ nome: data.nome, pai_id: data.pai_id || null })
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      return categoria;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias'] });
      toast.success('Categoria atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar categoria: ' + error.message);
    },
  });
}

export function useDeleteCategoria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categorias')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias'] });
      toast.success('Categoria excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir categoria: ' + error.message);
    },
  });
}
