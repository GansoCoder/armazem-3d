import { MapPin, Search, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useApp } from '../../hooks/useApp'
import { useInventario } from '../../hooks/useInventario'
import { pesquisarLocalizacoes, pesquisarPecas } from '../../utils/pesquisa'
import { estadoStock } from '../../utils/stock'
import { posicaoPeca } from '../../utils/posicao'
import { formatarQuantidade, nomePeca, rotuloLocalizacao } from '../../utils/texto'
import { EstadoBadge, Foto } from '../common/comum'

const MAX_PECAS = 8
const MAX_LOCS = 5

type Item = { tipo: 'peca'; id: string } | { tipo: 'loc'; id: string }

export function SearchBar() {
  const { pecas, localizacoes, locs, estruturas } = useInventario()
  const { consulta, setConsulta, localizarPeca, selecionarLocalizacao, setVista } = useApp()
  const [aberto, setAberto] = useState(false)
  const [ativo, setAtivo] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const caixaRef = useRef<HTMLDivElement>(null)
  const listaId = useId()

  const { resPecas, resLocs, totalPecas } = useMemo(() => {
    if (!consulta.trim()) return { resPecas: [], resLocs: [], totalPecas: 0 }
    const ctx = { locs, estruturas }
    const todas = pesquisarPecas(consulta, pecas, ctx)
    return {
      resPecas: todas.slice(0, MAX_PECAS),
      resLocs: pesquisarLocalizacoes(consulta, localizacoes, ctx).slice(0, MAX_LOCS),
      totalPecas: todas.length,
    }
  }, [consulta, pecas, localizacoes, locs, estruturas])

  const itens: Item[] = [
    ...resPecas.map((p) => ({ tipo: 'peca' as const, id: p.id })),
    ...resLocs.map((l) => ({ tipo: 'loc' as const, id: l.id })),
  ]

  // Atalho "/" para focar a pesquisa, em qualquer vista.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName)) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [])

  useEffect(() => {
    const fora = (e: MouseEvent) => {
      if (!caixaRef.current?.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [])

  function escolher(item: Item) {
    setAberto(false)
    inputRef.current?.blur()
    if (item.tipo === 'peca') localizarPeca(item.id)
    else {
      setVista('3d')
      selecionarLocalizacao(item.id, { focar: true })
    }
  }

  function aoTeclar(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAberto(true)
      setAtivo((a) => Math.min(a + 1, itens.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAtivo((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter' && itens[ativo]) {
      e.preventDefault()
      escolher(itens[ativo])
    } else if (e.key === 'Escape') {
      if (aberto) setAberto(false)
      else setConsulta('')
    }
  }

  const mostrar = aberto && consulta.trim() !== ''
  const idItem = (i: number) => `${listaId}-${i}`

  return (
    <div className="pesquisa" ref={caixaRef}>
      <Search className="pesquisa-icone" size={18} aria-hidden />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={mostrar}
        aria-controls={listaId}
        aria-activedescendant={mostrar && itens[ativo] ? idItem(ativo) : undefined}
        aria-label="Pesquisar peças, referências ou localizações"
        placeholder="Pesquisar referência, nome, localização…"
        value={consulta}
        onChange={(e) => {
          setConsulta(e.target.value)
          setAtivo(0)
          setAberto(true)
        }}
        onFocus={() => setAberto(true)}
        onKeyDown={aoTeclar}
        autoComplete="off"
        spellCheck={false}
      />
      {consulta ? (
        <button className="pesquisa-limpar" onClick={() => { setConsulta(''); inputRef.current?.focus() }} aria-label="Limpar pesquisa">
          <X size={16} />
        </button>
      ) : (
        <kbd className="pesquisa-atalho" aria-hidden>/</kbd>
      )}

      {mostrar && (
        <div className="sugestoes" id={listaId} role="listbox" aria-label="Resultados da pesquisa">
          {itens.length === 0 && (
            <div className="sugestoes-vazio">
              Sem resultados para <strong>“{consulta}”</strong>.
              <span>Experimente parte da referência (ex.: 4217) ou um código de localização (ex.: CG-02).</span>
            </div>
          )}
          {resPecas.length > 0 && (
            <div className="sugestoes-grupo">
              <div className="sugestoes-titulo">
                Peças {totalPecas > MAX_PECAS && <span>· a mostrar {MAX_PECAS} de {totalPecas} (ver todas na listagem)</span>}
              </div>
              {resPecas.map((p, i) => {
                const loc = p.localizacaoId ? locs.get(p.localizacaoId) : undefined
                return (
                  <div
                    key={p.id}
                    id={idItem(i)}
                    role="option"
                    aria-selected={ativo === i}
                    className={`sugestao ${ativo === i ? 'ativa' : ''}`}
                    onMouseEnter={() => setAtivo(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => escolher({ tipo: 'peca', id: p.id })}
                  >
                    <Foto foto={p.fotografias[0]} miniatura className="sugestao-foto" />
                    <div className="sugestao-texto">
                      <div className="sugestao-nome">{nomePeca(p)}</div>
                      <div className="sugestao-meta">
                        <span className="mono">{p.referencia ?? 'Sem referência'}</span>
                        <span className={loc ? '' : 'por-confirmar'} title={loc ? undefined : 'Sem posição no modelo 3D'}>
                          <MapPin size={12} aria-hidden /> {posicaoPeca(p, loc) ?? 'Localização por confirmar'}
                          {!loc && posicaoPeca(p, loc) && ' · sem 3D'}
                        </span>
                      </div>
                    </div>
                    <div className="sugestao-qtd">
                      <span className="mono">
                        {formatarQuantidade(p.quantidade)}
                        {p.quantidade !== null && p.camposEstimados.includes('quantidade') && ' (est.)'}
                      </span>
                      <EstadoBadge estado={estadoStock(p)} compacto />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {resLocs.length > 0 && (
            <div className="sugestoes-grupo">
              <div className="sugestoes-titulo">Localizações</div>
              {resLocs.map((l, j) => {
                const i = resPecas.length + j
                return (
                  <div
                    key={l.id}
                    id={idItem(i)}
                    role="option"
                    aria-selected={ativo === i}
                    className={`sugestao ${ativo === i ? 'ativa' : ''}`}
                    onMouseEnter={() => setAtivo(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => escolher({ tipo: 'loc', id: l.id })}
                  >
                    <div className="sugestao-foto sugestao-icone"><MapPin size={16} aria-hidden /></div>
                    <div className="sugestao-texto">
                      <div className="sugestao-nome mono">{rotuloLocalizacao(l)}</div>
                      <div className="sugestao-meta">{l.descricao}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
