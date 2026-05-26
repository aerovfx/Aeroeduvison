/**
 * PeriodicTable — Bảng tuần hoàn tương tác với React Three Fiber
 *
 * Route: /dashboard/periodic-table (sidebar dưới Graph Lab)
 *
 * 3 sections:
 *   1. Bảng tuần hoàn 2D — 34+ nguyên tố tiêu biểu, glassmorphism, neon theo nhóm
 *   2. 3D Atom Viewer — R3F Canvas với nucleus + electron orbits quay thực sự
 *   3. Info Panel — cấu hình electron, melt/boil, density, electronegativity
 *
 * Aesthetic: Dark deep-space, Orbitron font, neon accent theo nhóm
 */
import { useState, useMemo, useRef, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { Atom, Info, Thermometer, Wind, Zap as ZapIcon, ChevronLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import * as THREE from 'three'

// ── Element data ─────────────────────────────────────────────
type Category =
  | 'alkali' | 'alkali-earth' | 'transition' | 'post-transition'
  | 'metalloid' | 'nonmetal' | 'halogen' | 'noble' | 'lanthanide'

const CATEGORY_META: Record<Category, { label: string; color: string; glow: string; bg: string }> = {
  'alkali':         { label: 'Kim loại kiềm',     color: '#ff6b6b', glow: '#ff8787', bg: 'rgba(255,107,107,0.15)' },
  'alkali-earth':   { label: 'Kiềm thổ',          color: '#ffd166', glow: '#ffe066', bg: 'rgba(255,209,102,0.15)' },
  'transition':     { label: 'KL chuyển tiếp',    color: '#ff9f1c', glow: '#ffb845', bg: 'rgba(255,159,28,0.15)' },
  'post-transition':{ label: 'KL hậu chuyển tiếp', color: '#a8dadc', glow: '#caffff', bg: 'rgba(168,218,220,0.15)' },
  'metalloid':      { label: 'Bán kim loại',      color: '#06d6a0', glow: '#5ef5c5', bg: 'rgba(6,214,160,0.15)' },
  'nonmetal':       { label: 'Phi kim',           color: '#118ab2', glow: '#3fbbe0', bg: 'rgba(17,138,178,0.15)' },
  'halogen':        { label: 'Halogen',           color: '#c77dff', glow: '#e0aaff', bg: 'rgba(199,125,255,0.15)' },
  'noble':          { label: 'Khí hiếm',          color: '#9d4edd', glow: '#c77dff', bg: 'rgba(157,78,221,0.15)' },
  'lanthanide':     { label: 'Lanthanide',        color: '#f72585', glow: '#ff70a6', bg: 'rgba(247,37,133,0.15)' },
}

interface Element {
  z: number
  symbol: string
  name: string
  nameVi: string
  category: Category
  mass: number
  electronConfig: string      // e.g. "1s2 2s2 2p6"
  shells: number[]            // e.g. [2, 8, 1]
  meltK: number | null
  boilK: number | null
  density: number | null      // g/cm³
  electronegativity: number | null  // Pauling 0-4
  discoveredBy: string
  uses: string
  // Grid position (period, group)
  period: number
  group: number               // 1-18, 0 = lanthanide bar
}

const ELEMENTS: Element[] = [
  // Period 1
  { z: 1, symbol: 'H', name: 'Hydrogen', nameVi: 'Hydro', category: 'nonmetal', mass: 1.008, electronConfig: '1s¹', shells: [1], meltK: 14, boilK: 20, density: 0.00009, electronegativity: 2.20, discoveredBy: 'Henry Cavendish (1766)', uses: 'Nhiên liệu, ammonia, năng lượng sạch', period: 1, group: 1 },
  { z: 2, symbol: 'He', name: 'Helium', nameVi: 'Heli', category: 'noble', mass: 4.003, electronConfig: '1s²', shells: [2], meltK: null, boilK: 4, density: 0.00018, electronegativity: null, discoveredBy: 'Janssen & Lockyer (1868)', uses: 'Bóng bay, MRI, hàn TIG', period: 1, group: 18 },
  // Period 2
  { z: 3, symbol: 'Li', name: 'Lithium', nameVi: 'Lithi', category: 'alkali', mass: 6.94, electronConfig: '[He] 2s¹', shells: [2, 1], meltK: 454, boilK: 1603, density: 0.534, electronegativity: 0.98, discoveredBy: 'Arfvedson (1817)', uses: 'Pin Li-ion, hợp kim nhẹ, thuốc trầm cảm', period: 2, group: 1 },
  { z: 4, symbol: 'Be', name: 'Beryllium', nameVi: 'Beri', category: 'alkali-earth', mass: 9.012, electronConfig: '[He] 2s²', shells: [2, 2], meltK: 1560, boilK: 2742, density: 1.85, electronegativity: 1.57, discoveredBy: 'Vauquelin (1798)', uses: 'Hợp kim hàng không, X-ray, lò phản ứng', period: 2, group: 2 },
  { z: 5, symbol: 'B', name: 'Boron', nameVi: 'Bo', category: 'metalloid', mass: 10.81, electronConfig: '[He] 2s² 2p¹', shells: [2, 3], meltK: 2349, boilK: 4200, density: 2.34, electronegativity: 2.04, discoveredBy: 'Davy, Gay-Lussac (1808)', uses: 'Thủy tinh borosilicate, pyrex, chất chống cháy', period: 2, group: 13 },
  { z: 6, symbol: 'C', name: 'Carbon', nameVi: 'Cacbon', category: 'nonmetal', mass: 12.01, electronConfig: '[He] 2s² 2p²', shells: [2, 4], meltK: 3823, boilK: 4098, density: 2.27, electronegativity: 2.55, discoveredBy: 'Cổ đại', uses: 'Cơ sở sự sống, kim cương, graphene, polymer', period: 2, group: 14 },
  { z: 7, symbol: 'N', name: 'Nitrogen', nameVi: 'Nitơ', category: 'nonmetal', mass: 14.01, electronConfig: '[He] 2s² 2p³', shells: [2, 5], meltK: 63, boilK: 77, density: 0.00125, electronegativity: 3.04, discoveredBy: 'Rutherford (1772)', uses: '78% khí quyển, ammonia, phân bón, làm lạnh', period: 2, group: 15 },
  { z: 8, symbol: 'O', name: 'Oxygen', nameVi: 'Oxy', category: 'nonmetal', mass: 16.00, electronConfig: '[He] 2s² 2p⁴', shells: [2, 6], meltK: 54, boilK: 90, density: 0.00143, electronegativity: 3.44, discoveredBy: 'Priestley & Scheele (1774)', uses: 'Hô hấp, đốt cháy, y tế, luyện thép', period: 2, group: 16 },
  { z: 9, symbol: 'F', name: 'Fluorine', nameVi: 'Flo', category: 'halogen', mass: 19.00, electronConfig: '[He] 2s² 2p⁵', shells: [2, 7], meltK: 53, boilK: 85, density: 0.00170, electronegativity: 3.98, discoveredBy: 'Moissan (1886)', uses: 'Kem đánh răng (fluoride), Teflon, uranium hexafluoride', period: 2, group: 17 },
  { z: 10, symbol: 'Ne', name: 'Neon', nameVi: 'Neon', category: 'noble', mass: 20.18, electronConfig: '[He] 2s² 2p⁶', shells: [2, 8], meltK: 25, boilK: 27, density: 0.00090, electronegativity: null, discoveredBy: 'Ramsay & Travers (1898)', uses: 'Đèn neon, laser He-Ne, làm lạnh cryogenic', period: 2, group: 18 },
  // Period 3
  { z: 11, symbol: 'Na', name: 'Sodium', nameVi: 'Natri', category: 'alkali', mass: 22.99, electronConfig: '[Ne] 3s¹', shells: [2, 8, 1], meltK: 371, boilK: 1156, density: 0.97, electronegativity: 0.93, discoveredBy: 'Davy (1807)', uses: 'Muối ăn (NaCl), xút (NaOH), đèn natri', period: 3, group: 1 },
  { z: 12, symbol: 'Mg', name: 'Magnesium', nameVi: 'Magie', category: 'alkali-earth', mass: 24.31, electronConfig: '[Ne] 3s²', shells: [2, 8, 2], meltK: 923, boilK: 1363, density: 1.74, electronegativity: 1.31, discoveredBy: 'Black, Davy (1755)', uses: 'Hợp kim nhẹ, pháo hoa, chlorophyll (lá xanh)', period: 3, group: 2 },
  { z: 13, symbol: 'Al', name: 'Aluminum', nameVi: 'Nhôm', category: 'post-transition', mass: 26.98, electronConfig: '[Ne] 3s² 3p¹', shells: [2, 8, 3], meltK: 933, boilK: 2792, density: 2.70, electronegativity: 1.61, discoveredBy: 'Ørsted (1825)', uses: 'Vỏ máy bay, lon, dây điện, kim loại phổ biến nhất', period: 3, group: 13 },
  { z: 14, symbol: 'Si', name: 'Silicon', nameVi: 'Silic', category: 'metalloid', mass: 28.09, electronConfig: '[Ne] 3s² 3p²', shells: [2, 8, 4], meltK: 1687, boilK: 3538, density: 2.33, electronegativity: 1.90, discoveredBy: 'Berzelius (1824)', uses: 'Chip vi xử lý, pin mặt trời, thủy tinh, gốm sứ', period: 3, group: 14 },
  { z: 15, symbol: 'P', name: 'Phosphorus', nameVi: 'Photpho', category: 'nonmetal', mass: 30.97, electronConfig: '[Ne] 3s² 3p³', shells: [2, 8, 5], meltK: 317, boilK: 553, density: 1.82, electronegativity: 2.19, discoveredBy: 'Brand (1669)', uses: 'DNA/RNA, ATP, phân bón, diêm, pháo hoa', period: 3, group: 15 },
  { z: 16, symbol: 'S', name: 'Sulfur', nameVi: 'Lưu huỳnh', category: 'nonmetal', mass: 32.06, electronConfig: '[Ne] 3s² 3p⁴', shells: [2, 8, 6], meltK: 388, boilK: 717, density: 2.07, electronegativity: 2.58, discoveredBy: 'Cổ đại', uses: 'Axit sulfuric, lưu hoá cao su, thuốc súng', period: 3, group: 16 },
  { z: 17, symbol: 'Cl', name: 'Chlorine', nameVi: 'Clo', category: 'halogen', mass: 35.45, electronConfig: '[Ne] 3s² 3p⁵', shells: [2, 8, 7], meltK: 172, boilK: 239, density: 0.00321, electronegativity: 3.16, discoveredBy: 'Scheele (1774)', uses: 'Khử trùng nước, PVC, muối ăn (NaCl)', period: 3, group: 17 },
  { z: 18, symbol: 'Ar', name: 'Argon', nameVi: 'Argon', category: 'noble', mass: 39.95, electronConfig: '[Ne] 3s² 3p⁶', shells: [2, 8, 8], meltK: 84, boilK: 87, density: 0.00178, electronegativity: null, discoveredBy: 'Rayleigh & Ramsay (1894)', uses: 'Khí trơ trong hàn, bóng đèn sợi đốt, laser', period: 3, group: 18 },
  // Period 4 (selected)
  { z: 19, symbol: 'K', name: 'Potassium', nameVi: 'Kali', category: 'alkali', mass: 39.10, electronConfig: '[Ar] 4s¹', shells: [2, 8, 8, 1], meltK: 337, boilK: 1032, density: 0.86, electronegativity: 0.82, discoveredBy: 'Davy (1807)', uses: 'Phân bón (NPK), thuốc nổ KClO3, sinh học tế bào', period: 4, group: 1 },
  { z: 20, symbol: 'Ca', name: 'Calcium', nameVi: 'Canxi', category: 'alkali-earth', mass: 40.08, electronConfig: '[Ar] 4s²', shells: [2, 8, 8, 2], meltK: 1115, boilK: 1757, density: 1.55, electronegativity: 1.00, discoveredBy: 'Davy (1808)', uses: 'Xương răng, xi măng, vôi (CaO), thạch cao', period: 4, group: 2 },
  { z: 22, symbol: 'Ti', name: 'Titanium', nameVi: 'Titan', category: 'transition', mass: 47.87, electronConfig: '[Ar] 3d² 4s²', shells: [2, 8, 10, 2], meltK: 1941, boilK: 3560, density: 4.51, electronegativity: 1.54, discoveredBy: 'Gregor (1791)', uses: 'Hợp kim hàng không vũ trụ, ốc vít y tế, sơn TiO2', period: 4, group: 4 },
  { z: 26, symbol: 'Fe', name: 'Iron', nameVi: 'Sắt', category: 'transition', mass: 55.85, electronConfig: '[Ar] 3d⁶ 4s²', shells: [2, 8, 14, 2], meltK: 1811, boilK: 3134, density: 7.87, electronegativity: 1.83, discoveredBy: 'Cổ đại', uses: 'Thép, hemoglobin (máu), lõi từ trường Trái Đất', period: 4, group: 8 },
  { z: 29, symbol: 'Cu', name: 'Copper', nameVi: 'Đồng', category: 'transition', mass: 63.55, electronConfig: '[Ar] 3d¹⁰ 4s¹', shells: [2, 8, 18, 1], meltK: 1358, boilK: 2835, density: 8.96, electronegativity: 1.90, discoveredBy: 'Cổ đại', uses: 'Dây điện, ống nước, đồng tiền, bronze', period: 4, group: 11 },
  { z: 30, symbol: 'Zn', name: 'Zinc', nameVi: 'Kẽm', category: 'transition', mass: 65.38, electronConfig: '[Ar] 3d¹⁰ 4s²', shells: [2, 8, 18, 2], meltK: 693, boilK: 1180, density: 7.14, electronegativity: 1.65, discoveredBy: 'Marggraf (1746)', uses: 'Mạ chống gỉ, pin kẽm, brass (đồng thau)', period: 4, group: 12 },
  { z: 35, symbol: 'Br', name: 'Bromine', nameVi: 'Brom', category: 'halogen', mass: 79.90, electronConfig: '[Ar] 3d¹⁰ 4s² 4p⁵', shells: [2, 8, 18, 7], meltK: 266, boilK: 332, density: 3.12, electronegativity: 2.96, discoveredBy: 'Balard (1826)', uses: 'Chất chống cháy, thuốc nhuộm, AgBr trong phim ảnh', period: 4, group: 17 },
  { z: 36, symbol: 'Kr', name: 'Krypton', nameVi: 'Krypton', category: 'noble', mass: 83.80, electronConfig: '[Ar] 3d¹⁰ 4s² 4p⁶', shells: [2, 8, 18, 8], meltK: 116, boilK: 120, density: 0.00375, electronegativity: 3.00, discoveredBy: 'Ramsay & Travers (1898)', uses: 'Đèn flash cao tốc, laser excimer', period: 4, group: 18 },
  // Period 5 (selected)
  { z: 47, symbol: 'Ag', name: 'Silver', nameVi: 'Bạc', category: 'transition', mass: 107.87, electronConfig: '[Kr] 4d¹⁰ 5s¹', shells: [2, 8, 18, 18, 1], meltK: 1235, boilK: 2435, density: 10.49, electronegativity: 1.93, discoveredBy: 'Cổ đại', uses: 'Trang sức, dẫn điện tốt nhất, kháng khuẩn, phim ảnh', period: 5, group: 11 },
  { z: 53, symbol: 'I', name: 'Iodine', nameVi: 'Iốt', category: 'halogen', mass: 126.90, electronConfig: '[Kr] 4d¹⁰ 5s² 5p⁵', shells: [2, 8, 18, 18, 7], meltK: 387, boilK: 457, density: 4.93, electronegativity: 2.66, discoveredBy: 'Courtois (1811)', uses: 'Tuyến giáp (thyroid), khử trùng, muối iốt', period: 5, group: 17 },
  { z: 54, symbol: 'Xe', name: 'Xenon', nameVi: 'Xenon', category: 'noble', mass: 131.29, electronConfig: '[Kr] 4d¹⁰ 5s² 5p⁶', shells: [2, 8, 18, 18, 8], meltK: 161, boilK: 165, density: 0.00588, electronegativity: 2.60, discoveredBy: 'Ramsay & Travers (1898)', uses: 'Đèn flash, gây mê y tế, ion thruster (vũ trụ)', period: 5, group: 18 },
  // Period 6 (selected)
  { z: 74, symbol: 'W', name: 'Tungsten', nameVi: 'Vonfram', category: 'transition', mass: 183.84, electronConfig: '[Xe] 4f¹⁴ 5d⁴ 6s²', shells: [2, 8, 18, 32, 12, 2], meltK: 3695, boilK: 6203, density: 19.25, electronegativity: 2.36, discoveredBy: 'Elhuyar bros (1783)', uses: 'Dây tóc bóng đèn (nóng chảy CAO NHẤT), mũi khoan', period: 6, group: 6 },
  { z: 78, symbol: 'Pt', name: 'Platinum', nameVi: 'Bạch kim', category: 'transition', mass: 195.08, electronConfig: '[Xe] 4f¹⁴ 5d⁹ 6s¹', shells: [2, 8, 18, 32, 17, 1], meltK: 2041, boilK: 4098, density: 21.45, electronegativity: 2.28, discoveredBy: 'Ulloa (1735)', uses: 'Trang sức, xúc tác catalytic, điện cực', period: 6, group: 10 },
  { z: 79, symbol: 'Au', name: 'Gold', nameVi: 'Vàng', category: 'transition', mass: 196.97, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s¹', shells: [2, 8, 18, 32, 18, 1], meltK: 1337, boilK: 3129, density: 19.30, electronegativity: 2.54, discoveredBy: 'Cổ đại', uses: 'Trang sức, dự trữ tiền tệ, điện tử (vi mạch)', period: 6, group: 11 },
  { z: 80, symbol: 'Hg', name: 'Mercury', nameVi: 'Thủy ngân', category: 'transition', mass: 200.59, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s²', shells: [2, 8, 18, 32, 18, 2], meltK: 234, boilK: 630, density: 13.53, electronegativity: 2.00, discoveredBy: 'Cổ đại', uses: 'Nhiệt kế, đèn huỳnh quang, kim loại lỏng (LỎNG ở nhiệt độ thường)', period: 6, group: 12 },
  { z: 82, symbol: 'Pb', name: 'Lead', nameVi: 'Chì', category: 'post-transition', mass: 207.20, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p²', shells: [2, 8, 18, 32, 18, 4], meltK: 600, boilK: 2022, density: 11.34, electronegativity: 1.87, discoveredBy: 'Cổ đại', uses: 'Pin axit-chì, đạn, chắn phóng xạ X-ray', period: 6, group: 14 },
  // Period 7 (selected)
  { z: 92, symbol: 'U', name: 'Uranium', nameVi: 'Urani', category: 'lanthanide', mass: 238.03, electronConfig: '[Rn] 5f³ 6d¹ 7s²', shells: [2, 8, 18, 32, 21, 9, 2], meltK: 1405, boilK: 4404, density: 19.05, electronegativity: 1.38, discoveredBy: 'Klaproth (1789)', uses: 'Nhiên liệu hạt nhân, vũ khí, đo địa chất', period: 7, group: 0 },
]

// ── 3D Atom Components ──────────────────────────────────────
function Nucleus({ size, color }: { size: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (ref.current) {
      const t = clock.getElapsedTime()
      ref.current.scale.setScalar(1 + Math.sin(t * 2) * 0.05)
    }
  })
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[size, 32, 32]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={1.2}
        roughness={0.3}
        metalness={0.5}
      />
      <pointLight color={color} intensity={3} distance={10} />
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

  // Visualize orbit ring (faint)
  const orbitCurve = useMemo(() => {
    const points: THREE.Vector3[] = []
    const segments = 64
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius))
    }
    return new THREE.BufferGeometry().setFromPoints(points)
  }, [radius])

  return (
    <group ref={groupRef} rotation={[tilt, 0, tilt * 0.5]}>
      {/* Faint orbit ring */}
      <line>
        <primitive object={orbitCurve} attach="geometry" />
        <lineBasicMaterial color={color} transparent opacity={0.25} />
      </line>
      {/* Electrons distributed around the ring */}
      {Array.from({ length: electronCount }).map((_, i) => {
        const angle = (i / electronCount) * Math.PI * 2
        const x = Math.cos(angle) * radius
        const z = Math.sin(angle) * radius
        return (
          <mesh key={i} position={[x, 0, z]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={2.5}
              toneMapped={false}
            />
            <pointLight color={color} intensity={0.6} distance={2} />
          </mesh>
        )
      })}
    </group>
  )
}

function AtomScene({ element }: { element: Element }) {
  const meta = CATEGORY_META[element.category]
  // Nucleus size scaled by Z (atomic number), but capped
  const nucleusSize = useMemo(() => 0.4 + Math.min(element.z / 100, 0.8), [element.z])

  return (
    <>
      <ambientLight intensity={0.2} />
      <Stars radius={50} depth={60} count={3000} factor={4} fade speed={1} />

      <Nucleus size={nucleusSize} color={meta.glow} />

      {element.shells.map((electronCount, shellIdx) => {
        // Radius grows with shell index
        const radius = 1.5 + shellIdx * 1.0
        // Each shell has a different tilt (visual variety)
        const tilt = (shellIdx * Math.PI) / element.shells.length * 1.2 + shellIdx * 0.3
        // Inner shells rotate faster (matches Bohr model intuition)
        const speed = 1.5 / (shellIdx + 1)
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
    </>
  )
}

// ── 2D Element Card ─────────────────────────────────────────
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
        className="aspect-square rounded-md p-1 flex flex-col items-center justify-center transition-all backdrop-blur"
        style={{
          background: selected
            ? `linear-gradient(135deg, ${meta.bg}, rgba(255,255,255,0.05))`
            : meta.bg,
          border: `1px solid ${selected ? meta.color : 'rgba(255,255,255,0.1)'}`,
          boxShadow: selected
            ? `0 0 20px ${meta.glow}80, inset 0 0 12px ${meta.glow}40`
            : 'none',
          transform: selected ? 'scale(1.08)' : 'scale(1)',
        }}
      >
        <span className="text-[8px] opacity-60" style={{ color: meta.color }}>{el.z}</span>
        <span
          className="text-base md:text-lg font-bold leading-none"
          style={{
            color: meta.color,
            textShadow: `0 0 8px ${meta.glow}80`,
            fontFamily: '"Orbitron", "Inter", sans-serif',
          }}
        >
          {el.symbol}
        </span>
        <span className="text-[8px] opacity-70 truncate w-full text-center" style={{ color: '#e2e8f0' }}>
          {el.nameVi}
        </span>
      </div>
      <div
        className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ boxShadow: `0 0 24px ${meta.glow}60` }}
      />
    </button>
  )
}

// ── Info Panel ──────────────────────────────────────────────
function InfoPanel({ element }: { element: Element }) {
  const meta = CATEGORY_META[element.category]

  const props = [
    {
      label: 'Khối lượng nguyên tử', value: `${element.mass} u`, icon: Atom,
      progress: Math.min(element.mass / 240, 1), color: meta.color,
    },
    {
      label: 'Nhiệt độ nóng chảy',
      value: element.meltK ? `${element.meltK} K (${(element.meltK - 273.15).toFixed(0)}°C)` : '—',
      icon: Thermometer,
      progress: element.meltK ? Math.min(element.meltK / 4000, 1) : 0,
      color: '#ff6b6b',
    },
    {
      label: 'Nhiệt độ sôi',
      value: element.boilK ? `${element.boilK} K (${(element.boilK - 273.15).toFixed(0)}°C)` : '—',
      icon: Wind,
      progress: element.boilK ? Math.min(element.boilK / 6500, 1) : 0,
      color: '#ff9f1c',
    },
    {
      label: 'Khối lượng riêng',
      value: element.density != null ? `${element.density} g/cm³` : '—',
      icon: ZapIcon,
      progress: element.density ? Math.min(element.density / 22, 1) : 0,
      color: '#06d6a0',
    },
    {
      label: 'Độ âm điện (Pauling)',
      value: element.electronegativity != null ? `${element.electronegativity}` : '—',
      icon: ZapIcon,
      progress: element.electronegativity ? element.electronegativity / 4 : 0,
      color: '#c77dff',
    },
  ]

  return (
    <div className="space-y-3">
      {/* Header */}
      <div
        className="rounded-xl p-4 backdrop-blur"
        style={{
          background: `linear-gradient(135deg, ${meta.bg}, rgba(0,0,0,0.4))`,
          border: `1px solid ${meta.color}`,
          boxShadow: `0 0 24px ${meta.glow}40`,
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="text-5xl md:text-6xl font-black leading-none"
            style={{
              color: meta.color,
              textShadow: `0 0 16px ${meta.glow}`,
              fontFamily: '"Orbitron", "Inter", sans-serif',
            }}
          >
            {element.symbol}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs opacity-60" style={{ color: meta.color }}>
              {element.z} · {meta.label}
            </div>
            <h2 className="text-xl font-bold text-white truncate" style={{ fontFamily: '"Orbitron", sans-serif' }}>
              {element.name}
            </h2>
            <p className="text-sm" style={{ color: meta.glow }}>{element.nameVi}</p>
          </div>
        </div>
      </div>

      {/* Electron config */}
      <div
        className="rounded-xl p-4 backdrop-blur"
        style={{
          background: 'rgba(15,23,42,0.6)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: meta.color }}>
          ⚛ Cấu hình electron
        </div>
        <p className="font-mono text-sm text-white">{element.electronConfig}</p>
        <p className="text-[10px] mt-1 opacity-60 text-white">
          Lớp vỏ: [{element.shells.join(' · ')}]
        </p>

        {/* Shell visualization */}
        <div className="flex gap-1.5 mt-3">
          {element.shells.map((count, i) => (
            <div key={i} className="flex-1">
              <div
                className="h-2 rounded-full"
                style={{ background: `${meta.color}60`, boxShadow: `0 0 8px ${meta.glow}` }}
              />
              <div className="text-[9px] text-center mt-1 opacity-70" style={{ color: meta.color }}>
                K{i + 1}: {count}e
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Properties with progress bars */}
      <div
        className="rounded-xl p-4 space-y-3 backdrop-blur"
        style={{
          background: 'rgba(15,23,42,0.6)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {props.map(p => (
          <div key={p.label}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 text-[11px] opacity-80 text-white">
                <p.icon className="w-3 h-3" style={{ color: p.color }} />
                {p.label}
              </div>
              <div className="text-xs font-mono font-bold" style={{ color: p.color }}>
                {p.value}
              </div>
            </div>
            <div className="h-1 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${p.progress * 100}%`,
                  background: `linear-gradient(90deg, ${p.color}, ${p.color}40)`,
                  boxShadow: `0 0 8px ${p.color}`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Uses + Discovery */}
      <div
        className="rounded-xl p-4 backdrop-blur space-y-2"
        style={{
          background: 'rgba(15,23,42,0.6)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div>
          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: meta.color }}>
            🔬 Ứng dụng
          </div>
          <p className="text-xs text-white/90 leading-relaxed">{element.uses}</p>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: meta.color }}>
            📜 Khám phá
          </div>
          <p className="text-xs text-white/70">{element.discoveredBy}</p>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────
export default function PeriodicTable() {
  const [selected, setSelected] = useState<Element>(ELEMENTS[5]) // Carbon as default

  return (
    <div className="min-h-screen relative overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at top, #0a0e27 0%, #050816 50%, #000000 100%)',
        fontFamily: '"Inter", system-ui, sans-serif',
      }}>
      {/* Orbitron font via Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" />
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&display=swap" rel="stylesheet" />

      {/* Animated starfield bg */}
      <div className="fixed inset-0 pointer-events-none opacity-40">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            radial-gradient(2px 2px at 20% 30%, #c77dff, transparent),
            radial-gradient(1px 1px at 60% 70%, #06d6a0, transparent),
            radial-gradient(1.5px 1.5px at 80% 20%, #ff9f1c, transparent),
            radial-gradient(1px 1px at 40% 80%, #3fbbe0, transparent)
          `,
          backgroundSize: '200px 200px',
        }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <Link to="/dashboard/graph-lab"
            className="inline-flex items-center gap-1.5 text-xs text-purple-300 hover:text-purple-200 transition">
            <ChevronLeft className="w-3 h-3" /> Graph Lab
          </Link>
          <div className="flex items-center gap-2">
            <Atom className="w-6 h-6 text-cyan-400" style={{ filter: 'drop-shadow(0 0 12px #22d3ee)' }} />
            <h1 className="text-2xl md:text-3xl font-black tracking-wider"
              style={{
                fontFamily: '"Orbitron", sans-serif',
                background: 'linear-gradient(90deg, #c77dff, #06d6a0, #ff9f1c)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
              BẢNG TUẦN HOÀN
            </h1>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-purple-400/70">
            R3F · Interactive
          </span>
        </div>

        {/* Category legend */}
        <div className="mb-4 flex flex-wrap gap-2">
          {Object.entries(CATEGORY_META).map(([key, m]) => (
            <div key={key}
              className="px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5"
              style={{
                background: m.bg,
                color: m.color,
                border: `1px solid ${m.color}40`,
              }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.color, boxShadow: `0 0 6px ${m.glow}` }} />
              {m.label}
            </div>
          ))}
        </div>

        {/* Periodic Table 2D grid — 18 columns × 7 rows */}
        <div className="grid gap-1 md:gap-1.5 mb-6 overflow-x-auto pb-2"
          style={{
            gridTemplateColumns: 'repeat(18, minmax(40px, 1fr))',
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

        {/* 3D + Info row */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* 3D Atom Viewer */}
          <div className="lg:col-span-3 rounded-2xl overflow-hidden relative backdrop-blur"
            style={{
              background: 'rgba(5,8,22,0.85)',
              border: `1px solid ${CATEGORY_META[selected.category].color}40`,
              boxShadow: `inset 0 0 40px ${CATEGORY_META[selected.category].glow}20`,
              minHeight: '500px',
            }}>
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2 text-xs text-white/70 font-mono">
              <span className="w-2 h-2 rounded-full animate-pulse"
                style={{
                  background: CATEGORY_META[selected.category].color,
                  boxShadow: `0 0 8px ${CATEGORY_META[selected.category].glow}`,
                }} />
              3D ATOM · {selected.symbol}
            </div>
            <div className="absolute bottom-3 right-3 z-10 text-[10px] text-white/40 font-mono">
              Drag · Scroll · Pinch
            </div>
            <Suspense fallback={
              <div className="absolute inset-0 flex items-center justify-center text-white/50 text-sm">
                Đang tải 3D...
              </div>
            }>
              <Canvas
                camera={{ position: [0, 2, 8], fov: 60 }}
                style={{ background: 'transparent' }}
              >
                <AtomScene element={selected} />
                <OrbitControls
                  enablePan={false}
                  minDistance={3}
                  maxDistance={20}
                  autoRotate
                  autoRotateSpeed={0.5}
                />
              </Canvas>
            </Suspense>
          </div>

          {/* Info Panel */}
          <div className="lg:col-span-2">
            <InfoPanel element={selected} />
          </div>
        </div>

        {/* Footer hint */}
        <div className="mt-6 text-center text-[10px] text-white/30 font-mono uppercase tracking-widest">
          ⚛ Bấm vào nguyên tố để xem mô phỏng 3D · Quy mô R3F · Atom Bohr Model
        </div>
      </div>
    </div>
  )
}
