import type { Estrutura, EstruturaContentores, EstruturaEstante, Layout, Localizacao } from '../types'

export interface Caixa {
  /** Centro em coordenadas locais da estrutura. */
  centro: [number, number, number]
  tamanho: [number, number, number]
}

export const graus = (g: number) => (g * Math.PI) / 180

/** Contentores com a sua posição local e tamanho em planta (largura em x, profundidade em z). */
export function contentoresLocais(e: EstruturaContentores): { x: number; z: number; w: number; d: number }[] {
  if (e.disposicao?.length) {
    return e.disposicao.map((c) => ({
      x: c.x,
      z: c.z,
      w: c.rodado ? e.profundidadeContentor : e.larguraContentor,
      d: c.rodado ? e.larguraContentor : e.profundidadeContentor,
    }))
  }
  const W = e.colunas * e.larguraContentor
  const D = e.filas * e.profundidadeContentor
  return Array.from({ length: e.colunas * e.filas }, (_, i) => ({
    x: -W / 2 + ((i % e.colunas) + 0.5) * e.larguraContentor,
    z: D / 2 - (Math.floor(i / e.colunas) + 0.5) * e.profundidadeContentor,
    w: e.larguraContentor,
    d: e.profundidadeContentor,
  }))
}

/** Retângulo (local) que envolve todos os contentores. */
function limitesContentores(e: EstruturaContentores) {
  const cs = contentoresLocais(e)
  const x0 = Math.min(...cs.map((c) => c.x - c.w / 2))
  const x1 = Math.max(...cs.map((c) => c.x + c.w / 2))
  const z0 = Math.min(...cs.map((c) => c.z - c.d / 2))
  const z1 = Math.max(...cs.map((c) => c.z + c.d / 2))
  return { x0, x1, z0, z1 }
}

/** Comprimento × profundidade da planta de uma estrutura (coordenadas locais). */
export function dimensoes(e: Estrutura): { comprimento: number; profundidade: number; altura: number } {
  switch (e.tipo) {
    case 'contentores': {
      const { x0, x1, z0, z1 } = limitesContentores(e)
      return { comprimento: x1 - x0, profundidade: z1 - z0, altura: e.alturaContentor * e.empilhamento }
    }
    case 'zona-chao':
      return { comprimento: e.largura, profundidade: e.profundidade, altura: 1.2 }
    default:
      return { comprimento: e.modulos * e.larguraModulo, profundidade: e.profundidade, altura: e.altura }
  }
}

function caixaEstante(e: EstruturaEstante, modulo: number | null, nivel: number | null): Caixa {
  const L = e.modulos * e.larguraModulo
  // colunasInvertidas: a coluna 01 fica no extremo +x local
  const m = modulo === null ? null : e.colunasInvertidas ? e.modulos - modulo + 1 : modulo
  const [x0, x1] = m === null
    ? [-L / 2, L / 2]
    : [-L / 2 + (m - 1) * e.larguraModulo, -L / 2 + m * e.larguraModulo]
  const [y0, y1] = nivel === null
    ? [e.niveis[0], e.altura]
    : [e.niveis[nivel], e.niveis[nivel + 1] ?? e.altura]
  const folga = 0.06
  return {
    centro: [(x0 + x1) / 2, (y0 + y1) / 2 + 0.02, 0],
    tamanho: [x1 - x0 - folga, Math.max(0.1, y1 - y0 - folga), e.profundidade - 0.04],
  }
}

/** Volume de uma localização em coordenadas locais da sua estrutura. */
export function caixaLocal(e: Estrutura, loc: Pick<Localizacao, 'modulo' | 'nivel'>): Caixa {
  if (e.tipo === 'contentores') {
    const H = e.alturaContentor * e.empilhamento
    const c = loc.modulo === null ? undefined : contentoresLocais(e)[loc.modulo - 1]
    if (!c) {
      const { x0, x1, z0, z1 } = limitesContentores(e)
      return { centro: [(x0 + x1) / 2, H / 2, (z0 + z1) / 2], tamanho: [x1 - x0, H, z1 - z0] }
    }
    return { centro: [c.x, H / 2, c.z], tamanho: [c.w - 0.04, H + 0.04, c.d - 0.04] }
  }
  if (e.tipo === 'zona-chao') {
    return { centro: [0, 0.6, 0], tamanho: [e.largura, 1.2, e.profundidade] }
  }
  return caixaEstante(e, loc.modulo, loc.nivel)
}

/** Converte um ponto local da estrutura para coordenadas do mundo. */
export function paraMundo(e: Estrutura, p: [number, number, number]): [number, number, number] {
  const t = graus(e.rotacaoY)
  const c = Math.cos(t)
  const s = Math.sin(t)
  return [e.posicao.x + p[0] * c + p[2] * s, p[1], e.posicao.z - p[0] * s + p[2] * c]
}

/** Vetor (mundo) para onde a frente da estrutura está virada. */
export function frente(e: Estrutura): [number, number] {
  const t = graus(e.rotacaoY)
  return [Math.sin(t), Math.cos(t)]
}

export interface Enquadramento {
  alvo: [number, number, number]
  camara: [number, number, number]
}

/** Posição da câmara para observar uma localização de frente. */
export function enquadrarLocalizacao(layout: Layout, loc: Localizacao): Enquadramento | null {
  const e = layout.estruturas.find((s) => s.id === loc.estrutura)
  if (!e) return null
  const caixa = caixaLocal(e, loc)
  const alvo = loc.posicao3D
    ? ([loc.posicao3D.x, loc.posicao3D.y, loc.posicao3D.z] as [number, number, number])
    : paraMundo(e, caixa.centro)
  const [fx, fz] = frente(e)
  const maior = Math.max(...caixa.tamanho)
  // nas estantes de prateleiras as filas vizinhas ficam transparentes; basta uma distância curta
  const prateleiras = e.tipo === 'estante-ligeira' || e.tipo === 'armario'
  const dist = prateleiras ? Math.max(4, maior * 2.2) : Math.max(6, maior * 2.9)
  return {
    alvo,
    camara: [alvo[0] + fx * dist + fz * dist * 0.25, alvo[1] + dist * 0.55 + 0.8, alvo[2] + fz * dist - fx * dist * 0.25],
  }
}

export function vistaInicial(layout: Layout): Enquadramento {
  const { xMin, xMax, zMin, zMax } = layout.edificio
  const cx = (xMin + xMax) / 2
  const cz = (zMin + zMax) / 2
  const largura = xMax - xMin
  return { alvo: [cx, 0, cz], camara: [cx - largura * 0.05, largura * 0.62, zMax + largura * 0.55] }
}
