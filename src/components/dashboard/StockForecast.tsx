import { TrendingDown, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePrevisaoRuptura } from '@/hooks/useDashboardData';

const statusConfig = {
  critico: { 
    label: 'Crítico', 
    color: 'text-destructive', 
    bg: 'bg-destructive/10',
    border: 'border-destructive/20'
  },
  baixo: { 
    label: 'Baixo', 
    color: 'text-warning', 
    bg: 'bg-warning/10',
    border: 'border-warning/20'
  },
  alerta: { 
    label: 'Alerta', 
    color: 'text-amber-600', 
    bg: 'bg-amber-100',
    border: 'border-amber-200'
  },
  atencao: { 
    label: 'Atenção', 
    color: 'text-yellow-600', 
    bg: 'bg-yellow-100',
    border: 'border-yellow-200'
  },
  normal: { 
    label: 'Normal', 
    color: 'text-success', 
    bg: 'bg-success/10',
    border: 'border-success/20'
  },
};

export function StockForecast() {
  const { data: previsoes, isLoading } = usePrevisaoRuptura();

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl shadow-card border border-border/50 p-6 flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const items = previsoes || [];

  if (items.length === 0) {
    return (
      <div className="bg-card rounded-xl shadow-card border border-border/50 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
          <TrendingDown className="w-6 h-6 text-success" />
        </div>
        <p className="text-muted-foreground font-medium">Estoque saudável! 🎉</p>
        <p className="text-sm text-muted-foreground mt-1">
          Nenhum produto com previsão de ruptura nos próximos dias
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-card border border-border/50">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-display font-semibold text-card-foreground">
              Previsão de Ruptura
            </h3>
            <p className="text-sm text-muted-foreground">
              Produtos que precisam de atenção baseado no consumo
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Produto</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Estoque</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Consumo/dia</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Dias restantes</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.slice(0, 10).map((item, index) => {
              const config = statusConfig[item.status_estoque] || statusConfig.normal;

              return (
                <tr 
                  key={item.produto_id}
                  className="hover:bg-muted/50 transition-colors animate-slide-in-up"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-card-foreground">{item.produto_nome}</p>
                      {item.sku && (
                        <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">
                    <span className={cn(
                      "font-medium",
                      item.estoque_atual === 0 ? "text-destructive" : "text-card-foreground"
                    )}>
                      {item.estoque_atual}
                    </span>
                    {item.estoque_min && (
                      <span className="text-muted-foreground text-sm"> / {item.estoque_min}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-muted-foreground">
                    {item.consumo_medio_diario?.toFixed(1) || '—'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {item.dias_para_ruptura !== null ? (
                      <span className={cn(
                        "font-semibold tabular-nums",
                        item.dias_para_ruptura <= 7 ? "text-destructive" :
                        item.dias_para_ruptura <= 15 ? "text-warning" : "text-card-foreground"
                      )}>
                        {item.dias_para_ruptura} dias
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border",
                      config.bg,
                      config.color,
                      config.border
                    )}>
                      {item.status_estoque === 'critico' && (
                        <AlertTriangle className="w-3 h-3" />
                      )}
                      {config.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {items.length > 10 && (
        <div className="p-4 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            + {items.length - 10} outros produtos precisam de atenção
          </p>
        </div>
      )}
    </div>
  );
}
