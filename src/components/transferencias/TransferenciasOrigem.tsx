import { useState } from 'react';
import { ArrowRightLeft, Send, X, FileEdit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useTransferencias,
  useEnviarTransferencia,
  useCancelarTransferencia,
} from '@/hooks/useTransferencias';
import TransferenciaModal from './TransferenciaModal';
import { cn } from '@/lib/utils';

const statusConfig = {
  rascunho: { label: 'Rascunho', icon: FileEdit, className: 'text-muted-foreground border-border bg-muted/50' },
  pendente_envio: { label: 'Pendente Envio', icon: Send, className: 'text-warning border-warning/30 bg-warning/10' },
};

export default function TransferenciasOrigem() {
  const [modalOpen, setModalOpen] = useState(false);
  const { data: transferencias, isLoading } = useTransferencias();
  const enviar = useEnviarTransferencia();
  const cancelar = useCancelarTransferencia();

  // Origin only sees rascunho and pendente_envio
  const filtered = transferencias?.filter(t => t.status === 'rascunho' || t.status === 'pendente_envio') || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filtered.length} transferência(s) de saída
        </p>
        <Button onClick={() => setModalOpen(true)} className="gradient-primary text-white gap-2">
          <ArrowRightLeft className="w-4 h-4" />
          Nova Transferência
        </Button>
      </div>

      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Origem → Destino</TableHead>
              <TableHead className="font-semibold">Itens</TableHead>
              <TableHead className="font-semibold">Data</TableHead>
              <TableHead className="font-semibold text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                </TableRow>
              ))
            ) : !filtered.length ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhuma transferência de saída
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((t) => {
                const config = statusConfig[t.status as keyof typeof statusConfig] || statusConfig.rascunho;
                const StatusIcon = config.icon;
                const itensCount = t.transferencia_itens?.length || 0;
                const itensPreview = t.transferencia_itens
                  ?.slice(0, 2)
                  .map((i) => `${i.nome_snapshot || 'Produto'} (${i.qtd})`)
                  .join(', ') || '';

                return (
                  <TableRow key={t.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <Badge variant="outline" className={cn("gap-1", config.className)}>
                        <StatusIcon className="w-3 h-3" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{t.origem?.nome || '—'}</span>
                        <ArrowRightLeft className="w-3 h-3 text-muted-foreground" />
                        <span className="font-medium">{t.destino?.nome || '—'}</span>
                      </div>
                      {t.observacao && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">{t.observacao}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{itensPreview}</p>
                      {itensCount > 2 && (
                        <p className="text-xs text-muted-foreground">+{itensCount - 2} mais</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">
                        {new Date(t.criado_em).toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(t.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        {t.status === 'rascunho' && (
                          <>
                            <Button size="sm" variant="ghost"
                              onClick={() => enviar.mutate(t.id)} disabled={enviar.isPending}
                              className="text-warning hover:text-warning hover:bg-warning/10 gap-1">
                              <Send className="w-3.5 h-3.5" /> Enviar
                            </Button>
                            <Button size="sm" variant="ghost"
                              onClick={() => cancelar.mutate(t.id)} disabled={cancelar.isPending}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10">
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                        {t.status === 'pendente_envio' && (
                          <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10">
                            Aguardando destino
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <TransferenciaModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
