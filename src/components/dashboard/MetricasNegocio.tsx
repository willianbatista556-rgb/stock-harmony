import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Store, Layers, BarChart3, TrendingUp } from 'lucide-react';
import { useFaturamentoFilial, useGiroEstoque, useCurvaABC, useMargemProduto } from '@/hooks/useMetricas';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const COLORS_ABC = { A: 'hsl(142 76% 36%)', B: 'hsl(38 92% 50%)', C: 'hsl(0 84% 60%)' };
const GIRO_COLORS: Record<string, string> = {
  alto: 'hsl(142 76% 36%)',
  medio: 'hsl(38 92% 50%)',
  baixo: 'hsl(0 84% 60%)',
  parado: 'hsl(215 16% 47%)',
  ruptura: 'hsl(0 62% 50%)',
};

export function FaturamentoFilialCard() {
  const { data, isLoading } = useFaturamentoFilial();
  const chartData = (data || []).map((d) => ({
    nome: d.deposito_nome.length > 12 ? d.deposito_nome.slice(0, 12) + '…' : d.deposito_nome,
    vendas: d.total_vendas,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-primary" />
          <CardTitle className="text-base font-semibold">Faturamento por Filial</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[180px]"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[180px] text-sm text-muted-foreground">Sem dados</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="nome" tick={{ fontSize: 10 }} stroke="hsl(215 16% 47%)" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(215 16% 47%)" />
              <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'hsl(0 0% 100%)', border: '1px solid hsl(214 32% 91%)', borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="vendas" name="Faturamento" radius={[4, 4, 0, 0]} fill="hsl(217 91% 50%)" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function CurvaABCCard() {
  const { data, isLoading } = useCurvaABC(50);
  const summary = { A: 0, B: 0, C: 0 };
  (data || []).forEach((d) => { summary[d.classe]++; });
  const pieData = Object.entries(summary).map(([k, v]) => ({ name: k, value: v, fill: COLORS_ABC[k as keyof typeof COLORS_ABC] }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <CardTitle className="text-base font-semibold">Curva ABC</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">Últimos 90 dias por receita</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[180px]"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (data || []).length === 0 ? (
          <div className="flex items-center justify-center h-[180px] text-sm text-muted-foreground">Sem dados</div>
        ) : (
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={pieData} dataKey="value" innerRadius={40} outerRadius={65} paddingAngle={2}>
                  {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 flex-1">
              {(['A', 'B', 'C'] as const).map((cls) => (
                <div key={cls} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: COLORS_ABC[cls] }} />
                    <span className="text-sm font-medium">Classe {cls}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">{summary[cls]} produtos</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function GiroEstoqueCard() {
  const { data, isLoading } = useGiroEstoque(10);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <CardTitle className="text-base font-semibold">Giro de Estoque</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">Top 10 — Últimos 30 dias</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[200px]"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (data || []).length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">Sem dados</div>
        ) : (
          <div className="space-y-2">
            {(data || []).slice(0, 8).map((item) => (
              <div key={item.produto_id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.produto_nome}</p>
                  <p className="text-xs text-muted-foreground">{item.saidas_30d} saídas • Estoque: {item.estoque_atual}</p>
                </div>
                <Badge variant="secondary" className="text-xs ml-2" style={{ color: GIRO_COLORS[item.classificacao_giro] }}>
                  {item.indice_giro}x {item.classificacao_giro}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function TopMargemCard() {
  const { data, isLoading } = useMargemProduto(8);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <CardTitle className="text-base font-semibold">Margem por Produto</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">Top 8 por lucro bruto — 30 dias</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[200px]"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (data || []).length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">Sem dados</div>
        ) : (
          <div className="space-y-2">
            {(data || []).map((item) => (
              <div key={item.produto_id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.produto_nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmt(item.custo_medio)} → {fmt(item.preco_venda)} • {item.qtd_vendida_30d} vendidos
                  </p>
                </div>
                <div className="text-right ml-2">
                  <p className="text-sm font-semibold text-success">{item.margem_percentual}%</p>
                  <p className="text-xs text-muted-foreground">{fmt(item.lucro_bruto_30d)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
