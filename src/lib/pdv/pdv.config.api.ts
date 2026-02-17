import { supabase } from '@/integrations/supabase/client';

export type EmpresaConfig = {
  bloquear_venda_sem_estoque: boolean;
  permitir_estoque_negativo: boolean;
};

export async function getEmpresaConfig(empresaId: string): Promise<EmpresaConfig> {
  const { data, error } = await supabase
    .from('empresa_config')
    .select('bloquear_venda_sem_estoque, permitir_estoque_negativo')
    .eq('empresa_id', empresaId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return (
    (data as EmpresaConfig) ?? {
      bloquear_venda_sem_estoque: true,
      permitir_estoque_negativo: false,
    }
  );
}
