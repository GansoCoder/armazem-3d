import { Download, RotateCcw, TriangleAlert, X } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { SobreModelo } from './components/About/SobreModelo'
import { PartEditor } from './components/Editor/PartEditor'
import { Header } from './components/Header/Header'
import { PartDetails } from './components/PartDetails/PartDetails'
import { PartsList } from './components/PartsList/PartsList'
import { EditorLigacoes } from './components/Organograma/EditorLigacoes'
import { Organograma } from './components/Organograma/Organograma'
import { AppProvider, useApp } from './hooks/useApp'
import { InventarioProvider, useInventario } from './hooks/useInventario'

// A vista 3D (three.js) é carregada à parte para a listagem abrir mais depressa.
const Warehouse3D = lazy(() => import('./components/Warehouse3D/Warehouse3D'))

function BannerRascunho() {
  const { alteracoesLocais, exportarJSON, reporDadosOriginais } = useInventario()
  const { notificar, abrirPeca } = useApp()
  if (alteracoesLocais === 0) return null
  return (
    <div className="banner-rascunho" role="status">
      <TriangleAlert size={16} aria-hidden />
      <span>
        <strong>{alteracoesLocais} alteração(ões) local(is)</strong> guardada(s) apenas neste navegador — não constituem inventário oficial.
      </span>
      <button className="btn btn-fantasma btn-pequeno" onClick={exportarJSON}><Download size={14} aria-hidden /> Exportar JSON</button>
      <button
        className="btn btn-fantasma btn-pequeno"
        onClick={() => {
          if (!window.confirm('Descartar todas as alterações locais e repor os dados originais?')) return
          reporDadosOriginais()
          abrirPeca(null)
          notificar('Dados originais repostos.', 'sucesso')
        }}
      >
        <RotateCcw size={14} aria-hidden /> Repor dados originais
      </button>
    </div>
  )
}

function BannerPlanta() {
  const { plantaLocal, exportarPlanta, reporPlanta } = useInventario()
  const { notificar, setEstruturaEditada } = useApp()
  if (!plantaLocal) return null
  return (
    <div className="banner-rascunho" role="status">
      <TriangleAlert size={16} aria-hidden />
      <span>
        <strong>Planta alterada localmente</strong> — guardada apenas neste navegador, não é a planta oficial.
      </span>
      <button className="btn btn-fantasma btn-pequeno" onClick={exportarPlanta}><Download size={14} aria-hidden /> Exportar layout.json</button>
      <button
        className="btn btn-fantasma btn-pequeno"
        onClick={() => {
          if (!window.confirm('Descartar a planta alterada e voltar à planta oficial?')) return
          reporPlanta()
          setEstruturaEditada(null)
          notificar('Planta oficial reposta.', 'sucesso')
        }}
      >
        <RotateCcw size={14} aria-hidden /> Repor planta original
      </button>
    </div>
  )
}

function BannerComposicao() {
  const { composicaoLocal, exportarComposicao, reporComposicao } = useInventario()
  const { notificar } = useApp()
  if (!composicaoLocal) return null
  return (
    <div className="banner-rascunho" role="status">
      <TriangleAlert size={16} aria-hidden />
      <span>
        <strong>Organograma alterado localmente</strong> — ligações guardadas apenas neste navegador, não são dados oficiais.
      </span>
      <button className="btn btn-fantasma btn-pequeno" onClick={exportarComposicao}><Download size={14} aria-hidden /> Exportar composicao.json</button>
      <button
        className="btn btn-fantasma btn-pequeno"
        onClick={() => {
          if (!window.confirm('Descartar as ligações feitas neste navegador e voltar ao organograma oficial?')) return
          reporComposicao()
          notificar('Organograma oficial reposto.', 'sucesso')
        }}
      >
        <RotateCcw size={14} aria-hidden /> Repor organograma
      </button>
    </div>
  )
}

function Notificacoes() {
  const { notificacoes, dispensar } = useApp()
  return (
    <div className="notificacoes" aria-live="polite">
      {notificacoes.map((n) => (
        <div key={n.id} className={`notificacao notificacao-${n.tipo}`} role={n.tipo === 'erro' ? 'alert' : 'status'}>
          <span>{n.texto}</span>
          <button className="btn-icone" onClick={() => dispensar(n.id)} aria-label="Dispensar"><X size={14} /></button>
        </div>
      ))}
    </div>
  )
}

function Conteudo() {
  const { carregado } = useInventario()
  const { vista, editor, sobreAberto, pecaSelecionada, editorLigacoes } = useApp()
  // A vista 3D fica montada depois da primeira visita, para manter a câmara ao alternar de vista.
  const [visitou3D, setVisitou3D] = useState(vista === '3d')
  if (vista === '3d' && !visitou3D) setVisitou3D(true)

  if (!carregado) {
    return <div className="carregando-app" role="status"><span className="spinner" aria-hidden /> A carregar dados…</div>
  }

  return (
    <>
      <main className={`conteudo ${pecaSelecionada ? 'com-ficha' : ''}`}>
        {visitou3D && (
          <div className="vista-envolvente" hidden={vista !== '3d'}>
            <Suspense fallback={<div className="carregando-3d" role="status"><span className="spinner" aria-hidden /> A carregar vista 3D…</div>}>
              <Warehouse3D visivel={vista === '3d'} />
            </Suspense>
          </div>
        )}
        {vista === 'lista' && <PartsList />}
        {vista === 'organograma' && <Organograma />}
        <PartDetails key={pecaSelecionada ?? 'nenhuma'} />
      </main>
      {editor.aberto && <PartEditor key={`${editor.pecaId}-${editor.localizacaoInicial}`} />}
      {sobreAberto && <SobreModelo />}
      {editorLigacoes && <EditorLigacoes key={`${editorLigacoes.chave}-${editorLigacoes.novoGrupo}`} />}
    </>
  )
}

export default function App() {
  return (
    <InventarioProvider>
      <AppProvider>
        <div className="app">
          <Header />
          <BannerRascunho />
          <BannerPlanta />
          <BannerComposicao />
          <Conteudo />
          <Notificacoes />
        </div>
      </AppProvider>
    </InventarioProvider>
  )
}
