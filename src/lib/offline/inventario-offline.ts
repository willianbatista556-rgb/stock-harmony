/**
 * Offline inventory storage using IndexedDB (idb-keyval).
 * Stores counting data locally and syncs when back online.
 */
import { get, set, del, keys } from 'idb-keyval';

export interface OfflineContagemItem {
  ean: string;
  nome: string;
  produtoId: string | null; // null if product not found locally
  qtd: number;
  timestamp: number;
}

export interface OfflineInventario {
  id: string; // local UUID
  criadoEm: number;
  descricao: string;
  itens: OfflineContagemItem[];
  sincronizado: boolean;
  sincronizadoEm?: number;
}

const INVENTARIOS_KEY_PREFIX = 'offline-inv-';

function invKey(id: string) {
  return `${INVENTARIOS_KEY_PREFIX}${id}`;
}

export async function criarInventarioOffline(descricao: string): Promise<OfflineInventario> {
  const inv: OfflineInventario = {
    id: crypto.randomUUID(),
    criadoEm: Date.now(),
    descricao,
    itens: [],
    sincronizado: false,
  };
  await set(invKey(inv.id), inv);
  return inv;
}

export async function getInventarioOffline(id: string): Promise<OfflineInventario | null> {
  return (await get(invKey(id))) ?? null;
}

export async function listarInventariosOffline(): Promise<OfflineInventario[]> {
  const allKeys = await keys();
  const invKeys = allKeys.filter(k => String(k).startsWith(INVENTARIOS_KEY_PREFIX));
  const results: OfflineInventario[] = [];
  for (const k of invKeys) {
    const inv = await get(k);
    if (inv) results.push(inv as OfflineInventario);
  }
  return results.sort((a, b) => b.criadoEm - a.criadoEm);
}

export async function adicionarItemOffline(
  invId: string,
  item: Omit<OfflineContagemItem, 'timestamp'>
): Promise<OfflineInventario | null> {
  const inv = await getInventarioOffline(invId);
  if (!inv) return null;

  // Find existing item by EAN — additive counting
  const existing = inv.itens.find(i => i.ean === item.ean);
  if (existing) {
    existing.qtd += item.qtd;
    existing.timestamp = Date.now();
  } else {
    inv.itens.push({ ...item, timestamp: Date.now() });
  }

  await set(invKey(invId), inv);
  return inv;
}

export async function atualizarQtdItemOffline(
  invId: string,
  ean: string,
  qtd: number
): Promise<OfflineInventario | null> {
  const inv = await getInventarioOffline(invId);
  if (!inv) return null;

  const item = inv.itens.find(i => i.ean === ean);
  if (item) {
    item.qtd = qtd;
    item.timestamp = Date.now();
  }

  await set(invKey(invId), inv);
  return inv;
}

export async function removerItemOffline(
  invId: string,
  ean: string
): Promise<OfflineInventario | null> {
  const inv = await getInventarioOffline(invId);
  if (!inv) return null;

  inv.itens = inv.itens.filter(i => i.ean !== ean);
  await set(invKey(invId), inv);
  return inv;
}

export async function marcarSincronizado(invId: string): Promise<void> {
  const inv = await getInventarioOffline(invId);
  if (!inv) return;
  inv.sincronizado = true;
  inv.sincronizadoEm = Date.now();
  await set(invKey(invId), inv);
}

export async function deletarInventarioOffline(invId: string): Promise<void> {
  await del(invKey(invId));
}
