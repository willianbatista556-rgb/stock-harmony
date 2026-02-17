import { useState, useMemo, useEffect } from 'react';
import {
  Landmark, DoorOpen, DoorClosed, ArrowDownCircle, ArrowUpCircle,
  TrendingUp, TrendingDown, Clock, Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend, LineChart, Line,
} from 'recharts';
import { formatCurrency, formatDate, formatTime } from '@/lib/formatters';
import { useDepositos } from '@/hooks/useDepositos';
import {
  useCaixaAberto, useCaixasAbertos, useCaixasHistorico, useCaixaMovimentacoes,
  useFluxoCaixa, useAbrirCaixa, useFecharCaixa, useSangria, useSuprimento,
  CaixaMovimentacao,
} from '@/hooks/useCaixa';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const tipoLabel: Record<string, string> = {
  venda: 'Venda', sangria: 'Sangria', suprimento: 'Suprimento', abertura: 'Abertura',
};
const tipoColor: Record<string, string> = {
  venda: 'bg-success/10 text-success', sangria: 'bg-destructive/10 text-destructive',
  suprimento: 'bg-primary/10 text-primary', abertura: 'bg-muted text-muted-foreground',
};

export default function Caixa() {
  const { data: caixasAbertos = [] } = useCaixasAbertos();
  const { data: historico = [] } = useCaixasHistorico();
  const { data: fluxoDiario = [] } = useFluxoCaixa();
  const { data: depositos = [] } = useDepositos();

  // Selected deposit for viewing/managing
  const [selectedDepositoId, setSelectedDepositoId] = useState('');

  // Auto-select first deposit with open caixa, or first deposit
  useEffect(() => {
    if (!selectedDepositoId && depositos.length > 0) {
      const openDep = caixasAbertos.find(c => c.status === 'aberto');
      setSelectedDepositoId(openDep?.deposito_id || depositos[0].id);
    }
  }, [depositos, caixasAbertos, selectedDepositoId]);

  const caixaAberto = caixasAbertos.find(c => c.deposito_id === selectedDepositoId) || null;
  const { data: movimentacoes = [] } = useCaixaMovimentacoes(caixaAberto?.id);

  const abrirCaixa = useAbrirCaixa();
  const fecharCaixa = useFecharCaixa();
  const sangria = useSangria();
  const suprimento = useSuprimento();

  const [showAbrir, setShowAbrir] = useState(false);
  const [showFechar, setShowFechar] = useState(false);
  const [showSangria, setShowSangria] = useState(false);
  const [showSuprimento, setShowSuprimento] = useState(false);

  const [depositoId, setDepositoId] = useState('');
  const [valorAbertura, setValorAbertura] = useState('');
  const [valorFechamento, setValorFechamento] = useState('');
  const [observacaoFechamento, setObservacaoFechamento] = useState('');
  const [valorMov, setValorMov] = useState('');
  const [descricaoMov, setDescricaoMov] = useState('');

  // Calculate current balance from movements
  const saldoAtual = useMemo(() => {
    return movimentacoes.reduce((sum, m) => sum + m.valor, 0);
  }, [movimentacoes]);

  // Aggregate flow data for charts
  const fluxoSemanal = useMemo(() => {
    const weeks: Record<string, { semana: string; entradas: number; saidas: number; saldo: number }> = {};
    fluxoDiario.forEach(d => {
      const date = new Date(d.dia);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      if (!weeks[key]) weeks[key] = { semana: key, entradas: 0, saidas: 0, saldo: 0 };
      weeks[key].entradas += Number(d.entradas);
      weeks[key].saidas += Number(d.saidas);
      weeks[key].saldo += Number(d.saldo);
    });
    return Object.values(weeks).sort((a, b) => a.semana.localeCompare(b.semana)).slice(-12);
  }, [fluxoDiario]);

  const fluxoMensal = useMemo(() => {
    const months: Record<string, { mes: string; entradas: number; saidas: number; saldo: number }> = {};
    fluxoDiario.forEach(d => {
      const key = d.dia.slice(0, 7);
      if (!months[key]) months[key] = { mes: key, entradas: 0, saidas: 0, saldo: 0 };
      months[key].entradas += Number(d.entradas);
      months[key].saidas += Number(d.saidas);
      months[key].saldo += Number(d.saldo);
    });
    return Object.values(months).sort((a, b) => a.mes.localeCompare(b.mes)).slice(-12);
  }, [fluxoDiario]);

  const chartDiario = useMemo(() =>
    [...fluxoDiario].sort((a, b) => a.dia.localeCompare(b.dia)).slice(-30).map(d => ({
      dia: formatDate(d.dia),
      Entradas: Number(d.entradas),
      Saídas: Number(d.saidas),
      Saldo: Number(d.saldo),
    })),
    [fluxoDiario]
  );

  const handleAbrir = async () => {
    if (!depositoId) { toast.error('Selecione um depósito'); return; }
    const val = parseFloat(valorAbertura) || 0;
    await abrirCaixa.mutateAsync({ depositoId, valorAbertura: val });
    setShowAbrir(false);
    setValorAbertura('');
    setDepositoId('');
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
    await sangria.mutateAsync({ caixaId: caixaAberto.id, valor: val, descricao: descricaoMov || 'Sangria' });
    setShowSangria(false);
    setValorMov('');
    setDescricaoMov('');
  };

  const handleSuprimento = async () => {
    if (!caixaAberto) return;
    const val = parseFloat(valorMov);
    if (isNaN(val) || val <= 0) { toast.error('Valor inválido'); return; }
    await suprimento.mutateAsync({ caixaId: caixaAberto.id, valor: val, descricao: descricaoMov || 'Suprimento' });
    setShowSuprimento(false);
    setValorMov('');
    setDescricaoMov('');
  };

  const diferenca = caixaAberto ? saldoAtual - (caixaAberto.valor_abertura || 0) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
            <Landmark className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Caixa</h1>
            <p className="text-sm text-muted-foreground">Controle de caixa por terminal (depósito)</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Terminal/Deposit selector */}
          <Select value={selectedDepositoId} onValueChange={setSelectedDepositoId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecione o terminal" />
            </SelectTrigger>
            <SelectContent>
              {depositos.map(d => {
                const isOpen = caixasAbertos.some(c => c.deposito_id === d.id);
                return (
                  <SelectItem key={d.id} value={d.id}>
                    <span className="flex items-center gap-2">
                      {d.nome}
                      {isOpen && <span className="w-2 h-2 rounded-full bg-success inline-block" />}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {!caixaAberto ? (
            <Button onClick={() => { setDepositoId(selectedDepositoId); setShowAbrir(true); }} className="gradient-primary text-primary-foreground gap-2">
              <DoorOpen className="w-4 h-4" /> Abrir Caixa
            </Button>
          ) : (
            <>
              <Badge className="bg-success/10 text-success border-success/20 px-3 py-1.5 font-mono">
                <Clock className="w-3 h-3 mr-1.5" />
                Aberto desde {formatTime(caixaAberto.aberto_em)}
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
        </div>
      </div>

      {/* Summary Cards */}
      {caixaAberto && (
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
      )}

      {/* Tabs: Current register / Flow / History */}
      <Tabs defaultValue={caixaAberto ? 'atual' : 'fluxo'} className="space-y-4">
        <TabsList>
          {caixaAberto && <TabsTrigger value="atual">Caixa Atual</TabsTrigger>}
          <TabsTrigger value="fluxo">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        {/* Current register movements */}
        {caixaAberto && (
          <TabsContent value="atual">
            <Card className="bg-card shadow-card">
              <CardHeader><CardTitle className="text-base">Movimentações do caixa</CardTitle></CardHeader>
              <CardContent>
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
          </TabsContent>
        )}

        {/* Cash flow charts */}
        <TabsContent value="fluxo" className="space-y-4">
          <Tabs defaultValue="diario">
            <TabsList>
              <TabsTrigger value="diario" className="gap-1.5"><Calendar className="w-3.5 h-3.5" />Diário</TabsTrigger>
              <TabsTrigger value="semanal" className="gap-1.5">Semanal</TabsTrigger>
              <TabsTrigger value="mensal" className="gap-1.5">Mensal</TabsTrigger>
            </TabsList>

            <TabsContent value="diario">
              <Card className="bg-card shadow-card">
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Fluxo Diário (30 dias)</CardTitle></CardHeader>
                <CardContent>
                  {chartDiario.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-12">Sem dados de fluxo de caixa.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={chartDiario}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                        <RechartsTooltip formatter={(v: number) => formatCurrency(v)} />
                        <Legend />
                        <Bar dataKey="Entradas" fill="hsl(142 76% 36%)" radius={[4,4,0,0]} />
                        <Bar dataKey="Saídas" fill="hsl(0 84% 60%)" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="semanal">
              <Card className="bg-card shadow-card">
                <CardHeader><CardTitle className="text-base">Fluxo Semanal</CardTitle></CardHeader>
                <CardContent>
                  {fluxoSemanal.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-12">Sem dados.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={fluxoSemanal}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="semana" tick={{ fontSize: 11 }} tickFormatter={v => formatDate(v)} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                        <RechartsTooltip formatter={(v: number) => formatCurrency(v)} />
                        <Legend />
                        <Line type="monotone" dataKey="entradas" name="Entradas" stroke="hsl(142 76% 36%)" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="saidas" name="Saídas" stroke="hsl(0 84% 60%)" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="saldo" name="Saldo" stroke="hsl(217 91% 50%)" strokeWidth={2.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="mensal">
              <Card className="bg-card shadow-card">
                <CardHeader><CardTitle className="text-base">Fluxo Mensal</CardTitle></CardHeader>
                <CardContent>
                  {fluxoMensal.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-12">Sem dados.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={fluxoMensal}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                        <RechartsTooltip formatter={(v: number) => formatCurrency(v)} />
                        <Legend />
                        <Bar dataKey="entradas" name="Entradas" fill="hsl(142 76% 36%)" radius={[4,4,0,0]} />
                        <Bar dataKey="saidas" name="Saídas" fill="hsl(0 84% 60%)" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* History */}
        <TabsContent value="historico">
          <Card className="bg-card shadow-card">
            <CardHeader><CardTitle className="text-base">Histórico de Caixas</CardTitle></CardHeader>
            <CardContent>
              {historico.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum caixa registrado.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Abertura</TableHead>
                      <TableHead>Fechamento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Valor Abertura</TableHead>
                      <TableHead className="text-right">Valor Fechamento</TableHead>
                      <TableHead className="text-right">Diferença</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historico.map(c => {
                      const diff = c.valor_fechamento != null ? c.valor_fechamento - c.valor_abertura : null;
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono text-sm">
                            {formatDate(c.aberto_em)} {formatTime(c.aberto_em)}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {c.fechado_em ? `${formatDate(c.fechado_em)} ${formatTime(c.fechado_em)}` : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={c.status === 'aberto' ? 'default' : 'secondary'}
                              className={c.status === 'aberto' ? 'bg-success/10 text-success' : ''}>
                              {c.status === 'aberto' ? 'Aberto' : 'Fechado'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">{formatCurrency(c.valor_abertura)}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {c.valor_fechamento != null ? formatCurrency(c.valor_fechamento) : '—'}
                          </TableCell>
                          <TableCell className={cn('text-right font-mono tabular-nums font-medium', diff != null && diff >= 0 ? 'text-success' : 'text-destructive')}>
                            {diff != null ? `${diff >= 0 ? '+' : ''}${formatCurrency(diff)}` : '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: Abrir Caixa */}
      <Dialog open={showAbrir} onOpenChange={setShowAbrir}>
        <DialogContent className="bg-card max-w-sm">
          <DialogHeader><DialogTitle>Abrir Caixa</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Depósito</label>
              <Select value={depositoId} onValueChange={setDepositoId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {depositos.map(d => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Valor de abertura (R$)</label>
              <Input type="number" min="0" step="0.01" value={valorAbertura} onChange={e => setValorAbertura(e.target.value)} placeholder="0,00" />
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

      {/* Dialog: Fechar Caixa */}
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
              <Input type="number" min="0" step="0.01" value={valorFechamento} onChange={e => setValorFechamento(e.target.value)} placeholder="0,00" />
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

      {/* Dialog: Sangria */}
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
            <Button variant="destructive" onClick={handleSangria} disabled={sangria.isPending}>Confirmar Sangria</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Suprimento */}
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
            <Button onClick={handleSuprimento} disabled={suprimento.isPending} className="gradient-primary text-primary-foreground">Confirmar Suprimento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
