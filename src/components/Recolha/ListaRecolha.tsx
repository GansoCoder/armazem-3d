import { Check, MapPin, Printer, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '../../hooks/useApp'
import { useInventario } from '../../hooks/useInventario'
import { posicaoPeca } from '../../utils/posicao'
import { ordenarRecolha } from '../../utils/recolha'
import { codigoPosicao, formatarQuantidade, nomePeca } from '../../utils/texto'
import { Modal } from '../common/comum'

/** Peças a ir buscar, pela ordem sugerida a partir da porta. */
export function useRotaRecolha() {
  const { pecas, locs, layout } = useInventario()
  const { recolha } = useApp()
  return useMemo(() => {
    const escolhidas = recolha.map((id) => pecas.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p)
    return layout ? ordenarRecolha(escolhidas, locs, layout) : { paragens: [], semPosicao: escolhidas }
  }, [recolha, pecas, locs, layout])
}

function LinhaRecolha({ nome, ref, pos, qtd, recolher, feita, aoMarcar, aoAbrir, aoRetirar, aoMudarQtd }: {
  nome: string
  ref: string | null
  pos: string | null
  qtd: string
  recolher: number | undefined
  feita: boolean
  aoMarcar: () => void
  aoAbrir: () => void
  aoRetirar: () => void
  aoMudarQtd: (n: number) => void
}) {
  return (
    <li className={feita ? 'feita' : ''}>
      <label className="check" title="Marcar como recolhida">
        <input type="checkbox" checked={feita} onChange={aoMarcar} />
      </label>
      <button className="recolha-peca" onClick={aoAbrir}>
        <span>{nome}</span>
        <span className="mono texto-sec">{ref ?? 'Sem referência'}{pos ? ` · ${pos}` : ''}</span>
      </button>
      <label className="recolha-recolher" title="Quantidade a recolher">
        <span className="texto-sec">Recolher</span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          className="mono"
          value={recolher ?? ''}
          placeholder="?"
          onChange={(e) => { const n = Number(e.target.value); if (Number.isInteger(n) && n > 0) aoMudarQtd(n) }}
          aria-label={`Quantidade a recolher de ${nome}`}
        />
      </label>
      <span className="mono texto-sec recolha-qtd" title="Em stock">de {qtd}</span>
      <button className="btn-icone" onClick={aoRetirar} aria-label={`Retirar ${nome} da lista`}><X size={15} /></button>
    </li>
  )
}

export function ListaRecolha() {
  const { locs } = useInventario()
  const { setFerramenta, recolha, recolhidas, qtdRecolha, confirmarRecolha, alternarRecolha, alternarRecolhida, limparRecolha, setRecolhaNo3D, setVista, abrirPeca, notificar } = useApp()
  const { paragens, semPosicao } = useRotaRecolha()
  const fechar = () => setFerramenta(null)
  const feitas = new Set(recolhidas)
  const [hoje] = useState(() => new Date().toLocaleDateString('pt-PT'))

  const linha = (p: { id: string; nome: string; ref: string | null; pos: string | null; qtd: string }) => (
    <LinhaRecolha
      key={p.id}
      {...p}
      recolher={qtdRecolha[p.id]}
      aoMudarQtd={(n) => confirmarRecolha(p.id, n)}
      feita={feitas.has(p.id)}
      aoMarcar={() => alternarRecolhida(p.id)}
      aoAbrir={() => { abrirPeca(p.id); fechar() }}
      aoRetirar={() => alternarRecolha(p.id)}
    />
  )

  return (
    <Modal
      titulo={`Lista de recolha (${recolha.length})`}
      aoFechar={fechar}
      largura={720}
      rodape={
        <>
          <button
            className="btn btn-fantasma rodape-esquerda"
            disabled={recolha.length === 0}
            onClick={() => { if (window.confirm('Esvaziar a lista de recolha?')) { limparRecolha(); notificar('Lista de recolha esvaziada.', 'sucesso') } }}
          >
            <Trash2 size={15} aria-hidden /> Esvaziar
          </button>
          <button className="btn btn-fantasma" disabled={recolha.length === 0} onClick={() => window.print()}><Printer size={15} aria-hidden /> Imprimir</button>
          <button
            className="btn btn-primario"
            disabled={paragens.length === 0}
            onClick={() => { setRecolhaNo3D(true); setVista('3d'); fechar() }}
          >
            <MapPin size={15} aria-hidden /> Ver percurso no armazém
          </button>
        </>
      }
    >
      {recolha.length === 0 ? (
        <div className="vazio">
          <p>A lista está vazia.</p>
          <p className="texto-sec">Use “Adicionar à recolha” na ficha de uma peça, na listagem ou no organograma.</p>
        </div>
      ) : (
        <div className="recolha">
          <p className="nota">Ordem sugerida a partir da porta, sempre para a posição mais próxima (aproximada). Marque cada peça quando a recolher.</p>
          <ol className="recolha-paragens">
            {paragens.map((g) => (
              <li key={g.localizacao.id}>
                <div className="recolha-paragem">
                  <span className="recolha-n">{g.n}</span>
                  <strong className="mono">{codigoPosicao(g.localizacao, null) ?? g.localizacao.id}</strong>
                  <span className="texto-sec">{g.localizacao.descricao}</span>
                </div>
                <ul className="recolha-pecas">
                  {g.pecas.map((p) => linha({ id: p.id, nome: nomePeca(p), ref: p.referencia, pos: codigoPosicao(g.localizacao, p.caixa), qtd: formatarQuantidade(p.quantidade) }))}
                </ul>
              </li>
            ))}
          </ol>
          {semPosicao.length > 0 && (
            <section>
              <h3 className="recolha-sem">Sem posição no 3D ({semPosicao.length})</h3>
              <ul className="recolha-pecas">
                {semPosicao.map((p) => linha({ id: p.id, nome: nomePeca(p), ref: p.referencia, pos: posicaoPeca(p, p.localizacaoId ? locs.get(p.localizacaoId) : undefined), qtd: formatarQuantidade(p.quantidade) }))}
              </ul>
            </section>
          )}
        </div>
      )}

      {createPortal(
        <div className="area-impressao impressao-lista" aria-hidden>
          <h1>Lista de recolha — {hoje}</h1>
          <table>
            <thead><tr><th>#</th><th>Posição</th><th>Referência</th><th>Designação</th><th>Recolher</th><th>Stock</th><th><Check size={12} /></th></tr></thead>
            <tbody>
              {paragens.flatMap((g) => g.pecas.map((p) => (
                <tr key={p.id}><td>{g.n}</td><td>{codigoPosicao(g.localizacao, p.caixa)}</td><td>{p.referencia}</td><td>{nomePeca(p)}</td><td>{qtdRecolha[p.id] ?? ''}</td><td>{formatarQuantidade(p.quantidade)}</td><td>☐</td></tr>
              )))}
              {semPosicao.map((p) => (
                <tr key={p.id}><td>—</td><td>{p.posicaoOrigem ?? 'Por confirmar'}</td><td>{p.referencia}</td><td>{nomePeca(p)}</td><td>{qtdRecolha[p.id] ?? ''}</td><td>{formatarQuantidade(p.quantidade)}</td><td>☐</td></tr>
              ))}
            </tbody>
          </table>
        </div>,
        document.body,
      )}
    </Modal>
  )
}
