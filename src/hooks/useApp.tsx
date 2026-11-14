import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Filtros, Vista } from '../types'
import type { Destino } from '../utils/ligacoes'
import { FILTROS_VAZIOS } from '../utils/pesquisa'
import { motivoSem3D } from '../utils/posicao'
import { useInventario } from './useInventario'

/** Estado de interface partilhado: vista ativa, seleção, pesquisa, filtros, avisos e editor. */

export interface Notificacao {
  id: number
  texto: string
  tipo: 'info' | 'aviso' | 'sucesso' | 'erro'
}

interface App {
  vista: Vista
  setVista: (v: Vista) => void
  consulta: string
  setConsulta: (c: string) => void
  filtros: Filtros
  setFiltros: (f: Filtros) => void
  localizacaoSelecionada: string | null
  pecaSelecionada: string | null
  /** Pedido para a câmara 3D enquadrar uma localização (n muda a cada pedido). */
  pedidoFoco: { id: string; n: number } | null
  selecionarLocalizacao: (id: string | null, opcoes?: { focar?: boolean }) => void
  abrirPeca: (id: string | null) => void
  /** Muda para a vista 3D, enquadra e destaca a localização da peça (se existir) e abre a ficha. */
  localizarPeca: (id: string) => void
  notificacoes: Notificacao[]
  notificar: (texto: string, tipo?: Notificacao['tipo']) => void
  dispensar: (id: number) => void
  editor: { aberto: boolean; pecaId: string | null; localizacaoInicial: string | null }
  /** pecaId null = nova peça; localizacaoInicial pré-preenche a localização de uma peça nova. */
  abrirEditor: (pecaId: string | null, localizacaoInicial?: string | null) => void
  fecharEditor: () => void
  /** Estrutura escolhida no editor da planta (null = editor fechado ou nenhuma escolhida). */
  estruturaEditada: string | null
  setEstruturaEditada: (id: string | null) => void
  /** Nó do organograma em foco (referência da peça ou id do grupo). */
  focoOrganograma: string | null
  /** Abre a vista Organograma centrada num nó. */
  abrirOrganograma: (chave: string | null) => void
  /** Editor de ligações de um nó; `novoGrupo` cria um equipamento/conjunto novo. */
  editorLigacoes: { chave: string | null; novoGrupo?: 'equipamento' | 'conjunto'; comPeca?: string } | null
  abrirEditorLigacoes: (e: App['editorLigacoes']) => void
  /** Abre o resultado de um código lido ou de uma ligação direta (localização, peça ou pesquisa). */
  abrirDestino: (d: Destino) => void
  /** Janela de ferramenta aberta (etiquetas QR, leitor de códigos, importação, qualidade dos dados, recolha). */
  ferramenta: { tipo: Ferramenta; estrutura?: string } | null
  setFerramenta: (f: App['ferramenta']) => void
  /** Lista de recolha (ids das peças), quantidade a recolher de cada uma e as já recolhidas; guardadas neste navegador. */
  recolha: string[]
  recolhidas: string[]
  qtdRecolha: Record<string, number>
  /** Se a peça já está na lista retira-a; senão pede a quantidade a recolher. */
  alternarRecolha: (id: string) => void
  /** Peça à espera da quantidade a recolher (janela aberta). */
  pedidoRecolha: string | null
  cancelarPedidoRecolha: () => void
  /** Acrescenta (ou atualiza) a peça na lista com a quantidade indicada. */
  confirmarRecolha: (id: string, qtd: number) => void
  adicionarRecolha: (ids: string[], qtds?: Record<string, number>) => void
  alternarRecolhida: (id: string) => void
  limparRecolha: () => void
  /** Mostra as paragens da lista de recolha na vista 3D. */
  recolhaNo3D: boolean
  setRecolhaNo3D: (v: boolean) => void
}

export type Ferramenta = 'etiquetas' | 'leitor' | 'importar' | 'qualidade' | 'recolha'

const Ctx = createContext<App | null>(null)

const CHAVE_VISTA = 'armazem3d.vista'
const CHAVE_RECOLHA = 'armazem3d.recolha.v1'

interface EstadoRecolha { ids: string[]; feitas: string[]; qtds: Record<string, number> }

function lerRecolha(): EstadoRecolha {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE_RECOLHA) ?? 'null')
    return v && Array.isArray(v.ids) ? { ids: v.ids, feitas: v.feitas ?? [], qtds: v.qtds ?? {} } : { ids: [], feitas: [], qtds: {} }
  } catch {
    return { ids: [], feitas: [], qtds: {} }
  }
}

function lerVista(): Vista {
  try {
    const v = localStorage.getItem(CHAVE_VISTA)
    return v === 'lista' || v === 'organograma' ? v : '3d'
  } catch {
    return '3d'
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { pecas, locs, zonasModelo } = useInventario()
  const [vista, setVistaEstado] = useState<Vista>(lerVista)
  const [consulta, setConsulta] = useState('')
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS)
  const [localizacaoSelecionada, setLocalizacao] = useState<string | null>(null)
  const [pecaSelecionada, setPeca] = useState<string | null>(null)
  const [pedidoFoco, setPedidoFoco] = useState<App['pedidoFoco']>(null)
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [editor, setEditor] = useState<App['editor']>({ aberto: false, pecaId: null, localizacaoInicial: null })
  const [estruturaEditada, setEstruturaEditada] = useState<string | null>(null)
  const [focoOrganograma, setFocoOrganograma] = useState<string | null>(null)
  const [editorLigacoes, abrirEditorLigacoes] = useState<App['editorLigacoes']>(null)
  const [ferramenta, setFerramenta] = useState<App['ferramenta']>(null)
  const [recolhaEstado, setRecolhaEstado] = useState(lerRecolha)
  const [recolhaNo3D, setRecolhaNo3D] = useState(false)
  const [pedidoRecolha, setPedidoRecolha] = useState<string | null>(null)
  const gravarRecolha = useCallback((ids: string[], feitas: string[], qtds: Record<string, number>) => {
    const v: EstadoRecolha = { ids, feitas: feitas.filter((f) => ids.includes(f)), qtds: Object.fromEntries(Object.entries(qtds).filter(([k]) => ids.includes(k))) }
    setRecolhaEstado(v)
    try {
      localStorage.setItem(CHAVE_RECOLHA, JSON.stringify(v))
    } catch {
      /* opcional */
    }
  }, [])
  const contador = useRef(0)

  const setVista = useCallback((v: Vista) => {
    setVistaEstado(v)
    try {
      localStorage.setItem(CHAVE_VISTA, v)
    } catch {
      /* preferência opcional */
    }
  }, [])

  const dispensar = useCallback((id: number) => setNotificacoes((n) => n.filter((x) => x.id !== id)), [])

  const notificar = useCallback(
    (texto: string, tipo: Notificacao['tipo'] = 'info') => {
      const id = ++contador.current
      setNotificacoes((n) => [...n.slice(-2), { id, texto, tipo }])
      window.setTimeout(() => dispensar(id), tipo === 'erro' || tipo === 'aviso' ? 7000 : 4000)
    },
    [dispensar],
  )

  const selecionarLocalizacao = useCallback((id: string | null, opcoes?: { focar?: boolean }) => {
    setLocalizacao(id)
    if (id && opcoes?.focar) setPedidoFoco((p) => ({ id, n: (p?.n ?? 0) + 1 }))
  }, [])

  const localizarPeca = useCallback(
    (id: string) => {
      const p = pecas.find((x) => x.id === id)
      if (!p) return
      setPeca(id)
      if (!p.localizacaoId || !locs.has(p.localizacaoId)) {
        notificar(`${motivoSem3D(p, zonasModelo)} — não é possível destacá-la no armazém.`, 'aviso')
        return
      }
      setVista('3d')
      selecionarLocalizacao(p.localizacaoId, { focar: true })
    },
    [pecas, locs, zonasModelo, notificar, selecionarLocalizacao, setVista],
  )

  const abrirDestino = useCallback(
    (d: Destino) => {
      if (d.tipo === 'localizacao') {
        setPeca(null)
        setVista('3d')
        selecionarLocalizacao(d.id, { focar: true })
      } else if (d.tipo === 'peca') {
        const p = pecas.find((x) => x.id === d.id)
        if (p?.localizacaoId && locs.has(p.localizacaoId)) localizarPeca(d.id)
        else setPeca(d.id)
      } else {
        setConsulta(d.texto)
        setVista('lista')
        notificar(`Sem correspondência exata para "${d.texto}" — a mostrar os resultados da pesquisa.`, 'info')
      }
    },
    [pecas, locs, localizarPeca, notificar, selecionarLocalizacao, setVista],
  )

  const valor = useMemo<App>(
    () => ({
      vista, setVista, consulta, setConsulta, filtros, setFiltros,
      localizacaoSelecionada, pecaSelecionada, pedidoFoco,
      selecionarLocalizacao, abrirPeca: setPeca, localizarPeca,
      notificacoes, notificar, dispensar,
      editor,
      abrirEditor: (pecaId, localizacaoInicial = null) => setEditor({ aberto: true, pecaId, localizacaoInicial }),
      fecharEditor: () => setEditor({ aberto: false, pecaId: null, localizacaoInicial: null }),
      estruturaEditada, setEstruturaEditada,
      focoOrganograma,
      abrirOrganograma: (chave) => {
        setFocoOrganograma(chave)
        setVista('organograma')
      },
      editorLigacoes, abrirEditorLigacoes,
      abrirDestino,
      ferramenta, setFerramenta,
      recolha: recolhaEstado.ids,
      recolhidas: recolhaEstado.feitas,
      qtdRecolha: recolhaEstado.qtds,
      alternarRecolha: (id) => {
        if (recolhaEstado.ids.includes(id)) gravarRecolha(recolhaEstado.ids.filter((x) => x !== id), recolhaEstado.feitas, recolhaEstado.qtds)
        else setPedidoRecolha(id)
      },
      pedidoRecolha,
      cancelarPedidoRecolha: () => setPedidoRecolha(null),
      confirmarRecolha: (id, qtd) => {
        const ids = recolhaEstado.ids.includes(id) ? recolhaEstado.ids : [...recolhaEstado.ids, id]
        gravarRecolha(ids, recolhaEstado.feitas, { ...recolhaEstado.qtds, [id]: qtd })
        setPedidoRecolha(null)
      },
      adicionarRecolha: (ids, qtds = {}) => gravarRecolha([...new Set([...recolhaEstado.ids, ...ids])], recolhaEstado.feitas, { ...recolhaEstado.qtds, ...qtds }),
      alternarRecolhida: (id) => gravarRecolha(
        recolhaEstado.ids,
        recolhaEstado.feitas.includes(id) ? recolhaEstado.feitas.filter((x) => x !== id) : [...recolhaEstado.feitas, id],
        recolhaEstado.qtds,
      ),
      limparRecolha: () => { gravarRecolha([], [], {}); setRecolhaNo3D(false) },
      recolhaNo3D, setRecolhaNo3D,
    }),
    [vista, setVista, consulta, filtros, localizacaoSelecionada, pecaSelecionada, pedidoFoco,
      selecionarLocalizacao, localizarPeca, notificacoes, notificar, dispensar, editor, estruturaEditada,
      focoOrganograma, editorLigacoes, abrirDestino, ferramenta, recolhaEstado, gravarRecolha, recolhaNo3D, pedidoRecolha],
  )

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useApp(): App {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp fora do AppProvider')
  return v
}
