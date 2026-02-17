/**
 * ESC/POS byte-level command generator.
 * Produces Uint8Array commands for thermal printers (58mm / 80mm).
 */

// ── Constants ─────────────────────────────────────────────────
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

// ── Helpers ───────────────────────────────────────────────────
const encoder = new TextEncoder();

function encode(text: string): Uint8Array {
  return encoder.encode(text);
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const buf = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    buf.set(p, offset);
    offset += p.length;
  }
  return buf;
}

// ── Commands ──────────────────────────────────────────────────
export const CMD = {
  /** Initialize printer */
  INIT: new Uint8Array([ESC, 0x40]),
  /** Line feed */
  LF: new Uint8Array([LF]),
  /** Feed n lines */
  feedLines: (n: number) => new Uint8Array([ESC, 0x64, n]),
  /** Full cut */
  CUT: new Uint8Array([GS, 0x56, 0x00]),
  /** Partial cut */
  CUT_PARTIAL: new Uint8Array([GS, 0x56, 0x01]),
  /** Bold on */
  BOLD_ON: new Uint8Array([ESC, 0x45, 0x01]),
  /** Bold off */
  BOLD_OFF: new Uint8Array([ESC, 0x45, 0x00]),
  /** Double height+width on */
  DOUBLE_ON: new Uint8Array([GS, 0x21, 0x11]),
  /** Double height+width off */
  DOUBLE_OFF: new Uint8Array([GS, 0x21, 0x00]),
  /** Align left */
  ALIGN_LEFT: new Uint8Array([ESC, 0x61, 0x00]),
  /** Align center */
  ALIGN_CENTER: new Uint8Array([ESC, 0x61, 0x01]),
  /** Align right */
  ALIGN_RIGHT: new Uint8Array([ESC, 0x61, 0x02]),
  /** Open cash drawer (pin 2) */
  CASH_DRAWER: new Uint8Array([ESC, 0x70, 0x00, 0x19, 0x78]),
} as const;

// ── Builder ───────────────────────────────────────────────────
export class EscPosBuilder {
  private parts: Uint8Array[] = [];

  init(): this {
    this.parts.push(CMD.INIT);
    return this;
  }

  text(s: string): this {
    this.parts.push(encode(s));
    return this;
  }

  line(s = ''): this {
    this.parts.push(encode(s), CMD.LF);
    return this;
  }

  feed(n = 1): this {
    this.parts.push(CMD.feedLines(n));
    return this;
  }

  bold(on = true): this {
    this.parts.push(on ? CMD.BOLD_ON : CMD.BOLD_OFF);
    return this;
  }

  double(on = true): this {
    this.parts.push(on ? CMD.DOUBLE_ON : CMD.DOUBLE_OFF);
    return this;
  }

  align(a: 'left' | 'center' | 'right'): this {
    this.parts.push(a === 'center' ? CMD.ALIGN_CENTER : a === 'right' ? CMD.ALIGN_RIGHT : CMD.ALIGN_LEFT);
    return this;
  }

  separator(char = '-', cols = 48): this {
    this.line(char.repeat(cols));
    return this;
  }

  columns(left: string, right: string, cols = 48): this {
    const pad = cols - left.length - right.length;
    this.line(left + ' '.repeat(Math.max(1, pad)) + right);
    return this;
  }

  columns3(left: string, center: string, right: string, cols = 48): this {
    const half = Math.floor(cols / 3);
    const l = left.padEnd(half);
    const c = center.padStart(Math.floor((cols - half * 2) / 2) + center.length / 2).padEnd(cols - half * 2);
    const r = right.padStart(half);
    this.line((l + c + r).substring(0, cols));
    return this;
  }

  cut(partial = true): this {
    this.feed(3);
    this.parts.push(partial ? CMD.CUT_PARTIAL : CMD.CUT);
    return this;
  }

  cashDrawer(): this {
    this.parts.push(CMD.CASH_DRAWER);
    return this;
  }

  raw(data: Uint8Array): this {
    this.parts.push(data);
    return this;
  }

  build(): Uint8Array {
    return concat(...this.parts);
  }
}
