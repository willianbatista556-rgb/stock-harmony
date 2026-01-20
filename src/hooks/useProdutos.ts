import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Produto {
  id: string;
  nome: string;
  sku: string | null;
  ean: string | null;
  marca: string | null;
  unidade: string | null;
  custo_medio: number | null;
  preco_venda: number | null;
  estoque_min: number | null;
  estoque_max: number | null;
  ativo: boolean | null;
  categoria_id: string | null;
  empresa_id: string;
  criado_em: string | null;
}

export function useProdutos() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['produtos', profile?.empresa_id],
    queryFn: async () => {
      if (!profile?.empresa_id) return [];
      
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      return data as Produto[];
    },
    enabled: !!profile?.empresa_id,
  });
}
