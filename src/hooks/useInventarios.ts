import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Inventario {
  id: string;
  empresa_id: string;
  deposito_id: string;
  usuario_id: string;
  status: string;
  observacao: string | null;
  criado_em: string;
  finalizado_em: string | null;
  aplicado_em: string | null;
}

export interface InventarioItem {
  id: string;
  inventario_id: string;
  produto_id: string;
  qtd_contada: number;
  qtd_sistema: number | null;
  diferenca: number | null;
  nome_snapshot: string | null;
  criado_em: string;
}

export function useInventarios() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['inventarios', profile?.empresa_id],
    queryFn: async () => {
      if (!profile?.empresa_id) return [];
      const { data, error } = await supabase
        .from('inventarios')
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return data as Inventario[];
    },
    enabled: !!profile?.empresa_id,
  });
}

export function useInventarioItens(inventarioId: string | undefined) {
  return useQuery({
    queryKey: ['inventario-itens', inventarioId],
    queryFn: async () => {
      if (!inventarioId) return [];
      const { data, error } = await supabase
        .from('inventario_itens')
        .select('*')
        .eq('inventario_id', inventarioId)
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return data as InventarioItem[];
    },
    enabled: !!inventarioId,
  });
}

export function useCriarInventario() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async ({ depositoId, observacao }: { depositoId: string; observacao?: string }) => {
      if (!profile?.empresa_id || !user?.id) throw new Error('Não autenticado');
      const { data, error } = await supabase
        .from('inventarios')
        .insert({
          empresa_id: profile.empresa_id,
          deposito_id: depositoId,
          usuario_id: user.id,
          observacao: observacao || null,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventarios'] });
    },
    onError: (e: Error) => toast.error('Erro ao criar inventário: ' + e.message),
  });
}

export function useAdicionarItemInventario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      inventarioId,
      produtoId,
      qtd,
    }: {
      inventarioId: string;
      produtoId: string;
      qtd: number;
    }) => {
      // Upsert: if item exists, add to qty
      const { data: existing } = await supabase
        .from('inventario_itens')
        .select('id, qtd_contada')
        .eq('inventario_id', inventarioId)
        .eq('produto_id', produtoId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('inventario_itens')
          .update({ qtd_contada: existing.qtd_contada + qtd })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('inventario_itens')
          .insert({
            inventario_id: inventarioId,
            produto_id: produtoId,
            qtd_contada: qtd,
          });
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['inventario-itens', vars.inventarioId] });
    },
    onError: (e: Error) => toast.error('Erro ao adicionar item: ' + e.message),
  });
}

export function useRemoverItemInventario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, inventarioId }: { itemId: string; inventarioId: string }) => {
      const { error } = await supabase
        .from('inventario_itens')
        .delete()
        .eq('id', itemId);
      if (error) throw error;
      return inventarioId;
    },
    onSuccess: (inventarioId) => {
      queryClient.invalidateQueries({ queryKey: ['inventario-itens', inventarioId] });
    },
    onError: (e: Error) => toast.error('Erro ao remover item: ' + e.message),
  });
}

export function useFinalizarInventario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (inventarioId: string) => {
      const { error } = await supabase.rpc('inventario_finalizar', {
        p_inventario_id: inventarioId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventarios'] });
      queryClient.invalidateQueries({ queryKey: ['inventario-itens'] });
      toast.success('Inventário finalizado! Revise as divergências.');
    },
    onError: (e: Error) => toast.error('Erro ao finalizar: ' + e.message),
  });
}

export function useAplicarAjustesInventario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (inventarioId: string) => {
      const { error } = await supabase.rpc('inventario_aplicar_ajustes', {
        p_inventario_id: inventarioId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventarios'] });
      queryClient.invalidateQueries({ queryKey: ['inventario-itens'] });
      queryClient.invalidateQueries({ queryKey: ['estoque'] });
      queryClient.invalidateQueries({ queryKey: ['movimentacoes'] });
      toast.success('Ajustes aplicados com sucesso!');
    },
    onError: (e: Error) => toast.error('Erro ao aplicar ajustes: ' + e.message),
  });
}

export function useCancelarInventario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (inventarioId: string) => {
      const { error } = await supabase
        .from('inventarios')
        .update({ status: 'cancelado' })
        .eq('id', inventarioId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventarios'] });
      toast.success('Inventário cancelado.');
    },
    onError: (e: Error) => toast.error('Erro: ' + e.message),
  });
}
