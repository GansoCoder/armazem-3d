import { Download, TriangleAlert, Upload } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../../hooks/useApp'
import { useInventario } from '../../hooks/useInventario'
import { aplicarFolhaComposicao, lerCsv, linhasComposicao, MODELO_FOLHA_COMPOSICAO, type ResultadoFolhaComposicao } from '../../utils/composicao'
import { Modal } from '../common/comum'

/** Preencher o organograma de uma vez a partir de uma folha (Excel ou CSV): Pai, Filho, Quantidade, Tipo do pai. */

async function lerTabela(f: File): Promise<unknown[][]> {
  if (/\.csv$/i.test(f.name) || f.type === 'text/csv') return lerCsv(await f.text())
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await f.arrayBuffer())
  const ws = wb.worksheets[0]
  if (!ws) throw new Error('O ficheiro não tem folhas.')
  const t: unknown[][] = []
  ws.eachRow((row) => {
    t.push((row.values as unknown[]).slice(1).map((v) => (v && typeof v === 'object' ? ((v as { result?: unknown; text?: unknown }).result ?? (v as { text?: unknown }).text) : v)))
  })
  return t
}

export function ImportarFolha({ aoFechar }: { aoFechar: () => void }) {
  const { composicao, pecas, guardarComposicao } = useInventario()
  const { notificar } = useApp()
  const [r, setR] = useState<ResultadoFolhaComposicao | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [confirmado, setConfirmado] = useState(false)

  async function ler(f: File | undefined) {
    if (!f) return
    setErro(null)
    try {
      setR(aplicarFolhaComposicao(composicao, linhasComposicao(await lerTabela(f)), pecas))
      setNome(f.name)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível ler o ficheiro.')
    }
  }

  function descarregarModelo() {
    const url = URL.createObjectURL(new Blob(['﻿' + MODELO_FOLHA_COMPOSICAO], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'modelo-organograma.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function aplicar() {
    if (!r) return
    if (!confirmado) { notificar('Confirme que compreende que as ligações ficam só neste navegador.', 'aviso'); return }
    const e = guardarComposicao(r.composicao)
    notificar(e ?? `${r.novas} ligação(ões) acrescentadas ao organograma (rascunho local).`, e ? 'erro' : 'sucesso')
    if (!e) aoFechar()
  }

  return (
    <Modal
      titulo="Preencher o organograma a partir de uma folha"
      aoFechar={aoFechar}
      largura={680}
      rodape={
        <>
          <button className="btn btn-fantasma rodape-esquerda" onClick={descarregarModelo}><Download size={15} aria-hidden /> Modelo (CSV)</button>
          <button className="btn btn-fantasma" onClick={aoFechar}>Cancelar</button>
          {r && <button className="btn btn-primario" disabled={r.novas + r.atualizadas === 0} onClick={aplicar}>Acrescentar ao organograma</button>}
        </>
      }
    >
      <div className="importar formulario">
        <p className="texto-sec">
          Uma linha por ligação, com as colunas <strong>Pai</strong> (referência, ou nome do equipamento/conjunto), <strong>Filho</strong> (referência),
          <strong> Quantidade</strong> (opcional) e <strong>Tipo do pai</strong> (opcional: "equipamento" ou "conjunto"). Um pai que não seja uma
          referência nem um grupo existente é criado como grupo novo.
        </p>
        <label className="zona-ficheiro">
          <Upload size={24} aria-hidden />
          <strong>{nome || 'Escolher ficheiro .xlsx ou .csv'}</strong>
          <input type="file" accept=".xlsx,.csv" hidden onChange={(e) => ler(e.target.files?.[0])} />
        </label>
        {erro && <div className="alerta alerta-erro" role="alert"><TriangleAlert size={16} aria-hidden /><span>{erro}</span></div>}
        {r && (
          <>
            <p>
              <strong>{r.novas}</strong> ligação(ões) novas · <strong>{r.atualizadas}</strong> atualizadas
              {r.gruposNovos.length > 0 && <> · <strong>{r.gruposNovos.length}</strong> grupo(s) novos ({r.gruposNovos.join(', ')})</>}
            </p>
            {r.erros.length > 0 && (
              <details className="mudancas" open>
                <summary><strong>{r.erros.length}</strong> linha(s) ignoradas</summary>
                <ul>{r.erros.slice(0, 100).map((e) => <li key={e}>{e}</li>)}</ul>
              </details>
            )}
            <label className="check confirmacao">
              <input type="checkbox" checked={confirmado} onChange={(e) => setConfirmado(e.target.checked)} />
              <span>Compreendo que estas ligações ficam guardadas apenas neste navegador e não são dados oficiais.</span>
            </label>
          </>
        )}
      </div>
    </Modal>
  )
}
