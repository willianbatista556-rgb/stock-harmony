import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Caixa {
  id: string;
  empresa_id: string;
  usuario_id: string;
  deposito_id: string;
  valor_abertura: number;
  valor_fechamento: number | null;
  status: 'aberto' | 'fechado';
  aberto_em: string;
  fechado_em: string | null;
  observacao_fechamento: string | null;
}

export interface CaixaMovimentacao {
  id: string;
  caixa_id: string;
  empresa_id: string;
  tipo: 'venda' | 'sangria' | 'suprimento' | 'abertura';
  valor: number;
  descricao: string | null;
  venda_id: string | null;
  criado_em: string;
  usuario_id: string;
}

export interface FluxoDiario {
  dia: string;
  entradas: number;
  saidas: number;
  saldo: number;
  num_movimentacoes: number;
}

export function useCaixaAberto() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['caixa-aberto', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('caixas')
        .select('*')
        .eq('usuario_id', user.id)
        .eq('status', 'aberto')
        .maybeSingle();
      if (error) throw error;
      return data as Caixa | null;
    },
    enabled: !!user?.id,
  });
}

export function useCaixasHistorico() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['caixas-historico', profile?.empresa_id],
    queryFn: async () => {
      if (!profile?.empresa_id) return [];
      const { data, error } = await supabase
        .from('caixas')
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .order('aberto_em', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as Caixa[];
    },
    enabled: !!profile?.empresa_id,
  });
}

export function useCaixaMovimentacoes(caixaId: string | undefined) {
  return useQuery({
    queryKey: ['caixa-movimentacoes', caixaId],
    queryFn: async () => {
      if (!caixaId) return [];
      const { data, error } = await supabase
        .from('caixa_movimentacoes')
        .select('*')
        .eq('caixa_id', caixaId)
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return (data || []) as CaixaMovimentacao[];
    },
    enabled: !!caixaId,
  });
}

export function useFluxoCaixa() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['fluxo-caixa', profile?.empresa_id],
    queryFn: async () => {
      if (!profile?.empresa_id) return [];
      const { data, error } = await supabase
        .from('vw_fluxo_caixa_diario')
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .order('dia', { ascending: false })
        .limit(90);
      if (error) throw error;
      return (data || []) as FluxoDiario[];
    },
    enabled: !!profile?.empresa_id,
  });
}

export function useAbrirCaixa() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async ({ depositoId, valorAbertura }: { depositoId: string; valorAbertura: number }) => {
      if (!profile?.empresa_id || !user?.id) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('caixas')
        .insert({
          empresa_id: profile.empresa_id,
          usuario_id: user.id,
          deposito_id: depositoId,
          valor_abertura: valorAbertura,
          status: 'aberto',
        })
        .select()
        .single();

      if (error) throw error;

      // Register opening movement
      await supabase.from('caixa_movimentacoes').insert({
        caixa_id: data.id,
        empresa_id: profile.empresa_id,
        tipo: 'abertura',
        valor: valorAbertura,
        descricao: 'Abertura de caixa',
        usuario_id: user.id,
      });

      return data as Caixa;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caixa-aberto'] });
      queryClient.invalidateQueries({ queryKey: ['caixas-historico'] });
      queryClient.invalidateQueries({ queryKey: ['fluxo-caixa'] });
      toast.success('Caixa aberto com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao abrir caixa: ' + error.message);
    },
  });
}

export function useFecharCaixa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ caixaId, valorFechamento, observacao }: { caixaId: string; valorFechamento: number; observacao?: string }) => {
      const { data, error } = await supabase
        .from('caixas')
        .update({
          status: 'fechado',
          valor_fechamento: valorFechamento,
          fechado_em: new Date().toISOString(),
          observacao_fechamento: observacao || null,
        })
        .eq('id', caixaId)
        .select()
        .single();

      if (error) throw error;
      return data as Caixa;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caixa-aberto'] });
      queryClient.invalidateQueries({ queryKey: ['caixas-historico'] });
      queryClient.invalidateQueries({ queryKey: ['fluxo-caixa'] });
      toast.success('Caixa fechado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao fechar caixa: ' + error.message);
    },
  });
}

export function useSangria() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async ({ caixaId, valor, descricao }: { caixaId: string; valor: number; descricao: string }) => {
      if (!profile?.empresa_id || !user?.id) throw new Error('Usuário não autenticado');

      const { error } = await supabase.from('caixa_movimentacoes').insert({
        caixa_id: caixaId,
        empresa_id: profile.empresa_id,
        tipo: 'sangria',
        valor: -Math.abs(valor),
        descricao,
        usuario_id: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caixa-movimentacoes'] });
      queryClient.invalidateQueries({ queryKey: ['fluxo-caixa'] });
      toast.success('Sangria registrada!');
    },
    onError: (error: Error) => {
      toast.error('Erro: ' + error.message);
    },
  });
}

export function useSuprimento() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async ({ caixaId, valor, descricao }: { caixaId: string; valor: number; descricao: string }) => {
      if (!profile?.empresa_id || !user?.id) throw new Error('Usuário não autenticado');

      const { error } = await supabase.from('caixa_movimentacoes').insert({
        caixa_id: caixaId,
        empresa_id: profile.empresa_id,
        tipo: 'suprimento',
        valor: Math.abs(valor),
        descricao,
        usuario_id: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caixa-movimentacoes'] });
      queryClient.invalidateQueries({ queryKey: ['fluxo-caixa'] });
      toast.success('Suprimento registrado!');
    },
    onError: (error: Error) => {
      toast.error('Erro: ' + error.message);
    },
  });
}
