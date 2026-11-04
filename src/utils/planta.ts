/**
 * Regras da planta partilhadas pela aplicação e pelos scripts (scripts/*.mjs importam este ficheiro;
 * o Node corre TypeScript diretamente). Não importar aqui nada que não seja tipos.
 *
 * - `gerarLocalizacoes`: cria as localizações (células) a partir das estruturas do layout.
 * - `ligarPosicao`: liga uma posição do Excel (ex.: 1B08F02E) a uma localização.
 *
 * Código oficial: zona + corredor + prateleira (A = a mais baixa) + coluna (01, 02…), ex.: 1B10A02.
 * A caixa (último elemento, ex.: …C) é guardada na peça, não na localização.
 */
import type { Estrutura, EstruturaEstante, Layout, Localizacao } from '../types'

const pad = (n: number) => String(n).padStart(2, '0')
const letra = (n: number) => String.fromCharCode(65 + n)
const PRATELEIRAS = new Set(['estante-ligeira', 'armario'])

/** Campos que podem ser editados à mão em locations.json e que a geração mantém. */
const CAMPOS_MANUAIS = ['notas', 'estadoValidacao', 'posicao3D'] as const

/** Prefixo dos ids das células de uma estante de prateleiras (EL10 → EL-10). */
export function prefixoLocalizacao(e: Estrutura): string {
  return PRATELEIRAS.has(e.tipo) ? e.id.replace(/^EL/, 'EL-').replace(/^AR/, 'AR-') : e.id
}

export function gerarLocalizacoes(layout: Layout, existentes: Localizacao[] = []): Localizacao[] {
  const porId = new Map(existentes.map((l) => [l.id, l]))
  const geradas: Localizacao[] = []

  const add = (loc: Omit<Localizacao, 'estadoValidacao'>) => {
    const anterior = porId.get(loc.id)
    const manual: Partial<Localizacao> = {}
    if (anterior) for (const k of CAMPOS_MANUAIS) if (k in anterior) Object.assign(manual, { [k]: anterior[k] })
    geradas.push({ ...loc, estadoValidacao: 'estimado', ...manual })
  }

  for (const e of layout.estruturas) {
    const base = { zona: e.zona, estrutura: e.id }
    const corredor = e.corredor ?? null
    const col = (m: number) => (e.colunaInicial ?? 1) + m - 1
    const codigo = (m: number, n: number) => (corredor ? `${layout.codigoZona}${corredor}${letra(n)}${pad(col(m))}` : null)
    // corredor lido numa etiqueta → código parcialmente confirmado; deduzido → provisório
    const origemCodigo = corredor && !e.corredorInferido ? 'parcial' : 'provisorio'

    if (e.tipo === 'zona-chao') {
      // zona com número de corredor (ex.: rolos brancos = corredor 03): código parcial sem prateleira/coluna
      add({
        id: `${e.id}-01`, codigo: null, codigoParcial: corredor ? `${layout.codigoZona}${corredor}` : null, ...base,
        modulo: null, nivel: null, descricao: e.nome, origemCodigo: corredor ? origemCodigo : 'provisorio',
      })
    } else if (e.tipo === 'contentores') {
      const n = e.disposicao?.length ?? e.colunas * e.filas
      for (let i = 1; i <= n; i++) {
        const fila = Math.ceil(i / e.colunas)
        const c = ((i - 1) % e.colunas) + 1
        // com corredor, cada contentor é uma caixa da posição <zona><corredor>A01 (ex.: 1B13A01A)
        const caixa = letra(i - 1)
        add({
          id: `${e.id}-${pad(i)}`, codigo: corredor ? `${layout.codigoZona}${corredor}A01${caixa}` : null, ...base, modulo: i, nivel: null,
          descricao: corredor ? `${e.nome} · contentor ${caixa}` : `${e.nome} · fila ${fila === 1 ? 'da frente' : 'de trás'}, posição ${c}`,
          origemCodigo: corredor ? origemCodigo : 'provisorio',
        })
      }
    } else if (PRATELEIRAS.has(e.tipo)) {
      const pref = prefixoLocalizacao(e)
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
  return geradas
}

export interface Ligacao {
  loc?: Localizacao
  caixa?: string | null
  /** Porque não ficou ligada ao 3D. */
  motivo?: string
}

/** Liga uma posição do Excel a uma localização do modelo. */
export function ligarPosicao(pos: string | null | undefined, layout: Layout, localizacoes: Localizacao[]): Ligacao {
  return criarLigador(layout, localizacoes)(pos)
}

/** Versão para muitas posições seguidas: os índices são criados uma só vez. */
export function criarLigador(layout: Layout, localizacoes: Localizacao[]): (pos: string | null | undefined) => Ligacao {
  const zona = layout.codigoZona
  const porCodigo = new Map(localizacoes.filter((l) => l.codigo).map((l) => [l.codigo as string, l]))
  const estruturasDoCorredor = (corr: string) => layout.estruturas.filter((e) => e.corredor === corr)
  return (pos) => ligarCom(pos, zona, porCodigo, estruturasDoCorredor, localizacoes)
}

function ligarCom(
  pos: string | null | undefined,
  zona: string,
  porCodigo: Map<string, Localizacao>,
  estruturasDoCorredor: (corr: string) => Estrutura[],
  localizacoes: Localizacao[],
): Ligacao {
  if (!pos) return { motivo: 'Sem posição no Excel' }
  if (pos === 'ND') return { motivo: 'ND (posição não definida)' }
  if (/^(ESQ-)?ARM\d+/.test(pos)) return { motivo: 'Armários ARM01–ARM06 (ainda sem correspondência no modelo)' }

  let m = pos.match(/^(\d[A-Z])(\d{2})([A-Z])(\d{2})([A-Z])?$/)
  if (m) {
    const [, z, corr, prat, coluna, caixa = null] = m
    if (z !== zona) return { motivo: `Zona ${z} (não representada no 3D)` }
    const loc = porCodigo.get(pos) ?? porCodigo.get(`${z}${corr}${prat}${coluna}`)
    if (loc) return { loc, caixa: loc.codigo === pos ? null : caixa }
    if (estruturasDoCorredor(corr).length === 0) return { motivo: `Corredor ${z}${corr} (ainda não colocado no modelo 3D)` }
    return { motivo: `Prateleira/coluna fora das dimensões do corredor ${z}${corr} no modelo`, caixa }
  }
  m = pos.match(/^(\d[A-Z])(\d{2})([A-Z])?$/)
  if (m) {
    const [, z, corr, prat] = m
    if (z !== zona) return { motivo: `Zona ${z} (não representada no 3D)` }
    const estruturas = estruturasDoCorredor(corr)
    if (estruturas.length === 0) return { motivo: `Corredor ${z}${corr} (ainda não colocado no modelo 3D)` }
    for (const e of estruturas) {
      // zona de chão com número de corredor (ex.: rolos brancos, 1B03A): uma só localização
      if (e.tipo === 'zona-chao') {
        const loc = localizacoes.find((l) => l.estrutura === e.id)
        if (loc) return { loc, caixa: null }
      }
      // estrutura com uma só coluna: a coluna 01 está implícita
      if (prat && e.tipo !== 'contentores' && (e as EstruturaEstante).modulos === 1) {
        const loc = porCodigo.get(`${z}${corr}${prat}01`)
        if (loc) return { loc, caixa: null }
      }
    }
    return { motivo: `Posição incompleta (sem prateleira/coluna) no corredor ${z}${corr}` }
  }
  if (/^\d[A-Z]$/.test(pos)) return { motivo: pos === zona ? `Zona ${pos} sem posição detalhada` : `Zona ${pos} (não representada no 3D)` }
  if (pos === 'ESCRITORIO') return { motivo: 'ESCRITORIO (ainda sem correspondência no modelo)' }
  if (pos === 'M100') return { motivo: 'M100 (ainda sem correspondência no modelo)' }
  return { motivo: 'Formato de posição inválido (possível gralha no Excel)' }
}

/** Altura de cada prateleira, distribuídas por igual, para um tipo de estante. */
export function niveisPadrao(tipo: EstruturaEstante['tipo'], prateleiras: number, altura: number): number[] {
  const n = Math.max(1, Math.round(prateleiras))
  const r2 = (v: number) => Math.round(v * 100) / 100
  if (tipo === 'porta-paletes') {
    // A = chão; restantes por igual até ~0,8 m abaixo do topo
    const passo = n === 1 ? 0 : (altura - 0.8) / (n - 1)
    return Array.from({ length: n }, (_, k) => r2(k * passo))
  }
  const base = tipo === 'estante-vidros' ? 0.15 : 0.1
  const topo = altura - (tipo === 'estante-vidros' ? 1.05 : 0.2)
  if (n === 1) return [base]
  return Array.from({ length: n }, (_, k) => r2(base + (k * (topo - base)) / (n - 1)))
}
