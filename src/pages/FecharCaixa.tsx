import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark, LogOut, ArrowLeft, DoorClosed, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/formatters';
import { useAuth } from '@/contexts/AuthContext';
import { getOrCreateTerminalIdentificador, useTerminalByIdentificador } from '@/hooks/useTerminais';
import { useCaixaAbertoPorTerminal } from '@/hooks/useCaixa';
import { getCaixaResumo, fecharCaixaRPC, CaixaResumo } from '@/lib/pdv/pdv.close.api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function FecharCaixa() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, profile, loading: authLoading } = useAuth();

  const terminalIdentificador = useMemo(() => getOrCreateTerminalIdentificador(), []);
  const { data: terminal, isLoading: termLoading } = useTerminalByIdentificador(terminalIdentificador);
  const { data: caixaAberto, isLoading: caixaLoading } = useCaixaAbertoPorTerminal(terminal?.id);

  const [resumo, setResumo] = useState<CaixaResumo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [valorContado, setValorContado] = useState('');
  const [obs, setObs] = useState('');

  const parsedContado = useMemo(() => Number(valorContado.replace(',', '.')) || 0, [valorContado]);
  const diff = useMemo(() => {
    if (!resumo) return 0;
    return parsedContado - (resumo.sugestao_saldo_final ?? 0);
  }, [parsedContado, resumo]);

  // Load resumo when caixa is available
  useEffect(() => {
    if (!caixaAberto?.id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const r = await getCaixaResumo(caixaAberto!.id);
        if (cancelled) return;
        setResumo(r);
        setValorContado(String(r.sugestao_saldo_final ?? 0));
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Erro ao carregar resumo.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [caixaAberto?.id]);

  async function onCloseCash() {
    if (!caixaAberto?.id) return;
    setLoading(true);
    setError(null);
    try {
      await fecharCaixaRPC({
        caixaId: caixaAberto.id,
        valorContado: Math.max(0, parsedContado),
        observacao: obs.trim() || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['caixa-aberto'] });
      queryClient.invalidateQueries({ queryKey: ['caixas-abertos'] });
      queryClient.invalidateQueries({ queryKey: ['caixas-historico'] });
      queryClient.invalidateQueries({ queryKey: ['fluxo-caixa'] });
      toast.success('Caixa fechado com sucesso!');
      navigate('/pdv/caixa');
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao fechar caixa.');
    } finally {
      setLoading(false);
    }
  }

  // ── Guards ──────────────────────────────────────────────────
  const isBooting = authLoading || termLoading || caixaLoading;

  if (isBooting) {
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
    navigate('/auth');
    return null;
  }

  if (!caixaAberto) {
    navigate('/pdv/caixa');
    return null;
  }

  return (
    <div className="h-screen w-screen fixed inset-0 bg-background flex flex-col z-50">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-card border-b border-border">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
            <DoorClosed className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-foreground tracking-tight">Fechar Caixa</h1>
            <p className="text-xs text-muted-foreground">Resumo automático + conferência</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate('/pdv/caixa')} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading && !resumo ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground animate-pulse">Calculando resumo…</p>
          </div>
        ) : resumo ? (
          <div className="grid grid-cols-12 gap-6 max-w-5xl mx-auto">
            {/* Left: Resumo */}
            <div className="col-span-12 lg:col-span-7 space-y-4">
              <Card className="bg-card shadow-card">
                <CardContent className="pt-6 space-y-3">
                  <h2 className="text-base font-display font-semibold text-foreground">Resumo do Caixa</h2>

                  <SummaryRow label="Saldo inicial" value={formatCurrency(resumo.saldo_inicial)} />
                  <SummaryRow label="Suprimentos (entrada)" value={formatCurrency(resumo.mov_entrada)} className="text-primary" />
                  <SummaryRow label="Sangrias (saída)" value={formatCurrency(resumo.mov_saida)} className="text-destructive" />
                  <SummaryRow label="Total de vendas" value={formatCurrency(resumo.total_vendas)} className="text-success" />

                  <div className="border-t border-border pt-3" />

                  <p className="text-sm font-medium text-foreground">Vendas por método</p>
                  <div className="space-y-1.5">
                    {resumo.por_metodo.length ? resumo.por_metodo.map((m) => (
                      <SummaryRow key={m.metodo} label={m.metodo.toUpperCase()} value={formatCurrency(m.valor)} />
                    )) : (
                      <p className="text-sm text-muted-foreground">Sem vendas registradas.</p>
                    )}
                  </div>

                  <div className="border-t border-border pt-3" />
                  <SummaryRow
                    label="Sugestão de saldo final"
                    value={formatCurrency(resumo.sugestao_saldo_final)}
                    strong
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right: Conferência */}
            <div className="col-span-12 lg:col-span-5 space-y-4">
              <Card className="bg-card shadow-card">
                <CardContent className="pt-6 space-y-4">
                  <h2 className="text-base font-display font-semibold text-foreground">Conferência</h2>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      Valor contado (R$)
                    </label>
                    <Input
                      value={valorContado}
                      onChange={(e) => setValorContado(e.target.value)}
                      inputMode="decimal"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0,00"
                      className="font-mono text-lg"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Diferença</p>
                    <p className={cn(
                      'text-2xl font-bold font-mono tabular-nums',
                      diff === 0 ? 'text-foreground' : diff > 0 ? 'text-success' : 'text-destructive'
                    )}>
                      {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {diff === 0 ? 'Sem sobra/quebra.' : diff > 0 ? 'Sobra de caixa.' : 'Quebra de caixa.'}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      Observação (opcional)
                    </label>
                    <Textarea
                      value={obs}
                      onChange={(e) => setObs(e.target.value)}
                      placeholder="Ex.: conferido e fechado pelo gerente…"
                      rows={3}
                    />
                  </div>

                  <Button
                    className="w-full gap-2"
                    variant="destructive"
                    onClick={onCloseCash}
                    disabled={loading}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Confirmar Fechamento
                  </Button>

                  <p className="text-xs text-muted-foreground">
                    Ao fechar, o caixa fica bloqueado para novas vendas neste terminal.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SummaryRow({ label, value, strong, className }: { label: string; value: string; strong?: boolean; className?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn(strong ? 'font-semibold text-foreground' : 'font-medium font-mono tabular-nums', className)}>
        {value}
      </span>
    </div>
  );
}
