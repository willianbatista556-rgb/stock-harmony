export type ReceiptItem = {
  nome: string
  qtd: number
  preco: number
  subtotal: number
}

export type ReceiptPayment = {
  metodo: string
  valor: number
}

export type ReceiptData = {
  empresaNome?: string
  cnpj?: string
  endereco?: string
  telefone?: string

  vendaId: string
  dataIso: string

  clienteNome?: string

  itens: ReceiptItem[]
  subtotal: number
  desconto: number
  total: number
  pagamentos: ReceiptPayment[]

  footer?: string
}
