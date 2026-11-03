import { Edges, Html } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { memo, useState } from 'react'
import type { EstadoStock, Estrutura, Layout, Localizacao, Peca } from '../../types'
import { caixaLocal, graus, paraMundo } from '../../utils/geometria'
import { COR_ESTADO, estadoAgregado } from '../../utils/stock'
import { ehColuna, rotuloLocalizacao } from '../../utils/texto'

/** Volumes clicáveis de cada localização, coloridos pelo estado do stock. */

const COR_SELECAO = '#D52B3F'
const COR_CORRESPONDENCIA = '#5AB0FF'

interface PropsCaixa {
  loc: Localizacao
  estrutura: Estrutura
  estado: EstadoStock | null
  nPecas: number
  selecionada: boolean
  correspondencia: boolean
  atenuada: boolean
  /** Coluna inteira (prateleira por confirmar): só contorno, não clicável — as células por cima recebem os cliques. */
  coluna: boolean
  aoSelecionar: (id: string) => void
}

const naoClicavel = () => null

const CaixaLocalizacao = memo(function CaixaLocalizacao({
  loc, estrutura, estado, nPecas, selecionada, correspondencia, atenuada, coluna, aoSelecionar,
}: PropsCaixa) {
  const [sobre, setSobre] = useState(false)
  const { centro, tamanho } = caixaLocal(estrutura, loc)

  if (coluna) {
    if (estado === null && !selecionada && !correspondencia) return null
    const cor = selecionada ? COR_SELECAO : correspondencia ? COR_CORRESPONDENCIA : COR_ESTADO[estado ?? 'por_confirmar']
    const t: [number, number, number] = [tamanho[0] + 0.04, tamanho[1] + 0.04, tamanho[2] + 0.04]
    return (
      <mesh position={centro} raycast={naoClicavel}>
        <boxGeometry args={t} />
        <meshBasicMaterial color={cor} transparent opacity={atenuada ? 0.03 : selecionada ? 0.18 : 0.1} depthWrite={false} />
        <Edges color={cor} lineWidth={selecionada ? 2 : 1} />
      </mesh>
    )
  }

  let cor = estado ? COR_ESTADO[estado] : '#7d8fa3'
  let opacidade = estado ? 0.3 : 0.03
  if (correspondencia) { cor = COR_CORRESPONDENCIA; opacidade = 0.5 }
  if (atenuada) opacidade = estado ? 0.06 : 0.015
  if (selecionada) { cor = COR_SELECAO; opacidade = 0.5 }
  if (sobre && !selecionada) opacidade = Math.max(opacidade + 0.18, 0.25)

  // arestas só quando interessa: com centenas de células preenchidas, desenhá-las todas pesa
  const mostrarArestas = selecionada || sobre || correspondencia

  const clicar = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.delta > 6) return // foi um arrasto da câmara, não um clique
    aoSelecionar(loc.id)
  }

  return (
    <mesh
      position={centro}
      onClick={clicar}
      onPointerOver={(e) => { e.stopPropagation(); setSobre(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { setSobre(false); document.body.style.cursor = '' }}
    >
      <boxGeometry args={tamanho} />
      <meshBasicMaterial color={cor} transparent opacity={opacidade} depthWrite={false} />
      {mostrarArestas && (
        <Edges color={selecionada ? COR_SELECAO : sobre ? '#ffffff' : cor} lineWidth={selecionada ? 2 : 1} />
      )}
      {sobre && !selecionada && (
        <Html position={[0, tamanho[1] / 2 + 0.25, 0]} center zIndexRange={[12, 0]} style={{ pointerEvents: 'none' }}>
          <div className="dica-3d">
            <strong>{rotuloLocalizacao(loc)}</strong>
            <span>{nPecas === 0 ? 'Sem registos' : `${nPecas} registo${nPecas > 1 ? 's' : ''}`}</span>
          </div>
        </Html>
      )}
    </mesh>
  )
})

/** Marcador (pino + etiqueta) por cima da localização selecionada. */
function Marcador({ loc, estrutura }: { loc: Localizacao; estrutura: Estrutura }) {
  const { centro, tamanho } = caixaLocal(estrutura, loc)
  const topo = paraMundo(estrutura, [centro[0], centro[1] + tamanho[1] / 2, centro[2]])
  const alturaPino = 0.9
  return (
    <group position={topo}>
      <mesh position={[0, alturaPino / 2 + 0.1, 0]}>
        <cylinderGeometry args={[0.015, 0.015, alturaPino, 6]} />
        <meshBasicMaterial color={COR_SELECAO} />
      </mesh>
      <mesh position={[0, 0.12, 0]} rotation-x={Math.PI}>
        <coneGeometry args={[0.12, 0.25, 12]} />
        <meshBasicMaterial color={COR_SELECAO} />
      </mesh>
      <Html position={[0, alturaPino + 0.25, 0]} center zIndexRange={[13, 0]} style={{ pointerEvents: 'none' }}>
        <div className="marcador-3d">{rotuloLocalizacao(loc)}{ehColuna(loc, estrutura.tipo) && ' · prateleira ?'}</div>
      </Html>
    </group>
  )
}

export function Localizacoes3D({
  layout, localizacoes, pecasPorLocalizacao, selecionada, correspondencias, filtroAtivo, aoSelecionar,
}: {
  layout: Layout
  localizacoes: Localizacao[]
  pecasPorLocalizacao: Map<string, Peca[]>
  selecionada: string | null
  correspondencias: Set<string>
  filtroAtivo: boolean
  aoSelecionar: (id: string) => void
}) {
  const estruturas = new Map(layout.estruturas.map((e) => [e.id, e]))
  const locSel = selecionada ? localizacoes.find((l) => l.id === selecionada) : undefined
  const estSel = locSel ? estruturas.get(locSel.estrutura) : undefined

  return (
    <>
      {layout.estruturas.map((e) => (
        <group key={e.id} position={[e.posicao.x, 0, e.posicao.z]} rotation-y={graus(e.rotacaoY)}>
          {localizacoes.filter((l) => l.estrutura === e.id).map((l) => {
            const pecas = pecasPorLocalizacao.get(l.id) ?? []
            const corresponde = filtroAtivo && correspondencias.has(l.id)
            return (
              <CaixaLocalizacao
                key={l.id}
                loc={l}
                estrutura={e}
                estado={estadoAgregado(pecas)}
                nPecas={pecas.length}
                selecionada={selecionada === l.id}
                correspondencia={corresponde}
                atenuada={filtroAtivo && !corresponde}
                coluna={ehColuna(l, e.tipo)}
                aoSelecionar={aoSelecionar}
              />
            )
          })}
        </group>
      ))}
      {locSel && estSel && <Marcador loc={locSel} estrutura={estSel} />}
    </>
  )
}
