"use client"

import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stats, Grid, Box, Sphere } from '@react-three/drei'
import * as THREE from 'three'

interface Particle {
  position: [number, number, number]
  velocity: [number, number, number]
  density: number
}

interface ParticleSystemProps {
  particles: Particle[]
  gridSize: [number, number, number]
  showVectors?: boolean
}

function ParticleSystem({ particles, gridSize, showVectors = false }: ParticleSystemProps) {
  const particlesRef = useRef<THREE.Points>(null)
  const vectorsRef = useRef<THREE.LineSegments>(null)
  
  // Create particle geometry
  const { positions, colors, velocities } = useMemo(() => {
    const positions = new Float32Array(particles.length * 3)
    const colors = new Float32Array(particles.length * 3)
    const velocities: [number, number, number][] = []
    
    particles.forEach((particle, i) => {
      // Position (normalized to -1 to 1 range)
      positions[i * 3] = (particle.position[0] / gridSize[0] - 0.5) * 2
      positions[i * 3 + 1] = (particle.position[1] / gridSize[1] - 0.5) * 2
      positions[i * 3 + 2] = (particle.position[2] / gridSize[2] - 0.5) * 2
      
      // Color based on velocity magnitude
      const speed = Math.sqrt(
        particle.velocity[0] ** 2 + 
        particle.velocity[1] ** 2 + 
        particle.velocity[2] ** 2
      )
      
      const normalizedSpeed = Math.min(speed / 10.0, 1.0)
      
      // Blue to red gradient
      colors[i * 3] = normalizedSpeed         // R
      colors[i * 3 + 1] = 0.5 * (1 - normalizedSpeed) // G
      colors[i * 3 + 2] = 1.0 - normalizedSpeed    // B
      
      velocities.push(particle.velocity)
    })
    
    return { positions, colors, velocities }
  }, [particles, gridSize])
  
  // Create velocity vectors
  const vectorGeometry = useMemo(() => {
    if (!showVectors) return null
    
    const vectorPositions: number[] = []
    const vectorColors: number[] = []
    
    particles.forEach((particle, i) => {
      const p = [
        (particle.position[0] / gridSize[0] - 0.5) * 2,
        (particle.position[1] / gridSize[1] - 0.5) * 2,
        (particle.position[2] / gridSize[2] - 0.5) * 2
      ]
      
      const vScale = 0.1
      const v = [
        particle.velocity[0] * vScale,
        particle.velocity[1] * vScale,
        particle.velocity[2] * vScale
      ]
      
      // Start point
      vectorPositions.push(p[0], p[1], p[2])
      vectorColors.push(1, 1, 1)
      
      // End point
      vectorPositions.push(p[0] + v[0], p[1] + v[1], p[2] + v[2])
      vectorColors.push(1, 0, 0)
    })
    
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vectorPositions, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(vectorColors, 3))
    
    return geometry
  }, [particles, gridSize, showVectors])
  
  // Animate particles
  useFrame((state) => {
    if (particlesRef.current) {
      // Subtle rotation for better visibility
      particlesRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.1
    }
  })
  
  return (
    <>
      {/* Particle cloud */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions.length / 3}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={colors.length / 3}
            array={colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.02}
          vertexColors
          transparent
          opacity={0.8}
          sizeAttenuation
        />
      </points>
      
      {/* Velocity vectors */}
      {showVectors && vectorGeometry && (
        <lineSegments ref={vectorsRef} geometry={vectorGeometry}>
          <lineBasicMaterial vertexColors transparent opacity={0.6} />
        </lineSegments>
      )}
    </>
  )
}

function ObstacleVisualization({ 
  obstacle 
}: { 
  obstacle: { type: string; position: number[]; radius?: number } 
}) {
  const gridSize = [64, 32, 32]
  
  const normalizedPos = [
    (obstacle.position[0] / gridSize[0] - 0.5) * 2,
    (obstacle.position[1] / gridSize[1] - 0.5) * 2,
    (obstacle.position[2] / gridSize[2] - 0.5) * 2
  ] as [number, number, number]
  
  const normalizedRadius = ((obstacle.radius || 5) / gridSize[0]) * 2
  
  if (obstacle.type === 'sphere') {
    return (
      <Sphere position={normalizedPos} args={[normalizedRadius, 32, 32]}>
        <meshStandardMaterial 
          color="#ff6b6b" 
          transparent 
          opacity={0.6}
          metalness={0.3}
          roughness={0.4}
        />
      </Sphere>
    )
  }
  
  return null
}

function GridBox({ gridSize }: { gridSize: [number, number, number] }) {
  return (
    <group>
      {/* Grid floor */}
      <Grid
        args={[20, 20]}
        position={[0, -1, 0]}
        cellSize={0.2}
        cellThickness={0.5}
        cellColor="#6e6e6e"
        sectionSize={1}
        sectionThickness={1}
        sectionColor="#3e3e3e"
        fadeDistance={30}
        fadeStrength={1}
      />
      
      {/* Bounding box */}
      <Box args={[2, 2, 2]}>
        <meshBasicMaterial 
          color="#333" 
          wireframe 
          transparent 
          opacity={0.2} 
        />
      </Box>
      
      {/* Axis helpers */}
      <axesHelper args={[1.5]} />
    </group>
  )
}

export interface AeroFlowParticleViewerProps {
  particles: Particle[]
  gridSize?: [number, number, number]
  obstacle?: { type: string; position: number[]; radius?: number }
  showVectors?: boolean
  showStats?: boolean
}

export function AeroFlowParticleViewer({
  particles,
  gridSize = [64, 32, 32],
  obstacle,
  showVectors = false,
  showStats = false
}: AeroFlowParticleViewerProps) {
  return (
    <div className="w-full h-full min-h-[600px] bg-gray-900 rounded-lg overflow-hidden">
      <Canvas
        camera={{ position: [3, 2, 3], fov: 50 }}
        gl={{ antialias: true }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[-10, -10, -5]} intensity={0.5} />
        
        {/* Scene */}
        <GridBox gridSize={gridSize} />
        
        {/* Particles */}
        {particles.length > 0 && (
          <ParticleSystem 
            particles={particles} 
            gridSize={gridSize}
            showVectors={showVectors}
          />
        )}
        
        {/* Obstacle */}
        {obstacle && <ObstacleVisualization obstacle={obstacle} />}
        
        {/* Controls */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
          minDistance={2}
          maxDistance={10}
        />
        
        {/* Stats */}
        {showStats && <Stats />}
      </Canvas>
      
      {/* Info overlay */}
      <div className="absolute top-4 left-4 bg-black/70 text-white px-4 py-2 rounded-lg text-sm">
        <div>Particles: {particles.length}</div>
        <div>Grid: {gridSize.join('×')}</div>
      </div>
    </div>
  )
}

