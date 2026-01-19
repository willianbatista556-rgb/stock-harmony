import { Warehouse, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEstoquePorDeposito } from '@/hooks/useDashboardData';

export function StockByDeposit() {
  const { data: depositos, isLoading } = useEstoquePorDeposito();

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl shadow-card border border-border/50 p-6 flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const items = depositos || [];
  const totalValue = items.reduce((acc, d) => acc + Number(d.valor_total), 0);

  if (items.length === 0) {
    return (
      <div className="bg-card rounded-xl shadow-card border border-border/50 p-8 text-center">
        <Warehouse className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">Nenhum depósito cadastrado</p>
        <p className="text-sm text-muted-foreground mt-1">
          Cadastre depósitos para visualizar a distribuição do estoque
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-card border border-border/50">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-display font-semibold text-card-foreground">
          Estoque por Depósito
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Distribuição de produtos e valores
        </p>
      </div>
      <div className="divide-y divide-border">
        {items.map((deposit, index) => {
          const percentage = totalValue > 0 
            ? Math.round((Number(deposit.valor_total) / totalValue) * 100) 
            : 0;

          return (
            <div
              key={deposit.deposito_id}
              className="p-4 hover:bg-muted/50 transition-colors animate-slide-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  deposit.deposito_tipo === 'físico' ? 'bg-primary/10' : 'bg-accent/10'
                )}>
                  <Warehouse className={cn(
                    "w-5 h-5",
                    deposit.deposito_tipo === 'físico' ? 'text-primary' : 'text-accent'
                  )} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-card-foreground">{deposit.deposito_nome}</p>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      deposit.deposito_tipo === 'físico'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-accent/10 text-accent'
                    )}>
                      {deposit.deposito_tipo}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {Number(deposit.num_produtos).toLocaleString('pt-BR')} produtos • {Number(deposit.total_itens).toLocaleString('pt-BR')} itens
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-card-foreground tabular-nums">
                    {Number(deposit.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                  <p className="text-sm text-muted-foreground">{percentage}% do total</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="p-4 border-t border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <p className="font-medium text-muted-foreground">Total em Estoque</p>
          <p className="text-xl font-display font-bold text-card-foreground">
            {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
      </div>
    </div>
  );
}
