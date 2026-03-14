import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  WifiOff, Wifi, Plus, Trash2, ScanBarcode, Upload, CheckCircle,
  PackageSearch,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useOnlineStatus,
  listarInventariosOffline,
  criarInventarioOffline,
  deletarInventarioOffline,
  type OfflineInventario,
} from '@/lib/offline';

export default function InventarioOffline() {
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const [inventarios, setInventarios] = useState<OfflineInventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNovo, setShowNovo] = useState(false);
  const [descricao, setDescricao] = useState('');

  const loadData = async () => {
    const data = await listarInventariosOffline();
    setInventarios(data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleCriar = async () => {
    if (!descricao.trim()) { toast.error('Digite uma descrição'); return; }
    const inv = await criarInventarioOffline(descricao.trim());
    setShowNovo(false);
    setDescricao('');
    navigate(`/inventario-offline/${inv.id}`);
  };

  const handleDeletar = async (id: string) => {
    await deletarInventarioOffline(id);
    toast.success('Inventário removido');
    loadData();
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
            <ScanBarcode className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-foreground">Inventário Offline</h1>
            <p className="text-xs text-muted-foreground">Contagem por bipagem — funciona sem internet</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn(
            'gap-1.5',
            online ? 'text-success border-success/30' : 'text-destructive border-destructive/30'
          )}>
            {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {online ? 'Online' : 'Offline'}
          </Badge>

          <Button onClick={() => setShowNovo(true)} className="gap-1.5">
            <Plus className="w-4 h-4" /> Nova Contagem
          </Button>

          <Button variant="outline" onClick={() => navigate('/dashboard')} size="sm">
            Voltar
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="p-4 space-y-3 max-w-2xl mx-auto">
        {loading ? (
          <p className="text-center text-muted-foreground animate-pulse py-12">Carregando…</p>
        ) : inventarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <PackageSearch className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Nenhuma contagem offline.</p>
            <p className="text-xs text-muted-foreground mt-1">Crie uma nova contagem para bipar produtos sem internet.</p>
            <Button onClick={() => setShowNovo(true)} className="mt-4 gap-1.5">
              <Plus className="w-4 h-4" /> Nova Contagem
            </Button>
          </div>
        ) : (
          inventarios.map(inv => (
            <Card
              key={inv.id}
              className="bg-card shadow-card cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/inventario-offline/${inv.id}`)}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-foreground truncate">{inv.descricao}</h3>
                      {inv.sincronizado ? (
                        <Badge className="bg-success/10 text-success border-success/20 gap-1 text-xs shrink-0">
                          <CheckCircle className="w-3 h-3" /> Sincronizado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs shrink-0 gap-1">
                          <Upload className="w-3 h-3" /> Pendente
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(inv.criadoEm)} · {inv.itens.length} SKUs · {inv.itens.reduce((s, i) => s + i.qtd, 0)} un
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletar(inv.id);
                    }}
                    className="text-destructive/60 hover:text-destructive hover:bg-destructive/10 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showNovo} onOpenChange={setShowNovo}>
        <DialogContent className="bg-card max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova Contagem Offline</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Os dados ficam salvos no celular. Sincronize depois quando tiver internet.
            </p>
            <Input
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Ex.: Contagem Loja Centro 14/03"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleCriar()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNovo(false)}>Cancelar</Button>
            <Button onClick={handleCriar} className="gap-1.5">
              <ScanBarcode className="w-4 h-4" /> Iniciar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
