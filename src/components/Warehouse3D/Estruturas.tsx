import { Edges, Html } from '@react-three/drei'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { Estrutura, EstruturaContentores, EstruturaEstante, Layout } from '../../types'
import { contentoresLocais, dimensoes, graus, paraMundo } from '../../utils/geometria'

/**
 * Geometria das estruturas (montantes, vigas, prateleiras), agrupada por cor em InstancedMesh
 * para manter poucas chamadas de desenho. Estas peças não são clicáveis — a interação é feita
 * pelos volumes das localizações (Localizacoes3D).
 */

const COR_TRAVAMENTO = '#cfd6dd'
const COR_DIVISORIAS = '#e3e8ed'
const COR_CARTAO = '#a9845a'
const naoClicavel = () => null

/** Lotes por grupo e cor. As estantes de prateleiras têm grupo próprio para poderem ficar transparentes. */
type Lotes = Map<string, { grupo: string; cor: string; matrizes: THREE.Matrix4[] }>

const PRATELEIRAS = new Set(['estante-ligeira', 'armario'])

function construirLotes(estruturas: Estrutura[]): Lotes {
  const lotes: Lotes = new Map()
  const tmp = new THREE.Object3D()

  for (const e of estruturas) {
    if (e.tipo === 'contentores' || e.tipo === 'zona-chao') continue
    const theta = graus(e.rotacaoY)
    const grupo = PRATELEIRAS.has(e.tipo) ? e.id : 'fixo'
    const add = (cor: string, p: [number, number, number], s: [number, number, number], inclinacao = 0, parte = '') => {
      const [x, y, z] = paraMundo(e, p)
      tmp.position.set(x, y, z)
      tmp.rotation.set(inclinacao, theta, 0, 'YXZ')
      tmp.scale.set(...s)
      tmp.updateMatrix()
      // as portas dos armários são um grupo à parte, para ficarem transparentes ao selecionar uma prateleira
      const g = parte ? `${grupo}:${parte}` : grupo
      const chave = `${g}|${cor}`
      const lote = lotes.get(chave) ?? { grupo: g, cor, matrizes: [] }
      lote.matrizes.push(tmp.matrix.clone())
      lotes.set(chave, lote)
    }
    construirEstante(e, add)
  }
  return lotes
}

function construirEstante(
  e: EstruturaEstante,
  add: (cor: string, p: [number, number, number], s: [number, number, number], inclinacao?: number, parte?: string) => void,
) {
  const w = e.larguraModulo
  const L = e.modulos * w
  const d = e.profundidade
  if (e.tipo === 'armario') {
    construirArmario(e, add)
    return
  }
  const ligeira = e.tipo === 'estante-ligeira'
  const secMontante = ligeira ? 0.045 : 0.08
  const zm = d / 2 - secMontante / 2

  for (let f = 0; f <= e.modulos; f++) {
    const x = -L / 2 + f * w
    // montantes
    for (const z of [-zm, zm]) add(e.cores.montantes, [x, e.altura / 2, z], [secMontante, e.altura, secMontante])
    // travamento em zig-zag nos quadros (porta-paletes e estante de vidros)
    if (!ligeira) {
      const n = Math.max(2, Math.round(e.altura / 1.1))
      const passo = (e.altura - 0.3) / n
      const dd = d - 2 * secMontante
      for (let k = 0; k < n; k++) {
        const y = 0.15 + passo * (k + 0.5)
        const comp = Math.hypot(dd, passo)
        add(COR_TRAVAMENTO, [x, y, 0], [0.035, comp, 0.035], Math.atan2(k % 2 ? dd : -dd, passo))
      }
    } else {
      // reforços laterais nas estantes ligeiras
      for (const y of [0.1, e.altura - 0.05]) add(e.cores.montantes, [x, y, 0], [0.03, 0.03, d])
    }
  }

  const niveis = e.tipo === 'estante-vidros' ? [...e.niveis, e.altura] : e.niveis
  for (const y of niveis) {
    for (let m = 0; m < e.modulos; m++) {
      const cx = -L / 2 + (m + 0.5) * w
      if (ligeira) {
        add(e.cores.prateleiras ?? '#b48a5a', [cx, y, 0], [w - 0.05, 0.025, d - 0.04])
        for (const z of [-zm, zm]) add(e.cores.vigas, [cx, y - 0.02, z], [w - 0.04, 0.04, 0.02])
        continue
      }
      if (y < 0.05) continue // nível do chão: sem vigas
      for (const z of [-zm, zm]) add(e.cores.vigas, [cx, y - 0.06, z], [w - 0.08, 0.12, 0.05])
      if (e.tipo === 'estante-vidros' && y < e.altura) {
        add(e.cores.prateleiras ?? '#b48a5a', [cx, y + 0.01, 0], [w - 0.1, 0.03, d - 0.12])
      }
    }
  }

  if (e.tipo === 'estante-vidros' && e.divisoriasVerticais) {
    // divisórias verticais brancas do nível superior, onde os vidros ficam na vertical
    const y0 = e.niveis[e.niveis.length - 1]
    const h = e.altura - y0
    for (let m = 0; m < e.modulos; m++) {
      for (let k = 1; k < 7; k++) {
        const x = -L / 2 + m * w + (k * w) / 7
        for (const z of [-0.22, 0.22]) add(COR_DIVISORIAS, [x, y0 + h / 2, z], [0.022, h, 0.022])
      }
    }
    // cartão pousado no topo (visível nas fotos 1 e 3)
    add(COR_CARTAO, [0, e.altura + 0.04, 0], [L + 0.5, 0.04, d + 0.3])
  }
}

/** Armário: laterais, fundo e tampo fechados, prateleiras interiores e frente aberta (para ver as células). */
function construirArmario(
  e: EstruturaEstante,
  add: (cor: string, p: [number, number, number], s: [number, number, number], inclinacao?: number, parte?: string) => void,
) {
  const w = e.larguraModulo
  const L = e.modulos * w
  const d = e.profundidade
  const h = e.altura
  const painel = 0.025
  for (let f = 0; f <= e.modulos; f++) add(e.cores.montantes, [-L / 2 + f * w, h / 2, 0], [painel, h, d])
  add(e.cores.montantes, [0, h / 2, -d / 2 + painel / 2], [L, h, painel])
  add(e.cores.montantes, [0, h, 0], [L + painel, painel, d])
  for (const y of e.niveis) {
    for (let m = 0; m < e.modulos; m++) {
      add(e.cores.prateleiras ?? e.cores.vigas, [-L / 2 + (m + 0.5) * w, y, 0], [w - painel, 0.02, d - painel])
    }
  }
  // aro frontal
  add(e.cores.vigas, [0, h - 0.02, d / 2], [L, 0.04, 0.02])
  add(e.cores.vigas, [0, 0.03, d / 2], [L, 0.06, 0.02])
  if (e.portas) {
    // armário fechado: duas portas por módulo, com puxadores ao centro
    const folga = 0.012
    for (let m = 0; m < e.modulos; m++) {
      const x0 = -L / 2 + m * w
      for (const lado of [0, 1]) {
        const cx = x0 + (lado + 0.5) * (w / 2)
        add(e.cores.vigas, [cx, h / 2, d / 2 + 0.012], [w / 2 - folga, h - 0.08, 0.02], 0, 'portas')
        const xp = x0 + w / 2 + (lado ? 1 : -1) * 0.05
        add('#4a5560', [xp, h * 0.52, d / 2 + 0.03], [0.02, Math.min(0.3, h * 0.2), 0.02], 0, 'portas')
      }
    }
  }
}

function Lote({ cor, matrizes, fantasma }: { cor: string; matrizes: THREE.Matrix4[]; fantasma: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    matrizes.forEach((mat, i) => m.setMatrixAt(i, mat))
    m.instanceMatrix.needsUpdate = true
    m.computeBoundingSphere()
  }, [matrizes])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, matrizes.length]} raycast={naoClicavel}>
      <boxGeometry />
      {/* key: mudar "transparent" num material existente não tem efeito sem recompilar */}
      <meshStandardMaterial key={fantasma ? 'fantasma' : 'opaco'} color={cor} roughness={0.55} metalness={0.25} transparent={fantasma} opacity={fantasma ? 0.1 : 1} depthWrite={!fantasma} />
    </instancedMesh>
  )
}

/**
 * @param estruturaFoco estrutura de prateleiras com uma localização selecionada: as outras estantes de
 * prateleiras ficam semitransparentes, para os corredores estreitos não taparem a célula.
 */
export function Estantes({ layout, estruturaFoco }: { layout: Layout; estruturaFoco: string | null }) {
  const lotes = useMemo(() => construirLotes(layout.estruturas), [layout])
  const foco = estruturaFoco && layout.estruturas.some((e) => e.id === estruturaFoco && PRATELEIRAS.has(e.tipo)) ? estruturaFoco : null
  return (
    <group>
      {[...lotes.entries()].map(([chave, l]) => (
        <Lote key={chave} cor={l.cor} matrizes={l.matrizes} fantasma={!!foco && l.grupo !== 'fixo' && l.grupo !== foco} />
      ))}
    </group>
  )
}

/** Paletes no chão: base de madeira, carga (uma faixa por posição) e as letras das posições. */
function Paletes({ e, rotulos }: { e: EstruturaContentores; rotulos: boolean }) {
  const H = e.alturaContentor
  return (
    <group position={[e.posicao.x, 0, e.posicao.z]} rotation-y={graus(e.rotacaoY)}>
      {contentoresLocais(e).map((c, i) => {
        const d = e.disposicao?.[i]
        const letras = d?.letras ?? []
        const n = Math.max(1, letras.length)
        const w = c.w / n
        return (
          <group key={i} position={[c.x, 0, c.z]}>
            {d?.conteudo === 'garrafas' ? (
              // garrafas de gás de pé
              [[-0.3, -0.3], [0, -0.3], [0.3, -0.3], [-0.3, 0.05], [0, 0.05], [0.3, 0.05]].map(([x, z], k) => (
                <mesh key={k} position={[x, 0.7, z]} raycast={naoClicavel}>
                  <cylinderGeometry args={[0.11, 0.11, 1.4, 14]} />
                  <meshStandardMaterial color={k % 2 ? '#3d7bd1' : '#8a9aab'} roughness={0.5} />
                </mesh>
              ))
            ) : (
              <>
                <mesh position={[0, 0.07, 0]} raycast={naoClicavel}>
                  <boxGeometry args={[c.w - 0.06, 0.14, c.d - 0.06]} />
                  <meshStandardMaterial color="#a07a4e" roughness={0.9} />
                </mesh>
                {Array.from({ length: n }, (_, k) => (
                  <mesh key={k} position={[-c.w / 2 + (k + 0.5) * w, 0.14 + (H - 0.14) / 2, 0]} raycast={naoClicavel}>
                    <boxGeometry args={[w - 0.1, H - 0.18, c.d - 0.16]} />
                    <meshStandardMaterial color="#c9a46e" transparent opacity={0.45} roughness={0.9} depthWrite={false} />
                    <Edges color="#e2c08c" />
                  </mesh>
                ))}
              </>
            )}
            {rotulos && letras.length > 0 && (
              <Html position={[0, H + 0.25, 0]} center zIndexRange={[9, 0]}>
                <div className="rotulo-palete">{letras.length > 2 ? `${letras[0]}–${letras[letras.length - 1]}` : letras.join(' ')}</div>
              </Html>
            )}
          </group>
        )
      })}
    </group>
  )
}

function Contentores({ e, rotulos }: { e: EstruturaContentores; rotulos: boolean }) {
  if (e.aspeto === 'palete') return <Paletes e={e} rotulos={rotulos} />
  const caixas = contentoresLocais(e).flatMap((c) =>
    Array.from({ length: e.empilhamento }, (_, k) => ({ p: [c.x, e.alturaContentor * (k + 0.5), c.z] as [number, number, number], w: c.w, d: c.d })),
  )
  return (
    <group position={[e.posicao.x, 0, e.posicao.z]} rotation-y={graus(e.rotacaoY)}>
      {caixas.map((c, i) => (
        <mesh key={i} position={c.p} raycast={naoClicavel}>
          <boxGeometry args={[c.w - 0.06, e.alturaContentor - 0.04, c.d - 0.06]} />
          <meshStandardMaterial color="#8d98a3" transparent opacity={0.35} roughness={0.8} depthWrite={false} />
          <Edges color="#c6ced6" />
        </mesh>
      ))}
    </group>
  )
}

/** Rolos brancos deitados (matéria filtrante), em duas camadas, ao longo do comprimento da zona. */
function Rolos({ largura, profundidade }: { largura: number; profundidade: number }) {
  const r = 0.24
  const comp = Math.min(2, largura - 0.2)
  const porFila = Math.max(1, Math.floor(profundidade / (2 * r)))
  const rolos: [number, number, number][] = []
  for (let i = 0; i < porFila; i++) rolos.push([0, r, -profundidade / 2 + r + i * 2 * r + (profundidade - porFila * 2 * r) / 2])
  for (let i = 0; i < porFila - 1; i++) rolos.push([0, r * 2.7, (rolos[i][2] + rolos[i + 1][2]) / 2])
  return (
    <>
      {rolos.map((p, i) => (
        <mesh key={i} position={p} rotation-z={Math.PI / 2} raycast={naoClicavel}>
          <cylinderGeometry args={[r, r, comp, 20]} />
          <meshStandardMaterial color="#eef1f4" roughness={0.7} />
        </mesh>
      ))}
    </>
  )
}

function ZonaChao({ e }: { e: Extract<Estrutura, { tipo: 'zona-chao' }> }) {
  return (
    <group position={[e.posicao.x, 0.012, e.posicao.z]} rotation-y={graus(e.rotacaoY)}>
      <mesh rotation-x={-Math.PI / 2} raycast={naoClicavel}>
        <planeGeometry args={[e.largura, e.profundidade]} />
        <meshBasicMaterial color="#F0A43A" transparent opacity={0.06} />
        <Edges color="#c9a050" />
      </mesh>
      {e.conteudo === 'rolos' && <Rolos largura={e.largura} profundidade={e.profundidade} />}
    </group>
  )
}

export function OutrasEstruturas({ layout, rotulos = true }: { layout: Layout; rotulos?: boolean }) {
  return (
    <>
      {layout.estruturas.map((e) =>
        e.tipo === 'contentores' ? <Contentores key={e.id} e={e} rotulos={rotulos} /> : e.tipo === 'zona-chao' ? <ZonaChao key={e.id} e={e} /> : null,
      )}
    </>
  )
}

/** Onde fica a etiqueta verde do corredor (coordenadas do mundo), ou null se a estrutura não tiver etiqueta própria. */
function posicaoEtiqueta(e: Estrutura): [number, number, number] | null {
  if (e.tipo === 'contentores') {
    // paletes: cada palete já mostra as suas letras
    if (e.aspeto === 'palete') return null
    // por cima do contentor A
    const a = contentoresLocais(e)[0]
    return a ? paraMundo(e, [a.x, e.alturaContentor * e.empilhamento + 0.35, a.z]) : null
  }
  if (e.tipo === 'zona-chao') return paraMundo(e, [-e.largura / 2, 1.65, 0])
  // estruturas que continuam a numeração de outra (ex.: armários do corredor 04) não repetem a etiqueta
  if ((e.colunaInicial ?? 1) > 1) return null
  const L = e.modulos * e.larguraModulo
  // a etiqueta fica do lado da coluna 01, salvo indicação em contrário
  const ladoMais = (e.ladoEtiqueta === 'fim') !== !!e.colunasInvertidas
  return paraMundo(e, [(ladoMais ? 1 : -1) * (L / 2 + 0.04), Math.min(1.65, e.altura - 0.2), 0])
}

/** Rótulos das estruturas e etiquetas físicas visíveis nas fotografias (ex.: "20" e "21"). */
export function Rotulos({ layout, visiveis }: { layout: Layout; visiveis: boolean }) {
  if (!visiveis) return null
  return (
    <>
      {layout.estruturas.map((e) => {
        // estruturas com número de corredor já mostram a etiqueta verde; sem rótulo, nada a mostrar
        if (e.corredor || !e.rotulo) return null
        const { altura } = dimensoes(e)
        const p = paraMundo(e, [0, altura + 0.55, 0])
        return (
          <Html key={e.id} position={p} center zIndexRange={[10, 0]} className="rotulo-3d-envolvente">
            <div className={`rotulo-3d ${e.tipo === 'estante-ligeira' || e.localizacaoUnica ? 'pequeno' : ''}`}>{e.rotulo}</div>
          </Html>
        )
      })}
      {layout.estruturas.map((e) => {
        // etiqueta verde do corredor, no topo da estrutura (como no armazém)
        const p = posicaoEtiqueta(e)
        if (!e.corredor || !p) return null
        return (
          <Html key={`${e.id}-corredor`} position={p} center zIndexRange={[10, 0]}>
            <div
              className={`etiqueta-verde ${e.corredorInferido ? 'inferida' : ''}`}
              title={e.corredorInferido ? `Corredor ${e.codigoZona ?? ''}${e.corredor} (deduzido, etiqueta não vista)` : `Corredor ${e.codigoZona ?? ''}${e.corredor}`}
            >
              {e.corredor}{e.corredorInferido && '?'}
            </div>
          </Html>
        )
      })}
    </>
  )
}
