import type { Estrutura, Filtros, Localizacao, Peca } from '../types'
import { chavePeca } from './composicao'
import { grupoPosicao } from './posicao'
import { estadoStock } from './stock'
import { normalizar } from './texto'

export const SEM_CATEGORIA = '__sem_categoria__'

interface Contexto {
  locs: Map<string, Localizacao>
  estruturas: Map<string, Estrutura>
}

function textoLocalizacao(loc: Localizacao | undefined, ctx: Contexto): string {
  if (!loc) return 'localizacao por confirmar sem localizacao'
  const e = ctx.estruturas.get(loc.estrutura)
  return [
    loc.id, loc.codigo, loc.codigoParcial, loc.zona, loc.descricao, e?.nome, e?.id, e?.corredor ? `corredor ${e.corredor}` : '',
    loc.modulo !== null ? `modulo ${loc.modulo} m${loc.modulo}` : '',
    loc.nivel !== null ? `nivel ${loc.nivel} n${loc.nivel}` : '',
  ].join(' ')
}

function pontuarPeca(p: Peca, tokens: string[], ctx: Contexto): number {
  const loc = ctx.locs.get(p.localizacaoId ?? '')
  const ref = normalizar(p.referencia)
  const nome = normalizar(p.nome)
  // posição completa com caixa, ex.: 1b10a02c (a do Excel quando existe)
  const posicao = normalizar(p.posicaoOrigem ?? (loc?.codigo ? `${loc.codigo}${p.caixa ?? ''}` : ''))
  const resto = normalizar(
    [p.descricao, p.categoria, p.fabricante, p.notas, p.localizacaoId, p.uqe && p.uqe !== 'nenhuma' ? `uqe ${p.uqe} uqe${p.uqe}` : '', textoLocalizacao(loc, ctx)].join(' '),
  )
  let total = 0
  for (const t of tokens) {
    if (ref === t) total += 100
    else if (ref.startsWith(t)) total += 70
    else if (ref.includes(t)) total += 50
    else if (posicao && posicao.startsWith(t)) total += 60
    else if (nome.includes(t)) total += 30
    else if (resto.includes(t)) total += 10
    else return 0 // todos os termos têm de corresponder
  }
  return total
}

function pontuarLocalizacao(l: Localizacao, tokens: string[], ctx: Contexto): number {
  const id = normalizar(l.id)
  const codigo = normalizar(l.codigo)
  const resto = normalizar(textoLocalizacao(l, ctx))
  let total = 0
  for (const t of tokens) {
    if (id === t || codigo === t) total += 100
    else if (codigo && codigo.startsWith(t)) total += 70
    else if (id.startsWith(t)) total += 60
    else if (id.includes(t)) total += 40
    else if (resto.includes(t)) total += 10
    else return 0
  }
  return total
}

export function termos(consulta: string): string[] {
  return normalizar(consulta).split(/\s+/).filter(Boolean)
}

export function pesquisarPecas(consulta: string, pecas: Peca[], ctx: Contexto): Peca[] {
  const tokens = termos(consulta)
  if (tokens.length === 0) return pecas
  return pecas
    .map((p) => ({ p, s: pontuarPeca(p, tokens, ctx) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((r) => r.p)
}

export function pesquisarLocalizacoes(consulta: string, locs: Localizacao[], ctx: Contexto): Localizacao[] {
  const tokens = termos(consulta)
  if (tokens.length === 0) return []
  return locs
    .map((l) => ({ l, s: pontuarLocalizacao(l, tokens, ctx) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((r) => r.l)
}

/** @param naComposicao chaves das peças da estrutura escolhida em `f.composicao` (ver utils/composicao). */
export function aplicarFiltros(pecas: Peca[], f: Filtros, locs: Map<string, Localizacao>, naComposicao?: Set<string>): Peca[] {
  return pecas.filter((p) => {
    if (f.composicao && !naComposicao?.has(chavePeca(p))) return false
    if (f.categoria && (p.categoria ?? SEM_CATEGORIA) !== f.categoria) return false
    if (f.estado && estadoStock(p) !== f.estado) return false
    if (f.tipoRegisto && p.tipoRegisto !== f.tipoRegisto) return false
    if (f.uqe && (p.uqe ?? 'nenhuma') !== f.uqe) return false
    const loc = p.localizacaoId ? locs.get(p.localizacaoId) : undefined
    if (f.zona && grupoPosicao(p, loc) !== f.zona) return false
    if (f.no3D && (f.no3D === 'sim') !== !!loc) return false
    return true
  })
}

export const FILTROS_VAZIOS: Filtros = { categoria: '', zona: '', estado: '', tipoRegisto: '', no3D: '', uqe: '', composicao: '' }

export function filtrosAtivos(f: Filtros): number {
  return Object.values(f).filter(Boolean).length
}
