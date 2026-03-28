"use client"

import { Suspense, useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import * as THREE from "three"

function SpinningBox() {
  const ref = useRef<THREE.Mesh>(null!)
  useFrame((_, delta) => {
    ref.current.rotation.x += delta * 0.5
    ref.current.rotation.y += delta * 0.7
  })
  return (
    <mesh ref={ref}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="hotpink" />
    </mesh>
  )
}

export default function TestR3FPage() {
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#111" }}>
      <h1 style={{ color: "white", padding: 16, position: "absolute", zIndex: 10 }}>
        R3F Test Page — Minimal
      </h1>
      <Canvas camera={{ position: [2, 2, 2] }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} />
        <Suspense fallback={null}>
          <SpinningBox />
          <OrbitControls />
        </Suspense>
      </Canvas>
    </div>
  )
}
