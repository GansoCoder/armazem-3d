import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Copy, Crosshair, Plus, RotateCw, Save, Trash2, TriangleAlert, Undo2, X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useApp } from '../../hooks/useApp'
import { useInventario } from '../../hooks/useInventario'
import type { Estrutura, EstruturaEstante, Layout } from '../../types'
import {
  codigosRepetidos, criarEstrutura, duplicar, ehEstante, intervaloCodigos, mudarTipo, nomeAutomatico, NOMES_TIPO,
  remover, substituir, type TipoNovo,
} from '../../utils/editorPlanta'
import { niveisPadrao } from '../../utils/planta'

/**
 * Editor da planta: criar, mover, rodar e alterar estruturas (estantes, armários, porta-paletes…).
 * As localizações e os códigos (1B18A01…) são gerados automaticamente e as peças do Excel com essas
 * posições ficam logo ligadas. Tudo fica num rascunho local até ser exportado para layout.json.
 */

const TIPOS_NOVOS: TipoNovo[] = ['estante-ligeira', 'porta-paletes', 'armario', 'estante-vidros', 'zona-chao']
const FRENTES = [
  { graus: 0, rotulo: 'Para baixo', Icone: ArrowDown },
  { graus: 90, rotulo: 'Para a direita', Icone: ArrowRight },
  { graus: 180, rotulo: 'Para cima', Icone: ArrowUp },
  { graus: -90, rotulo: 'Para a esquerda', Icone: ArrowLeft },
]
const r2 = (v: number) => Math.round(v * 100) / 100
const normalizarGraus = (g: number) => ((((g + 180) % 360) + 360) % 360) - 180

/** Campo numérico que só aplica valores válidos (deixa escrever "1," ou apagar sem estragar a estrutura). */
function Numero({ rotulo, valor, aoMudar, passo = 1, min, max, unidade, dica }: {
  rotulo: string
  valor: number
  aoMudar: (n: number) => void
  passo?: number
  min: number
  max: number
  unidade?: string
  dica?: string
}) {
  const [texto, setTexto] = useState<string | null>(null)
  return (
    <label title={dica}>
      <span>{rotulo}{unidade && <span className="texto-sec"> ({unidade})</span>}</span>
      <input
        type="number"
        inputMode="decimal"
        step={passo}
        min={min}
        max={max}
        value={texto ?? String(valor)}
        onChange={(e) => {
          setTexto(e.target.value)
          const n = Number(e.target.value.replace(',', '.'))
          if (e.target.value.trim() !== '' && Number.isFinite(n) && n >= min && n <= max) aoMudar(n)
        }}
        onBlur={() => setTexto(null)}
      />
    </label>
  )
}

function FormEstrutura({ e, trabalho, aplicar, aoFocar }: {
  e: Estrutura
  trabalho: Layout
  aplicar: (nova: Estrutura) => void
  aoFocar: (id: string) => void
}) {
  const { localizacoes, pecas, pecasPorLocalizacao } = useInventario()
  const { setEstruturaEditada, notificar } = useApp()
  const { setPlantaEmEdicao } = useInventario()
  const [corredorTexto, setCorredorTexto] = useState(e.corredor ?? '')
  const [passo, setPasso] = useState(0.5)
  const zonas = useMemo(() => [...new Set(trabalho.estruturas.map((x) => x.zona))], [trabalho])

  const alterar = (patch: Partial<Estrutura>) => aplicar({ ...e, ...patch } as Estrutura)
  const estante = ehEstante(e) ? e : null

  const locs = localizacoes.filter((l) => l.estrutura === e.id)
  const intervalo = intervaloCodigos(locs)
  const ligadas = locs.reduce((n, l) => n + (pecasPorLocalizacao.get(l.id)?.length ?? 0), 0)
  const prefixoCorredor = e.corredor ? `${trabalho.codigoZona}${e.corredor}` : null
  const porLigar = prefixoCorredor
    ? pecas.filter((p) => p.posicaoOrigem?.startsWith(prefixoCorredor) && !p.localizacaoId)
    : []

  function mudarCorredor(texto: string) {
    const v = texto.replace(/\D/g, '').slice(0, 2)
    setCorredorTexto(v)
    if (v.length === 1) return // espera pelo segundo dígito (ou pelo fim da edição)
    const corredor = v || null
    const nomeAuto = e.nome === nomeAutomatico(e.tipo, e.corredor ?? null)
    const nome = nomeAuto ? nomeAutomatico(e.tipo, corredor) : e.nome
    alterar({ corredor, nome, rotulo: corredor ? `Corredor ${corredor}` : nome, corredorInferido: undefined })
  }

  function mudarEstante(patch: Partial<EstruturaEstante>, recalcularNiveis = false) {
    if (!estante) return
    const nova = { ...estante, ...patch }
    if (recalcularNiveis) {
      nova.niveis = niveisPadrao(nova.tipo, nova.niveis.length, nova.altura)
      delete nova.nomesNiveis
    }
    aplicar(nova)
  }

  function mover(dx: number, dz: number) {
    alterar({ posicao: { x: r2(e.posicao.x + dx), z: r2(e.posicao.z + dz) } })
  }

  return (
    <div className="formulario editor-form">
      <div className="editor-acoes-linha">
        <span className="tag">{NOMES_TIPO[e.tipo]}</span>
        <span className="mono texto-sec">{e.id}</span>
        <span className="espaco" />
        <button className="btn-icone" onClick={() => aoFocar(e.id)} title="Centrar câmara" aria-label="Centrar câmara nesta estrutura"><Crosshair size={16} /></button>
        <button
          className="btn-icone"
          title="Duplicar"
          aria-label="Duplicar estrutura"
          onClick={() => {
            const c = duplicar(trabalho, e)
            setPlantaEmEdicao({ ...trabalho, estruturas: [...trabalho.estruturas, c] })
            setEstruturaEditada(c.id)
            notificar('Cópia criada ao lado (sem número de corredor).', 'info')
          }}
        >
          <Copy size={16} />
        </button>
        <button
          className="btn-icone perigo"
          title="Apagar"
          aria-label="Apagar estrutura"
          onClick={() => {
            const aviso = ligadas ? `\n\n${ligadas} peça(s) ligadas a esta estrutura deixam de aparecer no 3D (continuam na listagem).` : ''
            if (!window.confirm(`Apagar "${e.nome}" da planta?${aviso}`)) return
            setPlantaEmEdicao(remover(trabalho, e.id))
            setEstruturaEditada(null)
          }}
        >
          <Trash2 size={16} />
        </button>
      </div>

      <label>
        <span>Nome</span>
        <input value={e.nome} onChange={(ev) => alterar({ nome: ev.target.value, rotulo: e.corredor ? e.rotulo : ev.target.value })} />
      </label>
      <div className="grelha-2">
        <label>
          <span>Corredor <span className="texto-sec">(2 dígitos)</span></span>
          <input
            className="mono"
            inputMode="numeric"
            value={corredorTexto}
            placeholder="Sem número"
            onChange={(ev) => mudarCorredor(ev.target.value)}
            onBlur={() => { if (corredorTexto.length === 1) mudarCorredor(`0${corredorTexto}`) }}
          />
        </label>
        {estante ? (
          <label>
            <span>Tipo</span>
            <select value={estante.tipo} onChange={(ev) => aplicar(mudarTipo(estante, ev.target.value as EstruturaEstante['tipo']))}>
              {TIPOS_NOVOS.filter((t) => t !== 'zona-chao').map((t) => <option key={t} value={t}>{NOMES_TIPO[t]}</option>)}
            </select>
          </label>
        ) : (
          <label>
            <span>Grupo</span>
            <input list="lista-zonas-planta" value={e.zona} onChange={(ev) => alterar({ zona: ev.target.value })} />
          </label>
        )}
      </div>
      {estante && !e.corredor && (
        <label title="Ex.: ARM — as prateleiras ficam ARM01 (a mais baixa), ARM02…, e a letra seguinte é a caixa">
          <span>Código das prateleiras <span className="texto-sec">(sem corredor; ex.: ARM)</span></span>
          <input
            className="mono"
            value={estante.prefixoCodigo ?? ''}
            placeholder="Nenhum"
            onChange={(ev) => {
              const v = ev.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8)
              mudarEstante({ prefixoCodigo: v || undefined })
            }}
          />
        </label>
      )}
      {estante && (
        <label>
          <span>Grupo <span className="texto-sec">(agrupa as localizações)</span></span>
          <input list="lista-zonas-planta" value={e.zona} onChange={(ev) => alterar({ zona: ev.target.value })} />
        </label>
      )}
      <datalist id="lista-zonas-planta">{zonas.map((z) => <option key={z} value={z} />)}</datalist>

      {estante && (
        <fieldset>
          <legend>Colunas e prateleiras</legend>
          <div className="grelha-2">
            <Numero rotulo="Colunas" valor={estante.modulos} min={1} max={40} aoMudar={(n) => mudarEstante({ modulos: Math.round(n) })} />
            <Numero
              rotulo="Prateleiras"
              valor={estante.niveis.length}
              min={1}
              max={15}
              dica="A = a mais baixa"
              aoMudar={(n) => mudarEstante({ niveis: niveisPadrao(estante.tipo, Math.round(n), estante.altura), nomesNiveis: undefined })}
            />
            <Numero
              rotulo="Primeira coluna"
              valor={estante.colunaInicial ?? 1}
              min={1}
              max={99}
              dica="Ex.: 4 se esta estrutura continua outra que vai até à coluna 03"
              aoMudar={(n) => mudarEstante({ colunaInicial: Math.round(n) === 1 ? undefined : Math.round(n) })}
            />
            <label>
              <span>Coluna 01 no</span>
              <select
                value={estante.colunasInvertidas ? 'fim' : 'inicio'}
                onChange={(ev) => mudarEstante({ colunasInvertidas: ev.target.value === 'fim' ? true : undefined })}
              >
                <option value="inicio">Lado esquerdo (de frente)</option>
                <option value="fim">Lado direito (de frente)</option>
              </select>
            </label>
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend>Medidas</legend>
        {estante ? (
          <div className="grelha-2">
            <Numero rotulo="Largura de cada coluna" unidade="m" passo={0.05} valor={estante.larguraModulo} min={0.2} max={6} aoMudar={(n) => mudarEstante({ larguraModulo: r2(n) })} />
            <Numero rotulo="Profundidade" unidade="m" passo={0.05} valor={estante.profundidade} min={0.2} max={3} aoMudar={(n) => mudarEstante({ profundidade: r2(n) })} />
            <Numero rotulo="Altura" unidade="m" passo={0.1} valor={estante.altura} min={0.5} max={8} aoMudar={(n) => mudarEstante({ altura: r2(n) }, true)} />
            <p className="nota editor-comprimento">Comprimento total: <strong>{r2(estante.modulos * estante.larguraModulo)} m</strong></p>
          </div>
        ) : e.tipo === 'zona-chao' ? (
          <div className="grelha-2">
            <Numero rotulo="Largura" unidade="m" passo={0.1} valor={e.largura} min={0.3} max={20} aoMudar={(n) => alterar({ largura: r2(n) })} />
            <Numero rotulo="Profundidade" unidade="m" passo={0.1} valor={e.profundidade} min={0.3} max={20} aoMudar={(n) => alterar({ profundidade: r2(n) })} />
            <label className="check">
              <input type="checkbox" checked={e.conteudo === 'rolos'} onChange={(ev) => alterar({ conteudo: ev.target.checked ? 'rolos' : undefined })} />
              <span>Desenhar rolos brancos</span>
            </label>
          </div>
        ) : (
          <p className="nota">A disposição dos contentores é definida em <code>layout.json</code> (<code>disposicao</code>); aqui pode mover e rodar o conjunto.</p>
        )}
      </fieldset>

      <fieldset>
        <legend>Posição</legend>
        <div className="editor-mover">
          <div className="cruz" role="group" aria-label="Mover">
            <button className="btn btn-secundario" onClick={() => mover(0, -passo)} aria-label="Mover para cima"><ArrowUp size={16} /></button>
            <button className="btn btn-secundario" onClick={() => mover(-passo, 0)} aria-label="Mover para a esquerda"><ArrowLeft size={16} /></button>
            <button className="btn btn-secundario" onClick={() => mover(passo, 0)} aria-label="Mover para a direita"><ArrowRight size={16} /></button>
            <button className="btn btn-secundario" onClick={() => mover(0, passo)} aria-label="Mover para baixo"><ArrowDown size={16} /></button>
          </div>
          <div className="editor-mover-campos">
            <label>
              <span>Passo</span>
              <select value={passo} onChange={(ev) => setPasso(Number(ev.target.value))}>
                <option value={0.1}>10 cm</option>
                <option value={0.5}>50 cm</option>
                <option value={1}>1 m</option>
              </select>
            </label>
            <Numero key={`x${e.posicao.x}`} rotulo="X" unidade="m" passo={0.1} valor={e.posicao.x} min={-200} max={200} aoMudar={(n) => alterar({ posicao: { ...e.posicao, x: r2(n) } })} />
            <Numero key={`z${e.posicao.z}`} rotulo="Z" unidade="m" passo={0.1} valor={e.posicao.z} min={-200} max={200} aoMudar={(n) => alterar({ posicao: { ...e.posicao, z: r2(n) } })} />
          </div>
        </div>
        <span className="rotulo-campo">Frente virada (vista de cima)</span>
        <div className="editor-frentes" role="group" aria-label="Frente virada para">
          {FRENTES.map(({ graus, rotulo, Icone }) => (
            <button
              key={graus}
              className={`btn btn-secundario ${normalizarGraus(e.rotacaoY) === graus ? 'ativo' : ''}`}
              onClick={() => alterar({ rotacaoY: graus })}
              aria-pressed={normalizarGraus(e.rotacaoY) === graus}
              title={rotulo}
              aria-label={`Frente ${rotulo.toLowerCase()}`}
            >
              <Icone size={16} />
            </button>
          ))}
          <button className="btn btn-fantasma" onClick={() => alterar({ rotacaoY: normalizarGraus(e.rotacaoY + 90) })} title="Rodar 90°">
            <RotateCw size={15} aria-hidden /> 90°
          </button>
        </div>
      </fieldset>

      <section className="editor-resumo" aria-live="polite">
        {intervalo ? (
          <p>Códigos: <strong className="mono">{intervalo.primeiro}</strong> … <strong className="mono">{intervalo.ultimo}</strong> ({intervalo.total})</p>
        ) : (
          <p className="texto-sec">Sem número de corredor: as posições ficam com código provisório ({locs.length}).</p>
        )}
        <p>Peças ligadas a esta estrutura: <strong>{ligadas}</strong></p>
        {porLigar.length > 0 && (
          <p className="alerta alerta-aviso">
            {porLigar.length} material(ais) do Excel no corredor {e.corredor} ainda sem posição no 3D
            (ex.: <span className="mono">{porLigar.slice(0, 3).map((p) => p.posicaoOrigem).join(', ')}</span>).
            Aumente as colunas ou prateleiras, ou verifique se pertencem a outra estrutura do mesmo corredor.
          </p>
        )}
      </section>
    </div>
  )
}

export function EditorPlanta({ aoFechar, aoFocar }: { aoFechar: () => void; aoFocar: (id: string) => void }) {
  const { plantaEmEdicao: trabalho, setPlantaEmEdicao, plantaGuardada, guardarPlanta, localizacoes } = useInventario()
  const { estruturaEditada, setEstruturaEditada, notificar } = useApp()
  const [tipoNovo, setTipoNovo] = useState<TipoNovo>('estante-ligeira')
  const [confirmado, setConfirmado] = useState(false)

  const repetidos = useMemo(() => codigosRepetidos(localizacoes), [localizacoes])
  if (!trabalho) return null
  const alterado = JSON.stringify(trabalho) !== JSON.stringify(plantaGuardada)
  const e = trabalho.estruturas.find((x) => x.id === estruturaEditada)
  const ordenadas = [...trabalho.estruturas].sort((a, b) =>
    (a.corredor ?? 'zz').localeCompare(b.corredor ?? 'zz', 'pt', { numeric: true }) || a.nome.localeCompare(b.nome, 'pt'))
  const estruturasRepetidas = [...new Set([...repetidos.values()].flat())]

  function fechar() {
    if (alterado && !window.confirm('Sair do editor sem guardar as alterações à planta?')) return
    setPlantaEmEdicao(null)
    setEstruturaEditada(null)
    aoFechar()
  }

  function adicionar() {
    // ao lado da estrutura escolhida, ou no centro do pavilhão
    const ref = e ?? null
    const { xMin, xMax, zMin, zMax } = trabalho!.edificio
    const posicao = ref ? { x: r2(ref.posicao.x + 1.5), z: ref.posicao.z } : { x: r2((xMin + xMax) / 2), z: r2((zMin + zMax) / 2) }
    const nova = criarEstrutura(trabalho!, tipoNovo, posicao)
    setPlantaEmEdicao({ ...trabalho!, estruturas: [...trabalho!.estruturas, nova] })
    setEstruturaEditada(nova.id)
    notificar(`${NOMES_TIPO[tipoNovo]} criada. Indique o corredor e ajuste a posição.`, 'info')
  }

  return (
    <aside className="navegador editor-planta" aria-label="Editor da planta">
      <div className="navegador-topo">
        <span>Editar planta</span>
        <button className="btn-icone" onClick={fechar} aria-label="Fechar editor da planta" title="Fechar editor">
          <X size={16} />
        </button>
      </div>

      <div className="editor-planta-corpo">
        <div className="alerta alerta-aviso">
          <TriangleAlert size={16} aria-hidden />
          <div>As alterações ficam <strong>só neste navegador</strong> até exportar o <code>layout.json</code>. Clique numa estrutura no 3D para a escolher.</div>
        </div>

        <div className="editor-novo">
          <select value={tipoNovo} onChange={(ev) => setTipoNovo(ev.target.value as TipoNovo)} aria-label="Tipo da nova estrutura">
            {TIPOS_NOVOS.map((t) => <option key={t} value={t}>{NOMES_TIPO[t]}</option>)}
          </select>
          <button className="btn btn-secundario" onClick={adicionar}><Plus size={15} aria-hidden /> Nova</button>
        </div>

        <label className="editor-escolha">
          <span>Estrutura</span>
          <select
            value={estruturaEditada ?? ''}
            onChange={(ev) => {
              setEstruturaEditada(ev.target.value || null)
              if (ev.target.value) aoFocar(ev.target.value)
            }}
          >
            <option value="">Escolha uma estrutura…</option>
            {ordenadas.map((x) => (
              <option key={x.id} value={x.id}>{x.corredor ? `${x.corredor} · ` : ''}{x.nome}</option>
            ))}
          </select>
        </label>

        {estruturasRepetidas.length > 0 && (
          <div className="alerta alerta-erro" role="alert">
            <strong>Códigos repetidos</strong> em {estruturasRepetidas.join(', ')} (ex.: <span className="mono">{[...repetidos.keys()][0]}</span>).
            Use números de corredor diferentes ou ajuste a primeira coluna.
          </div>
        )}

        {e ? (
          <FormEstrutura
            key={e.id}
            e={e}
            trabalho={trabalho}
            aplicar={(nova) => setPlantaEmEdicao(substituir(trabalho, e.id, nova))}
            aoFocar={aoFocar}
          />
        ) : (
          <p className="texto-sec">Escolha uma estrutura na lista ou no 3D, ou crie uma nova.</p>
        )}
      </div>

      <div className="editor-planta-rodape">
        <label className="check">
          <input type="checkbox" checked={confirmado} onChange={(ev) => setConfirmado(ev.target.checked)} />
          <span>Compreendo que a planta fica guardada só neste navegador e <strong>não altera a planta oficial</strong>.</span>
        </label>
        <div className="editor-planta-botoes">
          <button
            className="btn btn-fantasma"
            disabled={!alterado}
            onClick={() => {
              if (!window.confirm('Descartar as alterações desde a última gravação?')) return
              setPlantaEmEdicao(structuredClone(plantaGuardada))
            }}
          >
            <Undo2 size={15} aria-hidden /> Descartar
          </button>
          <button
            className="btn btn-primario"
            disabled={!alterado || estruturasRepetidas.length > 0}
            title={estruturasRepetidas.length ? 'Corrija os códigos repetidos antes de guardar' : undefined}
            onClick={() => {
              if (!confirmado) {
                notificar('Confirme que compreende que a planta fica só neste navegador.', 'aviso')
                return
              }
              const erro = guardarPlanta(trabalho)
              notificar(erro ?? 'Planta guardada neste navegador (não oficial). Use "Exportar layout.json" para a levar para o projeto.', erro ? 'erro' : 'sucesso')
            }}
          >
            <Save size={15} aria-hidden /> Guardar
          </button>
        </div>
      </div>
    </aside>
  )
}
