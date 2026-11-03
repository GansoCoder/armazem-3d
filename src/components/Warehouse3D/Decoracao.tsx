import { Edges, Grid, Html } from '@react-three/drei'
import * as THREE from 'three'
import type { ElementoDecorativo, Layout, ZonaPiso } from '../../types'
import { graus } from '../../utils/geometria'

/** Pavilhão e elementos de contexto observados nas fotografias (não são localizações de stock). */

const naoClicavel = () => null

export function Edificio({ layout }: { layout: Layout }) {
  const { xMin, xMax, zMin, zMax, altura } = layout.edificio
  const W = xMax - xMin
  const D = zMax - zMin
  const cx = (xMin + xMax) / 2
  const cz = (zMin + zMax) / 2
  const paredes: { p: [number, number, number]; r: number; w: number }[] = [
    { p: [cx, altura / 2, zMin], r: 0, w: W },
    { p: [cx, altura / 2, zMax], r: 0, w: W },
    { p: [xMin, altura / 2, cz], r: Math.PI / 2, w: D },
    { p: [xMax, altura / 2, cz], r: Math.PI / 2, w: D },
  ]
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[cx, 0, cz]} raycast={naoClicavel}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#1f2f40" roughness={0.95} />
      </mesh>
      <Grid
        position={[cx, 0.005, cz]}
        args={[W, D]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#2b435a"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#35536f"
        fadeDistance={90}
        infiniteGrid={false}
      />
      {paredes.map((w, i) => (
        <mesh key={i} position={w.p} rotation-y={w.r} raycast={naoClicavel}>
          <planeGeometry args={[w.w, altura]} />
          <meshStandardMaterial color="#9fb3c8" transparent opacity={0.05} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
      <lineSegments raycast={naoClicavel}>
        <edgesGeometry args={[new THREE.BoxGeometry(W, altura, D)]} />
        <lineBasicMaterial color="#3d5a78" transparent opacity={0.5} />
      </lineSegments>
    </group>
  )
}

export function ZonasPiso({ zonas, visiveis }: { zonas: ZonaPiso[]; visiveis: boolean }) {
  if (!visiveis) return null
  return (
    <>
      {zonas.map((z) => (
        <Html key={z.id} position={[z.x, 0.05, z.z]} center zIndexRange={[9, 0]}>
          <div className="rotulo-zona">{z.nome}</div>
        </Html>
      ))}
    </>
  )
}

function Empilhador() {
  return (
    <group>
      <mesh position={[0, 0.55, 0]}><boxGeometry args={[1.1, 0.7, 1.9]} /><meshStandardMaterial color="#3fbf96" roughness={0.5} /></mesh>
      <mesh position={[0, 0.6, -0.85]}><boxGeometry args={[1.1, 0.8, 0.4]} /><meshStandardMaterial color="#222a33" /></mesh>
      {[[-0.5, 1.45, -0.6], [0.5, 1.45, -0.6], [-0.5, 1.45, 0.45], [0.5, 1.45, 0.45]].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}><boxGeometry args={[0.06, 1.1, 0.06]} /><meshStandardMaterial color="#1b232c" /></mesh>
      ))}
      <mesh position={[0, 2.0, -0.07]}><boxGeometry args={[1.1, 0.06, 1.15]} /><meshStandardMaterial color="#1b232c" /></mesh>
      {[-0.35, 0.35].map((x) => (
        <mesh key={x} position={[x, 1.2, 1.05]}><boxGeometry args={[0.1, 2.3, 0.1]} /><meshStandardMaterial color="#2a3139" /></mesh>
      ))}
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} position={[x, 0.06, 1.65]}><boxGeometry args={[0.12, 0.05, 1.1]} /><meshStandardMaterial color="#2a3139" /></mesh>
      ))}
      {[[-0.55, 0.22, 0.6], [0.55, 0.22, 0.6], [-0.55, 0.22, -0.6], [0.55, 0.22, -0.6]].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.22, 0.22, 0.2, 16]} /><meshStandardMaterial color="#111" />
        </mesh>
      ))}
    </group>
  )
}

function Extintor() {
  return (
    <group>
      <mesh position={[0, 0.75, 0]}><boxGeometry args={[0.08, 1.5, 0.08]} /><meshStandardMaterial color="#d52b3f" /></mesh>
      <mesh position={[0, 0.01, 0]}><boxGeometry args={[0.45, 0.02, 0.45]} /><meshStandardMaterial color="#d52b3f" /></mesh>
      <mesh position={[0.13, 0.55, 0]}><cylinderGeometry args={[0.09, 0.09, 0.5, 14]} /><meshStandardMaterial color="#e3202f" /></mesh>
      <mesh position={[0, 1.45, 0]}><boxGeometry args={[0.25, 0.25, 0.02]} /><meshStandardMaterial color="#d52b3f" emissive="#5a0b13" /></mesh>
    </group>
  )
}

function Paletes({ n = 4 }: { n?: number }) {
  return (
    <group>
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} position={[0, 0.07 + i * 0.15, 0]}><boxGeometry args={[1.2, 0.13, 0.8]} /><meshStandardMaterial color="#a07a4e" roughness={0.9} /></mesh>
      ))}
    </group>
  )
}

function Elemento({ el }: { el: ElementoDecorativo }) {
  const rot = graus(el.rotacaoY ?? 0)
  const pos: [number, number, number] = [el.posicao.x, 0, el.posicao.z]
  let conteudo: React.ReactNode = null
  switch (el.tipo) {
    case 'empilhador': conteudo = <Empilhador />; break
    case 'extintor': conteudo = <Extintor />; break
    case 'paletes': conteudo = <Paletes n={el.quantidade} />; break
    case 'sacos':
      conteudo = Array.from({ length: el.quantidade ?? 2 }, (_, i) => (
        <group key={i} position={[0, 0, (i - 1) * 0.9]}>
          <mesh position={[0, 0.07, 0]}><boxGeometry args={[1.2, 0.13, 0.8]} /><meshStandardMaterial color="#a07a4e" /></mesh>
          <mesh position={[0, 0.75, 0]}><boxGeometry args={[1.1, 1.2, 0.75]} /><meshStandardMaterial color="#e9edf0" roughness={0.6} /></mesh>
        </group>
      ))
      break
    case 'caixotes':
      conteudo = Array.from({ length: el.quantidade ?? 1 }, (_, i) => (
        <group key={i} position={[(i - 0.5) * 1.1, 0, (i % 2) * 0.3 - 0.15]}>
          <mesh position={[0, 0.4, 0]}><boxGeometry args={[0.95, 0.8, 0.8]} /><meshStandardMaterial color="#9b7446" roughness={0.9} /></mesh>
          <mesh position={[0, 0.92, 0]}><boxGeometry args={[0.7, 0.25, 0.55]} /><meshStandardMaterial color="#9aa5b0" metalness={0.5} roughness={0.4} /></mesh>
        </group>
      ))
      break
    case 'caixas':
      conteudo = (
        <group>
          <Paletes n={1} />
          {Array.from({ length: el.quantidade ?? 2 }, (_, i) => (
            <mesh key={i} position={[(i % 2) * 0.55 - 0.27, 0.45 + Math.floor(i / 2) * 0.6, 0]}>
              <boxGeometry args={[0.5, 0.6, 0.6]} /><meshStandardMaterial color="#b98d5f" roughness={0.9} />
            </mesh>
          ))}
        </group>
      )
      break
    case 'portao':
      conteudo = (
        <mesh position={[0, 2.1, -0.02]}>
          <planeGeometry args={[el.largura ?? 4, 4.2]} />
          <meshStandardMaterial color="#e8eef3" transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )
      break
    case 'quadro-eletrico':
      conteudo = <mesh position={[0, 1.6, -0.1]}><boxGeometry args={[0.5, 0.8, 0.18]} /><meshStandardMaterial color="#5b6670" /></mesh>
      break
    case 'postigo':
      conteudo = (
        <mesh position={[0, 1.6, -0.05]}>
          <boxGeometry args={[1.1, 0.8, 0.08]} /><meshStandardMaterial color="#e8b923" />
        </mesh>
      )
      break
    case 'compartimento':
      // compartimento fechado (paredes brancas), com a janela/postigo e o quadro elétrico na face norte
      conteudo = (
        <mesh position={[0, 1.5, 0]}>
          <boxGeometry args={[el.largura ?? 4, 3, el.profundidade ?? 3]} />
          <meshStandardMaterial color="#d9e0e6" roughness={0.9} transparent opacity={0.55} depthWrite={false} />
          <Edges color="#9fb3c8" />
        </mesh>
      )
      break
    case 'bobina':
      conteudo = (
        <group>
          <mesh position={[0, 0.45, 0]}><cylinderGeometry args={[0.28, 0.28, 0.9, 16]} /><meshStandardMaterial color="#c49a63" /></mesh>
          <mesh position={[0, 0.92, 0]}><cylinderGeometry args={[0.6, 0.6, 0.05, 24]} /><meshStandardMaterial color="#2f7d55" /></mesh>
          <mesh position={[0, 0.03, 0]}><cylinderGeometry args={[0.6, 0.6, 0.05, 24]} /><meshStandardMaterial color="#2f7d55" /></mesh>
        </group>
      )
      break
    case 'porta-paletes-manual':
      conteudo = (
        <group>
          {[-0.18, 0.18].map((x) => (
            <mesh key={x} position={[x, 0.05, 0.5]}><boxGeometry args={[0.16, 0.08, 1.1]} /><meshStandardMaterial color="#e2b318" /></mesh>
          ))}
          <mesh position={[0, 0.6, -0.15]} rotation-x={-0.3}><boxGeometry args={[0.05, 1.1, 0.05]} /><meshStandardMaterial color="#e2b318" /></mesh>
        </group>
      )
      break
  }
  return (
    <group position={pos} rotation-y={rot} raycast={naoClicavel}>
      {conteudo}
    </group>
  )
}

export function Decoracao({ layout, rotulos }: { layout: Layout; rotulos: boolean }) {
  return (
    <>
      {layout.elementos.map((el) => (
        <group key={el.id}>
          <Elemento el={el} />
          {rotulos && el.rotulo && (el.tipo === 'portao' || el.tipo === 'compartimento') && (
            <Html position={[el.posicao.x, el.tipo === 'portao' ? 4.6 : 3.4, el.posicao.z]} center zIndexRange={[9, 0]}>
              <div className="rotulo-zona">{el.rotulo}</div>
            </Html>
          )}
        </group>
      ))}
    </>
  )
}
