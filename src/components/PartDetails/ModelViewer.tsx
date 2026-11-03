import { Bounds, Center, OrbitControls, useGLTF } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Component, Suspense, type ReactNode } from 'react'

/** Visualizador de modelos 3D (.glb/.gltf) de peças. Carregado apenas quando a peça tem modelo. */

function Modelo({ src }: { src: string }) {
  const { scene } = useGLTF(src)
  return <primitive object={scene} />
}

class ErroModelo extends Component<{ children: ReactNode }, { erro: boolean }> {
  state = { erro: false }
  static getDerivedStateFromError() {
    return { erro: true }
  }
  render() {
    return this.state.erro
      ? <div className="modelo-erro">Não foi possível carregar o modelo 3D. Verifique o caminho do ficheiro.</div>
      : this.props.children
  }
}

export default function ModelViewer({ src }: { src: string }) {
  return (
    <ErroModelo>
      <div className="modelo-3d">
        <Canvas camera={{ position: [2, 1.5, 2.5], fov: 40 }} dpr={[1, 2]}>
          <color attach="background" args={['#0d1e30']} />
          <hemisphereLight args={['#ffffff', '#223344', 1.2]} />
          <directionalLight position={[3, 5, 2]} intensity={1.4} />
          <Suspense fallback={null}>
            <Bounds fit clip observe margin={1.2}>
              <Center>
                <Modelo src={src} />
              </Center>
            </Bounds>
          </Suspense>
          <OrbitControls makeDefault enableDamping />
        </Canvas>
        <span className="modelo-dica">Arraste para rodar · roda do rato para ampliar</span>
      </div>
    </ErroModelo>
  )
}
