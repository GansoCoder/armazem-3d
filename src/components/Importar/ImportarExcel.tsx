import { FileSpreadsheet, TriangleAlert, Upload } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../../hooks/useApp'
import { useInventario } from '../../hooks/useInventario'
import type { Peca } from '../../types'
import { agrupar, compararPecas, construirPecas, detetarColunas, lerLinhas, type Diferencas, type ResultadoImportacao } from '../../utils/importacao'
import { formatarQuantidade } from '../../utils/texto'
import { Modal } from '../common/comum'

/**
 * Importar a lista de materiais (Excel) na própria aplicação: mostra o que muda em relação aos dados
 * atuais e, se confirmado, passa a usá-la neste navegador (até exportar parts.json ou repor).
 */

type Valor = unknown
const valorSimples = (v: Valor): Valor => {
  if (v && typeof v === 'object') {
    const o = v as { result?: Valor; text?: Valor; richText?: { text: string }[] }
    return o.result ?? o.text ?? o.richText?.map((r) => r.text).join('')
  }
  return v
}

async function lerFicheiro(f: File): Promise<{ valores: Valor[]; n: number }[] & { cabecalho?: Valor[] }> {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await f.arrayBuffer())
  const ws = wb.worksheets[0]
  if (!ws) throw new Error('O ficheiro não tem folhas.')
  const linhas: { valores: Valor[]; n: number }[] & { cabecalho?: Valor[] } = []
  ws.eachRow((row, n) => {
    const valores = (row.values as Valor[]).map(valorSimples)
    if (n === 1) linhas.cabecalho = valores
    else linhas.push({ n, valores })
  })
  return linhas
}

function ListaMudancas({ titulo, itens }: { titulo: string; itens: { chave: string; texto: string }[] }) {
  if (itens.length === 0) return null
  return (
    <details className="mudancas">
      <summary><strong>{itens.length}</strong> {titulo}</summary>
      <ul>
        {itens.slice(0, 200).map((i) => <li key={i.chave}>{i.texto}</li>)}
        {itens.length > 200 && <li className="texto-sec">… e mais {itens.length - 200}.</li>}
      </ul>
    </details>
  )
}

const rotulo = (p: Peca) => `${p.referencia ?? p.id} — ${p.nome ?? ''}`

export function ImportarExcel() {
  const { pecasBase, layout, localizacoes, aplicarImportacao } = useInventario()
  const { setFerramenta, notificar } = useApp()
  const [estado, setEstado] = useState<'escolher' | 'a-ler' | 'pronto'>('escolher')
  const [erro, setErro] = useState<string | null>(null)
  const [ficheiro, setFicheiro] = useState<string>('')
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null)
  const [dif, setDif] = useState<Diferencas | null>(null)
  const [confirmado, setConfirmado] = useState(false)
  const [arrastar, setArrastar] = useState(false)
  const fechar = () => setFerramenta(null)

  async function processar(f: File | undefined) {
    if (!f || !layout) return
    setErro(null)
    setEstado('a-ler')
    try {
      const linhas = await lerFicheiro(f)
      const C = detetarColunas(linhas.cabecalho ?? [])
      const r = construirPecas(agrupar(lerLinhas(linhas, C)), pecasBase, layout, localizacoes, f.name)
      if (r.novos.length === 0) throw new Error('Não foi encontrado nenhum material no ficheiro.')
      setFicheiro(f.name)
      setResultado(r)
      setDif(compararPecas(pecasBase, r.pecas))
      setEstado('pronto')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível ler o ficheiro.')
      setEstado('escolher')
    }
  }

  async function aplicar() {
    if (!resultado) return
    if (!confirmado) {
      notificar('Confirme que compreende que a importação fica só neste navegador.', 'aviso')
      return
    }
    const e = await aplicarImportacao({ ficheiro, data: new Date().toISOString(), pecas: resultado.pecas })
    notificar(e ?? `Lista de materiais importada (${resultado.novos.length} materiais) — só neste navegador.`, e ? 'erro' : 'sucesso')
    if (!e) fechar()
  }

  const ligadas = resultado?.novos.filter((p) => p.localizacaoId).length ?? 0
  const semMudancas = dif && !dif.novos.length && !dif.removidos.length && !dif.quantidade.length && !dif.posicao.length && !dif.nome.length

  return (
    <Modal
      titulo="Importar lista de materiais (Excel)"
      aoFechar={fechar}
      largura={760}
      rodape={
        <>
          <button className="btn btn-fantasma" onClick={fechar}>Cancelar</button>
          {estado === 'pronto' && <button className="btn btn-primario" onClick={aplicar}>Aplicar importação</button>}
        </>
      }
    >
      {estado !== 'pronto' ? (
        <div className="importar">
          <label
            className={`zona-ficheiro ${arrastar ? 'ativa' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setArrastar(true) }}
            onDragLeave={() => setArrastar(false)}
            onDrop={(e) => { e.preventDefault(); setArrastar(false); processar(e.dataTransfer.files[0]) }}
          >
            {estado === 'a-ler' ? <span className="spinner" aria-hidden /> : <Upload size={28} aria-hidden />}
            <strong>{estado === 'a-ler' ? 'A ler o ficheiro…' : 'Arraste o Excel para aqui ou clique para escolher'}</strong>
            <span className="texto-sec">Colunas: Material, Texto breve de material, Posição no depósito, Estoque total, Valor de Stock</span>
            <input type="file" accept=".xlsx" hidden onChange={(e) => processar(e.target.files?.[0])} disabled={estado === 'a-ler'} />
          </label>
          {erro && <div className="alerta alerta-erro" role="alert"><TriangleAlert size={16} aria-hidden /><span>{erro}</span></div>}
          <p className="nota">São mantidos os campos acrescentados à mão (fotografias, notas, categoria, UQE…). Nada é alterado antes de ver o resumo e confirmar.</p>
        </div>
      ) : resultado && dif && (
        <div className="importar formulario">
          <p><FileSpreadsheet size={15} aria-hidden /> <strong>{ficheiro}</strong>: {resultado.linhasTotais} linhas, {resultado.novos.length} materiais ({resultado.agregados} repetidos somados), <strong>{ligadas}</strong> com posição no 3D.</p>

          <section className="resumo-mudancas">
            <h3>O que muda em relação aos dados atuais</h3>
            {semMudancas ? (
              <p className="texto-sec">Nenhuma diferença nos materiais.</p>
            ) : (
              <>
                <ListaMudancas titulo="materiais novos" itens={dif.novos.map((p) => ({ chave: p.id, texto: `${rotulo(p)} · ${p.posicaoOrigem ?? 'sem posição'} · ${formatarQuantidade(p.quantidade)}` }))} />
                <ListaMudancas titulo="materiais que deixam de existir" itens={dif.removidos.map((p) => ({ chave: p.id, texto: `${rotulo(p)} · ${p.posicaoOrigem ?? 'sem posição'}` }))} />
                <ListaMudancas titulo="quantidades alteradas" itens={dif.quantidade.map(({ peca, antes }) => ({ chave: peca.id, texto: `${rotulo(peca)}: ${formatarQuantidade(antes)} → ${formatarQuantidade(peca.quantidade)}` }))} />
                <ListaMudancas titulo="posições alteradas" itens={dif.posicao.map(({ peca, antes }) => ({ chave: peca.id, texto: `${rotulo(peca)}: ${antes ?? '—'} → ${peca.posicaoOrigem ?? '—'}` }))} />
                <ListaMudancas titulo="designações alteradas" itens={dif.nome.map(({ peca, antes }) => ({ chave: peca.id, texto: `${peca.referencia}: "${antes ?? ''}" → "${peca.nome ?? ''}"` }))} />
              </>
            )}
          </section>

          {resultado.motivos.size > 0 && (
            <details className="mudancas">
              <summary>Materiais sem posição no 3D: <strong>{resultado.novos.length - ligadas}</strong> (por motivo)</summary>
              <ul>{[...resultado.motivos.entries()].sort((a, b) => b[1].length - a[1].length).map(([m, l]) => <li key={m}>{m}: {l.length}</li>)}</ul>
            </details>
          )}

          <div className="alerta alerta-aviso">
            <TriangleAlert size={16} aria-hidden />
            <span>Fica <strong>só neste navegador</strong>. Para tornar oficial: "Exportar parts.json" na barra amarela e substituir <code>src/data/parts.json</code> (ou correr o script de importação).</span>
          </div>
          <label className="check confirmacao">
            <input type="checkbox" checked={confirmado} onChange={(e) => setConfirmado(e.target.checked)} />
            <span>Compreendo que esta importação fica guardada apenas neste navegador.</span>
          </label>
        </div>
      )}
    </Modal>
  )
}
