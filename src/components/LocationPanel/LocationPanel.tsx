import { Crosshair, MapPin, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../../hooks/useApp'
import { useInventario } from '../../hooks/useInventario'
import type { Fotografia, Peca } from '../../types'
import { estadoStock } from '../../utils/stock'
import { ehColuna, formatarQuantidade, nomePeca, rotuloLocalizacao } from '../../utils/texto'
import { EstadoBadge, Estimado, Foto, Modal, TagLocal } from '../common/comum'

const ORIGEM_CODIGO = {
  etiqueta_visivel: 'Código visível no armazém',
  parcial: 'Parcialmente confirmado (corredor ou etiqueta confirmados; restantes elementos estimados)',
  provisorio: 'Código provisório criado para esta aplicação',
}

function ListaPecas({ pecas, aoAbrir }: { pecas: Peca[]; aoAbrir: (id: string) => void }) {
  return (
    <ul className="lista-pecas-loc">
      {pecas.map((p) => (
        <li key={p.id}>
          <button onClick={() => aoAbrir(p.id)} className="peca-loc">
            <Foto foto={p.fotografias[0]} miniatura className="miniatura" />
            <div className="peca-loc-texto">
              <span className="peca-loc-nome">{nomePeca(p)}</span>
              <span className="mono texto-sec">{p.caixa && <strong className="caixa-loc">{p.caixa}</strong>}{p.referencia ?? 'Sem referência'}</span>
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
  const { localizacaoSelecionada, selecionarLocalizacao, abrirPeca, abrirEditor } = useApp()
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
  const formatoOficial = !contentor && (prateleiras || !!estrutura?.corredor)
  const coluna = ehColuna(loc, estrutura?.tipo)
  // numa célula, mostrar também as peças da mesma coluna cuja prateleira ainda não é conhecida
  const idColuna = prateleiras && !coluna ? [...locs.values()].find((l) => l.estrutura === loc.estrutura && l.modulo === loc.modulo && l.nivel === null)?.id : undefined
  const pecasColuna = idColuna ? (pecasPorLocalizacao.get(idColuna) ?? []) : []

  return (
    <aside className="painel painel-loc" aria-label={`Localização ${rotuloLocalizacao(loc)}`}>
      <header className="painel-cabecalho">
        <div className="painel-icone"><MapPin size={18} aria-hidden /></div>
        <div className="painel-titulo">
          <span className="sobretitulo">{loc.zona}</span>
          <h2 className="mono">{rotuloLocalizacao(loc)}</h2>
        </div>
        <button className="btn-icone" onClick={() => selecionarLocalizacao(loc.id, { focar: true })} aria-label="Centrar câmara nesta localização" title="Centrar câmara">
          <Crosshair size={18} />
        </button>
        <button className="btn-icone" onClick={() => selecionarLocalizacao(null)} aria-label="Fechar localização">
          <X size={18} />
        </button>
      </header>

      <div className="painel-corpo">
        <p>{loc.descricao}</p>
        <dl className="campos compacto">
          <div className="campo"><dt>Estrutura</dt><dd>{estrutura?.nome ?? loc.estrutura}</dd></div>
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
          {contentor && estrutura?.corredor && <div className="campo"><dt>Corredor</dt><dd>{estrutura.corredor}</dd></div>}
          {contentor && loc.codigo && <div className="campo"><dt>Contentor</dt><dd>{loc.codigo.slice(-1)} <span className="texto-sec">(caixa da posição {loc.codigo.slice(0, -1)})</span></dd></div>}
          {!contentor && loc.modulo !== null && (
            <div className="campo">
              <dt>{formatoOficial ? 'Coluna' : 'Módulo'}</dt>
              <dd>{formatoOficial ? String(loc.modulo).padStart(2, '0') : loc.modulo}</dd>
            </div>
          )}
          {!formatoOficial && loc.nivel !== null && <div className="campo"><dt>Nível</dt><dd>{nomeNivel ?? loc.nivel}</dd></div>}
          {loc.codigo && <div className="campo"><dt>ID interno</dt><dd className="mono texto-sec">{loc.id}</dd></div>}
          <div className="campo"><dt>Código</dt><dd>{ORIGEM_CODIGO[loc.origemCodigo]}</dd></div>
          <div className="campo"><dt>Posição 3D</dt><dd>{loc.estadoValidacao === 'confirmado' ? 'Confirmada' : <>Aproximada <Estimado /></>}</dd></div>
          {loc.notas && <div className="campo"><dt>Notas</dt><dd>{loc.notas}</dd></div>}
          {estrutura?.notas && <div className="campo"><dt>Sobre a estrutura</dt><dd className="texto-sec">{estrutura.notas}</dd></div>}
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
