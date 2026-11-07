import { Printer } from 'lucide-react'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '../../hooks/useApp'
import { useInventario } from '../../hooks/useInventario'
import { definirEnderecoBase, enderecoBase, urlLocalizacao, urlPeca } from '../../utils/ligacoes'
import { codigoPosicao } from '../../utils/texto'
import { Modal } from '../common/comum'
import { QR } from './QR'

/**
 * Etiquetas com código QR para imprimir (folhas A4 de 3 × 8 etiquetas de 70 × 37 mm).
 * Ao ler o QR com a câmara do telemóvel, a aplicação abre nessa posição ou nessa peça.
 */

interface Etiqueta {
  chave: string
  codigo: string
  linha1: string
  linha2?: string
  url: string
}

type Modo = 'posicoes' | 'caixas'

export function Etiquetas() {
  const { layout, localizacoes, pecasPorLocalizacao } = useInventario()
  const { ferramenta, setFerramenta } = useApp()
  const [modo, setModo] = useState<Modo>('posicoes')
  const [soComPecas, setSoComPecas] = useState(true)
  const [escolhidas, setEscolhidas] = useState<Set<string>>(() => new Set(ferramenta?.estrutura ? [ferramenta.estrutura] : []))
  const [endereco, setEndereco] = useState(enderecoBase)
  const fechar = () => setFerramenta(null)

  const estruturas = useMemo(
    () => [...(layout?.estruturas ?? [])].sort((a, b) => (a.corredor ?? 'zz').localeCompare(b.corredor ?? 'zz', 'pt', { numeric: true }) || a.nome.localeCompare(b.nome, 'pt')),
    [layout],
  )

  const etiquetas = useMemo<Etiqueta[]>(() => {
    const nomes = new Map(estruturas.map((e) => [e.id, e.nome]))
    const locs = localizacoes.filter((l) => escolhidas.has(l.estrutura))
    if (modo === 'posicoes') {
      return locs
        .filter((l) => (l.codigo || (l.codigoParcial && !l.codigoParcial.includes('?'))) && (!soComPecas || (pecasPorLocalizacao.get(l.id)?.length ?? 0) > 0))
        .sort((a, b) => (a.codigo ?? a.codigoParcial ?? '').localeCompare(b.codigo ?? b.codigoParcial ?? '', 'pt', { numeric: true }))
        .map((l) => ({
          chave: l.id,
          codigo: l.codigo ?? l.codigoParcial ?? l.id,
          linha1: nomes.get(l.estrutura) ?? l.estrutura,
          linha2: `${pecasPorLocalizacao.get(l.id)?.length ?? 0} material(ais)`,
          url: urlLocalizacao({ id: l.id, codigo: l.codigo ?? l.codigoParcial ?? null }, endereco),
        }))
    }
    return locs
      .flatMap((l) => (pecasPorLocalizacao.get(l.id) ?? []).map((p) => ({ l, p })))
      .map(({ l, p }) => ({
        chave: `${l.id}|${p.id}`,
        codigo: codigoPosicao(l, p.caixa) ?? l.id,
        linha1: p.referencia ?? 'Sem referência',
        linha2: p.nome ?? undefined,
        url: urlPeca(p, endereco),
      }))
      .sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt', { numeric: true }))
  }, [modo, soComPecas, escolhidas, localizacoes, pecasPorLocalizacao, estruturas, endereco])

  const alternar = (id: string) =>
    setEscolhidas((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const localhost = /localhost|127\.0\.0\.1/.test(endereco)
  const folhas = Math.ceil(etiquetas.length / 24)

  return (
    <Modal
      titulo="Etiquetas QR"
      aoFechar={fechar}
      largura={900}
      rodape={
        <>
          <span className="texto-sec rodape-esquerda">{etiquetas.length} etiqueta(s) · {folhas} folha(s) A4</span>
          <button className="btn btn-fantasma" onClick={fechar}>Fechar</button>
          <button className="btn btn-primario" disabled={etiquetas.length === 0} onClick={() => window.print()}>
            <Printer size={15} aria-hidden /> Imprimir
          </button>
        </>
      }
    >
      <div className="formulario etiquetas-config">
        <div className="grelha-2">
          <label>
            <span>Tipo de etiqueta</span>
            <select value={modo} onChange={(e) => setModo(e.target.value as Modo)}>
              <option value="posicoes">Posições (prateleira + coluna) — para colar na estante</option>
              <option value="caixas">Caixas — uma por material, com a referência</option>
            </select>
          </label>
          <label title="Use o endereço do computador na rede para os telemóveis conseguirem abrir">
            <span>Endereço da aplicação (no QR)</span>
            <input
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              onBlur={() => definirEnderecoBase(endereco)}
              className="mono"
            />
          </label>
        </div>
        {localhost && (
          <div className="alerta alerta-aviso">
            <span>
              Com "localhost" o QR só abre neste computador. Para ler com o telemóvel, arranque com <code>npm run dev:rede</code> e
              escreva aqui o endereço que aparece em "Network" (ex.: <code>http://192.168.1.20:5173/</code>).
            </span>
          </div>
        )}
        {modo === 'posicoes' && (
          <label className="check">
            <input type="checkbox" checked={soComPecas} onChange={(e) => setSoComPecas(e.target.checked)} />
            <span>Só posições com materiais registados</span>
          </label>
        )}

        <fieldset className="etiquetas-estruturas">
          <legend>Estruturas</legend>
          <div className="etiquetas-atalhos">
            <button type="button" className="btn btn-fantasma btn-pequeno" onClick={() => setEscolhidas(new Set(estruturas.map((e) => e.id)))}>Todas</button>
            <button type="button" className="btn btn-fantasma btn-pequeno" onClick={() => setEscolhidas(new Set())}>Nenhuma</button>
          </div>
          <div className="etiquetas-lista">
            {estruturas.map((e) => (
              <label key={e.id} className="check">
                <input type="checkbox" checked={escolhidas.has(e.id)} onChange={() => alternar(e.id)} />
                <span>{e.corredor ? `${e.corredor} · ` : ''}{e.rotulo}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <section>
          <h3 className="etiquetas-titulo">Pré-visualização</h3>
          {etiquetas.length === 0 ? (
            <p className="texto-sec">Escolha pelo menos uma estrutura.</p>
          ) : (
            <div className="etiquetas-previa">
              {etiquetas.slice(0, 6).map((e) => <CartaoEtiqueta key={e.chave} e={e} />)}
              {etiquetas.length > 6 && <p className="texto-sec">… e mais {etiquetas.length - 6}.</p>}
            </div>
          )}
        </section>
      </div>

      {createPortal(
        <div className="area-impressao" aria-hidden>
          {etiquetas.map((e) => <CartaoEtiqueta key={e.chave} e={e} />)}
        </div>,
        document.body,
      )}
    </Modal>
  )
}

function CartaoEtiqueta({ e }: { e: Etiqueta }) {
  return (
    <div className="etiqueta">
      <QR texto={e.url} tamanho="29mm" />
      <div className="etiqueta-texto">
        <strong className="etiqueta-codigo">{e.codigo}</strong>
        <span className="etiqueta-l1">{e.linha1}</span>
        {e.linha2 && <span className="etiqueta-l2">{e.linha2}</span>}
      </div>
    </div>
  )
}
