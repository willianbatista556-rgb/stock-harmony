/**
 * WebSerial transport for ESC/POS thermal printers.
 * Chrome/Edge 89+ required.
 */

export interface PrintTransport {
  connect(): Promise<void>;
  write(data: Uint8Array): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

// WebSerial types (not in default TS lib)
type AnySerial = {
  getPorts(): Promise<any[]>;
  requestPort(options?: any): Promise<any>;
};

function getSerial(): AnySerial | null {
  return (navigator as any).serial ?? null;
}

let port: any = null;
let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;

function isWebSerialSupported(): boolean {
  return !!getSerial();
}

export const webSerialTransport: PrintTransport = {
  async connect() {
    const serial = getSerial();
    if (!serial) {
      throw new Error('WebSerial não é suportado neste navegador. Use Chrome ou Edge.');
    }

    try {
      if (port?.readable && port?.writable) return;

      port = await serial.requestPort({
        filters: [
          { usbVendorId: 0x1a86 }, // CH340/CH341
          { usbVendorId: 0x0403 }, // FTDI
          { usbVendorId: 0x067b }, // Prolific PL2303
          { usbVendorId: 0x10c4 }, // Silicon Labs CP210x
        ],
      });

      await port.open({ baudRate: 9600 });

      if (!port.writable) {
        throw new Error('Porta serial não possui stream de escrita.');
      }

      writer = port.writable.getWriter();
    } catch (err: unknown) {
      port = null;
      writer = null;
      if (err instanceof DOMException && err.name === 'NotFoundError') {
        throw new Error('Nenhuma impressora selecionada.');
      }
      throw err;
    }
  },

  async write(data: Uint8Array) {
    if (!writer) {
      throw new Error('Impressora não conectada. Conecte primeiro.');
    }

    const CHUNK_SIZE = 512;
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      await writer.write(chunk);
    }
  },

  async disconnect() {
    try {
      if (writer) {
        writer.releaseLock();
        writer = null;
      }
      if (port) {
        await port.close();
        port = null;
      }
    } catch {
      port = null;
      writer = null;
    }
  },

  isConnected() {
    return !!port?.writable && !!writer;
  },
};

export async function autoReconnect(): Promise<boolean> {
  const serial = getSerial();
  if (!serial) return false;
  try {
    const ports = await serial.getPorts();
    if (ports.length === 0) return false;
    port = ports[0];
    await port.open({ baudRate: 9600 });
    if (port.writable) {
      writer = port.writable.getWriter();
      return true;
    }
    return false;
  } catch {
    port = null;
    writer = null;
    return false;
  }
}

export { isWebSerialSupported };
