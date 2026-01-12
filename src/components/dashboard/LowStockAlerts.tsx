import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface LowStockItem {
  id: string;
  nome: string;
  qtdAtual: number;
  qtdMinima: number;
  unidade: string;
}

const mockLowStock: LowStockItem[] = [
  { id: '1', nome: 'Caixa de Papelão 30x20', qtdAtual: 15, qtdMinima: 50, unidade: 'UN' },
  { id: '2', nome: 'Etiqueta Térmica 100x50', qtdAtual: 200, qtdMinima: 500, unidade: 'UN' },
  { id: '3', nome: 'Fita Adesiva Marrom', qtdAtual: 8, qtdMinima: 30, unidade: 'UN' },
  { id: '4', nome: 'Papel Kraft 60g', qtdAtual: 5, qtdMinima: 20, unidade: 'KG' },
];

export function LowStockAlerts() {
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
              {mockLowStock.length} produtos abaixo do mínimo
            </p>
          </div>
        </div>
      </div>
      <div className="divide-y divide-border">
        {mockLowStock.map((item, index) => {
          const percentage = Math.round((item.qtdAtual / item.qtdMinima) * 100);
          const isCritical = percentage < 25;

          return (
            <div
              key={item.id}
              className="p-4 hover:bg-muted/50 transition-colors animate-slide-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-card-foreground truncate flex-1 mr-4">
                  {item.nome}
                </p>
                <span className={cn(
                  "text-sm font-semibold tabular-nums shrink-0",
                  isCritical ? "text-destructive" : "text-warning"
                )}>
                  {item.qtdAtual} / {item.qtdMinima} {item.unidade}
                </span>
              </div>
              <Progress
                value={percentage}
                className={cn(
                  "h-2",
                  isCritical ? "[&>div]:bg-destructive" : "[&>div]:bg-warning"
                )}
              />
            </div>
          );
        })}
      </div>
      <div className="p-4 border-t border-border">
        <button className="w-full text-sm text-warning hover:text-warning/80 font-medium transition-colors">
          Ver todos os alertas →
        </button>
      </div>
    </div>
  );
}
