import type { Localizacao, Peca } from '../types'
import { codigoPosicao } from './texto'

/** Zona representada no modelo 3D (layout.json → codigoZona). */
const ZONA_MODELO = '1B'

/** Posição a mostrar: a do ficheiro de origem (Excel) quando existe, senão a da localização no 3D. */
export function posicaoPeca(p: Pick<Peca, 'posicaoOrigem' | 'caixa'>, loc: Localizacao | undefined): string | null {
  return p.posicaoOrigem ?? codigoPosicao(loc, p.caixa)
}

/** Área do armazém a que a posição pertence (usada no filtro). */
export function grupoPosicao(p: Pick<Peca, 'posicaoOrigem'>, loc: Localizacao | undefined): string {
  const pos = p.posicaoOrigem
  if (!pos) return loc ? ZONA_MODELO : 'Sem posição'
  if (pos === 'ND') return 'ND'
  if (pos === 'ESCRITORIO') return 'Escritório'
  if (pos === 'M100') return 'M100'
  if (/^(ESQ-)?ARM\d/.test(pos)) return 'Armários (ARM)'
  const z = pos.match(/^(\d[A-Z])(\d{2}|$)/)
  return z ? z[1] : 'Posição inválida'
}

/** Explicação para uma peça que não pode ser destacada no 3D. */
export function motivoSem3D(p: Pick<Peca, 'posicaoOrigem'>): string {
  const pos = p.posicaoOrigem
  if (!pos) return 'A localização desta peça está por confirmar'
  if (pos === 'ND') return 'A posição desta peça não está definida (ND)'
  const m = pos.match(/^(\d[A-Z])(\d{2})?/)
  if (m && m[1] !== ZONA_MODELO) return `A posição ${pos} pertence à zona ${m[1]}, que ainda não está representada no 3D`
  if (m && m[2]) return `O corredor ${m[1]}${m[2]} (posição ${pos}) ainda não está colocado no modelo 3D`
  if (grupoPosicao(p, undefined) === 'Posição inválida') return `A posição "${pos}" não tem um formato válido — verifique o Excel`
  return `A posição ${pos} ainda não tem correspondência no modelo 3D`
}
