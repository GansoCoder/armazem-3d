import { Edges, Html } from '@react-three/drei'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { Estrutura, EstruturaContentores, EstruturaEstante, Layout } from '../../types'
import { dimensoes, graus, paraMundo } from '../../utils/geometria'

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
    const add = (cor: string, p: [number, number, number], s: [number, number, number], inclinacao = 0) => {
      const [x, y, z] = paraMundo(e, p)
      tmp.position.set(x, y, z)
      tmp.rotation.set(inclinacao, theta, 0, 'YXZ')
      tmp.scale.set(...s)
      tmp.updateMatrix()
      const chave = `${grupo}|${cor}`
      const lote = lotes.get(chave) ?? { grupo, cor, matrizes: [] }
      lote.matrizes.push(tmp.matrix.clone())
      lotes.set(chave, lote)
    }
    construirEstante(e, add)
  }
  return lotes
}

function construirEstante(
  e: EstruturaEstante,
  add: (cor: string, p: [number, number, number], s: [number, number, number], inclinacao?: number) => void,
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
  add: (cor: string, p: [number, number, number], s: [number, number, number], inclinacao?: number) => void,
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

function Contentores({ e }: { e: EstruturaContentores }) {
  const { comprimento: W, profundidade: D } = dimensoes(e)
  const caixas: [number, number, number][] = []
  for (let f = 0; f < e.filas; f++)
    for (let c = 0; c < e.colunas; c++)
      for (let k = 0; k < e.empilhamento; k++)
        caixas.push([
          -W / 2 + (c + 0.5) * e.larguraContentor,
          e.alturaContentor * (k + 0.5),
          D / 2 - (f + 0.5) * e.profundidadeContentor,
        ])
  return (
    <group position={[e.posicao.x, 0, e.posicao.z]} rotation-y={graus(e.rotacaoY)}>
      {caixas.map((p, i) => (
        <mesh key={i} position={p} raycast={naoClicavel}>
          <boxGeometry args={[e.larguraContentor - 0.06, e.alturaContentor - 0.04, e.profundidadeContentor - 0.06]} />
          <meshStandardMaterial color="#8d98a3" transparent opacity={0.35} roughness={0.8} depthWrite={false} />
          <Edges color="#c6ced6" />
        </mesh>
      ))}
    </group>
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
    </group>
  )
}

export function OutrasEstruturas({ layout }: { layout: Layout }) {
  return (
    <>
      {layout.estruturas.map((e) =>
        e.tipo === 'contentores' ? <Contentores key={e.id} e={e} /> : e.tipo === 'zona-chao' ? <ZonaChao key={e.id} e={e} /> : null,
      )}
    </>
  )
}

/** Rótulos das estruturas e etiquetas físicas visíveis nas fotografias (ex.: "20" e "21"). */
export function Rotulos({ layout, visiveis }: { layout: Layout; visiveis: boolean }) {
  if (!visiveis) return null
  return (
    <>
      {layout.estruturas.map((e) => {
        // estruturas com número de corredor já mostram a etiqueta verde
        if (e.corredor) return null
        const { altura } = dimensoes(e)
        const p = paraMundo(e, [0, altura + 0.55, 0])
        return (
          <Html key={e.id} position={p} center zIndexRange={[10, 0]} className="rotulo-3d-envolvente">
            <div className={`rotulo-3d ${e.tipo === 'estante-ligeira' ? 'pequeno' : ''}`}>{e.rotulo}</div>
          </Html>
        )
      })}
      {layout.estruturas.map((e) => {
        // etiqueta verde do corredor, no topo da estrutura (como no armazém)
        if (!e.corredor || e.tipo === 'zona-chao') return null
        const L = e.tipo === 'contentores' ? e.colunas * e.larguraContentor : e.modulos * e.larguraModulo
        const alturaTotal = e.tipo === 'contentores' ? e.alturaContentor * e.empilhamento : e.altura
        const x = (e.ladoEtiqueta === 'fim' ? 1 : -1) * (L / 2 + 0.04)
        return (
          <Html key={`${e.id}-corredor`} position={paraMundo(e, [x, Math.min(1.65, alturaTotal - 0.2), 0])} center zIndexRange={[10, 0]}>
            <div
              className={`etiqueta-verde ${e.corredorInferido ? 'inferida' : ''}`}
              title={e.corredorInferido ? `Corredor ${e.corredor} (deduzido, etiqueta não vista)` : `Etiqueta do corredor ${e.corredor} (vista no vídeo/fotografias)`}
            >
              {e.corredor}{e.corredorInferido && '?'}
            </div>
          </Html>
        )
      })}
    </>
  )
}
