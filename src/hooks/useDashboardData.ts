import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface InventarioResumo {
  total_produtos: number;
  total_estoque: number;
  valor_total: number;
  produtos_estoque_baixo: number;
  produtos_zerados: number;
}

interface MovimentacaoDiaria {
  dia: string;
  total_entradas: number;
  total_saidas: number;
  total_ajustes: number;
  total_movimentacoes: number;
}

interface ProdutoTopMovimentado {
  produto_id: string;
  produto_nome: string;
  total_movimentado: number;
  num_movimentacoes: number;
}

interface PrevisaoRuptura {
  produto_id: string;
  produto_nome: string;
  sku: string | null;
  estoque_min: number | null;
  estoque_atual: number;
  consumo_medio_diario: number;
  dias_para_ruptura: number | null;
  status_estoque: 'critico' | 'baixo' | 'alerta' | 'atencao' | 'normal';
}

interface EstoquePorDeposito {
  deposito_id: string;
  deposito_nome: string;
  deposito_tipo: string;
  num_produtos: number;
  total_itens: number;
  valor_total: number;
}

export function useInventarioResumo() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['inventario-resumo', profile?.empresa_id],
    queryFn: async () => {
      if (!profile?.empresa_id) return null;

      const { data, error } = await supabase
        .from('vw_inventario_resumo')
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .maybeSingle();

      if (error) throw error;
      return data as InventarioResumo | null;
    },
    enabled: !!profile?.empresa_id,
  });
}

export function useMovimentacoesDiarias(limit = 30) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['movimentacoes-diarias', profile?.empresa_id, limit],
    queryFn: async () => {
      if (!profile?.empresa_id) return [];

      const { data, error } = await supabase
        .from('vw_movimentacoes_diarias')
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .limit(limit);

      if (error) throw error;
      return (data || []) as MovimentacaoDiaria[];
    },
    enabled: !!profile?.empresa_id,
  });
}

export function useProdutosTopMovimentados(limit = 5) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['produtos-top-movimentados', profile?.empresa_id, limit],
    queryFn: async () => {
      if (!profile?.empresa_id) return [];

      const { data, error } = await supabase
        .from('vw_produtos_top_movimentados')
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .limit(limit);

      if (error) throw error;
      return (data || []) as ProdutoTopMovimentado[];
    },
    enabled: !!profile?.empresa_id,
  });
}

export function usePrevisaoRuptura() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['previsao-ruptura', profile?.empresa_id],
    queryFn: async () => {
      if (!profile?.empresa_id) return [];

      const { data, error } = await supabase
        .from('vw_previsao_ruptura')
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .in('status_estoque', ['critico', 'baixo', 'alerta', 'atencao'])
        .order('dias_para_ruptura', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return (data || []) as PrevisaoRuptura[];
    },
    enabled: !!profile?.empresa_id,
  });
}

export function useEstoquePorDeposito() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['estoque-por-deposito', profile?.empresa_id],
    queryFn: async () => {
      if (!profile?.empresa_id) return [];

      const { data, error } = await supabase
        .from('vw_estoque_por_deposito')
        .select('*')
        .eq('empresa_id', profile.empresa_id);

      if (error) throw error;
      return (data || []) as EstoquePorDeposito[];
    },
    enabled: !!profile?.empresa_id,
  });
}

export function useMovimentacoesRecentes(limit = 10) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['movimentacoes-recentes', profile?.empresa_id, limit],
    queryFn: async () => {
      if (!profile?.empresa_id) return [];

      const { data, error } = await supabase
        .from('movimentacoes')
        .select(`
          id,
          tipo,
          origem,
          qtd,
          data,
          produto:produtos(id, nome)
        `)
        .eq('empresa_id', profile.empresa_id)
        .order('data', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.empresa_id,
  });
}

export function useAlertasEstoqueBaixo() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['alertas-estoque-baixo', profile?.empresa_id],
    queryFn: async () => {
      if (!profile?.empresa_id) return [];

      const { data, error } = await supabase
        .from('vw_previsao_ruptura')
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .in('status_estoque', ['critico', 'baixo'])
        .order('estoque_atual', { ascending: true });

      if (error) throw error;
      return (data || []) as PrevisaoRuptura[];
    },
    enabled: !!profile?.empresa_id,
  });
}

export function useContadoresHoje() {
  const { profile } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['contadores-hoje', profile?.empresa_id, today],
    queryFn: async () => {
      if (!profile?.empresa_id) return { entradas: 0, saidas: 0 };

      const { data: entradasData } = await supabase
        .from('movimentacoes')
        .select('qtd')
        .eq('empresa_id', profile.empresa_id)
        .eq('tipo', 'entrada')
        .gte('data', `${today}T00:00:00`)
        .lte('data', `${today}T23:59:59`);

      const { data: saidasData } = await supabase
        .from('movimentacoes')
        .select('qtd')
        .eq('empresa_id', profile.empresa_id)
        .eq('tipo', 'saida')
        .gte('data', `${today}T00:00:00`)
        .lte('data', `${today}T23:59:59`);

      const entradas = entradasData?.reduce((acc, m) => acc + Number(m.qtd), 0) || 0;
      const saidas = saidasData?.reduce((acc, m) => acc + Number(m.qtd), 0) || 0;

      return { entradas, saidas };
    },
    enabled: !!profile?.empresa_id,
  });
}
