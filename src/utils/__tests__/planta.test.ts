import { describe, expect, it } from 'vitest'
import layoutJson from '../../data/layout.json'
import type { Layout } from '../../types'
import { criarLigador, gerarLocalizacoes, niveisPadrao, zonasDoModelo } from '../planta'

const layout = layoutJson as unknown as Layout
const locs = gerarLocalizacoes(layout)
const ligar = criarLigador(layout, locs)
const porCodigo = (c: string) => locs.find((l) => l.codigo === c)

describe('gerarLocalizacoes', () => {
  it('gera códigos zona + corredor + prateleira (A = a mais baixa) + coluna', () => {
    const l = porCodigo('1B09A02')
    expect(l?.estrutura).toBe('EL09')
    expect(l?.nivel).toBe(0)
    expect(l?.modulo).toBe(2)
  })

  it('não repete códigos', () => {
    const codigos = locs.map((l) => l.codigo).filter(Boolean)
    expect(new Set(codigos).size).toBe(codigos.length)
  })

  it('os armários do corredor 04 continuam a numeração (colunas 04 e 05)', () => {
    const l = porCodigo('1B04F04')
    expect(l?.estrutura).toBe('AR04')
    expect(l?.modulo).toBe(1)
    expect(l?.coluna).toBe(4)
  })

  it('o armário ARM tem prateleiras ARM01–ARM06 (ARM01 em baixo)', () => {
    expect(porCodigo('ARM01')?.nivel).toBe(0)
    expect(porCodigo('ARM06')?.nivel).toBe(5)
  })

  it('cada contentor é uma caixa da posição A01', () => {
    expect(porCodigo('1B14A01D')?.estrutura).toBe('CG14')
  })

  it('a zona 1C tem os seus próprios códigos (1C01A01…), sem repetir os da 1B', () => {
    expect(porCodigo('1C01H04')?.estrutura).toBe('1C01')
    expect(porCodigo('1C04I03')?.estrutura).toBe('1C04')
    expect(porCodigo('1B04A01')?.estrutura).toBe('EL04')
    expect([...zonasDoModelo(layout)].sort()).toEqual(['1B', '1C'])
  })

  it('mantém os campos editados à mão', () => {
    const [primeira] = locs
    const comNota = gerarLocalizacoes(layout, [{ ...primeira, notas: 'nota manual' }])
    expect(comNota[0].notas).toBe('nota manual')
  })
})

describe('ligarPosicao', () => {
  it('liga posição completa e separa a caixa', () => {
    const r = ligar('1B09A02C')
    expect(r.loc?.codigo).toBe('1B09A02')
    expect(r.caixa).toBe('C')
  })

  it('zona de chão com corredor (rolos brancos 1B03A)', () => {
    expect(ligar('1B03A').loc?.estrutura).toBe('ZR')
  })

  it('estrutura de uma só coluna: a coluna 01 está implícita (1B02C)', () => {
    expect(ligar('1B02C').loc?.codigo).toBe('1B02C01')
  })

  it('prateleiras numeradas do armário (ARM03C)', () => {
    const r = ligar('ARM03C')
    expect(r.loc?.codigo).toBe('ARM03')
    expect(r.caixa).toBe('C')
  })

  it('liga posições da zona 1C', () => {
    const r = ligar('1C05B02A')
    expect(r.loc?.codigo).toBe('1C05B02')
    expect(r.caixa).toBe('A')
    expect(ligar('1C08A01A').motivo).toMatch(/Corredor 1C08/)
  })

  it('explica porque não liga', () => {
    expect(ligar('M100').motivo).toMatch(/M100/)
    expect(ligar('1D05B02A').motivo).toMatch(/Zona 1D/)
    expect(ligar('IB07D03J').motivo).toMatch(/gralha/)
    expect(ligar('').motivo).toBe('Sem posição no Excel')
    expect(ligar('1B09Z02').motivo).toMatch(/fora das dimensões/)
  })
})

describe('niveisPadrao', () => {
  it('porta-paletes começa no chão; estantes ligeiras a 10 cm', () => {
    expect(niveisPadrao('porta-paletes', 4, 3.8)[0]).toBe(0)
    expect(niveisPadrao('estante-ligeira', 5, 2.5)[0]).toBe(0.1)
    expect(niveisPadrao('estante-ligeira', 5, 2.5)).toHaveLength(5)
  })
})
