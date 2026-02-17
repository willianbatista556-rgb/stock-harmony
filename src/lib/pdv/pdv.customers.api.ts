import { supabase } from '@/integrations/supabase/client';

export async function ensureClienteBalcao(empresaId: string) {
  const { data, error } = await supabase.rpc('ensure_cliente_balcao', {
    p_empresa_id: empresaId,
  });

  if (error) throw new Error(error.message);
  return data as string; // cliente_id
}

export async function searchClientes(empresaId: string, q: string) {
  const query = q.trim();
  if (!query) return [];

  const { data, error } = await supabase
    .from('clientes')
    .select('id,nome,cpf_cnpj')
    .eq('empresa_id', empresaId)
    .eq('ativo', true)
    .or(`nome.ilike.%${query}%,cpf_cnpj.ilike.%${query}%`)
    .order('nome', { ascending: true })
    .limit(10);

  if (error) throw new Error(error.message);
  return data ?? [];
}
