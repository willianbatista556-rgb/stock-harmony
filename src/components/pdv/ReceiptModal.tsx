import { memo, useRef } from 'react';
import { Printer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatters';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { PDVItem, Pagamento, PDVCustomer } from '@/lib/pdv/pdv.types';

interface ReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: PDVItem[];
  pagamentos: Pagamento[];
  customer: PDVCustomer | null;
  subtotal: number;
  desconto: number;
  total: number;
}

export const ReceiptModal = memo(function ReceiptModal({
  open, onOpenChange, items, pagamentos, customer, subtotal, desconto, total,
}: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = receiptRef.current;
    if (!content) return;
    const win = window.open('', '_blank', 'width=320,height=600');
    if (!win) return;
    win.document.write(`
      <html><head><title>Comprovante</title>
      <style>
        body { font-family: monospace; font-size: 12px; margin: 8px; color: #000; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .line { border-top: 1px dashed #000; margin: 6px 0; }
        .right { text-align: right; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 2px 0; }
      </style></head><body>
      ${content.innerHTML}
      <script>window.print(); window.close();</script>
      </body></html>
    `);
    win.document.close();
  };

  const formaLabel: Record<string, string> = {
    dinheiro: 'Dinheiro',
    credito: 'Crédito',
    debito: 'Débito',
    pix: 'Pix',
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Comprovante de Venda</DialogTitle>
        </DialogHeader>

        <div
          ref={receiptRef}
          className="bg-background rounded-lg border border-border p-4 font-mono text-xs space-y-2 max-h-[400px] overflow-auto"
        >
          <div className="text-center">
            <p className="font-bold text-sm">COMPROVANTE DE VENDA</p>
            <p className="text-muted-foreground">{dateStr} {timeStr}</p>
          </div>

          <div className="border-t border-dashed border-border" />

          {customer && (
            <>
              <p>Cliente: {customer.nome}</p>
              {customer.cpf_cnpj && <p>CPF/CNPJ: {customer.cpf_cnpj}</p>}
              <div className="border-t border-dashed border-border" />
            </>
          )}

          <table className="w-full">
            <thead>
              <tr className="text-muted-foreground">
                <td>Item</td>
                <td className="text-center">Qtd</td>
                <td className="text-right">Unit.</td>
                <td className="text-right">Total</td>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id}>
                  <td className="text-foreground">{i + 1}. {item.produto.nome}</td>
                  <td className="text-center">{item.qtd}</td>
                  <td className="text-right">{formatCurrency(item.preco_unit)}</td>
                  <td className="text-right font-semibold">{formatCurrency(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-dashed border-border" />

          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {desconto > 0 && (
              <div className="flex justify-between text-destructive">
                <span>Desconto</span>
                <span>-{formatCurrency(desconto)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm text-foreground">
              <span>TOTAL</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-border" />

          <div className="space-y-1">
            <p className="text-muted-foreground">Pagamentos:</p>
            {pagamentos.map((p, i) => (
              <div key={i} className="flex justify-between">
                <span>{formaLabel[p.forma] || p.forma}</span>
                <span>
                  {formatCurrency(p.valor)}
                  {p.troco && p.troco > 0 ? ` (troco: ${formatCurrency(p.troco)})` : ''}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-border" />
          <p className="text-center text-muted-foreground">Obrigado pela preferência!</p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 mr-1" /> Fechar
          </Button>
          <Button onClick={handlePrint} className="gap-1.5">
            <Printer className="w-4 h-4" /> Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
