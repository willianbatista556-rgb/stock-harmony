import { useEffect } from 'react';

export interface HotkeyHandlers {
  onHelp: () => void;
  onFocusSearch: () => void;
  onFinalize: () => void;
  onDiscount: () => void;
  onQuantity: () => void;
  onCustomer: () => void;
  onCaixaMov: () => void;
  onCancel: () => void;
  onRemoveItem: () => void;
  onArrowUp: () => void;
  onArrowDown: () => void;
  onEnter: () => void;
}

/**
 * PDV global hotkeys — zero dependencies, zero libs.
 * F-keys always fire (even when typing in inputs).
 * Arrow/Delete/Enter only fire outside inputs OR with Ctrl.
 */
export function usePdvHotkeys(h: HotkeyHandlers) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;

      const hasCtrl = e.ctrlKey || e.metaKey;

      // Ctrl+L always fires — focus search
      if (hasCtrl && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        h.onFocusSearch();
        return;
      }

      // F-keys always fire (even when typing)
      switch (e.key) {
        case 'F1':
          e.preventDefault();
          h.onHelp();
          return;
        case 'F2':
          e.preventDefault();
          h.onDiscount();
          return;
        case 'F3':
          e.preventDefault();
          h.onCustomer();
          return;
        case 'F4':
          e.preventDefault();
          h.onFinalize();
          return;
        case 'F5':
          e.preventDefault();
          h.onCaixaMov();
          return;
        case 'F6':
          e.preventDefault();
          h.onQuantity();
          return;
      }

      // Escape always fires
      if (e.key === 'Escape') {
        e.preventDefault();
        h.onCancel();
        return;
      }

      // Below keys: skip if user is typing in an input
      if (isTyping) return;

      switch (e.key) {
        case 'Delete':
          e.preventDefault();
          h.onRemoveItem();
          break;
        case 'ArrowUp':
          e.preventDefault();
          h.onArrowUp();
          break;
        case 'ArrowDown':
          e.preventDefault();
          h.onArrowDown();
          break;
        case 'Enter':
          e.preventDefault();
          h.onEnter();
          break;
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [h]);
}
