import type { EstadoStock, Peca } from '../types'

/**
 * Estado de stock de uma peça.
 * - Sem quantidade, ou quantidade apenas estimada → por confirmar.
 * - Zero → sem stock.
 * - "Baixo" só existe quando há um stock mínimo configurado.
 */
export function estadoStock(p: Pick<Peca, 'quantidade' | 'stockMinimo' | 'camposEstimados'>): EstadoStock {
  if (p.quantidade === null || p.camposEstimados.includes('quantidade')) return 'por_confirmar'
  if (p.quantidade === 0) return 'sem_stock'
  if (p.stockMinimo !== null && p.quantidade <= p.stockMinimo) return 'baixo'
  return 'disponivel'
}

const PRIORIDADE: EstadoStock[] = ['sem_stock', 'baixo', 'por_confirmar', 'disponivel']

/** Estado agregado de uma localização: o mais crítico das peças lá registadas. */
export function estadoAgregado(pecas: Peca[]): EstadoStock | null {
  if (pecas.length === 0) return null
  const estados = new Set(pecas.map(estadoStock))
  return PRIORIDADE.find((e) => estados.has(e)) ?? 'por_confirmar'
}

export const ROTULO_ESTADO: Record<EstadoStock, string> = {
  disponivel: 'Disponível',
  baixo: 'Stock baixo',
  sem_stock: 'Sem stock',
  por_confirmar: 'Por confirmar',
}

export const COR_ESTADO: Record<EstadoStock, string> = {
  disponivel: '#36B37E',
  baixo: '#F0A43A',
  sem_stock: '#D52B3F',
  por_confirmar: '#8C9AAB',
}
