import { ArrowLeft, Box, ClipboardCheck, ClipboardPlus, Link2, MapPin, Network, Pencil, Undo2, X } from 'lucide-react'
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { useApp } from '../../hooks/useApp'
import { useInventario } from '../../hooks/useInventario'
import type { Peca } from '../../types'
import { estadoStock } from '../../utils/stock'
import { motivoSem3D } from '../../utils/posicao'
import { codigoPosicao, formatarQuantidade, formatarValor, nomePeca, rotuloUqe } from '../../utils/texto'
import { chavePeca, indexar, nomeNo } from '../../utils/composicao'
import { copiarTexto, urlPeca } from '../../utils/ligacoes'
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

function BotaoRecolha({ naLista, aoAlternar }: { naLista: boolean; aoAlternar: () => void }) {
  return (
    <button className={`btn ${naLista ? 'btn-secundario' : 'btn-fantasma'}`} onClick={aoAlternar} aria-pressed={naLista} title={naLista ? 'Retirar da lista de recolha' : 'Adicionar à lista de recolha'}>
      {naLista ? <ClipboardCheck size={15} aria-hidden /> : <ClipboardPlus size={15} aria-hidden />} {naLista ? 'Na recolha' : 'Adicionar à recolha'}
    </button>
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
  const { pecas, locs, descartarAlteracao, existeNaBase, composicao, zonasModelo } = useInventario()
  const { pecaSelecionada, abrirPeca, localizarPeca, localizacaoSelecionada, vista, abrirEditor, notificar, abrirOrganograma, abrirEditorLigacoes, recolha, alternarRecolha } = useApp()
  const peca = pecas.find((p) => p.id === pecaSelecionada)
  // a fotografia escolhida vale só para a peça em que foi escolhida (ao mudar de peça volta à primeira)
  const [escolha, setEscolha] = useState<{ peca: string | null; i: number }>({ peca: null, i: 0 })
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
  const est = (c: keyof Peca) => peca.camposEstimados.includes(c)
  const fotoAtiva = escolha.peca === peca.id && escolha.i < peca.fotografias.length ? escolha.i : 0
  const setFotoAtiva = (i: number) => setEscolha({ peca: peca.id, i })
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
          <span className={`ref-destaque mono${peca.referencia ? '' : ' sem-ref'}`}>{peca.referencia ?? 'Sem referência'}</span>
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

        {foto && <div className="galeria">
          <button className="galeria-principal" onClick={() => setAmpliada(true)} aria-label="Ampliar fotografia">
            <Foto foto={foto} />
          </button>
          <p className="legenda-foto">
            <span className="tag">{ROTULO_TIPO_FOTO[foto.tipo] ?? foto.tipo}</span> {foto.legenda}
          </p>
          {peca.fotografias.length > 1 && (
            <div className="galeria-miniaturas">
              {peca.fotografias.map((f, i) => (
                <button key={f.src + i} className={i === fotoAtiva ? 'ativa' : ''} onClick={() => setFotoAtiva(i)} aria-label={`Fotografia ${i + 1}`}>
                  <Foto foto={f} miniatura />
                </button>
              ))}
            </div>
          )}
        </div>}

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
        </section>

        <section className="secao">
          <h3><MapPin size={15} aria-hidden /> Localização</h3>
          {loc ? (
            <div className="cartao-loc">
              <div>
                <span className="mono loc-codigo">{codigoPosicao(loc, peca.caixa)}</span> {est('localizacaoId') && <Estimado />}
              </div>
              <div className="cartao-loc-acoes">
                <button className="btn btn-primario" onClick={() => localizarPeca(peca.id)}>
                  <MapPin size={15} aria-hidden /> Ver no armazém
                </button>
                <BotaoRecolha naLista={recolha.includes(peca.id)} aoAlternar={() => alternarRecolha(peca.id)} />
              </div>
            </div>
          ) : peca.posicaoOrigem ? (
            <div className="cartao-loc">
              <div>
                <span className="mono loc-codigo">{peca.posicaoOrigem}</span> <span className="tag">sem 3D</span>
                <p className="texto-sec">{motivoSem3D(peca, zonasModelo)}.</p>
              </div>
              <BotaoRecolha naLista={recolha.includes(peca.id)} aoAlternar={() => alternarRecolha(peca.id)} />
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
            <Campo rotulo="Descrição">{valor(peca.descricao, 'descricao')}</Campo>
            <Campo rotulo="Categoria">{valor(peca.categoria, 'categoria')}</Campo>
            <Campo rotulo="UQE">
              {rotuloUqe(peca.uqe)} {est('uqe') && <><Estimado /> <span className="texto-sec">deduzido da designação</span></>}
            </Campo>
            <Campo rotulo="Fabricante / fornecedor">{valor(peca.fabricante, 'fabricante')}</Campo>
            <Campo rotulo="Stock mínimo">{peca.stockMinimo ?? <PorConfirmar texto="Não configurado" />}</Campo>
            {peca.notas && <Campo rotulo="Notas">{peca.notas}</Campo>}
            {peca.atualizadoEm && <Campo rotulo="Alterado localmente em">{new Date(peca.atualizadoEm).toLocaleString('pt-PT')}</Campo>}
          </dl>
        </section>

        <div className="painel-acoes">
          <button className="btn btn-secundario" onClick={() => abrirEditor(peca.id)}>
            <Pencil size={15} aria-hidden /> Editar (rascunho local)
          </button>
          <button
            className="btn btn-fantasma"
            onClick={async () => { if (await copiarTexto(urlPeca(peca))) notificar('Ligação para esta peça copiada.', 'sucesso') }}
            title="Copiar uma ligação que abre esta ficha"
          >
            <Link2 size={15} aria-hidden /> Copiar ligação
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
