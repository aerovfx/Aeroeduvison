'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, ContactShadows, Environment, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

/* ── Shoe 3D Model ── */
function Shoe() {
  const ref = useRef<THREE.Group>(null!)
  const { nodes, materials } = useGLTF('/models/shoe-draco.glb') as any
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [items, setItems] = useState({
    laces: '#ffffff',
    mesh: '#ffffff',
    caps: '#ffffff',
    inner: '#ffffff',
    sole: '#ffffff',
    stripes: '#ffffff',
    band: '#ffffff',
    patch: '#ffffff',
  })

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (!ref.current) return
    ref.current.rotation.set(Math.cos(t / 4) / 8, Math.sin(t / 4) / 8, -0.2 - (1 + Math.sin(t / 1.5)) / 20)
    ref.current.position.y = (1 + Math.sin(t / 1.5)) / 10
  })

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto'
    return () => { document.body.style.cursor = 'auto' }
  }, [hovered])

  const handleColorChange = useCallback((color: string) => {
    if (selected) {
      setItems(prev => ({ ...prev, [selected]: color }))
    }
  }, [selected])

  const COLORS = ['#ff0000', '#00ff00', '#0066ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff', '#000000', '#ff6600', '#9933ff', '#333333', '#666666']

  return (
    <>
      <group
        ref={ref}
        onPointerOver={(e) => { e.stopPropagation(); setHovered((e.object as THREE.Mesh).material && ((e.object as THREE.Mesh).material as THREE.MeshStandardMaterial).name || null) }}
        onPointerOut={(e) => { if (e.intersections.length === 0) setHovered(null) }}
        onPointerMissed={() => setSelected(null)}
        onClick={(e) => { e.stopPropagation(); setSelected(((e.object as THREE.Mesh).material as THREE.MeshStandardMaterial)?.name || null) }}
      >
        <mesh receiveShadow castShadow geometry={nodes.shoe.geometry} material={materials.laces} material-color={items.laces} />
        <mesh receiveShadow castShadow geometry={nodes.shoe_1.geometry} material={materials.mesh} material-color={items.mesh} />
        <mesh receiveShadow castShadow geometry={nodes.shoe_2.geometry} material={materials.caps} material-color={items.caps} />
        <mesh receiveShadow castShadow geometry={nodes.shoe_3.geometry} material={materials.inner} material-color={items.inner} />
        <mesh receiveShadow castShadow geometry={nodes.shoe_4.geometry} material={materials.sole} material-color={items.sole} />
        <mesh receiveShadow castShadow geometry={nodes.shoe_5.geometry} material={materials.stripes} material-color={items.stripes} />
        <mesh receiveShadow castShadow geometry={nodes.shoe_6.geometry} material={materials.band} material-color={items.band} />
        <mesh receiveShadow castShadow geometry={nodes.shoe_7.geometry} material={materials.patch} material-color={items.patch} />
      </group>

      {/* HTML overlay for color picker */}
      {selected && (
        <group>
          {/* We handle the picker via an HTML overlay */}
        </group>
      )}

      {/* Pass state up via a portal-like approach */}
      <ShoeHUD selected={selected} items={items} onColorChange={handleColorChange} hovered={hovered} />
    </>
  )
}

/* ── HUD overlay rendered as HTML ── */
function ShoeHUD({ selected, items, onColorChange, hovered }: {
  selected: string | null
  items: Record<string, string>
  onColorChange: (color: string) => void
  hovered: string | null
}) {
  // We use Html from drei but for simplicity, let's handle it in the parent
  return null
}

/* ── Shoe Configurator (standalone with Canvas) ── */
export function ShoeConfiguratorScene() {
  const [selected, setSelected] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [items, setItems] = useState({
    laces: '#ffffff',
    mesh: '#ffffff',
    caps: '#ffffff',
    inner: '#ffffff',
    sole: '#ffffff',
    stripes: '#ffffff',
    band: '#ffffff',
    patch: '#ffffff',
  })

  const COLORS = ['#ff0000', '#00ff00', '#0066ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff', '#000000', '#ff6600', '#9933ff', '#333333', '#666666']
  const PARTS = ['laces', 'mesh', 'caps', 'inner', 'sole', 'stripes', 'band', 'patch']

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas shadows camera={{ position: [0, 0, 4], fov: 45 }}>
        <ambientLight intensity={0.7} />
        <spotLight intensity={0.5} angle={0.1} penumbra={1} position={[10, 15, 10]} castShadow />
        <ShoeModel items={items} setSelected={setSelected} setHovered={setHovered} />
        <Environment preset="city" />
        <ContactShadows position={[0, -0.8, 0]} opacity={0.25} scale={10} blur={1.5} far={0.8} />
        <OrbitControls minPolarAngle={Math.PI / 2} maxPolarAngle={Math.PI / 2} enableZoom={false} enablePan={false} />
      </Canvas>

      {/* Color picker overlay */}
      <div style={{
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.85)',
        borderRadius: 16,
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div style={{ color: '#fff', fontSize: 12, fontWeight: 600, opacity: 0.8 }}>
          {selected ? `Editing: ${selected}` : hovered ? `Hover: ${hovered}` : 'Click a shoe part to customize'}
        </div>

        {/* Part selector pills */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
          {PARTS.map(part => (
            <button
              key={part}
              onClick={() => setSelected(part)}
              style={{
                padding: '3px 8px',
                borderRadius: 8,
                border: selected === part ? '2px solid #60a5fa' : '1px solid rgba(255,255,255,0.2)',
                background: selected === part ? 'rgba(96,165,250,0.2)' : 'rgba(255,255,255,0.05)',
                color: '#fff',
                fontSize: 10,
                cursor: 'pointer',
              }}
            >
              <span style={{
                display: 'inline-block',
                width: 8, height: 8,
                borderRadius: '50%',
                background: items[part as keyof typeof items],
                marginRight: 4,
                border: '1px solid rgba(255,255,255,0.3)',
              }} />
              {part}
            </button>
          ))}
        </div>

        {/* Color swatches */}
        {selected && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {COLORS.map(color => (
              <button
                key={color}
                onClick={() => setItems(prev => ({ ...prev, [selected]: color }))}
                style={{
                  width: 24, height: 24,
                  borderRadius: '50%',
                  background: color,
                  border: items[selected as keyof typeof items] === color ? '3px solid #60a5fa' : '2px solid rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Shoe model used inside Canvas ── */
function ShoeModel({ items, setSelected, setHovered }: {
  items: Record<string, string>
  setSelected: (v: string | null) => void
  setHovered: (v: string | null) => void
}) {
  const ref = useRef<THREE.Group>(null!)
  const { nodes, materials } = useGLTF('/models/shoe-draco.glb') as any

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (!ref.current) return
    ref.current.rotation.set(Math.cos(t / 4) / 8, Math.sin(t / 4) / 8, -0.2 - (1 + Math.sin(t / 1.5)) / 20)
    ref.current.position.y = (1 + Math.sin(t / 1.5)) / 10
  })

  return (
    <group
      ref={ref}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(((e.object as THREE.Mesh).material as THREE.MeshStandardMaterial)?.name || null) }}
      onPointerOut={(e) => { if (e.intersections.length === 0) setHovered(null) }}
      onPointerMissed={() => setSelected(null)}
      onClick={(e) => { e.stopPropagation(); setSelected(((e.object as THREE.Mesh).material as THREE.MeshStandardMaterial)?.name || null) }}
    >
      <mesh receiveShadow castShadow geometry={nodes.shoe.geometry} material={materials.laces} material-color={items.laces} />
      <mesh receiveShadow castShadow geometry={nodes.shoe_1.geometry} material={materials.mesh} material-color={items.mesh} />
      <mesh receiveShadow castShadow geometry={nodes.shoe_2.geometry} material={materials.caps} material-color={items.caps} />
      <mesh receiveShadow castShadow geometry={nodes.shoe_3.geometry} material={materials.inner} material-color={items.inner} />
      <mesh receiveShadow castShadow geometry={nodes.shoe_4.geometry} material={materials.sole} material-color={items.sole} />
      <mesh receiveShadow castShadow geometry={nodes.shoe_5.geometry} material={materials.stripes} material-color={items.stripes} />
      <mesh receiveShadow castShadow geometry={nodes.shoe_6.geometry} material={materials.band} material-color={items.band} />
      <mesh receiveShadow castShadow geometry={nodes.shoe_7.geometry} material={materials.patch} material-color={items.patch} />
    </group>
  )
}

/* ── Simple Shoe Display (sandbox wrapper without picker) ── */
export function ShoeDisplayScene() {
  const ref = useRef<THREE.Group>(null!)
  const { nodes, materials } = useGLTF('/models/shoe-draco.glb') as any

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (!ref.current) return
    ref.current.rotation.set(Math.cos(t / 4) / 8, Math.sin(t / 4) / 8, -0.2 - (1 + Math.sin(t / 1.5)) / 20)
    ref.current.position.y = (1 + Math.sin(t / 1.5)) / 10
  })

  return (
    <>
      <ambientLight intensity={0.7} />
      <spotLight intensity={0.5} angle={0.1} penumbra={1} position={[10, 15, 10]} castShadow />
      <group ref={ref}>
        <mesh receiveShadow castShadow geometry={nodes.shoe.geometry} material={materials.laces} />
        <mesh receiveShadow castShadow geometry={nodes.shoe_1.geometry} material={materials.mesh} />
        <mesh receiveShadow castShadow geometry={nodes.shoe_2.geometry} material={materials.caps} />
        <mesh receiveShadow castShadow geometry={nodes.shoe_3.geometry} material={materials.inner} />
        <mesh receiveShadow castShadow geometry={nodes.shoe_4.geometry} material={materials.sole} />
        <mesh receiveShadow castShadow geometry={nodes.shoe_5.geometry} material={materials.stripes} />
        <mesh receiveShadow castShadow geometry={nodes.shoe_6.geometry} material={materials.band} />
        <mesh receiveShadow castShadow geometry={nodes.shoe_7.geometry} material={materials.patch} />
      </group>
      <ContactShadows position={[0, -0.8, 0]} opacity={0.25} scale={10} blur={1.5} far={0.8} />
      <Environment preset="city" />
      <OrbitControls minPolarAngle={Math.PI / 2} maxPolarAngle={Math.PI / 2} enableZoom={false} enablePan={false} />
    </>
  )
}
