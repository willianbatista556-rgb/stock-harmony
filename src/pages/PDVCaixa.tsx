import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Landmark, DoorOpen, DoorClosed, ArrowDownCircle, ArrowUpCircle,
  ShoppingCart, LogOut, Clock, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatTime } from '@/lib/formatters';
import { useAuth } from '@/contexts/AuthContext';
import {
  useTerminalByIdentificador, useCreateTerminal, useTerminais,
  getOrCreateTerminalIdentificador, Terminal,
} from '@/hooks/useTerminais';
import { useDepositos } from '@/hooks/useDepositos';
import {
  useCaixaAbertoPorTerminal, useCaixaMovimentacoes,
  useAbrirCaixa, useFecharCaixa, useSangria, useSuprimento,
  CaixaMovimentacao,
} from '@/hooks/useCaixa';
import { CaixaPanel } from '@/components/pdv/CaixaPanel';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const tipoLabel: Record<string, string> = {
  venda: 'Venda', sangria: 'Sangria', suprimento: 'Suprimento', abertura: 'Abertura',
};
const tipoColor: Record<string, string> = {
  venda: 'bg-success/10 text-success', sangria: 'bg-destructive/10 text-destructive',
  suprimento: 'bg-primary/10 text-primary', abertura: 'bg-muted text-muted-foreground',
};

export default function PDVCaixa() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { data: depositos = [] } = useDepositos();

  // Auto-register terminal via identificador in localStorage
  const terminalIdentificador = useMemo(() => getOrCreateTerminalIdentificador(), []);
  const { data: terminalByIdent, isLoading: identLoading } = useTerminalByIdentificador(terminalIdentificador);
  const createTerminal = useCreateTerminal();
  const { data: terminais = [] } = useTerminais();

  // Auto-create terminal if not found and depositos available
  const [autoCreated, setAutoCreated] = useState(false);
  useEffect(() => {
    if (identLoading || autoCreated || terminalByIdent) return;
    if (!profile?.empresa_id || depositos.length === 0) return;
    
    // Auto-create terminal linked to first deposito
    createTerminal.mutate(
      { nome: 'Terminal PDV', depositoId: depositos[0].id, identificador: terminalIdentificador },
      { onSuccess: () => setAutoCreated(true) }
    );
  }, [identLoading, terminalByIdent, autoCreated, profile?.empresa_id, depositos, terminalIdentificador]);

  const terminal: Terminal | null = terminalByIdent || null;
  const depositoNome = terminal ? depositos.find(d => d.id === terminal.deposito_id)?.nome : null;

  // Caixa for this terminal
  const { data: caixaAberto, isLoading: caixaLoading } = useCaixaAbertoPorTerminal(terminal?.id);
  const { data: movimentacoes = [] } = useCaixaMovimentacoes(caixaAberto?.id);

  const abrirCaixa = useAbrirCaixa();
  const fecharCaixaM = useFecharCaixa();
  const sangriaM = useSangria();
  const suprimentoM = useSuprimento();

  const [showSangria, setShowSangria] = useState(false);
  const [showSuprimento, setShowSuprimento] = useState(false);
  const [valorMov, setValorMov] = useState('');
  const [descricaoMov, setDescricaoMov] = useState('');

  const saldoAtual = useMemo(() =>
    movimentacoes.reduce((sum, m) => sum + m.valor, 0),
    [movimentacoes]
  );

  // ── Handlers ────────────────────────────────────────────────
  const handleAbrir = async (saldoInicial: number) => {
    if (!terminal) { toast.error('Terminal não encontrado'); return; }
    await abrirCaixa.mutateAsync({
      depositoId: terminal.deposito_id,
      terminalId: terminal.id,
      valorAbertura: saldoInicial,
    });
  };

  const handleFechar = async () => {
    if (!caixaAberto) return;
    await fecharCaixaM.mutateAsync({
      caixaId: caixaAberto.id,
      valorFechamento: saldoAtual,
    });
  };

  const handleSangria = async () => {
    if (!caixaAberto) return;
    const val = parseFloat(valorMov);
    if (isNaN(val) || val <= 0) { toast.error('Valor inválido'); return; }
    await sangriaM.mutateAsync({ caixaId: caixaAberto.id, valor: val, descricao: descricaoMov || 'Sangria' });
    setShowSangria(false);
    setValorMov('');
    setDescricaoMov('');
  };

  const handleSuprimento = async () => {
    if (!caixaAberto) return;
    const val = parseFloat(valorMov);
    if (isNaN(val) || val <= 0) { toast.error('Valor inválido'); return; }
    await suprimentoM.mutateAsync({ caixaId: caixaAberto.id, valor: val, descricao: descricaoMov || 'Suprimento' });
    setShowSuprimento(false);
    setValorMov('');
    setDescricaoMov('');
  };

  // ── Guards ──────────────────────────────────────────────────
  const isLoading = authLoading || identLoading || createTerminal.isPending;

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

  if (!terminal) {
    return (
      <div className="h-screen w-screen fixed inset-0 bg-background flex flex-col items-center justify-center z-50 gap-6">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <Landmark className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-display font-bold text-foreground">Terminal não encontrado</h1>
          <p className="text-muted-foreground max-w-md">
            Não foi possível registrar este terminal. Verifique se há depósitos cadastrados.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/')} className="gap-2">
          <LogOut className="w-4 h-4" />
          Voltar ao Dashboard
        </Button>
      </div>
    );
  }

  const diferenca = caixaAberto ? saldoAtual - caixaAberto.valor_abertura : 0;

  return (
    <div className="h-screen w-screen fixed inset-0 bg-background flex flex-col z-50">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-card border-b border-border">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
            <Landmark className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-foreground tracking-tight">Caixa do Terminal</h1>
            <p className="text-xs text-muted-foreground">{terminal.nome} · {depositoNome || 'Depósito'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {caixaAberto && (
            <>
              <Badge className="bg-success/10 text-success border-success/20 px-3 py-1.5 font-mono">
                <Clock className="w-3 h-3 mr-1.5" />
                Aberto {formatTime(caixaAberto.aberto_em)}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => { setValorMov(''); setDescricaoMov(''); setShowSangria(true); }} className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10">
                <ArrowDownCircle className="w-4 h-4" /> Sangria
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setValorMov(''); setDescricaoMov(''); setShowSuprimento(true); }} className="gap-1.5 text-primary border-primary/30 hover:bg-primary/10">
                <ArrowUpCircle className="w-4 h-4" /> Suprimento
              </Button>
            </>
          )}

          <Button variant="outline" onClick={() => navigate('/pdv')} className="gap-2">
            <ShoppingCart className="w-4 h-4" /> Ir ao PDV
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-muted-foreground">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {caixaLoading && (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground animate-pulse">Verificando caixa…</p>
          </div>
        )}

        {!caixaLoading && !caixaAberto && (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <div className="max-w-md w-full">
              <CaixaPanel
                terminalNome={terminal.nome}
                caixaAberto={false}
                saldoInicial={0}
                onAbrir={handleAbrir}
                onFechar={handleFechar}
                disabled={abrirCaixa.isPending}
              />
            </div>
          </div>
        )}

        {!caixaLoading && caixaAberto && (
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* CaixaPanel for close action */}
            <div className="max-w-md">
              <CaixaPanel
                terminalNome={terminal.nome}
                caixaAberto={true}
                saldoInicial={caixaAberto.valor_abertura}
                onAbrir={handleAbrir}
                onFechar={handleFechar}
                disabled={fecharCaixaM.isPending}
              />
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
              <Card className="bg-card shadow-card">
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Abertura</p>
                  <p className="text-2xl font-bold tabular-nums text-foreground">{formatCurrency(caixaAberto.valor_abertura)}</p>
                </CardContent>
              </Card>
              <Card className="bg-card shadow-card">
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Saldo Atual</p>
                  <p className="text-2xl font-bold tabular-nums text-foreground">{formatCurrency(saldoAtual)}</p>
                </CardContent>
              </Card>
              <Card className="bg-card shadow-card">
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Diferença</p>
                  <p className={cn('text-2xl font-bold tabular-nums', diferenca >= 0 ? 'text-success' : 'text-destructive')}>
                    {diferenca >= 0 ? '+' : ''}{formatCurrency(diferenca)}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card shadow-card">
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Movimentações</p>
                  <p className="text-2xl font-bold tabular-nums text-foreground">{movimentacoes.length}</p>
                </CardContent>
              </Card>
            </div>

            {/* Movements table */}
            <Card className="bg-card shadow-card">
              <CardContent className="pt-6">
                {movimentacoes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhuma movimentação registrada.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hora</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movimentacoes.map((m: CaixaMovimentacao) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-mono text-sm">{formatTime(m.criado_em)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={cn('text-xs', tipoColor[m.tipo])}>
                              {tipoLabel[m.tipo]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{m.descricao || '—'}</TableCell>
                          <TableCell className={cn('text-right font-mono font-medium tabular-nums', m.valor >= 0 ? 'text-success' : 'text-destructive')}>
                            {m.valor >= 0 ? '+' : ''}{formatCurrency(m.valor)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ── Dialogs ──────────────────────────────────────────── */}
      <Dialog open={showSangria} onOpenChange={setShowSangria}>
        <DialogContent className="bg-card max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ArrowDownCircle className="w-5 h-5 text-destructive" />Sangria</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Valor (R$)</label>
              <Input type="number" min="0" step="0.01" value={valorMov} onChange={e => setValorMov(e.target.value)} placeholder="0,00" autoFocus />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Descrição</label>
              <Input value={descricaoMov} onChange={e => setDescricaoMov(e.target.value)} placeholder="Motivo da sangria" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSangria(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleSangria} disabled={sangriaM.isPending}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSuprimento} onOpenChange={setShowSuprimento}>
        <DialogContent className="bg-card max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ArrowUpCircle className="w-5 h-5 text-primary" />Suprimento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Valor (R$)</label>
              <Input type="number" min="0" step="0.01" value={valorMov} onChange={e => setValorMov(e.target.value)} placeholder="0,00" autoFocus />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Descrição</label>
              <Input value={descricaoMov} onChange={e => setDescricaoMov(e.target.value)} placeholder="Motivo do suprimento" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuprimento(false)}>Cancelar</Button>
            <Button onClick={handleSuprimento} disabled={suprimentoM.isPending} className="gradient-primary text-primary-foreground">Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
