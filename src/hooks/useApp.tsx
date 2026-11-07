import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Filtros, Vista } from '../types'
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
  sobreAberto: boolean
  setSobreAberto: (v: boolean) => void
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
}

const Ctx = createContext<App | null>(null)

const CHAVE_VISTA = 'armazem3d.vista'

function lerVista(): Vista {
  try {
    const v = localStorage.getItem(CHAVE_VISTA)
    return v === 'lista' || v === 'organograma' ? v : '3d'
  } catch {
    return '3d'
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { pecas, locs } = useInventario()
  const [vista, setVistaEstado] = useState<Vista>(lerVista)
  const [consulta, setConsulta] = useState('')
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS)
  const [localizacaoSelecionada, setLocalizacao] = useState<string | null>(null)
  const [pecaSelecionada, setPeca] = useState<string | null>(null)
  const [pedidoFoco, setPedidoFoco] = useState<App['pedidoFoco']>(null)
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [editor, setEditor] = useState<App['editor']>({ aberto: false, pecaId: null, localizacaoInicial: null })
  const [sobreAberto, setSobreAberto] = useState(false)
  const [estruturaEditada, setEstruturaEditada] = useState<string | null>(null)
  const [focoOrganograma, setFocoOrganograma] = useState<string | null>(null)
  const [editorLigacoes, abrirEditorLigacoes] = useState<App['editorLigacoes']>(null)
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
        notificar(`${motivoSem3D(p)} — não é possível destacá-la no armazém.`, 'aviso')
        return
      }
      setVista('3d')
      selecionarLocalizacao(p.localizacaoId, { focar: true })
    },
    [pecas, locs, notificar, selecionarLocalizacao, setVista],
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
      sobreAberto, setSobreAberto,
      estruturaEditada, setEstruturaEditada,
      focoOrganograma,
      abrirOrganograma: (chave) => {
        setFocoOrganograma(chave)
        setVista('organograma')
      },
      editorLigacoes, abrirEditorLigacoes,
    }),
    [vista, setVista, consulta, filtros, localizacaoSelecionada, pecaSelecionada, pedidoFoco,
      selecionarLocalizacao, localizarPeca, notificacoes, notificar, dispensar, editor, sobreAberto, estruturaEditada,
      focoOrganograma, editorLigacoes],
  )

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useApp(): App {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp fora do AppProvider')
  return v
}
