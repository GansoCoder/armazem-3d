import { RotateCcw } from 'lucide-react'
import { useMemo } from 'react'
import { useApp } from '../../hooks/useApp'
import { useInventario } from '../../hooks/useInventario'
import type { EstadoStock, Filtros as TFiltros } from '../../types'
import { grupoPosicao } from '../../utils/posicao'
import { FILTROS_VAZIOS, filtrosAtivos, SEM_CATEGORIA } from '../../utils/pesquisa'
import { ROTULO_ESTADO } from '../../utils/stock'

export function Filtros() {
  const { categorias, pecas, locs } = useInventario()
  // áreas presentes nos dados, com o número de peças de cada uma
  const areas = useMemo(() => {
    const n = new Map<string, number>()
    for (const p of pecas) {
      const g = grupoPosicao(p, p.localizacaoId ? locs.get(p.localizacaoId) : undefined)
      n.set(g, (n.get(g) ?? 0) + 1)
    }
    return [...n.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt', { numeric: true }))
  }, [pecas, locs])
  const { filtros, setFiltros } = useApp()
  const definir = <K extends keyof TFiltros>(k: K, v: TFiltros[K]) => setFiltros({ ...filtros, [k]: v })

  return (
    <div className="filtros" role="group" aria-label="Filtros">
      <label>
        <span>Categoria</span>
        <select value={filtros.categoria} onChange={(e) => definir('categoria', e.target.value)}>
          <option value="">Todas</option>
          {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          <option value={SEM_CATEGORIA}>Categoria por confirmar</option>
        </select>
      </label>
      <label>
        <span>Área (pela posição)</span>
        <select value={filtros.zona} onChange={(e) => definir('zona', e.target.value)}>
          <option value="">Todas</option>
          {areas.map(([a, n]) => <option key={a} value={a}>{a} ({n})</option>)}
        </select>
      </label>
      <label>
        <span>No modelo 3D</span>
        <select value={filtros.no3D} onChange={(e) => definir('no3D', e.target.value as TFiltros['no3D'])}>
          <option value="">Todas</option>
          <option value="sim">Com posição no 3D</option>
          <option value="nao">Sem posição no 3D</option>
        </select>
      </label>
      <label>
        <span>Estado do stock</span>
        <select value={filtros.estado} onChange={(e) => definir('estado', e.target.value as '' | EstadoStock)}>
          <option value="">Todos</option>
          {(Object.keys(ROTULO_ESTADO) as EstadoStock[]).map((k) => <option key={k} value={k}>{ROTULO_ESTADO[k]}</option>)}
        </select>
      </label>
      <label>
        <span>Tipo de registo</span>
        <select value={filtros.tipoRegisto} onChange={(e) => definir('tipoRegisto', e.target.value as TFiltros['tipoRegisto'])}>
          <option value="">Todos</option>
          <option value="referencia">Com referência</option>
          <option value="observacao">Observação (sem referência)</option>
        </select>
      </label>
      <button className="btn btn-fantasma" onClick={() => setFiltros(FILTROS_VAZIOS)} disabled={filtrosAtivos(filtros) === 0}>
        <RotateCcw size={14} aria-hidden /> Limpar filtros
      </button>
    </div>
  )
}
