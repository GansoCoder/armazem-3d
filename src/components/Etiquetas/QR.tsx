import QRCode from 'qrcode'
import { useMemo } from 'react'

/** Código QR desenhado em SVG (sem imagens nem HTML injetado). */
export function QR({ texto, tamanho = 96, titulo }: { texto: string; tamanho?: number | string; titulo?: string }) {
  const { n, caminho } = useMemo(() => {
    const q = QRCode.create(texto, { errorCorrectionLevel: 'M' })
    const n = q.modules.size
    let d = ''
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) if (q.modules.get(y, x)) d += `M${x} ${y}h1v1h-1z`
    }
    return { n, caminho: d }
  }, [texto])
  const margem = 2
  return (
    <svg
      viewBox={`${-margem} ${-margem} ${n + 2 * margem} ${n + 2 * margem}`}
      width={tamanho}
      height={tamanho}
      role="img"
      aria-label={titulo ?? `Código QR: ${texto}`}
      shapeRendering="crispEdges"
    >
      <rect x={-margem} y={-margem} width={n + 2 * margem} height={n + 2 * margem} fill="#fff" />
      <path d={caminho} fill="#000" />
    </svg>
  )
}
