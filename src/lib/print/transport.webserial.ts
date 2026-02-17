export type SerialTransport = {
  connect: () => Promise<void>
  write: (data: Uint8Array) => Promise<void>
  disconnect: () => Promise<void>
  isSupported: () => boolean
  isConnected: () => boolean
}

export function createWebSerialTransport(): SerialTransport {
  let port: any = null
  let writer: WritableStreamDefaultWriter<Uint8Array> | null = null

  return {
    isSupported() {
      return typeof navigator !== 'undefined' && 'serial' in navigator
    },

    isConnected() {
      return !!port?.writable && !!writer
    },

    async connect() {
      if (!('serial' in navigator)) throw new Error('WebSerial não suportado neste navegador.')
      // @ts-ignore
      port = await navigator.serial.requestPort()
      await port!.open({ baudRate: 9600 }) // muitas térmicas usam 9600 ou 115200; ajustamos depois
      writer = port!.writable?.getWriter() ?? null
      if (!writer) throw new Error('Não foi possível obter writer da porta serial.')
    },

    async write(data: Uint8Array) {
      if (!writer) throw new Error('Impressora não conectada.')
      await writer.write(data)
    },

    async disconnect() {
      try {
        if (writer) {
          writer.releaseLock()
          writer = null
        }
        if (port) {
          await port.close()
          port = null
        }
      } catch {
        // ignore
      }
    },
  }
}

/** Singleton instance for convenience */
export const webSerialTransport = createWebSerialTransport()

export function isWebSerialSupported() {
  return webSerialTransport.isSupported()
}

export function isPrinterConnected() {
  return webSerialTransport.isConnected()
}
