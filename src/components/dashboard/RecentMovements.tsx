import { ArrowDownRight, ArrowUpRight, RefreshCcw, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Movement {
  id: string;
  tipo: string;
  origem: string;
  produto: string;
  qtd: number;
  data: string;
}

const mockMovements: Movement[] = [
  { id: '1', tipo: 'entrada', origem: 'compra', produto: 'Caixa de Papelão 40x30', qtd: 500, data: '2024-01-12 14:30' },
  { id: '2', tipo: 'saida', origem: 'venda', produto: 'Fita Adesiva Transparente', qtd: 100, data: '2024-01-12 13:15' },
  { id: '3', tipo: 'ajuste', origem: 'ajuste', produto: 'Etiqueta Adesiva A4', qtd: -20, data: '2024-01-12 11:00' },
  { id: '4', tipo: 'entrada', origem: 'devolucao', produto: 'Saco Plástico 20x30', qtd: 50, data: '2024-01-12 10:45' },
  { id: '5', tipo: 'saida', origem: 'consumo', produto: 'Papel A4 Sulfite', qtd: 10, data: '2024-01-12 09:30' },
];

const tipoConfig = {
  entrada: { icon: ArrowDownRight, color: 'text-success', bg: 'bg-success/10', label: 'Entrada' },
  saida: { icon: ArrowUpRight, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Saída' },
  ajuste: { icon: RefreshCcw, color: 'text-warning', bg: 'bg-warning/10', label: 'Ajuste' },
  transferencia: { icon: ArrowLeftRight, color: 'text-primary', bg: 'bg-primary/10', label: 'Transferência' },
};

export function RecentMovements() {
  return (
    <div className="bg-card rounded-xl shadow-card border border-border/50">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-display font-semibold text-card-foreground">
          Movimentações Recentes
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Últimas entradas e saídas de estoque
        </p>
      </div>
      <div className="divide-y divide-border">
        {mockMovements.map((mov, index) => {
          const config = tipoConfig[mov.tipo as keyof typeof tipoConfig];
          const Icon = config.icon;

          return (
            <div
              key={mov.id}
              className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors animate-slide-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", config.bg)}>
                <Icon className={cn("w-5 h-5", config.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-card-foreground truncate">{mov.produto}</p>
                <p className="text-sm text-muted-foreground">
                  {config.label} • {mov.origem}
                </p>
              </div>
              <div className="text-right">
                <p className={cn(
                  "font-semibold tabular-nums",
                  mov.qtd > 0 ? "text-success" : "text-destructive"
                )}>
                  {mov.qtd > 0 ? '+' : ''}{mov.qtd}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(mov.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="p-4 border-t border-border">
        <button className="w-full text-sm text-primary hover:text-primary/80 font-medium transition-colors">
          Ver todas as movimentações →
        </button>
      </div>
    </div>
  );
}
