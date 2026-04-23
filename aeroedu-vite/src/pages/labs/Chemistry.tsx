import { useState, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

type MoleculeType = 'h2o' | 'co2' | 'nacl' | 'benzene'

interface Atom {
  position: [number, number, number]
  element: string
  radius: number
  color: string
}

interface Bond {
  start: [number, number, number]
  end: [number, number, number]
  order: number
}

const molecules: Record<MoleculeType, { atoms: Atom[]; bonds: Bond[]; formula: string; name: string; weight: number; angles: string }> = {
  h2o: {
    atoms: [
      { position: [0, 0, 0], element: 'O', radius: 0.7, color: '#ff4444' },
      { position: [-0.96, 0, 0.27], element: 'H', radius: 0.4, color: '#ffffff' },
      { position: [0.96, 0, 0.27], element: 'H', radius: 0.4, color: '#ffffff' },
    ],
    bonds: [
      { start: [0, 0, 0], end: [-0.96, 0, 0.27], order: 1 },
      { start: [0, 0, 0], end: [0.96, 0, 0.27], order: 1 },
    ],
    formula: 'H₂O',
    name: 'Water',
    weight: 18.02,
    angles: '104.5°',
  },
  co2: {
    atoms: [
      { position: [-1.2, 0, 0], element: 'O', radius: 0.7, color: '#ff4444' },
      { position: [0, 0, 0], element: 'C', radius: 0.6, color: '#333333' },
      { position: [1.2, 0, 0], element: 'O', radius: 0.7, color: '#ff4444' },
    ],
    bonds: [
      { start: [-1.2, 0, 0], end: [0, 0, 0], order: 2 },
      { start: [0, 0, 0], end: [1.2, 0, 0], order: 2 },
    ],
    formula: 'CO₂',
    name: 'Carbon Dioxide',
    weight: 44.01,
    angles: '180°',
  },
  nacl: {
    atoms: [
      { position: [-0.6, 0, 0], element: 'Na', radius: 0.65, color: '#ffff00' },
      { position: [0.6, 0, 0], element: 'Cl', radius: 0.75, color: '#00ff00' },
    ],
    bonds: [{ start: [-0.6, 0, 0], end: [0.6, 0, 0], order: 1 }],
    formula: 'NaCl',
    name: 'Sodium Chloride',
    weight: 58.44,
    angles: 'Ionic',
  },
  benzene: {
    atoms: [
      { position: [1.2, 0, 0], element: 'C', radius: 0.6, color: '#333333' },
      { position: [0.6, 1.04, 0], element: 'C', radius: 0.6, color: '#333333' },
      { position: [-0.6, 1.04, 0], element: 'C', radius: 0.6, color: '#333333' },
      { position: [-1.2, 0, 0], element: 'C', radius: 0.6, color: '#333333' },
      { position: [-0.6, -1.04, 0], element: 'C', radius: 0.6, color: '#333333' },
      { position: [0.6, -1.04, 0], element: 'C', radius: 0.6, color: '#333333' },
    ],
    bonds: [
      { start: [1.2, 0, 0], end: [0.6, 1.04, 0], order: 1 },
      { start: [0.6, 1.04, 0], end: [-0.6, 1.04, 0], order: 2 },
      { start: [-0.6, 1.04, 0], end: [-1.2, 0, 0], order: 1 },
      { start: [-1.2, 0, 0], end: [-0.6, -1.04, 0], order: 2 },
      { start: [-0.6, -1.04, 0], end: [0.6, -1.04, 0], order: 1 },
      { start: [0.6, -1.04, 0], end: [1.2, 0, 0], order: 2 },
    ],
    formula: 'C₆H₆',
    name: 'Benzene',
    weight: 78.11,
    angles: '120°',
  },
}

function MoleculeView({ moleculeType }: { moleculeType: MoleculeType }) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.x += 0.003
      groupRef.current.rotation.y += 0.005
    }
  })

  const mol = molecules[moleculeType]

  return (
    <group ref={groupRef}>
      {mol.bonds.map((bond, idx) => {
        const start = new THREE.Vector3(...bond.start)
        const end = new THREE.Vector3(...bond.end)
        const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
        const distance = start.distanceTo(end)
        const direction = new THREE.Vector3().subVectors(end, start).normalize()

        return (
          <mesh key={`bond-${idx}`} position={[mid.x, mid.y, mid.z]} rotation={[0, 0, Math.atan2(direction.y, direction.x)]}>
            <cylinderGeometry args={[bond.order === 1 ? 0.1 : 0.15, bond.order === 1 ? 0.1 : 0.15, distance, 8]} />
            <meshStandardMaterial color="#888888" />
          </mesh>
        )
      })}

      {mol.atoms.map((atom, idx) => (
        <mesh key={`atom-${idx}`} position={atom.position}>
          <sphereGeometry args={[atom.radius, 32, 32]} />
          <meshStandardMaterial color={atom.color} metalness={0.4} roughness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

function Scene({ moleculeType }: { moleculeType: MoleculeType }) {
  return (
    <>
      <ambientLight intensity={0.7} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, 10]} intensity={0.5} />
      <MoleculeView moleculeType={moleculeType} />
      <OrbitControls autoRotate autoRotateSpeed={4} />
    </>
  )
}

export default function Chemistry() {
  const [moleculeType, setMoleculeType] = useState<MoleculeType>('h2o')
  const mol = molecules[moleculeType]

  const buttonClass = (type: MoleculeType) =>
    `px-4 py-2 rounded font-semibold transition-all ${
      moleculeType === type ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
    }`

  return (
    <div className="w-full h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      <div className="absolute top-4 left-4 z-10">
        <h1 className="text-3xl font-bold text-indigo-400">Molecular Viewer</h1>
      </div>

      <Canvas className="w-full h-[75%]" camera={{ position: [0, 0, 5], fov: 50 }}>
        <Scene moleculeType={moleculeType} />
      </Canvas>

      <div className="absolute bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-indigo-500/30 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-3 mb-6">
            {(['h2o', 'co2', 'nacl', 'benzene'] as MoleculeType[]).map((type) => (
              <button key={type} onClick={() => setMoleculeType(type)} className={buttonClass(type)}>
                {type.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="bg-slate-800 rounded p-3 border border-indigo-500/30">
              <p className="text-slate-400 text-xs uppercase tracking-wide">Molecule</p>
              <p className="text-indigo-300 font-bold text-lg">{mol.name}</p>
            </div>
            <div className="bg-slate-800 rounded p-3 border border-indigo-500/30">
              <p className="text-slate-400 text-xs uppercase tracking-wide">Formula</p>
              <p className="text-indigo-300 font-bold text-lg">{mol.formula}</p>
            </div>
            <div className="bg-slate-800 rounded p-3 border border-indigo-500/30">
              <p className="text-slate-400 text-xs uppercase tracking-wide">Molecular Weight</p>
              <p className="text-indigo-300 font-bold text-lg">{mol.weight} g/mol</p>
            </div>
            <div className="bg-slate-800 rounded p-3 border border-indigo-500/30">
              <p className="text-slate-400 text-xs uppercase tracking-wide">Bond Angle</p>
              <p className="text-indigo-300 font-bold text-lg">{mol.angles}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
