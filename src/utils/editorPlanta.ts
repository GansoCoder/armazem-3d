import type { Estrutura, EstruturaEstante, Layout, Localizacao } from '../types'
import { niveisPadrao } from './planta'

/** Operações puras sobre a planta, usadas pelo editor da planta. */

export type TipoNovo = EstruturaEstante['tipo'] | 'zona-chao'

export const NOMES_TIPO: Record<Estrutura['tipo'], string> = {
  'estante-ligeira': 'Estante ligeira',
  'porta-paletes': 'Porta-paletes',
  armario: 'Armário',
  'estante-vidros': 'Estante de vidros',
  contentores: 'Contentores',
  'zona-chao': 'Zona de chão',
}

const PREFIXO: Record<Estrutura['tipo'], string> = {
  'estante-ligeira': 'EL',
  'porta-paletes': 'PP',
  armario: 'AR',
  'estante-vidros': 'EV',
  contentores: 'CG',
  'zona-chao': 'ZN',
}

const CORES: Record<EstruturaEstante['tipo'], EstruturaEstante['cores']> = {
  'estante-ligeira': { montantes: '#c3cad2', vigas: '#c3cad2', prateleiras: '#b48a5a' },
  'porta-paletes': { montantes: '#b9c2cc', vigas: '#e2b318' },
  armario: { montantes: '#9aa3ac', vigas: '#b3bbc3', prateleiras: '#c3cad2' },
  'estante-vidros': { montantes: '#2a4fa8', vigas: '#e8622c', prateleiras: '#b48a5a' },
}

/** Medidas iniciais de cada tipo (podem ser alteradas no editor). */
const PADRAO: Record<EstruturaEstante['tipo'], { modulos: number; larguraModulo: number; profundidade: number; altura: number; prateleiras: number }> = {
  'estante-ligeira': { modulos: 5, larguraModulo: 1.2, profundidade: 0.5, altura: 2.5, prateleiras: 5 },
  'porta-paletes': { modulos: 3, larguraModulo: 2.6, profundidade: 1.1, altura: 3.8, prateleiras: 4 },
  armario: { modulos: 1, larguraModulo: 0.9, profundidade: 0.5, altura: 1.95, prateleiras: 4 },
  'estante-vidros': { modulos: 2, larguraModulo: 1.6, profundidade: 1.0, altura: 2.6, prateleiras: 2 },
}

export function ehEstante(e: Estrutura): e is EstruturaEstante {
  return e.tipo !== 'contentores' && e.tipo !== 'zona-chao'
}

/** Id novo e único, ex.: EL18, ou EL18-2 se já existir. */
export function novoId(layout: Layout, tipo: Estrutura['tipo'], corredor: string | null): string {
  const ids = new Set(layout.estruturas.map((e) => e.id))
  const base = `${PREFIXO[tipo]}${corredor ?? 'N'}`
  if (!ids.has(base) && corredor) return base
  for (let i = corredor ? 2 : 1; ; i++) {
    const id = corredor ? `${base}-${i}` : `${base}${i}`
    if (!ids.has(id)) return id
  }
}

export function nomeAutomatico(tipo: Estrutura['tipo'], corredor: string | null): string {
  return corredor ? `${NOMES_TIPO[tipo]} — corredor ${corredor}` : `${NOMES_TIPO[tipo]} (nova)`
}

export function criarEstrutura(layout: Layout, tipo: TipoNovo, posicao: { x: number; z: number }): Estrutura {
  const id = novoId(layout, tipo, null)
  const nome = nomeAutomatico(tipo, null)
  const comum = {
    id, nome, rotulo: nome, zona: 'Estruturas novas', posicao, rotacaoY: 0, corredor: null,
    fotografias: [], estadoGeometria: 'estimado' as const, notas: 'Criada no editor da planta.',
  }
  if (tipo === 'zona-chao') return { ...comum, tipo, largura: 2, profundidade: 1.5 }
  const p = PADRAO[tipo]
  return {
    ...comum, tipo, modulos: p.modulos, larguraModulo: p.larguraModulo, profundidade: p.profundidade,
    niveis: niveisPadrao(tipo, p.prateleiras, p.altura), altura: p.altura, cores: CORES[tipo],
    ...(tipo === 'estante-vidros' ? { divisoriasVerticais: true } : {}),
  }
}

/** Muda o tipo de uma estante mantendo a posição, o corredor e o número de colunas e prateleiras. */
export function mudarTipo(e: EstruturaEstante, tipo: EstruturaEstante['tipo']): EstruturaEstante {
  const p = PADRAO[tipo]
  const { divisoriasVerticais: _d, nomesNiveis: _n, ...resto } = e
  return {
    ...resto, tipo, larguraModulo: p.larguraModulo, profundidade: p.profundidade, altura: p.altura,
    niveis: niveisPadrao(tipo, e.niveis.length, p.altura), cores: CORES[tipo],
    ...(tipo === 'estante-vidros' ? { divisoriasVerticais: true } : {}),
  }
}

export function substituir(layout: Layout, id: string, nova: Estrutura): Layout {
  return { ...layout, estruturas: layout.estruturas.map((e) => (e.id === id ? nova : e)) }
}

export function remover(layout: Layout, id: string): Layout {
  return { ...layout, estruturas: layout.estruturas.filter((e) => e.id !== id) }
}

export function duplicar(layout: Layout, e: Estrutura): Estrutura {
  const desloc = (ehEstante(e) ? e.profundidade : e.tipo === 'zona-chao' ? e.profundidade : 1) + 1
  // uma cópia não pode ter o mesmo número de corredor (os códigos repetir-se-iam)
  const copia = { ...structuredClone(e), corredor: null, colunaInicial: undefined, posicao: { x: e.posicao.x + desloc, z: e.posicao.z } } as Estrutura
  copia.id = novoId(layout, e.tipo, null)
  copia.nome = `${e.nome} (cópia)`
  copia.rotulo = copia.nome
  return copia
}

/** Primeiro e último código de uma estrutura, ex.: 1B18A01 … 1B18D04. */
export function intervaloCodigos(locs: Localizacao[]): { primeiro: string; ultimo: string; total: number } | null {
  const cods = locs.map((l) => l.codigo ?? l.codigoParcial).filter((c): c is string => !!c && !c.includes('?'))
  if (!cods.length) return null
  const ord = [...cods].sort((a, b) => a.localeCompare(b, 'pt', { numeric: true }))
  return { primeiro: ord[0], ultimo: ord[ord.length - 1], total: cods.length }
}

/** Códigos que aparecem em mais do que uma localização (ex.: duas estruturas com o mesmo corredor e colunas). */
export function codigosRepetidos(locs: Localizacao[]): Map<string, string[]> {
  const porCodigo = new Map<string, Set<string>>()
  for (const l of locs) {
    if (!l.codigo) continue
    const s = porCodigo.get(l.codigo) ?? new Set()
    s.add(l.estrutura)
    porCodigo.set(l.codigo, s)
  }
  const r = new Map<string, string[]>()
  for (const [c, s] of porCodigo) if (s.size > 1) r.set(c, [...s])
  return r
}
