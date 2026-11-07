import { useMemo } from 'react'
import { descendentes, indexar } from '../utils/composicao'
import { aplicarFiltros, filtrosAtivos, pesquisarPecas } from '../utils/pesquisa'
import { useApp } from './useApp'
import { useInventario } from './useInventario'

/** Peças que correspondem à pesquisa global e aos filtros ativos (partilhado pela listagem e pela vista 3D). */
export function usePecasVisiveis() {
  const { pecas, locs, estruturas, composicao } = useInventario()
  const { consulta, filtros } = useApp()
  return useMemo(() => {
    const naComposicao = filtros.composicao ? descendentes(filtros.composicao, indexar(composicao, pecas)) : undefined
    const filtradas = aplicarFiltros(pecas, filtros, locs, naComposicao)
    const resultado = pesquisarPecas(consulta, filtradas, { locs, estruturas })
    const ativo = consulta.trim() !== '' || filtrosAtivos(filtros) > 0
    return { pecas: resultado, ativo }
  }, [pecas, locs, estruturas, composicao, consulta, filtros])
}
