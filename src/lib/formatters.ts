/**
 * Shared formatting utilities used across the application.
 * Centralizes locale-specific formatting to avoid duplication.
 */

export function formatCurrency(val: number): string {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('pt-BR');
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
