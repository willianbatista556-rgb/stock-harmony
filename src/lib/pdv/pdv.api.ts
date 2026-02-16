import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { PDVItem, Pagamento, PDVCustomer, PDVDiscount } from './pdv.types';
import { getDescontoGeral } from './pdv.reducer';

interface FinalizarVendaParams {
  items: PDVItem[];
  pagamentos: Pagamento[];
  descontoGeral: number;
  depositoId: string;
  customer?: PDVCustomer | null;
  caixaId?: string | null;
  subtotal?: number;
}

export function useFinalizarVenda() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ items, pagamentos, descontoGeral, depositoId, customer, caixaId, subtotal }: FinalizarVendaParams) => {
      if (!profile?.empresa_id) throw new Error('Usuário não autenticado');

      const totalBruto = subtotal ?? items.reduce((sum, item) => sum + item.subtotal, 0);
      const total = totalBruto - descontoGeral;

      const { data, error } = await supabase.rpc('pdv_finalizar_venda', {
        p_empresa_id: profile.empresa_id,
        p_caixa_id: caixaId || null,
        p_cliente_id: customer?.id || null,
        p_deposito_id: depositoId,
        p_subtotal: totalBruto,
        p_desconto: descontoGeral,
        p_total: total,
        p_itens: items.map(item => ({
          produto_id: item.produto.id,
          qtd: item.qtd,
          preco_unit: item.preco_unit,
          desconto: item.desconto,
        })),
        p_pagamentos: pagamentos.map(p => ({
          forma: p.forma,
          valor: p.valor,
          troco: p.troco || 0,
        })),
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimentacoes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      queryClient.invalidateQueries({ queryKey: ['caixa-movimentacoes'] });
      queryClient.invalidateQueries({ queryKey: ['fluxo-caixa'] });
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      toast.success('Venda finalizada com sucesso!');
    },
    onError: (error: Error) => {
      const msg = error.message;
      if (msg.includes('Estoque insuficiente')) {
        toast.error('Estoque insuficiente', { description: msg });
      } else if (msg.includes('sem estoque')) {
        toast.error('Produto sem estoque cadastrado', { description: msg });
      } else if (msg.includes('Pagamento insuficiente')) {
        toast.error('Pagamento insuficiente', { description: msg });
      } else {
        toast.error('Erro ao finalizar venda: ' + msg);
      }
    },
  });
}
