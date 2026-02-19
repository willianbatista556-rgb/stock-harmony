import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDepositos } from '@/hooks/useDepositos';
import { useProdutos } from '@/hooks/useProdutos';
import { useCriarTransferencia } from '@/hooks/useTransferencias';
import { toast } from 'sonner';

interface ItemForm {
  produto_id: string;
  qtd: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TransferenciaModal({ open, onOpenChange }: Props) {
  const [origemId, setOrigemId] = useState('');
  const [destinoId, setDestinoId] = useState('');
  const [observacao, setObservacao] = useState('');
  const [itens, setItens] = useState<ItemForm[]>([{ produto_id: '', qtd: '' }]);

  const { data: depositos = [] } = useDepositos();
  const { data: produtos = [] } = useProdutos();
  const criar = useCriarTransferencia();

  const reset = () => {
    setOrigemId('');
    setDestinoId('');
    setObservacao('');
    setItens([{ produto_id: '', qtd: '' }]);
  };

  const addItem = () => setItens([...itens, { produto_id: '', qtd: '' }]);

  const removeItem = (idx: number) => {
    if (itens.length <= 1) return;
    setItens(itens.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof ItemForm, value: string) => {
    setItens(itens.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const handleSubmit = async () => {
    if (!origemId || !destinoId) {
      toast.error('Selecione origem e destino');
      return;
    }
    if (origemId === destinoId) {
      toast.error('Origem e destino devem ser diferentes');
      return;
    }

    const validItens = itens
      .filter((i) => i.produto_id && i.qtd)
      .map((i) => ({ produto_id: i.produto_id, qtd: parseFloat(i.qtd) }))
      .filter((i) => i.qtd > 0);

    if (validItens.length === 0) {
      toast.error('Adicione pelo menos um item com quantidade válida');
      return;
    }

    await criar.mutateAsync({
      origemId,
      destinoId,
      itens: validItens,
      observacao: observacao || undefined,
    });

    reset();
    onOpenChange(false);
  };

  const destinoOptions = depositos.filter((d) => d.id !== origemId);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="bg-card max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Transferência</DialogTitle>
          <DialogDescription>
            Cria como pendente. Depois envie para debitar a origem e confirme o recebimento no destino.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Origem *</Label>
              <Select value={origemId} onValueChange={setOrigemId}>
                <SelectTrigger>
                  <SelectValue placeholder="Local de saída" />
                </SelectTrigger>
                <SelectContent>
                  {depositos.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Destino *</Label>
              <Select value={destinoId} onValueChange={setDestinoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Local de entrada" />
                </SelectTrigger>
                <SelectContent>
                  {destinoOptions.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Flow info */}
          <div className="rounded-lg border border-border p-3 bg-muted/30">
            <p className="text-xs text-muted-foreground">
              <strong>Fluxo:</strong> Rascunho → <span className="text-warning font-medium">Enviar</span> → <span className="text-primary font-medium">Receber</span> → <span className="text-success font-medium">Confirmar</span> (movimenta estoque)
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Produtos</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addItem} className="gap-1 text-xs">
                <Plus className="w-3 h-3" /> Adicionar
              </Button>
            </div>
            {itens.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Select value={item.produto_id} onValueChange={(v) => updateItem(idx, 'produto_id', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {produtos.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.sku ? `${p.sku} - ` : ''}{p.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24">
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Qtd"
                    value={item.qtd}
                    onChange={(e) => updateItem(idx, 'qtd', e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(idx)}
                  disabled={itens.length <= 1}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Notas sobre a transferência..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={criar.isPending}
            className="gradient-primary text-white"
          >
            Criar Rascunho
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
