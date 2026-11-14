/**
 * Importação da lista de materiais (Excel), partilhada pelo script (scripts/importar-excel.mjs) e pela
 * aplicação (Ferramentas → Importar Excel). Não importar aqui nada que não seja tipos ou src/utils/planta.ts.
 *
 * - Linhas repetidas com o mesmo material e a mesma posição são somadas (quantidade e valor).
 * - Campos vindos do Excel (referência, nome, quantidade, valor, posição) são sempre substituídos.
 * - Campos acrescentados à mão (fotografias, notas, categoria, fabricante, stock mínimo, modelo 3D, UQE)
 *   são mantidos de importações anteriores (junção pela referência).
 * - Observações das fotografias mantêm-se, exceto nas estruturas que passam a ter materiais do Excel.
 */
import type { Layout, Localizacao, Peca, Uqe } from '../types'
import { criarLigador } from './planta.ts'

export interface LinhaExcel {
  /** Número da linha na folha (para o relatório). */
  n: number
  material: string
  texto: string
  posicao: string
  quantidade: number
  valor: number
}

export interface GrupoExcel {
  material: string
  texto: string
  posicao: string
  linhas: number[]
  qtds: number[]
  valor: number
}

const norm = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const arred = (n: number, casas: number) => Math.round(n * 10 ** casas) / 10 ** casas

/** Índices das colunas, reconhecidas pelo cabeçalho. Lança um erro legível se faltar alguma. */
export function detetarColunas(cabecalho: unknown[]) {
  const c = cabecalho.map(norm)
  const col = (...nomes: string[]) => {
    const i = c.findIndex((x) => nomes.some((n) => x === norm(n)))
    if (i < 0) throw new Error(`Coluna não encontrada: ${nomes.join(' / ')}`)
    return i
  }
  return {
    material: col('Material'),
    texto: col('Texto breve de material', 'Descrição'),
    posicao: col('Posição no depósito', 'Posição'),
    quantidade: col('Estoque total', 'Stock total', 'Quantidade'),
    valor: col('Valor de Stock', 'Valor'),
  }
}

/** Converte as linhas da folha (valores já simples) em LinhaExcel, ignorando linhas sem material. */
export function lerLinhas(linhas: { n: number; valores: unknown[] }[], C: ReturnType<typeof detetarColunas>): LinhaExcel[] {
  return linhas
    .map(({ n, valores: v }) => ({
      n,
      material: String(v[C.material] ?? '').trim(),
      texto: String(v[C.texto] ?? '').trim(),
      posicao: String(v[C.posicao] ?? '').trim().toUpperCase(),
      quantidade: Number(v[C.quantidade]) || 0,
      valor: Number(v[C.valor]) || 0,
    }))
    .filter((l) => l.material)
}

export function agrupar(linhas: LinhaExcel[]): GrupoExcel[] {
  const grupos = new Map<string, GrupoExcel>()
  for (const l of linhas) {
    const chave = `${l.material}|${l.posicao}`
    const g = grupos.get(chave) ?? { material: l.material, texto: l.texto, posicao: l.posicao, linhas: [], qtds: [], valor: 0 }
    g.linhas.push(l.n)
    g.qtds.push(l.quantidade)
    g.valor += l.valor
    grupos.set(chave, g)
  }
  return [...grupos.values()]
}

/**
 * UQE deduzida da designação: só quando diz explicitamente "UQE2300" ou "UQE3500" ("UQE2300/2400" conta
 * como 2300). Outras menções (2400, 2324, "3500 mm"…) ficam "nenhuma".
 */
export function uqeDaDesignacao(texto: string | null | undefined): Uqe | null {
  const m = String(texto ?? '').toUpperCase().match(/UQE[\s-]?(2300|3500)(?!\d)/g)
  if (!m) return null
  const valores = new Set(m.map((x) => x.slice(-4)))
  return valores.size === 1 ? ([...valores][0] as Uqe) : null
}

const CAMPOS_EXCEL = ['referencia', 'nome', 'quantidade', 'valorStock', 'posicaoOrigem', 'localizacaoId', 'caixa']

export interface ResultadoImportacao {
  pecas: Peca[]
  novos: Peca[]
  mantidas: Peca[]
  removidas: Peca[]
  /** Materiais que não ficaram ligados ao 3D, agrupados pelo motivo. */
  motivos: Map<string, GrupoExcel[]>
  linhasTotais: number
  agregados: number
}

export function construirPecas(
  grupos: GrupoExcel[],
  anteriores: Peca[],
  layout: Layout,
  localizacoes: Localizacao[],
  nomeFicheiro: string,
): ResultadoImportacao {
  const ligar = criarLigador(layout, localizacoes)
  const anterioresPorRef = new Map(anteriores.filter((p) => p.referencia).map((p) => [p.referencia as string, p]))
  const contagemMaterial = new Map<string, number>()
  for (const g of grupos) contagemMaterial.set(g.material, (contagemMaterial.get(g.material) ?? 0) + 1)
  const motivos = new Map<string, GrupoExcel[]>()
  const novos: Peca[] = []

  for (const g of grupos) {
    const prev = anterioresPorRef.get(g.material)
    const { loc, caixa = null, motivo } = ligar(g.posicao, g.material)
    if (motivo) motivos.set(motivo, [...(motivos.get(motivo) ?? []), g])
    const unico = contagemMaterial.get(g.material) === 1
    const uqeDeduzida = prev?.uqe ? null : uqeDaDesignacao(g.texto)
    novos.push({
      id: prev?.id ?? (unico ? `m-${g.material}` : `m-${g.material}-${g.posicao || 'sem-posicao'}`),
      referencia: g.material,
      nome: g.texto || null,
      descricao: prev?.fonte === 'excel' ? prev.descricao : null,
      categoria: prev?.categoria ?? null,
      quantidade: arred(g.qtds.reduce((a, b) => a + b, 0), 3),
      stockMinimo: prev?.stockMinimo ?? null,
      valorStock: arred(g.valor, 2),
      posicaoOrigem: g.posicao || null,
      localizacaoId: loc?.id ?? null,
      caixa,
      fotografias: prev?.fotografias ?? [],
      modelo3D: prev?.modelo3D ?? null,
      fabricante: prev?.fabricante ?? null,
      uqe: prev?.uqe ?? uqeDeduzida ?? 'nenhuma',
      notas: prev?.fonte === 'excel' ? prev.notas : '',
      estadoValidacao: 'confirmado',
      tipoRegisto: 'referencia',
      evidencia:
        `Excel "${nomeFicheiro}", linha${g.linhas.length > 1 ? 's' : ''} ${g.linhas.join(', ')}` +
        (g.linhas.length > 1 ? ` (${g.qtds.join(' + ')} somadas)` : ''),
      camposEstimados: [...(prev?.camposEstimados ?? []).filter((c) => !CAMPOS_EXCEL.includes(c)), ...(uqeDeduzida ? ['uqe'] : [])],
      fonte: 'excel',
    })
  }

  // observações das fotografias: manter só onde o Excel não trouxe materiais
  const locPorId = new Map(localizacoes.map((l) => [l.id, l]))
  const estruturasComExcel = new Set(novos.map((p) => locPorId.get(p.localizacaoId ?? '')?.estrutura).filter(Boolean))
  const refsExcel = new Set(novos.map((p) => p.referencia))
  const mantidas: Peca[] = []
  const removidas: Peca[] = []
  for (const p of anteriores) {
    if (p.fonte === 'excel' || (p.referencia && refsExcel.has(p.referencia))) continue
    const est = locPorId.get(p.localizacaoId ?? '')?.estrutura
    if (p.tipoRegisto === 'observacao' && est && estruturasComExcel.has(est)) removidas.push(p)
    else mantidas.push({ ...p, fonte: p.fonte ?? 'fotografia' })
  }

  novos.sort((a, b) => (a.referencia ?? '').localeCompare(b.referencia ?? '', 'pt', { numeric: true }))
  return {
    pecas: [...novos, ...mantidas],
    novos,
    mantidas,
    removidas,
    motivos,
    linhasTotais: grupos.reduce((n, g) => n + g.linhas.length, 0),
    agregados: grupos.filter((g) => g.linhas.length > 1).length,
  }
}

export interface Diferencas {
  novos: Peca[]
  removidos: Peca[]
  quantidade: { peca: Peca; antes: number | null }[]
  posicao: { peca: Peca; antes: string | null }[]
  nome: { peca: Peca; antes: string | null }[]
}

/** O que muda nos materiais do Excel entre os dados atuais e uma nova importação. */
export function compararPecas(antes: Peca[], depois: Peca[]): Diferencas {
  const doExcel = (ps: Peca[]) => new Map(ps.filter((p) => p.fonte === 'excel').map((p) => [p.id, p]))
  const a = doExcel(antes)
  const d = doExcel(depois)
  const r: Diferencas = { novos: [], removidos: [], quantidade: [], posicao: [], nome: [] }
  for (const [id, p] of d) {
    const x = a.get(id)
    if (!x) { r.novos.push(p); continue }
    if (x.quantidade !== p.quantidade) r.quantidade.push({ peca: p, antes: x.quantidade })
    if ((x.posicaoOrigem ?? null) !== (p.posicaoOrigem ?? null)) r.posicao.push({ peca: p, antes: x.posicaoOrigem ?? null })
    if (x.nome !== p.nome) r.nome.push({ peca: p, antes: x.nome })
  }
  for (const [id, p] of a) if (!d.has(id)) r.removidos.push(p)
  return r
}
