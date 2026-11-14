import { Crosshair, Link2, MapPin, Plus, QrCode, X } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../../hooks/useApp'
import { useInventario } from '../../hooks/useInventario'
import type { Fotografia, Peca } from '../../types'
import { copiarTexto, urlLocalizacao } from '../../utils/ligacoes'
import { estadoStock } from '../../utils/stock'
import { ehColuna, formatarQuantidade, nomePeca, rotuloLocalizacao } from '../../utils/texto'
import { EstadoBadge, Estimado, Foto, Modal, TagLocal } from '../common/comum'

function ListaPecas({ pecas, aoAbrir }: { pecas: Peca[]; aoAbrir: (id: string) => void }) {
  return (
    <ul className="lista-pecas-loc">
      {pecas.map((p) => (
        <li key={p.id}>
          <button onClick={() => aoAbrir(p.id)} className="peca-loc">
            {p.fotografias[0] && <Foto foto={p.fotografias[0]} miniatura className="miniatura" />}
            <div className="peca-loc-texto">
              <span className="peca-loc-nome">{nomePeca(p)}</span>
              <span className="mono ref-loc">{p.caixa && <strong className="caixa-loc">{p.caixa}</strong>}{p.referencia ?? 'Sem referência'}</span>
              {p.origemLocal && <TagLocal origem={p.origemLocal} />}
            </div>
            <div className="peca-loc-qtd">
              <span className="mono">{formatarQuantidade(p.quantidade)}{p.quantidade !== null && p.camposEstimados.includes('quantidade') && '*'}</span>
              <EstadoBadge estado={estadoStock(p)} compacto />
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}

export function LocationPanel() {
  const { locs, estruturas, pecasPorLocalizacao } = useInventario()
  const { localizacaoSelecionada, selecionarLocalizacao, abrirPeca, abrirEditor, notificar, setFerramenta } = useApp()
  const [foto, setFoto] = useState<Fotografia | null>(null)
  const loc = localizacaoSelecionada ? locs.get(localizacaoSelecionada) : undefined
  if (!loc) return null
  const estrutura = estruturas.get(loc.estrutura)
  const porCaixa = (a: Peca, b: Peca) => (a.caixa ?? '').localeCompare(b.caixa ?? '') || (a.referencia ?? '').localeCompare(b.referencia ?? '')
  const pecas = [...(pecasPorLocalizacao.get(loc.id) ?? [])].sort(porCaixa)
  const nomeNivel = estrutura && 'nomesNiveis' in estrutura && loc.nivel !== null ? estrutura.nomesNiveis?.[loc.nivel] : null
  const prateleiras = estrutura?.tipo === 'estante-ligeira' || estrutura?.tipo === 'armario'
  // estruturas com número de corredor seguem o formato oficial: prateleira (letra) + coluna
  const contentor = estrutura?.tipo === 'contentores'
  const palete = contentor && estrutura.aspeto === 'palete'
  const zonaChao = estrutura?.tipo === 'zona-chao'
  // prateleiras com código próprio (ex.: armário ARM01–ARM05)
  const numerada = !!estrutura && 'prefixoCodigo' in estrutura && !!estrutura.prefixoCodigo && !estrutura.corredor
  const unica = !!estrutura?.localizacaoUnica
  const formatoOficial = !unica && !contentor && !zonaChao && !numerada && (prateleiras || !!estrutura?.corredor)
  const coluna = ehColuna(loc, estrutura?.tipo)
  // numa célula, mostrar também as peças da mesma coluna cuja prateleira ainda não é conhecida
  const idColuna = prateleiras && !coluna ? [...locs.values()].find((l) => l.estrutura === loc.estrutura && l.modulo === loc.modulo && l.nivel === null)?.id : undefined
  const pecasColuna = idColuna ? (pecasPorLocalizacao.get(idColuna) ?? []) : []

  return (
    <aside className="painel painel-loc" aria-label={`Localização ${rotuloLocalizacao(loc)}`}>
      <header className="painel-cabecalho">
        <div className="painel-icone"><MapPin size={18} aria-hidden /></div>
        <div className="painel-titulo">
          <h2 className="mono">{rotuloLocalizacao(loc)}</h2>
        </div>
        <button
          className="btn-icone"
          onClick={async () => { if (await copiarTexto(urlLocalizacao(loc))) notificar('Ligação para esta posição copiada.', 'sucesso') }}
          aria-label="Copiar ligação para esta posição"
          title="Copiar ligação"
        >
          <Link2 size={18} />
        </button>
        <button
          className="btn-icone"
          onClick={() => setFerramenta({ tipo: 'etiquetas', estrutura: loc.estrutura })}
          aria-label="Imprimir etiquetas QR desta estrutura"
          title="Etiquetas QR"
        >
          <QrCode size={18} />
        </button>
        <button className="btn-icone" onClick={() => selecionarLocalizacao(loc.id, { focar: true })} aria-label="Centrar câmara nesta localização" title="Centrar câmara">
          <Crosshair size={18} />
        </button>
        <button className="btn-icone" onClick={() => selecionarLocalizacao(null)} aria-label="Fechar localização">
          <X size={18} />
        </button>
      </header>

      <div className="painel-corpo">
        <dl className="campos compacto">
          {formatoOficial && (
            <div className="campo">
              <dt>Corredor</dt>
              <dd>
                {estrutura?.corredor ?? <span className="por-confirmar">Por confirmar</span>}
                {estrutura?.corredorInferido && <> <Estimado /> <span className="texto-sec">deduzido, etiqueta não vista</span></>}
              </dd>
            </div>
          )}
          {formatoOficial && <div className="campo"><dt>Prateleira</dt><dd>{loc.nivel !== null ? String.fromCharCode(65 + loc.nivel) : <span className="por-confirmar">Por confirmar</span>}</dd></div>}
          {numerada && loc.nivel !== null && (
            <div className="campo">
              <dt>Prateleira</dt>
              <dd><span className="mono">{loc.codigo}</span> <span className="texto-sec">({loc.nivel + 1}.ª a contar de baixo)</span> <Estimado /></dd>
            </div>
          )}
          {(contentor || zonaChao) && estrutura?.corredor && <div className="campo"><dt>Corredor</dt><dd>{estrutura.corredor}</dd></div>}
          {palete && <div className="campo"><dt>Palete</dt><dd>{loc.modulo} <span className="texto-sec">· posição {loc.codigo?.slice(-1)}</span></dd></div>}
          {contentor && !palete && loc.codigo && <div className="campo"><dt>Contentor</dt><dd>{loc.codigo.slice(-1)} <span className="texto-sec">(caixa da posição {loc.codigo.slice(0, -1)})</span></dd></div>}
          {!contentor && !numerada && loc.modulo !== null && (
            <div className="campo">
              <dt>{formatoOficial ? 'Coluna' : 'Módulo'}</dt>
              <dd>{formatoOficial ? String(loc.coluna ?? loc.modulo).padStart(2, '0') : loc.modulo}</dd>
            </div>
          )}
          {!formatoOficial && !numerada && !contentor && loc.nivel !== null && <div className="campo"><dt>Nível</dt><dd>{nomeNivel ?? loc.nivel}</dd></div>}
          {loc.notas && <div className="campo"><dt>Notas</dt><dd>{loc.notas}</dd></div>}
        </dl>

        <section className="secao">
          <h3>Peças registadas <span className="contador-pill">{pecas.length}</span></h3>
          {pecas.length === 0 ? (
            <div className="vazio">
              <p>Sem peças registadas nesta localização.</p>
              <p className="texto-sec">Isto não significa que esteja vazia — apenas que não há registo.</p>
            </div>
          ) : (
            <ListaPecas pecas={pecas} aoAbrir={abrirPeca} />
          )}
          {coluna && pecas.length > 0 && <p className="nota">Estas peças estão nesta coluna, mas a prateleira ainda não foi confirmada.</p>}
          <button className="btn btn-fantasma btn-bloco" onClick={() => abrirEditor(null, loc.id)}>
            <Plus size={15} aria-hidden /> Registar peça nesta localização
          </button>
        </section>

        {pecasColuna.length > 0 && (
          <section className="secao">
            <h3>Na mesma coluna, prateleira por confirmar <span className="contador-pill azul">{pecasColuna.length}</span></h3>
            <ListaPecas pecas={pecasColuna} aoAbrir={abrirPeca} />
          </section>
        )}

        {estrutura?.fotografias && estrutura.fotografias.length > 0 && (
          <section className="secao">
            <h3>Fotografias de referência</h3>
            <div className="fotos-ref">
              {estrutura.fotografias.map((f) => (
                <button key={f.src} onClick={() => setFoto(f)} title={f.legenda}>
                  <Foto foto={f} miniatura />
                </button>
              ))}
            </div>
            <p className="nota">Fotografias da estrutura (não de uma peça específica).</p>
          </section>
        )}
      </div>

      {foto && (
        <Modal titulo={foto.legenda ?? 'Fotografia'} aoFechar={() => setFoto(null)} largura={1100}>
          <img className="foto-ampliada" src={foto.src} alt={foto.legenda ?? ''} />
        </Modal>
      )}
    </aside>
  )
}
