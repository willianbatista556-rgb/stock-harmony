import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { PDVItem, Pagamento } from './pdv.types';

interface FinalizarVendaParams {
  items: PDVItem[];
  pagamentos: Pagamento[];
  descontoGeral: number;
  depositoId: string;
}

export function useFinalizarVenda() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async ({ items, pagamentos, descontoGeral, depositoId }: FinalizarVendaParams) => {
      if (!profile?.empresa_id || !user?.id) throw new Error('Usuário não autenticado');

      const total = items.reduce((sum, item) => sum + item.subtotal, 0) - descontoGeral;

      const { data, error } = await supabase.rpc('finalizar_venda', {
        p_empresa_id: profile.empresa_id,
        p_usuario_id: user.id,
        p_deposito_id: depositoId,
        p_total: total,
        p_desconto: descontoGeral,
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
      toast.success('Venda finalizada com sucesso!');
    },
    onError: (error: Error) => {
      const msg = error.message;
      if (msg.includes('Estoque insuficiente')) {
        toast.error('Estoque insuficiente', { description: msg });
      } else if (msg.includes('sem registro de estoque')) {
        toast.error('Produto sem estoque cadastrado', { description: msg });
      } else if (msg.includes('Pagamento insuficiente')) {
        toast.error('Pagamento insuficiente', { description: msg });
      } else {
        toast.error('Erro ao finalizar venda: ' + msg);
      }
    },
  });
}
