import type { Composicao, GrupoComposicao, LigacaoComposicao, Peca } from '../types'

/**
 * Organograma das peças: índices e consultas sobre a composição (quem faz parte de quem).
 * Os nós são referências de material, "id:<id>" (registos sem referência) ou ids de grupos ("G-…").
 */

/** Chave de uma peça no organograma (a referência, para valer em todas as posições do mesmo material). */
export function chavePeca(p: Pick<Peca, 'id' | 'referencia'>): string {
  return p.referencia ?? `id:${p.id}`
}

export const ehGrupo = (chave: string) => chave.startsWith('G-')

export interface IndiceComposicao {
  grupos: Map<string, GrupoComposicao>
  pecasPorChave: Map<string, Peca[]>
  filhos: Map<string, LigacaoComposicao[]>
  pais: Map<string, LigacaoComposicao[]>
}

export function indexar(c: Composicao, pecas: Peca[]): IndiceComposicao {
  const pecasPorChave = new Map<string, Peca[]>()
  for (const p of pecas) {
    const k = chavePeca(p)
    const l = pecasPorChave.get(k) ?? []
    l.push(p)
    pecasPorChave.set(k, l)
  }
  const filhos = new Map<string, LigacaoComposicao[]>()
  const pais = new Map<string, LigacaoComposicao[]>()
  for (const l of c.ligacoes) {
    filhos.set(l.pai, [...(filhos.get(l.pai) ?? []), l])
    pais.set(l.filho, [...(pais.get(l.filho) ?? []), l])
  }
  return { grupos: new Map(c.grupos.map((g) => [g.id, g])), pecasPorChave, filhos, pais }
}

/** Nome legível de um nó. */
export function nomeNo(chave: string, idx: IndiceComposicao): string {
  const g = idx.grupos.get(chave)
  if (g) return g.nome
  const p = idx.pecasPorChave.get(chave)?.[0]
  return p?.nome ?? p?.referencia ?? chave
}

/** O nó e tudo o que está por baixo dele. */
export function descendentes(chave: string, idx: IndiceComposicao): Set<string> {
  const vistos = new Set<string>()
  const pilha = [chave]
  while (pilha.length) {
    const k = pilha.pop()!
    if (vistos.has(k)) continue
    vistos.add(k)
    for (const l of idx.filhos.get(k) ?? []) pilha.push(l.filho)
  }
  return vistos
}

/** Nós de topo acima de um nó (ele próprio, se não fizer parte de nada). */
export function raizesDe(chave: string, idx: IndiceComposicao): string[] {
  const raizes = new Set<string>()
  const vistos = new Set<string>()
  const pilha = [chave]
  while (pilha.length) {
    const k = pilha.pop()!
    if (vistos.has(k)) continue
    vistos.add(k)
    const ps = idx.pais.get(k) ?? []
    if (ps.length === 0) raizes.add(k)
    for (const l of ps) pilha.push(l.pai)
  }
  return [...raizes]
}

/** Todos os nós de topo que têm alguma coisa por baixo. */
export function raizes(idx: IndiceComposicao): string[] {
  const r = new Set<string>()
  for (const pai of idx.filhos.keys()) if (!idx.pais.has(pai)) r.add(pai)
  // grupos ainda vazios também aparecem (para se poder começar a preenchê-los)
  for (const g of idx.grupos.keys()) if (!idx.pais.has(g)) r.add(g)
  return [...r].sort((a, b) => nomeNo(a, idx).localeCompare(nomeNo(b, idx), 'pt', { numeric: true }))
}

/** true se ligar `filho` por baixo de `pai` criaria um ciclo (o pai já está por baixo do filho). */
export function criaCiclo(pai: string, filho: string, idx: IndiceComposicao): boolean {
  return pai === filho || descendentes(filho, idx).has(pai)
}

export function novoIdGrupo(c: Composicao): string {
  const ids = new Set(c.grupos.map((g) => g.id))
  for (let i = c.grupos.length + 1; ; i++) {
    const id = `G-${String(i).padStart(3, '0')}`
    if (!ids.has(id)) return id
  }
}

/** Remove um nó e as suas ligações (as peças em si não são apagadas). */
export function removerGrupo(c: Composicao, id: string): Composicao {
  return { grupos: c.grupos.filter((g) => g.id !== id), ligacoes: c.ligacoes.filter((l) => l.pai !== id && l.filho !== id) }
}
