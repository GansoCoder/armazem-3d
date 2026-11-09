import { ClipboardPlus, TriangleAlert } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useApp } from '../../hooks/useApp'
import { useInventario } from '../../hooks/useInventario'
import { posicaoPeca } from '../../utils/posicao'
import { formatarQuantidade, nomePeca } from '../../utils/texto'
import { Modal } from '../common/comum'

/** Pergunta quantas unidades recolher antes de pôr a peça na lista de recolha. */
export function PedirQuantidade() {
  const { pecas, locs } = useInventario()
  const { pedidoRecolha, cancelarPedidoRecolha, confirmarRecolha, qtdRecolha, notificar } = useApp()
  const peca = pecas.find((p) => p.id === pedidoRecolha)
  const [texto, setTexto] = useState(() => String((pedidoRecolha && qtdRecolha[pedidoRecolha]) || 1))
  if (!peca) return null

  const qtd = Number(texto.replace(',', '.'))
  const valida = Number.isInteger(qtd) && qtd > 0
  const acimaDoStock = valida && peca.quantidade !== null && qtd > peca.quantidade
  const pos = posicaoPeca(peca, peca.localizacaoId ? locs.get(peca.localizacaoId) : undefined)

  function submeter(e: FormEvent) {
    e.preventDefault()
    if (!valida || !peca) return
    confirmarRecolha(peca.id, qtd)
    notificar(`${qtd} × ${nomePeca(peca)} na lista de recolha.`, 'sucesso')
  }

  return (
    <Modal
      titulo="Adicionar à recolha"
      aoFechar={cancelarPedidoRecolha}
      largura={420}
      rodape={
        <>
          <button className="btn btn-fantasma" onClick={cancelarPedidoRecolha}>Cancelar</button>
          <button className="btn btn-primario" type="submit" form="form-qtd-recolha" disabled={!valida}>
            <ClipboardPlus size={15} aria-hidden /> Adicionar
          </button>
        </>
      }
    >
      <form id="form-qtd-recolha" className="formulario" onSubmit={submeter} noValidate>
        <div className="pedido-peca">
          <span className="ref-destaque mono">{peca.referencia ?? 'Sem referência'}</span>
          <strong>{nomePeca(peca)}</strong>
          <span className="texto-sec">
            {pos ? <>Posição <span className="mono">{pos}</span> · </> : null}Em stock: <span className="mono">{formatarQuantidade(peca.quantidade)}</span>
          </span>
        </div>
        <label>
          <span>Quantidade a recolher</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onFocus={(e) => e.target.select()}
            className="mono qtd-recolha-input"
            aria-invalid={!valida}
            autoFocus
          />
        </label>
        {!valida && <p className="erro-campo">Indique um número inteiro maior que zero.</p>}
        {acimaDoStock && (
          <div className="alerta alerta-aviso" role="status">
            <TriangleAlert size={16} aria-hidden /><span>Mais do que o stock registado ({formatarQuantidade(peca.quantidade)}). Pode adicionar na mesma.</span>
          </div>
        )}
      </form>
    </Modal>
  )
}
