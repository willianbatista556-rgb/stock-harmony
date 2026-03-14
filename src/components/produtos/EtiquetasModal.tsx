import { useState } from 'react';
import { Printer } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateLabelsPDF, type LabelProduct } from '@/lib/labels/generate-labels-pdf';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: LabelProduct[];
}

export function EtiquetasModal({ open, onOpenChange, products }: Props) {
  const [layout, setLayout] = useState('3x10');
  const [qty, setQty] = useState(1);

  const handleGenerate = () => {
    if (products.length === 0) {
      toast.error('Nenhum produto selecionado');
      return;
    }
    try {
      generateLabelsPDF(products, layout, qty);
      toast.success(`PDF gerado com ${products.length * qty} etiqueta(s)`);
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar PDF de etiquetas');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-primary" />
            Gerar Etiquetas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            {products.length} produto(s) selecionado(s). Etiquetas serão geradas com código de barras EAN/SKU e preço.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Layout da folha</Label>
              <Select value={layout} onValueChange={setLayout}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3x10">Pimaco 3x10 (63,5×25,4mm)</SelectItem>
                  <SelectItem value="2x7">A4 2x7 (90×38mm)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Qtd por produto</Label>
              <Input
                type="number"
                min={1}
                max={200}
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} className="gap-2">
            <Printer className="w-4 h-4" />
            Gerar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
