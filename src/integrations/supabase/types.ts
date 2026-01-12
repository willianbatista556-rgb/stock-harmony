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
            foreignKeyName: "estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
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
      vendas: {
        Row: {
          data: string | null
          empresa_id: string
          id: string
          total: number | null
          usuario_id: string | null
        }
        Insert: {
          data?: string | null
          empresa_id: string
          id?: string
          total?: number | null
          usuario_id?: string | null
        }
        Update: {
          data?: string | null
          empresa_id?: string
          id?: string
          total?: number | null
          usuario_id?: string | null
        }
        Relationships: [
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
      [_ in never]: never
    }
    Functions: {
      get_user_empresa_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      text2ltree: { Args: { "": string }; Returns: unknown }
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
