import { useMemo } from 'react'
import { useApp } from '../../hooks/useApp'
import { useInventario } from '../../hooks/useInventario'
import type { Peca } from '../../types'
import { criarLigador } from '../../utils/planta'
import { nomePeca } from '../../utils/texto'
import { Modal } from '../common/comum'

/**
 * Qualidade dos dados: o que falta ou parece errado, para ir corrigindo no Excel/SAP ou na planta.
 */

const GRALHA = 'Formato de posição inválido (possível gralha no Excel)'
const SEM_POSICAO = 'Sem posição no Excel'

function Grupo({ titulo, pecas, aoAbrir, aberto = false, explicacao }: {
  titulo: string
  pecas: Peca[]
  aoAbrir: (id: string) => void
  aberto?: boolean
  explicacao?: string
}) {
  if (pecas.length === 0) return null
  return (
    <details className="mudancas" open={aberto}>
      <summary><strong>{pecas.length}</strong> · {titulo}</summary>
      {explicacao && <p className="texto-sec qualidade-explicacao">{explicacao}</p>}
      <ul className="qualidade-lista">
        {pecas.slice(0, 300).map((p) => (
          <li key={p.id}>
            <button onClick={() => aoAbrir(p.id)}>
              <span className="mono">{p.referencia ?? 'Sem referência'}</span> {nomePeca(p)}
              {p.posicaoOrigem !== undefined && <span className="mono texto-sec"> · {p.posicaoOrigem || '(vazio)'}</span>}
            </button>
          </li>
        ))}
        {pecas.length > 300 && <li className="texto-sec">… e mais {pecas.length - 300}.</li>}
      </ul>
    </details>
  )
}

export function QualidadeDados() {
  const { pecas, layout, localizacoes } = useInventario()
  const { setFerramenta, abrirPeca } = useApp()
  const fechar = () => setFerramenta(null)
  const abrir = (id: string) => { abrirPeca(id); fechar() }

  const a = useMemo(() => {
    const ligar = layout ? criarLigador(layout, localizacoes) : null
    const motivos = new Map<string, Peca[]>()
    for (const p of pecas) {
      if (p.localizacaoId) continue
      const m = p.fonte === 'excel' && ligar ? (ligar(p.posicaoOrigem, p.referencia).motivo ?? 'Sem ligação') : 'Localização por confirmar (registo manual ou observação)'
      motivos.set(m, [...(motivos.get(m) ?? []), p])
    }
    const doExcel = pecas.filter((p) => p.fonte === 'excel')
    return {
      total: pecas.length,
      com3D: pecas.filter((p) => p.localizacaoId).length,
      motivos: [...motivos.entries()].sort((x, y) => y[1].length - x[1].length),
      gralhas: [...(motivos.get(GRALHA) ?? []), ...(motivos.get(SEM_POSICAO) ?? [])],
      fora: [...motivos.entries()].filter(([m]) => m.startsWith('Prateleira/coluna fora') || m.startsWith('Posição incompleta')).flatMap(([, l]) => l),
      semStock: doExcel.filter((p) => p.quantidade === 0),
      semFoto: pecas.filter((p) => p.fotografias.length === 0).length,
      semCategoria: pecas.filter((p) => !p.categoria).length,
    }
  }, [pecas, layout, localizacoes])

  const pct = (n: number) => `${Math.round((n / Math.max(1, a.total)) * 100)}%`

  return (
    <Modal titulo="Qualidade dos dados" aoFechar={fechar} largura={820}>
      <div className="qualidade">
        <div className="qualidade-numeros">
          <div><strong>{a.total}</strong><span>registos</span></div>
          <div><strong>{pct(a.com3D)}</strong><span>com posição no 3D ({a.com3D})</span></div>
          <div className={a.gralhas.length ? 'aviso' : ''}><strong>{a.gralhas.length}</strong><span>posições a corrigir no Excel</span></div>
          <div><strong>{pct(a.total - a.semFoto)}</strong><span>com fotografia ({a.total - a.semFoto})</span></div>
          <div><strong>{pct(a.total - a.semCategoria)}</strong><span>com categoria</span></div>
        </div>

        <section>
          <h3>A corrigir</h3>
          <Grupo titulo="posições com formato inválido ou vazias (corrigir no Excel/SAP)" pecas={a.gralhas} aoAbrir={abrir} aberto />
          <Grupo
            titulo="posições que não cabem nas estantes desenhadas"
            pecas={a.fora}
            aoAbrir={abrir}
            explicacao="A prateleira ou a coluna não existe no modelo (ou falta a prateleira/coluna). Aumente as colunas/prateleiras no editor da planta ou corrija a posição."
          />
          <Grupo titulo="materiais com stock 0 no Excel" pecas={a.semStock} aoAbrir={abrir} />
        </section>

        <section>
          <h3>Sem posição no 3D, por motivo</h3>
          {a.motivos.map(([m, l]) => <Grupo key={m} titulo={m} pecas={l} aoAbrir={abrir} />)}
          <p className="nota">Para reduzir estes números: desenhar as zonas em falta (1C, M100, escritório…) no editor da planta e corrigir as posições no Excel.</p>
        </section>
      </div>
    </Modal>
  )
}
