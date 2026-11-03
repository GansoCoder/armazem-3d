import { Canvas } from '@react-three/fiber'
import { Info, PanelLeftOpen } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../../hooks/useApp'
import { useInventario } from '../../hooks/useInventario'
import { usePecasVisiveis } from '../../hooks/usePecasVisiveis'
import { enquadrarLocalizacao, vistaInicial } from '../../utils/geometria'
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

export default function Warehouse3D({ visivel }: { visivel: boolean }) {
  const { dados, localizacoes, locs, pecasPorLocalizacao } = useInventario()
  const { localizacaoSelecionada, selecionarLocalizacao, pedidoFoco, setSobreAberto } = useApp()
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

  const layout = dados?.layout
  const inicial = useMemo(() => (layout ? vistaInicial(layout) : null), [layout])
  const correspondencias = useMemo(
    () => new Set(visiveis.map((p) => p.localizacaoId).filter((id): id is string => !!id)),
    [visiveis],
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
      {navegador && (
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
          <Estantes layout={layout} estruturaFoco={localizacaoSelecionada ? (locs.get(localizacaoSelecionada)?.estrutura ?? null) : null} />
          <OutrasEstruturas layout={layout} />
          <Decoracao layout={layout} rotulos={rotulos} />
          <Localizacoes3D
            layout={layout}
            localizacoes={localizacoes}
            pecasPorLocalizacao={pecasPorLocalizacao}
            selecionada={localizacaoSelecionada}
            correspondencias={correspondencias}
            filtroAtivo={filtroAtivo}
            aoSelecionar={(id) => selecionarLocalizacao(id)}
          />
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

        {!navegador && (
          <button className="btn btn-secundario abrir-navegador" onClick={() => setNavegador(true)}>
            <PanelLeftOpen size={16} aria-hidden /> Estruturas
          </button>
        )}

        <WarehouseControls controlo={controlo} rotulos={rotulos} setRotulos={setRotulos} />
        <Legenda filtroAtivo={filtroAtivo} />

        <button className="aviso-escala" onClick={() => setSobreAberto(true)}>
          <Info size={14} aria-hidden />
          <span>Representação aproximada — não está à escala.</span>
          <span className="sublinhado">Saber mais</span>
        </button>

        {filtroAtivo && (
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
