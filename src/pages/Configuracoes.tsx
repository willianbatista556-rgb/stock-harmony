import { useState, useEffect } from 'react';
import { Settings, ShieldCheck, PackageMinus, AlertTriangle, Loader2, Building2, Save, Printer, Crown, Users, Warehouse as WarehouseIcon, Package, Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useEmpresaConfig, useUpdateEmpresaConfig } from '@/hooks/useEmpresaConfig';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/useSubscription';
import { Progress } from '@/components/ui/progress';

export default function Configuracoes() {
  const { userRole, profile } = useAuth();
  const { data: config, isLoading } = useEmpresaConfig();
  const updateConfig = useUpdateEmpresaConfig();
  const queryClient = useQueryClient();
  const { subscription, limits, usage, isLoading: isLoadingSub } = useSubscription();

  // Empresa data
  const { data: empresa, isLoading: isLoadingEmpresa } = useQuery({
    queryKey: ['empresa', profile?.empresa_id],
    queryFn: async () => {
      if (!profile?.empresa_id) return null;
      const { data, error } = await supabase
        .from('empresas')
        .select('id, nome, cnpj, ramo')
        .eq('id', profile.empresa_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.empresa_id,
  });

  const [empresaForm, setEmpresaForm] = useState({ nome: '', cnpj: '', ramo: '' });
  const [empresaDirty, setEmpresaDirty] = useState(false);

  useEffect(() => {
    if (empresa) {
      setEmpresaForm({
        nome: empresa.nome || '',
        cnpj: empresa.cnpj || '',
        ramo: empresa.ramo || '',
      });
      setEmpresaDirty(false);
    }
  }, [empresa]);

  const updateEmpresa = useMutation({
    mutationFn: async (values: { nome: string; cnpj: string; ramo: string }) => {
      if (!profile?.empresa_id) throw new Error('Empresa não encontrada');
      const { error } = await supabase
        .from('empresas')
        .update({ nome: values.nome, cnpj: values.cnpj || null, ramo: values.ramo || null })
        .eq('id', profile.empresa_id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Dados da empresa salvos');
      queryClient.invalidateQueries({ queryKey: ['empresa'] });
      setEmpresaDirty(false);
    },
    onError: (err: Error) => toast.error(`Erro ao salvar: ${err.message}`),
  });

  const handleEmpresaChange = (field: string, value: string) => {
    setEmpresaForm((prev) => ({ ...prev, [field]: value }));
    setEmpresaDirty(true);
  };

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

  const handlePrinterChange = (field: 'printer_codepage' | 'printer_baudrate', value: string | number) => {
    updateConfig.mutate(
      { [field]: value } as any,
      {
        onSuccess: () => toast.success('Configuração de impressora salva'),
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

      {/* Empresa data card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Dados da Empresa</CardTitle>
          </div>
          <CardDescription>
            Informações cadastrais da empresa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingEmpresa ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="emp-nome" className="text-sm font-semibold">Nome da Empresa</Label>
                <Input
                  id="emp-nome"
                  value={empresaForm.nome}
                  onChange={(e) => handleEmpresaChange('nome', e.target.value)}
                  placeholder="Nome da empresa"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emp-cnpj" className="text-sm font-semibold">CNPJ</Label>
                  <Input
                    id="emp-cnpj"
                    value={empresaForm.cnpj}
                    onChange={(e) => handleEmpresaChange('cnpj', e.target.value)}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emp-ramo" className="text-sm font-semibold">Ramo de Atividade</Label>
                  <Select
                    value={empresaForm.ramo}
                    onValueChange={(v) => handleEmpresaChange('ramo', v)}
                  >
                    <SelectTrigger id="emp-ramo">
                      <SelectValue placeholder="Selecione o ramo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comércio">Comércio</SelectItem>
                      <SelectItem value="serviços">Serviços</SelectItem>
                      <SelectItem value="alimentação">Alimentação</SelectItem>
                      <SelectItem value="indústria">Indústria</SelectItem>
                      <SelectItem value="e-commerce">E-commerce</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => updateEmpresa.mutate(empresaForm)}
                  disabled={!empresaDirty || !empresaForm.nome.trim() || updateEmpresa.isPending}
                  size="sm"
                >
                  {updateEmpresa.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

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

      {/* Printer config card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Impressora Térmica</CardTitle>
          </div>
          <CardDescription>
            Configure a comunicação com a impressora térmica ESC/POS.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="codepage" className="text-sm font-semibold">Codepage</Label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Define a tabela de caracteres para acentos. Use CP860 para impressoras brasileiras antigas.
              </p>
              <Select
                value={config?.printer_codepage ?? 'utf8'}
                onValueChange={(v) => handlePrinterChange('printer_codepage', v)}
                disabled={updateConfig.isPending}
              >
                <SelectTrigger id="codepage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="utf8">UTF-8 (modernas)</SelectItem>
                  <SelectItem value="cp860">CP860 (pt-BR clássico)</SelectItem>
                  <SelectItem value="cp858">CP858 (europeu + €)</SelectItem>
                  <SelectItem value="cp437">CP437 (DOS padrão)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="baudrate" className="text-sm font-semibold">Baudrate</Label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Velocidade de comunicação serial. 9600 é o mais comum.
              </p>
              <Select
                value={String(config?.printer_baudrate ?? 9600)}
                onValueChange={(v) => handlePrinterChange('printer_baudrate', parseInt(v))}
                disabled={updateConfig.isPending}
              >
                <SelectTrigger id="baudrate">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9600">9600</SelectItem>
                  <SelectItem value="19200">19200</SelectItem>
                  <SelectItem value="38400">38400</SelectItem>
                  <SelectItem value="115200">115200</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan & Subscription card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Plano & Assinatura</CardTitle>
          </div>
          <CardDescription>
            Veja seu plano atual, limites e uso.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoadingSub ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : subscription && limits && usage ? (
            <>
              {/* Current plan */}
              <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                  <Crown className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-lg text-foreground">{subscription.plan.nome}</p>
                  <p className="text-sm text-muted-foreground">{subscription.plan.descricao}</p>
                </div>
                {subscription.plan.preco_mensal > 0 && (
                  <div className="text-right">
                    <p className="font-bold text-lg text-foreground">
                      R$ {subscription.plan.preco_mensal.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">/mês</p>
                  </div>
                )}
                {subscription.plan.preco_mensal === 0 && (
                  <Badge variant="secondary" className="text-xs">GRÁTIS</Badge>
                )}
              </div>

              {/* Usage meters */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-foreground">Uso atual</h4>
                
                {[
                  { icon: Users, label: 'Usuários', current: usage.usuarios, max: limits.max_usuarios },
                  { icon: WarehouseIcon, label: 'Filiais', current: usage.filiais, max: limits.max_filiais },
                  { icon: Package, label: 'Produtos', current: usage.produtos, max: limits.max_produtos },
                ].map((item) => {
                  const pct = Math.min(100, (item.current / item.max) * 100);
                  const isNearLimit = pct >= 80;
                  return (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <item.icon className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{item.label}</span>
                        </div>
                        <span className={cn(
                          "font-mono text-xs font-bold",
                          isNearLimit ? "text-warning" : "text-muted-foreground"
                        )}>
                          {item.current} / {item.max >= 9999 ? '∞' : item.max}
                        </span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  );
                })}
              </div>

              <Separator />

              {/* Module access */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Módulos inclusos</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'mod_pdv', label: 'PDV' },
                    { key: 'mod_financeiro', label: 'Financeiro' },
                    { key: 'mod_inventario', label: 'Inventário' },
                    { key: 'mod_transferencias', label: 'Transferências' },
                    { key: 'mod_relatorios', label: 'Relatórios' },
                    { key: 'mod_dre', label: 'DRE' },
                    { key: 'mod_bi', label: 'BI / Analytics' },
                    { key: 'mod_api', label: 'API' },
                    { key: 'mod_integracoes', label: 'Integrações' },
                  ].map((mod) => {
                    const enabled = !!(limits as any)[mod.key];
                    return (
                      <div key={mod.key} className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
                        enabled ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                      )}>
                        {enabled ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        <span className="font-medium">{mod.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum plano encontrado.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
