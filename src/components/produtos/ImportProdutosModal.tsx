import { useState, useCallback, useMemo } from 'react';
import {
  Upload, FileSpreadsheet, AlertTriangle, CheckCircle, X,
  ArrowRight, Loader2, Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import {
  parseFile,
  mapRowsToProducts,
  autoDetectColumnMap,
  type ParsedProduct,
} from '@/lib/import/product-parser';

type Step = 'upload' | 'mapping' | 'preview' | 'importing' | 'done';

const FIELD_LABELS: Record<string, string> = {
  nome: 'Nome *',
  sku: 'SKU / Código',
  ean: 'EAN / Código de Barras',
  marca: 'Marca',
  unidade: 'Unidade',
  custo_medio: 'Custo',
  preco_venda: 'Preço de Venda',
  estoque_min: 'Estoque Mínimo',
  tamanho: 'Tamanho',
  cor: 'Cor',
};

const FIELDS = Object.keys(FIELD_LABELS);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportProdutosModal({ open, onOpenChange }: Props) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>('upload');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<any[][]>([]);
  const [colMap, setColMap] = useState<Record<string, number>>({});
  const [products, setProducts] = useState<ParsedProduct[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; errors: number } | null>(null);

  const reset = () => {
    setStep('upload');
    setHeaders([]);
    setRows([]);
    setColMap({});
    setProducts([]);
    setResult(null);
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  // Step 1: File upload
  const handleFile = useCallback(async (file: File) => {
    try {
      const { headers: h, rows: r } = await parseFile(file);
      setHeaders(h);
      setRows(r);

      const autoMap = autoDetectColumnMap(h);
      setColMap(autoMap);

      // If nome was auto-detected, skip to preview
      if (autoMap.nome !== undefined) {
        const mapped = mapRowsToProducts(h, r, autoMap);
        setProducts(mapped);
        setStep('preview');
      } else {
        setStep('mapping');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar arquivo');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // Step 2: Column mapping
  const handleMapChange = (field: string, colIdx: string) => {
    setColMap(prev => {
      const next = { ...prev };
      if (colIdx === '-1') {
        delete next[field];
      } else {
        next[field] = parseInt(colIdx);
      }
      return next;
    });
  };

  const applyMapping = () => {
    if (colMap.nome === undefined) {
      toast.error('Mapeie pelo menos a coluna "Nome"');
      return;
    }
    const mapped = mapRowsToProducts(headers, rows, colMap);
    setProducts(mapped);
    setStep('preview');
  };

  // Step 3: Preview stats
  const validProducts = useMemo(() =>
    products.filter(p => p._errors.length === 0),
    [products]
  );
  const errorProducts = useMemo(() =>
    products.filter(p => p._errors.length > 0),
    [products]
  );

  // Step 4: Import
  const handleImport = async () => {
    if (!profile?.empresa_id) { toast.error('Empresa não encontrada'); return; }

    setStep('importing');
    setImporting(true);

    let inserted = 0;
    let errors = 0;
    const BATCH_SIZE = 50;

    const toInsert = validProducts.map(p => ({
      empresa_id: profile.empresa_id!,
      nome: p.nome,
      sku: p.sku,
      ean: p.ean,
      marca: p.marca,
      unidade: p.unidade || 'UN',
      custo_medio: p.custo_medio ?? 0,
      preco_venda: p.preco_venda,
      estoque_min: p.estoque_min ?? 0,
      tamanho: p.tamanho,
      cor: p.cor,
      ativo: true,
    }));

    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('produtos').insert(batch);

      if (error) {
        errors += batch.length;
        console.error('Batch insert error:', error);
      } else {
        inserted += batch.length;
      }
    }

    setResult({ inserted, errors });
    setImporting(false);
    setStep('done');
    queryClient.invalidateQueries({ queryKey: ['produtos'] });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Importar Produtos
            {step !== 'upload' && step !== 'done' && (
              <Badge variant="outline" className="ml-2 text-xs">
                {step === 'mapping' ? '2/4 Mapeamento' : step === 'preview' ? '3/4 Prévia' : '4/4 Importando'}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => document.getElementById('import-file-input')?.click()}
            >
              <input
                id="import-file-input"
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleInputChange}
              />
              <Upload className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-foreground font-medium mb-1">
                Arraste um arquivo CSV ou Excel aqui
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                ou clique para selecionar
              </p>
              <Badge variant="outline" className="text-xs">.csv .xlsx .xls</Badge>

              <div className="mt-6 text-left bg-muted/50 rounded-lg p-4 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Colunas aceitas:</p>
                <p>Nome*, SKU, EAN, Marca, Unidade, Custo, Preço Venda, Estoque Mín, Tamanho, Cor</p>
                <p className="mt-2">O sistema detecta as colunas automaticamente pelo cabeçalho.</p>
              </div>
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Não conseguimos detectar todas as colunas automaticamente.
                Mapeie cada campo para a coluna correspondente do arquivo.
              </p>

              <div className="space-y-3">
                {FIELDS.map(field => (
                  <div key={field} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-36 shrink-0">
                      {FIELD_LABELS[field]}
                    </span>
                    <Select
                      value={colMap[field] !== undefined ? String(colMap[field]) : '-1'}
                      onValueChange={v => handleMapChange(field, v)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Ignorar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="-1">— Ignorar —</SelectItem>
                        {headers.map((h, i) => (
                          <SelectItem key={i} value={String(i)}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                Amostra da 1ª linha: {rows[0]?.slice(0, 5).join(' | ')}…
              </p>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge className="bg-success/10 text-success border-success/20 gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {validProducts.length} válidos
                </Badge>
                {errorProducts.length > 0 && (
                  <Badge className="bg-destructive/10 text-destructive border-destructive/20 gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {errorProducts.length} com erros
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  Total: {products.length} linhas
                </span>
              </div>

              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>EAN</TableHead>
                      <TableHead className="text-right">Preço</TableHead>
                      <TableHead className="w-20">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.slice(0, 20).map((p, i) => (
                      <TableRow key={i} className={cn(p._errors.length > 0 && 'bg-destructive/5')}>
                        <TableCell className="text-xs text-muted-foreground">{p._rowIndex}</TableCell>
                        <TableCell className="font-medium text-sm truncate max-w-[200px]">{p.nome}</TableCell>
                        <TableCell className="text-xs font-mono">{p.sku || '—'}</TableCell>
                        <TableCell className="text-xs font-mono">{p.ean || '—'}</TableCell>
                        <TableCell className="text-right text-sm font-mono">
                          {p.preco_venda ? `R$ ${p.preco_venda.toFixed(2)}` : '—'}
                        </TableCell>
                        <TableCell>
                          {p._errors.length > 0 ? (
                            <Badge variant="destructive" className="text-xs">{p._errors[0]}</Badge>
                          ) : (
                            <CheckCircle className="w-4 h-4 text-success" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {products.length > 20 && (
                <p className="text-xs text-muted-foreground text-center">
                  Mostrando 20 de {products.length} linhas
                </p>
              )}
            </div>
          )}

          {/* Step 4: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-foreground font-medium">Importando {validProducts.length} produtos…</p>
              <p className="text-xs text-muted-foreground">Isso pode levar alguns segundos.</p>
            </div>
          )}

          {/* Step 5: Done */}
          {step === 'done' && result && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <CheckCircle className="w-12 h-12 text-success" />
              <div className="text-center">
                <p className="text-lg font-display font-bold text-foreground">Importação concluída!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {result.inserted} produtos importados
                  {result.errors > 0 && `, ${result.errors} com erro`}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between gap-2">
          {step === 'mapping' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>Voltar</Button>
              <Button onClick={applyMapping} className="gap-1.5">
                Continuar <ArrowRight className="w-4 h-4" />
              </Button>
            </>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('mapping')}>Ajustar Colunas</Button>
              <Button
                onClick={handleImport}
                disabled={validProducts.length === 0}
                className="gap-1.5"
              >
                Importar {validProducts.length} produtos <ArrowRight className="w-4 h-4" />
              </Button>
            </>
          )}
          {step === 'done' && (
            <Button onClick={handleClose} className="w-full">Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
