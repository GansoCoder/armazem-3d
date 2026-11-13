import { Edges, Grid, Html } from '@react-three/drei'
import { useMemo } from 'react'
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
  const contorno = useMemo(
    () => layout.edificio.contorno ?? [{ x: xMin, z: zMin }, { x: xMax, z: zMin }, { x: xMax, z: zMax }, { x: xMin, z: zMax }],
    [layout.edificio.contorno, xMin, xMax, zMin, zMax],
  )

  // segmentos de parede: o contorno e as paredes interiores (entre zonas/salas)
  const segmentos = useMemo(
    () => [
      ...contorno.map((a, i) => ({ a, b: contorno[(i + 1) % contorno.length] })),
      ...(layout.edificio.paredes ?? []).map((p) => ({ a: p.de, b: p.ate })),
    ],
    [contorno, layout.edificio.paredes],
  )

  const { chao, fora, arestas } = useMemo(() => {
    // o plano do chão é desenhado em xy e rodado −90° em x: y do desenho = −z do mundo
    const forma = new THREE.Shape(contorno.map((p) => new THREE.Vector2(p.x, -p.z)))
    // o que fica dentro do retângulo envolvente mas fora das paredes (tapa a grelha)
    const exterior = new THREE.Shape([
      new THREE.Vector2(xMin, -zMin), new THREE.Vector2(xMax, -zMin), new THREE.Vector2(xMax, -zMax), new THREE.Vector2(xMin, -zMax),
    ])
    exterior.holes.push(new THREE.Path(contorno.map((p) => new THREE.Vector2(p.x, -p.z))))
    const pts: number[] = []
    for (const { a, b } of segmentos) {
      for (const y of [0, altura]) pts.push(a.x, y, a.z, b.x, y, b.z)
      pts.push(a.x, 0, a.z, a.x, altura, a.z, b.x, 0, b.z, b.x, altura, b.z)
    }
    const linhas = new THREE.BufferGeometry()
    linhas.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return { chao: new THREE.ShapeGeometry(forma), fora: new THREE.ShapeGeometry(exterior), arestas: linhas }
  }, [contorno, segmentos, altura, xMin, xMax, zMin, zMax])

  const paredes = segmentos.map(({ a, b }) => {
    return { p: [(a.x + b.x) / 2, altura / 2, (a.z + b.z) / 2] as [number, number, number], r: -Math.atan2(b.z - a.z, b.x - a.x), w: Math.hypot(b.x - a.x, b.z - a.z) }
  })

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} geometry={chao} raycast={naoClicavel}>
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
      <mesh rotation-x={-Math.PI / 2} position-y={0.008} geometry={fora} raycast={naoClicavel}>
        <meshBasicMaterial color="#0e2133" />
      </mesh>
      {paredes.map((w, i) => (
        <mesh key={i} position={w.p} rotation-y={w.r} raycast={naoClicavel}>
          <planeGeometry args={[w.w, altura]} />
          <meshStandardMaterial color="#9fb3c8" transparent opacity={0.05} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
      <lineSegments geometry={arestas} raycast={naoClicavel}>
        <lineBasicMaterial color="#3d5a78" transparent opacity={0.6} />
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
        <mesh position={[0, (el.altura ?? 4.2) / 2, -0.02]}>
          <planeGeometry args={[el.largura ?? 4, el.altura ?? 4.2]} />
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
    case 'mesa': {
      // mesa de trabalho (tampo de madeira, pés metálicos); largura ao longo de x local
      const w = el.largura ?? 1.2
      const d = el.profundidade ?? 0.6
      conteudo = (
        <group>
          <mesh position={[0, 0.74, 0]}><boxGeometry args={[w, 0.04, d]} /><meshStandardMaterial color="#c8a06a" roughness={0.8} /></mesh>
          {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
            <mesh key={i} position={[sx * (w / 2 - 0.05), 0.36, sz * (d / 2 - 0.05)]}><boxGeometry args={[0.04, 0.72, 0.04]} /><meshStandardMaterial color="#4a5560" /></mesh>
          ))}
        </group>
      )
      break
    }
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
            <Html position={[el.posicao.x, el.tipo === 'portao' ? (el.altura ?? 4.2) + 0.4 : 3.4, el.posicao.z]} center zIndexRange={[9, 0]}>
              <div className="rotulo-zona">{el.rotulo}</div>
            </Html>
          )}
        </group>
      ))}
    </>
  )
}
