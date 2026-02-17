import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Terminal {
  id: string;
  empresa_id: string;
  deposito_id: string;
  nome: string;
  identificador: string;
  ativo: boolean;
  criado_em: string;
}

const LS_TERMINAL_KEY = 'pdv_terminal_identificador';

export function getOrCreateTerminalIdentificador(): string {
  if (typeof window === 'undefined') return '';
  const existing = window.localStorage.getItem(LS_TERMINAL_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  window.localStorage.setItem(LS_TERMINAL_KEY, id);
  return id;
}

export function useTerminalByIdentificador(identificador: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['terminal-by-id', profile?.empresa_id, identificador],
    queryFn: async () => {
      if (!profile?.empresa_id || !identificador) return null;
      const { data, error } = await supabase
        .from('terminais')
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .eq('identificador', identificador)
        .maybeSingle();
      if (error) throw error;
      return data as Terminal | null;
    },
    enabled: !!profile?.empresa_id && !!identificador,
  });
}

export function useTerminais() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['terminais', profile?.empresa_id],
    queryFn: async () => {
      if (!profile?.empresa_id) return [];
      const { data, error } = await supabase
        .from('terminais')
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return (data || []) as Terminal[];
    },
    enabled: !!profile?.empresa_id,
  });
}

export function useCreateTerminal() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ nome, depositoId, identificador }: { nome: string; depositoId: string; identificador?: string }) => {
      if (!profile?.empresa_id) throw new Error('Empresa não encontrada');
      const { data, error } = await supabase
        .from('terminais')
        .insert({
          empresa_id: profile.empresa_id,
          deposito_id: depositoId,
          nome,
          identificador: identificador || crypto.randomUUID(),
        })
        .select()
        .single();
      if (error) throw error;
      return data as Terminal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminais'] });
      queryClient.invalidateQueries({ queryKey: ['terminal-by-id'] });
      toast.success('Terminal criado!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar terminal: ' + error.message);
    },
  });
}
