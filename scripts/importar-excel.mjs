// Importa a lista de materiais (Excel) para src/data/parts.json e liga cada posição ao modelo 3D.
//
// Uso: node scripts/importar-excel.mjs "caminho/para/materiais armazem.xlsx"
//
// Colunas esperadas (reconhecidas pelo cabeçalho): Material, Texto breve de material,
// Posição no depósito, Estoque total, Valor de Stock.
//
// - Linhas repetidas com o mesmo material e a mesma posição são somadas (quantidade e valor).
// - Campos vindos do Excel (referência, nome, quantidade, valor, posição) são sempre substituídos.
// - Campos acrescentados à mão (fotografias, notas, categoria, fabricante, stock mínimo, modelo 3D)
//   são mantidos de importações anteriores (junção pela referência).
// - Observações feitas a partir das fotografias são mantidas, exceto nas estruturas que passam a
//   ter materiais do Excel (onde ficariam duplicadas).
// - Gera docs/relatorio-importacao.md com as posições que não foi possível ligar ao 3D.
// Corra antes `node scripts/gerar-localizacoes.mjs` se tiver alterado o layout.
import { readFileSync, writeFileSync } from 'node:fs'
import { basename } from 'node:path'
import ExcelJS from 'exceljs'

const ficheiro = process.argv[2]
if (!ficheiro) {
  console.error('Uso: node scripts/importar-excel.mjs "materiais armazem.xlsx"')
  process.exit(1)
}

const ler = (u) => JSON.parse(readFileSync(new URL(u, import.meta.url), 'utf8'))
const layout = ler('../src/data/layout.json')
const localizacoes = ler('../src/data/locations.json')
const anteriores = ler('../src/data/parts.json')

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const valor = (v) => (v && typeof v === 'object' ? (v.result ?? v.text ?? v.richText?.map((r) => r.text).join('')) : v)
const arred = (n, casas) => Math.round(n * 10 ** casas) / 10 ** casas

// ---------- ler o Excel ----------
const wb = new ExcelJS.Workbook()
await wb.xlsx.readFile(ficheiro)
const ws = wb.worksheets[0]
const cabecalho = ws.getRow(1).values.map((v) => norm(valor(v)))
const col = (...nomes) => {
  const i = cabecalho.findIndex((c) => nomes.some((n) => c === norm(n)))
  if (i < 0) throw new Error(`Coluna não encontrada: ${nomes.join(' / ')}`)
  return i
}
const C = {
  material: col('Material'),
  texto: col('Texto breve de material', 'Descrição'),
  posicao: col('Posição no depósito', 'Posição'),
  quantidade: col('Estoque total', 'Stock total', 'Quantidade'),
  valor: col('Valor de Stock', 'Valor'),
}

const grupos = new Map() // material|posição → linhas agregadas
ws.eachRow((row, n) => {
  if (n === 1) return
  const v = row.values.map(valor)
  const material = String(v[C.material] ?? '').trim()
  if (!material) return
  const posicao = String(v[C.posicao] ?? '').trim().toUpperCase()
  const chave = `${material}|${posicao}`
  const g = grupos.get(chave) ?? { material, texto: String(v[C.texto] ?? '').trim(), posicao, linhas: [], qtds: [], valor: 0 }
  g.linhas.push(n)
  g.qtds.push(Number(v[C.quantidade]) || 0)
  g.valor += Number(v[C.valor]) || 0
  grupos.set(chave, g)
})

// ---------- ligar posições ao modelo 3D ----------
const porCodigo = new Map(localizacoes.filter((l) => l.codigo).map((l) => [l.codigo, l]))
const estruturaPorCorredor = new Map(layout.estruturas.filter((e) => e.corredor).map((e) => [e.corredor, e]))
const zona = layout.codigoZona

/** Devolve { loc, caixa, motivo } — motivo explica porque não ficou ligada ao 3D. */
function ligar(pos) {
  if (!pos) return { motivo: 'Sem posição no Excel' }
  if (pos === 'ND') return { motivo: 'ND (posição não definida)' }
  if (/^(ESQ-)?ARM\d+/.test(pos)) return { motivo: 'Armários ARM01–ARM06 (ainda sem correspondência no modelo)' }
  let m = pos.match(/^(\d[A-Z])(\d{2})([A-Z])(\d{2})([A-Z])?$/)
  if (m) {
    const [, z, corr, prat, coluna, caixa = null] = m
    if (z !== zona) return { motivo: `Zona ${z} (não representada no 3D)` }
    const loc = porCodigo.get(pos) ?? porCodigo.get(`${z}${corr}${prat}${coluna}`)
    if (loc) return { loc, caixa: loc.codigo === pos ? null : caixa }
    if (!estruturaPorCorredor.has(corr)) return { motivo: `Corredor ${z}${corr} (ainda não colocado no modelo 3D)` }
    return { motivo: `Prateleira/coluna fora das dimensões do corredor ${z}${corr} no modelo`, caixa }
  }
  m = pos.match(/^(\d[A-Z])(\d{2})([A-Z])?$/)
  if (m) {
    const [, z, corr, prat] = m
    if (z !== zona) return { motivo: `Zona ${z} (não representada no 3D)` }
    const e = estruturaPorCorredor.get(corr)
    if (!e) return { motivo: `Corredor ${z}${corr} (ainda não colocado no modelo 3D)` }
    // estrutura com uma só coluna: a coluna 01 está implícita
    if (prat && e.modulos === 1) {
      const loc = porCodigo.get(`${z}${corr}${prat}01`)
      if (loc) return { loc, caixa: null }
    }
    return { motivo: `Posição incompleta (sem prateleira/coluna) no corredor ${z}${corr}` }
  }
  if (/^\d[A-Z]$/.test(pos)) return { motivo: pos === zona ? `Zona ${pos} sem posição detalhada` : `Zona ${pos} (não representada no 3D)` }
  if (pos === 'ESCRITORIO') return { motivo: 'ESCRITORIO (ainda sem correspondência no modelo)' }
  if (pos === 'M100') return { motivo: 'M100 (ainda sem correspondência no modelo)' }
  return { motivo: 'Formato de posição inválido (possível gralha no Excel)' }
}

// ---------- construir os registos ----------
const anterioresPorRef = new Map(anteriores.filter((p) => p.referencia).map((p) => [p.referencia, p]))
const CAMPOS_EXCEL = ['referencia', 'nome', 'quantidade', 'valorStock', 'posicaoOrigem', 'localizacaoId', 'caixa']
const motivos = new Map()
const novos = []
const contagemMaterial = new Map()
for (const g of grupos.values()) contagemMaterial.set(g.material, (contagemMaterial.get(g.material) ?? 0) + 1)

for (const g of grupos.values()) {
  const prev = anterioresPorRef.get(g.material)
  const { loc, caixa = null, motivo } = ligar(g.posicao)
  if (motivo) {
    const lista = motivos.get(motivo) ?? []
    lista.push(g)
    motivos.set(motivo, lista)
  }
  const unico = contagemMaterial.get(g.material) === 1
  const quantidade = arred(g.qtds.reduce((a, b) => a + b, 0), 3)
  novos.push({
    id: prev?.id ?? (unico ? `m-${g.material}` : `m-${g.material}-${g.posicao || 'sem-posicao'}`),
    referencia: g.material,
    nome: g.texto || null,
    descricao: prev?.fonte === 'excel' ? prev.descricao : null,
    categoria: prev?.categoria ?? null,
    quantidade,
    stockMinimo: prev?.stockMinimo ?? null,
    valorStock: arred(g.valor, 2),
    posicaoOrigem: g.posicao || null,
    localizacaoId: loc?.id ?? null,
    caixa,
    fotografias: prev?.fotografias ?? [],
    modelo3D: prev?.modelo3D ?? null,
    fabricante: prev?.fabricante ?? null,
    notas: prev?.fonte === 'excel' ? prev.notas : '',
    estadoValidacao: 'confirmado',
    tipoRegisto: 'referencia',
    evidencia:
      `Excel "${basename(ficheiro)}", linha${g.linhas.length > 1 ? 's' : ''} ${g.linhas.join(', ')}` +
      (g.linhas.length > 1 ? ` (${g.qtds.join(' + ')} somadas)` : ''),
    camposEstimados: (prev?.camposEstimados ?? []).filter((c) => !CAMPOS_EXCEL.includes(c)),
    fonte: 'excel',
  })
}

// observações das fotografias: manter só onde o Excel não trouxe materiais
const locPorId = new Map(localizacoes.map((l) => [l.id, l]))
const estruturasComExcel = new Set(novos.map((p) => locPorId.get(p.localizacaoId)?.estrutura).filter(Boolean))
const refsExcel = new Set(novos.map((p) => p.referencia))
const mantidas = []
const removidas = []
for (const p of anteriores) {
  if (p.fonte === 'excel' || (p.referencia && refsExcel.has(p.referencia))) continue
  const est = locPorId.get(p.localizacaoId)?.estrutura
  if (p.tipoRegisto === 'observacao' && est && estruturasComExcel.has(est)) removidas.push(p)
  else mantidas.push({ ...p, fonte: p.fonte ?? 'fotografia' })
}

const resultado = [...novos.sort((a, b) => a.referencia.localeCompare(b.referencia, 'pt', { numeric: true })), ...mantidas]
writeFileSync(new URL('../src/data/parts.json', import.meta.url), JSON.stringify(resultado, null, 2) + '\n')

// ---------- relatório ----------
const ligadas = novos.filter((p) => p.localizacaoId).length
const linhasTotais = [...grupos.values()].reduce((n, g) => n + g.linhas.length, 0)
const agregados = [...grupos.values()].filter((g) => g.linhas.length > 1).length
let md = `# Relatório de importação do Excel

Ficheiro: \`${basename(ficheiro)}\` · gerado por \`scripts/importar-excel.mjs\` em ${new Date().toISOString().slice(0, 10)}.

| | |
|---|---|
| Linhas lidas | ${linhasTotais} |
| Materiais importados | ${novos.length} |
| Linhas repetidas (mesmo material e posição) somadas | ${agregados} |
| Ligados a uma posição do modelo 3D | ${ligadas} |
| Sem ligação ao 3D (ver abaixo) | ${novos.length - ligadas} |
| Observações das fotografias mantidas | ${mantidas.filter((p) => p.tipoRegisto === 'observacao').length} |
| Observações substituídas por materiais do Excel | ${removidas.length} (${removidas.map((p) => p.nome).join('; ') || '—'}) |

## Materiais sem ligação ao 3D, por motivo

| Motivo | Materiais |
|---|---|
${[...motivos.entries()].sort((a, b) => b[1].length - a[1].length).map(([m, l]) => `| ${m} | ${l.length} |`).join('\n')}

Estes materiais aparecem na listagem e na pesquisa com a posição do Excel; só não podem ser destacados no 3D.
`
const gralhas = motivos.get('Formato de posição inválido (possível gralha no Excel)') ?? []
const semPosicao = motivos.get('Sem posição no Excel') ?? []
if (gralhas.length || semPosicao.length) {
  md += `\n## Posições a corrigir no Excel\n\n| Material | Descrição | Posição no Excel |\n|---|---|---|\n`
  md += [...gralhas, ...semPosicao].map((g) => `| ${g.material} | ${g.texto} | \`${g.posicao || '(vazio)'}\` |`).join('\n') + '\n'
}
const fora = [...motivos.entries()].filter(([m]) => m.startsWith('Prateleira/coluna fora'))
if (fora.length) {
  md += `\n## Posições além das dimensões do modelo\n\n`
  for (const [m, l] of fora) md += `- ${m}: ${l.map((g) => `\`${g.posicao}\``).join(', ')}\n`
}
const corredores = [...motivos.entries()].filter(([m]) => m.startsWith('Corredor '))
if (corredores.length) {
  md += `\n## Corredores ainda não colocados no modelo (exemplos de materiais)\n\n`
  for (const [m, l] of corredores) md += `- **${m.split(' ')[1]}** (${l.length}): ${l.slice(0, 4).map((g) => g.texto).join('; ')}\n`
}
writeFileSync(new URL('../docs/relatorio-importacao.md', import.meta.url), md)

console.log(`${novos.length} materiais importados (${ligadas} ligados ao 3D), ${mantidas.length} registos anteriores mantidos, ${removidas.length} observações substituídas.`)
console.log('Relatório: docs/relatorio-importacao.md')
