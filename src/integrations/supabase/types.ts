export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      alertas_estoque: {
        Row: {
          criado_em: string | null
          empresa_id: string
          id: string
          produto_id: string
          resolvido: boolean | null
          resolvido_em: string | null
          tipo: string
        }
        Insert: {
          criado_em?: string | null
          empresa_id: string
          id?: string
          produto_id: string
          resolvido?: boolean | null
          resolvido_em?: string | null
          tipo: string
        }
        Update: {
          criado_em?: string | null
          empresa_id?: string
          id?: string
          produto_id?: string
          resolvido?: boolean | null
          resolvido_em?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertas_estoque_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_previsao_ruptura"
            referencedColumns: ["produto_id"]
          },
        ]
      }
      caixa_movimentacoes: {
        Row: {
          caixa_id: string
          criado_em: string
          descricao: string | null
          empresa_id: string
          id: string
          origem: string | null
          ref_id: string | null
          tipo: string
          usuario_id: string
          valor: number
          venda_id: string | null
        }
        Insert: {
          caixa_id: string
          criado_em?: string
          descricao?: string | null
          empresa_id: string
          id?: string
          origem?: string | null
          ref_id?: string | null
          tipo: string
          usuario_id: string
          valor: number
          venda_id?: string | null
        }
        Update: {
          caixa_id?: string
          criado_em?: string
          descricao?: string | null
          empresa_id?: string
          id?: string
          origem?: string | null
          ref_id?: string | null
          tipo?: string
          usuario_id?: string
          valor?: number
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "caixa_movimentacoes_caixa_id_fkey"
            columns: ["caixa_id"]
            isOneToOne: false
            referencedRelation: "caixas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caixa_movimentacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caixa_movimentacoes_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      caixas: {
        Row: {
          aberto_em: string
          deposito_id: string
          diferenca: number | null
          empresa_id: string
          fechado_em: string | null
          id: string
          observacao_fechamento: string | null
          status: string
          terminal_id: string | null
          usuario_id: string
          valor_abertura: number
          valor_contado: number | null
          valor_fechamento: number | null
        }
        Insert: {
          aberto_em?: string
          deposito_id: string
          diferenca?: number | null
          empresa_id: string
          fechado_em?: string | null
          id?: string
          observacao_fechamento?: string | null
          status?: string
          terminal_id?: string | null
          usuario_id: string
          valor_abertura?: number
          valor_contado?: number | null
          valor_fechamento?: number | null
        }
        Update: {
          aberto_em?: string
          deposito_id?: string
          diferenca?: number | null
          empresa_id?: string
          fechado_em?: string | null
          id?: string
          observacao_fechamento?: string | null
          status?: string
          terminal_id?: string | null
          usuario_id?: string
          valor_abertura?: number
          valor_contado?: number | null
          valor_fechamento?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "caixas_deposito_id_fkey"
            columns: ["deposito_id"]
            isOneToOne: false
            referencedRelation: "depositos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caixas_deposito_id_fkey"
            columns: ["deposito_id"]
            isOneToOne: false
            referencedRelation: "vw_estoque_por_deposito"
            referencedColumns: ["deposito_id"]
          },
          {
            foreignKeyName: "caixas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caixas_terminal_id_fkey"
            columns: ["terminal_id"]
            isOneToOne: false
            referencedRelation: "terminais"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          criado_em: string | null
          empresa_id: string
          id: string
          nome: string
          pai_id: string | null
          path: unknown
        }
        Insert: {
          criado_em?: string | null
          empresa_id: string
          id?: string
          nome: string
          pai_id?: string | null
          path?: unknown
        }
        Update: {
          criado_em?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          pai_id?: string | null
          path?: unknown
        }
        Relationships: [
          {
            foreignKeyName: "categorias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorias_pai_id_fkey"
            columns: ["pai_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          ativo: boolean
          cpf_cnpj: string | null
          criado_em: string
          email: string | null
          empresa_id: string
          endereco: string | null
          id: string
          nome: string
          observacao: string | null
          telefone: string | null
        }
        Insert: {
          ativo?: boolean
          cpf_cnpj?: string | null
          criado_em?: string
          email?: string | null
          empresa_id: string
          endereco?: string | null
          id?: string
          nome: string
          observacao?: string | null
          telefone?: string | null
        }
        Update: {
          ativo?: boolean
          cpf_cnpj?: string | null
          criado_em?: string
          email?: string | null
          empresa_id?: string
          endereco?: string | null
          id?: string
          nome?: string
          observacao?: string | null
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      compra_itens: {
        Row: {
          compra_id: string
          custo_unit: number
          id: string
          produto_id: string
          qtd: number
        }
        Insert: {
          compra_id: string
          custo_unit: number
          id?: string
          produto_id: string
          qtd: number
        }
        Update: {
          compra_id?: string
          custo_unit?: number
          id?: string
          produto_id?: string
          qtd?: number
        }
        Relationships: [
          {
            foreignKeyName: "compra_itens_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "compras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compra_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compra_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_previsao_ruptura"
            referencedColumns: ["produto_id"]
          },
        ]
      }
      compras: {
        Row: {
          criado_em: string | null
          data: string | null
          empresa_id: string
          fornecedor_id: string | null
          id: string
          numero_nota: string | null
          total: number | null
          usuario_id: string | null
        }
        Insert: {
          criado_em?: string | null
          data?: string | null
          empresa_id: string
          fornecedor_id?: string | null
          id?: string
          numero_nota?: string | null
          total?: number | null
          usuario_id?: string | null
        }
        Update: {
          criado_em?: string | null
          data?: string | null
          empresa_id?: string
          fornecedor_id?: string | null
          id?: string
          numero_nota?: string | null
          total?: number | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compras_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      depositos: {
        Row: {
          criado_em: string | null
          empresa_id: string
          id: string
          nome: string
          tipo: string | null
        }
        Insert: {
          criado_em?: string | null
          empresa_id: string
          id?: string
          nome: string
          tipo?: string | null
        }
        Update: {
          criado_em?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "depositos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_config: {
        Row: {
          bloquear_venda_sem_estoque: boolean
          created_at: string
          empresa_id: string
          permitir_estoque_negativo: boolean
          printer_baudrate: number
          printer_codepage: string
          updated_at: string
        }
        Insert: {
          bloquear_venda_sem_estoque?: boolean
          created_at?: string
          empresa_id: string
          permitir_estoque_negativo?: boolean
          printer_baudrate?: number
          printer_codepage?: string
          updated_at?: string
        }
        Update: {
          bloquear_venda_sem_estoque?: boolean
          created_at?: string
          empresa_id?: string
          permitir_estoque_negativo?: boolean
          printer_baudrate?: number
          printer_codepage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresa_config_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          ativa: boolean | null
          cnpj: string | null
          criado_em: string | null
          id: string
          nome: string
          ramo: string | null
        }
        Insert: {
          ativa?: boolean | null
          cnpj?: string | null
          criado_em?: string | null
          id?: string
          nome: string
          ramo?: string | null
        }
        Update: {
          ativa?: boolean | null
          cnpj?: string | null
          criado_em?: string | null
          id?: string
          nome?: string
          ramo?: string | null
        }
        Relationships: []
      }
      estoque: {
        Row: {
          atualizado_em: string | null
          deposito_id: string
          id: string
          produto_id: string
          qtd: number | null
        }
        Insert: {
          atualizado_em?: string | null
          deposito_id: string
          id?: string
          produto_id: string
          qtd?: number | null
        }
        Update: {
          atualizado_em?: string | null
          deposito_id?: string
          id?: string
          produto_id?: string
          qtd?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_deposito_id_fkey"
            columns: ["deposito_id"]
            isOneToOne: false
            referencedRelation: "depositos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_deposito_id_fkey"
            columns: ["deposito_id"]
            isOneToOne: false
            referencedRelation: "vw_estoque_por_deposito"
            referencedColumns: ["deposito_id"]
          },
          {
            foreignKeyName: "estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_previsao_ruptura"
            referencedColumns: ["produto_id"]
          },
        ]
      }
      estoque_saldos: {
        Row: {
          empresa_id: string
          id: string
          local_id: string
          produto_id: string
          saldo: number
          updated_at: string
        }
        Insert: {
          empresa_id: string
          id?: string
          local_id: string
          produto_id: string
          saldo?: number
          updated_at?: string
        }
        Update: {
          empresa_id?: string
          id?: string
          local_id?: string
          produto_id?: string
          saldo?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_saldos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_saldos_local_id_fkey"
            columns: ["local_id"]
            isOneToOne: false
            referencedRelation: "depositos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_saldos_local_id_fkey"
            columns: ["local_id"]
            isOneToOne: false
            referencedRelation: "vw_estoque_por_deposito"
            referencedColumns: ["deposito_id"]
          },
          {
            foreignKeyName: "estoque_saldos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_saldos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_previsao_ruptura"
            referencedColumns: ["produto_id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          cnpj_cpf: string | null
          criado_em: string | null
          email: string | null
          empresa_id: string
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          cnpj_cpf?: string | null
          criado_em?: string | null
          email?: string | null
          empresa_id: string
          id?: string
          nome: string
          telefone?: string | null
        }
        Update: {
          cnpj_cpf?: string | null
          criado_em?: string | null
          email?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fornecedores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario_itens: {
        Row: {
          contagem: number
          criado_em: string
          diferenca: number | null
          id: string
          inventario_id: string
          nome_snapshot: string | null
          produto_id: string
          qtd_contada: number
          qtd_sistema: number | null
        }
        Insert: {
          contagem?: number
          criado_em?: string
          diferenca?: number | null
          id?: string
          inventario_id: string
          nome_snapshot?: string | null
          produto_id: string
          qtd_contada?: number
          qtd_sistema?: number | null
        }
        Update: {
          contagem?: number
          criado_em?: string
          diferenca?: number | null
          id?: string
          inventario_id?: string
          nome_snapshot?: string | null
          produto_id?: string
          qtd_contada?: number
          qtd_sistema?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventario_itens_inventario_id_fkey"
            columns: ["inventario_id"]
            isOneToOne: false
            referencedRelation: "inventarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_previsao_ruptura"
            referencedColumns: ["produto_id"]
          },
        ]
      }
      inventario_snapshot: {
        Row: {
          id: string
          inventario_id: string
          produto_id: string
          qtd_esperada: number
        }
        Insert: {
          id?: string
          inventario_id: string
          produto_id: string
          qtd_esperada?: number
        }
        Update: {
          id?: string
          inventario_id?: string
          produto_id?: string
          qtd_esperada?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventario_snapshot_inventario_id_fkey"
            columns: ["inventario_id"]
            isOneToOne: false
            referencedRelation: "inventarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_snapshot_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_snapshot_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_previsao_ruptura"
            referencedColumns: ["produto_id"]
          },
        ]
      }
      inventarios: {
        Row: {
          aplicado_em: string | null
          criado_em: string
          deposito_id: string
          empresa_id: string
          finalizado_em: string | null
          id: string
          iniciado_em: string | null
          observacao: string | null
          status: string
          usuario_id: string
        }
        Insert: {
          aplicado_em?: string | null
          criado_em?: string
          deposito_id: string
          empresa_id: string
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string | null
          observacao?: string | null
          status?: string
          usuario_id: string
        }
        Update: {
          aplicado_em?: string | null
          criado_em?: string
          deposito_id?: string
          empresa_id?: string
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string | null
          observacao?: string | null
          status?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventarios_deposito_id_fkey"
            columns: ["deposito_id"]
            isOneToOne: false
            referencedRelation: "depositos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventarios_deposito_id_fkey"
            columns: ["deposito_id"]
            isOneToOne: false
            referencedRelation: "vw_estoque_por_deposito"
            referencedColumns: ["deposito_id"]
          },
          {
            foreignKeyName: "inventarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      logs: {
        Row: {
          acao: string | null
          alteracao: Json | null
          data: string | null
          empresa_id: string | null
          id: string
          registro_id: string | null
          tabela: string | null
          usuario_id: string | null
        }
        Insert: {
          acao?: string | null
          alteracao?: Json | null
          data?: string | null
          empresa_id?: string | null
          id?: string
          registro_id?: string | null
          tabela?: string | null
          usuario_id?: string | null
        }
        Update: {
          acao?: string | null
          alteracao?: Json | null
          data?: string | null
          empresa_id?: string | null
          id?: string
          registro_id?: string | null
          tabela?: string | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      movimentacoes: {
        Row: {
          custo_unit: number | null
          data: string | null
          deposito_id: string
          empresa_id: string
          id: string
          observacao: string | null
          origem: string
          produto_id: string
          qtd: number
          ref_id: string | null
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          custo_unit?: number | null
          data?: string | null
          deposito_id: string
          empresa_id: string
          id?: string
          observacao?: string | null
          origem: string
          produto_id: string
          qtd: number
          ref_id?: string | null
          tipo: string
          usuario_id?: string | null
        }
        Update: {
          custo_unit?: number | null
          data?: string | null
          deposito_id?: string
          empresa_id?: string
          id?: string
          observacao?: string | null
          origem?: string
          produto_id?: string
          qtd?: number
          ref_id?: string | null
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_deposito_id_fkey"
            columns: ["deposito_id"]
            isOneToOne: false
            referencedRelation: "depositos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_deposito_id_fkey"
            columns: ["deposito_id"]
            isOneToOne: false
            referencedRelation: "vw_estoque_por_deposito"
            referencedColumns: ["deposito_id"]
          },
          {
            foreignKeyName: "movimentacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_previsao_ruptura"
            referencedColumns: ["produto_id"]
          },
        ]
      }
      movimentacoes_estoque: {
        Row: {
          criado_em: string
          empresa_id: string
          id: string
          local_id: string
          origem: string
          produto_id: string
          quantidade: number
          ref_id: string | null
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          criado_em?: string
          empresa_id: string
          id?: string
          local_id: string
          origem: string
          produto_id: string
          quantidade: number
          ref_id?: string | null
          tipo: string
          usuario_id?: string | null
        }
        Update: {
          criado_em?: string
          empresa_id?: string
          id?: string
          local_id?: string
          origem?: string
          produto_id?: string
          quantidade?: number
          ref_id?: string | null
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_estoque_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_local_id_fkey"
            columns: ["local_id"]
            isOneToOne: false
            referencedRelation: "depositos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_local_id_fkey"
            columns: ["local_id"]
            isOneToOne: false
            referencedRelation: "vw_estoque_por_deposito"
            referencedColumns: ["deposito_id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_previsao_ruptura"
            referencedColumns: ["produto_id"]
          },
        ]
      }
      orcamento_itens: {
        Row: {
          desconto: number | null
          id: string
          nome_snapshot: string | null
          orcamento_id: string
          preco_unit: number
          produto_id: string
          qtd: number
          subtotal: number | null
        }
        Insert: {
          desconto?: number | null
          id?: string
          nome_snapshot?: string | null
          orcamento_id: string
          preco_unit: number
          produto_id: string
          qtd?: number
          subtotal?: number | null
        }
        Update: {
          desconto?: number | null
          id?: string
          nome_snapshot?: string | null
          orcamento_id?: string
          preco_unit?: number
          produto_id?: string
          qtd?: number
          subtotal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_itens_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_previsao_ruptura"
            referencedColumns: ["produto_id"]
          },
        ]
      }
      orcamentos: {
        Row: {
          cliente_id: string | null
          criado_em: string
          desconto: number
          empresa_id: string
          id: string
          observacao: string | null
          status: string
          subtotal: number
          total: number
          usuario_id: string
          validade: string | null
        }
        Insert: {
          cliente_id?: string | null
          criado_em?: string
          desconto?: number
          empresa_id: string
          id?: string
          observacao?: string | null
          status?: string
          subtotal?: number
          total?: number
          usuario_id: string
          validade?: string | null
        }
        Update: {
          cliente_id?: string | null
          criado_em?: string
          desconto?: number
          empresa_id?: string
          id?: string
          observacao?: string | null
          status?: string
          subtotal?: number
          total?: number
          usuario_id?: string
          validade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos: {
        Row: {
          criado_em: string | null
          forma: string
          id: string
          taxa: number
          troco: number | null
          valor: number
          venda_id: string
        }
        Insert: {
          criado_em?: string | null
          forma: string
          id?: string
          taxa?: number
          troco?: number | null
          valor: number
          venda_id: string
        }
        Update: {
          criado_em?: string | null
          forma?: string
          id?: string
          taxa?: number
          troco?: number | null
          valor?: number
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean | null
          categoria_id: string | null
          criado_em: string | null
          custo_medio: number | null
          ean: string | null
          empresa_id: string
          estoque_max: number | null
          estoque_min: number | null
          id: string
          marca: string | null
          nome: string
          preco_venda: number | null
          sku: string | null
          unidade: string | null
        }
        Insert: {
          ativo?: boolean | null
          categoria_id?: string | null
          criado_em?: string | null
          custo_medio?: number | null
          ean?: string | null
          empresa_id: string
          estoque_max?: number | null
          estoque_min?: number | null
          id?: string
          marca?: string | null
          nome: string
          preco_venda?: number | null
          sku?: string | null
          unidade?: string | null
        }
        Update: {
          ativo?: boolean | null
          categoria_id?: string | null
          criado_em?: string | null
          custo_medio?: number | null
          ean?: string | null
          empresa_id?: string
          estoque_max?: number | null
          estoque_min?: number | null
          id?: string
          marca?: string | null
          nome?: string
          preco_venda?: number | null
          sku?: string | null
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean | null
          avatar_url: string | null
          criado_em: string | null
          email: string | null
          empresa_id: string | null
          id: string
          nome: string | null
          ult_acesso: string | null
          user_id: string
        }
        Insert: {
          ativo?: boolean | null
          avatar_url?: string | null
          criado_em?: string | null
          email?: string | null
          empresa_id?: string | null
          id?: string
          nome?: string | null
          ult_acesso?: string | null
          user_id: string
        }
        Update: {
          ativo?: boolean | null
          avatar_url?: string | null
          criado_em?: string | null
          email?: string | null
          empresa_id?: string | null
          id?: string
          nome?: string | null
          ult_acesso?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      terminais: {
        Row: {
          ativo: boolean
          criado_em: string
          deposito_id: string
          empresa_id: string
          id: string
          identificador: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          deposito_id: string
          empresa_id: string
          id?: string
          identificador: string
          nome: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          deposito_id?: string
          empresa_id?: string
          id?: string
          identificador?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "terminais_deposito_id_fkey"
            columns: ["deposito_id"]
            isOneToOne: false
            referencedRelation: "depositos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "terminais_deposito_id_fkey"
            columns: ["deposito_id"]
            isOneToOne: false
            referencedRelation: "vw_estoque_por_deposito"
            referencedColumns: ["deposito_id"]
          },
          {
            foreignKeyName: "terminais_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      transferencia_itens: {
        Row: {
          id: string
          nome_snapshot: string | null
          produto_id: string
          qtd: number
          transferencia_id: string
        }
        Insert: {
          id?: string
          nome_snapshot?: string | null
          produto_id: string
          qtd: number
          transferencia_id: string
        }
        Update: {
          id?: string
          nome_snapshot?: string | null
          produto_id?: string
          qtd?: number
          transferencia_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transferencia_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencia_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_previsao_ruptura"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "transferencia_itens_transferencia_id_fkey"
            columns: ["transferencia_id"]
            isOneToOne: false
            referencedRelation: "transferencias"
            referencedColumns: ["id"]
          },
        ]
      }
      transferencias: {
        Row: {
          confirmado_em: string | null
          confirmado_por: string | null
          criado_em: string
          destino_id: string
          empresa_id: string
          id: string
          observacao: string | null
          origem_id: string
          status: string
          usuario_id: string
        }
        Insert: {
          confirmado_em?: string | null
          confirmado_por?: string | null
          criado_em?: string
          destino_id: string
          empresa_id: string
          id?: string
          observacao?: string | null
          origem_id: string
          status?: string
          usuario_id: string
        }
        Update: {
          confirmado_em?: string | null
          confirmado_por?: string | null
          criado_em?: string
          destino_id?: string
          empresa_id?: string
          id?: string
          observacao?: string | null
          origem_id?: string
          status?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transferencias_destino_id_fkey"
            columns: ["destino_id"]
            isOneToOne: false
            referencedRelation: "depositos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_destino_id_fkey"
            columns: ["destino_id"]
            isOneToOne: false
            referencedRelation: "vw_estoque_por_deposito"
            referencedColumns: ["deposito_id"]
          },
          {
            foreignKeyName: "transferencias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_origem_id_fkey"
            columns: ["origem_id"]
            isOneToOne: false
            referencedRelation: "depositos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_origem_id_fkey"
            columns: ["origem_id"]
            isOneToOne: false
            referencedRelation: "vw_estoque_por_deposito"
            referencedColumns: ["deposito_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      venda_itens: {
        Row: {
          desconto: number | null
          id: string
          nome_snapshot: string | null
          preco_unit: number
          produto_id: string
          qtd: number
          subtotal: number | null
          venda_id: string
        }
        Insert: {
          desconto?: number | null
          id?: string
          nome_snapshot?: string | null
          preco_unit: number
          produto_id: string
          qtd?: number
          subtotal?: number | null
          venda_id: string
        }
        Update: {
          desconto?: number | null
          id?: string
          nome_snapshot?: string | null
          preco_unit?: number
          produto_id?: string
          qtd?: number
          subtotal?: number | null
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venda_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venda_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_previsao_ruptura"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "venda_itens_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas: {
        Row: {
          caixa_id: string | null
          cliente_id: string | null
          data: string | null
          desconto: number | null
          empresa_id: string
          id: string
          status: string | null
          subtotal: number | null
          total: number | null
          usuario_id: string | null
        }
        Insert: {
          caixa_id?: string | null
          cliente_id?: string | null
          data?: string | null
          desconto?: number | null
          empresa_id: string
          id?: string
          status?: string | null
          subtotal?: number | null
          total?: number | null
          usuario_id?: string | null
        }
        Update: {
          caixa_id?: string | null
          cliente_id?: string | null
          data?: string | null
          desconto?: number | null
          empresa_id?: string
          id?: string
          status?: string | null
          subtotal?: number | null
          total?: number | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendas_caixa_id_fkey"
            columns: ["caixa_id"]
            isOneToOne: false
            referencedRelation: "caixas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vw_consumo_medio_diario: {
        Row: {
          consumo_medio_diario: number | null
          dias_com_saida: number | null
          empresa_id: string | null
          produto_id: string | null
          produto_nome: string | null
          total_saidas_30d: number | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_previsao_ruptura"
            referencedColumns: ["produto_id"]
          },
        ]
      }
      vw_estoque_por_deposito: {
        Row: {
          deposito_id: string | null
          deposito_nome: string | null
          deposito_tipo: string | null
          empresa_id: string | null
          num_produtos: number | null
          total_itens: number | null
          valor_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "depositos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_fluxo_caixa_diario: {
        Row: {
          dia: string | null
          empresa_id: string | null
          entradas: number | null
          num_movimentacoes: number | null
          saidas: number | null
          saldo: number | null
        }
        Relationships: [
          {
            foreignKeyName: "caixa_movimentacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_inventario_resumo: {
        Row: {
          empresa_id: string | null
          produtos_estoque_baixo: number | null
          produtos_zerados: number | null
          total_estoque: number | null
          total_produtos: number | null
          valor_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_movimentacoes_diarias: {
        Row: {
          dia: string | null
          empresa_id: string | null
          total_ajustes: number | null
          total_entradas: number | null
          total_movimentacoes: number | null
          total_saidas: number | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_previsao_ruptura: {
        Row: {
          consumo_medio_diario: number | null
          dias_para_ruptura: number | null
          empresa_id: string | null
          estoque_atual: number | null
          estoque_min: number | null
          produto_id: string | null
          produto_nome: string | null
          sku: string | null
          status_estoque: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_produtos_top_movimentados: {
        Row: {
          empresa_id: string | null
          num_movimentacoes: number | null
          produto_id: string | null
          produto_nome: string | null
          total_movimentado: number | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_previsao_ruptura"
            referencedColumns: ["produto_id"]
          },
        ]
      }
    }
    Functions: {
      caixa_fechar: {
        Args: {
          p_caixa_id: string
          p_observacao?: string
          p_valor_contado: number
        }
        Returns: undefined
      }
      caixa_resumo: { Args: { p_caixa_id: string }; Returns: Json }
      ensure_cliente_balcao: { Args: { p_empresa_id: string }; Returns: string }
      finalizar_venda: {
        Args: {
          p_deposito_id: string
          p_desconto: number
          p_empresa_id: string
          p_itens: Json
          p_pagamentos: Json
          p_total: number
          p_usuario_id: string
        }
        Returns: string
      }
      get_user_empresa_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      inventario_aplicar_ajustes: {
        Args: { p_inventario_id: string }
        Returns: undefined
      }
      inventario_count_barcode: {
        Args: {
          p_barcode: string
          p_inventario_id: string
          p_quantidade?: number
        }
        Returns: undefined
      }
      inventario_finalizar: {
        Args: { p_inventario_id: string }
        Returns: undefined
      }
      inventario_iniciar: {
        Args: { p_inventario_id: string }
        Returns: undefined
      }
      inventario_iniciar_recontagem: {
        Args: { p_inventario_id: string }
        Returns: number
      }
      pdv_finalizar_venda:
        | {
            Args: {
              p_caixa_id: string
              p_cliente_id: string
              p_deposito_id: string
              p_desconto: number
              p_empresa_id: string
              p_itens: Json
              p_local_id: string
              p_pagamentos: Json
              p_subtotal: number
              p_total: number
            }
            Returns: string
          }
        | {
            Args: {
              p_caixa_id: string
              p_cliente_id: string
              p_deposito_id: string
              p_desconto: number
              p_empresa_id: string
              p_itens: Json
              p_pagamentos: Json
              p_subtotal: number
              p_total: number
            }
            Returns: string
          }
      text2ltree: { Args: { "": string }; Returns: unknown }
      transferencia_cancelar: {
        Args: { p_transferencia_id: string }
        Returns: undefined
      }
      transferencia_confirmar: {
        Args: { p_transferencia_id: string }
        Returns: undefined
      }
      transferencia_criar: {
        Args: {
          p_destino_id: string
          p_empresa_id: string
          p_imediata?: boolean
          p_itens: Json
          p_observacao?: string
          p_origem_id: string
        }
        Returns: string
      }
      transferencia_enviar: {
        Args: { p_transferencia_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "Admin" | "Gerente" | "Operador" | "View"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["Admin", "Gerente", "Operador", "View"],
    },
  },
} as const
