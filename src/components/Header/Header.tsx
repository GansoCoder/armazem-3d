import { Box, Info, List, Plus, SlidersHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useApp } from '../../hooks/useApp'
import { useInventario } from '../../hooks/useInventario'
import { filtrosAtivos } from '../../utils/pesquisa'
import { Filtros } from '../Filters/Filters'
import { SearchBar } from '../SearchBar/SearchBar'

export function Header() {
  const { pecas } = useInventario()
  const { vista, setVista, filtros, abrirEditor, setSobreAberto } = useApp()
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const caixaFiltros = useRef<HTMLDivElement>(null)
  const nFiltros = filtrosAtivos(filtros)
  const comReferencia = pecas.filter((p) => p.referencia).length

  useEffect(() => {
    if (!filtrosAbertos) return
    const fora = (e: MouseEvent) => {
      if (!caixaFiltros.current?.contains(e.target as Node)) setFiltrosAbertos(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setFiltrosAbertos(false)
    document.addEventListener('mousedown', fora)
    window.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fora)
      window.removeEventListener('keydown', esc)
    }
  }, [filtrosAbertos])

  return (
    <header className="cabecalho">
      <div className="marca">
        <span className="marca-barra" aria-hidden />
        <span className="marca-texto">
          ARMAZÉM <span className="marca-sep">|</span> <span className="marca-sub">GESTÃO DE PEÇAS</span>
        </span>
      </div>

      <SearchBar />

      <div className="cabecalho-acoes">
        <div className="contadores" title="Registos no inventário (dados base + alterações locais)">
          <span><strong>{comReferencia}</strong> referências</span>
          <span className="contadores-sep" aria-hidden>·</span>
          <span><strong>{pecas.length}</strong> registos</span>
        </div>

        <div className="alternador" role="tablist" aria-label="Vista">
          <button role="tab" aria-selected={vista === '3d'} className={vista === '3d' ? 'ativo' : ''} onClick={() => setVista('3d')}>
            <Box size={16} aria-hidden /> <span>Vista 3D</span>
          </button>
          <button role="tab" aria-selected={vista === 'lista'} className={vista === 'lista' ? 'ativo' : ''} onClick={() => setVista('lista')}>
            <List size={16} aria-hidden /> <span>Listagem</span>
          </button>
        </div>

        <div className="popover-ancora" ref={caixaFiltros}>
          <button
            className={`btn btn-secundario ${nFiltros ? 'com-filtros' : ''}`}
            aria-expanded={filtrosAbertos}
            onClick={() => setFiltrosAbertos((v) => !v)}
          >
            <SlidersHorizontal size={16} aria-hidden />
            <span className="ocultar-movel">Filtros</span>
            {nFiltros > 0 && <span className="contador-pill">{nFiltros}</span>}
          </button>
          {filtrosAbertos && (
            <div className="popover">
              <Filtros />
            </div>
          )}
        </div>

        <button className="btn btn-secundario" onClick={() => abrirEditor(null)} title="Criar peça (rascunho local)">
          <Plus size={16} aria-hidden /> <span className="ocultar-movel">Nova peça</span>
        </button>
        <button className="btn-icone" onClick={() => setSobreAberto(true)} aria-label="Sobre o modelo e os dados" title="Sobre o modelo e os dados">
          <Info size={18} />
        </button>
      </div>
    </header>
  )
}
