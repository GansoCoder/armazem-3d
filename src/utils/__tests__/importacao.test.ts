import { describe, expect, it } from 'vitest'
import layoutJson from '../../data/layout.json'
import type { Layout, Localizacao, Peca } from '../../types'
import { agrupar, compararPecas, construirPecas, detetarColunas, lerLinhas, uqeDaDesignacao } from '../importacao'
import { interpretarCodigo } from '../ligacoes'
import { gerarLocalizacoes } from '../planta'

const layout = layoutJson as unknown as Layout
const locs: Localizacao[] = gerarLocalizacoes(layout)
const cab = [undefined, 'Material', 'Texto breve de material', 'Posição no depósito', 'Estoque total', 'Valor de Stock']

describe('importação do Excel', () => {
  it('reconhece as colunas pelo cabeçalho e recusa ficheiros sem elas', () => {
    expect(detetarColunas(cab)).toEqual({ material: 1, texto: 2, posicao: 3, quantidade: 4, valor: 5 })
    expect(() => detetarColunas(['Outra coisa'])).toThrow(/Material/)
  })

  it('soma linhas repetidas com o mesmo material e posição', () => {
    const C = detetarColunas(cab)
    const linhas = lerLinhas([
      { n: 2, valores: [undefined, 'A1', 'Peça A', '1b09a02c', 2, 10] },
      { n: 3, valores: [undefined, 'A1', 'Peça A', '1B09A02C', 3, 15] },
      { n: 4, valores: [undefined, '', 'sem material', '', 1, 1] },
    ], C)
    const g = agrupar(linhas)
    expect(g).toHaveLength(1)
    expect(g[0]).toMatchObject({ posicao: '1B09A02C', qtds: [2, 3], valor: 25 })
  })

  it('constrói as peças, liga ao 3D e mantém os campos acrescentados à mão', () => {
    const anterior = { id: 'm-A1', referencia: 'A1', categoria: 'Freio', uqe: '3500', fotografias: [{ src: '/x.jpg', tipo: 'peca' }], camposEstimados: [] } as unknown as Peca
    const r = construirPecas([{ material: 'A1', texto: 'Peça A UQE2300', posicao: '1B09A02C', linhas: [2, 3], qtds: [2, 3], valor: 25 }], [anterior], layout, locs, 't.xlsx')
    const p = r.pecas[0]
    expect(p).toMatchObject({ quantidade: 5, caixa: 'C', categoria: 'Freio', uqe: '3500', fonte: 'excel' })
    expect(locs.find((l) => l.id === p.localizacaoId)?.codigo).toBe('1B09A02')
    expect(p.fotografias).toHaveLength(1)
  })

  it('deduz a UQE só quando a designação a indica explicitamente', () => {
    expect(uqeDaDesignacao('Guarda lamas UQE2300/2400')).toBe('2300')
    expect(uqeDaDesignacao('Relé UQE3500')).toBe('3500')
    expect(uqeDaDesignacao('Perfilado (fracções 3500 mm)')).toBeNull()
    expect(uqeDaDesignacao('UQE2300 e UQE3500')).toBeNull()
  })

  it('compara materiais novos, removidos e quantidades', () => {
    const a = [{ id: '1', fonte: 'excel', quantidade: 1, posicaoOrigem: 'X', nome: 'n' }, { id: '2', fonte: 'excel', quantidade: 1, nome: 'n' }] as Peca[]
    const d = [{ id: '1', fonte: 'excel', quantidade: 9, posicaoOrigem: 'X', nome: 'n' }, { id: '3', fonte: 'excel', quantidade: 1, nome: 'n' }] as Peca[]
    const r = compararPecas(a, d)
    expect(r.novos.map((p) => p.id)).toEqual(['3'])
    expect(r.removidos.map((p) => p.id)).toEqual(['2'])
    expect(r.quantidade[0]).toMatchObject({ antes: 1 })
  })
})

describe('códigos lidos (QR, código de barras, texto)', () => {
  const pecas = [{ id: 'm-42173490', referencia: '42173490' }] as Peca[]
  it('ligação de etiqueta, referência e código de posição com caixa', () => {
    expect(interpretarCodigo('http://192.168.1.20:5173/?loc=1B09A02', pecas, locs)).toMatchObject({ tipo: 'localizacao' })
    expect(interpretarCodigo('42173490', pecas, locs)).toEqual({ tipo: 'peca', id: 'm-42173490' })
    const r = interpretarCodigo('1b09a02c', pecas, locs)
    expect(r.tipo === 'localizacao' && locs.find((l) => l.id === r.id)?.codigo).toBe('1B09A02')
    expect(interpretarCodigo('qualquer coisa', pecas, locs)).toEqual({ tipo: 'pesquisa', texto: 'qualquer coisa' })
  })
})
