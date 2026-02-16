import { memo } from 'react';
import { Keyboard } from 'lucide-react';

const shortcuts = [
  { key: 'F1', label: 'Ajuda' },
  { key: 'F2', label: 'Desconto' },
  { key: 'F3', label: 'Cliente' },
  { key: 'F4', label: 'Finalizar' },
  { key: 'F6', label: 'Qtd' },
  { key: 'Ctrl+L', label: 'Busca' },
  { key: 'Del', label: 'Remover' },
  { key: 'Esc', label: 'Cancelar' },
  { key: '↑↓', label: 'Navegar' },
  { key: 'Enter', label: 'Confirmar' },
];

export const PDVShortcutsPanel = memo(function PDVShortcutsPanel() {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-6">
        <Keyboard className="w-4 h-4 text-muted-foreground shrink-0" />
        {shortcuts.map(s => (
          <div key={s.key} className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px] font-bold text-muted-foreground min-w-[28px] text-center border border-border/50">
              {s.key}
            </kbd>
            <span className="text-xs text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
});
