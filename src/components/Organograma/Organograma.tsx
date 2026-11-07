import { Boxes, Cog, List, MapPin, Network, Pencil, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useApp } from '../../hooks/useApp'
import { useInventario } from '../../hooks/useInventario'
import type { LigacaoComposicao } from '../../types'
import { descendentes, ehGrupo, indexar, nomeNo, raizes, raizesDe, type IndiceComposicao } from '../../utils/composicao'
import { posicaoPeca } from '../../utils/posicao'
import { FILTROS_VAZIOS } from '../../utils/pesquisa'
import { estadoAgregado } from '../../utils/stock'
import { formatarQuantidade, rotuloUqe } from '../../utils/texto'
import { EstadoBadge } from '../common/comum'

/**
 * Vista Organograma: mostra que peças fazem parte de outras (ex.: GCP12 → kits de reparação, anéis tóricos)
 * e que peças formam conjuntos. As ligações são feitas à mão (não existe lista técnica).
 */

/** Caixa de um nó (peça ou grupo). */
function No({ chave, idx, ligacao, foco }: { chave: string; idx: IndiceComposicao; ligacao?: LigacaoComposicao; foco: string | null }) {
  const { abrirPeca, abrirOrganograma } = useApp()
  const { locs } = useInventario()
  const grupo = idx.grupos.get(chave)
  const pecas = idx.pecasPorChave.get(chave) ?? []
  const qtdLigacao = ligacao && (ligacao.quantidade ?? null) !== null ? `×${formatarQuantidade(ligacao.quantidade ?? null)}` : null
  const classe = `org-no ${foco === chave ? 'foco' : ''} ${grupo ? `grupo grupo-${grupo.tipo}` : ''}`

  if (grupo) {
    const Icone = grupo.tipo === 'conjunto' ? Boxes : Cog
    return (
      <button className={classe} onClick={() => abrirOrganograma(chave)} title="Centrar neste nó">
        {qtdLigacao && <span className="org-qtd">{qtdLigacao}</span>}
        <span className="org-tipo"><Icone size={13} aria-hidden /> {grupo.tipo === 'conjunto' ? 'Conjunto' : 'Equipamento'}</span>
        <span className="org-nome">{grupo.nome}</span>
        {grupo.uqe && grupo.uqe !== 'nenhuma' && <span className="tag">{rotuloUqe(grupo.uqe)}</span>}
      </button>
    )
  }

  if (pecas.length === 0) {
    // a referência ligada já não existe no inventário (ex.: material retirado do Excel)
    return (
      <div className={`${classe} em-falta`}>
        {qtdLigacao && <span className="org-qtd">{qtdLigacao}</span>}
        <span className="mono">{chave}</span>
        <span className="texto-sec">Referência não encontrada no inventário</span>
      </div>
    )
  }

  const p = pecas[0]
  const total = pecas.every((x) => x.quantidade === null) ? null : pecas.reduce((n, x) => n + (x.quantidade ?? 0), 0)
  const posicoes = pecas.map((x) => posicaoPeca(x, x.localizacaoId ? locs.get(x.localizacaoId) : undefined)).filter(Boolean)
  return (
    <button className={classe} onClick={() => abrirPeca(p.id)} title="Abrir a ficha da peça">
      {qtdLigacao && <span className="org-qtd" title="Unidades que leva">{qtdLigacao}</span>}
      <span className="mono org-ref">{p.referencia ?? 'Sem referência'}</span>
      <span className="org-nome">{p.nome ?? 'Designação por confirmar'}</span>
      <span className="org-rodape">
        <span className="mono">{formatarQuantidade(total)}</span>
        <EstadoBadge estado={estadoAgregado(pecas) ?? 'por_confirmar'} compacto />
        {posicoes.length > 0 && <span className="mono texto-sec org-pos">{posicoes[0]}{posicoes.length > 1 && ` +${posicoes.length - 1}`}</span>}
      </span>
    </button>
  )
}

/** Ramo do organograma; as folhas de um mesmo nó ficam em coluna quando são muitas (poupa largura). */
function Ramo({ chave, idx, ligacao, foco, caminho }: {
  chave: string
  idx: IndiceComposicao
  ligacao?: LigacaoComposicao
  foco: string | null
  caminho: Set<string>
}) {
  const filhos = caminho.has(chave) ? [] : (idx.filhos.get(chave) ?? [])
  const novoCaminho = new Set(caminho).add(chave)
  const folhas = filhos.filter((l) => !(idx.filhos.get(l.filho)?.length))
  const ramos = filhos.filter((l) => idx.filhos.get(l.filho)?.length)
  const emColuna = folhas.length >= 4
  const itens = emColuna ? ramos : filhos
  return (
    <li>
      <No chave={chave} idx={idx} ligacao={ligacao} foco={foco} />
      {(itens.length > 0 || emColuna) && (
        <ul>
          {itens.map((l) => <Ramo key={`${l.pai}>${l.filho}`} chave={l.filho} idx={idx} ligacao={l} foco={foco} caminho={novoCaminho} />)}
          {emColuna && (
            <li>
              <div className="org-coluna">
                {folhas.map((l) => <No key={`${l.pai}>${l.filho}`} chave={l.filho} idx={idx} ligacao={l} foco={foco} />)}
              </div>
            </li>
          )}
        </ul>
      )}
    </li>
  )
}

export function Organograma() {
  const { pecas, composicao } = useInventario()
  const { focoOrganograma, abrirOrganograma, abrirEditorLigacoes, setFiltros, setConsulta, setVista } = useApp()
  const idx = useMemo(() => indexar(composicao, pecas), [composicao, pecas])
  const todas = useMemo(() => raizes(idx), [idx])

  // estrutura(s) a mostrar: as de topo acima do nó em foco
  const foco = focoOrganograma
  const topos = foco ? raizesDe(foco, idx) : todas.slice(0, 1)
  const [topoEscolhido, setTopoEscolhido] = useState<string | null>(null)
  const topo = (topoEscolhido && topos.includes(topoEscolhido) ? topoEscolhido : topos[0]) ?? null
  const temLigacoes = !!topo && (idx.filhos.has(topo) || idx.grupos.has(topo))

  function mostrarPecas(vista: '3d' | 'lista') {
    if (!topo) return
    setConsulta('')
    setFiltros({ ...FILTROS_VAZIOS, composicao: topo })
    setVista(vista)
  }

  return (
    <section className="organograma" aria-label="Organograma das peças">
      <nav className="navegador org-lista" aria-label="Equipamentos e conjuntos">
        <div className="navegador-topo"><span>Equipamentos e conjuntos</span></div>
        <div className="org-novos">
          <button className="btn btn-secundario btn-pequeno" onClick={() => abrirEditorLigacoes({ chave: null, novoGrupo: 'conjunto' })}>
            <Plus size={14} aria-hidden /> Conjunto
          </button>
          <button className="btn btn-secundario btn-pequeno" onClick={() => abrirEditorLigacoes({ chave: null, novoGrupo: 'equipamento' })}>
            <Plus size={14} aria-hidden /> Equipamento
          </button>
        </div>
        <ul className="navegador-lista">
          {todas.length === 0 && <li className="texto-sec org-vazio-lista">Ainda não há ligações.</li>}
          {todas.map((k) => {
            const g = idx.grupos.get(k)
            const Icone = g ? (g.tipo === 'conjunto' ? Boxes : Cog) : Network
            const n = descendentes(k, idx).size - 1
            return (
              <li key={k}>
                <button className={`navegador-grupo ${topo === k ? 'ativo' : ''}`} onClick={() => abrirOrganograma(k)} aria-current={topo === k}>
                  <Icone size={14} aria-hidden />
                  <span className="navegador-nome">{nomeNo(k, idx)}</span>
                  <span className="navegador-contagem" title="Peças por baixo">{n}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="org-area">
        {!temLigacoes ? (
          <div className="org-vazio">
            <Network size={40} aria-hidden />
            <h2>{foco ? 'Esta peça ainda não tem ligações' : 'Organograma das peças'}</h2>
            <p className="texto-sec">
              Ligue peças que fazem parte de outras (ex.: o GCP12 leva kits de reparação e anéis tóricos) ou que formam um conjunto.
              Abra a ficha de uma peça e use <strong>Editar ligações</strong>, ou crie um conjunto ou equipamento aqui.
            </p>
            <div className="org-vazio-acoes">
              {foco && !ehGrupo(foco) && (
                <button className="btn btn-primario" onClick={() => abrirEditorLigacoes({ chave: foco })}><Pencil size={15} aria-hidden /> Editar ligações desta peça</button>
              )}
              <button className="btn btn-secundario" onClick={() => abrirEditorLigacoes({ chave: null, novoGrupo: 'conjunto', comPeca: foco && !ehGrupo(foco) ? foco : undefined })}>
                <Boxes size={15} aria-hidden /> Novo conjunto
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="org-topo">
              <div>
                <h1>{nomeNo(topo, idx)}</h1>
                <p className="texto-sec">{descendentes(topo, idx).size - 1} peça(s) e grupo(s) por baixo · clique numa peça para abrir a ficha</p>
              </div>
              <div className="org-acoes">
                <button className="btn btn-secundario" onClick={() => abrirEditorLigacoes({ chave: foco ?? topo })}><Pencil size={15} aria-hidden /> Editar ligações</button>
                <button className="btn btn-secundario" onClick={() => mostrarPecas('lista')}><List size={15} aria-hidden /> Ver na listagem</button>
                <button className="btn btn-primario" onClick={() => mostrarPecas('3d')}><MapPin size={15} aria-hidden /> Ver no armazém</button>
              </div>
            </div>
            {topos.length > 1 && (
              <div className="org-usada" role="group" aria-label="Estruturas onde esta peça é usada">
                <span className="texto-sec">Usada em:</span>
                {topos.map((t) => (
                  <button key={t} className={`btn btn-pequeno ${t === topo ? 'btn-secundario' : 'btn-fantasma'}`} onClick={() => setTopoEscolhido(t)}>{nomeNo(t, idx)}</button>
                ))}
              </div>
            )}
            <div className="org-tela">
              <ul className="org-arvore">
                <Ramo chave={topo} idx={idx} foco={foco} caminho={new Set()} />
              </ul>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
