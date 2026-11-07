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
import { agrupar, construirPecas, detetarColunas, lerLinhas } from '../src/utils/importacao.ts'

const ficheiro = process.argv[2]
if (!ficheiro) {
  console.error('Uso: node scripts/importar-excel.mjs "materiais armazem.xlsx"')
  process.exit(1)
}

const ler = (u) => JSON.parse(readFileSync(new URL(u, import.meta.url), 'utf8'))
const layout = ler('../src/data/layout.json')
const localizacoes = ler('../src/data/locations.json')
const anteriores = ler('../src/data/parts.json')

const valor = (v) => (v && typeof v === 'object' ? (v.result ?? v.text ?? v.richText?.map((r) => r.text).join('')) : v)

// ---------- ler o Excel (as regras de importação estão em src/utils/importacao.ts) ----------
const wb = new ExcelJS.Workbook()
await wb.xlsx.readFile(ficheiro)
const ws = wb.worksheets[0]
const C = detetarColunas(ws.getRow(1).values.map(valor))
const brutas = []
ws.eachRow((row, n) => { if (n > 1) brutas.push({ n, valores: row.values.map(valor) }) })
const grupos = agrupar(lerLinhas(brutas, C))
const { pecas: resultado, novos, mantidas, removidas, motivos, linhasTotais, agregados } =
  construirPecas(grupos, anteriores, layout, localizacoes, basename(ficheiro))

writeFileSync(new URL('../src/data/parts.json', import.meta.url), JSON.stringify(resultado, null, 2) + '\n')

// ---------- relatório ----------
const ligadas = novos.filter((p) => p.localizacaoId).length
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
