import type { Layout, Localizacao, Peca } from '../types'

/** Verifica as regras de integridade dos dados. Devolve avisos legíveis (não lança erros). */
export function validarDados(layout: Layout, locs: Localizacao[], pecas: Peca[]): string[] {
  const avisos: string[] = []
  const duplicados = (ids: string[]) => ids.filter((id, i) => ids.indexOf(id) !== i)

  for (const id of duplicados(layout.estruturas.map((e) => e.id))) avisos.push(`Estrutura com id duplicado: ${id}`)
  for (const id of duplicados(locs.map((l) => l.id))) avisos.push(`Localização com id duplicado: ${id}`)
  for (const id of duplicados(pecas.map((p) => p.id))) avisos.push(`Peça com id duplicado: ${id}`)

  const estruturas = new Set(layout.estruturas.map((e) => e.id))
  for (const l of locs) {
    if (!estruturas.has(l.estrutura)) avisos.push(`Localização ${l.id} refere a estrutura inexistente ${l.estrutura}`)
  }

  const ids = new Set(locs.map((l) => l.id))
  for (const p of pecas) {
    if (p.quantidade !== null && (!Number.isFinite(p.quantidade) || p.quantidade < 0)) {
      avisos.push(`Peça ${p.id}: a quantidade deve ser um número ≥ 0 (valor: ${p.quantidade})`)
    }
    if (p.uqe !== undefined && !['nenhuma', '2300', '3500'].includes(p.uqe)) {
      avisos.push(`Peça ${p.id}: UQE inválida (${p.uqe}); use "nenhuma", "2300" ou "3500"`)
    }
    if (p.localizacaoId && !ids.has(p.localizacaoId)) {
      avisos.push(`Peça ${p.id}: localização ${p.localizacaoId} não existe — tratada como "por confirmar"`)
    }
  }
  return avisos
}

export function erroCaixa(valor: string): string | null {
  if (valor.trim() === '') return null
  return /^[A-Za-z]{1,2}$/.test(valor.trim()) ? null : 'A caixa é identificada por uma letra (A, B, C…).'
}

/** Converte texto em número aceitando vírgula decimal (ex.: "2,5"). */
export function lerNumero(valor: string): number {
  return Number(valor.trim().replace(',', '.'))
}

/** Quantidades podem ter decimais (materiais em kg, m…), mas nunca ser negativas. */
export function erroQuantidade(valor: string): string | null {
  if (valor.trim() === '') return null
  const n = lerNumero(valor)
  if (!Number.isFinite(n) || n < 0) return 'Indique um número igual ou superior a zero.'
  return null
}
