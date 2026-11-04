import { ChevronDown, ChevronRight, PanelLeftClose } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useApp } from '../../hooks/useApp'
import { useInventario } from '../../hooks/useInventario'
import { ehColuna, rotuloLocalizacao } from '../../utils/texto'

/** Lista navegável (também por teclado) de estruturas e localizações da vista 3D. */
export function LocationNavigator({ aoFechar, correspondencias, filtroAtivo }: {
  aoFechar: () => void
  correspondencias: Set<string>
  filtroAtivo: boolean
}) {
  const { layout, localizacoes, pecasPorLocalizacao } = useInventario()
  const { localizacaoSelecionada, selecionarLocalizacao } = useApp()
  const [abertas, setAbertas] = useState<Set<string>>(new Set())

  // abre automaticamente o grupo da localização selecionada
  useEffect(() => {
    const loc = localizacoes.find((l) => l.id === localizacaoSelecionada)
    if (loc) setAbertas((a) => (a.has(loc.estrutura) ? a : new Set(a).add(loc.estrutura)))
  }, [localizacaoSelecionada, localizacoes])

  if (!layout) return null
  const alternar = (id: string) =>
    setAbertas((a) => {
      const n = new Set(a)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  return (
    <nav className="navegador" aria-label="Estruturas e localizações">
      <div className="navegador-topo">
        <span>Estruturas</span>
        <button className="btn-icone" onClick={aoFechar} aria-label="Ocultar painel de estruturas" title="Ocultar painel">
          <PanelLeftClose size={16} />
        </button>
      </div>
      <ul className="navegador-lista">
        {layout.estruturas.map((e) => {
          const locs = localizacoes.filter((l) => l.estrutura === e.id)
          const total = locs.reduce((n, l) => n + (pecasPorLocalizacao.get(l.id)?.length ?? 0), 0)
          const coincidencias = filtroAtivo ? locs.filter((l) => correspondencias.has(l.id)).length : 0
          const aberta = abertas.has(e.id)
          return (
            <li key={e.id}>
              <button className="navegador-grupo" aria-expanded={aberta} onClick={() => alternar(e.id)}>
                {aberta ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
                <span className="navegador-nome">{e.rotulo}</span>
                {coincidencias > 0 && <span className="contador-pill azul" title="Localizações que correspondem à pesquisa">{coincidencias}</span>}
                <span className="navegador-contagem" title="Registos nesta estrutura">{total}</span>
              </button>
              {aberta && (
                <ul>
                  {locs.map((l) => {
                    const n = pecasPorLocalizacao.get(l.id)?.length ?? 0
                    return (
                      <li key={l.id}>
                        <button
                          className={`navegador-loc ${localizacaoSelecionada === l.id ? 'ativa' : ''} ${filtroAtivo && correspondencias.has(l.id) ? 'corresponde' : ''}`}
                          onClick={() => {
                            selecionarLocalizacao(l.id, { focar: true })
                            if (window.innerWidth <= 900) aoFechar() // em ecrãs estreitos o painel tapa a cena
                          }}
                          aria-current={localizacaoSelecionada === l.id}
                        >
                          <span className="mono">{rotuloLocalizacao(l)}{ehColuna(l, e.tipo) && <span className="texto-sec"> · coluna</span>}</span>
                          {n > 0 && <span className="navegador-contagem">{n}</span>}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
