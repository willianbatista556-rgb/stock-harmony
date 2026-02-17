// Gerador de comandos ESC/POS para cupom texto.
// Suporta: init, bold, align, cut, feed, codepage com transliteração.

export type Codepage = 'utf8' | 'cp437' | 'cp860' | 'cp858'

// ── Codepage tables ──────────────────────────────────────────
// Maps Unicode codepoints (128+) to single-byte values for each codepage.
// Only characters commonly used in pt-BR are mapped; unmapped chars become '?'.

const CP437: Record<string, number> = {
  'Ç': 0x80, 'ü': 0x81, 'é': 0x82, 'â': 0x83, 'ä': 0x84, 'à': 0x85, 'å': 0x86,
  'ç': 0x87, 'ê': 0x88, 'ë': 0x89, 'è': 0x8a, 'ï': 0x8b, 'î': 0x8c, 'ì': 0x8d,
  'Ä': 0x8e, 'Å': 0x8f, 'É': 0x90, 'æ': 0x91, 'Æ': 0x92, 'ô': 0x93, 'ö': 0x94,
  'ò': 0x95, 'û': 0x96, 'ù': 0x97, 'ÿ': 0x98, 'Ö': 0x99, 'Ü': 0x9a, '¢': 0x9b,
  '£': 0x9c, '¥': 0x9d, 'á': 0xa0, 'í': 0xa1, 'ó': 0xa2, 'ú': 0xa3, 'ñ': 0xa4,
  'Ñ': 0xa5, 'ª': 0xa6, 'º': 0xa7, '¿': 0xa8, '½': 0xab, '¼': 0xac, '¡': 0xad,
  '«': 0xae, '»': 0xaf, 'ã': 0x83, 'õ': 0x93, // fallback: ã→â, õ→ô (CP437 lacks ã/õ)
  'Ã': 0x41, 'Õ': 0x4f, 'À': 0x85, 'Á': 0x41, 'Â': 0x83, 'Ê': 0x88, 'Í': 0x49,
  'Ó': 0x4f, 'Ô': 0x93, 'Ú': 0x55,
}

const CP860: Record<string, number> = {
  'Ç': 0x80, 'ü': 0x81, 'é': 0x82, 'â': 0x83, 'ã': 0x84, 'à': 0x85, 'Á': 0x86,
  'ç': 0x87, 'ê': 0x88, 'Ê': 0x89, 'è': 0x8a, 'Í': 0x8b, 'Ô': 0x8c, 'ì': 0x8d,
  'Ã': 0x8e, 'Â': 0x8f, 'É': 0x90, 'À': 0x91, 'È': 0x92, 'ô': 0x93, 'õ': 0x94,
  'ò': 0x95, 'Ú': 0x96, 'ù': 0x97, 'Ì': 0x98, 'Õ': 0x99, 'Ü': 0x9a, '¢': 0x9b,
  '£': 0x9c, 'Ù': 0x9d, 'á': 0xa0, 'í': 0xa1, 'ó': 0xa2, 'ú': 0xa3, 'ñ': 0xa4,
  'Ñ': 0xa5, 'ª': 0xa6, 'º': 0xa7, '¿': 0xa8, 'Ó': 0xa9, '½': 0xab, '¼': 0xac,
  '¡': 0xad, '«': 0xae, '»': 0xaf, 'ä': 0x84, 'Ä': 0x8e, 'å': 0x86, 'Å': 0x8f,
  'ö': 0x94, 'Ö': 0x99, 'û': 0x96, 'î': 0x8c, 'ë': 0x89, 'ï': 0x8b,
}

// CP858 = CP850 + € at 0xD5
const CP858: Record<string, number> = {
  'Ç': 0x80, 'ü': 0x81, 'é': 0x82, 'â': 0x83, 'ä': 0x84, 'à': 0x85, 'å': 0x86,
  'ç': 0x87, 'ê': 0x88, 'ë': 0x89, 'è': 0x8a, 'ï': 0x8b, 'î': 0x8c, 'ì': 0x8d,
  'Ä': 0x8e, 'Å': 0x8f, 'É': 0x90, 'æ': 0x91, 'Æ': 0x92, 'ô': 0x93, 'ö': 0x94,
  'ò': 0x95, 'û': 0x96, 'ù': 0x97, 'ÿ': 0x98, 'Ö': 0x99, 'Ü': 0x9a, 'ø': 0x9b,
  '£': 0x9c, 'Ø': 0x9d, 'á': 0xa0, 'í': 0xa1, 'ó': 0xa2, 'ú': 0xa3, 'ñ': 0xa4,
  'Ñ': 0xa5, 'ª': 0xa6, 'º': 0xa7, '¿': 0xa8, '®': 0xa9, '½': 0xab, '¼': 0xac,
  '¡': 0xad, '«': 0xae, '»': 0xaf, 'ã': 0xc6, 'Ã': 0xc7, 'õ': 0xe4, 'Õ': 0xe5,
  'À': 0xb7, 'Â': 0xb6, 'Ê': 0xd2, 'Á': 0xb5, 'Í': 0xd6, 'Ó': 0xe0, 'Ô': 0xe2,
  'Ú': 0xe9, '€': 0xd5,
}

const CODEPAGE_TABLES: Record<Exclude<Codepage, 'utf8'>, Record<string, number>> = {
  cp437: CP437,
  cp860: CP860,
  cp858: CP858,
}

// ESC t n — codepage selection command numbers
const CODEPAGE_CMD: Record<Exclude<Codepage, 'utf8'>, number> = {
  cp437: 0,   // Page 0
  cp860: 3,   // Page 3
  cp858: 19,  // Page 19 (varies by manufacturer)
}

function encodeText(text: string, codepage: Codepage): number[] {
  if (codepage === 'utf8') {
    return Array.from(new TextEncoder().encode(text))
  }

  const table = CODEPAGE_TABLES[codepage]
  const result: number[] = []

  for (const char of text) {
    const code = char.codePointAt(0)!
    if (code < 128) {
      // ASCII — passes through directly
      result.push(code)
    } else {
      const mapped = table[char]
      result.push(mapped ?? 0x3f) // '?' for unmapped
    }
  }

  return result
}

// ── Builder ──────────────────────────────────────────────────

export class EscPosBuilder {
  private chunks: number[] = []
  private codepage: Codepage = 'utf8'

  private push(...bytes: number[]) {
    this.chunks.push(...bytes)
  }

  init() {
    this.push(0x1b, 0x40) // ESC @
    return this
  }

  /** Set codepage for text encoding. Sends ESC t n command to printer. */
  setCodepage(cp: Codepage) {
    this.codepage = cp
    if (cp !== 'utf8') {
      // ESC t n — select character code table
      this.push(0x1b, 0x74, CODEPAGE_CMD[cp])
    }
    return this
  }

  alignLeft() { this.push(0x1b, 0x61, 0x00); return this }
  alignCenter() { this.push(0x1b, 0x61, 0x01); return this }
  alignRight() { this.push(0x1b, 0x61, 0x02); return this }

  bold(on: boolean) { this.push(0x1b, 0x45, on ? 0x01 : 0x00); return this }

  sizeNormal() { this.push(0x1d, 0x21, 0x00); return this }
  sizeDouble() { this.push(0x1d, 0x21, 0x11); return this }

  line(text = '') {
    const bytes = encodeText(text, this.codepage)
    this.push(...bytes, 0x0a)
    return this
  }

  hr(char = '-') {
    return this.line(char.repeat(42))
  }

  feed(lines = 1) {
    for (let i = 0; i < lines; i++) this.push(0x0a)
    return this
  }

  cut() {
    this.push(0x1d, 0x56, 0x01) // GS V 1
    return this
  }

  build() {
    return new Uint8Array(this.chunks)
  }
}
