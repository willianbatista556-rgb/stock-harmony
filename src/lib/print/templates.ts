import { EscPosBuilder } from './escpos'
import { ReceiptData } from './types'

function money(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function padRight(s: string, len: number) {
  return (s + ' '.repeat(len)).slice(0, len)
}

function padLeft(s: string, len: number) {
  return (' '.repeat(len) + s).slice(-len)
}

export function buildReceipt80mm(data: ReceiptData) {
  const b = new EscPosBuilder()
  const cols = 42

  b.init().alignCenter().bold(true).sizeDouble()
  b.line(data.empresaNome ?? 'SUA EMPRESA')
  b.sizeNormal().bold(false)

  if (data.cnpj) b.line(`CNPJ: ${data.cnpj}`)
  if (data.endereco) b.line(data.endereco)
  if (data.telefone) b.line(`Tel: ${data.telefone}`)

  b.feed(1)
  b.hr()
  b.alignLeft()

  const dt = new Date(data.dataIso)
  b.line(`Venda: ${data.vendaId.slice(0, 8)}  ${dt.toLocaleString('pt-BR')}`)
  if (data.clienteNome) b.line(`Cliente: ${data.clienteNome}`)

  b.hr()

  // Cabeçalho itens
  b.bold(true)
  b.line(`${padRight('ITEM', 24)}${padLeft('QTD', 6)}${padLeft('SUB', 12)}`)
  b.bold(false)

  for (const it of data.itens) {
    const name = it.nome.length > 24 ? it.nome.slice(0, 24) : it.nome
    b.line(`${padRight(name, 24)}${padLeft(String(it.qtd), 6)}${padLeft(money(it.subtotal), 12)}`)
    // linha extra com preço unitário (ajuda muito no varejo)
    b.line(`   ${money(it.preco)} un`)
  }

  b.hr()

  b.line(`${padRight('Subtotal', cols - 12)}${padLeft(money(data.subtotal), 12)}`)
  if (data.desconto > 0) {
    b.line(`${padRight('Desconto', cols - 12)}${padLeft(money(data.desconto), 12)}`)
  }

  b.bold(true)
  b.line(`${padRight('TOTAL', cols - 12)}${padLeft(money(data.total), 12)}`)
  b.bold(false)

  b.hr()
  b.bold(true).line('Pagamentos').bold(false)
  for (const p of data.pagamentos) {
    b.line(`${padRight(p.metodo.toUpperCase(), cols - 12)}${padLeft(money(p.valor), 12)}`)
  }

  b.hr()
  b.alignCenter()
  b.line(data.footer ?? 'Obrigado e volte sempre!')
  b.feed(3).cut()

  return b.build()
}
