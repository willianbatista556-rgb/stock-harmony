/**
 * Print module public API.
 *
 * Usage:
 *   import { printReceipt, connectPrinter, isPrinterConnected } from '@/lib/print';
 */

export { EscPosBuilder, CMD } from './escpos';
export { webSerialTransport, autoReconnect, isWebSerialSupported } from './transport.webserial';
export { buildReceipt } from './receipt.template';
export type { PrintTransport } from './transport.webserial';

import { webSerialTransport } from './transport.webserial';
import { buildReceipt } from './receipt.template';
import type { PDVItem, Pagamento, PDVCustomer } from '@/lib/pdv/pdv.types';

interface PrintReceiptOptions {
  items: PDVItem[];
  pagamentos: Pagamento[];
  customer: PDVCustomer | null;
  subtotal: number;
  desconto: number;
  total: number;
  isBudget?: boolean;
  empresaNome?: string;
  terminalNome?: string;
  operador?: string;
  openDrawer?: boolean;
}

/**
 * High-level: connect (if needed) + print receipt + optional cash drawer.
 * Returns true if printed successfully.
 */
export async function printReceipt(options: PrintReceiptOptions): Promise<boolean> {
  try {
    if (!webSerialTransport.isConnected()) {
      await webSerialTransport.connect();
    }

    const bytes = buildReceipt(options);
    await webSerialTransport.write(bytes);

    if (options.openDrawer) {
      const { CMD } = await import('./escpos');
      await webSerialTransport.write(CMD.CASH_DRAWER);
    }

    return true;
  } catch (err) {
    console.error('[ESC/POS] Print failed:', err);
    throw err;
  }
}

export function connectPrinter() {
  return webSerialTransport.connect();
}

export function disconnectPrinter() {
  return webSerialTransport.disconnect();
}

export function isPrinterConnected() {
  return webSerialTransport.isConnected();
}
