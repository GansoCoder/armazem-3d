// Gera/atualiza src/data/locations.json a partir das estruturas definidas em src/data/layout.json.
//
// - Os campos derivados do layout (código oficial, estrutura, módulo, nível, descrição) são sempre recalculados.
// - Os campos editados à mão (notas, estadoValidacao, posicao3D) são mantidos (junção pelo id).
// - Avisa se uma localização deixar de existir mas ainda for usada por peças.
//
// Código oficial: zona + corredor + prateleira (A = a mais baixa) + coluna (01, 02…), ex.: 1B10A02.
// A caixa (último elemento, ex.: …C) é guardada na peça, não na localização.
//
// Uso: node scripts/gerar-localizacoes.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const LAYOUT = new URL('../src/data/layout.json', import.meta.url)
const SAIDA = new URL('../src/data/locations.json', import.meta.url)
const PECAS = new URL('../src/data/parts.json', import.meta.url)

const layout = JSON.parse(readFileSync(LAYOUT, 'utf8'))
const existentes = existsSync(SAIDA) ? JSON.parse(readFileSync(SAIDA, 'utf8')) : []
const porId = new Map(existentes.map((l) => [l.id, l]))

const pad = (n) => String(n).padStart(2, '0')
const letra = (n) => String.fromCharCode(65 + n)
const PRATELEIRAS = new Set(['estante-ligeira', 'armario'])
const geradas = []

function add(loc) {
  const anterior = porId.get(loc.id)
  const manual = anterior
    ? Object.fromEntries(['notas', 'estadoValidacao', 'posicao3D'].filter((k) => k in anterior).map((k) => [k, anterior[k]]))
    : {}
  geradas.push({ ...loc, estadoValidacao: 'estimado', ...manual })
}

for (const e of layout.estruturas) {
  const base = { zona: e.zona, estrutura: e.id }
  const corredor = e.corredor ?? null
  // número oficial da coluna: os armários do corredor 04, por exemplo, começam na coluna 04
  const col = (m) => (e.colunaInicial ?? 1) + m - 1
  const codigo = (m, n) => (corredor ? `${layout.codigoZona}${corredor}${letra(n)}${pad(col(m))}` : null)
  // corredor lido numa etiqueta → código parcialmente confirmado; deduzido → provisório
  const origemCodigo = corredor && !e.corredorInferido ? 'parcial' : 'provisorio'

  if (e.tipo === 'zona-chao') {
    // zona com número de corredor (ex.: rolos brancos = corredor 03): código parcial sem prateleira/coluna
    add({
      id: `${e.id}-01`, codigo: null, codigoParcial: corredor ? `${layout.codigoZona}${corredor}` : null, ...base,
      modulo: null, nivel: null, descricao: e.nome, origemCodigo: corredor ? origemCodigo : 'provisorio',
    })
  } else if (e.tipo === 'contentores') {
    for (let i = 1; i <= e.colunas * e.filas; i++) {
      const fila = Math.ceil(i / e.colunas)
      const col = ((i - 1) % e.colunas) + 1
      // com corredor, cada contentor é uma caixa da posição <zona><corredor>A01 (ex.: 1B13A01A)
      const caixa = letra(i - 1)
      add({
        id: `${e.id}-${pad(i)}`, codigo: corredor ? `${layout.codigoZona}${corredor}A01${caixa}` : null, ...base, modulo: i, nivel: null,
        descricao: corredor
          ? `${e.nome} · contentor ${caixa}`
          : `${e.nome} · fila ${fila === 1 ? 'da frente' : 'de trás'}, posição ${col}`,
        origemCodigo: corredor ? origemCodigo : 'provisorio',
      })
    }
  } else if (PRATELEIRAS.has(e.tipo)) {
    const pref = e.id.replace(/^EL/, 'EL-').replace(/^AR/, 'AR-')
    for (let m = 1; m <= e.modulos; m++) {
      // coluna inteira: usada quando a prateleira de uma peça ainda não é conhecida
      add({
        id: `${pref}-M${m}`, codigo: null, ...base, modulo: m, coluna: col(m), nivel: null,
        codigoParcial: corredor ? `${layout.codigoZona}${corredor}?${pad(col(m))}` : null,
        descricao: `${e.nome} · Coluna ${pad(col(m))} · prateleira por confirmar`,
        origemCodigo,
      })
      for (let n = 0; n < e.niveis.length; n++) {
        add({
          id: `${pref}-M${m}-N${n}`, codigo: codigo(m, n), ...base, modulo: m, coluna: col(m), nivel: n,
          descricao: `${e.nome} · Prateleira ${letra(n)} · Coluna ${pad(col(m))}`,
          origemCodigo,
        })
      }
    }
  } else {
    for (let m = 1; m <= e.modulos; m++) {
      for (let n = 0; n < e.niveis.length; n++) {
        const nomeNivel = e.nomesNiveis?.[n] ?? `Nível ${n}`
        add({
          id: `${e.id}-M${m}-N${n}`, codigo: codigo(m, n), ...base, modulo: m, ...(corredor ? { coluna: col(m) } : {}), nivel: n,
          descricao: corredor ? `${e.nome} · Prateleira ${letra(n)} · Coluna ${pad(col(m))}` : `${e.nome} · Módulo ${m} · ${nomeNivel}`,
          origemCodigo,
        })
      }
    }
  }
}

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
