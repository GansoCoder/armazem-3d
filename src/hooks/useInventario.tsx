import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { carregarDadosBase, type DadosBase } from '../data/fonte'
import type { Composicao, Estrutura, Layout, Localizacao, Peca } from '../types'
import { criarLigador, gerarLocalizacoes } from '../utils/planta'

/**
 * Estado do inventário: dados base (JSON) + rascunho local do modo de edição.
 *
 * O rascunho fica APENAS no localStorage deste navegador. Não é partilhado, não é uma base de dados
 * e não substitui o inventário oficial.
 */

const CHAVE_RASCUNHO = 'armazem3d.rascunho.v1'
/** Planta (layout) alterada no editor da planta — também só neste navegador. */
const CHAVE_PLANTA = 'armazem3d.planta.v1'

/** Organograma (composição das peças) alterado no navegador. */
const CHAVE_COMPOSICAO = 'armazem3d.composicao.v1'

function lerComposicao(): Composicao | null {
  try {
    const bruto = localStorage.getItem(CHAVE_COMPOSICAO)
    return bruto ? (JSON.parse(bruto) as Composicao) : null
  } catch {
    return null
  }
}

function lerPlanta(): Layout | null {
  try {
    const bruto = localStorage.getItem(CHAVE_PLANTA)
    return bruto ? (JSON.parse(bruto) as Layout) : null
  } catch {
    return null
  }
}

function descarregar(conteudo: unknown, nome: string) {
  const blob = new Blob([JSON.stringify(conteudo, null, 2) + '\n'], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  URL.revokeObjectURL(url)
}

type Rascunho = Record<string, Peca>

function lerRascunho(): Rascunho {
  try {
    const bruto = localStorage.getItem(CHAVE_RASCUNHO)
    return bruto ? (JSON.parse(bruto) as Rascunho) : {}
  } catch {
    return {}
  }
}

function gravarRascunho(r: Rascunho): string | null {
  try {
    if (Object.keys(r).length === 0) localStorage.removeItem(CHAVE_RASCUNHO)
    else localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(r))
    return null
  } catch (e) {
    const cheio = e instanceof DOMException && e.name === 'QuotaExceededError'
    return cheio
      ? 'O armazenamento local do navegador está cheio (as fotografias carregadas ocupam muito espaço). Remova fotografias ou exporte os dados.'
      : 'Não foi possível guardar no armazenamento local deste navegador.'
  }
}

interface Inventario {
  carregado: boolean
  dados: DadosBase | null
  /** Planta em uso: a que está a ser editada, senão o rascunho local, senão a oficial (layout.json). */
  layout: Layout | null
  /** true quando há uma planta guardada localmente (diferente de layout.json). */
  plantaLocal: boolean
  /** Cópia de trabalho do editor da planta (null = editor fechado). */
  plantaEmEdicao: Layout | null
  setPlantaEmEdicao: (l: Layout | null) => void
  /** Planta guardada (rascunho local ou oficial), para comparar com a cópia de trabalho. */
  plantaGuardada: Layout | null
  guardarPlanta: (l: Layout) => string | null
  reporPlanta: () => void
  exportarPlanta: () => void
  /** Organograma em uso: o rascunho local, senão o oficial (composicao.json). */
  composicao: Composicao
  composicaoLocal: boolean
  guardarComposicao: (c: Composicao) => string | null
  reporComposicao: () => void
  exportarComposicao: () => void
  pecas: Peca[]
  localizacoes: Localizacao[]
  locs: Map<string, Localizacao>
  estruturas: Map<string, Estrutura>
  pecasPorLocalizacao: Map<string, Peca[]>
  categorias: string[]
  zonas: string[]
  alteracoesLocais: number
  /** Devolve uma mensagem de erro, ou null se gravou com sucesso. */
  guardarPeca: (p: Peca) => string | null
  descartarAlteracao: (id: string) => void
  reporDadosOriginais: () => void
  exportarJSON: () => void
  existeNaBase: (id: string) => boolean
}

const Ctx = createContext<Inventario | null>(null)

export function InventarioProvider({ children }: { children: ReactNode }) {
  const [dados, setDados] = useState<DadosBase | null>(null)
  const [rascunho, setRascunho] = useState<Rascunho>(lerRascunho)
  const [plantaLocal, setPlantaLocal] = useState<Layout | null>(lerPlanta)
  const [plantaEmEdicao, setPlantaEmEdicao] = useState<Layout | null>(null)
  const [composicaoLocal, setComposicaoLocal] = useState<Composicao | null>(lerComposicao)

  // Localizações e ligações das peças: com a planta oficial usam-se os ficheiros gerados pelos scripts;
  // com uma planta alterada, são recalculadas aqui com as mesmas regras (src/utils/planta.ts).
  const plantaGuardada = plantaLocal ?? dados?.layout ?? null
  const layout = plantaEmEdicao ?? plantaGuardada
  const alterada = !!dados && layout !== dados.layout
  const localizacoesAtivas = useMemo(
    () => (dados && layout && alterada ? gerarLocalizacoes(layout, dados.localizacoes) : (dados?.localizacoes ?? [])),
    [dados, layout, alterada],
  )
  const ligacoes = useMemo(() => {
    if (!dados || !layout || !alterada) return null
    // materiais do Excel: a posição do Excel é a referência; voltam a ser ligados à nova planta
    const ligar = criarLigador(layout, localizacoesAtivas)
    const m = new Map<string, { localizacaoId: string | null; caixa: string | null }>()
    for (const p of dados.pecas) {
      if (p.fonte !== 'excel' || !p.posicaoOrigem) continue
      const r = ligar(p.posicaoOrigem)
      m.set(p.id, { localizacaoId: r.loc?.id ?? null, caixa: r.loc ? (r.caixa ?? null) : p.caixa })
    }
    return m
  }, [dados, layout, alterada, localizacoesAtivas])

  useEffect(() => {
    carregarDadosBase().then(setDados)
  }, [])

  const valor = useMemo<Inventario>(() => {
    const base = dados?.pecas ?? []
    const idsBase = new Set(base.map((p) => p.id))
    const religar = (p: Peca): Peca => {
      const l = ligacoes?.get(p.id)
      // uma peça cuja localização foi mudada à mão (sem posição do Excel) mantém-na
      return l && p.posicaoOrigem ? { ...p, ...l } : p
    }
    const pecas = [
      ...base.map((p) => religar(rascunho[p.id] ?? p)),
      ...Object.values(rascunho).filter((p) => !idsBase.has(p.id)),
    ]
    const localizacoes = localizacoesAtivas
    const locs = new Map(localizacoes.map((l) => [l.id, l]))
    const estruturas = new Map((layout?.estruturas ?? []).map((e) => [e.id, e]))
    const pecasPorLocalizacao = new Map<string, Peca[]>()
    for (const p of pecas) {
      if (!p.localizacaoId || !locs.has(p.localizacaoId)) continue
      const lista = pecasPorLocalizacao.get(p.localizacaoId) ?? []
      lista.push(p)
      pecasPorLocalizacao.set(p.localizacaoId, lista)
    }
    const categorias = [...new Set(pecas.map((p) => p.categoria).filter((c): c is string => !!c))].sort()
    const zonas = [...new Set(localizacoes.map((l) => l.zona))]

    const atualizar = (novo: Rascunho) => {
      const erro = gravarRascunho(novo)
      if (!erro) setRascunho(novo)
      return erro
    }

    return {
      carregado: !!dados,
      dados,
      layout,
      plantaLocal: !!plantaLocal,
      plantaEmEdicao,
      setPlantaEmEdicao,
      plantaGuardada,
      guardarPlanta: (l) => {
        try {
          localStorage.setItem(CHAVE_PLANTA, JSON.stringify(l))
          setPlantaLocal(l)
          return null
        } catch {
          return 'Não foi possível guardar a planta no armazenamento local deste navegador.'
        }
      },
      reporPlanta: () => {
        try {
          localStorage.removeItem(CHAVE_PLANTA)
        } catch {
          /* nada a remover */
        }
        setPlantaLocal(null)
        setPlantaEmEdicao(null)
      },
      exportarPlanta: () => {
        if (plantaGuardada) descarregar(plantaGuardada, 'layout.json')
      },
      composicao: composicaoLocal ?? dados?.composicao ?? { grupos: [], ligacoes: [] },
      composicaoLocal: !!composicaoLocal,
      guardarComposicao: (c) => {
        try {
          localStorage.setItem(CHAVE_COMPOSICAO, JSON.stringify(c))
          setComposicaoLocal(c)
          return null
        } catch {
          return 'Não foi possível guardar o organograma no armazenamento local deste navegador.'
        }
      },
      reporComposicao: () => {
        try {
          localStorage.removeItem(CHAVE_COMPOSICAO)
        } catch {
          /* nada a remover */
        }
        setComposicaoLocal(null)
      },
      exportarComposicao: () => descarregar(composicaoLocal ?? dados?.composicao ?? { grupos: [], ligacoes: [] }, 'composicao.json'),
      pecas,
      localizacoes,
      locs,
      estruturas,
      pecasPorLocalizacao,
      categorias,
      zonas,
      alteracoesLocais: Object.keys(rascunho).length,
      guardarPeca: (p) =>
        atualizar({
          ...rascunho,
          [p.id]: { ...p, origemLocal: idsBase.has(p.id) ? 'editado' : 'criado', atualizadoEm: new Date().toISOString() },
        }),
      descartarAlteracao: (id) => {
        const { [id]: _removido, ...resto } = rascunho
        atualizar(resto)
      },
      reporDadosOriginais: () => atualizar({}),
      exportarJSON: () => {
        const limpo = pecas.map(({ origemLocal: _o, atualizadoEm: _a, ...p }) => p)
        descarregar(limpo, `parts-rascunho-${new Date().toISOString().slice(0, 10)}.json`)
      },
      existeNaBase: (id) => idsBase.has(id),
    }
  }, [dados, rascunho, layout, plantaLocal, plantaEmEdicao, plantaGuardada, localizacoesAtivas, ligacoes, composicaoLocal])

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useInventario(): Inventario {
  const v = useContext(Ctx)
  if (!v) throw new Error('useInventario fora do InventarioProvider')
  return v
}

