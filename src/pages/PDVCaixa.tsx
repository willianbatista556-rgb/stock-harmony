import { useState, useMemo } from 'react';
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatTime } from '@/lib/formatters';
import { useAuth } from '@/contexts/AuthContext';
import { useTerminais } from '@/hooks/useTerminais';
import { useDepositos } from '@/hooks/useDepositos';
import {
  useCaixaAbertoPorTerminal, useCaixaMovimentacoes,
  useAbrirCaixa, useFecharCaixa, useSangria, useSuprimento,
  CaixaMovimentacao,
} from '@/hooks/useCaixa';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TERMINAL_LS_KEY = 'pdv_terminal_id';

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
  const { data: terminais = [], isLoading: terminaisLoading } = useTerminais();
  const { data: depositos = [] } = useDepositos();

  // Terminal from localStorage
  const [terminalId, setTerminalId] = useState(() => localStorage.getItem(TERMINAL_LS_KEY) || '');

  const handleTerminalChange = (id: string) => {
    setTerminalId(id);
    localStorage.setItem(TERMINAL_LS_KEY, id);
  };

  const terminal = terminais.find(t => t.id === terminalId);
  const depositoNome = terminal ? depositos.find(d => d.id === terminal.deposito_id)?.nome : null;

  // Caixa for this terminal
  const { data: caixaAberto, isLoading: caixaLoading } = useCaixaAbertoPorTerminal(terminalId || undefined);
  const { data: movimentacoes = [] } = useCaixaMovimentacoes(caixaAberto?.id);

  const abrirCaixa = useAbrirCaixa();
  const fecharCaixa = useFecharCaixa();
  const sangriaM = useSangria();
  const suprimentoM = useSuprimento();

  const [showAbrir, setShowAbrir] = useState(false);
  const [showFechar, setShowFechar] = useState(false);
  const [showSangria, setShowSangria] = useState(false);
  const [showSuprimento, setShowSuprimento] = useState(false);

  const [valorAbertura, setValorAbertura] = useState('');
  const [valorFechamento, setValorFechamento] = useState('');
  const [observacaoFechamento, setObservacaoFechamento] = useState('');
  const [valorMov, setValorMov] = useState('');
  const [descricaoMov, setDescricaoMov] = useState('');

  const saldoAtual = useMemo(() =>
    movimentacoes.reduce((sum, m) => sum + m.valor, 0),
    [movimentacoes]
  );

  // ── Handlers ────────────────────────────────────────────────
  const handleAbrir = async () => {
    if (!terminal) { toast.error('Selecione um terminal'); return; }
    const val = parseFloat(valorAbertura) || 0;
    await abrirCaixa.mutateAsync({
      depositoId: terminal.deposito_id,
      terminalId: terminal.id,
      valorAbertura: val,
    });
    setShowAbrir(false);
    setValorAbertura('');
  };

  const handleFechar = async () => {
    if (!caixaAberto) return;
    const val = parseFloat(valorFechamento) || 0;
    await fecharCaixa.mutateAsync({
      caixaId: caixaAberto.id,
      valorFechamento: val,
      observacao: observacaoFechamento,
    });
    setShowFechar(false);
    setValorFechamento('');
    setObservacaoFechamento('');
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
  if (authLoading || terminaisLoading) {
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

  // No terminals yet
  if (terminais.length === 0) {
    return (
      <div className="h-screen w-screen fixed inset-0 bg-background flex flex-col items-center justify-center z-50 gap-6">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <Landmark className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-display font-bold text-foreground">Nenhum terminal cadastrado</h1>
          <p className="text-muted-foreground max-w-md">
            Peça ao gerente para cadastrar terminais de PDV antes de operar.
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
          <h1 className="text-lg font-display font-bold text-foreground tracking-tight">Caixa do Terminal</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Terminal selector */}
          <Select value={terminalId} onValueChange={handleTerminalChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecione o terminal" />
            </SelectTrigger>
            <SelectContent>
              {terminais.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {terminal && !caixaAberto && !caixaLoading && (
            <Button onClick={() => { setValorAbertura(''); setShowAbrir(true); }} className="gradient-primary text-primary-foreground gap-2">
              <DoorOpen className="w-4 h-4" /> Abrir Caixa
            </Button>
          )}

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
              <Button variant="destructive" size="sm" onClick={() => setShowFechar(true)} className="gap-1.5">
                <DoorClosed className="w-4 h-4" /> Fechar Caixa
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
        {!terminalId && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
            <Landmark className="w-16 h-16 opacity-20" />
            <p>Selecione um terminal para gerenciar o caixa.</p>
          </div>
        )}

        {terminalId && caixaLoading && (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground animate-pulse">Verificando caixa…</p>
          </div>
        )}

        {terminalId && !caixaLoading && !caixaAberto && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center">
              <DoorClosed className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-display font-bold text-foreground">Caixa fechado</h2>
            <p className="text-muted-foreground">
              Terminal: <strong>{terminal?.nome}</strong>
              {depositoNome && <> · Depósito: <strong>{depositoNome}</strong></>}
            </p>
            <Button onClick={() => { setValorAbertura(''); setShowAbrir(true); }} className="gradient-primary text-primary-foreground gap-2 h-12 text-lg px-8">
              <DoorOpen className="w-5 h-5" /> Abrir Caixa
            </Button>
          </div>
        )}

        {terminalId && !caixaLoading && caixaAberto && (
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* Summary */}
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
      <Dialog open={showAbrir} onOpenChange={setShowAbrir}>
        <DialogContent className="bg-card max-w-sm">
          <DialogHeader><DialogTitle>Abrir Caixa — {terminal?.nome}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {depositoNome && (
              <p className="text-sm text-muted-foreground">Depósito: <strong>{depositoNome}</strong></p>
            )}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Valor de abertura (R$)</label>
              <Input type="number" min="0" step="0.01" value={valorAbertura} onChange={e => setValorAbertura(e.target.value)} placeholder="0,00" autoFocus />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAbrir(false)}>Cancelar</Button>
            <Button onClick={handleAbrir} disabled={abrirCaixa.isPending} className="gradient-primary text-primary-foreground">
              {abrirCaixa.isPending ? 'Abrindo...' : 'Abrir Caixa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showFechar} onOpenChange={setShowFechar}>
        <DialogContent className="bg-card max-w-sm">
          <DialogHeader><DialogTitle>Fechar Caixa</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Saldo esperado:</span>
              <span className="font-mono font-bold">{formatCurrency(saldoAtual)}</span>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Valor contado (R$)</label>
              <Input type="number" min="0" step="0.01" value={valorFechamento} onChange={e => setValorFechamento(e.target.value)} placeholder="0,00" autoFocus />
            </div>
            {valorFechamento && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Diferença:</span>
                <span className={cn('font-mono font-bold', (parseFloat(valorFechamento) - saldoAtual) >= 0 ? 'text-success' : 'text-destructive')}>
                  {formatCurrency(parseFloat(valorFechamento) - saldoAtual)}
                </span>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Observação (opcional)</label>
              <Textarea value={observacaoFechamento} onChange={e => setObservacaoFechamento(e.target.value)} placeholder="Observação do fechamento..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFechar(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleFechar} disabled={fecharCaixa.isPending}>
              {fecharCaixa.isPending ? 'Fechando...' : 'Fechar Caixa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
