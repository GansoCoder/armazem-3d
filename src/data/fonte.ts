/**
 * Fonte de dados da aplicação.
 *
 * Hoje os dados vêm dos ficheiros JSON desta pasta. Para ligar a uma API ou base de dados,
 * basta substituir o corpo de `carregarDadosBase` por pedidos `fetch` que devolvam a mesma forma.
 */
import type { Layout, Localizacao, Peca } from '../types'
import { validarDados } from '../utils/validacao'

export interface DadosBase {
  layout: Layout
  localizacoes: Localizacao[]
  pecas: Peca[]
  avisos: string[]
}

export async function carregarDadosBase(): Promise<DadosBase> {
  // importação dinâmica: os dados (≈1 MB com o Excel) ficam num ficheiro à parte do código da interface
  const [layoutMod, locsMod, pecasMod] = await Promise.all([
    import('./layout.json'),
    import('./locations.json'),
    import('./parts.json'),
  ])
  const layout = layoutMod.default as unknown as Layout
  const localizacoes = locsMod.default as unknown as Localizacao[]
  const pecas = pecasMod.default as unknown as Peca[]
  const avisos = validarDados(layout, localizacoes, pecas)
  if (avisos.length) console.warn('[dados] Avisos de integridade:', avisos)
  return { layout, localizacoes, pecas, avisos }
}
