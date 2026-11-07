import { describe, expect, it } from 'vitest'
import type { Composicao, Peca } from '../../types'
import { aplicarFolhaComposicao, criaCiclo, descendentes, disponibilidade, indexar, lerCsv, linhasComposicao, raizes, raizesDe } from '../composicao'

const peca = (referencia: string, quantidade: number | null): Peca => ({
  id: `m-${referencia}`, referencia, nome: referencia, descricao: null, categoria: null, quantidade, stockMinimo: null,
  localizacaoId: null, caixa: null, fotografias: [], modelo3D: null, fabricante: null, notas: '', estadoValidacao: 'confirmado',
  tipoRegisto: 'referencia', evidencia: null, camposEstimados: [],
})

const pecas = [peca('GCP12', 1), peca('ORING', 100), peca('KIT', 3), peca('PARAFUSO', null)]
const comp: Composicao = {
  grupos: [{ id: 'G-001', tipo: 'equipamento', nome: 'Compressor', uqe: 'nenhuma' }],
  ligacoes: [
    { pai: 'G-001', filho: 'GCP12', quantidade: 1 },
    { pai: 'GCP12', filho: 'ORING', quantidade: 2 },
    { pai: 'GCP12', filho: 'KIT', quantidade: 1 },
    { pai: 'KIT', filho: 'PARAFUSO', quantidade: null },
  ],
}
const idx = indexar(comp, pecas)

describe('árvore', () => {
  it('raízes e descendentes', () => {
    expect(raizes(idx)).toEqual(['G-001'])
    expect(raizesDe('PARAFUSO', idx)).toEqual(['G-001'])
    expect([...descendentes('GCP12', idx)].sort()).toEqual(['GCP12', 'KIT', 'ORING', 'PARAFUSO'])
  })

  it('recusa ligações circulares', () => {
    expect(criaCiclo('PARAFUSO', 'GCP12', idx)).toBe(true)
    expect(criaCiclo('GCP12', 'GCP12', idx)).toBe(true)
    expect(criaCiclo('G-001', 'PARAFUSO', idx)).toBe(false)
  })
})

describe('disponibilidade', () => {
  it('multiplica as quantidades pelo caminho e compara com o stock', () => {
    const d = disponibilidade('G-001', idx, 60)
    expect(d.get('ORING')).toMatchObject({ necessario: 120, stock: 100, estado: 'falta' })
    expect(d.get('KIT')).toMatchObject({ necessario: 60, estado: 'falta' })
    expect(d.get('PARAFUSO')).toMatchObject({ incerto: true, estado: 'sem-dados' })
    expect(disponibilidade('G-001', idx, 1).get('ORING')?.estado).toBe('ok')
  })
})

describe('folha do organograma', () => {
  it('lê CSV com ";" e aspas', () => {
    expect(lerCsv('a;b\n"x;y";2')).toEqual([['a', 'b'], ['x;y', '2']])
  })

  it('cria grupos novos, atualiza quantidades e recusa referências desconhecidas', () => {
    const linhas = linhasComposicao(lerCsv('Pai;Filho;Quantidade;Tipo do pai\nNovo conjunto;ORING;;conjunto\nGCP12;ORING;4;\nGCP12;XXXX;1;'))
    const r = aplicarFolhaComposicao(comp, linhas, pecas)
    expect(r.gruposNovos).toEqual(['Novo conjunto'])
    expect(r.composicao.grupos.find((g) => g.nome === 'Novo conjunto')?.tipo).toBe('conjunto')
    expect(r.novas).toBe(1)
    expect(r.atualizadas).toBe(1)
    expect(r.composicao.ligacoes.find((l) => l.pai === 'GCP12' && l.filho === 'ORING')?.quantidade).toBe(4)
    expect(r.erros).toHaveLength(1)
  })

  it('exige as colunas Pai e Filho', () => {
    expect(() => linhasComposicao([['A', 'B']])).toThrow(/Pai/)
  })
})
