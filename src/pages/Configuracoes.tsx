import { Settings, ShieldCheck, PackageMinus, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useEmpresaConfig, useUpdateEmpresaConfig } from '@/hooks/useEmpresaConfig';
import { toast } from 'sonner';

export default function Configuracoes() {
  const { userRole } = useAuth();
  const { data: config, isLoading } = useEmpresaConfig();
  const updateConfig = useUpdateEmpresaConfig();

  const isAdmin = userRole?.role === 'Admin';

  const handleToggle = (field: 'bloquear_venda_sem_estoque' | 'permitir_estoque_negativo', value: boolean) => {
    updateConfig.mutate(
      { [field]: value },
      {
        onSuccess: () => toast.success('Configuração salva'),
        onError: (err) => toast.error(`Erro ao salvar: ${err.message}`),
      }
    );
  };

  if (!isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-2">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
            <CardTitle className="text-xl">Acesso restrito</CardTitle>
            <CardDescription>
              Somente administradores podem alterar as configurações da empresa.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-8 space-y-8 max-w-3xl">
      {/* Page header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">
              Configurações
            </h1>
            <p className="text-sm text-muted-foreground">
              Gerencie as regras de operação da empresa
            </p>
          </div>
        </div>
      </div>

      {/* Stock rules card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Controle de Estoque</CardTitle>
          </div>
          <CardDescription>
            Defina como o sistema deve lidar com vendas quando o estoque é insuficiente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Toggle 1: bloquear venda sem estoque */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1 flex-1">
              <Label htmlFor="bloquear" className="text-sm font-semibold text-foreground">
                Bloquear venda sem estoque
              </Label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Impede a finalização de vendas quando o produto não possui estoque suficiente no depósito.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant={config?.bloquear_venda_sem_estoque ? 'default' : 'secondary'}
                className="text-[10px] uppercase tracking-wider font-bold"
              >
                {config?.bloquear_venda_sem_estoque ? 'Ativo' : 'Inativo'}
              </Badge>
              <Switch
                id="bloquear"
                checked={config?.bloquear_venda_sem_estoque ?? true}
                onCheckedChange={(v) => handleToggle('bloquear_venda_sem_estoque', v)}
                disabled={updateConfig.isPending}
              />
            </div>
          </div>

          <Separator />

          {/* Toggle 2: permitir estoque negativo */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="negativo" className="text-sm font-semibold text-foreground">
                  Permitir estoque negativo
                </Label>
                <PackageMinus className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Permite que o estoque fique abaixo de zero após uma venda. Requer que o bloqueio esteja ativo.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant={config?.permitir_estoque_negativo ? 'default' : 'secondary'}
                className="text-[10px] uppercase tracking-wider font-bold"
              >
                {config?.permitir_estoque_negativo ? 'Ativo' : 'Inativo'}
              </Badge>
              <Switch
                id="negativo"
                checked={config?.permitir_estoque_negativo ?? false}
                onCheckedChange={(v) => handleToggle('permitir_estoque_negativo', v)}
                disabled={updateConfig.isPending || !config?.bloquear_venda_sem_estoque}
              />
            </div>
          </div>

          {!config?.bloquear_venda_sem_estoque && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
              <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
              <p className="text-xs text-warning-foreground leading-relaxed">
                Com o bloqueio desativado, vendas serão permitidas mesmo sem estoque disponível. O controle ficará apenas no nível do banco de dados (RPC).
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
