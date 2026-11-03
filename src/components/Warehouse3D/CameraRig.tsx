import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useImperativeHandle, useRef, type ComponentRef, type Ref } from 'react'
import * as THREE from 'three'
import type { Enquadramento } from '../../utils/geometria'

/** API exposta aos botões de navegação fora do Canvas. */
export interface ControloCamara {
  focar: (e: Enquadramento) => void
  repor: () => void
  ampliar: (fator: number) => void
  rodar: (angulo: number) => void
  vistaTopo: () => void
}

interface Animacao {
  dePos: THREE.Vector3
  paraPos: THREE.Vector3
  deAlvo: THREE.Vector3
  paraAlvo: THREE.Vector3
  inicio: number
  duracao: number
}

type OrbitControlsImpl = ComponentRef<typeof OrbitControls>

const suavizar = (t: number) => 1 - Math.pow(1 - t, 3)

/**
 * Desloca o centro da imagem para a esquerda quando um painel lateral tapa o lado direito,
 * para a localização enquadrada não ficar escondida atrás dele.
 */
export function DeslocamentoVista({ px }: { px: number }) {
  const { camera, size, invalidate } = useThree()
  const atual = useRef(0)
  useFrame(() => {
    const cam = camera as THREE.PerspectiveCamera
    const diff = px - atual.current
    if (Math.abs(diff) < 0.5 && cam.view?.offsetX === px) return
    atual.current = Math.abs(diff) < 0.5 ? px : atual.current + diff * 0.18
    cam.setViewOffset(size.width, size.height, atual.current, 0, size.width, size.height)
    invalidate()
  })
  useEffect(() => invalidate(), [px, invalidate])
  return null
}

export function CameraRig({ inicial, ref }: { inicial: Enquadramento; ref?: Ref<ControloCamara> }) {
  const controls = useRef<OrbitControlsImpl>(null)
  const anim = useRef<Animacao | null>(null)
  const { camera, invalidate } = useThree()

  useEffect(() => {
    camera.position.set(...inicial.camara)
    controls.current?.target.set(...inicial.alvo)
    controls.current?.update()
    invalidate()
  }, [camera, inicial, invalidate])

  const animarPara = (pos: THREE.Vector3, alvo: THREE.Vector3, duracao = 900) => {
    const c = controls.current
    if (!c) return
    anim.current = {
      dePos: camera.position.clone(),
      paraPos: pos,
      deAlvo: c.target.clone(),
      paraAlvo: alvo,
      inicio: performance.now(),
      duracao,
    }
    invalidate()
  }

  useImperativeHandle(ref, () => ({
    focar: (e) => animarPara(new THREE.Vector3(...e.camara), new THREE.Vector3(...e.alvo)),
    repor: () => animarPara(new THREE.Vector3(...inicial.camara), new THREE.Vector3(...inicial.alvo)),
    ampliar: (fator) => {
      const c = controls.current
      if (!c) return
      const desvio = camera.position.clone().sub(c.target).multiplyScalar(fator)
      if (desvio.length() < c.minDistance || desvio.length() > c.maxDistance) return
      animarPara(c.target.clone().add(desvio), c.target.clone(), 350)
    },
    rodar: (angulo) => {
      const c = controls.current
      if (!c) return
      const desvio = camera.position.clone().sub(c.target).applyAxisAngle(new THREE.Vector3(0, 1, 0), angulo)
      animarPara(c.target.clone().add(desvio), c.target.clone(), 450)
    },
    vistaTopo: () => {
      const c = controls.current
      if (!c) return
      const dist = Math.max(camera.position.distanceTo(c.target), 30)
      animarPara(c.target.clone().add(new THREE.Vector3(0, dist, 0.01)), c.target.clone(), 700)
    },
  }))

  useFrame(() => {
    const a = anim.current
    const c = controls.current
    if (!a || !c) return
    const t = Math.min(1, (performance.now() - a.inicio) / a.duracao)
    const k = suavizar(t)
    camera.position.lerpVectors(a.dePos, a.paraPos, k)
    c.target.lerpVectors(a.deAlvo, a.paraAlvo, k)
    c.update()
    if (t < 1) invalidate()
    else anim.current = null
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.12}
      minDistance={2}
      maxDistance={90}
      maxPolarAngle={Math.PI / 2 - 0.04}
      screenSpacePanning
      onStart={() => { anim.current = null }}
    />
  )
}
