import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/* ── Types ── */
export interface ContaPagar {
  id: string;
  empresa_id: string;
  descricao: string;
  valor: number;
  vencimento: string;
  pago_em: string | null;
  status: string;
  categoria: string | null;
  fornecedor_id: string | null;
  observacao: string | null;
  usuario_id: string;
  criado_em: string;
  fornecedores?: { nome: string } | null;
}

export interface ContaReceber {
  id: string;
  empresa_id: string;
  descricao: string;
  valor: number;
  vencimento: string;
  recebido_em: string | null;
  status: string;
  cliente_id: string | null;
  parcela: number;
  total_parcelas: number;
  venda_id: string | null;
  observacao: string | null;
  usuario_id: string;
  criado_em: string;
  clientes?: { nome: string } | null;
}

/* ── Contas a Pagar ── */
export function useContasPagar() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['contas-pagar', profile?.empresa_id],
    enabled: !!profile?.empresa_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contas_pagar')
        .select('*, fornecedores(nome)')
        .order('vencimento', { ascending: true });
      if (error) throw error;
      return data as ContaPagar[];
    },
  });
}

export function useCreateContaPagar() {
  const qc = useQueryClient();
  const { user, profile } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      descricao: string; valor: number; vencimento: string;
      categoria?: string; fornecedor_id?: string; observacao?: string;
    }) => {
      const { error } = await supabase.from('contas_pagar').insert({
        empresa_id: profile!.empresa_id!,
        usuario_id: user!.id,
        ...input,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contas-pagar'] }); toast.success('Conta cadastrada'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function usePagarConta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contas_pagar')
        .update({ status: 'pago', pago_em: new Date().toISOString().split('T')[0] } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contas-pagar'] }); toast.success('Conta marcada como paga'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteContaPagar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contas_pagar').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contas-pagar'] }); toast.success('Conta removida'); },
    onError: (e: any) => toast.error(e.message),
  });
}

/* ── Contas a Receber ── */
export function useContasReceber() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['contas-receber', profile?.empresa_id],
    enabled: !!profile?.empresa_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contas_receber')
        .select('*, clientes(nome)')
        .order('vencimento', { ascending: true });
      if (error) throw error;
      return data as ContaReceber[];
    },
  });
}

export function useCreateContaReceber() {
  const qc = useQueryClient();
  const { user, profile } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      descricao: string; valor: number; vencimento: string;
      cliente_id?: string; parcela?: number; total_parcelas?: number;
      observacao?: string;
    }) => {
      const { error } = await supabase.from('contas_receber').insert({
        empresa_id: profile!.empresa_id!,
        usuario_id: user!.id,
        ...input,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contas-receber'] }); toast.success('Recebível cadastrado'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useReceberConta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contas_receber')
        .update({ status: 'recebido', recebido_em: new Date().toISOString().split('T')[0] } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contas-receber'] }); toast.success('Conta recebida'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteContaReceber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contas_receber').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contas-receber'] }); toast.success('Recebível removido'); },
    onError: (e: any) => toast.error(e.message),
  });
}

/* ── Fluxo de Caixa (agrega pagar + receber + vendas) ── */
export function useFluxoCaixa(periodo: number = 30) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['fluxo-caixa', profile?.empresa_id, periodo],
    enabled: !!profile?.empresa_id,
    queryFn: async () => {
      const hoje = new Date();
      const inicio = new Date(hoje);
      inicio.setDate(inicio.getDate() - periodo);
      const fim = new Date(hoje);
      fim.setDate(fim.getDate() + periodo);
      const iStr = inicio.toISOString().split('T')[0];
      const fStr = fim.toISOString().split('T')[0];

      const [vendasRes, pagarRes, receberRes] = await Promise.all([
        supabase.from('vendas').select('data, total').eq('status', 'finalizada').gte('data', iStr).lte('data', fStr),
        supabase.from('contas_pagar').select('vencimento, valor, status, pago_em').gte('vencimento', iStr).lte('vencimento', fStr),
        supabase.from('contas_receber').select('vencimento, valor, status, recebido_em').gte('vencimento', iStr).lte('vencimento', fStr),
      ]);

      // Build daily map
      const dias: Record<string, { entradas: number; saidas: number }> = {};

      const ensureDay = (d: string) => {
        if (!dias[d]) dias[d] = { entradas: 0, saidas: 0 };
      };

      (vendasRes.data || []).forEach((v: any) => {
        const d = v.data?.split('T')[0];
        if (d) { ensureDay(d); dias[d].entradas += Number(v.total || 0); }
      });

      (receberRes.data || []).forEach((r: any) => {
        const d = r.status === 'recebido' ? r.recebido_em : r.vencimento;
        if (d) { ensureDay(d); dias[d].entradas += Number(r.valor || 0); }
      });

      (pagarRes.data || []).forEach((p: any) => {
        const d = p.status === 'pago' ? p.pago_em : p.vencimento;
        if (d) { ensureDay(d); dias[d].saidas += Number(p.valor || 0); }
      });

      return Object.entries(dias)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dia, v]) => ({ dia, ...v, saldo: v.entradas - v.saidas }));
    },
  });
}

/* ── DRE Simplificado ── */
export function useDRE(mesOffset: number = 0) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['dre', profile?.empresa_id, mesOffset],
    enabled: !!profile?.empresa_id,
    queryFn: async () => {
      const agora = new Date();
      const mes = new Date(agora.getFullYear(), agora.getMonth() + mesOffset, 1);
      const inicioMes = mes.toISOString().split('T')[0];
      const fimMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).toISOString().split('T')[0];

      const [vendasRes, custosRes, despesasRes, receberRes] = await Promise.all([
        supabase.from('vendas').select('total, desconto').eq('status', 'finalizada').gte('data', inicioMes).lte('data', fimMes + 'T23:59:59'),
        supabase.from('venda_itens').select('qtd, preco_unit, desconto, vendas!inner(data, status)')
          .eq('vendas.status', 'finalizada').gte('vendas.data', inicioMes).lte('vendas.data', fimMes + 'T23:59:59'),
        supabase.from('contas_pagar').select('valor, status, categoria').gte('vencimento', inicioMes).lte('vencimento', fimMes),
        supabase.from('contas_receber').select('valor, status').gte('vencimento', inicioMes).lte('vencimento', fimMes),
      ]);

      const receita = (vendasRes.data || []).reduce((s, v: any) => s + Number(v.total || 0), 0);
      const descontos = (vendasRes.data || []).reduce((s, v: any) => s + Number(v.desconto || 0), 0);
      const receitaLiquida = receita;

      // CMV simplificado (custo = sum of preco_unit * qtd dos itens - margem estimada)
      // For now just use despesas as proxy
      const despesasTotal = (despesasRes.data || []).reduce((s, d: any) => s + Number(d.valor || 0), 0);
      const despesasPagas = (despesasRes.data || []).filter((d: any) => d.status === 'pago').reduce((s, d: any) => s + Number(d.valor || 0), 0);
      const recebiveisTotal = (receberRes.data || []).reduce((s, r: any) => s + Number(r.valor || 0), 0);
      const recebiveisRecebidos = (receberRes.data || []).filter((r: any) => r.status === 'recebido').reduce((s, r: any) => s + Number(r.valor || 0), 0);

      // Categorize despesas
      const despesasPorCategoria: Record<string, number> = {};
      (despesasRes.data || []).forEach((d: any) => {
        const cat = d.categoria || 'Outros';
        despesasPorCategoria[cat] = (despesasPorCategoria[cat] || 0) + Number(d.valor || 0);
      });

      const lucro = receitaLiquida - despesasTotal;
      const margemLiquida = receitaLiquida > 0 ? (lucro / receitaLiquida) * 100 : 0;

      return {
        periodo: `${mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
        receita,
        descontos,
        receitaLiquida,
        despesasTotal,
        despesasPagas,
        despesasPorCategoria,
        recebiveisTotal,
        recebiveisRecebidos,
        lucro,
        margemLiquida,
      };
    },
  });
}
