import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ── Vendas por período ──────────────────────────────────────
export interface VendaResumo {
  id: string;
  data: string;
  total: number;
  desconto: number;
  subtotal: number;
  status: string;
  itens_count: number;
}

export function useRelatorioVendas(inicio: string, fim: string) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['relatorio-vendas', profile?.empresa_id, inicio, fim],
    queryFn: async () => {
      if (!profile?.empresa_id) return [];
      const { data, error } = await supabase
        .from('vendas')
        .select('id, data, total, desconto, subtotal, status')
        .eq('empresa_id', profile.empresa_id)
        .eq('status', 'finalizada')
        .gte('data', inicio)
        .lte('data', fim)
        .order('data', { ascending: false });
      if (error) throw error;
      return data as VendaResumo[];
    },
    enabled: !!profile?.empresa_id && !!inicio && !!fim,
  });
}

// ── Vendas por forma de pagamento ───────────────────────────
export interface PagamentoResumo {
  forma: string;
  total: number;
  count: number;
}

export function useRelatorioPagamentos(inicio: string, fim: string) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['relatorio-pagamentos', profile?.empresa_id, inicio, fim],
    queryFn: async () => {
      if (!profile?.empresa_id) return [];
      const { data, error } = await supabase
        .from('pagamentos')
        .select('forma, valor, venda_id, vendas!inner(empresa_id, data, status)')
        .eq('vendas.empresa_id', profile.empresa_id)
        .eq('vendas.status', 'finalizada')
        .gte('vendas.data', inicio)
        .lte('vendas.data', fim);
      if (error) throw error;

      const map = new Map<string, { total: number; count: number }>();
      for (const p of data ?? []) {
        const cur = map.get(p.forma) ?? { total: 0, count: 0 };
        cur.total += Number(p.valor ?? 0);
        cur.count += 1;
        map.set(p.forma, cur);
      }
      return Array.from(map.entries()).map(([forma, v]) => ({ forma, ...v }));
    },
    enabled: !!profile?.empresa_id && !!inicio && !!fim,
  });
}

// ── Top produtos vendidos ───────────────────────────────────
export interface ProdutoVendido {
  produto_id: string;
  nome: string;
  qtd_total: number;
  receita_total: number;
}

export function useRelatorioTopProdutos(inicio: string, fim: string, limit = 20) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['relatorio-top-produtos', profile?.empresa_id, inicio, fim, limit],
    queryFn: async () => {
      if (!profile?.empresa_id) return [];
      const { data, error } = await supabase
        .from('venda_itens')
        .select('produto_id, nome_snapshot, qtd, preco_unit, desconto, vendas!inner(empresa_id, data, status)')
        .eq('vendas.empresa_id', profile.empresa_id)
        .eq('vendas.status', 'finalizada')
        .gte('vendas.data', inicio)
        .lte('vendas.data', fim);
      if (error) throw error;

      const map = new Map<string, ProdutoVendido>();
      for (const item of data ?? []) {
        const cur = map.get(item.produto_id) ?? {
          produto_id: item.produto_id,
          nome: item.nome_snapshot || 'Produto',
          qtd_total: 0,
          receita_total: 0,
        };
        cur.qtd_total += Number(item.qtd ?? 0);
        cur.receita_total += Number(item.qtd ?? 0) * Number(item.preco_unit ?? 0) - Number(item.desconto ?? 0);
        map.set(item.produto_id, cur);
      }

      return Array.from(map.values())
        .sort((a, b) => b.receita_total - a.receita_total)
        .slice(0, limit);
    },
    enabled: !!profile?.empresa_id && !!inicio && !!fim,
  });
}

// ── Estoque atual com valor ─────────────────────────────────
export interface EstoqueItem {
  produto_id: string;
  nome: string;
  sku: string | null;
  ean: string | null;
  saldo: number;
  preco_venda: number;
  custo_medio: number;
  valor_estoque: number;
  estoque_min: number;
  status: 'ok' | 'baixo' | 'zerado' | 'negativo';
  local_nome: string;
}

export function useRelatorioEstoque() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['relatorio-estoque', profile?.empresa_id],
    queryFn: async () => {
      if (!profile?.empresa_id) return [];
      const { data, error } = await supabase
        .from('estoque_saldos')
        .select('produto_id, saldo, local_id, produtos:produto_id(nome, sku, ean, preco_venda, custo_medio, estoque_min), depositos:local_id(nome)')
        .eq('empresa_id', profile.empresa_id);
      if (error) throw error;

      return (data ?? []).map((row: any) => {
        const saldo = Number(row.saldo ?? 0);
        const custo = Number(row.produtos?.custo_medio ?? 0);
        const min = Number(row.produtos?.estoque_min ?? 0);
        let status: EstoqueItem['status'] = 'ok';
        if (saldo < 0) status = 'negativo';
        else if (saldo === 0) status = 'zerado';
        else if (min > 0 && saldo <= min) status = 'baixo';

        return {
          produto_id: row.produto_id,
          nome: row.produtos?.nome ?? 'Produto',
          sku: row.produtos?.sku,
          ean: row.produtos?.ean,
          saldo,
          preco_venda: Number(row.produtos?.preco_venda ?? 0),
          custo_medio: custo,
          valor_estoque: saldo * custo,
          estoque_min: min,
          status,
          local_nome: row.depositos?.nome ?? 'Local',
        } as EstoqueItem;
      });
    },
    enabled: !!profile?.empresa_id,
  });
}

// ── Curva ABC ───────────────────────────────────────────────
export interface CurvaABCItem {
  produto_id: string;
  nome: string;
  receita: number;
  percentual: number;
  percentual_acumulado: number;
  classe: 'A' | 'B' | 'C';
}

export function useCurvaABC(inicio: string, fim: string) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['curva-abc', profile?.empresa_id, inicio, fim],
    queryFn: async () => {
      if (!profile?.empresa_id) return [];
      const { data, error } = await supabase
        .from('venda_itens')
        .select('produto_id, nome_snapshot, qtd, preco_unit, desconto, vendas!inner(empresa_id, data, status)')
        .eq('vendas.empresa_id', profile.empresa_id)
        .eq('vendas.status', 'finalizada')
        .gte('vendas.data', inicio)
        .lte('vendas.data', fim);
      if (error) throw error;

      const map = new Map<string, { nome: string; receita: number }>();
      for (const item of data ?? []) {
        const cur = map.get(item.produto_id) ?? { nome: item.nome_snapshot || 'Produto', receita: 0 };
        cur.receita += Number(item.qtd ?? 0) * Number(item.preco_unit ?? 0) - Number(item.desconto ?? 0);
        map.set(item.produto_id, cur);
      }

      const sorted = Array.from(map.entries())
        .map(([id, v]) => ({ produto_id: id, ...v }))
        .sort((a, b) => b.receita - a.receita);

      const totalReceita = sorted.reduce((s, i) => s + i.receita, 0) || 1;
      let acumulado = 0;

      return sorted.map((item): CurvaABCItem => {
        const pct = (item.receita / totalReceita) * 100;
        acumulado += pct;
        return {
          produto_id: item.produto_id,
          nome: item.nome,
          receita: item.receita,
          percentual: pct,
          percentual_acumulado: acumulado,
          classe: acumulado <= 80 ? 'A' : acumulado <= 95 ? 'B' : 'C',
        };
      });
    },
    enabled: !!profile?.empresa_id && !!inicio && !!fim,
  });
}
