import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PlanInfo {
  id: string;
  nome: string;
  descricao: string | null;
  preco_mensal: number;
  preco_anual: number | null;
  destaque: boolean;
}

export interface SubscriptionInfo {
  id: string;
  plan: PlanInfo;
  status: string;
  inicio: string;
  fim: string | null;
}

export interface PlanLimits {
  max_usuarios: number;
  max_filiais: number;
  max_produtos: number;
  mod_pdv: boolean;
  mod_financeiro: boolean;
  mod_inventario: boolean;
  mod_transferencias: boolean;
  mod_relatorios: boolean;
  mod_dre: boolean;
  [key: string]: number | boolean;
}

export interface Usage {
  usuarios: number;
  filiais: number;
  produtos: number;
}

export function useSubscription() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;

  const subscriptionQuery = useQuery({
    queryKey: ['subscription', empresaId],
    queryFn: async () => {
      if (!empresaId) return null;
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id, status, inicio, fim, plan_id, plans(id, nome, descricao, preco_mensal, preco_anual, destaque)')
        .eq('empresa_id', empresaId)
        .eq('status', 'ativa')
        .single();
      if (error) throw error;
      return {
        id: data.id,
        status: data.status,
        inicio: data.inicio,
        fim: data.fim,
        plan: data.plans as unknown as PlanInfo,
      } as SubscriptionInfo;
    },
    enabled: !!empresaId,
  });

  const limitsQuery = useQuery({
    queryKey: ['plan-limits', empresaId],
    queryFn: async () => {
      if (!empresaId) return null;
      const { data, error } = await supabase.rpc('get_empresa_limits', { p_empresa_id: empresaId });
      if (error) throw error;
      const raw = data as Record<string, number>;
      return {
        max_usuarios: raw.max_usuarios ?? 1,
        max_filiais: raw.max_filiais ?? 1,
        max_produtos: raw.max_produtos ?? 50,
        mod_pdv: (raw.mod_pdv ?? 0) === 1,
        mod_financeiro: (raw.mod_financeiro ?? 0) === 1,
        mod_inventario: (raw.mod_inventario ?? 0) === 1,
        mod_transferencias: (raw.mod_transferencias ?? 0) === 1,
        mod_relatorios: (raw.mod_relatorios ?? 0) === 1,
        mod_dre: (raw.mod_dre ?? 0) === 1,
      } as PlanLimits;
    },
    enabled: !!empresaId,
  });

  const usageQuery = useQuery({
    queryKey: ['plan-usage', empresaId],
    queryFn: async () => {
      if (!empresaId) return null;
      const { data, error } = await supabase.rpc('get_empresa_usage', { p_empresa_id: empresaId });
      if (error) throw error;
      return data as unknown as Usage;
    },
    enabled: !!empresaId,
  });

  return {
    subscription: subscriptionQuery.data,
    limits: limitsQuery.data,
    usage: usageQuery.data,
    isLoading: subscriptionQuery.isLoading || limitsQuery.isLoading || usageQuery.isLoading,
    hasModule: (mod: string) => {
      if (!limitsQuery.data) return true; // allow while loading
      return !!(limitsQuery.data as any)[`mod_${mod}`];
    },
    isAtLimit: (key: 'usuarios' | 'filiais' | 'produtos') => {
      if (!limitsQuery.data || !usageQuery.data) return false;
      const limit = (limitsQuery.data as any)[`max_${key}`] as number;
      const current = (usageQuery.data as any)[key] as number;
      return current >= limit;
    },
  };
}

export function usePlans() {
  return useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*, plan_limits(*)')
        .eq('ativo', true)
        .order('ordem');
      if (error) throw error;
      return data;
    },
  });
}
