import { ArrowLeft, Box, MapPin, Network, Pencil, Undo2, X } from 'lucide-react'
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { useApp } from '../../hooks/useApp'
import { useInventario } from '../../hooks/useInventario'
import type { Peca } from '../../types'
import { estadoStock } from '../../utils/stock'
import { motivoSem3D } from '../../utils/posicao'
import { codigoPosicao, formatarQuantidade, formatarValor, nomePeca, rotuloUqe } from '../../utils/texto'
import { chavePeca, indexar, nomeNo } from '../../utils/composicao'
import { EstadoBadge, Estimado, Foto, Modal, PorConfirmar, TagLocal } from '../common/comum'

const ModelViewer = lazy(() => import('./ModelViewer'))

const ROTULO_TIPO_FOTO: Record<string, string> = {
  peca: 'Fotografia da peça',
  no_local: 'Fotografia no local',
  contentor: 'Fotografia do contentor',
  etiqueta: 'Fotografia da etiqueta/localização',
  localizacao: 'Fotografia da localização',
}

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="campo">
      <dt>{rotulo}</dt>
      <dd>{children}</dd>
    </div>
  )
}

/** Ligações da peça no organograma (de que faz parte e o que leva). */
function SecaoEstrutura({ chave, composicao, pecas, aoVer, aoEditar }: {
  chave: string
  composicao: Parameters<typeof indexar>[0]
  pecas: Parameters<typeof indexar>[1]
  aoVer: () => void
  aoEditar: () => void
}) {
  const pais = composicao.ligacoes.filter((l) => l.filho === chave)
  const filhos = composicao.ligacoes.filter((l) => l.pai === chave)
  const idx = pais.length || filhos.length ? indexar(composicao, pecas) : null
  return (
    <section className="secao">
      <h3><Network size={15} aria-hidden /> Estrutura</h3>
      {idx ? (
        <dl className="campos compacto">
          {pais.length > 0 && <Campo rotulo="Faz parte de">{pais.map((l) => nomeNo(l.pai, idx)).join(' · ')}</Campo>}
          {filhos.length > 0 && <Campo rotulo="Leva">{filhos.length} componente(s)</Campo>}
        </dl>
      ) : (
        <p className="nota">Sem ligações a outras peças. Use “Editar ligações” se fizer parte de um equipamento ou de um conjunto.</p>
      )}
      <div className="painel-acoes">
        {idx && <button className="btn btn-secundario btn-pequeno" onClick={aoVer}><Network size={14} aria-hidden /> Ver organograma</button>}
        <button className="btn btn-fantasma btn-pequeno" onClick={aoEditar}><Pencil size={14} aria-hidden /> Editar ligações</button>
      </div>
    </section>
  )
}

export function PartDetails() {
  const { pecas, locs, estruturas, descartarAlteracao, existeNaBase, composicao } = useInventario()
  const { pecaSelecionada, abrirPeca, localizarPeca, localizacaoSelecionada, vista, abrirEditor, notificar, abrirOrganograma, abrirEditorLigacoes } = useApp()
  const peca = pecas.find((p) => p.id === pecaSelecionada)
  const [fotoAtiva, setFotoAtiva] = useState(0)
  const [ampliada, setAmpliada] = useState(false)

  useEffect(() => {
    if (!peca) return
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('.modal')) abrirPeca(null)
    }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [peca, abrirPeca])

  if (!peca) return null

  const loc = peca.localizacaoId ? locs.get(peca.localizacaoId) : undefined
  const estrutura = loc ? estruturas.get(loc.estrutura) : undefined
  const est = (c: keyof Peca) => peca.camposEstimados.includes(c)
  const foto = peca.fotografias[fotoAtiva]
  const vindoDaLocalizacao = vista === '3d' && localizacaoSelecionada && localizacaoSelecionada === peca.localizacaoId
  const valor = (v: string | null, campo: keyof Peca) =>
    v ? <>{v} {est(campo) && <Estimado />}</> : <PorConfirmar />

  return (
    <aside className="painel painel-peca" aria-label={`Ficha da peça ${nomePeca(peca)}`}>
      <header className="painel-cabecalho">
        {vindoDaLocalizacao ? (
          <button className="btn-icone" onClick={() => abrirPeca(null)} aria-label="Voltar à localização" title="Voltar à localização">
            <ArrowLeft size={18} />
          </button>
        ) : null}
        <div className="painel-titulo">
          <span className="sobretitulo mono">{peca.referencia ?? 'Sem referência'}</span>
          <h2>{nomePeca(peca)}</h2>
        </div>
        <button className="btn-icone" onClick={() => abrirPeca(null)} aria-label="Fechar ficha">
          <X size={18} />
        </button>
      </header>

      <div className="painel-corpo">
        {peca.origemLocal && (
          <div className="alerta alerta-aviso">
            <strong>Registo {peca.origemLocal === 'criado' ? 'criado' : 'alterado'} localmente.</strong> Guardado apenas neste navegador — não é inventário oficial.
          </div>
        )}

        <div className="galeria">
          <button className="galeria-principal" onClick={() => foto && setAmpliada(true)} disabled={!foto} aria-label={foto ? 'Ampliar fotografia' : 'Sem fotografia'}>
            <Foto foto={foto} />
          </button>
          {foto && (
            <p className="legenda-foto">
              <span className="tag">{ROTULO_TIPO_FOTO[foto.tipo] ?? foto.tipo}</span> {foto.legenda}
            </p>
          )}
          {peca.fotografias.length > 1 && (
            <div className="galeria-miniaturas">
              {peca.fotografias.map((f, i) => (
                <button key={f.src + i} className={i === fotoAtiva ? 'ativa' : ''} onClick={() => setFotoAtiva(i)} aria-label={`Fotografia ${i + 1}`}>
                  <Foto foto={f} miniatura />
                </button>
              ))}
            </div>
          )}
        </div>

        {peca.modelo3D ? (
          <section className="secao">
            <h3><Box size={15} aria-hidden /> Modelo 3D</h3>
            <Suspense fallback={<div className="modelo-3d carregando">A carregar modelo…</div>}>
              <ModelViewer src={peca.modelo3D} />
            </Suspense>
          </section>
        ) : null}

        <section className="secao">
          <div className="destaque-qtd">
            <div>
              <span className="rotulo">Quantidade</span>
              <span className="valor-grande mono">{formatarQuantidade(peca.quantidade)}</span>
              {peca.quantidade !== null && est('quantidade') && <Estimado />}
            </div>
            <EstadoBadge estado={estadoStock(peca)} />
          </div>
          {peca.valorStock !== undefined && peca.valorStock !== null && (
            <p className="nota">Valor do stock: <strong className="mono">{formatarValor(peca.valorStock)}</strong></p>
          )}
          {peca.stockMinimo === null && (
            <p className="nota">Sem stock mínimo configurado — o alerta de stock baixo não se aplica.</p>
          )}
        </section>

        <section className="secao">
          <h3><MapPin size={15} aria-hidden /> Localização</h3>
          {loc ? (
            <div className="cartao-loc">
              <div>
                <span className="mono loc-codigo">{codigoPosicao(loc, peca.caixa)}</span> {est('localizacaoId') && <Estimado />}
                {loc.codigo && <span className="texto-sec"> · ID interno {loc.id}</span>}
                <p>{loc.descricao}</p>
                <p className="texto-sec">
                  Zona: {loc.zona}
                  {estrutura && estrutura.estadoGeometria !== 'confirmado' && ' · posição no modelo 3D aproximada'}
                  {loc.origemCodigo !== 'etiqueta_visivel' && ` · código ${loc.origemCodigo === 'parcial' ? 'parcialmente ' : ''}provisório`}
                </p>
              </div>
              <button className="btn btn-primario" onClick={() => localizarPeca(peca.id)}>
                <MapPin size={15} aria-hidden /> Ver no armazém
              </button>
            </div>
          ) : peca.posicaoOrigem ? (
            <div className="cartao-loc">
              <div>
                <span className="mono loc-codigo">{peca.posicaoOrigem}</span> <span className="tag">sem 3D</span>
                <p className="texto-sec">{motivoSem3D(peca)}.</p>
              </div>
            </div>
          ) : (
            <div className="alerta">
              <strong>Localização por confirmar.</strong> Não é possível destacar esta peça no modelo 3D.
            </div>
          )}
        </section>

        <SecaoEstrutura
          chave={chavePeca(peca)}
          composicao={composicao}
          pecas={pecas}
          aoVer={() => abrirOrganograma(chavePeca(peca))}
          aoEditar={() => abrirEditorLigacoes({ chave: chavePeca(peca) })}
        />

        <section className="secao">
          <h3>Dados</h3>
          <dl className="campos">
            <Campo rotulo="Referência">{peca.referencia ? <span className="mono">{peca.referencia}</span> : <PorConfirmar texto="Sem referência" />}</Campo>
            <Campo rotulo="Nome">{valor(peca.nome, 'nome')}</Campo>
            <Campo rotulo="Descrição">{valor(peca.descricao, 'descricao')}</Campo>
            <Campo rotulo="Categoria">{valor(peca.categoria, 'categoria')}</Campo>
            <Campo rotulo="UQE">
              {rotuloUqe(peca.uqe)} {est('uqe') && <><Estimado /> <span className="texto-sec">deduzido da designação</span></>}
            </Campo>
            <Campo rotulo="Fabricante / fornecedor">{valor(peca.fabricante, 'fabricante')}</Campo>
            <Campo rotulo="Caixa">{peca.caixa ? <span className="mono">{peca.caixa}</span> : <PorConfirmar />}</Campo>
            <Campo rotulo="Stock mínimo">{peca.stockMinimo ?? <PorConfirmar texto="Não configurado" />}</Campo>
            <Campo rotulo="Tipo de registo">{peca.tipoRegisto === 'referencia' ? 'Artigo com referência visível' : 'Observação (sem referência legível)'}</Campo>
            <Campo rotulo="Origem do registo">
              {peca.fonte === 'excel' ? 'Lista de materiais (Excel)' : peca.fonte === 'manual' ? 'Criado manualmente' : 'Observação nas fotografias/vídeos'}
            </Campo>
            <Campo rotulo="Evidência">{peca.evidencia ?? <PorConfirmar />}</Campo>
            <Campo rotulo="Validação">
              {peca.estadoValidacao === 'confirmado' ? (peca.fonte === 'excel' ? 'Dados da lista de materiais' : 'Confirmado') : peca.estadoValidacao === 'estimado' ? 'Estimado' : 'Por confirmar (sem validação humana)'}
            </Campo>
            <Campo rotulo="Notas">{peca.notas || <span className="texto-sec">—</span>}</Campo>
            {peca.atualizadoEm && <Campo rotulo="Alterado localmente em">{new Date(peca.atualizadoEm).toLocaleString('pt-PT')}</Campo>}
          </dl>
          {!peca.modelo3D && <p className="nota">Sem modelo 3D associado a esta peça.</p>}
        </section>

        <div className="painel-acoes">
          <button className="btn btn-secundario" onClick={() => abrirEditor(peca.id)}>
            <Pencil size={15} aria-hidden /> Editar (rascunho local)
          </button>
          {peca.origemLocal && (
            <button
              className="btn btn-fantasma"
              onClick={() => {
                const criado = !existeNaBase(peca.id)
                if (!window.confirm(criado ? 'Eliminar este registo criado localmente?' : 'Descartar as alterações locais e repor os dados originais desta peça?')) return
                descartarAlteracao(peca.id)
                if (criado) abrirPeca(null)
                notificar(criado ? 'Registo local eliminado.' : 'Alterações locais descartadas.', 'sucesso')
              }}
            >
              <Undo2 size={15} aria-hidden /> {existeNaBase(peca.id) ? 'Descartar alterações' : 'Eliminar rascunho'}
            </button>
          )}
          {peca.origemLocal && <TagLocal origem={peca.origemLocal} />}
        </div>
      </div>

      {ampliada && foto && (
        <Modal titulo={foto.legenda ?? 'Fotografia'} aoFechar={() => setAmpliada(false)} largura={1100}>
          <img className="foto-ampliada" src={foto.src} alt={foto.legenda ?? ''} />
        </Modal>
      )}
    </aside>
  )
}
