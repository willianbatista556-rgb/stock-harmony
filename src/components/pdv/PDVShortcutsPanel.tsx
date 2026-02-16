import { memo } from 'react';
import { Keyboard } from 'lucide-react';

const shortcuts = [
  { key: '/', label: 'Buscar' },
  { key: 'q', label: 'Qtd' },
  { key: 'd', label: 'Desconto' },
  { key: 'p', label: 'Pagar' },
  { key: 'x', label: 'Remover' },
  { key: 'Esc', label: 'Cancelar' },
  { key: '↑↓', label: 'Navegar' },
  { key: 'Enter', label: 'Confirmar' },
];

export const PDVShortcutsPanel = memo(function PDVShortcutsPanel() {
  return (
    <div className="bg-card rounded-xl border border-border/50 shadow-card p-4 mt-auto">
      <div className="flex items-center gap-2 mb-3">
        <Keyboard className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Atalhos</span>
      </div>
      <div className="grid grid-cols-4 gap-x-3 gap-y-1.5">
        {shortcuts.map(s => (
          <div key={s.key} className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px] font-bold text-muted-foreground min-w-[22px] text-center border border-border/50">
              {s.key}
            </kbd>
            <span className="text-xs text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
});
