/**
 * Print module public API.
 */

export { EscPosBuilder } from './escpos';
export { webSerialTransport, autoReconnect, isWebSerialSupported } from './transport.webserial';
export { buildReceipt80mm } from './templates';
export type { PrintTransport } from './transport.webserial';
export type { ReceiptData, ReceiptItem, ReceiptPayment } from './types';

import { webSerialTransport } from './transport.webserial';
import { buildReceipt80mm } from './templates';
import type { ReceiptData } from './types';

/**
 * High-level: connect (if needed) + print receipt.
 * Returns true if printed successfully.
 */
export async function printReceipt(data: ReceiptData): Promise<boolean> {
  try {
    if (!webSerialTransport.isConnected()) {
      await webSerialTransport.connect();
    }

    const bytes = buildReceipt80mm(data);
    await webSerialTransport.write(bytes);

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
