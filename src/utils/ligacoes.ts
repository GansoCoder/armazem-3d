import type { Localizacao, Peca } from '../types'
import { normalizar } from './texto'

/**
 * Ligações diretas e códigos lidos (QR das etiquetas, códigos de barras, texto escrito).
 *
 * Formato das ligações: <endereço>?loc=1B09A02  ou  <endereço>?peca=42173490
 */

const CHAVE_ENDERECO = 'armazem3d.enderecoBase'

/** Endereço usado nos QR (por omissão, o atual). Num telemóvel tem de ser o IP do computador, não "localhost". */
export function enderecoBase(): string {
  try {
    const guardado = localStorage.getItem(CHAVE_ENDERECO)
    if (guardado) return guardado
  } catch {
    /* sem armazenamento */
  }
  return `${window.location.origin}${window.location.pathname}`
}

export function definirEnderecoBase(v: string) {
  try {
    if (v.trim()) localStorage.setItem(CHAVE_ENDERECO, v.trim())
    else localStorage.removeItem(CHAVE_ENDERECO)
  } catch {
    /* opcional */
  }
}

export function urlLocalizacao(loc: Pick<Localizacao, 'id' | 'codigo'>, base = enderecoBase()): string {
  return `${base}?loc=${encodeURIComponent(loc.codigo ?? loc.id)}`
}

export function urlPeca(p: Pick<Peca, 'id' | 'referencia'>, base = enderecoBase()): string {
  return p.referencia ? `${base}?peca=${encodeURIComponent(p.referencia)}` : `${base}?pecaId=${encodeURIComponent(p.id)}`
}

export type Destino =
  | { tipo: 'localizacao'; id: string }
  | { tipo: 'peca'; id: string }
  | { tipo: 'pesquisa'; texto: string }

/** Encontra uma localização pelo código oficial (1B09A02), código parcial (1B03) ou id interno. */
export function encontrarLocalizacao(codigo: string, localizacoes: Localizacao[]): Localizacao | undefined {
  const c = normalizar(codigo)
  return (
    localizacoes.find((l) => normalizar(l.codigo) === c) ??
    localizacoes.find((l) => normalizar(l.id) === c) ??
    localizacoes.find((l) => normalizar(l.codigoParcial) === c)
  )
}

/** Decide o que abrir a partir de um texto lido: ligação da aplicação, referência, código de posição ou pesquisa. */
export function interpretarCodigo(texto: string, pecas: Peca[], localizacoes: Localizacao[]): Destino {
  const bruto = texto.trim()
  // ligação de uma etiqueta (qualquer endereço com ?loc= / ?peca= / ?pecaId=)
  const q = bruto.includes('?') ? new URLSearchParams(bruto.slice(bruto.indexOf('?') + 1)) : null
  if (q?.get('loc')) return destinoLocalizacao(q.get('loc')!, localizacoes, bruto)
  if (q?.get('peca')) return destinoPeca(q.get('peca')!, pecas)
  if (q?.get('pecaId') && pecas.some((p) => p.id === q.get('pecaId'))) return { tipo: 'peca', id: q.get('pecaId')! }

  // referência de material (código de barras)
  const porRef = pecas.find((p) => p.referencia && normalizar(p.referencia) === normalizar(bruto))
  if (porRef) return { tipo: 'peca', id: porRef.id }
  // código de posição, com ou sem caixa (1B09A02 ou 1B09A02C)
  const loc = encontrarLocalizacao(bruto, localizacoes) ?? encontrarLocalizacao(bruto.slice(0, -1), localizacoes)
  if (loc && bruto.length >= 4) return { tipo: 'localizacao', id: loc.id }
  return { tipo: 'pesquisa', texto: bruto }
}

function destinoLocalizacao(codigo: string, localizacoes: Localizacao[], bruto: string): Destino {
  const loc = encontrarLocalizacao(codigo, localizacoes)
  return loc ? { tipo: 'localizacao', id: loc.id } : { tipo: 'pesquisa', texto: codigo || bruto }
}

function destinoPeca(ref: string, pecas: Peca[]): Destino {
  const p = pecas.find((x) => x.referencia && normalizar(x.referencia) === normalizar(ref))
  return p ? { tipo: 'peca', id: p.id } : { tipo: 'pesquisa', texto: ref }
}

/** Copia para a área de transferência; sem acesso (ex.: endereço http na rede), mostra o texto para copiar à mão. */
export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    window.prompt('Copie a ligação:', texto)
    return false
  }
}
