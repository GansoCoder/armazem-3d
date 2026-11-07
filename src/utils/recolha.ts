import type { Layout, Localizacao, Peca } from '../types'
import { caixaLocal, paraMundo } from './geometria'

/**
 * Ordem de recolha sugerida: começa na porta (ou num portão) e vai sempre para a paragem mais próxima.
 * É uma aproximação (distância em linha reta pelos eixos, sem contar com as estantes pelo meio).
 */

export interface Paragem {
  /** Número da paragem (1, 2…); várias peças na mesma posição partilham a paragem. */
  n: number
  localizacao: Localizacao
  pecas: Peca[]
  ponto: [number, number, number]
}

export function pontoLocalizacao(layout: Layout, loc: Localizacao): [number, number, number] | null {
  const e = layout.estruturas.find((s) => s.id === loc.estrutura)
  if (!e) return null
  if (loc.posicao3D) return [loc.posicao3D.x, loc.posicao3D.y, loc.posicao3D.z]
  return paraMundo(e, caixaLocal(e, loc).centro)
}

function pontoInicial(layout: Layout): [number, number] {
  const porta = layout.elementos.find((el) => el.tipo === 'portao' && /porta\b/i.test(el.rotulo ?? '')) ?? layout.elementos.find((el) => el.tipo === 'portao')
  return porta ? [porta.posicao.x, porta.posicao.z] : [layout.edificio.xMin, layout.edificio.zMin]
}

export function ordenarRecolha(pecas: Peca[], locs: Map<string, Localizacao>, layout: Layout): { paragens: Paragem[]; semPosicao: Peca[] } {
  const porLoc = new Map<string, Peca[]>()
  const semPosicao: Peca[] = []
  for (const p of pecas) {
    const loc = p.localizacaoId ? locs.get(p.localizacaoId) : undefined
    if (!loc) { semPosicao.push(p); continue }
    porLoc.set(loc.id, [...(porLoc.get(loc.id) ?? []), p])
  }
  const restantes = [...porLoc.entries()]
    .map(([id, ps]) => ({ loc: locs.get(id)!, pecas: ps, ponto: pontoLocalizacao(layout, locs.get(id)!) }))
    .filter((x): x is { loc: Localizacao; pecas: Peca[]; ponto: [number, number, number] } => !!x.ponto)

  const paragens: Paragem[] = []
  let [x, z] = pontoInicial(layout)
  while (restantes.length) {
    let melhor = 0
    let dMelhor = Infinity
    restantes.forEach((r, i) => {
      const d = Math.abs(r.ponto[0] - x) + Math.abs(r.ponto[2] - z)
      if (d < dMelhor) { dMelhor = d; melhor = i }
    })
    const [r] = restantes.splice(melhor, 1)
    paragens.push({ n: paragens.length + 1, localizacao: r.loc, pecas: r.pecas, ponto: r.ponto })
    ;[x, z] = [r.ponto[0], r.ponto[2]]
  }
  return { paragens, semPosicao }
}
