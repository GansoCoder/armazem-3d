import { Camera, CameraOff, ScanLine } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useApp } from '../../hooks/useApp'
import { useInventario } from '../../hooks/useInventario'
import { interpretarCodigo } from '../../utils/ligacoes'
import { Modal } from '../common/comum'

/**
 * Leitor de códigos: QR das etiquetas, códigos de barras das referências ou texto escrito.
 * A câmara usa o BarcodeDetector do navegador (Chrome/Edge em Android e computador); noutros
 * navegadores fica o campo de texto — e os QR das etiquetas também abrem com a câmara do telemóvel.
 */

interface CodigoDetetado { rawValue: string }
interface Detetor { detect: (fonte: HTMLVideoElement) => Promise<CodigoDetetado[]> }
type ConstrutorDetetor = new (opcoes?: { formats?: string[] }) => Detetor

const FORMATOS = ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'data_matrix', 'itf']

function obterDetetor(): ConstrutorDetetor | null {
  return (window as unknown as { BarcodeDetector?: ConstrutorDetetor }).BarcodeDetector ?? null
}

export function LeitorCodigos() {
  const { pecas, localizacoes } = useInventario()
  const { setFerramenta, abrirDestino } = useApp()
  const video = useRef<HTMLVideoElement>(null)
  const [texto, setTexto] = useState('')
  const [estado, setEstado] = useState<'a-iniciar' | 'a-ler' | 'sem-suporte' | 'sem-permissao' | 'inseguro'>(() =>
    !window.isSecureContext ? 'inseguro' : obterDetetor() ? 'a-iniciar' : 'sem-suporte',
  )
  const fechar = () => setFerramenta(null)

  function abrir(codigo: string) {
    if (!codigo.trim()) return
    fechar()
    abrirDestino(interpretarCodigo(codigo, pecas, localizacoes))
  }
  const abrirRef = useRef(abrir)
  useEffect(() => { abrirRef.current = abrir })

  // a câmara fica ligada enquanto se pode ler: passar de "a iniciar" para "a ler" não pode reiniciar
  // o efeito (a limpeza desligaria a câmara acabada de abrir e o vídeo ficaria preto)
  const camara = estado === 'a-iniciar' || estado === 'a-ler'
  useEffect(() => {
    if (!camara) return
    const Detetor = obterDetetor()
    if (!Detetor) return
    let fluxo: MediaStream | null = null
    let parado = false
    let temporizador = 0
    const detetor = new Detetor({ formats: FORMATOS })
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(async (f) => {
        if (parado) { f.getTracks().forEach((t) => t.stop()); return }
        fluxo = f
        if (!video.current) return
        video.current.srcObject = f
        await video.current.play().catch(() => undefined)
        if (parado) return
        setEstado('a-ler')
        const ler = async () => {
          if (parado || !video.current) return
          try {
            const r = await detetor.detect(video.current)
            if (r[0]?.rawValue) { abrirRef.current(r[0].rawValue); return }
          } catch {
            /* fotograma ainda não pronto */
          }
          temporizador = window.setTimeout(ler, 250)
        }
        ler()
      })
      .catch(() => setEstado('sem-permissao'))
    return () => {
      parado = true
      window.clearTimeout(temporizador)
      fluxo?.getTracks().forEach((t) => t.stop())
    }
  }, [camara])

  const submeter = (e: FormEvent) => { e.preventDefault(); abrir(texto) }

  return (
    <Modal titulo="Ler código" aoFechar={fechar} largura={560}>
      <div className="leitor">
        {camara ? (
          <div className="leitor-video">
            <video ref={video} muted playsInline />
            <div className="leitor-mira" aria-hidden />
            <p className="leitor-estado">{estado === 'a-ler' ? 'Aponte para o código QR ou de barras…' : 'A abrir a câmara…'}</p>
          </div>
        ) : (
          <div className="alerta">
            <CameraOff size={16} aria-hidden />
            <div>
              {estado === 'inseguro' && <>A câmara só funciona em endereços seguros (https) ou neste computador. Os QR das etiquetas abrem na mesma com a <strong>câmara do telemóvel</strong>.</>}
              {estado === 'sem-suporte' && <>Este navegador não lê códigos pela câmara (funciona no Chrome/Edge). Os QR das etiquetas abrem com a <strong>câmara do telemóvel</strong>; aqui pode escrever o código.</>}
              {estado === 'sem-permissao' && <>Sem acesso à câmara. Autorize a câmara nas definições do navegador ou escreva o código.</>}
            </div>
          </div>
        )}

        <form className="formulario" onSubmit={submeter}>
          <label>
            <span>Ou escreva / cole o código</span>
            <div className="input-com-botao">
              <input
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Ex.: 1B09A02, 42173490 ou a ligação do QR"
                className="mono"
                autoFocus={estado !== 'a-iniciar' && estado !== 'a-ler'}
              />
              <button className="btn btn-primario" type="submit"><ScanLine size={15} aria-hidden /> Abrir</button>
            </div>
          </label>
          <p className="nota"><Camera size={13} aria-hidden /> Aceita códigos de posição (com ou sem caixa), referências de material e as ligações das etiquetas.</p>
        </form>
      </div>
    </Modal>
  )
}
