import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface EmpresaConfig {
  bloquear_venda_sem_estoque: boolean;
  permitir_estoque_negativo: boolean;
}

const DEFAULTS: EmpresaConfig = {
  bloquear_venda_sem_estoque: true,
  permitir_estoque_negativo: false,
};

export function useEmpresaConfig() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;

  return useQuery({
    queryKey: ['empresa-config', empresaId],
    queryFn: async (): Promise<EmpresaConfig> => {
      if (!empresaId) return DEFAULTS;

      const { data, error } = await supabase
        .from('empresa_config')
        .select('bloquear_venda_sem_estoque, permitir_estoque_negativo')
        .eq('empresa_id', empresaId)
        .maybeSingle();

      if (error) throw error;
      return (data as EmpresaConfig) ?? DEFAULTS;
    },
    enabled: !!empresaId,
  });
}

export function useUpdateEmpresaConfig() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const empresaId = profile?.empresa_id;

  return useMutation({
    mutationFn: async (config: Partial<EmpresaConfig>) => {
      if (!empresaId) throw new Error('Empresa não encontrada');

      const { error } = await supabase
        .from('empresa_config')
        .upsert(
          { empresa_id: empresaId, ...config },
          { onConflict: 'empresa_id' }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresa-config', empresaId] });
    },
  });
}
