import { Boxes, Cog, Search, Trash2, TriangleAlert, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useApp } from '../../hooks/useApp'
import { useInventario } from '../../hooks/useInventario'
import type { Composicao, GrupoComposicao, Uqe } from '../../types'
import { chavePeca, criaCiclo, ehGrupo, indexar, nomeNo, novoIdGrupo, removerGrupo, type IndiceComposicao } from '../../utils/composicao'
import { pesquisarPecas } from '../../utils/pesquisa'
import { normalizar, OPCOES_UQE, rotuloUqe } from '../../utils/texto'
import { erroQuantidade, lerNumero } from '../../utils/validacao'
import { Modal } from '../common/comum'

/**
 * Editor das ligações de um nó do organograma: de que é que faz parte e que peças o compõem.
 * Fica num rascunho local (como as restantes edições) até ser exportado para composicao.json.
 */

type Sentido = 'pais' | 'filhos'

/** Pesquisa de uma peça ou grupo para ligar. */
function SeletorNo({ chave, sentido, idx, trabalho, aoEscolher }: {
  chave: string
  sentido: Sentido
  idx: IndiceComposicao
  trabalho: Composicao
  aoEscolher: (outra: string) => void
}) {
  const { pecas, locs, estruturas } = useInventario()
  const [q, setQ] = useState('')
  const resultados = useMemo(() => {
    if (q.trim().length < 2) return []
    const grupos = trabalho.grupos
      .filter((g) => normalizar(g.nome).includes(normalizar(q)))
      .map((g) => ({ chave: g.id, titulo: g.nome, sub: g.tipo === 'conjunto' ? 'Conjunto' : 'Equipamento' }))
    const vistas = new Set<string>()
    const ps = pesquisarPecas(q, pecas, { locs, estruturas })
      .filter((p) => {
        const k = chavePeca(p)
        if (vistas.has(k)) return false
        vistas.add(k)
        return true
      })
      .slice(0, 8)
      .map((p) => ({ chave: chavePeca(p), titulo: p.nome ?? p.referencia ?? p.id, sub: p.referencia ?? 'Sem referência' }))
    return [...grupos, ...ps].slice(0, 10)
  }, [q, pecas, locs, estruturas, trabalho.grupos])

  const jaLigadas = new Set(
    trabalho.ligacoes.filter((l) => (sentido === 'pais' ? l.filho === chave : l.pai === chave)).map((l) => (sentido === 'pais' ? l.pai : l.filho)),
  )

  return (
    <div className="seletor-no">
      <div className="input-icone">
        <Search size={15} aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={sentido === 'pais' ? 'Pesquisar a peça maior, equipamento ou conjunto…' : 'Pesquisar referência ou nome da peça…'}
          aria-label={sentido === 'pais' ? 'Pesquisar de que faz parte' : 'Pesquisar componente'}
        />
      </div>
      {resultados.length > 0 && (
        <ul className="seletor-resultados">
          {resultados.map((r) => {
            const [pai, filho] = sentido === 'pais' ? [r.chave, chave] : [chave, r.chave]
            const motivo = r.chave === chave
              ? 'É o próprio nó'
              : jaLigadas.has(r.chave)
                ? 'Já está ligada'
                : criaCiclo(pai, filho, idx)
                  ? 'Criaria uma ligação circular'
                  : null
            return (
              <li key={r.chave}>
                <button disabled={!!motivo} onClick={() => { aoEscolher(r.chave); setQ('') }} title={motivo ?? undefined}>
                  <span>{r.titulo}</span>
                  <span className="mono texto-sec">{r.sub}{motivo && ` · ${motivo}`}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function ListaLigacoes({ chave, sentido, idx, trabalho, setTrabalho }: {
  chave: string
  sentido: Sentido
  idx: IndiceComposicao
  trabalho: Composicao
  setTrabalho: (c: Composicao) => void
}) {
  const ligs = trabalho.ligacoes.filter((l) => (sentido === 'pais' ? l.filho === chave : l.pai === chave))
  const outro = (l: { pai: string; filho: string }) => (sentido === 'pais' ? l.pai : l.filho)
  const igual = (a: { pai: string; filho: string }, b: { pai: string; filho: string }) => a.pai === b.pai && a.filho === b.filho
  return (
    <>
      {ligs.length === 0 ? (
        <p className="texto-sec">{sentido === 'pais' ? 'Não faz parte de nenhuma peça, equipamento ou conjunto.' : 'Sem componentes ligados.'}</p>
      ) : (
        <ul className="lista-ligacoes">
          {ligs.map((l) => {
            const k = outro(l)
            const g = idx.grupos.get(k)
            return (
              <li key={`${l.pai}>${l.filho}`}>
                {g ? (g.tipo === 'conjunto' ? <Boxes size={15} aria-hidden /> : <Cog size={15} aria-hidden />) : null}
                <span className="ligacao-nome">
                  {nomeNo(k, idx)}
                  {!g && <span className="mono texto-sec"> · {k.startsWith('id:') ? 'sem referência' : k}</span>}
                </span>
                <label className="ligacao-qtd" title="Unidades que leva (deixe vazio se não souber)">
                  <span>×</span>
                  <input
                    inputMode="decimal"
                    defaultValue={l.quantidade ?? ''}
                    placeholder="?"
                    aria-label="Quantidade"
                    onBlur={(e) => {
                      const v = e.target.value.trim()
                      if (v !== '' && erroQuantidade(v)) { e.target.value = String(l.quantidade ?? ''); return }
                      const quantidade = v === '' ? null : lerNumero(v)
                      setTrabalho({ ...trabalho, ligacoes: trabalho.ligacoes.map((x) => (igual(x, l) ? { ...x, quantidade } : x)) })
                    }}
                  />
                </label>
                <button className="btn-icone" onClick={() => setTrabalho({ ...trabalho, ligacoes: trabalho.ligacoes.filter((x) => !igual(x, l)) })} aria-label={`Remover ligação a ${nomeNo(k, idx)}`}>
                  <X size={15} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <SeletorNo
        chave={chave}
        sentido={sentido}
        idx={idx}
        trabalho={trabalho}
        aoEscolher={(k) => setTrabalho({
          ...trabalho,
          ligacoes: [...trabalho.ligacoes, sentido === 'pais' ? { pai: k, filho: chave, quantidade: null } : { pai: chave, filho: k, quantidade: null }],
        })}
      />
    </>
  )
}

export function EditorLigacoes() {
  const { composicao, guardarComposicao, pecas } = useInventario()
  const { editorLigacoes, abrirEditorLigacoes, notificar, abrirOrganograma } = useApp()
  const pedido = editorLigacoes!

  // cópia de trabalho; um grupo novo é criado já nela (e só fica se for guardado)
  const [inicio] = useState(() => {
    if (!pedido.novoGrupo) return { trabalho: composicao, chave: pedido.chave! }
    const id = novoIdGrupo(composicao)
    const grupo: GrupoComposicao = { id, tipo: pedido.novoGrupo, nome: pedido.novoGrupo === 'conjunto' ? 'Novo conjunto' : 'Novo equipamento', uqe: 'nenhuma' }
    const ligacoes = pedido.comPeca ? [...composicao.ligacoes, { pai: id, filho: pedido.comPeca, quantidade: null }] : composicao.ligacoes
    return { trabalho: { grupos: [...composicao.grupos, grupo], ligacoes }, chave: id }
  })
  const [trabalho, setTrabalho] = useState<Composicao>(inicio.trabalho)
  const [confirmado, setConfirmado] = useState(false)
  const chave = inicio.chave
  const idx = useMemo(() => indexar(trabalho, pecas), [trabalho, pecas])
  const grupo = trabalho.grupos.find((g) => g.id === chave)
  const fechar = () => abrirEditorLigacoes(null)
  const alterarGrupo = (patch: Partial<GrupoComposicao>) =>
    setTrabalho({ ...trabalho, grupos: trabalho.grupos.map((g) => (g.id === chave ? { ...g, ...patch } : g)) })

  function guardar() {
    if (!confirmado) {
      notificar('Confirme que compreende que as ligações ficam só neste navegador.', 'aviso')
      return
    }
    if (grupo && !grupo.nome.trim()) {
      notificar('Dê um nome ao grupo.', 'aviso')
      return
    }
    const erro = guardarComposicao(trabalho)
    if (erro) {
      notificar(erro, 'erro')
      return
    }
    notificar('Ligações guardadas neste navegador (não oficial).', 'sucesso')
    fechar()
    abrirOrganograma(chave)
  }

  return (
    <Modal
      titulo={grupo ? (pedido.novoGrupo ? `Novo ${grupo.tipo}` : `Editar ${grupo.tipo}`) : `Ligações de ${nomeNo(chave, idx)}`}
      aoFechar={fechar}
      largura={720}
      rodape={
        <>
          {grupo && !pedido.novoGrupo && (
            <button
              className="btn btn-fantasma rodape-esquerda"
              onClick={() => {
                if (!confirmado) {
                  notificar('Marque primeiro a confirmação de que as alterações ficam só neste navegador.', 'aviso')
                  return
                }
                if (!window.confirm(`Apagar "${grupo.nome}" e as suas ligações? As peças não são apagadas.`)) return
                const erro = guardarComposicao(removerGrupo(trabalho, chave))
                notificar(erro ?? 'Grupo apagado (rascunho local).', erro ? 'erro' : 'sucesso')
                if (!erro) { fechar(); abrirOrganograma(null) }
              }}
            >
              <Trash2 size={15} aria-hidden /> Apagar grupo
            </button>
          )}
          <button className="btn btn-fantasma" onClick={fechar}>Cancelar</button>
          <button className="btn btn-primario" onClick={guardar}>Guardar ligações</button>
        </>
      }
    >
      <div className="alerta alerta-aviso">
        <TriangleAlert size={16} aria-hidden />
        <div>
          Não existe lista técnica: estas ligações são feitas à mão e ficam <strong>só neste navegador</strong> até exportar o <code>composicao.json</code>.
        </div>
      </div>

      <div className="formulario">
        {grupo && (
          <>
            <div className="grelha-cat">
              <label>
                <span>Nome</span>
                <input value={grupo.nome} onChange={(e) => alterarGrupo({ nome: e.target.value })} autoFocus />
              </label>
              <label>
                <span>Tipo</span>
                <select value={grupo.tipo} onChange={(e) => alterarGrupo({ tipo: e.target.value as GrupoComposicao['tipo'] })}>
                  <option value="conjunto">Conjunto (peças que vão juntas)</option>
                  <option value="equipamento">Equipamento (não está em stock)</option>
                </select>
              </label>
              <label>
                <span>UQE</span>
                <select value={grupo.uqe ?? 'nenhuma'} onChange={(e) => alterarGrupo({ uqe: e.target.value as Uqe })}>
                  {OPCOES_UQE.map((u) => <option key={u} value={u}>{rotuloUqe(u)}</option>)}
                </select>
              </label>
            </div>
            <label>
              <span>Notas</span>
              <textarea rows={2} value={grupo.notas ?? ''} onChange={(e) => alterarGrupo({ notas: e.target.value || undefined })} />
            </label>
          </>
        )}

        <fieldset className="ligacoes-bloco">
          <legend>{grupo?.tipo === 'conjunto' ? 'Peças do conjunto' : 'Componentes (o que leva)'}</legend>
          <ListaLigacoes chave={chave} sentido="filhos" idx={idx} trabalho={trabalho} setTrabalho={setTrabalho} />
        </fieldset>

        <fieldset className="ligacoes-bloco">
          <legend>Faz parte de</legend>
          <ListaLigacoes chave={chave} sentido="pais" idx={idx} trabalho={trabalho} setTrabalho={setTrabalho} />
        </fieldset>

        {!ehGrupo(chave) && (
          <p className="nota">A ligação vale para o material ({chave.startsWith('id:') ? 'este registo' : <span className="mono">{chave}</span>}) em todas as posições do armazém.</p>
        )}

        <label className="check confirmacao">
          <input type="checkbox" checked={confirmado} onChange={(e) => setConfirmado(e.target.checked)} />
          <span>Compreendo que estas ligações ficam guardadas apenas neste navegador e <strong>não são dados oficiais</strong>.</span>
        </label>
      </div>
    </Modal>
  )
}
