import { Canvas } from '@react-three/fiber'
import { Edges, Html } from '@react-three/drei'
import { ClipboardList, Info, PanelLeftOpen, PencilRuler, X } from 'lucide-react'
import { useRotaRecolha } from '../Recolha/ListaRecolha'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../../hooks/useApp'
import { useInventario } from '../../hooks/useInventario'
import { usePecasVisiveis } from '../../hooks/usePecasVisiveis'
import type { Layout } from '../../types'
import { caixaLocal, enquadrarLocalizacao, graus, vistaInicial } from '../../utils/geometria'
import { EditorPlanta } from '../EditorPlanta/EditorPlanta'
import { LocationNavigator } from '../LocationNavigator/LocationNavigator'
import { LocationPanel } from '../LocationPanel/LocationPanel'
import { Legenda, WarehouseControls } from '../WarehouseControls/WarehouseControls'
import { CameraRig, DeslocamentoVista, type ControloCamara } from './CameraRig'
import { Decoracao, Edificio, ZonasPiso } from './Decoracao'
import { Estantes, OutrasEstruturas, Rotulos } from './Estruturas'
import { Localizacoes3D } from './Localizacoes3D'

function lerPreferencia(chave: string, padrao: boolean): boolean {
  try {
    const v = localStorage.getItem(chave)
    return v === null ? padrao : v === '1'
  } catch {
    return padrao
  }
}

function gravarPreferencia(chave: string, v: boolean) {
  try {
    localStorage.setItem(chave, v ? '1' : '0')
  } catch {
    /* opcional */
  }
}

/** Contorno da estrutura escolhida no editor da planta. */
function ContornoEdicao({ layout, id }: { layout: Layout; id: string }) {
  const e = layout.estruturas.find((x) => x.id === id)
  if (!e) return null
  const c = caixaLocal(e, { modulo: null, nivel: null })
  const tamanho: [number, number, number] = [c.tamanho[0] + 0.25, Math.max(c.tamanho[1], 0.3) + 0.25, c.tamanho[2] + 0.25]
  return (
    <group position={[e.posicao.x, 0, e.posicao.z]} rotation-y={graus(e.rotacaoY)}>
      <mesh position={[c.centro[0], tamanho[1] / 2, c.centro[2]]} raycast={() => null}>
        <boxGeometry args={tamanho} />
        <meshBasicMaterial color="#5ab0ff" transparent opacity={0.07} depthWrite={false} />
        <Edges color="#5ab0ff" />
      </mesh>
      {/* seta no chão a indicar para onde está virada a frente */}
      <mesh position={[0, 0.03, c.tamanho[2] / 2 + 0.45]} rotation-x={-Math.PI / 2} raycast={() => null}>
        <circleGeometry args={[0.25, 3, -Math.PI / 2]} />
        <meshBasicMaterial color="#5ab0ff" />
      </mesh>
    </group>
  )
}

export default function Warehouse3D({ visivel }: { visivel: boolean }) {
  const { dados, layout, localizacoes, locs, pecasPorLocalizacao, plantaEmEdicao, setPlantaEmEdicao, plantaGuardada } = useInventario()
  const { localizacaoSelecionada, selecionarLocalizacao, pedidoFoco, estruturaEditada, setEstruturaEditada, recolhaNo3D, setRecolhaNo3D, setFerramenta, recolhidas } = useApp()
  const editando = !!plantaEmEdicao
  const rota = useRotaRecolha()
  const mostrarRota = recolhaNo3D && !editando && rota.paragens.length > 0
  const { pecas: visiveis, ativo: filtroAtivo } = usePecasVisiveis()
  const controlo = useRef<ControloCamara>(null)
  const [pronto, setPronto] = useState(false)
  const [rotulos, setRotulosEstado] = useState(() => lerPreferencia('armazem3d.rotulos', true))
  const [navegador, setNavegadorEstado] = useState(() => lerPreferencia('armazem3d.navegador', window.innerWidth > 900))

  const setRotulos = (v: boolean) => { setRotulosEstado(v); gravarPreferencia('armazem3d.rotulos', v) }
  const setNavegador = (v: boolean) => { setNavegadorEstado(v); gravarPreferencia('armazem3d.navegador', v) }

  const { pecaSelecionada } = useApp()
  const [largo, setLargo] = useState(() => window.innerWidth > 900)
  useEffect(() => {
    const r = () => setLargo(window.innerWidth > 900)
    window.addEventListener('resize', r)
    return () => window.removeEventListener('resize', r)
  }, [])
  const painelAberto = largo && (!!localizacaoSelecionada || !!pecaSelecionada)

  // vista inicial da planta oficial: não muda enquanto se edita (a câmara não salta)
  const base = dados?.layout
  const inicial = useMemo(() => (base ? vistaInicial(base) : null), [base])
  const focarEstrutura = (id: string) => {
    if (!layout) return
    const enq = enquadrarLocalizacao(layout, {
      id, codigo: null, zona: '', estrutura: id, modulo: null, nivel: null, descricao: '', origemCodigo: 'provisorio', estadoValidacao: 'estimado',
    })
    if (enq) controlo.current?.focar(enq)
  }
  const correspondenciasFiltro = useMemo(
    () => new Set(visiveis.map((p) => p.localizacaoId).filter((id): id is string => !!id)),
    [visiveis],
  )
  // com o percurso de recolha ligado, destacam-se as paragens em vez do resultado da pesquisa
  const correspondencias = useMemo(
    () => (mostrarRota ? new Set(rota.paragens.map((g) => g.localizacao.id)) : correspondenciasFiltro),
    [mostrarRota, rota, correspondenciasFiltro],
  )

  // Enquadrar a câmara quando há um pedido de foco (pesquisa, listagem, navegador...).
  useEffect(() => {
    if (!pedidoFoco || !layout || !visivel || !pronto) return
    const loc = localizacoes.find((l) => l.id === pedidoFoco.id)
    const enq = loc && enquadrarLocalizacao(layout, loc)
    if (enq) controlo.current?.focar(enq)
  }, [pedidoFoco, layout, localizacoes, visivel, pronto])

  useEffect(() => {
    if (!visivel) return
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('.modal, .painel-peca') && !(e.target as HTMLElement).closest('input')) {
        selecionarLocalizacao(null)
      }
    }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [visivel, selecionarLocalizacao])

  if (!layout || !inicial) return null

  return (
    <div className="vista3d">
      {editando ? (
        <EditorPlanta aoFechar={() => undefined} aoFocar={focarEstrutura} />
      ) : navegador && (
        <LocationNavigator aoFechar={() => setNavegador(false)} correspondencias={correspondencias} filtroAtivo={filtroAtivo} />
      )}
      <div className="canvas-area">
        <Canvas
          frameloop="demand"
          dpr={[1, 1.75]}
          camera={{ fov: 45, near: 0.1, far: 300, position: inicial.camara }}
          gl={{ antialias: true }}
          onCreated={() => setPronto(true)}
          aria-label="Modelo 3D do armazém. Use o painel de estruturas para navegar com o teclado."
        >
          <color attach="background" args={['#0b1b2c']} />
          <fog attach="fog" args={['#0b1b2c', 55, 120]} />
          <hemisphereLight args={['#dfe8f2', '#1a2633', 1.1]} />
          <directionalLight position={[10, 18, 12]} intensity={1.3} />
          <directionalLight position={[-12, 10, -8]} intensity={0.4} />
          <Edificio layout={layout} />
          <Estantes
            layout={layout}
            estruturaFoco={editando ? estruturaEditada : localizacaoSelecionada ? (locs.get(localizacaoSelecionada)?.estrutura ?? null) : null}
          />
          <OutrasEstruturas layout={layout} rotulos={rotulos} />
          <Decoracao layout={layout} rotulos={rotulos} />
          <Localizacoes3D
            layout={layout}
            localizacoes={localizacoes}
            pecasPorLocalizacao={pecasPorLocalizacao}
            selecionada={editando ? null : localizacaoSelecionada}
            correspondencias={correspondencias}
            filtroAtivo={(filtroAtivo || mostrarRota) && !editando}
            aoSelecionar={(id) => (editando ? setEstruturaEditada(locs.get(id)?.estrutura ?? null) : selecionarLocalizacao(id))}
          />
          {editando && estruturaEditada && <ContornoEdicao layout={layout} id={estruturaEditada} />}
          {mostrarRota && rota.paragens.map((g) => {
            const feita = g.pecas.every((p) => recolhidas.includes(p.id))
            return (
              <Html key={g.localizacao.id} position={[g.ponto[0], g.ponto[1] + 0.6, g.ponto[2]]} center zIndexRange={[14, 0]}>
                <button className={`paragem-3d ${feita ? 'feita' : ''}`} onClick={() => selecionarLocalizacao(g.localizacao.id, { focar: true })} title={g.localizacao.descricao}>
                  {g.n}
                </button>
              </Html>
            )
          })}
          <Rotulos layout={layout} visiveis={rotulos} />
          <ZonasPiso zonas={layout.zonas} visiveis={rotulos} />
          <CameraRig ref={controlo} inicial={inicial} />
          <DeslocamentoVista px={painelAberto ? 215 : 0} />
        </Canvas>

        {!pronto && (
          <div className="carregando-3d" role="status">
            <span className="spinner" aria-hidden /> A iniciar a vista 3D…
          </div>
        )}

        {!editando && (
          <div className="abrir-navegador">
            {!navegador && (
              <button className="btn btn-secundario" onClick={() => setNavegador(true)}>
                <PanelLeftOpen size={16} aria-hidden /> Estruturas
              </button>
            )}
            <button
              className="btn btn-secundario"
              onClick={() => {
                selecionarLocalizacao(null)
                setEstruturaEditada(null)
                setPlantaEmEdicao(structuredClone(plantaGuardada))
              }}
              title="Criar, mover e alterar estantes e outras estruturas"
            >
              <PencilRuler size={16} aria-hidden /> Editar planta
            </button>
          </div>
        )}

        <WarehouseControls controlo={controlo} rotulos={rotulos} setRotulos={setRotulos} />
        <Legenda filtroAtivo={filtroAtivo} />

        <div className="aviso-escala" role="note">
          <Info size={14} aria-hidden />
          <span>Representação aproximada — não está à escala.</span>
        </div>

        {mostrarRota && (
          <div className="barra-recolha" role="status">
            <ClipboardList size={15} aria-hidden />
            <span>Percurso de recolha: <strong>{rota.paragens.length}</strong> paragem(ns){rota.semPosicao.length > 0 && ` · ${rota.semPosicao.length} sem posição`}</span>
            <button className="btn btn-fantasma btn-pequeno" onClick={() => setFerramenta({ tipo: 'recolha' })}>Ver lista</button>
            <button className="btn-icone" onClick={() => setRecolhaNo3D(false)} aria-label="Esconder o percurso de recolha"><X size={15} /></button>
          </div>
        )}

        {filtroAtivo && !mostrarRota && (
          <div className="resumo-filtro" role="status">
            {correspondencias.size === 0
              ? 'Nenhuma peça corresponde à pesquisa/filtros.'
              : `${correspondencias.size} localização(ões) com peças correspondentes`}
            {visiveis.some((p) => !p.localizacaoId) && ' · algumas peças sem localização'}
          </div>
        )}

        <p className="dica-navegacao">Arrastar: rodar · Botão direito / dois dedos: deslocar · Roda: ampliar · Clique: selecionar</p>
      </div>
      <LocationPanel />
    </div>
  )
}
