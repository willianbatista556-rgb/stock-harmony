import { createWebSerialTransport } from './transport.webserial'
import { buildReceipt80mm } from './templates'
import { ReceiptData } from './types'

export { buildReceipt80mm } from './templates'
export { createWebSerialTransport, isWebSerialSupported, isPrinterConnected } from './transport.webserial'
export type { SerialTransport } from './transport.webserial'
export type { ReceiptData, ReceiptItem, ReceiptPayment } from './types'

let transport = createWebSerialTransport()

export async function printReceipt(receipt: ReceiptData) {
  if (!transport.isSupported()) {
    throw new Error('Seu navegador não suporta impressão via WebSerial. Use Chrome/Edge.')
  }

  const bytes = buildReceipt80mm(receipt)

  await transport.connect()
  try {
    await transport.write(bytes)
  } finally {
    await transport.disconnect()
  }
}
