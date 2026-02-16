import { useEffect, useCallback, RefObject } from 'react';
import { toast } from 'sonner';
import { PDVState } from './pdv.types';
import { PDVAction, getRestante } from './pdv.reducer';
import { Produto } from '@/hooks/useProdutos';

interface UsePdvHotkeysParams {
  state: PDVState;
  dispatch: React.Dispatch<PDVAction>;
  searchInputRef: RefObject<HTMLInputElement | null>;
  // Search state (lives in shell for controlled input)
  searchResults: Produto[];
  searchSelectedIndex: number;
  setSearchSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  // Inline input (qty/discount)
  inputValue: string;
  setInputValue: React.Dispatch<React.SetStateAction<string>>;
  // Payment
  paymentValue: string;
  setPaymentValue: React.Dispatch<React.SetStateAction<string>>;
  // Cancel dialog
  setShowConfirmCancel: React.Dispatch<React.SetStateAction<boolean>>;
  // Help modal
  setShowHelp: React.Dispatch<React.SetStateAction<boolean>>;
}

export function usePdvHotkeys({
  state, dispatch,
  searchInputRef,
  searchResults, searchSelectedIndex, setSearchSelectedIndex, setSearchQuery,
  inputValue, setInputValue,
  paymentValue, setPaymentValue,
  setShowConfirmCancel,
  setShowHelp,
}: UsePdvHotkeysParams) {
  const handler = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

    // ── Global F-keys ──────────────────────────────────────
    if (e.key === 'F1') {
      e.preventDefault();
      setShowHelp(prev => !prev);
      return;
    }

    if (e.key === 'F2') {
      e.preventDefault();
      if (state.items.length > 0) {
        if (state.selectedIndex < 0) dispatch({ type: 'SET_SELECTED_INDEX', index: 0 });
        dispatch({ type: 'SET_MODE', mode: 'discount' });
        setInputValue(String(state.items[Math.max(0, state.selectedIndex)]?.desconto || 0));
      }
      return;
    }

    if (e.key === 'F3') {
      e.preventDefault();
      toast.info('Busca de cliente será implementada em breve');
      return;
    }

    if (e.key === 'F4') {
      e.preventDefault();
      if (state.items.length > 0) {
        dispatch({ type: 'SET_MODE', mode: 'payment' });
        setPaymentValue(String(getRestante(state).toFixed(2)));
      }
      return;
    }

    if (e.key === 'F6') {
      e.preventDefault();
      if (state.items.length > 0) {
        if (state.selectedIndex < 0) dispatch({ type: 'SET_SELECTED_INDEX', index: 0 });
        dispatch({ type: 'SET_MODE', mode: 'quantity' });
        setInputValue(String(state.items[Math.max(0, state.selectedIndex)]?.qtd || 1));
      }
      return;
    }

    if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      dispatch({ type: 'SET_MODE', mode: 'search' });
      setSearchQuery('');
      searchInputRef.current?.focus();
      return;
    }

    // ── Search mode ────────────────────────────────────────
    if (state.mode === 'search') {
      if (e.key === 'Escape') { e.preventDefault(); dispatch({ type: 'SET_MODE', mode: 'normal' }); setSearchQuery(''); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setSearchSelectedIndex(i => Math.min(i + 1, searchResults.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSearchSelectedIndex(i => Math.max(i - 1, 0)); }
      else if (e.key === 'Enter' && searchResults.length > 0) {
        e.preventDefault();
        dispatch({ type: 'ADD_ITEM', produto: searchResults[searchSelectedIndex], keepSearchMode: true });
        setSearchQuery('');
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      return;
    }

    // ── Quantity mode ──────────────────────────────────────
    if (state.mode === 'quantity') {
      if (e.key === 'Escape') { e.preventDefault(); dispatch({ type: 'SET_MODE', mode: 'normal' }); setInputValue(''); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const val = parseFloat(inputValue);
        if (!isNaN(val) && state.selectedIndex >= 0) dispatch({ type: 'UPDATE_QUANTITY', index: state.selectedIndex, qtd: val });
        setInputValue(''); dispatch({ type: 'SET_MODE', mode: 'normal' });
      }
      return;
    }

    // ── Discount mode ──────────────────────────────────────
    if (state.mode === 'discount') {
      if (e.key === 'Escape') { e.preventDefault(); dispatch({ type: 'SET_MODE', mode: 'normal' }); setInputValue(''); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const val = parseFloat(inputValue);
        if (!isNaN(val) && state.selectedIndex >= 0) dispatch({ type: 'APPLY_ITEM_DISCOUNT', index: state.selectedIndex, desconto: val });
        setInputValue(''); dispatch({ type: 'SET_MODE', mode: 'normal' });
      }
      return;
    }

    // ── Payment mode ───────────────────────────────────────
    if (state.mode === 'payment') {
      if (e.key === 'Escape') { e.preventDefault(); dispatch({ type: 'SET_MODE', mode: 'normal' }); setPaymentValue(''); }
      return;
    }

    // ── Normal mode ────────────────────────────────────────
    if (isInput) {
      if (e.key === 'Escape') { e.preventDefault(); dispatch({ type: 'SET_MODE', mode: 'normal' }); setSearchQuery(''); }
      return;
    }

    if (e.key === 'Delete' && state.items.length > 0 && state.selectedIndex >= 0) {
      e.preventDefault(); dispatch({ type: 'REMOVE_ITEM', index: state.selectedIndex });
    }
    else if (e.key === 'ArrowDown') { e.preventDefault(); dispatch({ type: 'SET_SELECTED_INDEX', index: Math.min(state.selectedIndex + 1, state.items.length - 1) }); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); dispatch({ type: 'SET_SELECTED_INDEX', index: Math.max(state.selectedIndex - 1, 0) }); }
    else if (e.key === 'Escape' && state.items.length > 0) { setShowConfirmCancel(true); }
  }, [state, dispatch, searchResults, searchSelectedIndex, inputValue, paymentValue, searchInputRef, setSearchQuery, setSearchSelectedIndex, setInputValue, setPaymentValue, setShowConfirmCancel, setShowHelp]);

  useEffect(() => {
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handler]);
}
