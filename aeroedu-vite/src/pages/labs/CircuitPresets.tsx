/**
 * CircuitPresets — Thư viện mạch điện mẫu (8 topology)
 *
 * Mỗi mạch có:
 *   - SVG schematic riêng (vẽ chuẩn ký hiệu)
 *   - Sliders chỉnh V / R / C
 *   - Simulation analytical (không cần solver chung)
 *   - Box "💡 Ứng dụng đời sống" giải thích nơi gặp mạch này
 *
 * Topology được dạy:
 *   1. Nối tiếp 2 điện trở
 *   2. Song song 2 nhánh
 *   3. Hỗn hợp R1 + (R2 // R3)
 *   4. Chia áp (voltage divider)
 *   5. Sạc tụ RC (transient)
 *   6. LED + R hạn dòng
 *   7. NPN driver điều khiển LED bằng MCU
 *   8. Cầu Wheatstone
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Lightbulb, Gauge, Info, Zap, Activity, Cpu, Scale,
  RotateCcw, Battery, Sigma,
} from 'lucide-react'

interface Preset {
  id: string
  name: string
  icon: typeof Lightbulb
  topology: string
  level: 'Cơ bản' | 'Trung bình' | 'Nâng cao'
  shortDesc: string
}

const PRESETS: Preset[] = [
  { id: 'series-r2',       name: 'Nối tiếp 2 điện trở',          icon: Activity,    topology: 'Series',        level: 'Cơ bản',      shortDesc: 'R₁ + R₂ + bóng đèn — Rtd = R₁ + R₂' },
  { id: 'parallel-r2',     name: 'Song song 2 bóng đèn',         icon: Lightbulb,   topology: 'Parallel',      level: 'Cơ bản',      shortDesc: 'Hai bóng song song — mỗi bóng đủ V nguồn' },
  { id: 'mixed',           name: 'Hỗn hợp R₁ + (R₂ ∥ R₃)',       icon: Sigma,       topology: 'Series-Parallel', level: 'Trung bình', shortDesc: 'R₁ nối tiếp với R₂ // R₃' },
  { id: 'voltage-divider', name: 'Mạch chia áp',                 icon: Scale,       topology: 'Divider',       level: 'Cơ bản',      shortDesc: 'Vout = V · R₂ / (R₁ + R₂)' },
  { id: 'rc-charging',     name: 'Sạc tụ điện (RC)',             icon: Zap,         topology: 'Transient',     level: 'Trung bình',  shortDesc: 'Vc(t) = V·(1 − e^(−t/τ)), τ = RC' },
  { id: 'led-limit',       name: 'LED + Điện trở hạn dòng',      icon: Lightbulb,   topology: 'Series',        level: 'Cơ bản',      shortDesc: 'R = (V − Vf) / I_led' },
  { id: 'bjt-driver',      name: 'NPN điều khiển LED từ MCU',    icon: Cpu,         topology: 'Switch',        level: 'Nâng cao',    shortDesc: 'BJT bão hoà khi Vbase > 0.7V' },
  { id: 'wheatstone',      name: 'Cầu Wheatstone',               icon: Gauge,       topology: 'Bridge',        level: 'Nâng cao',    shortDesc: 'Cân bằng khi R₁·R₄ = R₂·R₃' },
]

// ────────────────────────────────────────────────────────────────
// Main page — sidebar list + selected sub-circuit
// ────────────────────────────────────────────────────────────────

export default function CircuitPresets() {
  const [activeId, setActiveId] = useState<string>(PRESETS[0].id)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
      {/* Sidebar */}
      <aside className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-3 h-fit lg:sticky lg:top-4">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 px-2 py-1 mb-1">
          {PRESETS.length} mạch mẫu
        </div>
        <div className="space-y-1 max-h-[80vh] overflow-y-auto pr-1">
          {PRESETS.map(p => {
            const isActive = p.id === activeId
            const Icon = p.icon
            return (
              <button
                key={p.id}
                onClick={() => setActiveId(p.id)}
                className={`w-full text-left p-2.5 rounded-lg border transition flex items-start gap-2 ${
                  isActive
                    ? 'bg-amber-500/15 border-amber-500/40'
                    : 'bg-zinc-800/30 border-zinc-800 hover:bg-zinc-800/60 hover:border-zinc-700'
                }`}
              >
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? 'text-amber-300' : 'text-zinc-500'}`} />
                <div className="min-w-0">
                  <div className={`text-xs font-medium truncate ${isActive ? 'text-amber-200' : 'text-zinc-200'}`}>
                    {p.name}
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate mt-0.5">
                    {p.topology} · {p.level}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      {/* Detail */}
      <main className="space-y-4">
        {activeId === 'series-r2'       && <SeriesR2 />}
        {activeId === 'parallel-r2'     && <ParallelR2 />}
        {activeId === 'mixed'           && <MixedCircuit />}
        {activeId === 'voltage-divider' && <VoltageDivider />}
        {activeId === 'rc-charging'     && <RcCharging />}
        {activeId === 'led-limit'       && <LedLimit />}
        {activeId === 'bjt-driver'      && <BjtDriver />}
        {activeId === 'wheatstone'      && <Wheatstone />}
      </main>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// 1. Nối tiếp 2 điện trở + bóng đèn
// ────────────────────────────────────────────────────────────────
function SeriesR2() {
  const [V, setV] = useState(9)
  const [R1, setR1] = useState(100)
  const [R2, setR2] = useState(50)
  const Rbulb = 30
  const Rtd = R1 + R2 + Rbulb
  const I = V / Rtd
  const V1 = I * R1, V2 = I * R2, Vb = I * Rbulb
  const P = I * I * Rbulb
  const bright = Math.min(1, P / 1.0)

  return (
    <Container title="Nối tiếp 2 điện trở + Bóng đèn"
               description="Mạch nối tiếp: dòng I giống nhau qua mọi linh kiện. Điện áp chia theo R.">
      <svg viewBox="0 0 700 280" className="w-full">
        <Rect />
        {/* Top wire */}
        <Wire x1={70} y1={60} x2={620} y2={60} active={I > 1e-6} />
        {/* Battery left */}
        <BatterySymbol cx={50} cy={120} V={V} />
        <Wire x1={50} y1={60}  x2={50} y2={100} active={I > 1e-6} />
        <Wire x1={50} y1={140} x2={50} y2={220} active={I > 1e-6} />
        {/* Bottom wire */}
        <Wire x1={50} y1={220} x2={620} y2={220} active={I > 1e-6} />
        <Wire x1={620} y1={60} x2={620} y2={220} active={I > 1e-6} />

        {/* R1 (slot 1) — at x=180 */}
        <ResistorSym cx={200} cy={60} label={`R₁=${R1}Ω`} sub={`V₁=${V1.toFixed(2)}V`} />
        {/* R2 — at x=360 */}
        <ResistorSym cx={380} cy={60} label={`R₂=${R2}Ω`} sub={`V₂=${V2.toFixed(2)}V`} />
        {/* Bulb — at x=540 */}
        <BulbSym cx={540} cy={60} bright={bright} label={`Đèn ${Rbulb}Ω`} sub={`V=${Vb.toFixed(2)}V`} />
      </svg>

      <Controls>
        <Slider label="Vnguồn" value={V} onChange={setV} min={1} max={24} step={0.5} unit="V" color="amber" />
        <Slider label="R₁"     value={R1} onChange={setR1} min={1} max={500} step={1} unit="Ω" color="cyan" />
        <Slider label="R₂"     value={R2} onChange={setR2} min={1} max={500} step={1} unit="Ω" color="cyan" />
      </Controls>

      <Measurements>
        <Meter label="Rtổng = R₁+R₂+Rđèn" value={`${Rtd} Ω`} color="cyan" />
        <Meter label="Dòng I = V/Rtổng"   value={`${(I * 1000).toFixed(2)} mA`} color="amber" />
        <Meter label="V₁ trên R₁"          value={`${V1.toFixed(2)} V`} color="slate" />
        <Meter label="V₂ trên R₂"          value={`${V2.toFixed(2)} V`} color="slate" />
        <Meter label="Vđèn"                value={`${Vb.toFixed(2)} V`} color="yellow" />
        <Meter label="Pđèn"                value={`${P.toFixed(3)} W`} color="yellow" />
      </Measurements>

      <Formula
        lines={[
          ['Quy luật I chung', 'I₁ = I₂ = I₃ = V / (R₁ + R₂ + R₃)'],
          ['V chia theo R',    'Vᵢ = I · Rᵢ → R lớn → V lớn'],
          ['Tổng V',           'V = V₁ + V₂ + V₃ (định luật Kirchhoff)'],
        ]}
      />

      <AppNote
        title="Đèn pin LED 3 pin AA"
        body="Pin AA (1.5V × 3 = 4.5V) → công tắc → điện trở hạn dòng (~100Ω) → LED (Vf ≈ 3V). Điện trở để dòng qua LED không vượt 20mA — tránh cháy LED."
      />
      <AppNote
        title="Đèn nháy dây Noel"
        body="Đèn dây LED giả truyền thống nối hàng chục bóng nối tiếp — đứt 1 bóng cả dây tắt. Đời mới chuyển sang LED song song để khắc phục."
      />
    </Container>
  )
}

// ────────────────────────────────────────────────────────────────
// 2. Song song 2 bóng đèn
// ────────────────────────────────────────────────────────────────
function ParallelR2() {
  const [V, setV] = useState(12)
  const [R1, setR1] = useState(60)
  const [R2, setR2] = useState(40)
  const I1 = V / R1, I2 = V / R2
  const I = I1 + I2
  const Rtd = (R1 * R2) / (R1 + R2)
  const P1 = V * I1, P2 = V * I2
  const b1 = Math.min(1, P1 / 3.0), b2 = Math.min(1, P2 / 3.0)

  return (
    <Container title="Song song 2 bóng đèn"
               description="Mỗi nhánh có V giống nhau (= V nguồn). Dòng chia theo R: R nhỏ → I lớn.">
      <svg viewBox="0 0 700 320" className="w-full">
        <Rect />
        <BatterySymbol cx={50} cy={160} V={V} />
        {/* + bus */}
        <Wire x1={50} y1={140} x2={50} y2={80} active={I > 1e-6} />
        <Wire x1={50} y1={80} x2={620} y2={80} active={I > 1e-6} />
        {/* − bus */}
        <Wire x1={50} y1={180} x2={50} y2={250} active={I > 1e-6} />
        <Wire x1={50} y1={250} x2={620} y2={250} active={I > 1e-6} />

        {/* Branch 1 right verticals */}
        <Wire x1={250} y1={80}  x2={250} y2={120} active={I1 > 1e-6} />
        <Wire x1={250} y1={200} x2={250} y2={250} active={I1 > 1e-6} />
        <BulbSym cx={250} cy={160} bright={b1} label={`R₁=${R1}Ω`} sub={`I₁=${(I1*1000).toFixed(1)}mA`} />

        {/* Branch 2 */}
        <Wire x1={500} y1={80}  x2={500} y2={120} active={I2 > 1e-6} />
        <Wire x1={500} y1={200} x2={500} y2={250} active={I2 > 1e-6} />
        <BulbSym cx={500} cy={160} bright={b2} label={`R₂=${R2}Ω`} sub={`I₂=${(I2*1000).toFixed(1)}mA`} />

        <text x={620} y={75} fill="#94a3b8" fontSize={11} fontFamily="monospace">+</text>
        <text x={620} y={262} fill="#94a3b8" fontSize={11} fontFamily="monospace">−</text>
      </svg>

      <Controls>
        <Slider label="Vnguồn" value={V} onChange={setV} min={1} max={24} step={0.5} unit="V" color="amber" />
        <Slider label="R₁"     value={R1} onChange={setR1} min={1} max={500} step={1} unit="Ω" color="cyan" />
        <Slider label="R₂"     value={R2} onChange={setR2} min={1} max={500} step={1} unit="Ω" color="cyan" />
      </Controls>

      <Measurements>
        <Meter label="V₁ = V₂ = V"        value={`${V.toFixed(1)} V`} color="emerald" />
        <Meter label="I₁ qua R₁"           value={`${(I1 * 1000).toFixed(2)} mA`} color="amber" />
        <Meter label="I₂ qua R₂"           value={`${(I2 * 1000).toFixed(2)} mA`} color="amber" />
        <Meter label="I tổng = I₁ + I₂"    value={`${(I * 1000).toFixed(2)} mA`} color="amber" />
        <Meter label="Rtd = R₁·R₂/(R₁+R₂)" value={`${Rtd.toFixed(2)} Ω`} color="cyan" />
        <Meter label="P₁"                  value={`${P1.toFixed(2)} W`} color="yellow" />
        <Meter label="P₂"                  value={`${P2.toFixed(2)} W`} color="yellow" />
      </Measurements>

      <Formula
        lines={[
          ['V mỗi nhánh',          'V₁ = V₂ = V_nguồn'],
          ['Dòng chia theo R',     'Iᵢ = V / Rᵢ → R nhỏ → I lớn'],
          ['Tổng I (Kirchhoff)',   'I = I₁ + I₂'],
          ['Rtd song song',        '1/Rtd = 1/R₁ + 1/R₂'],
        ]}
      />

      <AppNote
        title="Mạch điện trong nhà ở (220V AC)"
        body="Mọi ổ cắm, đèn, tủ lạnh, máy giặt đều mắc SONG SONG. Mỗi thiết bị nhận đủ 220V; tắt/hỏng thiết bị này không ảnh hưởng thiết bị kia. Cường độ tổng = tổng I của các thiết bị → CB ngắt khi vượt 16A."
      />
      <AppNote
        title="Đèn LED dải dán trang trí"
        body="Mỗi đoạn LED + R hạn dòng nối SONG SONG với +12V/+24V common. Cắt ngắn được dải mà các LED còn lại vẫn sáng — vì độc lập."
      />
    </Container>
  )
}

// ────────────────────────────────────────────────────────────────
// 3. Hỗn hợp: R1 nối tiếp với (R2 // R3)
// ────────────────────────────────────────────────────────────────
function MixedCircuit() {
  const [V, setV] = useState(12)
  const [R1, setR1] = useState(40)
  const [R2, setR2] = useState(60)
  const [R3, setR3] = useState(120)
  const R23 = (R2 * R3) / (R2 + R3)
  const Rtd = R1 + R23
  const I = V / Rtd
  const V1 = I * R1
  const V23 = I * R23
  const I2 = V23 / R2
  const I3 = V23 / R3

  return (
    <Container title="Mạch hỗn hợp: R₁ nối tiếp với (R₂ ∥ R₃)"
               description="Phân tích từng đoạn: gom nhánh // trước, rồi tính như nối tiếp.">
      <svg viewBox="0 0 700 320" className="w-full">
        <Rect />
        <BatterySymbol cx={50} cy={160} V={V} />
        <Wire x1={50} y1={140} x2={50} y2={80}   active={I > 1e-6} />
        <Wire x1={50} y1={80}  x2={170} y2={80}  active={I > 1e-6} />
        <Wire x1={50} y1={180} x2={50} y2={250} active={I > 1e-6} />
        <Wire x1={50} y1={250} x2={620} y2={250} active={I > 1e-6} />

        {/* R1 horizontal at top */}
        <ResistorSym cx={250} cy={80} label={`R₁=${R1}Ω`} sub={`V₁=${V1.toFixed(2)}V`} />
        <Wire x1={282} y1={80} x2={400} y2={80} active={I > 1e-6} />

        {/* Junction split into 2 branches */}
        <circle cx={400} cy={80} r={4} fill="#22c55e" />
        {/* Branch R2 */}
        <Wire x1={400} y1={80}  x2={400} y2={130} active={I2 > 1e-6} />
        <ResistorSym cx={400} cy={170} vertical label={`R₂=${R2}Ω`} sub={`I₂=${(I2*1000).toFixed(1)}mA`} />
        <Wire x1={400} y1={210} x2={400} y2={250} active={I2 > 1e-6} />
        {/* Branch R3 */}
        <Wire x1={400} y1={80}  x2={550} y2={80} active={I3 > 1e-6} />
        <Wire x1={550} y1={80}  x2={550} y2={130} active={I3 > 1e-6} />
        <ResistorSym cx={550} cy={170} vertical label={`R₃=${R3}Ω`} sub={`I₃=${(I3*1000).toFixed(1)}mA`} />
        <Wire x1={550} y1={210} x2={550} y2={250} active={I3 > 1e-6} />

        <Wire x1={620} y1={80} x2={620} y2={250} active={false} />
        <text x={415} y={75}  fill="#22c55e" fontSize={10} fontFamily="monospace">nút A</text>
        <text x={415} y={262} fill="#22c55e" fontSize={10} fontFamily="monospace">nút B</text>
      </svg>

      <Controls>
        <Slider label="Vnguồn" value={V} onChange={setV} min={1} max={24} step={0.5} unit="V" color="amber" />
        <Slider label="R₁"     value={R1} onChange={setR1} min={1} max={500} step={1} unit="Ω" color="cyan" />
        <Slider label="R₂"     value={R2} onChange={setR2} min={1} max={500} step={1} unit="Ω" color="cyan" />
        <Slider label="R₃"     value={R3} onChange={setR3} min={1} max={500} step={1} unit="Ω" color="cyan" />
      </Controls>

      <Measurements>
        <Meter label="R₂ ∥ R₃"              value={`${R23.toFixed(2)} Ω`} color="purple" />
        <Meter label="Rtd = R₁ + R₂∥R₃"     value={`${Rtd.toFixed(2)} Ω`} color="cyan" />
        <Meter label="I qua R₁"             value={`${(I * 1000).toFixed(2)} mA`} color="amber" />
        <Meter label="V trên R₁"            value={`${V1.toFixed(2)} V`} color="slate" />
        <Meter label="V trên R₂ ∥ R₃"       value={`${V23.toFixed(2)} V`} color="slate" />
        <Meter label="I₂"                   value={`${(I2 * 1000).toFixed(2)} mA`} color="amber" />
        <Meter label="I₃"                   value={`${(I3 * 1000).toFixed(2)} mA`} color="amber" />
        <Meter label="Kiểm: I = I₂+I₃"      value={`${((I2+I3)*1000).toFixed(2)} mA`} color="emerald" />
      </Measurements>

      <Formula
        lines={[
          ['Bước 1', 'Gom R₂ và R₃ thành Rsong song: R₂₃ = R₂·R₃/(R₂+R₃)'],
          ['Bước 2', 'Rtd = R₁ + R₂₃ (nối tiếp)'],
          ['Bước 3', 'I = V / Rtd; V₁ = I·R₁; V₂₃ = I·R₂₃'],
          ['Bước 4', 'I₂ = V₂₃/R₂; I₃ = V₂₃/R₃; kiểm I = I₂ + I₃'],
        ]}
      />

      <AppNote
        title="Mạch ổ cắm có cầu chì chung"
        body="Cầu chì F (R₁ — rất nhỏ) bảo vệ chung cho cả ổ cắm A và B (R₂ // R₃) trong nhà. Hỏng A vẫn dùng được B, nhưng cháy cầu chì F → cả 2 mất điện."
      />
      <AppNote
        title="Mạch điện ô-tô"
        body="Acquy 12V → cầu chì chính (R₁) → các thiết bị song song: đèn pha, đài, điều hoà (mỗi cái 1 nhánh)."
      />
    </Container>
  )
}

// ────────────────────────────────────────────────────────────────
// 4. Mạch chia áp (voltage divider)
// ────────────────────────────────────────────────────────────────
function VoltageDivider() {
  const [V, setV] = useState(12)
  const [R1, setR1] = useState(100)
  const [R2, setR2] = useState(200)
  const Vout = V * R2 / (R1 + R2)
  const I = V / (R1 + R2)

  return (
    <Container title="Mạch chia áp (Voltage Divider)"
               description="Lấy ra một điện áp Vout nhỏ hơn V nguồn — không cần biến áp.">
      <svg viewBox="0 0 700 320" className="w-full">
        <Rect />
        <BatterySymbol cx={80} cy={160} V={V} />
        {/* +V to top of R1 */}
        <Wire x1={80} y1={140} x2={80}  y2={70}  active={I > 1e-6} />
        <Wire x1={80} y1={70}  x2={300} y2={70}  active={I > 1e-6} />
        {/* R1 vertical */}
        <Wire x1={300} y1={70} x2={300} y2={110} active={I > 1e-6} />
        <ResistorSym cx={300} cy={150} vertical label={`R₁=${R1}Ω`} sub="trên" />
        <Wire x1={300} y1={190} x2={300} y2={210} active={I > 1e-6} />
        {/* node middle = Vout */}
        <circle cx={300} cy={210} r={5} fill="#a855f7" />
        <Wire x1={300} y1={210} x2={460} y2={210} active={false} />
        <text x={465} y={203} fill="#a855f7" fontSize={11} fontFamily="monospace" fontWeight={700}>
          Vout
        </text>
        <text x={465} y={218} fill="#a855f7" fontSize={11} fontFamily="monospace">
          = {Vout.toFixed(2)} V
        </text>
        {/* R2 vertical to GND */}
        <Wire x1={300} y1={210} x2={300} y2={230} active={I > 1e-6} />
        <ResistorSym cx={300} cy={270} vertical label={`R₂=${R2}Ω`} sub="dưới" />
        {/* GND */}
        <Wire x1={300} y1={290} x2={80}  y2={290} active={I > 1e-6} />
        <Wire x1={80}  y1={290} x2={80}  y2={180} active={I > 1e-6} />
        {/* GND symbol */}
        <line x1={290} y1={295} x2={310} y2={295} stroke="#94a3b8" strokeWidth={2} />
        <line x1={293} y1={299} x2={307} y2={299} stroke="#94a3b8" strokeWidth={1.5} />
        <line x1={296} y1={303} x2={304} y2={303} stroke="#94a3b8" strokeWidth={1} />
      </svg>

      <Controls>
        <Slider label="Vnguồn" value={V} onChange={setV} min={1} max={24} step={0.5} unit="V" color="amber" />
        <Slider label="R₁ (trên)" value={R1} onChange={setR1} min={1} max={1000} step={1} unit="Ω" color="cyan" />
        <Slider label="R₂ (dưới)" value={R2} onChange={setR2} min={1} max={1000} step={1} unit="Ω" color="cyan" />
      </Controls>

      <Measurements>
        <Meter label="Vout = V·R₂/(R₁+R₂)"  value={`${Vout.toFixed(3)} V`} color="purple" />
        <Meter label="Tỉ số Vout/V"           value={`${(Vout / V * 100).toFixed(1)} %`} color="purple" />
        <Meter label="Dòng I"                value={`${(I * 1000).toFixed(2)} mA`} color="amber" />
      </Measurements>

      <Formula
        lines={[
          ['Định luật',          'Vout = V · R₂ / (R₁ + R₂)'],
          ['R₁ = R₂',            'Vout = V/2 (chia đôi)'],
          ['R₁ ≫ R₂',           'Vout ≈ 0 (gần GND)'],
          ['R₁ ≪ R₂',           'Vout ≈ V (gần V nguồn)'],
        ]}
      />

      <AppNote
        title="Cảm biến nhiệt NTC"
        body="R₁ = NTC (R giảm khi nóng), R₂ = R cố định. Khi nóng → R₁ ↓ → Vout ↑. Đọc Vout bằng ADC Arduino → quy đổi ra nhiệt độ °C."
      />
      <AppNote
        title="Cảm biến quang LDR"
        body="Tương tự, R₁ = LDR (R giảm khi sáng). Trời tối → R₁ lớn → Vout thấp → MCU bật đèn tự động (cảm biến đèn đường)."
      />
      <AppNote
        title="Volume potentiometer (chiết áp)"
        body="Núm vặn volume amp = mạch chia áp với R thay đổi liên tục. Xoay núm = thay đổi R₂ → âm thanh to/nhỏ."
      />
    </Container>
  )
}

// ────────────────────────────────────────────────────────────────
// 5. Sạc tụ RC (transient analysis)
// ────────────────────────────────────────────────────────────────
function RcCharging() {
  const [V, setV] = useState(9)
  const [R, setR] = useState(1000)        // Ω
  const [C, setC] = useState(100)         // µF (UI), real C = C * 1e-6
  const [running, setRunning] = useState(true)
  const [tMs, setTMs] = useState(0)
  const rafRef = useRef<number | null>(null)
  const lastRef = useRef(performance.now())

  useEffect(() => {
    function tick(now: number) {
      const dt = now - lastRef.current
      lastRef.current = now
      if (running) setTMs(t => t + dt)
      rafRef.current = requestAnimationFrame(tick)
    }
    lastRef.current = performance.now()
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [running])

  const Creal = C * 1e-6
  const tau = R * Creal  // s
  const t = tMs / 1000
  const Vc = V * (1 - Math.exp(-t / tau))
  const Ic = (V / R) * Math.exp(-t / tau)
  const reset = () => setTMs(0)

  // Build curve for chart
  const curveW = 600, curveH = 160
  const tMax = tau * 5
  const points = useMemo(() => {
    const pts: { x: number; y: number }[] = []
    for (let i = 0; i <= 100; i++) {
      const tp = (i / 100) * tMax
      const v = V * (1 - Math.exp(-tp / tau))
      pts.push({ x: (i / 100) * curveW, y: curveH - (v / V) * curveH })
    }
    return pts
  }, [V, tau, tMax])
  const curMarkerX = Math.min(curveW, (t / tMax) * curveW)

  return (
    <Container title="Sạc tụ điện qua điện trở (RC)"
               description="Khi đóng mạch, tụ nạp dần đến V. Hằng số τ = RC quyết định tốc độ.">
      <svg viewBox="0 0 700 280" className="w-full">
        <Rect />
        <BatterySymbol cx={50} cy={140} V={V} />
        <Wire x1={50} y1={120} x2={50} y2={60} active={Ic > 1e-6} />
        <Wire x1={50} y1={60}  x2={620} y2={60} active={Ic > 1e-6} />
        <ResistorSym cx={250} cy={60} label={`R=${R}Ω`} sub={`I=${(Ic*1000).toFixed(3)}mA`} />
        {/* Capacitor at right */}
        <Wire x1={620} y1={60}  x2={620} y2={120} active={Ic > 1e-6} />
        <line x1={595} y1={120} x2={645} y2={120} stroke="#ec4899" strokeWidth={3} />
        <line x1={595} y1={140} x2={645} y2={140} stroke="#ec4899" strokeWidth={3} />
        <text x={620} y={170} fill="#ec4899" fontSize={11} fontFamily="monospace" textAnchor="middle">
          C={C}µF
        </text>
        <text x={620} y={185} fill="#ec4899" fontSize={10} fontFamily="monospace" textAnchor="middle">
          Vc={Vc.toFixed(2)}V
        </text>
        <Wire x1={620} y1={140} x2={620} y2={210} active={Ic > 1e-6} />
        <Wire x1={620} y1={210} x2={50}  y2={210} active={Ic > 1e-6} />
        <Wire x1={50}  y1={210} x2={50}  y2={160} active={Ic > 1e-6} />
      </svg>

      {/* Chart */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-3">
        <div className="text-xs text-zinc-400 mb-1">Đồ thị Vc(t) — đường cong sạc</div>
        <svg viewBox={`0 0 ${curveW} ${curveH + 20}`} className="w-full">
          {/* Axes */}
          <line x1={0} y1={curveH} x2={curveW} y2={curveH} stroke="#475569" strokeWidth={1} />
          <line x1={0} y1={0} x2={0} y2={curveH} stroke="#475569" strokeWidth={1} />
          {/* V asymptote */}
          <line x1={0} y1={2} x2={curveW} y2={2} stroke="#f59e0b" strokeWidth={1} strokeDasharray="4,4" opacity={0.6} />
          <text x={curveW - 50} y={14} fill="#f59e0b" fontSize={9}>V = {V}V</text>
          {/* τ markers */}
          {[1, 2, 3, 4].map(k => {
            const x = (k / 5) * curveW
            const v = V * (1 - Math.exp(-k))
            return (
              <g key={k}>
                <line x1={x} y1={curveH} x2={x} y2={curveH - (v / V) * curveH}
                      stroke="#334155" strokeWidth={0.5} strokeDasharray="2,2" />
                <text x={x + 2} y={curveH - 4} fill="#64748b" fontSize={8}>τ·{k}</text>
              </g>
            )
          })}
          {/* Curve */}
          <path d={`M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`}
                stroke="#a855f7" strokeWidth={2} fill="none" />
          {/* Current marker */}
          <circle cx={curMarkerX} cy={curveH - (Vc / V) * curveH} r={5} fill="#a855f7" />
          <text x={curMarkerX} y={curveH - (Vc / V) * curveH - 8} fill="#c4b5fd"
                fontSize={9} fontFamily="monospace" textAnchor="middle">
            {Vc.toFixed(2)}V
          </text>
        </svg>
      </div>

      <Controls>
        <Slider label="Vnguồn" value={V} onChange={setV} min={1} max={24} step={0.5} unit="V" color="amber" />
        <Slider label="R"      value={R} onChange={setR} min={100} max={10000} step={100} unit="Ω" color="cyan" />
        <Slider label="C"      value={C} onChange={setC} min={10} max={2000} step={10} unit="µF" color="pink" />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRunning(r => !r)}
            className={`px-3 py-1.5 text-xs rounded-lg border ${
              running
                ? 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
            }`}
          >
            {running ? 'Tạm dừng' : 'Tiếp tục'}
          </button>
          <button
            onClick={reset}
            className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Xả tụ
          </button>
        </div>
      </Controls>

      <Measurements>
        <Meter label="τ = R · C"   value={`${(tau * 1000).toFixed(1)} ms`} color="pink" />
        <Meter label="t hiện tại"  value={`${(t).toFixed(2)} s`} color="slate" />
        <Meter label="Vc(t)"       value={`${Vc.toFixed(3)} V`} color="purple" />
        <Meter label="I(t)"        value={`${(Ic * 1000).toFixed(3)} mA`} color="amber" />
        <Meter label="Vc/V (%)"    value={`${(Vc / V * 100).toFixed(1)} %`} color="purple" />
      </Measurements>

      <Formula
        lines={[
          ['Phương trình',        'Vc(t) = V · (1 − e^(−t/τ))'],
          ['Dòng nạp',            'I(t) = (V/R) · e^(−t/τ)'],
          ['Hằng số thời gian',   'τ = R · C (R Ω, C F)'],
          ['Sau 1τ', 'Vc ≈ 63% V; sau 5τ ≈ 99% V (coi như đầy)'],
        ]}
      />

      <AppNote
        title="Mạch flash camera"
        body="Nhấn nút → tụ lớn (1000µF, 300V) nạp qua R chậm rãi từ pin. Khi đầy → kích đèn xenon phát ánh sáng cực mạnh trong 1ms. Vì sao có khoảng chờ giữa 2 lần chụp."
      />
      <AppNote
        title="Mạch timer 555"
        body="IC NE555 dùng RC để tạo dao động: t_on = 0.693 · (R₁+R₂) · C. Ứng dụng: đèn nhấp nháy, còi báo động, đo nhịp tim."
      />
      <AppNote
        title="Mạch tắt đèn trễ"
        body="Tụ nạp khi bật → khi tắt nguồn, tụ xả qua đèn LED → đèn còn sáng vài giây (như đèn ngủ giảm dần)."
      />
    </Container>
  )
}

// ────────────────────────────────────────────────────────────────
// 6. LED + Điện trở hạn dòng
// ────────────────────────────────────────────────────────────────
function LedLimit() {
  const [V, setV] = useState(5)
  const [R, setR] = useState(220)
  const [Vf, setVf] = useState(2.0)
  const I = Math.max(0, (V - Vf) / R)
  const bright = Math.min(1, I / 0.02)  // 20mA = full
  const safe = I < 0.025  // safe under 25mA

  return (
    <Container title="LED + Điện trở hạn dòng"
               description="LED cần dòng ổn định 5-20mA. R bảo vệ LED không cháy khi V > Vf.">
      <svg viewBox="0 0 700 240" className="w-full">
        <Rect />
        <BatterySymbol cx={70} cy={140} V={V} />
        <Wire x1={70} y1={120} x2={70} y2={60} active={I > 1e-6} />
        <Wire x1={70} y1={60}  x2={620} y2={60} active={I > 1e-6} />
        <ResistorSym cx={250} cy={60} label={`R=${R}Ω`} sub={`Vr=${(I*R).toFixed(2)}V`} />
        {/* LED */}
        <Wire x1={280} y1={60} x2={440} y2={60} active={I > 1e-6} />
        <polygon points={`450,52 470,60 450,68`}
                 fill={I > 1e-6 ? '#ef4444' : '#475569'}
                 stroke="#f87171" strokeWidth={1} />
        <line x1={470} y1={52} x2={470} y2={68} stroke="#f87171" strokeWidth={2.5} />
        {I > 1e-6 && (
          <>
            <circle cx={460} cy={60} r={14 + bright * 8}
                    fill="#fca5a5" fillOpacity={0.15 + bright * 0.45} />
            <line x1={460} y1={42} x2={465} y2={32} stroke="#fbbf24" strokeWidth={1.2} />
            <line x1={460} y1={42} x2={455} y2={32} stroke="#fbbf24" strokeWidth={1.2} />
          </>
        )}
        <text x={460} y={88} fill="#f87171" fontSize={10} fontFamily="monospace" textAnchor="middle">
          LED Vf={Vf.toFixed(1)}V
        </text>
        <Wire x1={470} y1={60} x2={620} y2={60} active={I > 1e-6} />
        <Wire x1={620} y1={60} x2={620} y2={180} active={I > 1e-6} />
        <Wire x1={620} y1={180} x2={70} y2={180} active={I > 1e-6} />
        <Wire x1={70}  y1={180} x2={70} y2={160} active={I > 1e-6} />
      </svg>

      <Controls>
        <Slider label="Vnguồn" value={V} onChange={setV} min={1} max={24} step={0.5} unit="V" color="amber" />
        <Slider label="R hạn dòng" value={R} onChange={setR} min={50} max={2000} step={10} unit="Ω" color="cyan" />
        <Slider label="Vf LED" value={Vf} onChange={setVf} min={1.5} max={3.5} step={0.1} unit="V" color="rose" />
      </Controls>

      <Measurements>
        <Meter label="V − Vf"       value={`${(V - Vf).toFixed(2)} V`} color="amber" />
        <Meter label="I = (V−Vf)/R" value={`${(I * 1000).toFixed(2)} mA`} color="amber" />
        <Meter label="Trạng thái"   value={safe ? '✓ AN TOÀN' : '⚠ QUÁ DÒNG!'}
               color={safe ? 'emerald' : 'rose'} />
        <Meter label="Độ sáng"      value={`${(bright * 100).toFixed(0)} %`} color="yellow" />
      </Measurements>

      <Formula
        lines={[
          ['Công thức Ohm',     'I = (V − Vf) / R'],
          ['Chọn R',            'R = (V − Vf) / I_mong_muốn'],
          ['Ví dụ',             'V=5, Vf=2, I=10mA → R = (5−2)/0.01 = 300Ω'],
          ['Cảnh báo',          'Không có R → I = ∞ → LED CHÁY ngay'],
        ]}
      />

      <AppNote
        title="LED indicator điện thoại / máy tính"
        body="Mọi đèn báo nguồn (xanh khi sạc, đỏ khi pin yếu) đều có R hạn dòng ẩn trong mạch. Vf khác nhau theo màu: đỏ ≈ 2V, xanh lá ≈ 2.2V, xanh dương/trắng ≈ 3V."
      />
      <AppNote
        title="Đèn LED 12V xe máy"
        body="LED siêu sáng ô-tô/xe máy thường có driver (constant current source) thay vì chỉ R — vì điện áp ắc-quy thay đổi 11-14V tuỳ tình trạng."
      />
    </Container>
  )
}

// ────────────────────────────────────────────────────────────────
// 7. NPN driver điều khiển LED từ MCU
// ────────────────────────────────────────────────────────────────
function BjtDriver() {
  const [Vcc, setVcc] = useState(12)         // load supply
  const [Rb, setRb] = useState(1000)         // base R
  const [Rc, setRc] = useState(220)          // collector R (LED limit)
  const [baseHigh, setBaseHigh] = useState(true)
  const Vmcu = 3.3                            // Arduino HIGH
  const Vbe = 0.7
  const Vf_led = 2.0
  const Vce_sat = 0.2
  const Ib = baseHigh ? Math.max(0, (Vmcu - Vbe) / Rb) : 0
  const Ic = baseHigh ? Math.max(0, (Vcc - Vf_led - Vce_sat) / Rc) : 0
  const beta = Ib > 0 ? Ic / Ib : 0
  const bright = Math.min(1, Ic / 0.02)
  const power = Vcc * Ic
  const status = baseHigh ? (Ic > 1e-6 ? 'Saturation (LED ON)' : 'Vcc thấp / Rc lớn') : 'Cutoff (LED OFF)'

  return (
    <Container title="NPN BJT điều khiển LED công suất từ Arduino"
               description="Arduino pin (3.3V/5V, 20mA max) không đủ chạy LED 12V. Dùng BJT làm switch khuếch đại.">
      <svg viewBox="0 0 700 360" className="w-full">
        <Rect />
        {/* MCU box */}
        <rect x={20} y={120} width={120} height={80} rx={6}
              fill="#0a0e1a" stroke={baseHigh ? '#22c55e' : '#475569'} strokeWidth={2} />
        <text x={80} y={150} fill="#94a3b8" fontSize={11} fontFamily="monospace" textAnchor="middle">
          Arduino
        </text>
        <text x={80} y={170} fill={baseHigh ? '#22c55e' : '#94a3b8'} fontSize={14}
              fontWeight={700} textAnchor="middle">
          PIN = {baseHigh ? 'HIGH' : 'LOW'}
        </text>
        <text x={80} y={188} fill="#64748b" fontSize={9} fontFamily="monospace" textAnchor="middle">
          {Vmcu.toFixed(1)}V / 0V
        </text>
        {/* MCU pin → Rb */}
        <Wire x1={140} y1={160} x2={200} y2={160} active={Ib > 1e-6} />
        <ResistorSym cx={250} cy={160} label={`Rb=${Rb}Ω`} sub={`Ib=${(Ib*1000).toFixed(2)}mA`} />
        <Wire x1={280} y1={160} x2={340} y2={160} active={Ib > 1e-6} />

        {/* Vcc supply at top */}
        <BatterySymbol cx={480} cy={50} V={Vcc} horizontal />
        <text x={480} y={32} fill="#fbbf24" fontSize={11} fontFamily="monospace" textAnchor="middle">
          Vcc = {Vcc}V
        </text>
        <Wire x1={520} y1={50} x2={580} y2={50}  active={Ic > 1e-6} />
        <Wire x1={580} y1={50} x2={580} y2={100} active={Ic > 1e-6} />
        {/* Rc */}
        <ResistorSym cx={580} cy={140} vertical label={`Rc=${Rc}Ω`} sub={`Ic=${(Ic*1000).toFixed(2)}mA`} />
        <Wire x1={580} y1={180} x2={580} y2={210} active={Ic > 1e-6} />
        {/* LED */}
        <polygon points={`572,210 588,225 572,240`}
                 fill={Ic > 1e-6 ? '#ef4444' : '#475569'}
                 stroke="#f87171" strokeWidth={1.5} />
        <line x1={572} y1={225} x2={588} y2={225} stroke="#f87171" strokeWidth={2.5} />
        {Ic > 1e-6 && (
          <circle cx={580} cy={225} r={14 + bright * 6}
                  fill="#fca5a5" fillOpacity={0.15 + bright * 0.4} />
        )}
        <text x={605} y={228} fill="#f87171" fontSize={9} fontFamily="monospace">
          LED
        </text>
        <Wire x1={580} y1={240} x2={580} y2={280} active={Ic > 1e-6} />

        {/* BJT (NPN) at center-right */}
        <g>
          {/* Base */}
          <Wire x1={340} y1={160} x2={420} y2={160} active={Ib > 1e-6} />
          <line x1={420} y1={140} x2={420} y2={180} stroke="#a855f7" strokeWidth={3} />
          {/* Collector */}
          <Wire x1={580} y1={280} x2={580} y2={290} active={false /* visual only */} />
          <line x1={420} y1={150} x2={460} y2={140} stroke="#a855f7" strokeWidth={2} />
          <Wire x1={460} y1={140} x2={460} y2={110} active={Ic > 1e-6} />
          <Wire x1={460} y1={110} x2={580} y2={110} active={Ic > 1e-6} />
          <Wire x1={580} y1={110} x2={580} y2={100} active={Ic > 1e-6} />
          {/* Emitter (down to GND) */}
          <line x1={420} y1={170} x2={460} y2={180} stroke="#a855f7" strokeWidth={2} />
          <polygon points="455,176 460,180 453,184" fill="#a855f7" />
          <Wire x1={460} y1={180} x2={460} y2={280} active={Ic > 1e-6} />
          {/* labels */}
          <text x={425} y={130} fill="#a855f7" fontSize={9} textAnchor="end">C</text>
          <text x={425} y={195} fill="#a855f7" fontSize={9} textAnchor="end">E</text>
          <text x={414} y={163} fill="#a855f7" fontSize={9} textAnchor="end">B</text>
          <text x={490} y={195} fill="#a78bfa" fontSize={9} fontFamily="monospace">
            NPN 2N2222
          </text>
        </g>
        {/* GND rail */}
        <Wire x1={20} y1={280} x2={620} y2={280} active={Ic > 1e-6} />
        <Wire x1={20} y1={200} x2={20} y2={280} active={false} />
        <line x1={15} y1={285} x2={25} y2={285} stroke="#94a3b8" strokeWidth={2} />
        <line x1={17} y1={289} x2={23} y2={289} stroke="#94a3b8" strokeWidth={1.5} />
      </svg>

      <Controls>
        <div className="flex items-center gap-2 col-span-2">
          <span className="text-[11px] text-zinc-400">Arduino PIN:</span>
          <button
            onClick={() => setBaseHigh(true)}
            className={`px-3 py-1.5 text-xs rounded border ${
              baseHigh
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
          >
            digitalWrite(HIGH)
          </button>
          <button
            onClick={() => setBaseHigh(false)}
            className={`px-3 py-1.5 text-xs rounded border ${
              !baseHigh
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
          >
            digitalWrite(LOW)
          </button>
        </div>
        <Slider label="Vcc (tải)" value={Vcc} onChange={setVcc} min={3} max={24} step={0.5} unit="V" color="amber" />
        <Slider label="Rb (cực Base)" value={Rb} onChange={setRb} min={100} max={10000} step={100} unit="Ω" color="purple" />
        <Slider label="Rc (cực Collector)" value={Rc} onChange={setRc} min={50} max={2000} step={10} unit="Ω" color="cyan" />
      </Controls>

      <Measurements>
        <Meter label="Trạng thái" value={status}
               color={baseHigh && Ic > 1e-6 ? 'emerald' : 'slate'} />
        <Meter label="Ib (Base)"  value={`${(Ib * 1000).toFixed(3)} mA`} color="purple" />
        <Meter label="Ic (Tải)"   value={`${(Ic * 1000).toFixed(2)} mA`} color="amber" />
        <Meter label="β = Ic/Ib"  value={beta > 0 ? `${beta.toFixed(0)}` : '—'} color="purple" />
        <Meter label="P tải"      value={`${(power * 1000).toFixed(1)} mW`} color="yellow" />
      </Measurements>

      <Formula
        lines={[
          ['Bão hoà',          'Vbase ≥ 0.7V → BJT bật. Vce_sat ≈ 0.2V (gần như dây)'],
          ['Cutoff',           'Vbase < 0.7V → BJT tắt. Ic ≈ 0'],
          ['Tính Ib',          'Ib = (Vmcu − 0.7) / Rb'],
          ['Tính Ic',          'Ic = (Vcc − Vf − Vce_sat) / Rc'],
          ['Cần',              'Ib > Ic / β để BJT bão hoà (β = 100-300 thông thường)'],
        ]}
      />

      <AppNote
        title="Điều khiển relay 12V từ Arduino"
        body="Cuộn relay cần 70-100mA — Arduino pin chỉ cấp 20mA → cần BJT làm switch. Mạch driver tương tự + thêm diode bảo vệ ngược cực (flyback diode)."
      />
      <AppNote
        title="Điều khiển động cơ DC"
        body="Động cơ nhỏ (DC motor 3-12V) cần dòng lớn 200mA-1A. Dùng BJT công suất (TIP122) hoặc MOSFET — Arduino chỉ cấp tín hiệu Base."
      />
      <AppNote
        title="Mạch dòng đèn LED siêu sáng (1W, 3W)"
        body="LED công suất cao cần dòng 350-700mA — không thể nuôi từ pin Arduino. BJT/MOSFET làm switch + PWM để điều chỉnh độ sáng."
      />
    </Container>
  )
}

// ────────────────────────────────────────────────────────────────
// 8. Cầu Wheatstone
// ────────────────────────────────────────────────────────────────
function Wheatstone() {
  const [V, setV] = useState(9)
  const [R1, setR1] = useState(100)
  const [R2, setR2] = useState(100)
  const [R3, setR3] = useState(100)
  const [R4, setR4] = useState(100)
  // Vbridge = V · (R2/(R1+R2) - R4/(R3+R4))
  const Vleft  = V * R2 / (R1 + R2)
  const Vright = V * R4 / (R3 + R4)
  const Vbridge = Vleft - Vright
  const balanced = Math.abs(R1 * R4 - R2 * R3) < 0.5

  return (
    <Container title="Cầu Wheatstone"
               description="4 điện trở mắc thành cầu. Đo Vbridge = 0 ↔ cân bằng (R₁·R₄ = R₂·R₃).">
      <svg viewBox="0 0 700 360" className="w-full">
        <Rect />
        <BatterySymbol cx={50} cy={180} V={V} horizontal={false} />
        {/* Top node A */}
        <Wire x1={50} y1={160} x2={50} y2={70} active={true} />
        <Wire x1={50} y1={70}  x2={350} y2={70} active={true} />
        <circle cx={350} cy={70} r={5} fill="#fbbf24" />
        <text x={365} y={75} fill="#fbbf24" fontSize={11} fontFamily="monospace">A (+)</text>
        {/* Bottom node B */}
        <Wire x1={50} y1={200} x2={50} y2={310} active={true} />
        <Wire x1={50} y1={310} x2={350} y2={310} active={true} />
        <circle cx={350} cy={310} r={5} fill="#94a3b8" />
        <text x={365} y={315} fill="#94a3b8" fontSize={11} fontFamily="monospace">B (−)</text>

        {/* R1 (top-left, A → C) */}
        <ResistorSym cx={250} cy={120} vertical label={`R₁=${R1}Ω`} sub="" />
        <Wire x1={250} y1={70}  x2={250} y2={80}  active={true} />
        <Wire x1={250} y1={160} x2={250} y2={190} active={true} />

        {/* R2 (bottom-left, C → B) */}
        <ResistorSym cx={250} cy={250} vertical label={`R₂=${R2}Ω`} sub="" />
        <Wire x1={250} y1={210} x2={250} y2={210} active={true} />
        <Wire x1={250} y1={290} x2={250} y2={310} active={true} />

        {/* R3 (top-right, A → D) */}
        <ResistorSym cx={450} cy={120} vertical label={`R₃=${R3}Ω`} sub="" />
        <Wire x1={350} y1={70}  x2={450} y2={70} active={true} />
        <Wire x1={450} y1={70}  x2={450} y2={80} active={true} />
        <Wire x1={450} y1={160} x2={450} y2={190} active={true} />

        {/* R4 (bottom-right, D → B) */}
        <ResistorSym cx={450} cy={250} vertical label={`R₄=${R4}Ω`} sub="" />
        <Wire x1={350} y1={310} x2={450} y2={310} active={true} />
        <Wire x1={450} y1={290} x2={450} y2={310} active={true} />

        {/* Node C (between R1, R2) - left middle */}
        <circle cx={250} cy={200} r={5} fill="#22c55e" />
        <text x={210} y={205} fill="#22c55e" fontSize={11} fontFamily="monospace">C</text>
        <text x={210} y={220} fill="#22c55e" fontSize={9} fontFamily="monospace">
          {Vleft.toFixed(2)}V
        </text>
        {/* Node D (between R3, R4) - right middle */}
        <circle cx={450} cy={200} r={5} fill="#22c55e" />
        <text x={465} y={205} fill="#22c55e" fontSize={11} fontFamily="monospace">D</text>
        <text x={465} y={220} fill="#22c55e" fontSize={9} fontFamily="monospace">
          {Vright.toFixed(2)}V
        </text>

        {/* Galvanometer between C and D */}
        <Wire x1={250} y1={200} x2={320} y2={200} active={Math.abs(Vbridge) > 0.01} />
        <Wire x1={380} y1={200} x2={450} y2={200} active={Math.abs(Vbridge) > 0.01} />
        <circle cx={350} cy={200} r={28}
                fill="#1e1b3b" stroke="#a855f7" strokeWidth={2} />
        <text x={350} y={195} fill="#c4b5fd" fontSize={14} fontWeight={700} textAnchor="middle">G</text>
        <text x={350} y={210} fill="#a855f7" fontSize={9} fontFamily="monospace" textAnchor="middle">
          {Vbridge >= 0 ? '+' : ''}{Vbridge.toFixed(3)}V
        </text>
        {/* Needle */}
        <line x1={350} y1={200}
              x2={350 + Math.cos(-Math.PI / 2 + Math.atan(Vbridge * 2)) * 20}
              y2={200 + Math.sin(-Math.PI / 2 + Math.atan(Vbridge * 2)) * 20}
              stroke="#fbbf24" strokeWidth={2} />

        {/* Balance indicator */}
        {balanced && (
          <text x={350} y={170} fill="#22c55e" fontSize={11} fontFamily="monospace"
                fontWeight={700} textAnchor="middle">
            ⚖ CÂN BẰNG
          </text>
        )}
      </svg>

      <Controls>
        <Slider label="Vnguồn" value={V} onChange={setV} min={1} max={24} step={0.5} unit="V" color="amber" />
        <Slider label="R₁" value={R1} onChange={setR1} min={1} max={500} step={1} unit="Ω" color="cyan" />
        <Slider label="R₂" value={R2} onChange={setR2} min={1} max={500} step={1} unit="Ω" color="cyan" />
        <Slider label="R₃" value={R3} onChange={setR3} min={1} max={500} step={1} unit="Ω" color="cyan" />
        <Slider label="R₄ (cần đo)" value={R4} onChange={setR4} min={1} max={500} step={1} unit="Ω" color="rose" />
      </Controls>

      <Measurements>
        <Meter label="VC = V·R₂/(R₁+R₂)"  value={`${Vleft.toFixed(3)} V`} color="purple" />
        <Meter label="VD = V·R₄/(R₃+R₄)"  value={`${Vright.toFixed(3)} V`} color="purple" />
        <Meter label="Vbridge = VC − VD"   value={`${Vbridge.toFixed(4)} V`}
               color={balanced ? 'emerald' : 'amber'} />
        <Meter label="Trạng thái"          value={balanced ? '⚖ Cân bằng' : 'Lệch'}
               color={balanced ? 'emerald' : 'amber'} />
        <Meter label="Tỉ số R₁/R₂"         value={`${(R1 / R2).toFixed(3)}`} color="slate" />
        <Meter label="Tỉ số R₃/R₄"         value={`${(R3 / R4).toFixed(3)}`} color="slate" />
      </Measurements>

      <Formula
        lines={[
          ['Điều kiện cân bằng', 'R₁ · R₄ = R₂ · R₃ → Vbridge = 0'],
          ['Suy ra',             'R₄ = R₂ · R₃ / R₁ (đo R₄ chưa biết)'],
          ['Điện áp lệch',       'Vbridge = V · (R₂/(R₁+R₂) − R₄/(R₃+R₄))'],
          ['Độ nhạy',            'Cầu cân bằng giúp đo R chính xác hơn ampe kế trực tiếp'],
        ]}
      />

      <AppNote
        title="Cân điện tử (strain gauge)"
        body="4 strain gauge dán trên thanh kim loại tạo thành cầu Wheatstone. Khi có lực ép → R thay đổi 0.01% → Vbridge ≠ 0 → khuếch đại op-amp → MCU tính ra khối lượng. Mọi cân điện tử (cân nhà bếp, cân siêu thị, cân xe tải) đều dùng nguyên lý này."
      />
      <AppNote
        title="Cảm biến áp suất ô-tô"
        body="Cảm biến áp suất lốp xe (TPMS), cảm biến MAP đo áp suất hút động cơ, tất cả đều dùng cầu Wheatstone với cảm biến piezoresistive."
      />
      <AppNote
        title="Đo điện trở chính xác (Ohmmeter)"
        body="Đồng hồ đo điện trở chính xác cao (4-wire / Kelvin connection) dùng nguyên lý cầu để loại trừ điện trở dây dẫn. Phòng thí nghiệm chuẩn đo R với độ chính xác 0.001%."
      />
    </Container>
  )
}

// ────────────────────────────────────────────────────────────────
// Reusable UI components
// ────────────────────────────────────────────────────────────────

function Container({ title, description, children }: {
  title: string; description: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-4">
        <h2 className="text-base font-semibold text-amber-200">{title}</h2>
        <p className="text-xs text-zinc-300 mt-1">{description}</p>
      </div>
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
        {children}
      </div>
    </div>
  )
}

function Controls({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
      {children}
    </div>
  )
}

function Slider({ label, value, onChange, min, max, step, unit, color }: {
  label: string; value: number; onChange: (n: number) => void
  min: number; max: number; step: number; unit: string
  color: 'amber' | 'cyan' | 'purple' | 'pink' | 'rose'
}) {
  const accent: Record<string, string> = {
    amber: 'accent-amber-500', cyan: 'accent-cyan-500',
    purple: 'accent-purple-500', pink: 'accent-pink-500', rose: 'accent-rose-500',
  }
  const text: Record<string, string> = {
    amber: 'text-amber-300', cyan: 'text-cyan-300',
    purple: 'text-purple-300', pink: 'text-pink-300', rose: 'text-rose-300',
  }
  return (
    <div className="flex items-center gap-2 p-2 rounded bg-zinc-800/40 border border-zinc-800">
      <label className="text-[11px] text-zinc-400 w-24 shrink-0">{label}</label>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className={`flex-1 ${accent[color]}`}
      />
      <span className={`font-mono text-xs ${text[color]} w-20 text-right`}>
        {Number.isInteger(step) ? value.toFixed(0) : value.toFixed(1)} {unit}
      </span>
    </div>
  )
}

function Measurements({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
        <Gauge className="w-3 h-3" /> Số đo
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-mono text-xs">
        {children}
      </div>
    </div>
  )
}

function Meter({ label, value, color }: {
  label: string; value: string
  color: 'cyan' | 'amber' | 'emerald' | 'purple' | 'yellow' | 'pink' | 'rose' | 'slate'
}) {
  const colors: Record<string, string> = {
    cyan:    'text-cyan-300 bg-cyan-500/10 border-cyan-500/30',
    amber:   'text-amber-300 bg-amber-500/10 border-amber-500/30',
    emerald: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
    purple:  'text-purple-300 bg-purple-500/10 border-purple-500/30',
    yellow:  'text-yellow-300 bg-yellow-500/10 border-yellow-500/30',
    pink:    'text-pink-300 bg-pink-500/10 border-pink-500/30',
    rose:    'text-rose-300 bg-rose-500/10 border-rose-500/30',
    slate:   'text-slate-300 bg-slate-500/5 border-slate-700',
  }
  return (
    <div className="flex items-center justify-between px-3 py-1.5 rounded border border-zinc-800">
      <span className="text-zinc-400">{label}</span>
      <span className={`px-2 py-0.5 rounded border ${colors[color]}`}>{value}</span>
    </div>
  )
}

function Formula({ lines }: { lines: [string, string][] }) {
  return (
    <div className="mt-4 p-3 rounded-lg bg-black/40 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
      <div className="flex items-center gap-1.5 text-cyan-300 font-semibold mb-1">
        <Info className="w-3.5 h-3.5" /> Công thức
      </div>
      {lines.map(([k, v], i) => (
        <div key={i}><span className="text-zinc-500">{k}:</span>{' '}<span className="text-zinc-200">{v}</span></div>
      ))}
    </div>
  )
}

function AppNote({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-emerald-500/8 to-teal-500/8 border border-emerald-500/30">
      <div className="flex items-center gap-1.5 text-emerald-300 font-semibold text-xs mb-1">
        💡 Ứng dụng đời sống — {title}
      </div>
      <div className="text-[11px] text-zinc-300 leading-relaxed">{body}</div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// SVG primitives
// ────────────────────────────────────────────────────────────────

function Rect() {
  return <rect x={0} y={0} width="100%" height="100%" fill="#0b0f1a" rx={8} />
}

function Wire({ x1, y1, x2, y2, active }: {
  x1: number; y1: number; x2: number; y2: number; active: boolean
}) {
  return (
    <line x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={active ? '#ef4444' : '#334155'} strokeWidth={3} strokeLinecap="round" />
  )
}

function BatterySymbol({ cx, cy, V, horizontal = false }: {
  cx: number; cy: number; V: number; horizontal?: boolean
}) {
  if (horizontal) {
    return (
      <g>
        <line x1={cx - 20} y1={cy - 10} x2={cx - 20} y2={cy + 10} stroke="#fbbf24" strokeWidth={3} />
        <line x1={cx - 10} y1={cy - 6}  x2={cx - 10} y2={cy + 6}  stroke="#fbbf24" strokeWidth={5} />
        <line x1={cx} y1={cy - 10}      x2={cx} y2={cy + 10}      stroke="#fbbf24" strokeWidth={3} />
        <line x1={cx + 10} y1={cy - 6}  x2={cx + 10} y2={cy + 6}  stroke="#fbbf24" strokeWidth={5} />
        <line x1={cx - 30} y1={cy} x2={cx - 20} y2={cy} stroke="#ef4444" strokeWidth={3} />
        <line x1={cx + 10} y1={cy} x2={cx + 20} y2={cy} stroke="#ef4444" strokeWidth={3} />
      </g>
    )
  }
  return (
    <g>
      <line x1={cx - 10} y1={cy - 20} x2={cx + 10} y2={cy - 20} stroke="#fbbf24" strokeWidth={3} />
      <line x1={cx - 6}  y1={cy - 10} x2={cx + 6}  y2={cy - 10} stroke="#fbbf24" strokeWidth={5} />
      <line x1={cx - 10} y1={cy}      x2={cx + 10} y2={cy}      stroke="#fbbf24" strokeWidth={3} />
      <line x1={cx - 6}  y1={cy + 10} x2={cx + 6}  y2={cy + 10} stroke="#fbbf24" strokeWidth={5} />
      <text x={cx + 18} y={cy + 4} fill="#fbbf24" fontSize={11} fontFamily="monospace" fontWeight={600}>
        {V.toFixed(1)}V
      </text>
    </g>
  )
}

function ResistorSym({ cx, cy, vertical, label, sub }: {
  cx: number; cy: number; vertical?: boolean; label: string; sub?: string
}) {
  if (vertical) {
    return (
      <g>
        <path d={`M ${cx} ${cy - 30}
                  l -8 4 l 16 8 l -16 8 l 16 8 l -16 8 l 8 4`}
              stroke="#fbbf24" strokeWidth={2} fill="none" />
        <text x={cx + 14} y={cy - 5} fill="#fbbf24" fontSize={9} fontFamily="monospace">
          {label}
        </text>
        {sub && <text x={cx + 14} y={cy + 8} fill="#94a3b8" fontSize={9} fontFamily="monospace">{sub}</text>}
      </g>
    )
  }
  return (
    <g>
      <path d={`M ${cx - 30} ${cy}
                l 4 -8 l 8 16 l 8 -16 l 8 16 l 8 -16 l 4 8`}
            stroke="#fbbf24" strokeWidth={2} fill="none" />
      <text x={cx} y={cy - 18} fill="#fbbf24" fontSize={9} fontFamily="monospace" textAnchor="middle">
        {label}
      </text>
      {sub && <text x={cx} y={cy + 26} fill="#94a3b8" fontSize={9} fontFamily="monospace" textAnchor="middle">{sub}</text>}
    </g>
  )
}

function BulbSym({ cx, cy, bright, label, sub }: {
  cx: number; cy: number; bright: number; label: string; sub?: string
}) {
  return (
    <g>
      {bright > 0 && (
        <circle cx={cx} cy={cy} r={20 + bright * 6}
                fill="#fde047" fillOpacity={0.1 + bright * 0.4} />
      )}
      <circle cx={cx} cy={cy} r={14} fill="#fde047" fillOpacity={0.25 + bright * 0.5}
              stroke="#eab308" strokeWidth={1.5} />
      <path d={`M ${cx - 8} ${cy} l 2 -5 l 2 5 l 2 -5 l 2 5 l 2 -5 l 2 5 l 2 -5`}
            stroke="#92400e" strokeWidth={1} fill="none" />
      <text x={cx} y={cy - 22} fill="#eab308" fontSize={9} fontFamily="monospace" textAnchor="middle">
        {label}
      </text>
      {sub && <text x={cx} y={cy + 30} fill="#94a3b8" fontSize={9} fontFamily="monospace" textAnchor="middle">{sub}</text>}
    </g>
  )
}
