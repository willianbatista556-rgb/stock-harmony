import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark, LogOut, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import {
  useTerminalByIdentificador, useCreateTerminal,
  getOrCreateTerminalIdentificador,
} from '@/hooks/useTerminais';
import { useDepositos } from '@/hooks/useDepositos';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function PDVTerminal() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, profile, loading: authLoading } = useAuth();
  const { data: depositos = [], isLoading: depLoading } = useDepositos();

  const terminalIdentificador = useMemo(() => getOrCreateTerminalIdentificador(), []);
  const { data: terminal, isLoading: termLoading } = useTerminalByIdentificador(terminalIdentificador);
  const createTerminal = useCreateTerminal();

  const [depositoId, setDepositoId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const isLoading = authLoading || depLoading || termLoading;

  if (isLoading) {
    return (
      <div className="h-screen w-screen fixed inset-0 bg-background flex flex-col items-center justify-center z-50 gap-4">
        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center animate-pulse">
          <Landmark className="w-6 h-6 text-primary-foreground" />
        </div>
        <p className="text-muted-foreground text-sm">Carregando…</p>
      </div>
    );
  }

  if (!user || !profile?.empresa_id) {
    return (
      <div className="h-screen w-screen fixed inset-0 bg-background flex flex-col items-center justify-center z-50 gap-6">
        <AlertTriangle className="w-12 h-12 text-destructive" />
        <p className="text-muted-foreground">Usuário não autenticado ou sem empresa vinculada.</p>
        <Button variant="outline" onClick={() => navigate('/auth')}>Login</Button>
      </div>
    );
  }

  if (depositos.length === 0) {
    return (
      <div className="h-screen w-screen fixed inset-0 bg-background flex flex-col items-center justify-center z-50 gap-6">
        <AlertTriangle className="w-12 h-12 text-warning" />
        <div className="text-center space-y-2">
          <h1 className="text-xl font-display font-bold text-foreground">Nenhum depósito cadastrado</h1>
          <p className="text-muted-foreground max-w-md">
            Cadastre ao menos um depósito antes de configurar o terminal.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/depositos')}>Ir para Depósitos</Button>
      </div>
    );
  }

  const handleSalvar = async () => {
    if (!depositoId) {
      toast.error('Selecione um depósito/filial.');
      return;
    }

    setSaving(true);
    try {
      if (terminal) {
        // Update existing terminal's deposito_id
        const { error } = await supabase
          .from('terminais')
          .update({ deposito_id: depositoId })
          .eq('id', terminal.id);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['terminal-by-id'] });
        queryClient.invalidateQueries({ queryKey: ['terminais'] });
        toast.success('Terminal configurado!');
      } else {
        // Create new terminal with selected deposito
        await createTerminal.mutateAsync({
          nome: 'Terminal PDV',
          depositoId: depositoId,
          identificador: terminalIdentificador,
        });
      }
      navigate('/pdv/caixa');
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + (e?.message || 'erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-screen w-screen fixed inset-0 bg-background flex flex-col items-center justify-center z-50">
      <div className="max-w-md w-full mx-auto p-6 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto">
            <Landmark className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">Configurar Terminal</h1>
          <p className="text-sm text-muted-foreground">
            Vincule este terminal a um depósito/filial para movimentar estoque corretamente.
          </p>
        </div>

        <div className="bg-card rounded-lg border border-border p-5 space-y-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Terminal</p>
            <p className="text-sm font-medium text-foreground">{terminal?.nome || 'Novo Terminal'}</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Depósito / Filial</label>
            <Select value={depositoId} onValueChange={setDepositoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione…" />
              </SelectTrigger>
              <SelectContent>
                {depositos.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.nome} {d.tipo ? `(${d.tipo})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full gradient-primary text-primary-foreground"
            onClick={handleSalvar}
            disabled={saving || !depositoId}
          >
            {saving ? 'Salvando…' : 'Salvar e continuar'}
          </Button>
        </div>

        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-muted-foreground gap-2">
            <LogOut className="w-4 h-4" /> Voltar ao Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
