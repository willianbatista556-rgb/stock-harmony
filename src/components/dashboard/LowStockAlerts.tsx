import { AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { useAlertasEstoqueBaixo } from '@/hooks/useDashboardData';
import { Link } from 'react-router-dom';

export function LowStockAlerts() {
  const { data: alertas, isLoading } = useAlertasEstoqueBaixo();

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl shadow-card border border-border/50 p-6 flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const items = alertas || [];

  return (
    <div className="bg-card rounded-xl shadow-card border border-border/50">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-warning" />
          </div>
          <div>
            <h3 className="text-lg font-display font-semibold text-card-foreground">
              Alertas de Estoque Baixo
            </h3>
            <p className="text-sm text-muted-foreground">
              {items.length} {items.length === 1 ? 'produto abaixo' : 'produtos abaixo'} do mínimo
            </p>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-muted-foreground">Nenhum alerta de estoque baixo 🎉</p>
        </div>
      ) : (
        <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
          {items.slice(0, 6).map((item, index) => {
            const estoqueMin = item.estoque_min || 1;
            const percentage = Math.round((item.estoque_atual / estoqueMin) * 100);
            const isCritical = item.status_estoque === 'critico';

            return (
              <div
                key={item.produto_id}
                className="p-4 hover:bg-muted/50 transition-colors animate-slide-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-card-foreground truncate flex-1 mr-4">
                    {item.produto_nome}
                  </p>
                  <span className={cn(
                    "text-sm font-semibold tabular-nums shrink-0",
                    isCritical ? "text-destructive" : "text-warning"
                  )}>
                    {item.estoque_atual} / {estoqueMin}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress
                    value={Math.min(percentage, 100)}
                    className={cn(
                      "h-2 flex-1",
                      isCritical ? "[&>div]:bg-destructive" : "[&>div]:bg-warning"
                    )}
                  />
                  {item.dias_para_ruptura !== null && (
                    <span className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full shrink-0",
                      item.dias_para_ruptura <= 7 
                        ? "bg-destructive/10 text-destructive" 
                        : "bg-warning/10 text-warning"
                    )}>
                      {item.dias_para_ruptura}d
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="p-4 border-t border-border">
        <Link 
          to="/produtos" 
          className="w-full text-sm text-warning hover:text-warning/80 font-medium transition-colors block text-center"
        >
          Ver todos os alertas →
        </Link>
      </div>
    </div>
  );
}
