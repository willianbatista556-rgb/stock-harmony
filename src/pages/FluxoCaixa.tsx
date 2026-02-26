import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useFluxoCaixa } from '@/hooks/useFinanceiro';
import { formatCurrency } from '@/lib/formatters';

export default function FluxoCaixa() {
  const [periodo, setPeriodo] = useState(30);
  const { data: fluxo = [], isLoading } = useFluxoCaixa(periodo);

  const totalEntradas = fluxo.reduce((s, d) => s + d.entradas, 0);
  const totalSaidas = fluxo.reduce((s, d) => s + d.saidas, 0);
  const saldoTotal = totalEntradas - totalSaidas;

  // Acumulado
  let acumulado = 0;
  const fluxoAcumulado = fluxo.map(d => {
    acumulado += d.saldo;
    return { ...d, acumulado, diaFmt: new Date(d.dia + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Fluxo de Caixa</h1>
          <p className="text-sm text-muted-foreground">Visão consolidada de entradas e saídas</p>
        </div>
        <div className="flex gap-2">
          {[{ v: 15, l: '15 dias' }, { v: 30, l: '30 dias' }, { v: 60, l: '60 dias' }, { v: 90, l: '90 dias' }].map(p => (
            <Button key={p.v} variant={periodo === p.v ? 'default' : 'outline'} size="sm" onClick={() => setPeriodo(p.v)}>
              {p.l}
            </Button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Entradas</p>
              <p className="text-xl font-display font-bold text-success">{formatCurrency(totalEntradas)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saídas</p>
              <p className="text-xl font-display font-bold text-destructive">{formatCurrency(totalSaidas)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saldo</p>
              <p className={`text-xl font-display font-bold ${saldoTotal >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(saldoTotal)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart: Saldo Acumulado */}
      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">Saldo Acumulado</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">Carregando…</div>
          ) : fluxoAcumulado.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">Sem dados no período</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={fluxoAcumulado}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="diaFmt" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={l => `Dia: ${l}`} />
                <Area type="monotone" dataKey="acumulado" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Chart: Entradas vs Saídas */}
      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">Entradas vs Saídas (diário)</CardTitle></CardHeader>
        <CardContent>
          {fluxoAcumulado.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={fluxoAcumulado}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="diaFmt" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="entradas" fill="hsl(var(--success))" radius={[2, 2, 0, 0]} />
                <Bar dataKey="saidas" fill="hsl(var(--destructive))" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground">Sem dados</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
