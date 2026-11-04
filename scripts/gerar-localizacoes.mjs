// Gera/atualiza src/data/locations.json a partir das estruturas definidas em src/data/layout.json.
//
// - As regras estão em src/utils/planta.ts (as mesmas que o editor da planta usa no navegador).
// - Os campos derivados do layout (código oficial, estrutura, módulo, nível, descrição) são sempre recalculados.
// - Os campos editados à mão (notas, estadoValidacao, posicao3D) são mantidos (junção pelo id).
// - Avisa se uma localização deixar de existir mas ainda for usada por peças.
//
// Uso: node scripts/gerar-localizacoes.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { gerarLocalizacoes } from '../src/utils/planta.ts'

const LAYOUT = new URL('../src/data/layout.json', import.meta.url)
const SAIDA = new URL('../src/data/locations.json', import.meta.url)
const PECAS = new URL('../src/data/parts.json', import.meta.url)

const layout = JSON.parse(readFileSync(LAYOUT, 'utf8'))
const existentes = existsSync(SAIDA) ? JSON.parse(readFileSync(SAIDA, 'utf8')) : []
const geradas = gerarLocalizacoes(layout, existentes)

const novos = new Set(geradas.map((l) => l.id))
const pecas = existsSync(PECAS) ? JSON.parse(readFileSync(PECAS, 'utf8')) : []
for (const p of pecas) {
  if (p.localizacaoId && !novos.has(p.localizacaoId)) {
    console.warn(`AVISO: a peça ${p.id} usa a localização ${p.localizacaoId}, que deixou de existir.`)
  }
}

writeFileSync(SAIDA, JSON.stringify(geradas, null, 2) + '\n')
const comCodigo = geradas.filter((l) => l.codigo).length
console.log(`${geradas.length} localizações escritas (${comCodigo} com código oficial).`)
