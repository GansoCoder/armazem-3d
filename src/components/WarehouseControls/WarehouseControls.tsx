import { Eye, EyeOff, Home, Map as MapaIcone, RotateCcw, RotateCw, ZoomIn, ZoomOut } from 'lucide-react'
import type { RefObject } from 'react'
import type { ControloCamara } from '../Warehouse3D/CameraRig'
import { COR_ESTADO, ROTULO_ESTADO } from '../../utils/stock'

export function WarehouseControls({
  controlo,
  rotulos,
  setRotulos,
}: {
  controlo: RefObject<ControloCamara | null>
  rotulos: boolean
  setRotulos: (v: boolean) => void
}) {
  const c = () => controlo.current
  const botoes = [
    { rotulo: 'Aproximar', Icone: ZoomIn, acao: () => c()?.ampliar(0.7) },
    { rotulo: 'Afastar', Icone: ZoomOut, acao: () => c()?.ampliar(1.4) },
    { rotulo: 'Rodar para a esquerda', Icone: RotateCcw, acao: () => c()?.rodar(-Math.PI / 8) },
    { rotulo: 'Rodar para a direita', Icone: RotateCw, acao: () => c()?.rodar(Math.PI / 8) },
    { rotulo: 'Vista de cima', Icone: MapaIcone, acao: () => c()?.vistaTopo() },
    { rotulo: 'Repor vista inicial', Icone: Home, acao: () => c()?.repor() },
  ]
  return (
    <div className="controlos-3d" role="toolbar" aria-label="Navegação 3D">
      {botoes.map(({ rotulo, Icone, acao }) => (
        <button key={rotulo} className="btn-icone" onClick={acao} aria-label={rotulo} title={rotulo}>
          <Icone size={18} />
        </button>
      ))}
      <span className="controlos-sep" aria-hidden />
      <button
        className={`btn-icone ${rotulos ? 'ativo' : ''}`}
        onClick={() => setRotulos(!rotulos)}
        aria-pressed={rotulos}
        aria-label={rotulos ? 'Ocultar rótulos' : 'Mostrar rótulos'}
        title={rotulos ? 'Ocultar rótulos' : 'Mostrar rótulos'}
      >
        {rotulos ? <Eye size={18} /> : <EyeOff size={18} />}
      </button>
    </div>
  )
}

export function Legenda({ filtroAtivo }: { filtroAtivo: boolean }) {
  return (
    <div className="legenda" aria-label="Legenda">
      <div className="legenda-titulo">Legenda</div>
      <ul>
        {(['disponivel', 'baixo', 'sem_stock', 'por_confirmar'] as const).map((k) => (
          <li key={k}><span className="amostra" style={{ background: COR_ESTADO[k] }} />{ROTULO_ESTADO[k]}</li>
        ))}
        <li><span className="amostra amostra-vazia" />Sem registos</li>
        <li><span className="amostra" style={{ background: '#D52B3F', outline: '2px solid #fff3' }} />Selecionada</li>
        {filtroAtivo && <li><span className="amostra" style={{ background: '#5AB0FF' }} />Corresponde à pesquisa</li>}
      </ul>
      <p className="legenda-nota">Laranja só com stock mínimo configurado.</p>
    </div>
  )
}
