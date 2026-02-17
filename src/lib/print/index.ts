/**
 * Print module public API.
 */

export { EscPosBuilder } from './escpos';
export { createWebSerialTransport, webSerialTransport, isWebSerialSupported, isPrinterConnected } from './transport.webserial';
export { buildReceipt80mm } from './templates';
export type { SerialTransport } from './transport.webserial';
export type { ReceiptData, ReceiptItem, ReceiptPayment } from './types';

import { webSerialTransport } from './transport.webserial';
import { buildReceipt80mm } from './templates';
import type { ReceiptData } from './types';

/**
 * High-level: connect (if needed) + print receipt.
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
