import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react';
import { useDRE } from '@/hooks/useFinanceiro';
import { formatCurrency } from '@/lib/formatters';

function DRELine({ label, value, bold, indent, color }: { label: string; value: number; bold?: boolean; indent?: boolean; color?: string }) {
  return (
    <div className={`flex items-center justify-between py-2.5 px-4 ${bold ? 'bg-secondary/50 font-semibold' : ''} ${indent ? 'pl-8' : ''}`}>
      <span className={`text-sm ${bold ? 'text-foreground font-display' : 'text-muted-foreground'}`}>{label}</span>
      <span className={`text-sm font-medium ${color || 'text-foreground'}`}>{formatCurrency(value)}</span>
    </div>
  );
}

export default function DRE() {
  const [mesOffset, setMesOffset] = useState(0);
  const { data: dre, isLoading } = useDRE(mesOffset);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">DRE Simplificado</h1>
          <p className="text-sm text-muted-foreground">Demonstração do Resultado do Exercício</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setMesOffset(o => o - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium text-foreground min-w-[140px] text-center capitalize">
            {dre?.periodo || '…'}
          </span>
          <Button variant="outline" size="icon" onClick={() => setMesOffset(o => o + 1)} disabled={mesOffset >= 0}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {isLoading || !dre ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">Carregando…</div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="shadow-card">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Receita</p>
                  <p className="text-xl font-display font-bold text-foreground">{formatCurrency(dre.receita)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Despesas</p>
                  <p className="text-xl font-display font-bold text-foreground">{formatCurrency(dre.despesasTotal)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Lucro</p>
                  <p className={`text-xl font-display font-bold ${dre.lucro >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(dre.lucro)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Percent className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Margem</p>
                  <p className={`text-xl font-display font-bold ${dre.margemLiquida >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {dre.margemLiquida.toFixed(1)}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* DRE Table */}
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">Demonstração — {dre.periodo}</CardTitle></CardHeader>
            <CardContent className="p-0 divide-y divide-border">
              <DRELine label="(+) Receita Bruta (Vendas)" value={dre.receita} bold />
              <DRELine label="(-) Descontos concedidos" value={-dre.descontos} indent color="text-destructive" />
              <DRELine label="(=) Receita Líquida" value={dre.receitaLiquida} bold />

              <div className="py-1" />
              <DRELine label="(-) Despesas Operacionais" value={-dre.despesasTotal} bold color="text-destructive" />
              {Object.entries(dre.despesasPorCategoria).map(([cat, val]) => (
                <DRELine key={cat} label={`   ${cat}`} value={-val} indent color="text-muted-foreground" />
              ))}

              <div className="py-1" />
              <DRELine label="(=) RESULTADO LÍQUIDO" value={dre.lucro} bold color={dre.lucro >= 0 ? 'text-success' : 'text-destructive'} />

              <div className="py-1" />
              <div className="flex items-center justify-between py-2.5 px-4 bg-muted/30">
                <span className="text-sm text-muted-foreground">Margem Líquida</span>
                <span className={`text-sm font-bold ${dre.margemLiquida >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {dre.margemLiquida.toFixed(1)}%
                </span>
              </div>

              <div className="py-1" />
              <div className="px-4 py-3 space-y-1">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Recebíveis do período</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total a receber</span>
                  <span className="text-foreground">{formatCurrency(dre.recebiveisTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Já recebido</span>
                  <span className="text-success">{formatCurrency(dre.recebiveisRecebidos)}</span>
                </div>
              </div>
              <div className="px-4 py-3 space-y-1">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Despesas do período</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total de despesas</span>
                  <span className="text-foreground">{formatCurrency(dre.despesasTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Já pagas</span>
                  <span className="text-success">{formatCurrency(dre.despesasPagas)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
