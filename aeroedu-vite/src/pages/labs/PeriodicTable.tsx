/**
 * PeriodicTable — Bảng tuần hoàn tương tác museum-grade
 *
 * Route: /dashboard/periodic-table (sidebar dưới Graph Lab)
 *
 * Aesthetic refs (theo user):
 *   - "Things We Take" framed boxes — typography hierarchy minimalist
 *   - Acrylic specimen cubes — glassmorphism với refraction
 *   - "Encoding Landscape" posters — dark cinematic + đối tượng float
 *
 * 3 sections:
 *   1. Periodic Table 2D — framed shadow boxes, mass top-left + atomic# top-right + symbol center
 *   2. 3D Atom Viewer — atom inside transparent acrylic cube, R3F refraction
 *   3. Detail Card — full museum-style framed card với "ELEMENT FACTS" panel
 */
import { useState, useMemo, useRef, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars, MeshTransmissionMaterial, Environment } from '@react-three/drei'
import { ChevronLeft, Atom } from 'lucide-react'
import { Link } from 'react-router-dom'
import * as THREE from 'three'

// ── Element data ─────────────────────────────────────────────
type Category =
  | 'alkali' | 'alkali-earth' | 'transition' | 'post-transition'
  | 'metalloid' | 'nonmetal' | 'halogen' | 'noble' | 'lanthanide'

const CATEGORY_META: Record<Category, { label: string; color: string; glow: string }> = {
  'alkali':         { label: 'Alkali Metal',       color: '#ff6b6b', glow: '#ff8787' },
  'alkali-earth':   { label: 'Alkaline Earth',     color: '#ffd166', glow: '#ffe066' },
  'transition':     { label: 'Transition Metal',   color: '#ff9f1c', glow: '#ffb845' },
  'post-transition':{ label: 'Post-transition',    color: '#a8dadc', glow: '#caffff' },
  'metalloid':      { label: 'Metalloid',          color: '#06d6a0', glow: '#5ef5c5' },
  'nonmetal':       { label: 'Nonmetal',           color: '#118ab2', glow: '#3fbbe0' },
  'halogen':        { label: 'Halogen',            color: '#c77dff', glow: '#e0aaff' },
  'noble':          { label: 'Noble Gas',          color: '#9d4edd', glow: '#c77dff' },
  'lanthanide':     { label: 'Lanthanide',         color: '#f72585', glow: '#ff70a6' },
}

interface Element {
  z: number
  symbol: string
  name: string
  nameVi: string
  category: Category
  mass: number
  electronConfig: string
  shells: number[]
  meltK: number | null
  boilK: number | null
  density: number | null
  electronegativity: number | null
  discoveredBy: string
  uses: string
  period: number
  group: number
}

const ELEMENTS: Element[] = [
  // Period 1
  { z: 1, symbol: 'H', name: 'Hydrogen', nameVi: 'Hydro', category: 'nonmetal', mass: 1.008, electronConfig: '1s¹', shells: [1], meltK: 14, boilK: 20, density: 0.00009, electronegativity: 2.20, discoveredBy: 'Henry Cavendish (1766)', uses: 'Nhiên liệu, ammonia, năng lượng sạch', period: 1, group: 1 },
  { z: 2, symbol: 'He', name: 'Helium', nameVi: 'Heli', category: 'noble', mass: 4.003, electronConfig: '1s²', shells: [2], meltK: null, boilK: 4, density: 0.00018, electronegativity: null, discoveredBy: 'Janssen & Lockyer (1868)', uses: 'Bóng bay, MRI, hàn TIG', period: 1, group: 18 },
  // Period 2
  { z: 3, symbol: 'Li', name: 'Lithium', nameVi: 'Lithi', category: 'alkali', mass: 6.94, electronConfig: '[He] 2s¹', shells: [2, 1], meltK: 454, boilK: 1603, density: 0.534, electronegativity: 0.98, discoveredBy: 'Arfvedson (1817)', uses: 'Pin Li-ion, hợp kim nhẹ', period: 2, group: 1 },
  { z: 4, symbol: 'Be', name: 'Beryllium', nameVi: 'Beri', category: 'alkali-earth', mass: 9.012, electronConfig: '[He] 2s²', shells: [2, 2], meltK: 1560, boilK: 2742, density: 1.85, electronegativity: 1.57, discoveredBy: 'Vauquelin (1798)', uses: 'Hợp kim hàng không, X-ray', period: 2, group: 2 },
  { z: 5, symbol: 'B', name: 'Boron', nameVi: 'Bo', category: 'metalloid', mass: 10.81, electronConfig: '[He] 2s² 2p¹', shells: [2, 3], meltK: 2349, boilK: 4200, density: 2.34, electronegativity: 2.04, discoveredBy: 'Davy, Gay-Lussac (1808)', uses: 'Thủy tinh borosilicate, pyrex', period: 2, group: 13 },
  { z: 6, symbol: 'C', name: 'Carbon', nameVi: 'Cacbon', category: 'nonmetal', mass: 12.01, electronConfig: '[He] 2s² 2p²', shells: [2, 4], meltK: 3823, boilK: 4098, density: 2.27, electronegativity: 2.55, discoveredBy: 'Cổ đại', uses: 'Cơ sở sự sống, kim cương, graphene', period: 2, group: 14 },
  { z: 7, symbol: 'N', name: 'Nitrogen', nameVi: 'Nitơ', category: 'nonmetal', mass: 14.01, electronConfig: '[He] 2s² 2p³', shells: [2, 5], meltK: 63, boilK: 77, density: 0.00125, electronegativity: 3.04, discoveredBy: 'Rutherford (1772)', uses: '78% khí quyển, phân bón', period: 2, group: 15 },
  { z: 8, symbol: 'O', name: 'Oxygen', nameVi: 'Oxy', category: 'nonmetal', mass: 16.00, electronConfig: '[He] 2s² 2p⁴', shells: [2, 6], meltK: 54, boilK: 90, density: 0.00143, electronegativity: 3.44, discoveredBy: 'Priestley & Scheele (1774)', uses: 'Hô hấp, đốt cháy, luyện thép', period: 2, group: 16 },
  { z: 9, symbol: 'F', name: 'Fluorine', nameVi: 'Flo', category: 'halogen', mass: 19.00, electronConfig: '[He] 2s² 2p⁵', shells: [2, 7], meltK: 53, boilK: 85, density: 0.00170, electronegativity: 3.98, discoveredBy: 'Moissan (1886)', uses: 'Kem đánh răng, Teflon', period: 2, group: 17 },
  { z: 10, symbol: 'Ne', name: 'Neon', nameVi: 'Neon', category: 'noble', mass: 20.18, electronConfig: '[He] 2s² 2p⁶', shells: [2, 8], meltK: 25, boilK: 27, density: 0.00090, electronegativity: null, discoveredBy: 'Ramsay & Travers (1898)', uses: 'Đèn neon, laser He-Ne', period: 2, group: 18 },
  // Period 3
  { z: 11, symbol: 'Na', name: 'Sodium', nameVi: 'Natri', category: 'alkali', mass: 22.99, electronConfig: '[Ne] 3s¹', shells: [2, 8, 1], meltK: 371, boilK: 1156, density: 0.97, electronegativity: 0.93, discoveredBy: 'Davy (1807)', uses: 'Muối ăn (NaCl), xút (NaOH)', period: 3, group: 1 },
  { z: 12, symbol: 'Mg', name: 'Magnesium', nameVi: 'Magie', category: 'alkali-earth', mass: 24.31, electronConfig: '[Ne] 3s²', shells: [2, 8, 2], meltK: 923, boilK: 1363, density: 1.74, electronegativity: 1.31, discoveredBy: 'Black, Davy (1755)', uses: 'Hợp kim nhẹ, pháo hoa, chlorophyll', period: 3, group: 2 },
  { z: 13, symbol: 'Al', name: 'Aluminum', nameVi: 'Nhôm', category: 'post-transition', mass: 26.98, electronConfig: '[Ne] 3s² 3p¹', shells: [2, 8, 3], meltK: 933, boilK: 2792, density: 2.70, electronegativity: 1.61, discoveredBy: 'Ørsted (1825)', uses: 'Vỏ máy bay, lon, dây điện', period: 3, group: 13 },
  { z: 14, symbol: 'Si', name: 'Silicon', nameVi: 'Silic', category: 'metalloid', mass: 28.09, electronConfig: '[Ne] 3s² 3p²', shells: [2, 8, 4], meltK: 1687, boilK: 3538, density: 2.33, electronegativity: 1.90, discoveredBy: 'Berzelius (1824)', uses: 'Chip vi xử lý, pin mặt trời, thủy tinh', period: 3, group: 14 },
  { z: 15, symbol: 'P', name: 'Phosphorus', nameVi: 'Photpho', category: 'nonmetal', mass: 30.97, electronConfig: '[Ne] 3s² 3p³', shells: [2, 8, 5], meltK: 317, boilK: 553, density: 1.82, electronegativity: 2.19, discoveredBy: 'Brand (1669)', uses: 'DNA/RNA, ATP, phân bón, diêm', period: 3, group: 15 },
  { z: 16, symbol: 'S', name: 'Sulfur', nameVi: 'Lưu huỳnh', category: 'nonmetal', mass: 32.06, electronConfig: '[Ne] 3s² 3p⁴', shells: [2, 8, 6], meltK: 388, boilK: 717, density: 2.07, electronegativity: 2.58, discoveredBy: 'Cổ đại', uses: 'Axit sulfuric, lưu hoá cao su', period: 3, group: 16 },
  { z: 17, symbol: 'Cl', name: 'Chlorine', nameVi: 'Clo', category: 'halogen', mass: 35.45, electronConfig: '[Ne] 3s² 3p⁵', shells: [2, 8, 7], meltK: 172, boilK: 239, density: 0.00321, electronegativity: 3.16, discoveredBy: 'Scheele (1774)', uses: 'Khử trùng nước, PVC, muối ăn', period: 3, group: 17 },
  { z: 18, symbol: 'Ar', name: 'Argon', nameVi: 'Argon', category: 'noble', mass: 39.95, electronConfig: '[Ne] 3s² 3p⁶', shells: [2, 8, 8], meltK: 84, boilK: 87, density: 0.00178, electronegativity: null, discoveredBy: 'Rayleigh & Ramsay (1894)', uses: 'Khí trơ, bóng đèn, laser', period: 3, group: 18 },
  // Period 4 (selected)
  { z: 19, symbol: 'K', name: 'Potassium', nameVi: 'Kali', category: 'alkali', mass: 39.10, electronConfig: '[Ar] 4s¹', shells: [2, 8, 8, 1], meltK: 337, boilK: 1032, density: 0.86, electronegativity: 0.82, discoveredBy: 'Davy (1807)', uses: 'Phân bón NPK, sinh học tế bào', period: 4, group: 1 },
  { z: 20, symbol: 'Ca', name: 'Calcium', nameVi: 'Canxi', category: 'alkali-earth', mass: 40.08, electronConfig: '[Ar] 4s²', shells: [2, 8, 8, 2], meltK: 1115, boilK: 1757, density: 1.55, electronegativity: 1.00, discoveredBy: 'Davy (1808)', uses: 'Xương răng, xi măng, vôi', period: 4, group: 2 },
  { z: 22, symbol: 'Ti', name: 'Titanium', nameVi: 'Titan', category: 'transition', mass: 47.87, electronConfig: '[Ar] 3d² 4s²', shells: [2, 8, 10, 2], meltK: 1941, boilK: 3560, density: 4.51, electronegativity: 1.54, discoveredBy: 'Gregor (1791)', uses: 'Hàng không vũ trụ, y tế, sơn TiO2', period: 4, group: 4 },
  { z: 26, symbol: 'Fe', name: 'Iron', nameVi: 'Sắt', category: 'transition', mass: 55.85, electronConfig: '[Ar] 3d⁶ 4s²', shells: [2, 8, 14, 2], meltK: 1811, boilK: 3134, density: 7.87, electronegativity: 1.83, discoveredBy: 'Cổ đại', uses: 'Thép, hemoglobin, lõi Trái Đất', period: 4, group: 8 },
  { z: 29, symbol: 'Cu', name: 'Copper', nameVi: 'Đồng', category: 'transition', mass: 63.55, electronConfig: '[Ar] 3d¹⁰ 4s¹', shells: [2, 8, 18, 1], meltK: 1358, boilK: 2835, density: 8.96, electronegativity: 1.90, discoveredBy: 'Cổ đại', uses: 'Dây điện, ống nước, đồng tiền', period: 4, group: 11 },
  { z: 30, symbol: 'Zn', name: 'Zinc', nameVi: 'Kẽm', category: 'transition', mass: 65.38, electronConfig: '[Ar] 3d¹⁰ 4s²', shells: [2, 8, 18, 2], meltK: 693, boilK: 1180, density: 7.14, electronegativity: 1.65, discoveredBy: 'Marggraf (1746)', uses: 'Mạ chống gỉ, pin, brass', period: 4, group: 12 },
  { z: 35, symbol: 'Br', name: 'Bromine', nameVi: 'Brom', category: 'halogen', mass: 79.90, electronConfig: '[Ar] 3d¹⁰ 4s² 4p⁵', shells: [2, 8, 18, 7], meltK: 266, boilK: 332, density: 3.12, electronegativity: 2.96, discoveredBy: 'Balard (1826)', uses: 'Chống cháy, thuốc nhuộm, AgBr', period: 4, group: 17 },
  { z: 36, symbol: 'Kr', name: 'Krypton', nameVi: 'Krypton', category: 'noble', mass: 83.80, electronConfig: '[Ar] 3d¹⁰ 4s² 4p⁶', shells: [2, 8, 18, 8], meltK: 116, boilK: 120, density: 0.00375, electronegativity: 3.00, discoveredBy: 'Ramsay & Travers (1898)', uses: 'Đèn flash, laser excimer', period: 4, group: 18 },
  // Period 5 (selected)
  { z: 40, symbol: 'Zr', name: 'Zirconium', nameVi: 'Zirconi', category: 'transition', mass: 91.22, electronConfig: '[Kr] 4d² 5s²', shells: [2, 8, 18, 10, 2], meltK: 2128, boilK: 4682, density: 6.51, electronegativity: 1.33, discoveredBy: 'Klaproth (1789)', uses: 'Lò phản ứng hạt nhân, gốm răng, kim hoàn', period: 5, group: 4 },
  { z: 47, symbol: 'Ag', name: 'Silver', nameVi: 'Bạc', category: 'transition', mass: 107.87, electronConfig: '[Kr] 4d¹⁰ 5s¹', shells: [2, 8, 18, 18, 1], meltK: 1235, boilK: 2435, density: 10.49, electronegativity: 1.93, discoveredBy: 'Cổ đại', uses: 'Trang sức, dẫn điện tốt nhất, phim ảnh', period: 5, group: 11 },
  { z: 53, symbol: 'I', name: 'Iodine', nameVi: 'Iốt', category: 'halogen', mass: 126.90, electronConfig: '[Kr] 4d¹⁰ 5s² 5p⁵', shells: [2, 8, 18, 18, 7], meltK: 387, boilK: 457, density: 4.93, electronegativity: 2.66, discoveredBy: 'Courtois (1811)', uses: 'Tuyến giáp, khử trùng, muối iốt', period: 5, group: 17 },
  { z: 54, symbol: 'Xe', name: 'Xenon', nameVi: 'Xenon', category: 'noble', mass: 131.29, electronConfig: '[Kr] 4d¹⁰ 5s² 5p⁶', shells: [2, 8, 18, 18, 8], meltK: 161, boilK: 165, density: 0.00588, electronegativity: 2.60, discoveredBy: 'Ramsay & Travers (1898)', uses: 'Đèn flash, gây mê, ion thruster', period: 5, group: 18 },
  // Period 6 (selected)
  { z: 74, symbol: 'W', name: 'Tungsten', nameVi: 'Vonfram', category: 'transition', mass: 183.84, electronConfig: '[Xe] 4f¹⁴ 5d⁴ 6s²', shells: [2, 8, 18, 32, 12, 2], meltK: 3695, boilK: 6203, density: 19.25, electronegativity: 2.36, discoveredBy: 'Elhuyar bros (1783)', uses: 'Dây tóc bóng đèn, mũi khoan', period: 6, group: 6 },
  { z: 78, symbol: 'Pt', name: 'Platinum', nameVi: 'Bạch kim', category: 'transition', mass: 195.08, electronConfig: '[Xe] 4f¹⁴ 5d⁹ 6s¹', shells: [2, 8, 18, 32, 17, 1], meltK: 2041, boilK: 4098, density: 21.45, electronegativity: 2.28, discoveredBy: 'Ulloa (1735)', uses: 'Trang sức, xúc tác, điện cực', period: 6, group: 10 },
  { z: 79, symbol: 'Au', name: 'Gold', nameVi: 'Vàng', category: 'transition', mass: 196.97, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s¹', shells: [2, 8, 18, 32, 18, 1], meltK: 1337, boilK: 3129, density: 19.30, electronegativity: 2.54, discoveredBy: 'Cổ đại', uses: 'Trang sức, dự trữ tiền tệ, điện tử', period: 6, group: 11 },
  { z: 80, symbol: 'Hg', name: 'Mercury', nameVi: 'Thủy ngân', category: 'transition', mass: 200.59, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s²', shells: [2, 8, 18, 32, 18, 2], meltK: 234, boilK: 630, density: 13.53, electronegativity: 2.00, discoveredBy: 'Cổ đại', uses: 'Nhiệt kế, đèn huỳnh quang, lỏng', period: 6, group: 12 },
  { z: 82, symbol: 'Pb', name: 'Lead', nameVi: 'Chì', category: 'post-transition', mass: 207.20, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p²', shells: [2, 8, 18, 32, 18, 4], meltK: 600, boilK: 2022, density: 11.34, electronegativity: 1.87, discoveredBy: 'Cổ đại', uses: 'Pin axit-chì, chắn phóng xạ', period: 6, group: 14 },
  // Period 7 (selected)
  { z: 92, symbol: 'U', name: 'Uranium', nameVi: 'Urani', category: 'lanthanide', mass: 238.03, electronConfig: '[Rn] 5f³ 6d¹ 7s²', shells: [2, 8, 18, 32, 21, 9, 2], meltK: 1405, boilK: 4404, density: 19.05, electronegativity: 1.38, discoveredBy: 'Klaproth (1789)', uses: 'Nhiên liệu hạt nhân, đo địa chất', period: 7, group: 0 },
]

// ── 3D Atom Components ──────────────────────────────────────
function Nucleus({ size, color }: { size: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (ref.current) {
      const t = clock.getElapsedTime()
      ref.current.scale.setScalar(1 + Math.sin(t * 2) * 0.04)
    }
  })
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[size, 48, 48]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={1.5}
        roughness={0.2}
        metalness={0.6}
      />
      <pointLight color={color} intensity={4} distance={10} />
    </mesh>
  )
}

function ElectronShell({
  radius, electronCount, tilt, speed, color,
}: {
  radius: number; electronCount: number; tilt: number; speed: number; color: string;
}) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * speed
      groupRef.current.rotation.x += delta * speed * 0.3
    }
  })

  const orbitCurve = useMemo(() => {
    const points: THREE.Vector3[] = []
    const segments = 96
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius))
    }
    return new THREE.BufferGeometry().setFromPoints(points)
  }, [radius])

  return (
    <group ref={groupRef} rotation={[tilt, 0, tilt * 0.5]}>
      <line>
        <primitive object={orbitCurve} attach="geometry" />
        <lineBasicMaterial color={color} transparent opacity={0.35} />
      </line>
      {Array.from({ length: electronCount }).map((_, i) => {
        const angle = (i / electronCount) * Math.PI * 2
        const x = Math.cos(angle) * radius
        const z = Math.sin(angle) * radius
        return (
          <mesh key={i} position={[x, 0, z]}>
            <sphereGeometry args={[0.085, 16, 16]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={3}
              toneMapped={false}
            />
            <pointLight color={color} intensity={0.5} distance={2} />
          </mesh>
        )
      })}
    </group>
  )
}

// Acrylic cube container — like museum specimen blocks (ref image 1, 2)
function GlassCube({ size = 7 }: { size?: number }) {
  return (
    <mesh>
      <boxGeometry args={[size, size, size]} />
      <MeshTransmissionMaterial
        thickness={0.5}
        roughness={0.05}
        transmission={1}
        ior={1.5}
        chromaticAberration={0.04}
        backside
        backsideThickness={0.3}
        samples={4}
        resolution={256}
        anisotropy={0.3}
      />
    </mesh>
  )
}

function AtomScene({ element }: { element: Element }) {
  const meta = CATEGORY_META[element.category]
  const nucleusSize = useMemo(() => 0.4 + Math.min(element.z / 100, 0.8), [element.z])

  return (
    <>
      {/* Studio-grade 3-point lighting like museum display */}
      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 8, 5]} intensity={0.8} color="#ffffff" />
      <directionalLight position={[-5, 3, -5]} intensity={0.3} color={meta.glow} />
      <pointLight position={[0, -3, 3]} intensity={0.4} color="#ffffff" />

      {/* Far starfield (deep space backdrop) */}
      <Stars radius={80} depth={80} count={4000} factor={3} fade speed={0.5} />

      {/* Atom centred — nucleus + orbits */}
      <Nucleus size={nucleusSize} color={meta.glow} />
      {element.shells.map((electronCount, shellIdx) => {
        const radius = 1.5 + shellIdx * 0.95
        const tilt = (shellIdx * Math.PI) / element.shells.length * 1.2 + shellIdx * 0.3
        const speed = 1.6 / (shellIdx + 1)
        return (
          <ElectronShell
            key={shellIdx}
            radius={radius}
            electronCount={electronCount}
            tilt={tilt}
            speed={speed}
            color={meta.glow}
          />
        )
      })}

      {/* Reflective floor — gives the museum-display feel */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4.5, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial
          color="#0a0a0a"
          metalness={0.95}
          roughness={0.25}
        />
      </mesh>

      {/* Subtle environment for transmission material */}
      <Suspense fallback={null}>
        <Environment preset="night" />
      </Suspense>

      {/* Acrylic cube containing the atom */}
      <GlassCube size={7} />
    </>
  )
}

// ── 2D Element Card — "Things We Take" inspired (ref image 3, 4) ─────
function ElementCard({ el, onClick, selected }: { el: Element; onClick: () => void; selected: boolean }) {
  const meta = CATEGORY_META[el.category]
  return (
    <button
      onClick={onClick}
      className="relative group transition-all"
      style={{
        gridColumn: el.group,
        gridRow: el.period,
      }}
      title={`${el.name} (${el.nameVi})`}
    >
      <div
        className="aspect-square p-1 flex flex-col transition-all"
        style={{
          // "Shadow box" frame — minimal museum-style
          background: selected
            ? `linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.4))`
            : 'rgba(255,255,255,0.025)',
          border: `1px solid ${selected ? meta.color : 'rgba(255,255,255,0.08)'}`,
          boxShadow: selected
            ? `0 0 28px ${meta.glow}50, inset 0 0 16px ${meta.glow}20, 0 6px 24px rgba(0,0,0,0.5)`
            : '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 12px rgba(0,0,0,0.3)',
          transform: selected ? 'translateY(-2px) scale(1.06)' : 'scale(1)',
          borderRadius: '2px',
        }}
      >
        {/* Top row: mass (left tiny) + atomic # (right big) */}
        <div className="flex items-start justify-between leading-none">
          <div className="text-[7px] md:text-[8px] tabular-nums opacity-50" style={{ color: '#fff' }}>
            {el.mass.toFixed(2)}
          </div>
          <div className="text-[10px] md:text-xs font-black tabular-nums" style={{ color: meta.color }}>
            {el.z}
          </div>
        </div>

        {/* Symbol — bold like museum spec */}
        <div className="flex-1 flex items-center justify-center">
          <span
            className="text-lg md:text-2xl font-black leading-none"
            style={{
              color: '#ffffff',
              textShadow: selected ? `0 0 12px ${meta.glow}` : 'none',
              fontFamily: '"Inter", "Helvetica Neue", sans-serif',
              letterSpacing: '-0.04em',
            }}
          >
            {el.symbol}
          </span>
        </div>

        {/* Bottom: element name */}
        <div className="text-[7px] md:text-[8px] opacity-70 truncate text-center"
          style={{ color: '#fff', letterSpacing: '0.04em' }}>
          {el.name}
        </div>

        {/* Category color bar (bottom accent) */}
        <div className="h-0.5 mt-0.5 transition-opacity"
          style={{
            background: meta.color,
            opacity: selected ? 1 : 0.5,
            boxShadow: selected ? `0 0 6px ${meta.glow}` : 'none',
          }} />
      </div>
    </button>
  )
}

// ── Detail Card — "Things We Take" museum-frame style ───────────────
function DetailCard({ element }: { element: Element }) {
  const meta = CATEGORY_META[element.category]

  return (
    <div
      className="rounded-sm p-5 md:p-6"
      style={{
        background: 'linear-gradient(180deg, #0f0f12 0%, #06060a 100%)',
        border: `1px solid rgba(255,255,255,0.08)`,
        boxShadow: `
          0 30px 60px -20px rgba(0,0,0,0.8),
          0 0 0 1px rgba(255,255,255,0.04),
          inset 0 0 80px ${meta.glow}10
        `,
      }}
    >
      {/* Top row: mass (left, small) + atomic # (right, HUGE) */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-2xl md:text-3xl font-bold tabular-nums text-white leading-none">
            {element.mass.toFixed(3)}
          </div>
          <div className="flex gap-3 mt-2 text-[10px] tabular-nums text-white/50">
            <span>
              <span className="text-white/80">{element.meltK ? element.meltK : '—'}</span>
              <span className="ml-1 text-white/40">melt</span>
            </span>
            <span>
              <span className="text-white/80">{element.electronegativity != null ? element.electronegativity : '—'}</span>
              <span className="ml-1 text-white/40">EN</span>
            </span>
          </div>
        </div>
        <div
          className="text-5xl md:text-6xl font-black tabular-nums leading-none"
          style={{
            color: '#ffffff',
            letterSpacing: '-0.04em',
            fontFamily: '"Inter", "Helvetica Neue", sans-serif',
          }}
        >
          {element.z}
        </div>
      </div>

      {/* HUGE Symbol */}
      <div
        className="text-[8rem] md:text-[10rem] font-black leading-none mb-2"
        style={{
          color: '#ffffff',
          textShadow: `0 0 60px ${meta.glow}60`,
          letterSpacing: '-0.06em',
          fontFamily: '"Inter", "Helvetica Neue", sans-serif',
        }}
      >
        {element.symbol}
      </div>

      {/* Name + category */}
      <div className="mb-5">
        <div className="text-2xl md:text-3xl font-bold text-white leading-tight"
          style={{ letterSpacing: '-0.02em' }}>
          {element.name}
        </div>
        <div className="text-sm text-white/50 mt-0.5">{element.nameVi}</div>

        {/* Category tag bar */}
        <div className="mt-3 flex items-center gap-2">
          <div className="h-0.5 flex-1" style={{ background: meta.color, boxShadow: `0 0 8px ${meta.glow}` }} />
          <div className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: meta.color }}>
            {meta.label}
          </div>
        </div>
      </div>

      {/* ELEMENT FACTS panel — like "Things We Take" */}
      <div className="space-y-1 text-[11px] mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-white/60 mb-2">
          Element Facts
        </div>

        <FactRow label="Electron config" value={element.electronConfig} mono />
        <FactRow label="Shells (K · L · M ...)" value={`[ ${element.shells.join('  ·  ')} ]`} mono />
        <FactRow
          label="Melting point"
          value={element.meltK ? `${element.meltK} K  /  ${(element.meltK - 273.15).toFixed(0)}°C` : '—'}
        />
        <FactRow
          label="Boiling point"
          value={element.boilK ? `${element.boilK} K  /  ${(element.boilK - 273.15).toFixed(0)}°C` : '—'}
        />
        <FactRow
          label="Density"
          value={element.density != null ? `${element.density} g/cm³` : '—'}
        />
        <FactRow
          label="Electronegativity"
          value={element.electronegativity != null ? `${element.electronegativity} (Pauling)` : '—'}
        />
        <FactRow label="Discovered" value={element.discoveredBy} />
      </div>

      {/* Uses */}
      <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-white/60 mb-2">
          Common Uses
        </div>
        <p className="text-xs text-white/80 leading-relaxed">{element.uses}</p>
      </div>

      {/* Shell breakdown viz — Bohr style minimal */}
      <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-white/60 mb-3">
          Electron Distribution
        </div>
        <div className="flex items-end gap-1.5 h-12">
          {element.shells.map((count, i) => {
            const maxCount = Math.max(...element.shells)
            const heightPercent = (count / maxCount) * 100
            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                <div className="text-[9px] font-bold tabular-nums text-white/80">{count}</div>
                <div
                  className="w-full rounded-sm transition-all"
                  style={{
                    height: `${heightPercent}%`,
                    background: `linear-gradient(180deg, ${meta.color}, ${meta.color}40)`,
                    boxShadow: `0 0 8px ${meta.glow}40`,
                  }}
                />
                <div className="text-[8px] uppercase text-white/40 tracking-wider">K{i + 1}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function FactRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-3 py-1">
      <div className="text-[10px] text-white/40 w-32 flex-shrink-0">{label}</div>
      <div className="flex-1 h-px border-b border-dotted border-white/10" />
      <div className={`text-[11px] text-white/90 ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────
export default function PeriodicTable() {
  const [selected, setSelected] = useState<Element>(ELEMENTS[5]) // Carbon as default

  return (
    <div className="min-h-screen relative overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse 80% 60% at 50% 0%, #1a1a2e 0%, transparent 50%),
          radial-gradient(ellipse 60% 80% at 80% 50%, ${CATEGORY_META[selected.category].color}10 0%, transparent 60%),
          linear-gradient(180deg, #050507 0%, #000000 100%)
        `,
        fontFamily: '"Inter", "Helvetica Neue", system-ui, sans-serif',
      }}>
      {/* Inter font import (already Google-Font ready) */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800;900&display=swap" rel="stylesheet" />

      <div className="relative max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Header — minimal like Encoding Landscape poster */}
        <div className="mb-8 flex items-center justify-between flex-wrap gap-3">
          <Link to="/dashboard/graph-lab"
            className="inline-flex items-center gap-1.5 text-[10px] text-white/40 hover:text-white/80 transition uppercase tracking-[0.2em]">
            <ChevronLeft className="w-3 h-3" /> Graph Lab
          </Link>
          <div className="text-center">
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white"
              style={{ letterSpacing: '-0.04em' }}>
              PERIODIC<span className="text-white/30"> · </span>TABLE
            </h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mt-1">
              An interactive specimen archive · inphysic.com
            </p>
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
            {String(selected.z).padStart(3, '0')} / 118
          </span>
        </div>

        {/* Category legend — minimalist dotted line */}
        <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] uppercase tracking-wider">
          {Object.entries(CATEGORY_META).map(([key, m]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className="w-2 h-2"
                style={{
                  background: m.color,
                  boxShadow: `0 0 8px ${m.glow}80`,
                }} />
              <span className="text-white/60">{m.label}</span>
            </div>
          ))}
        </div>

        {/* Periodic Table 2D grid — 18 columns × 7 rows */}
        <div className="grid gap-1 mb-10 overflow-x-auto pb-2"
          style={{
            gridTemplateColumns: 'repeat(18, minmax(44px, 1fr))',
            gridTemplateRows: 'repeat(7, auto)',
          }}>
          {ELEMENTS.map(el => (
            <ElementCard
              key={el.z}
              el={el}
              onClick={() => setSelected(el)}
              selected={selected.z === el.z}
            />
          ))}
        </div>

        {/* 3D Acrylic specimen + Detail card */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* 3D Atom in Glass Cube — like museum display */}
          <div className="lg:col-span-3 relative overflow-hidden"
            style={{
              background: '#000000',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '2px',
              minHeight: '520px',
              boxShadow: `
                0 30px 60px -20px rgba(0,0,0,0.8),
                inset 0 0 120px ${CATEGORY_META[selected.category].glow}10
              `,
            }}>
            {/* Header strip — like specimen label */}
            <div className="absolute top-0 left-0 right-0 z-10 px-5 py-3 flex items-center justify-between"
              style={{
                background: 'linear-gradient(180deg, rgba(0,0,0,0.6), transparent)',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}>
              <div className="flex items-center gap-2 text-[10px] text-white/60 uppercase tracking-[0.2em]">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{
                    background: CATEGORY_META[selected.category].color,
                    boxShadow: `0 0 8px ${CATEGORY_META[selected.category].glow}`,
                  }} />
                Specimen · {selected.symbol} · {String(selected.z).padStart(3, '0')}
              </div>
              <div className="text-[10px] text-white/30 uppercase tracking-wider">
                R3F Acrylic Display
              </div>
            </div>

            {/* Footer hint */}
            <div className="absolute bottom-3 left-0 right-0 z-10 flex justify-between px-5 text-[9px] text-white/30 uppercase tracking-[0.2em]">
              <span>Drag · Rotate</span>
              <span>Scroll · Zoom</span>
            </div>

            <Suspense fallback={
              <div className="absolute inset-0 flex items-center justify-center text-white/40 text-xs uppercase tracking-widest">
                Loading specimen…
              </div>
            }>
              <Canvas
                camera={{ position: [0, 2, 10], fov: 50 }}
                gl={{ antialias: true, alpha: false }}
                style={{ background: '#000' }}
                dpr={[1, 2]}
              >
                <color attach="background" args={['#000000']} />
                <fog attach="fog" args={['#000000', 12, 30]} />
                <AtomScene element={selected} />
                <OrbitControls
                  enablePan={false}
                  minDistance={4}
                  maxDistance={22}
                  autoRotate
                  autoRotateSpeed={0.4}
                />
              </Canvas>
            </Suspense>
          </div>

          {/* Detail Card */}
          <div className="lg:col-span-2">
            <DetailCard element={selected} />
          </div>
        </div>

        {/* Bottom signature */}
        <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-between text-[9px] uppercase tracking-[0.3em] text-white/30">
          <span>An interactive periodic specimen archive</span>
          <span className="flex items-center gap-2">
            <Atom className="w-3 h-3" />
            inphysic · 2026
          </span>
        </div>
      </div>
    </div>
  )
}
