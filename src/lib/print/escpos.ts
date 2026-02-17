// Gerador simples de comandos ESC/POS para cupom texto.
// Suporta: init, bold, align, cut, feed.

export class EscPosBuilder {
  private chunks: number[] = []

  private push(...bytes: number[]) {
    this.chunks.push(...bytes)
  }

  init() {
    // ESC @
    this.push(0x1b, 0x40)
    return this
  }

  alignLeft() { this.push(0x1b, 0x61, 0x00); return this }   // ESC a 0
  alignCenter() { this.push(0x1b, 0x61, 0x01); return this }  // ESC a 1
  alignRight() { this.push(0x1b, 0x61, 0x02); return this }   // ESC a 2

  bold(on: boolean) { this.push(0x1b, 0x45, on ? 0x01 : 0x00); return this } // ESC E n

  // Fonte normal (A) e um pouco maior (B-ish). Algumas impressoras variam.
  sizeNormal() { this.push(0x1d, 0x21, 0x00); return this } // GS ! 0
  sizeDouble() { this.push(0x1d, 0x21, 0x11); return this } // GS ! (double w/h)

  line(text = '') {
    // ESC/POS é mais feliz com CP437/CP860, mas no web a gente manda UTF-8
    // e muitas impressoras modernas aceitam. Se não aceitar, a gente ajusta depois.
    const encoder = new TextEncoder()
    const bytes = Array.from(encoder.encode(text))
    this.push(...bytes, 0x0a) // LF
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
    // GS V 1
    this.push(0x1d, 0x56, 0x01)
    return this
  }

  build() {
    return new Uint8Array(this.chunks)
  }
}
