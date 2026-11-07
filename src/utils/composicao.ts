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

export interface Disponibilidade {
  /** Unidades necessárias para montar/reparar `unidades` do nó de topo. */
  necessario: number
  /** true se alguma quantidade no caminho está por confirmar (contou como 1). */
  incerto: boolean
  /** Stock total do material (todas as posições), ou null se por confirmar. */
  stock: number | null
  estado: 'ok' | 'falta' | 'sem-dados'
}

/**
 * Para cada peça por baixo de `topo`, quantas são precisas para `unidades` e se há stock.
 * Quantidades por confirmar contam como 1 (e ficam marcadas como incertas).
 */
export function disponibilidade(topo: string, idx: IndiceComposicao, unidades = 1): Map<string, Disponibilidade> {
  const nec = new Map<string, { necessario: number; incerto: boolean }>()
  const visitar = (k: string, mult: number, incerto: boolean, caminho: Set<string>) => {
    for (const l of idx.filhos.get(k) ?? []) {
      if (caminho.has(l.filho)) continue
      const q = l.quantidade ?? null
      const m = mult * (q ?? 1)
      const inc = incerto || q === null
      const atual = nec.get(l.filho) ?? { necessario: 0, incerto: false }
      nec.set(l.filho, { necessario: atual.necessario + m, incerto: atual.incerto || inc })
      visitar(l.filho, m, inc, new Set(caminho).add(l.filho))
    }
  }
  visitar(topo, unidades, false, new Set([topo]))
  const r = new Map<string, Disponibilidade>()
  for (const [k, n] of nec) {
    if (ehGrupo(k)) continue
    const pecas = idx.pecasPorChave.get(k) ?? []
    const stock = pecas.length === 0 || pecas.every((p) => p.quantidade === null) ? null : pecas.reduce((s, p) => s + (p.quantidade ?? 0), 0)
    r.set(k, { ...n, stock, estado: stock === null ? 'sem-dados' : stock >= n.necessario ? 'ok' : 'falta' })
  }
  return r
}

export interface LinhaComposicao {
  n: number
  pai: string
  filho: string
  quantidade: string
  tipoPai: string
}

export interface ResultadoFolhaComposicao {
  composicao: Composicao
  novas: number
  atualizadas: number
  gruposNovos: string[]
  erros: string[]
}

/** Lê CSV (separado por ";" ou ",") para linhas simples; a primeira linha é o cabeçalho. */
export function lerCsv(texto: string): string[][] {
  const linhas = texto.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim())
  const sep = (linhas[0]?.split(';').length ?? 0) >= (linhas[0]?.split(',').length ?? 0) ? ';' : ','
  return linhas.map((l) => {
    const campos: string[] = []
    let atual = ''
    let aspas = false
    for (const c of l) {
      if (c === '"') aspas = !aspas
      else if (c === sep && !aspas) { campos.push(atual); atual = '' }
      else atual += c
    }
    campos.push(atual)
    return campos.map((x) => x.trim())
  })
}

const normCab = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Converte as linhas de uma folha (com cabeçalho Pai, Filho, Quantidade, Tipo do pai) em ligações. */
export function linhasComposicao(tabela: unknown[][]): LinhaComposicao[] {
  const [cab = [], ...resto] = tabela
  const c = cab.map(normCab)
  const i = (...nomes: string[]) => c.findIndex((x) => nomes.includes(x))
  const iPai = i('pai', 'equipamento', 'conjunto', 'peca maior')
  const iFilho = i('filho', 'componente', 'peca', 'referencia')
  if (iPai < 0 || iFilho < 0) throw new Error('A folha tem de ter as colunas "Pai" e "Filho" (e, opcionalmente, "Quantidade" e "Tipo do pai").')
  const iQtd = i('quantidade', 'qtd')
  const iTipo = i('tipo do pai', 'tipo')
  return resto
    .map((l, k) => ({
      n: k + 2,
      pai: String(l[iPai] ?? '').trim(),
      filho: String(l[iFilho] ?? '').trim(),
      quantidade: iQtd >= 0 ? String(l[iQtd] ?? '').trim() : '',
      tipoPai: iTipo >= 0 ? normCab(l[iTipo]) : '',
    }))
    .filter((l) => l.pai || l.filho)
}

/**
 * Junta as ligações de uma folha à composição atual. Pai/filho podem ser referências de material ou
 * nomes de grupos; um pai que não é referência nem grupo existente cria um equipamento (ou conjunto).
 */
export function aplicarFolhaComposicao(atual: Composicao, linhas: LinhaComposicao[], pecas: Peca[]): ResultadoFolhaComposicao {
  const c: Composicao = { grupos: [...atual.grupos], ligacoes: [...atual.ligacoes] }
  const refs = new Map(pecas.filter((p) => p.referencia).map((p) => [normCab(p.referencia), p.referencia as string]))
  const r: ResultadoFolhaComposicao = { composicao: c, novas: 0, atualizadas: 0, gruposNovos: [], erros: [] }
  const grupoPorNome = (nome: string) => c.grupos.find((g) => normCab(g.nome) === normCab(nome) || g.id === nome)

  const resolver = (valor: string, podeCriar: boolean, tipo: string, n: number): string | null => {
    const ref = refs.get(normCab(valor))
    if (ref) return ref
    const g = grupoPorNome(valor)
    if (g) return g.id
    if (!podeCriar) { r.erros.push(`Linha ${n}: "${valor}" não é uma referência do inventário nem um grupo.`); return null }
    const id = novoIdGrupo(c)
    c.grupos.push({ id, tipo: tipo.startsWith('conj') ? 'conjunto' : 'equipamento', nome: valor, uqe: 'nenhuma' })
    r.gruposNovos.push(valor)
    return id
  }

  for (const l of linhas) {
    if (!l.pai || !l.filho) { r.erros.push(`Linha ${l.n}: falta o pai ou o filho.`); continue }
    const q = l.quantidade === '' ? null : Number(l.quantidade.replace(',', '.'))
    if (q !== null && (!Number.isFinite(q) || q < 0)) { r.erros.push(`Linha ${l.n}: quantidade inválida "${l.quantidade}".`); continue }
    const pai = resolver(l.pai, true, l.tipoPai, l.n)
    const filho = resolver(l.filho, false, '', l.n)
    if (!pai || !filho) continue
    const idx = indexar(c, pecas)
    const existente = c.ligacoes.findIndex((x) => x.pai === pai && x.filho === filho)
    if (existente >= 0) {
      c.ligacoes[existente] = { ...c.ligacoes[existente], quantidade: q }
      r.atualizadas++
      continue
    }
    if (criaCiclo(pai, filho, idx)) { r.erros.push(`Linha ${l.n}: ${l.pai} → ${l.filho} criaria uma ligação circular.`); continue }
    c.ligacoes.push({ pai, filho, quantidade: q })
    r.novas++
  }
  return r
}

export const MODELO_FOLHA_COMPOSICAO =
  'Pai;Filho;Quantidade;Tipo do pai\nGCP12;16523021;2;\nGCP12;55191076;1;\nGuarda-lamas UQE2300;53103804;;conjunto\nGuarda-lamas UQE2300;53103805;;conjunto\n'
