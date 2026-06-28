import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Html, Line, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import './BusinessCore3D.css'

// NOTE — unverified against installed package versions (sandbox can't
// install @react-three/fiber/drei to test). Two spots most likely to need a
// tweak once `npm install` actually runs locally:
//   1. PointerParallax reads `pointer` from useThree — that's the fiber v9
//      name. On fiber v8 it's `mouse` instead.
//   2. <Html>/<Line>/<Sparkles> are drei APIs that have shifted slightly
//      across major versions — if any prop throws, check the installed
//      drei version's docs for that component.

// Each node is a real link, not decoration — same convention as Nav.jsx's
// mega-menu (in-app features send a logged-out visitor to /signin since the
// feature itself lives behind auth). Academy is the one exception: it has
// its own public sales page already (/masterclass), so it goes straight there.
const MODULES = [
  { name: 'Wardog', color: '#5eead5', href: '/signin' },
  { name: 'Wallet', color: '#a78bfa', href: '/signin' },
  { name: 'Procure', color: '#60a5fa', href: '/signin' },
  { name: 'Fill', color: '#34d399', href: '/signin' },
  { name: 'Witness', color: '#fbbf24', href: '/signin' },
  { name: 'Academy', color: '#f472b6', href: '/masterclass' },
]

const RADIUS = 3.4

function reduceMotionPreferred() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function nodePosition(index, total) {
  const angle = (index / total) * Math.PI * 2
  return [Math.cos(angle) * RADIUS, Math.sin(angle * 1.3) * 0.6, Math.sin(angle) * RADIUS]
}

function ModuleNode({ index, total, name, color, href }) {
  const position = nodePosition(index, total)
  return (
    <Float speed={1.4} rotationIntensity={0.2} floatIntensity={0.6} position={position}>
      <mesh>
        <icosahedronGeometry args={[0.22, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} roughness={0.3} metalness={0.2} />
      </mesh>
      {/* pointerEvents re-enabled (drei's <Html> defaults it off) so this
          floating label is a real, clickable link, not just decoration. */}
      <Html center distanceFactor={9} style={{ pointerEvents: 'auto' }}>
        <a href={href} className="core-node-label" title={`Open ${name}`}>{name}</a>
      </Html>
    </Float>
  )
}

function Pulse({ from, to, delay }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current || reduceMotionPreferred()) return
    const t = ((clock.elapsedTime + delay) % 2.4) / 2.4
    ref.current.position.lerpVectors(new THREE.Vector3(...from), new THREE.Vector3(...to), t)
    ref.current.material.opacity = t < 0.08 || t > 0.92 ? 0 : 1
  })
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.05, 8, 8]} />
      <meshBasicMaterial color="#e6fbff" transparent />
    </mesh>
  )
}

function Connections() {
  return MODULES.map((m, i) => {
    const to = nodePosition(i, MODULES.length)
    const from = [0, 0, 0]
    return (
      <group key={m.name}>
        <Line points={[from, to]} color={m.color} transparent opacity={0.35} lineWidth={1} />
        <Pulse from={from} to={to} delay={i * 0.4} />
      </group>
    )
  })
}

function Core() {
  const ref = useRef()
  useFrame((_, delta) => {
    if (!ref.current || reduceMotionPreferred()) return
    ref.current.rotation.y += delta * 0.18
    ref.current.rotation.x += delta * 0.05
  })
  return (
    <group ref={ref}>
      <mesh>
        <icosahedronGeometry args={[1.05, 1]} />
        <meshStandardMaterial color="#0d9488" emissive="#1d9e75" emissiveIntensity={0.55} roughness={0.3} metalness={0.4} />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[1.18, 1]} />
        <meshBasicMaterial color="#5eead5" wireframe transparent opacity={0.25} />
      </mesh>
    </group>
  )
}

function PointerParallax({ children }) {
  const group = useRef()
  useFrame(({ pointer }) => {
    if (!group.current || reduceMotionPreferred()) return
    const targetY = pointer.x * 0.35
    const targetX = -pointer.y * 0.2
    group.current.rotation.y += (targetY - group.current.rotation.y) * 0.04
    group.current.rotation.x += (targetX - group.current.rotation.x) * 0.04
  })
  return <group ref={group}>{children}</group>
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[4, 4, 4]} intensity={1.1} color="#5eead5" />
      <pointLight position={[-4, -3, -2]} intensity={0.5} color="#60a5fa" />
      <Sparkles count={60} scale={9} size={1.4} speed={0.25} color="#bfe9ff" opacity={0.4} />
      <PointerParallax>
        <Core />
        <Connections />
        {MODULES.map((m, i) => (
          <ModuleNode key={m.name} index={i} total={MODULES.length} name={m.name} color={m.color} href={m.href} />
        ))}
      </PointerParallax>
    </>
  )
}

// "Business Core" — the 3D centerpiece for the hero. A glowing core mesh
// (FASS) with six orbiting module nodes (Wardog, Wallet, Procure, Fill,
// Witness, Academy) connected by lines that carry traveling light pulses —
// reads as "the operating system routes data between every part of the
// business." Subtle pointer parallax adds depth. Rotation/pulse animation
// bails out under prefers-reduced-motion, leaving the static composition.
export default function BusinessCore3D() {
  return (
    <div className="business-core-canvas-wrap">
      <Canvas dpr={[1, 1.6]} camera={{ position: [0, 0.6, 7.2], fov: 42 }} gl={{ antialias: true, alpha: true }}>
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  )
}
