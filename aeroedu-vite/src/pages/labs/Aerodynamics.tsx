import { useState, useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { XRCanvas } from '../../components/ar/XRCanvas'
import { OrbitControls, Grid, Text } from '@react-three/drei'
import * as THREE from 'three'

interface Particle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  age: number
}

function AirfoilShape() {
  const meshRef = useRef<THREE.Group>(null)

  return (
    <group ref={meshRef}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[3, 0.5, 1]} />
        <meshStandardMaterial color="#1e40af" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.4, 0.8, 8]} />
        <meshStandardMaterial color="#1e40af" />
      </mesh>
    </group>
  )
}

function ParticleFlow({ windSpeed, angleOfAttack }: { windSpeed: number; angleOfAttack: number }) {
  const particlesRef = useRef<Particle[]>([])
  const groupRef = useRef<THREE.Group>(null)
  const particleMeshRef = useRef<THREE.InstancedMesh>(null)

  useEffect(() => {
    particlesRef.current = Array.from({ length: 200 }, () => ({
      position: new THREE.Vector3(Math.random() * 10 - 8, Math.random() * 4 - 2, Math.random() * 2 - 1),
      velocity: new THREE.Vector3(0, 0, 0),
      age: Math.random() * 100,
    }))
  }, [])

  useFrame(() => {
    const particles = particlesRef.current
    const speed = Math.max(windSpeed / 10, 0.1)

    particles.forEach((particle, idx) => {
      particle.age += 1
      particle.position.x += speed

      const distToAirfoil = Math.sqrt(particle.position.y ** 2 + particle.position.z ** 2)
      if (particle.position.x > -1.5 && particle.position.x < 1.5 && distToAirfoil < 1.5) {
        particle.velocity.y = Math.sin(angleOfAttack * 0.02) * speed * 0.5
        particle.position.y += particle.velocity.y
      }

      if (particle.position.x > 10) {
        particle.position.x = -8
        particle.position.y = Math.random() * 4 - 2
        particle.position.z = Math.random() * 2 - 1
        particle.age = 0
      }

      if (particleMeshRef.current) {
        particleMeshRef.current.setMatrixAt(idx, new THREE.Matrix4().setPosition(particle.position))
        const hue = Math.min(windSpeed / 50, 1)
        const color = new THREE.Color().setHSL(0.6 - hue * 0.6, 1, 0.5)
        particleMeshRef.current.setColorAt(idx, color)
      }
    })

    if (particleMeshRef.current) {
      particleMeshRef.current.instanceMatrix.needsUpdate = true
      if (particleMeshRef.current.instanceColor) particleMeshRef.current.instanceColor.needsUpdate = true
    }
  })

  return (
    <group ref={groupRef}>
      <instancedMesh ref={particleMeshRef} args={[new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshStandardMaterial(), 200]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#ff6b6b" />
      </instancedMesh>
    </group>
  )
}

function Scene({ windSpeed, angleOfAttack }: { windSpeed: number; angleOfAttack: number }) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 10]} intensity={1} />
      <Grid args={[20, 20]} cellSize={1} cellColor="#4f46e5" sectionSize={5} sectionColor="#1e40af" fadeStrength={0.3} />
      <AirfoilShape />
      <ParticleFlow windSpeed={windSpeed} angleOfAttack={angleOfAttack} />
      <OrbitControls />
    </>
  )
}

export default function Aerodynamics() {
  const [windSpeed, setWindSpeed] = useState(25)
  const [angleOfAttack, setAngleOfAttack] = useState(5)
  const [isPlaying, setIsPlaying] = useState(true)

  const cl = (angleOfAttack / 15) * 1.5
  const cd = 0.01 + (angleOfAttack ** 2) / 500
  const reynoldsNumber = (windSpeed * 1) / 0.000015

  return (
    <div className="w-full h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      <div className="absolute top-4 left-4 z-10">
        <h1 className="text-3xl font-bold text-indigo-400 mb-2">Aerodynamics Wind Tunnel</h1>
      </div>

      <XRCanvas className="w-full h-[70%]" camera={{ position: [0, 0, 12], fov: 60 }}>
        {isPlaying && <Scene windSpeed={windSpeed} angleOfAttack={angleOfAttack} />}
      </XRCanvas>

      <div className="absolute bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-indigo-500/30 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div>
              <label className="text-sm font-semibold text-indigo-300 block mb-2">Wind Speed (m/s)</label>
              <input
                type="range"
                min="0"
                max="50"
                value={windSpeed}
                onChange={(e) => setWindSpeed(Number(e.target.value))}
                className="w-full accent-indigo-500"
                disabled={!isPlaying}
              />
              <span className="text-indigo-400 font-bold">{windSpeed.toFixed(1)} m/s</span>
            </div>
            <div>
              <label className="text-sm font-semibold text-indigo-300 block mb-2">Angle of Attack (°)</label>
              <input
                type="range"
                min="-15"
                max="15"
                value={angleOfAttack}
                onChange={(e) => setAngleOfAttack(Number(e.target.value))}
                className="w-full accent-indigo-500"
                disabled={!isPlaying}
              />
              <span className="text-indigo-400 font-bold">{angleOfAttack}°</span>
            </div>
            <div className="flex gap-2 items-end">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-semibold"
              >
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button
                onClick={() => {
                  setWindSpeed(25)
                  setAngleOfAttack(5)
                }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-semibold"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="bg-slate-800 rounded p-3 border border-indigo-500/30">
              <p className="text-slate-400 text-xs">Lift Coefficient (CL)</p>
              <p className="text-indigo-300 font-bold text-lg">{cl.toFixed(3)}</p>
            </div>
            <div className="bg-slate-800 rounded p-3 border border-indigo-500/30">
              <p className="text-slate-400 text-xs">Drag Coefficient (CD)</p>
              <p className="text-indigo-300 font-bold text-lg">{cd.toFixed(4)}</p>
            </div>
            <div className="bg-slate-800 rounded p-3 border border-indigo-500/30">
              <p className="text-slate-400 text-xs">Reynolds Number</p>
              <p className="text-indigo-300 font-bold text-lg">{(reynoldsNumber / 1e6).toFixed(1)}M</p>
            </div>
            <div className="bg-slate-800 rounded p-3 border border-indigo-500/30">
              <p className="text-slate-400 text-xs">L/D Ratio</p>
              <p className="text-indigo-300 font-bold text-lg">{(cl / cd).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
