import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from './useSubscription';

/**
 * Granular feature flags per empresa (lotes, grade, comissao, etc.)
 * Combined with plan-level module checks for hybrid visibility.
 */

export type FeatureKey =
  | 'lotes'
  | 'grade'
  | 'comissao'
  | 'crediario'
  | 'orcamentos'
  | 'multi_preco'
  | 'transferencias';

export function useFeatureFlags() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const { hasModule, isLoading: subLoading } = useSubscription();

  const featuresQuery = useQuery({
    queryKey: ['empresa-features', empresaId],
    queryFn: async () => {
      if (!empresaId) return {};
      const { data, error } = await supabase
        .from('empresa_features')
        .select('chave, ativo')
        .eq('empresa_id', empresaId);
      if (error) throw error;
      const map: Record<string, boolean> = {};
      for (const row of data ?? []) {
        map[row.chave] = row.ativo;
      }
      return map;
    },
    enabled: !!empresaId,
  });

  const features = featuresQuery.data ?? {};
  const isLoading = subLoading || featuresQuery.isLoading;

  /**
   * Check if a granular feature is enabled for this empresa.
   * Returns true while loading (permissive).
   */
  const hasFeature = (key: FeatureKey): boolean => {
    if (isLoading) return true;
    return features[key] !== false; // default true if no row
  };

  /**
   * Check if a plan module is available (locked = show with padlock).
   */
  const hasModuleAccess = (mod: string): boolean => {
    return hasModule(mod);
  };

  return {
    features,
    isLoading,
    hasFeature,
    hasModule: hasModuleAccess,
  };
}
