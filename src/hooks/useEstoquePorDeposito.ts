import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useEstoquePorDeposito(depositoId: string | undefined) {
  return useQuery({
    queryKey: ['estoque-deposito', depositoId],
    queryFn: async () => {
      if (!depositoId) return {};
      const { data, error } = await supabase
        .from('estoque_saldos')
        .select('produto_id, saldo')
        .eq('local_id', depositoId);

      if (error) throw error;

      const map: Record<string, number> = {};
      for (const row of data ?? []) {
        map[row.produto_id] = row.saldo ?? 0;
      }
      return map;
    },
    enabled: !!depositoId,
  });
}
