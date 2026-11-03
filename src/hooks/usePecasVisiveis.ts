import { useMemo } from 'react'
import { aplicarFiltros, filtrosAtivos, pesquisarPecas } from '../utils/pesquisa'
import { useApp } from './useApp'
import { useInventario } from './useInventario'

/** Peças que correspondem à pesquisa global e aos filtros ativos (partilhado pela listagem e pela vista 3D). */
export function usePecasVisiveis() {
  const { pecas, locs, estruturas } = useInventario()
  const { consulta, filtros } = useApp()
  return useMemo(() => {
    const filtradas = aplicarFiltros(pecas, filtros, locs)
    const resultado = pesquisarPecas(consulta, filtradas, { locs, estruturas })
    const ativo = consulta.trim() !== '' || filtrosAtivos(filtros) > 0
    return { pecas: resultado, ativo }
  }, [pecas, locs, estruturas, consulta, filtros])
}
