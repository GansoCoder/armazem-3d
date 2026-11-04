import { ImagePlus, Link2, Trash2, TriangleAlert } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useApp } from '../../hooks/useApp'
import { useInventario } from '../../hooks/useInventario'
import type { Fotografia, Peca, TipoRegisto, Uqe } from '../../types'
import { reduzirImagem } from '../../utils/imagem'
import { codigoPosicao, normalizar, OPCOES_UQE, rotuloLocalizacao, rotuloUqe } from '../../utils/texto'
import { erroCaixa, erroQuantidade, lerNumero } from '../../utils/validacao'
import { Foto, Modal } from '../common/comum'

/**
 * Modo de edição local (demonstração). As alterações ficam só neste navegador e exigem
 * confirmação explícita de que não são inventário oficial.
 */

interface Formulario {
  referencia: string
  nome: string
  descricao: string
  categoria: string
  fabricante: string
  uqe: Uqe
  quantidade: string
  quantidadeEstimada: boolean
  stockMinimo: string
  localizacaoId: string
  caixa: string
  notas: string
  modelo3D: string
  tipoRegisto: TipoRegisto
  fotografias: Fotografia[]
}

const txt = (v: string | null) => v ?? ''
const ouNull = (v: string) => (v.trim() === '' ? null : v.trim())

function paraFormulario(p: Peca | undefined, localizacaoInicial: string | null): Formulario {
  return {
    referencia: txt(p?.referencia ?? null),
    nome: txt(p?.nome ?? null),
    descricao: txt(p?.descricao ?? null),
    categoria: txt(p?.categoria ?? null),
    fabricante: txt(p?.fabricante ?? null),
    uqe: p?.uqe ?? 'nenhuma',
    quantidade: p?.quantidade === null || p?.quantidade === undefined ? '' : String(p.quantidade),
    quantidadeEstimada: p?.camposEstimados.includes('quantidade') ?? false,
    stockMinimo: p?.stockMinimo === null || p?.stockMinimo === undefined ? '' : String(p.stockMinimo),
    localizacaoId: p?.localizacaoId ?? localizacaoInicial ?? '',
    caixa: p?.caixa ?? '',
    notas: p?.notas ?? '',
    modelo3D: txt(p?.modelo3D ?? null),
    tipoRegisto: p?.tipoRegisto ?? 'referencia',
    fotografias: p?.fotografias ?? [],
  }
}

function Erro({ msg }: { msg?: string }) {
  return msg ? <span className="erro-campo" role="alert">{msg}</span> : null
}

export function PartEditor() {
  const { pecas, localizacoes, zonas, categorias, guardarPeca } = useInventario()
  const { editor, fecharEditor, notificar, abrirPeca } = useApp()
  const original = editor.pecaId ? pecas.find((p) => p.id === editor.pecaId) : undefined
  const [f, setF] = useState<Formulario>(() => paraFormulario(original, editor.localizacaoInicial))
  const [confirmado, setConfirmado] = useState(false)
  const [caminhoFoto, setCaminhoFoto] = useState('')
  const [erros, setErros] = useState<Record<string, string>>({})
  const [aCarregar, setACarregar] = useState(false)

  const definir = <K extends keyof Formulario>(k: K, v: Formulario[K]) => setF((x) => ({ ...x, [k]: v }))

  const locsPorZona = useMemo(
    () => zonas.map((z) => ({ zona: z, locs: localizacoes.filter((l) => l.zona === z) })),
    [zonas, localizacoes],
  )

  function validar(): Record<string, string> {
    const e: Record<string, string> = {}
    if (!f.referencia.trim() && !f.nome.trim()) e.nome = 'Indique pelo menos a referência ou o nome.'
    const q = erroQuantidade(f.quantidade)
    if (q) e.quantidade = q
    const m = erroQuantidade(f.stockMinimo)
    if (m) e.stockMinimo = m
    const c = erroCaixa(f.caixa)
    if (c) e.caixa = c
    if (f.referencia.trim()) {
      const dup = pecas.find((p) => p.id !== original?.id && normalizar(p.referencia) === normalizar(f.referencia))
      if (dup) e.referencia = `Já existe um registo com esta referência (${dup.id}).`
    }
    if (!confirmado) e.confirmacao = 'Confirme que compreende que esta alteração não é inventário oficial.'
    return e
  }

  function submeter(ev: FormEvent) {
    ev.preventDefault()
    const e = validar()
    setErros(e)
    if (Object.keys(e).length) return

    const novo: Peca = {
      id: original?.id ?? `local-${Date.now().toString(36)}`,
      referencia: ouNull(f.referencia),
      nome: ouNull(f.nome),
      descricao: ouNull(f.descricao),
      categoria: ouNull(f.categoria),
      fabricante: ouNull(f.fabricante),
      uqe: f.uqe,
      quantidade: f.quantidade.trim() === '' ? null : lerNumero(f.quantidade),
      stockMinimo: f.stockMinimo.trim() === '' ? null : lerNumero(f.stockMinimo),
      localizacaoId: f.localizacaoId || null,
      caixa: f.caixa.trim() ? f.caixa.trim().toUpperCase() : null,
      fotografias: f.fotografias,
      modelo3D: ouNull(f.modelo3D),
      notas: f.notas.trim(),
      estadoValidacao: original?.estadoValidacao ?? 'por_confirmar',
      // sem referência, o registo é necessariamente uma observação
      tipoRegisto: f.referencia.trim() ? f.tipoRegisto : 'observacao',
      evidencia: original?.evidencia ?? 'Introduzido manualmente no modo de edição local.',
      valorStock: original?.valorStock ?? null,
      posicaoOrigem: f.localizacaoId === (original?.localizacaoId ?? '') && f.caixa.trim().toUpperCase() === (original?.caixa ?? '') ? (original?.posicaoOrigem ?? null) : null,
      fonte: original?.fonte ?? 'manual',
      camposEstimados: [],
    }
    // Um campo alterado pelo utilizador deixa de ser "estimado"; a quantidade segue a caixa de verificação.
    const anteriores = original?.camposEstimados ?? []
    novo.camposEstimados = anteriores.filter(
      (c) => c !== 'quantidade' && original && JSON.stringify(original[c as keyof Peca]) === JSON.stringify(novo[c as keyof Peca]),
    )
    if (f.quantidadeEstimada && novo.quantidade !== null) novo.camposEstimados.push('quantidade')

    const erro = guardarPeca(novo)
    if (erro) {
      notificar(erro, 'erro')
      return
    }
    notificar(original ? 'Alterações guardadas localmente (não oficial).' : 'Peça criada localmente (não oficial).', 'sucesso')
    fecharEditor()
    abrirPeca(novo.id)
  }

  async function carregarFicheiros(ficheiros: FileList | null) {
    if (!ficheiros?.length) return
    setACarregar(true)
    try {
      const novas: Fotografia[] = []
      for (const fich of Array.from(ficheiros)) {
        novas.push({ src: await reduzirImagem(fich), legenda: fich.name, tipo: 'peca' })
      }
      definir('fotografias', [...f.fotografias, ...novas])
    } catch (e) {
      notificar((e as Error).message, 'erro')
    } finally {
      setACarregar(false)
    }
  }

  function adicionarCaminho() {
    const c = caminhoFoto.trim()
    if (!c) return
    definir('fotografias', [...f.fotografias, { src: c, legenda: c.split('/').pop(), tipo: 'peca' }])
    setCaminhoFoto('')
  }

  return (
    <Modal
      titulo={original ? `Editar ${original.referencia ?? original.nome ?? original.id}` : 'Nova peça'}
      aoFechar={fecharEditor}
      largura={760}
      rodape={
        <>
          <button type="button" className="btn btn-fantasma" onClick={fecharEditor}>Cancelar</button>
          <button type="submit" form="form-peca" className="btn btn-primario" disabled={aCarregar}>Guardar rascunho local</button>
        </>
      }
    >
      <div className="alerta alerta-aviso">
        <TriangleAlert size={16} aria-hidden />
        <div>
          <strong>Modo de demonstração.</strong> Sem servidor: as alterações ficam guardadas apenas neste navegador
          (localStorage), não são partilhadas e <strong>não alteram o inventário oficial</strong>. Use “Exportar JSON” para as levar para <code>parts.json</code>.
        </div>
      </div>

      <form id="form-peca" className="formulario" onSubmit={submeter} noValidate>
        <div className="grelha-2">
          <label>
            <span>Referência / código</span>
            <input value={f.referencia} onChange={(e) => definir('referencia', e.target.value)} className="mono" aria-invalid={!!erros.referencia} />
            <Erro msg={erros.referencia} />
          </label>
          <label>
            <span>Tipo de registo</span>
            <select value={f.tipoRegisto} onChange={(e) => definir('tipoRegisto', e.target.value as TipoRegisto)}>
              <option value="referencia">Com referência</option>
              <option value="observacao">Observação (sem referência)</option>
            </select>
          </label>
        </div>
        <label>
          <span>Nome</span>
          <input value={f.nome} onChange={(e) => definir('nome', e.target.value)} aria-invalid={!!erros.nome} />
          <Erro msg={erros.nome} />
        </label>
        <label>
          <span>Descrição</span>
          <textarea rows={2} value={f.descricao} onChange={(e) => definir('descricao', e.target.value)} />
        </label>
        <div className="grelha-cat">
          <label>
            <span>Categoria</span>
            <input list="lista-categorias" value={f.categoria} onChange={(e) => definir('categoria', e.target.value)} />
            <datalist id="lista-categorias">{categorias.map((c) => <option key={c} value={c} />)}</datalist>
          </label>
          <label>
            <span>Fabricante / fornecedor</span>
            <input value={f.fabricante} onChange={(e) => definir('fabricante', e.target.value)} />
          </label>
          <label>
            <span>UQE</span>
            <select value={f.uqe} onChange={(e) => definir('uqe', e.target.value as Uqe)}>
              {OPCOES_UQE.map((u) => <option key={u} value={u}>{rotuloUqe(u)}</option>)}
            </select>
          </label>
        </div>
        <div className="grelha-3">
          <label>
            <span>Quantidade</span>
            <input inputMode="numeric" value={f.quantidade} onChange={(e) => definir('quantidade', e.target.value)} placeholder="Por confirmar" aria-invalid={!!erros.quantidade} />
            <Erro msg={erros.quantidade} />
          </label>
          <label className="check">
            <input type="checkbox" checked={f.quantidadeEstimada} onChange={(e) => definir('quantidadeEstimada', e.target.checked)} />
            <span>Quantidade estimada (não contada)</span>
          </label>
          <label>
            <span>Stock mínimo</span>
            <input inputMode="numeric" value={f.stockMinimo} onChange={(e) => definir('stockMinimo', e.target.value)} placeholder="Não configurado" aria-invalid={!!erros.stockMinimo} />
            <Erro msg={erros.stockMinimo} />
          </label>
        </div>
        <div className="grelha-loc">
          <label>
            <span>Localização (prateleira e coluna)</span>
            <select value={f.localizacaoId} onChange={(e) => definir('localizacaoId', e.target.value)}>
              <option value="">Localização por confirmar</option>
              {locsPorZona.map((g) => (
                <optgroup key={g.zona} label={g.zona}>
                  {g.locs.map((l) => <option key={l.id} value={l.id}>{rotuloLocalizacao(l)} — {l.descricao}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
          <label>
            <span>Caixa</span>
            <input value={f.caixa} onChange={(e) => definir('caixa', e.target.value.toUpperCase())} maxLength={2} placeholder="A, B…" className="mono" aria-invalid={!!erros.caixa} />
            <Erro msg={erros.caixa} />
          </label>
        </div>
        {f.localizacaoId && (
          <p className="nota">
            Posição: <strong className="mono">{codigoPosicao(localizacoes.find((l) => l.id === f.localizacaoId), ouNull(f.caixa)?.toUpperCase() ?? null)}</strong>
            {' '}— formato zona + corredor + prateleira (A = a mais baixa) + coluna + caixa, ex.: 1B09A02C.
          </p>
        )}
        <label>
          <span>Notas</span>
          <textarea rows={2} value={f.notas} onChange={(e) => definir('notas', e.target.value)} />
        </label>

        <fieldset className="fotos-editor">
          <legend>Fotografias</legend>
          {f.fotografias.length === 0 && <p className="texto-sec">Sem fotografias.</p>}
          <ul>
            {f.fotografias.map((foto, i) => (
              <li key={foto.src.slice(0, 60) + i}>
                <Foto foto={foto} miniatura className="miniatura" />
                <input
                  value={foto.legenda ?? ''}
                  onChange={(e) => definir('fotografias', f.fotografias.map((x, j) => (j === i ? { ...x, legenda: e.target.value } : x)))}
                  aria-label="Legenda da fotografia"
                  placeholder="Legenda"
                />
                <button type="button" className="btn-icone" onClick={() => definir('fotografias', f.fotografias.filter((_, j) => j !== i))} aria-label="Remover fotografia">
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
          <div className="fotos-adicionar">
            <label className="btn btn-secundario">
              <ImagePlus size={15} aria-hidden /> {aCarregar ? 'A processar…' : 'Carregar imagem'}
              <input type="file" accept="image/*" multiple hidden onChange={(e) => carregarFicheiros(e.target.files)} />
            </label>
            <div className="input-com-botao">
              <input value={caminhoFoto} onChange={(e) => setCaminhoFoto(e.target.value)} placeholder="/assets/pecas/ficheiro.jpg" aria-label="Caminho de uma fotografia em public/" />
              <button type="button" className="btn btn-fantasma" onClick={adicionarCaminho}><Link2 size={15} aria-hidden /> Adicionar</button>
            </div>
          </div>
          <p className="nota">As imagens carregadas são reduzidas e guardadas no navegador, que tem espaço limitado (≈5 MB).</p>
        </fieldset>

        <label>
          <span>Modelo 3D (.glb/.gltf, opcional)</span>
          <input value={f.modelo3D} onChange={(e) => definir('modelo3D', e.target.value)} placeholder="/assets/modelos-3d/ficheiro.glb" />
        </label>

        <label className="check confirmacao">
          <input type="checkbox" checked={confirmado} onChange={(e) => setConfirmado(e.target.checked)} aria-invalid={!!erros.confirmacao} />
          <span>Compreendo que esta alteração fica guardada apenas neste navegador e <strong>não altera o inventário oficial</strong>.</span>
        </label>
        <Erro msg={erros.confirmacao} />
      </form>
    </Modal>
  )
}
