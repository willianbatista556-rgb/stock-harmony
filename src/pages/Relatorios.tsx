import { useState, useMemo } from 'react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart3, Package, TrendingUp, DollarSign, Download, Filter,
  ArrowUpDown, AlertTriangle, CheckCircle2, XCircle, Users,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/formatters';
import {
  useRelatorioVendas,
  useRelatorioPagamentos,
  useRelatorioTopProdutos,
  useRelatorioEstoque,
  useCurvaABC,
} from '@/hooks/useRelatorios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';

const COLORS = [
  'hsl(217, 91%, 50%)',
  'hsl(162, 75%, 46%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 84%, 60%)',
  'hsl(280, 65%, 55%)',
  'hsl(190, 80%, 45%)',
];

const CLASSE_COLORS: Record<string, string> = {
  A: 'hsl(142, 76%, 36%)',
  B: 'hsl(38, 92%, 50%)',
  C: 'hsl(0, 84%, 60%)',
};

type PeriodoPreset = '7d' | '30d' | 'mes' | 'custom';

function usePeriodo() {
  const [preset, setPreset] = useState<PeriodoPreset>('30d');
  const [customInicio, setCustomInicio] = useState<Date | undefined>();
  const [customFim, setCustomFim] = useState<Date | undefined>();

  const { inicio, fim } = useMemo(() => {
    const now = new Date();
    switch (preset) {
      case '7d':
        return { inicio: subDays(now, 7), fim: now };
      case '30d':
        return { inicio: subDays(now, 30), fim: now };
      case 'mes':
        return { inicio: startOfMonth(now), fim: endOfMonth(now) };
      case 'custom':
        return {
          inicio: customInicio || subDays(now, 30),
          fim: customFim || now,
        };
    }
  }, [preset, customInicio, customFim]);

  return {
    preset, setPreset,
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
    inicioDate: inicio,
    fimDate: fim,
    customInicio, setCustomInicio,
    customFim, setCustomFim,
  };
}

function PeriodoSelector({ periodo }: { periodo: ReturnType<typeof usePeriodo> }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={periodo.preset} onValueChange={(v) => periodo.setPreset(v as PeriodoPreset)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7d">Últimos 7 dias</SelectItem>
          <SelectItem value="30d">Últimos 30 dias</SelectItem>
          <SelectItem value="mes">Mês atual</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>
      {periodo.preset === 'custom' && (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="text-sm">
                {periodo.customInicio ? format(periodo.customInicio, 'dd/MM/yy') : 'Início'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={periodo.customInicio}
                onSelect={periodo.setCustomInicio}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground">até</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="text-sm">
                {periodo.customFim ? format(periodo.customFim, 'dd/MM/yy') : 'Fim'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={periodo.customFim}
                onSelect={periodo.setCustomFim}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}

function exportCSV(rows: Record<string, any>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(';'),
    ...rows.map(r => headers.map(h => String(r[h] ?? '')).join(';')),
  ].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Tab: Vendas ─────────────────────────────────────────────
function TabVendas() {
  const periodo = usePeriodo();
  const { data: vendas = [], isLoading } = useRelatorioVendas(periodo.inicio, periodo.fim);
  const { data: pagamentos = [] } = useRelatorioPagamentos(periodo.inicio, periodo.fim);
  const { data: topProdutos = [] } = useRelatorioTopProdutos(periodo.inicio, periodo.fim);

  const totais = useMemo(() => {
    const total = vendas.reduce((s, v) => s + Number(v.total ?? 0), 0);
    const desconto = vendas.reduce((s, v) => s + Number(v.desconto ?? 0), 0);
    const ticket = vendas.length > 0 ? total / vendas.length : 0;
    return { total, desconto, ticket, count: vendas.length };
  }, [vendas]);

  // Agrupar vendas por dia para gráfico
  const vendasPorDia = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of vendas) {
      const dia = format(new Date(v.data), 'dd/MM');
      map.set(dia, (map.get(dia) ?? 0) + Number(v.total ?? 0));
    }
    return Array.from(map.entries())
      .map(([dia, total]) => ({ dia, total }))
      .reverse();
  }, [vendas]);

  const formaLabels: Record<string, string> = {
    dinheiro: 'Dinheiro', credito: 'Crédito', debito: 'Débito', pix: 'PIX',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <PeriodoSelector periodo={periodo} />
        <Button
          variant="outline" size="sm"
          onClick={() => exportCSV(vendas.map(v => ({
            Data: formatDate(v.data), Subtotal: v.subtotal, Desconto: v.desconto, Total: v.total,
          })), 'relatorio-vendas')}
        >
          <Download className="w-4 h-4 mr-2" /> Exportar CSV
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Faturamento</p>
                <p className="text-2xl font-bold">{formatCurrency(totais.total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <BarChart3 className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vendas</p>
                <p className="text-2xl font-bold">{totais.count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                <p className="text-2xl font-bold">{formatCurrency(totais.ticket)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <ArrowUpDown className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Descontos</p>
                <p className="text-2xl font-bold">{formatCurrency(totais.desconto)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Faturamento por dia</CardTitle>
          </CardHeader>
          <CardContent>
            {vendasPorDia.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={vendasPorDia}>
                  <defs>
                    <linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(217, 91%, 50%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(217, 91%, 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="dia" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                  <RechartsTooltip
                    formatter={(v: number) => [formatCurrency(v), 'Total']}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Area type="monotone" dataKey="total" stroke="hsl(217, 91%, 50%)" fill="url(#colorFat)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-12">Sem dados no período</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Por forma de pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            {pagamentos.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pagamentos.map(p => ({ ...p, name: formaLabels[p.forma] || p.forma }))}
                      dataKey="total" nameKey="name"
                      cx="50%" cy="50%"
                      innerRadius={50} outerRadius={80}
                      paddingAngle={3}
                    >
                      {pagamentos.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-4">
                  {pagamentos.map((p, i) => (
                    <div key={p.forma} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span>{formaLabels[p.forma] || p.forma}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(p.total)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-center py-12">Sem dados</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top produtos */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Top produtos vendidos</CardTitle>
          <Button variant="outline" size="sm" onClick={() => exportCSV(
            topProdutos.map(p => ({ Produto: p.nome, Qtd: p.qtd_total, Receita: p.receita_total.toFixed(2) })),
            'top-produtos'
          )}>
            <Download className="w-4 h-4 mr-2" /> CSV
          </Button>
        </CardHeader>
        <CardContent>
          {topProdutos.length > 0 ? (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Qtd vendida</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProdutos.map((p, i) => (
                    <TableRow key={p.produto_id}>
                      <TableCell className="font-medium text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{p.nome}</TableCell>
                      <TableCell className="text-right">{p.qtd_total}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(p.receita_total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">Sem vendas no período</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tab: Estoque ────────────────────────────────────────────
function TabEstoque() {
  const { data: estoque = [], isLoading } = useRelatorioEstoque();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    return estoque.filter(e => {
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return e.nome.toLowerCase().includes(q)
          || (e.sku && e.sku.toLowerCase().includes(q))
          || (e.ean && e.ean.toLowerCase().includes(q));
      }
      return true;
    });
  }, [estoque, search, statusFilter]);

  const totais = useMemo(() => ({
    itens: estoque.reduce((s, e) => s + e.saldo, 0),
    valor: estoque.reduce((s, e) => s + e.valor_estoque, 0),
    zerados: estoque.filter(e => e.status === 'zerado').length,
    baixos: estoque.filter(e => e.status === 'baixo').length,
  }), [estoque]);

  const statusIcon = {
    ok: <CheckCircle2 className="w-4 h-4 text-success" />,
    baixo: <AlertTriangle className="w-4 h-4 text-warning" />,
    zerado: <XCircle className="w-4 h-4 text-destructive" />,
    negativo: <XCircle className="w-4 h-4 text-destructive" />,
  };

  const statusBadge = {
    ok: <Badge variant="outline" className="text-success border-success/30">OK</Badge>,
    baixo: <Badge variant="outline" className="text-warning border-warning/30">Baixo</Badge>,
    zerado: <Badge variant="outline" className="text-destructive border-destructive/30">Zerado</Badge>,
    negativo: <Badge variant="destructive">Negativo</Badge>,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Input
            placeholder="Buscar produto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-64"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ok">OK</SelectItem>
              <SelectItem value="baixo">Estoque baixo</SelectItem>
              <SelectItem value="zerado">Zerado</SelectItem>
              <SelectItem value="negativo">Negativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={() => exportCSV(
          filtered.map(e => ({
            Produto: e.nome, SKU: e.sku || '', Local: e.local_nome,
            Saldo: e.saldo, Custo: e.custo_medio.toFixed(2),
            Valor_Estoque: e.valor_estoque.toFixed(2), Status: e.status,
          })),
          'relatorio-estoque'
        )}>
          <Download className="w-4 h-4 mr-2" /> Exportar CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total de itens</p>
            <p className="text-2xl font-bold">{totais.itens.toLocaleString('pt-BR')}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Valor em estoque</p>
            <p className="text-2xl font-bold">{formatCurrency(totais.valor)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <p className="text-sm text-muted-foreground">Estoque baixo</p>
            </div>
            <p className="text-2xl font-bold">{totais.baixos}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-destructive" />
              <p className="text-sm text-muted-foreground">Zerados</p>
            </div>
            <p className="text-2xl font-bold">{totais.zerados}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="overflow-auto max-h-[500px]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-right">Custo unit.</TableHead>
                  <TableHead className="text-right">Valor estoque</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e, i) => (
                  <TableRow key={`${e.produto_id}-${e.local_nome}-${i}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{e.nome}</p>
                        {e.sku && <p className="text-xs text-muted-foreground">SKU: {e.sku}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{e.local_nome}</TableCell>
                    <TableCell className="text-right font-medium">{e.saldo}</TableCell>
                    <TableCell className="text-right">{formatCurrency(e.custo_medio)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(e.valor_estoque)}</TableCell>
                    <TableCell className="text-center">{statusBadge[e.status]}</TableCell>
                  </TableRow>
                ))}
                {!filtered.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                      {isLoading ? 'Carregando...' : 'Nenhum item encontrado'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tab: Curva ABC ──────────────────────────────────────────
function TabCurvaABC() {
  const periodo = usePeriodo();
  const { data: curva = [], isLoading } = useCurvaABC(periodo.inicio, periodo.fim);

  const resumo = useMemo(() => ({
    A: curva.filter(c => c.classe === 'A'),
    B: curva.filter(c => c.classe === 'B'),
    C: curva.filter(c => c.classe === 'C'),
  }), [curva]);

  const pieData = [
    { name: `A (${resumo.A.length})`, value: resumo.A.reduce((s, i) => s + i.receita, 0) },
    { name: `B (${resumo.B.length})`, value: resumo.B.reduce((s, i) => s + i.receita, 0) },
    { name: `C (${resumo.C.length})`, value: resumo.C.reduce((s, i) => s + i.receita, 0) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <PeriodoSelector periodo={periodo} />
        <Button variant="outline" size="sm" onClick={() => exportCSV(
          curva.map(c => ({
            Classe: c.classe, Produto: c.nome,
            Receita: c.receita.toFixed(2), Percentual: c.percentual.toFixed(2),
            Acumulado: c.percentual_acumulado.toFixed(2),
          })),
          'curva-abc'
        )}>
          <Download className="w-4 h-4 mr-2" /> CSV
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {(['A', 'B', 'C'] as const).map(classe => (
          <Card key={classe} className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: CLASSE_COLORS[classe] }}
                >
                  {classe}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {classe === 'A' ? '80% da receita' : classe === 'B' ? '15% da receita' : '5% da receita'}
                  </p>
                  <p className="font-bold">{resumo[classe].length} produtos</p>
                </div>
              </div>
              <p className="text-lg font-bold">
                {formatCurrency(resumo[classe].reduce((s, i) => s + i.receita, 0))}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Pie */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Distribuição</CardTitle>
          </CardHeader>
          <CardContent>
            {curva.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={100} label
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={Object.values(CLASSE_COLORS)[i]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-12">Sem dados</p>
            )}
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Detalhamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-[400px]">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-16">Classe</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-right">Acum.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {curva.map((c) => (
                    <TableRow key={c.produto_id}>
                      <TableCell>
                        <Badge
                          className="text-white font-bold"
                          style={{ backgroundColor: CLASSE_COLORS[c.classe] }}
                        >
                          {c.classe}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell className="text-right">{formatCurrency(c.receita)}</TableCell>
                      <TableCell className="text-right">{c.percentual.toFixed(1)}%</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Progress value={c.percentual_acumulado} className="w-16 h-2" />
                          <span className="text-xs w-12 text-right">{c.percentual_acumulado.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!curva.length && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                        {isLoading ? 'Carregando...' : 'Sem vendas no período'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Page principal ──────────────────────────────────────────
export default function Relatorios() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Relatórios & BI</h1>
        <p className="text-muted-foreground">
          Análise completa de vendas, estoque e performance dos produtos.
        </p>
      </header>

      <Tabs defaultValue="vendas" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="vendas" className="gap-2">
            <DollarSign className="w-4 h-4" /> Vendas
          </TabsTrigger>
          <TabsTrigger value="estoque" className="gap-2">
            <Package className="w-4 h-4" /> Estoque
          </TabsTrigger>
          <TabsTrigger value="abc" className="gap-2">
            <TrendingUp className="w-4 h-4" /> Curva ABC
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vendas">
          <TabVendas />
        </TabsContent>
        <TabsContent value="estoque">
          <TabEstoque />
        </TabsContent>
        <TabsContent value="abc">
          <TabCurvaABC />
        </TabsContent>
      </Tabs>
    </div>
  );
}
