import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, FileText, MapPin, PackageOpen, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useApp } from '../../hooks/useApp'
import { useInventario } from '../../hooks/useInventario'
import { usePecasVisiveis } from '../../hooks/usePecasVisiveis'
import type { Localizacao, Peca } from '../../types'
import { motivoSem3D, posicaoPeca } from '../../utils/posicao'
import { FILTROS_VAZIOS } from '../../utils/pesquisa'
import { estadoStock } from '../../utils/stock'
import { formatarQuantidade, formatarValor, nomePeca } from '../../utils/texto'
import { EstadoBadge, Estimado, Foto, PorConfirmar, TagLocal } from '../common/comum'

type Coluna = 'referencia' | 'nome' | 'localizacao' | 'quantidade' | 'valor'
const POR_PAGINA = 25

interface Ordem { col: Coluna; asc: boolean }

function CabecalhoOrdenavel({ col, ordem, aoOrdenar, children }: { col: Coluna; ordem: Ordem; aoOrdenar: (o: Ordem) => void; children: string }) {
  const ativa = ordem.col === col
  const Icone = !ativa ? ArrowUpDown : ordem.asc ? ArrowUp : ArrowDown
  return (
    <th aria-sort={ativa ? (ordem.asc ? 'ascending' : 'descending') : 'none'}>
      <button className="th-ordenar" onClick={() => aoOrdenar({ col, asc: ativa ? !ordem.asc : true })}>
        {children} <Icone size={13} aria-hidden />
      </button>
    </th>
  )
}

function valorOrdenacao(p: Peca, c: Coluna, loc: Localizacao | undefined): string | number | null {
  switch (c) {
    case 'referencia': return p.referencia
    case 'nome': return p.nome
    case 'localizacao': return posicaoPeca(p, loc)
    case 'quantidade': return p.quantidade
    case 'valor': return p.valorStock ?? null
  }
}

export function PartsList() {
  const { pecas: todas, locs } = useInventario()
  const { pecas, ativo } = usePecasVisiveis()
  const { abrirPeca, localizarPeca, pecaSelecionada, setConsulta, setFiltros, abrirEditor } = useApp()
  const [ordem, setOrdemEstado] = useState<Ordem>({ col: 'referencia', asc: true })
  const [paginaPedida, setPagina] = useState(0)

  const ordenadas = useMemo(() => {
    const r = [...pecas]
    r.sort((a, b) => {
      const va = valorOrdenacao(a, ordem.col, locs.get(a.localizacaoId ?? ''))
      const vb = valorOrdenacao(b, ordem.col, locs.get(b.localizacaoId ?? ''))
      if (va === null && vb === null) return 0
      if (va === null) return 1 // valores por confirmar ficam sempre no fim
      if (vb === null) return -1
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), 'pt', { numeric: true })
      return ordem.asc ? cmp : -cmp
    })
    return r
  }, [pecas, ordem, locs])

  const setOrdem = (o: Ordem) => { setOrdemEstado(o); setPagina(0) }
  const totalPaginas = Math.max(1, Math.ceil(ordenadas.length / POR_PAGINA))
  const pagina = Math.min(paginaPedida, totalPaginas - 1) // a pesquisa pode reduzir o número de páginas
  const visiveis = ordenadas.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA)

  if (todas.length === 0) {
    return (
      <section className="lista vazio-total">
        <PackageOpen size={40} aria-hidden />
        <h2>Ainda não existem peças registadas</h2>
        <p>Adicione peças em <code>src/data/parts.json</code> ou crie um rascunho local.</p>
        <button className="btn btn-primario" onClick={() => abrirEditor(null)}><Plus size={16} /> Nova peça</button>
      </section>
    )
  }

  return (
    <section className="lista" aria-label="Listagem de peças">
      <div className="lista-topo">
        <div>
          <h1>Listagem de peças</h1>
          <p className="texto-sec">
            {ativo ? <>{pecas.length} de {todas.length} registos correspondem à pesquisa/filtros</> : <>{todas.length} registos</>}
            {' · '}{todas.filter((p) => p.localizacaoId).length} com posição no modelo 3D
          </p>
        </div>
        {ativo && (
          <button className="btn btn-fantasma" onClick={() => { setConsulta(''); setFiltros(FILTROS_VAZIOS) }}>
            Limpar pesquisa e filtros
          </button>
        )}
      </div>

      {pecas.length === 0 ? (
        <div className="lista-sem-resultados">
          <p><strong>Nenhuma peça corresponde à pesquisa ou aos filtros.</strong></p>
          <p className="texto-sec">Verifique a ortografia, use parte da referência ou limpe os filtros.</p>
        </div>
      ) : (
        <div className="tabela-envolvente">
          <table className="tabela">
            <thead>
              <tr>
                <th className="col-foto"><span className="sr-only">Fotografia</span></th>
                <CabecalhoOrdenavel col="referencia" ordem={ordem} aoOrdenar={setOrdem}>Referência</CabecalhoOrdenavel>
                <CabecalhoOrdenavel col="nome" ordem={ordem} aoOrdenar={setOrdem}>Nome</CabecalhoOrdenavel>
                <th className="col-desc">Descrição</th>
                <CabecalhoOrdenavel col="localizacao" ordem={ordem} aoOrdenar={setOrdem}>Localização</CabecalhoOrdenavel>
                <CabecalhoOrdenavel col="quantidade" ordem={ordem} aoOrdenar={setOrdem}>Quantidade</CabecalhoOrdenavel>
                <CabecalhoOrdenavel col="valor" ordem={ordem} aoOrdenar={setOrdem}>Valor</CabecalhoOrdenavel>
                <th>Categoria</th>
                <th className="col-acoes">Ações</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((p) => {
                const loc = p.localizacaoId ? locs.get(p.localizacaoId) : undefined
                const est = (c: string) => p.camposEstimados.includes(c)
                return (
                  <tr
                    key={p.id}
                    className={pecaSelecionada === p.id ? 'selecionada' : ''}
                    onClick={() => abrirPeca(p.id)}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) abrirPeca(p.id) }}
                    aria-label={`Abrir ficha de ${nomePeca(p)}`}
                  >
                    <td className="col-foto"><Foto foto={p.fotografias[0]} miniatura className="miniatura" /></td>
                    <td data-rotulo="Referência" className="mono">
                      {p.referencia ?? <PorConfirmar texto="Sem referência" />}
                    </td>
                    <td data-rotulo="Nome" className="col-nome">
                      <span>{p.nome ?? <PorConfirmar texto="Designação por confirmar" />}</span>
                      {p.origemLocal && <TagLocal origem={p.origemLocal} />}
                    </td>
                    <td data-rotulo="Descrição" className="col-desc texto-sec"><span className="clamp-2">{p.descricao ?? <span className="por-confirmar" title="Por confirmar">—</span>}</span></td>
                    <td data-rotulo="Localização" className="mono">
                      {posicaoPeca(p, loc) ?? <PorConfirmar texto="Localização por confirmar" />}
                      {loc && est('localizacaoId') && <> <Estimado /></>}
                      {!loc && posicaoPeca(p, loc) && <> <span className="tag" title={motivoSem3D(p)}>sem 3D</span></>}
                    </td>
                    <td data-rotulo="Quantidade">
                      {p.quantidade !== null && (
                        <span className="qtd">
                          <span className="mono">{formatarQuantidade(p.quantidade)}</span>
                          {est('quantidade') && <Estimado />}
                        </span>
                      )}
                      <EstadoBadge estado={estadoStock(p)} />
                    </td>
                    <td data-rotulo="Valor" className="mono col-valor">{formatarValor(p.valorStock)}</td>
                    <td data-rotulo="Categoria">
                      {p.categoria ? <>{p.categoria} {est('categoria') && <Estimado />}</> : <span className="por-confirmar" title="Por confirmar">—</span>}
                    </td>
                    <td className="col-acoes" onClick={(e) => e.stopPropagation()}>
                      <button className="btn btn-fantasma btn-pequeno" onClick={() => abrirPeca(p.id)} aria-label={`Ver ficha de ${nomePeca(p)}`}>
                        <FileText size={14} aria-hidden /> Ficha
                      </button>
                      <button
                        className="btn btn-secundario btn-pequeno"
                        onClick={() => localizarPeca(p.id)}
                        disabled={!loc}
                        title={loc ? 'Ver no armazém (vista 3D)' : motivoSem3D(p)}
                      >
                        <MapPin size={14} aria-hidden /> Ver no armazém
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPaginas > 1 && (
        <nav className="paginacao" aria-label="Paginação">
          <button className="btn-icone" disabled={pagina === 0} onClick={() => setPagina(pagina - 1)} aria-label="Página anterior"><ChevronLeft size={18} /></button>
          <span>Página {pagina + 1} de {totalPaginas}</span>
          <button className="btn-icone" disabled={pagina >= totalPaginas - 1} onClick={() => setPagina(pagina + 1)} aria-label="Página seguinte"><ChevronRight size={18} /></button>
        </nav>
      )}
    </section>
  )
}
