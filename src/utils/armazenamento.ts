/**
 * Armazenamento maior no navegador (IndexedDB), para dados que não cabem bem no localStorage
 * (ex.: uma lista de materiais importada, com ~2000 registos). Fica só neste navegador.
 */
const BD = 'armazem3d'
const LOJA = 'dados'

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const pedido = indexedDB.open(BD, 1)
    pedido.onupgradeneeded = () => pedido.result.createObjectStore(LOJA)
    pedido.onsuccess = () => resolve(pedido.result)
    pedido.onerror = () => reject(pedido.error)
  })
}

async function operacao<T>(modo: IDBTransactionMode, fazer: (loja: IDBObjectStore) => IDBRequest): Promise<T> {
  const bd = await abrir()
  return new Promise<T>((resolve, reject) => {
    const pedido = fazer(bd.transaction(LOJA, modo).objectStore(LOJA))
    pedido.onsuccess = () => resolve(pedido.result as T)
    pedido.onerror = () => reject(pedido.error)
  }).finally(() => bd.close())
}

export async function lerGrande<T>(chave: string): Promise<T | null> {
  try {
    return (await operacao<T | undefined>('readonly', (l) => l.get(chave))) ?? null
  } catch {
    return null
  }
}

export const gravarGrande = (chave: string, valor: unknown) => operacao<IDBValidKey>('readwrite', (l) => l.put(valor, chave))
export const apagarGrande = (chave: string) => operacao<undefined>('readwrite', (l) => l.delete(chave))
