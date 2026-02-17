import { createWebSerialTransport } from './transport.webserial'
import { buildReceipt80mm, ReceiptOptions } from './templates'
import { ReceiptData } from './types'
import type { Codepage } from './escpos'

export { buildReceipt80mm } from './templates'
export { createWebSerialTransport, isWebSerialSupported, isPrinterConnected } from './transport.webserial'
export type { SerialTransport } from './transport.webserial'
export type { ReceiptData, ReceiptItem, ReceiptPayment } from './types'
export type { Codepage } from './escpos'
export type { ReceiptOptions } from './templates'

let transport = createWebSerialTransport()

export interface PrintOptions {
  codepage?: Codepage
  baudrate?: number
}

export async function printReceipt(receipt: ReceiptData, opts?: PrintOptions) {
  if (!transport.isSupported()) {
    throw new Error('Seu navegador não suporta impressão via WebSerial. Use Chrome/Edge.')
  }

  const bytes = buildReceipt80mm(receipt, { codepage: opts?.codepage })

  await transport.connect()
  try {
    await transport.write(bytes)
  } finally {
    await transport.disconnect()
  }
}
