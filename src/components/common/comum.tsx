import { CircleAlert, CircleCheck, CircleDashed, CircleMinus, ImageOff, X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import type { EstadoStock, Fotografia } from '../../types'
import { ROTULO_ESTADO } from '../../utils/stock'

const ICONE_ESTADO = {
  disponivel: CircleCheck,
  baixo: CircleAlert,
  sem_stock: CircleMinus,
  por_confirmar: CircleDashed,
}

/** Estado de stock com ícone + texto (não depende só da cor). */
export function EstadoBadge({ estado, compacto }: { estado: EstadoStock; compacto?: boolean }) {
  const Icone = ICONE_ESTADO[estado]
  return (
    <span className={`badge estado-${estado}`} title={ROTULO_ESTADO[estado]}>
      <Icone size={13} aria-hidden />
      {compacto ? <span className="sr-only">{ROTULO_ESTADO[estado]}</span> : ROTULO_ESTADO[estado]}
    </span>
  )
}

export function PorConfirmar({ texto = 'Por confirmar' }: { texto?: string }) {
  return <span className="por-confirmar">{texto}</span>
}

export function Estimado() {
  return (
    <span className="tag tag-estimado" title="Valor estimado a partir das fotografias, não confirmado">
      estimado
    </span>
  )
}

export function TagLocal({ origem }: { origem: 'criado' | 'editado' }) {
  return (
    <span className="tag tag-local" title="Alteração guardada apenas neste navegador — não é inventário oficial">
      {origem === 'criado' ? 'criado localmente' : 'editado localmente'}
    </span>
  )
}

/** Imagem com carregamento diferido e placeholder neutro quando não existe. */
export function Foto({
  foto,
  miniatura,
  className = '',
  alt,
}: {
  foto?: Fotografia
  miniatura?: boolean
  className?: string
  alt?: string
}) {
  if (!foto) {
    return (
      <div className={`foto foto-vazia ${className}`} role="img" aria-label="Sem fotografia">
        <ImageOff size={miniatura ? 16 : 28} aria-hidden />
        {!miniatura && <span>Sem fotografia</span>}
      </div>
    )
  }
  const src = miniatura ? (foto.thumb ?? foto.src) : foto.src
  return (
    <img
      className={`foto ${className}`}
      src={src}
      alt={alt ?? foto.legenda ?? ''}
      loading="lazy"
      decoding="async"
    />
  )
}

export function Modal({
  titulo,
  aoFechar,
  children,
  largura = 640,
  rodape,
}: {
  titulo: string
  aoFechar: () => void
  children: ReactNode
  largura?: number
  rodape?: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus()
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    window.addEventListener('keydown', tecla)
    return () => {
      window.removeEventListener('keydown', tecla)
      anterior?.focus?.()
    }
  }, [aoFechar])
  return (
    <div className="modal-fundo" onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo} style={{ maxWidth: largura }} ref={ref}>
        <header className="modal-cabecalho">
          <h2>{titulo}</h2>
          <button className="btn-icone" onClick={aoFechar} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>
        <div className="modal-corpo">{children}</div>
        {rodape && <footer className="modal-rodape">{rodape}</footer>}
      </div>
    </div>
  )
}
