import { useState, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Produto } from './useProdutos';

export interface PDVItem {
  id: string;
  produto: Produto;
  qtd: number;
  preco_unit: number;
  desconto: number;
  subtotal: number;
}

export interface Pagamento {
  forma: 'dinheiro' | 'credito' | 'debito' | 'pix';
  valor: number;
  troco?: number;
}

export type PDVMode = 'normal' | 'search' | 'quantity' | 'payment' | 'discount';

export function usePDV() {
  const [items, setItems] = useState<PDVItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [mode, setMode] = useState<PDVMode>('normal');
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [descontoGeral, setDescontoGeral] = useState(0);
  const idCounter = useRef(0);

  const total = items.reduce((sum, item) => sum + item.subtotal, 0) - descontoGeral;
  const totalPago = pagamentos.reduce((sum, p) => sum + p.valor, 0);
  const restante = Math.max(0, total - totalPago);

  const addItem = useCallback((produto: Produto) => {
    setItems(prev => {
      const existing = prev.find(i => i.produto.id === produto.id);
      if (existing) {
        return prev.map(i =>
          i.produto.id === produto.id
            ? { ...i, qtd: i.qtd + 1, subtotal: (i.qtd + 1) * i.preco_unit - i.desconto }
            : i
        );
      }
      idCounter.current++;
      const newItem: PDVItem = {
        id: `pdv-${idCounter.current}`,
        produto,
        qtd: 1,
        preco_unit: produto.preco_venda || 0,
        desconto: 0,
        subtotal: produto.preco_venda || 0,
      };
      setSelectedIndex(prev.length);
      return [...prev, newItem];
    });
    setMode('normal');
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
    setSelectedIndex(i => Math.max(0, i - 1));
  }, []);

  const updateQuantity = useCallback((index: number, qtd: number) => {
    if (qtd <= 0) {
      removeItem(index);
      return;
    }
    setItems(prev =>
      prev.map((item, i) =>
        i === index
          ? { ...item, qtd, subtotal: qtd * item.preco_unit - item.desconto }
          : item
      )
    );
  }, [removeItem]);

  const applyItemDiscount = useCallback((index: number, desconto: number) => {
    setItems(prev =>
      prev.map((item, i) =>
        i === index
          ? { ...item, desconto, subtotal: item.qtd * item.preco_unit - desconto }
          : item
      )
    );
  }, []);

  const addPagamento = useCallback((pagamento: Pagamento) => {
    setPagamentos(prev => [...prev, pagamento]);
  }, []);

  const removePagamento = useCallback((index: number) => {
    setPagamentos(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearSale = useCallback(() => {
    setItems([]);
    setSelectedIndex(-1);
    setMode('normal');
    setPagamentos([]);
    setDescontoGeral(0);
  }, []);

  return {
    items,
    selectedIndex,
    setSelectedIndex,
    mode,
    setMode,
    pagamentos,
    descontoGeral,
    setDescontoGeral,
    total,
    totalPago,
    restante,
    addItem,
    removeItem,
    updateQuantity,
    applyItemDiscount,
    addPagamento,
    removePagamento,
    clearSale,
  };
}

export function useFinalizarVenda() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async ({
      items,
      pagamentos,
      descontoGeral,
      depositoId,
    }: {
      items: PDVItem[];
      pagamentos: Pagamento[];
      descontoGeral: number;
      depositoId: string;
    }) => {
      if (!profile?.empresa_id || !user?.id) throw new Error('Usuário não autenticado');

      const total = items.reduce((sum, item) => sum + item.subtotal, 0) - descontoGeral;

      // 1. Create venda
      const { data: venda, error: vendaError } = await supabase
        .from('vendas')
        .insert({
          empresa_id: profile.empresa_id,
          usuario_id: user.id,
          total,
          status: 'finalizada',
          desconto: descontoGeral,
        })
        .select()
        .single();

      if (vendaError) throw vendaError;

      // 2. Insert venda_itens
      const itensData = items.map(item => ({
        venda_id: venda.id,
        produto_id: item.produto.id,
        qtd: item.qtd,
        preco_unit: item.preco_unit,
        desconto: item.desconto,
      }));

      const { error: itensError } = await supabase
        .from('venda_itens')
        .insert(itensData);

      if (itensError) throw itensError;

      // 3. Insert pagamentos
      const pagData = pagamentos.map(p => ({
        venda_id: venda.id,
        forma: p.forma,
        valor: p.valor,
        troco: p.troco || 0,
      }));

      const { error: pagError } = await supabase
        .from('pagamentos')
        .insert(pagData);

      if (pagError) throw pagError;

      // 4. Update estoque (saída para cada item)
      for (const item of items) {
        // Insert movimentacao
        await supabase.from('movimentacoes').insert({
          tipo: 'saida',
          origem: 'venda',
          produto_id: item.produto.id,
          deposito_id: depositoId,
          qtd: -Math.abs(item.qtd),
          custo_unit: item.preco_unit,
          empresa_id: profile.empresa_id,
          usuario_id: user.id,
        });

        // Update estoque
        const { data: estoqueExistente } = await supabase
          .from('estoque')
          .select('id, qtd')
          .eq('produto_id', item.produto.id)
          .eq('deposito_id', depositoId)
          .single();

        if (estoqueExistente) {
          await supabase
            .from('estoque')
            .update({
              qtd: (estoqueExistente.qtd || 0) - item.qtd,
              atualizado_em: new Date().toISOString(),
            })
            .eq('id', estoqueExistente.id);
        }
      }

      return venda;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimentacoes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      toast.success('Venda finalizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao finalizar venda: ' + error.message);
    },
  });
}
