import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MargemProduto {
  produto_id: string;
  produto_nome: string;
  sku: string | null;
  custo_medio: number;
  preco_venda: number;
  margem_percentual: number;
  margem_absoluta: number;
  qtd_vendida_30d: number;
  receita_30d: number;
  lucro_bruto_30d: number;
}

export interface FaturamentoFilial {
  deposito_id: string;
  deposito_nome: string;
  deposito_tipo: string;
  total_vendas: number;
  num_vendas: number;
  ticket_medio: number;
  total_itens: number;
}

export interface GiroEstoque {
  produto_id: string;
  produto_nome: string;
  sku: string | null;
  estoque_atual: number;
  saidas_30d: number;
  indice_giro: number;
  classificacao_giro: 'ruptura' | 'parado' | 'baixo' | 'medio' | 'alto';
}

export interface CurvaABC {
  produto_id: string;
  produto_nome: string;
  sku: string | null;
  receita_total: number;
  ranking: number;
  percentual_acumulado: number;
  classe: 'A' | 'B' | 'C';
}

export function useMargemProduto(limit = 20) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['margem-produto', profile?.empresa_id, limit],
    queryFn: async () => {
      if (!profile?.empresa_id) return [];
      const { data, error } = await supabase
        .from('vw_margem_produto' as any)
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .order('lucro_bruto_30d', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as unknown as MargemProduto[];
    },
    enabled: !!profile?.empresa_id,
  });
}

export function useFaturamentoFilial() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['faturamento-filial', profile?.empresa_id],
    queryFn: async () => {
      if (!profile?.empresa_id) return [];
      const { data, error } = await supabase
        .from('vw_faturamento_filial' as any)
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .order('total_vendas', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as FaturamentoFilial[];
    },
    enabled: !!profile?.empresa_id,
  });
}

export function useGiroEstoque(limit = 20) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['giro-estoque', profile?.empresa_id, limit],
    queryFn: async () => {
      if (!profile?.empresa_id) return [];
      const { data, error } = await supabase
        .from('vw_giro_estoque' as any)
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .order('indice_giro', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as unknown as GiroEstoque[];
    },
    enabled: !!profile?.empresa_id,
  });
}

export function useCurvaABC(limit = 20) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['curva-abc', profile?.empresa_id, limit],
    queryFn: async () => {
      if (!profile?.empresa_id) return [];
      const { data, error } = await supabase
        .from('vw_curva_abc' as any)
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .order('ranking', { ascending: true })
        .limit(limit);
      if (error) throw error;
      return (data || []) as unknown as CurvaABC[];
    },
    enabled: !!profile?.empresa_id,
  });
}

export function useFaturamentoTotal() {
  const { profile } = useAuth();
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  return useQuery({
    queryKey: ['faturamento-total', profile?.empresa_id],
    queryFn: async () => {
      if (!profile?.empresa_id) return { total: 0, num_vendas: 0, ticket_medio: 0 };
      const { data, error } = await supabase
        .from('vendas')
        .select('total')
        .eq('empresa_id', profile.empresa_id)
        .eq('status', 'finalizada')
        .gte('data', thirtyDaysAgo);
      if (error) throw error;
      const total = data?.reduce((acc, v) => acc + Number(v.total || 0), 0) || 0;
      const num_vendas = data?.length || 0;
      const ticket_medio = num_vendas > 0 ? total / num_vendas : 0;
      return { total, num_vendas, ticket_medio };
    },
    enabled: !!profile?.empresa_id,
  });
}
