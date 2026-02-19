import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, PackageCheck } from 'lucide-react';
import TransferenciasOrigem from './TransferenciasOrigem';
import TransferenciasDestino from './TransferenciasDestino';

export default function TransferenciasTab() {
  return (
    <div className="space-y-4">
      {/* Flow info */}
      <div className="rounded-lg border border-border p-3 bg-muted/30">
        <p className="text-xs text-muted-foreground">
          <strong>Fluxo:</strong>{' '}
          <span className="text-muted-foreground font-medium">Rascunho</span> →{' '}
          <span className="text-warning font-medium">Pendente Envio</span> →{' '}
          <span className="text-primary font-medium">Em Recebimento</span> →{' '}
          <span className="text-success font-medium">Confirmada</span> (estoque movimentado)
        </p>
      </div>

      <Tabs defaultValue="origem" className="space-y-4">
        <TabsList>
          <TabsTrigger value="origem" className="gap-1.5">
            <Send className="w-3.5 h-3.5" />
            Enviar (Origem)
          </TabsTrigger>
          <TabsTrigger value="destino" className="gap-1.5">
            <PackageCheck className="w-3.5 h-3.5" />
            Receber (Destino)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="origem">
          <TransferenciasOrigem />
        </TabsContent>

        <TabsContent value="destino">
          <TransferenciasDestino />
        </TabsContent>
      </Tabs>
    </div>
  );
}
