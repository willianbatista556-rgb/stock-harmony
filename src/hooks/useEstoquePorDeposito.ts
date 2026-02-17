import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useEstoquePorDeposito(depositoId: string | undefined) {
  return useQuery({
    queryKey: ['estoque-deposito', depositoId],
    queryFn: async () => {
      if (!depositoId) return {};
      const { data, error } = await supabase
        .from('estoque')
        .select('produto_id, qtd')
        .eq('deposito_id', depositoId);

      if (error) throw error;

      const map: Record<string, number> = {};
      for (const row of data ?? []) {
        map[row.produto_id] = row.qtd ?? 0;
      }
      return map;
    },
    enabled: !!depositoId,
  });
}
