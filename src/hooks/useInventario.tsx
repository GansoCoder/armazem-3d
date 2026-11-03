import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { carregarDadosBase, type DadosBase } from '../data/fonte'
import type { Estrutura, Localizacao, Peca } from '../types'

/**
 * Estado do inventário: dados base (JSON) + rascunho local do modo de edição.
 *
 * O rascunho fica APENAS no localStorage deste navegador. Não é partilhado, não é uma base de dados
 * e não substitui o inventário oficial.
 */

const CHAVE_RASCUNHO = 'armazem3d.rascunho.v1'

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

  useEffect(() => {
    carregarDadosBase().then(setDados)
  }, [])

  const valor = useMemo<Inventario>(() => {
    const base = dados?.pecas ?? []
    const idsBase = new Set(base.map((p) => p.id))
    const pecas = [
      ...base.map((p) => rascunho[p.id] ?? p),
      ...Object.values(rascunho).filter((p) => !idsBase.has(p.id)),
    ]
    const localizacoes = dados?.localizacoes ?? []
    const locs = new Map(localizacoes.map((l) => [l.id, l]))
    const estruturas = new Map((dados?.layout.estruturas ?? []).map((e) => [e.id, e]))
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
        const blob = new Blob([JSON.stringify(limpo, null, 2) + '\n'], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `parts-rascunho-${new Date().toISOString().slice(0, 10)}.json`
        a.click()
        URL.revokeObjectURL(url)
      },
      existeNaBase: (id) => idsBase.has(id),
    }
  }, [dados, rascunho])

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useInventario(): Inventario {
  const v = useContext(Ctx)
  if (!v) throw new Error('useInventario fora do InventarioProvider')
  return v
}

