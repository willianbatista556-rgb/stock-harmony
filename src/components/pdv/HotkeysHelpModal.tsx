import { memo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

const shortcuts = [
  { key: 'F1', label: 'Ajuda', desc: 'Abre/fecha este painel' },
  { key: 'F2', label: 'Desconto', desc: 'Desconto no item selecionado' },
  { key: 'F3', label: 'Cliente', desc: 'Buscar/vincular cliente' },
  { key: 'F4', label: 'Finalizar', desc: 'Abrir pagamento e finalizar venda' },
  { key: 'F6', label: 'Quantidade', desc: 'Alterar quantidade do item' },
  { key: 'Ctrl+L', label: 'Busca', desc: 'Foco no campo de busca' },
  { key: 'Del', label: 'Remover', desc: 'Remove o item selecionado' },
  { key: 'Esc', label: 'Cancelar', desc: 'Fecha modal ou cancela venda' },
  { key: '↑ ↓', label: 'Navegar', desc: 'Selecionar item no carrinho' },
  { key: 'Enter', label: 'Confirmar', desc: 'Confirma ação ou adiciona item' },
];

interface HotkeysHelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const HotkeysHelpModal = memo(function HotkeysHelpModal({ open, onOpenChange }: HotkeysHelpModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Atalhos do PDV</DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          {shortcuts.map(s => (
            <div key={s.key} className="flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-muted/40 transition-colors">
              <kbd className="px-2.5 py-1 rounded-md bg-muted font-mono text-xs font-bold text-foreground min-w-[64px] text-center border border-border/50 shrink-0">
                {s.key}
              </kbd>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-foreground">{s.label}</span>
                <span className="text-xs text-muted-foreground ml-2">{s.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
});
