import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMovimentacoesDiarias } from '@/hooks/useDashboardData';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function FaturamentoChart() {
  const { data, isLoading } = useMovimentacoesDiarias(14);

  const chartData = (data || [])
    .slice()
    .sort((a, b) => a.dia.localeCompare(b.dia))
    .map((d) => ({
      dia: format(parseISO(d.dia), 'dd/MM', { locale: ptBR }),
      entradas: d.total_entradas,
      saidas: Math.abs(d.total_saidas),
      movimentacoes: d.total_movimentacoes,
    }));

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Movimentações — Últimos 14 dias</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[220px]">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
            Sem dados no período
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(217 91% 50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(217 91% 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} stroke="hsl(215 16% 47%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(215 16% 47%)" />
              <Tooltip
                contentStyle={{
                  background: 'hsl(0 0% 100%)',
                  border: '1px solid hsl(214 32% 91%)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="entradas"
                stroke="hsl(142 76% 36%)"
                fillOpacity={1}
                fill="url(#colorEntradas)"
                strokeWidth={2}
                name="Entradas"
              />
              <Area
                type="monotone"
                dataKey="saidas"
                stroke="hsl(217 91% 50%)"
                fillOpacity={1}
                fill="url(#colorSaidas)"
                strokeWidth={2}
                name="Saídas"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
