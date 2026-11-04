import type { Uqe } from '../types'

/** Minúsculas e sem acentos, para comparações tolerantes. */
export function normalizar(texto: string | null | undefined): string {
  return (texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

export const POR_CONFIRMAR = 'Por confirmar'

export function nomePeca(p: { nome: string | null; referencia: string | null }): string {
  return p.nome ?? (p.referencia ? `Artigo ${p.referencia}` : 'Designação por confirmar')
}

export function formatarQuantidade(q: number | null): string {
  return q === null ? POR_CONFIRMAR : q.toLocaleString('pt-PT')
}

/** Código a mostrar para uma localização: o oficial (ex.: 1B10A02) quando existe, senão o id provisório. */
export function rotuloLocalizacao(loc: { id: string; codigo: string | null; codigoParcial?: string | null }): string {
  return loc.codigo ?? loc.codigoParcial ?? loc.id
}

/** Posição completa de uma peça: código da localização + caixa (ex.: 1B10A02C). */
export function codigoPosicao(
  loc: { id: string; codigo: string | null; codigoParcial?: string | null } | undefined,
  caixa: string | null,
): string | null {
  if (!loc) return null
  if (loc.codigo) return `${loc.codigo}${caixa ?? ''}`
  const rotulo = rotuloLocalizacao(loc)
  return caixa ? `${rotulo} · caixa ${caixa}` : rotulo
}

/** Uma "coluna" é uma localização de estante de prateleiras sem prateleira definida (prateleira por confirmar). */
export function ehColuna(loc: { modulo: number | null; nivel: number | null }, tipoEstrutura: string | undefined): boolean {
  return (tipoEstrutura === 'estante-ligeira' || tipoEstrutura === 'armario') && loc.modulo !== null && loc.nivel === null
}

const EUR = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })

export function formatarValor(v: number | null | undefined): string {
  return v === null || v === undefined ? '—' : EUR.format(v)
}

export const OPCOES_UQE: Uqe[] = ['nenhuma', '2300', '3500']

export function rotuloUqe(u: Uqe | undefined): string {
  return !u || u === 'nenhuma' ? 'Nenhuma' : `UQE ${u}`
}
