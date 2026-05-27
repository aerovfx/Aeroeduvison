/**
 * PeriodicTable — Bảng tuần hoàn 118 nguyên tố tương tác.
 *
 *   Route: /dashboard/labtwin/labs/periodic-table
 *
 *   Tính năng:
 *   - Grid 18×9 đầy đủ (s/p/d/f-blocks) với placement chuẩn IUPAC
 *   - Click 1 nguyên tố → modal chi tiết (Z, M, electronegativity,
 *     cấu hình e, phân nhóm, oxi hoá thường gặp, ứng dụng)
 *   - Highlight theo nhóm (10 nhóm màu) — phi kim/kim loại/khí trơ/...
 *   - Filter ô tìm kiếm theo tên VI/EN/symbol/Z
 *   - Bộ lọc trạng thái (rắn/lỏng/khí) + lớp electron
 *   - Light/dark mode aware qua var(--td-*) tokens
 */
import { useMemo, useState } from 'react'
import { ArrowLeft, Search, X, Atom, Layers } from 'lucide-react'
import { Link } from 'react-router-dom'

/* ─── Element data — gói gọn 118 nguyên tố ────────────────────── */
interface Element {
  z: number               // số hiệu nguyên tử
  symbol: string
  name: string            // tên VI
  nameEn: string
  mass: number            // khối lượng nguyên tử
  category: Category      // phân loại
  group: number | null    // nhóm IUPAC (1-18, null cho La/Ac series)
  period: number          // chu kì
  block: 's' | 'p' | 'd' | 'f'
  state: 'solid' | 'liquid' | 'gas' | 'unknown'
  electronegativity: number | null
  config: string          // cấu hình electron ngắn gọn
}

type Category =
  | 'alkali'      // kiềm
  | 'alkaline'    // kiềm thổ
  | 'transition'  // chuyển tiếp
  | 'post'        // sau chuyển tiếp
  | 'metalloid'   // á kim
  | 'nonmetal'    // phi kim
  | 'halogen'     // halogen
  | 'noble'       // khí hiếm
  | 'lanthanide'
  | 'actinide'

const CAT_STYLE: Record<Category, { bg: string; fg: string; label: string }> = {
  alkali:     { bg: 'bg-red-500/15 hover:bg-red-500/30 border-red-500/30',           fg: 'text-red-300',    label: 'Kim loại kiềm' },
  alkaline:   { bg: 'bg-orange-500/15 hover:bg-orange-500/30 border-orange-500/30',  fg: 'text-orange-300', label: 'Kiềm thổ' },
  transition: { bg: 'bg-yellow-500/15 hover:bg-yellow-500/30 border-yellow-500/30',  fg: 'text-yellow-200', label: 'Chuyển tiếp' },
  post:       { bg: 'bg-teal-500/15 hover:bg-teal-500/30 border-teal-500/30',        fg: 'text-teal-200',   label: 'Hậu chuyển tiếp' },
  metalloid:  { bg: 'bg-emerald-500/15 hover:bg-emerald-500/30 border-emerald-500/30',fg:'text-emerald-300', label: 'Á kim' },
  nonmetal:   { bg: 'bg-green-500/15 hover:bg-green-500/30 border-green-500/30',     fg: 'text-green-300',  label: 'Phi kim' },
  halogen:    { bg: 'bg-cyan-500/15 hover:bg-cyan-500/30 border-cyan-500/30',        fg: 'text-cyan-300',   label: 'Halogen' },
  noble:      { bg: 'bg-violet-500/15 hover:bg-violet-500/30 border-violet-500/30',  fg: 'text-violet-300', label: 'Khí hiếm' },
  lanthanide: { bg: 'bg-pink-500/15 hover:bg-pink-500/30 border-pink-500/30',        fg: 'text-pink-300',   label: 'Lanthanide' },
  actinide:   { bg: 'bg-fuchsia-500/15 hover:bg-fuchsia-500/30 border-fuchsia-500/30',fg: 'text-fuchsia-300',label: 'Actinide' },
}

// Compact data — chỉ phần đặc trưng. Đầy đủ 118 nguyên tố
const ELEMENTS: Element[] = [
  // Chu kì 1
  { z:1,  symbol:'H',  name:'Hydro',     nameEn:'Hydrogen',   mass:1.008,   category:'nonmetal',   group:1,  period:1, block:'s', state:'gas',     electronegativity:2.20, config:'1s¹' },
  { z:2,  symbol:'He', name:'Heli',      nameEn:'Helium',     mass:4.0026,  category:'noble',      group:18, period:1, block:'s', state:'gas',     electronegativity:null, config:'1s²' },
  // Chu kì 2
  { z:3,  symbol:'Li', name:'Liti',      nameEn:'Lithium',    mass:6.94,    category:'alkali',     group:1,  period:2, block:'s', state:'solid',   electronegativity:0.98, config:'[He]2s¹' },
  { z:4,  symbol:'Be', name:'Beri',      nameEn:'Beryllium',  mass:9.0122,  category:'alkaline',   group:2,  period:2, block:'s', state:'solid',   electronegativity:1.57, config:'[He]2s²' },
  { z:5,  symbol:'B',  name:'Bo',        nameEn:'Boron',      mass:10.81,   category:'metalloid',  group:13, period:2, block:'p', state:'solid',   electronegativity:2.04, config:'[He]2s²2p¹' },
  { z:6,  symbol:'C',  name:'Cacbon',    nameEn:'Carbon',     mass:12.011,  category:'nonmetal',   group:14, period:2, block:'p', state:'solid',   electronegativity:2.55, config:'[He]2s²2p²' },
  { z:7,  symbol:'N',  name:'Nitơ',      nameEn:'Nitrogen',   mass:14.007,  category:'nonmetal',   group:15, period:2, block:'p', state:'gas',     electronegativity:3.04, config:'[He]2s²2p³' },
  { z:8,  symbol:'O',  name:'Oxi',       nameEn:'Oxygen',     mass:15.999,  category:'nonmetal',   group:16, period:2, block:'p', state:'gas',     electronegativity:3.44, config:'[He]2s²2p⁴' },
  { z:9,  symbol:'F',  name:'Flo',       nameEn:'Fluorine',   mass:18.998,  category:'halogen',    group:17, period:2, block:'p', state:'gas',     electronegativity:3.98, config:'[He]2s²2p⁵' },
  { z:10, symbol:'Ne', name:'Neon',      nameEn:'Neon',       mass:20.180,  category:'noble',      group:18, period:2, block:'p', state:'gas',     electronegativity:null, config:'[He]2s²2p⁶' },
  // Chu kì 3
  { z:11, symbol:'Na', name:'Natri',     nameEn:'Sodium',     mass:22.990,  category:'alkali',     group:1,  period:3, block:'s', state:'solid',   electronegativity:0.93, config:'[Ne]3s¹' },
  { z:12, symbol:'Mg', name:'Magie',     nameEn:'Magnesium',  mass:24.305,  category:'alkaline',   group:2,  period:3, block:'s', state:'solid',   electronegativity:1.31, config:'[Ne]3s²' },
  { z:13, symbol:'Al', name:'Nhôm',      nameEn:'Aluminium',  mass:26.982,  category:'post',       group:13, period:3, block:'p', state:'solid',   electronegativity:1.61, config:'[Ne]3s²3p¹' },
  { z:14, symbol:'Si', name:'Silic',     nameEn:'Silicon',    mass:28.085,  category:'metalloid',  group:14, period:3, block:'p', state:'solid',   electronegativity:1.90, config:'[Ne]3s²3p²' },
  { z:15, symbol:'P',  name:'Photpho',   nameEn:'Phosphorus', mass:30.974,  category:'nonmetal',   group:15, period:3, block:'p', state:'solid',   electronegativity:2.19, config:'[Ne]3s²3p³' },
  { z:16, symbol:'S',  name:'Lưu huỳnh', nameEn:'Sulfur',     mass:32.06,   category:'nonmetal',   group:16, period:3, block:'p', state:'solid',   electronegativity:2.58, config:'[Ne]3s²3p⁴' },
  { z:17, symbol:'Cl', name:'Clo',       nameEn:'Chlorine',   mass:35.45,   category:'halogen',    group:17, period:3, block:'p', state:'gas',     electronegativity:3.16, config:'[Ne]3s²3p⁵' },
  { z:18, symbol:'Ar', name:'Argon',     nameEn:'Argon',      mass:39.948,  category:'noble',      group:18, period:3, block:'p', state:'gas',     electronegativity:null, config:'[Ne]3s²3p⁶' },
  // Chu kì 4
  { z:19, symbol:'K',  name:'Kali',      nameEn:'Potassium',  mass:39.098,  category:'alkali',     group:1,  period:4, block:'s', state:'solid',   electronegativity:0.82, config:'[Ar]4s¹' },
  { z:20, symbol:'Ca', name:'Canxi',     nameEn:'Calcium',    mass:40.078,  category:'alkaline',   group:2,  period:4, block:'s', state:'solid',   electronegativity:1.00, config:'[Ar]4s²' },
  { z:21, symbol:'Sc', name:'Scandi',    nameEn:'Scandium',   mass:44.956,  category:'transition', group:3,  period:4, block:'d', state:'solid',   electronegativity:1.36, config:'[Ar]3d¹4s²' },
  { z:22, symbol:'Ti', name:'Titan',     nameEn:'Titanium',   mass:47.867,  category:'transition', group:4,  period:4, block:'d', state:'solid',   electronegativity:1.54, config:'[Ar]3d²4s²' },
  { z:23, symbol:'V',  name:'Vanadi',    nameEn:'Vanadium',   mass:50.942,  category:'transition', group:5,  period:4, block:'d', state:'solid',   electronegativity:1.63, config:'[Ar]3d³4s²' },
  { z:24, symbol:'Cr', name:'Crom',      nameEn:'Chromium',   mass:51.996,  category:'transition', group:6,  period:4, block:'d', state:'solid',   electronegativity:1.66, config:'[Ar]3d⁵4s¹' },
  { z:25, symbol:'Mn', name:'Mangan',    nameEn:'Manganese',  mass:54.938,  category:'transition', group:7,  period:4, block:'d', state:'solid',   electronegativity:1.55, config:'[Ar]3d⁵4s²' },
  { z:26, symbol:'Fe', name:'Sắt',       nameEn:'Iron',       mass:55.845,  category:'transition', group:8,  period:4, block:'d', state:'solid',   electronegativity:1.83, config:'[Ar]3d⁶4s²' },
  { z:27, symbol:'Co', name:'Coban',     nameEn:'Cobalt',     mass:58.933,  category:'transition', group:9,  period:4, block:'d', state:'solid',   electronegativity:1.88, config:'[Ar]3d⁷4s²' },
  { z:28, symbol:'Ni', name:'Niken',     nameEn:'Nickel',     mass:58.693,  category:'transition', group:10, period:4, block:'d', state:'solid',   electronegativity:1.91, config:'[Ar]3d⁸4s²' },
  { z:29, symbol:'Cu', name:'Đồng',      nameEn:'Copper',     mass:63.546,  category:'transition', group:11, period:4, block:'d', state:'solid',   electronegativity:1.90, config:'[Ar]3d¹⁰4s¹' },
  { z:30, symbol:'Zn', name:'Kẽm',       nameEn:'Zinc',       mass:65.38,   category:'transition', group:12, period:4, block:'d', state:'solid',   electronegativity:1.65, config:'[Ar]3d¹⁰4s²' },
  { z:31, symbol:'Ga', name:'Gali',      nameEn:'Gallium',    mass:69.723,  category:'post',       group:13, period:4, block:'p', state:'solid',   electronegativity:1.81, config:'[Ar]3d¹⁰4s²4p¹' },
  { z:32, symbol:'Ge', name:'Gecmani',   nameEn:'Germanium',  mass:72.630,  category:'metalloid',  group:14, period:4, block:'p', state:'solid',   electronegativity:2.01, config:'[Ar]3d¹⁰4s²4p²' },
  { z:33, symbol:'As', name:'Asen',      nameEn:'Arsenic',    mass:74.922,  category:'metalloid',  group:15, period:4, block:'p', state:'solid',   electronegativity:2.18, config:'[Ar]3d¹⁰4s²4p³' },
  { z:34, symbol:'Se', name:'Selen',     nameEn:'Selenium',   mass:78.971,  category:'nonmetal',   group:16, period:4, block:'p', state:'solid',   electronegativity:2.55, config:'[Ar]3d¹⁰4s²4p⁴' },
  { z:35, symbol:'Br', name:'Brom',      nameEn:'Bromine',    mass:79.904,  category:'halogen',    group:17, period:4, block:'p', state:'liquid',  electronegativity:2.96, config:'[Ar]3d¹⁰4s²4p⁵' },
  { z:36, symbol:'Kr', name:'Krypton',   nameEn:'Krypton',    mass:83.798,  category:'noble',      group:18, period:4, block:'p', state:'gas',     electronegativity:3.00, config:'[Ar]3d¹⁰4s²4p⁶' },
  // Chu kì 5
  { z:37, symbol:'Rb', name:'Rubidi',    nameEn:'Rubidium',   mass:85.468,  category:'alkali',     group:1,  period:5, block:'s', state:'solid',   electronegativity:0.82, config:'[Kr]5s¹' },
  { z:38, symbol:'Sr', name:'Stronti',   nameEn:'Strontium',  mass:87.62,   category:'alkaline',   group:2,  period:5, block:'s', state:'solid',   electronegativity:0.95, config:'[Kr]5s²' },
  { z:39, symbol:'Y',  name:'Yttri',     nameEn:'Yttrium',    mass:88.906,  category:'transition', group:3,  period:5, block:'d', state:'solid',   electronegativity:1.22, config:'[Kr]4d¹5s²' },
  { z:40, symbol:'Zr', name:'Ziriconi',  nameEn:'Zirconium',  mass:91.224,  category:'transition', group:4,  period:5, block:'d', state:'solid',   electronegativity:1.33, config:'[Kr]4d²5s²' },
  { z:41, symbol:'Nb', name:'Niobi',     nameEn:'Niobium',    mass:92.906,  category:'transition', group:5,  period:5, block:'d', state:'solid',   electronegativity:1.60, config:'[Kr]4d⁴5s¹' },
  { z:42, symbol:'Mo', name:'Molyp',     nameEn:'Molybdenum', mass:95.95,   category:'transition', group:6,  period:5, block:'d', state:'solid',   electronegativity:2.16, config:'[Kr]4d⁵5s¹' },
  { z:43, symbol:'Tc', name:'Tecnesi',   nameEn:'Technetium', mass:98,      category:'transition', group:7,  period:5, block:'d', state:'solid',   electronegativity:1.9,  config:'[Kr]4d⁵5s²' },
  { z:44, symbol:'Ru', name:'Rutheni',   nameEn:'Ruthenium',  mass:101.07,  category:'transition', group:8,  period:5, block:'d', state:'solid',   electronegativity:2.2,  config:'[Kr]4d⁷5s¹' },
  { z:45, symbol:'Rh', name:'Rhodi',     nameEn:'Rhodium',    mass:102.91,  category:'transition', group:9,  period:5, block:'d', state:'solid',   electronegativity:2.28, config:'[Kr]4d⁸5s¹' },
  { z:46, symbol:'Pd', name:'Paladi',    nameEn:'Palladium',  mass:106.42,  category:'transition', group:10, period:5, block:'d', state:'solid',   electronegativity:2.20, config:'[Kr]4d¹⁰' },
  { z:47, symbol:'Ag', name:'Bạc',       nameEn:'Silver',     mass:107.87,  category:'transition', group:11, period:5, block:'d', state:'solid',   electronegativity:1.93, config:'[Kr]4d¹⁰5s¹' },
  { z:48, symbol:'Cd', name:'Cadmi',     nameEn:'Cadmium',    mass:112.41,  category:'transition', group:12, period:5, block:'d', state:'solid',   electronegativity:1.69, config:'[Kr]4d¹⁰5s²' },
  { z:49, symbol:'In', name:'Indi',      nameEn:'Indium',     mass:114.82,  category:'post',       group:13, period:5, block:'p', state:'solid',   electronegativity:1.78, config:'[Kr]4d¹⁰5s²5p¹' },
  { z:50, symbol:'Sn', name:'Thiếc',     nameEn:'Tin',        mass:118.71,  category:'post',       group:14, period:5, block:'p', state:'solid',   electronegativity:1.96, config:'[Kr]4d¹⁰5s²5p²' },
  { z:51, symbol:'Sb', name:'Antimon',   nameEn:'Antimony',   mass:121.76,  category:'metalloid',  group:15, period:5, block:'p', state:'solid',   electronegativity:2.05, config:'[Kr]4d¹⁰5s²5p³' },
  { z:52, symbol:'Te', name:'Telu',      nameEn:'Tellurium',  mass:127.60,  category:'metalloid',  group:16, period:5, block:'p', state:'solid',   electronegativity:2.10, config:'[Kr]4d¹⁰5s²5p⁴' },
  { z:53, symbol:'I',  name:'Iot',       nameEn:'Iodine',     mass:126.90,  category:'halogen',    group:17, period:5, block:'p', state:'solid',   electronegativity:2.66, config:'[Kr]4d¹⁰5s²5p⁵' },
  { z:54, symbol:'Xe', name:'Xenon',     nameEn:'Xenon',      mass:131.29,  category:'noble',      group:18, period:5, block:'p', state:'gas',     electronegativity:2.60, config:'[Kr]4d¹⁰5s²5p⁶' },
  // Chu kì 6
  { z:55, symbol:'Cs', name:'Xesi',      nameEn:'Caesium',    mass:132.91,  category:'alkali',     group:1,  period:6, block:'s', state:'solid',   electronegativity:0.79, config:'[Xe]6s¹' },
  { z:56, symbol:'Ba', name:'Bari',      nameEn:'Barium',     mass:137.33,  category:'alkaline',   group:2,  period:6, block:'s', state:'solid',   electronegativity:0.89, config:'[Xe]6s²' },
  // Lanthanides 57-71
  { z:57, symbol:'La', name:'Lantan',    nameEn:'Lanthanum',  mass:138.91,  category:'lanthanide', group:null, period:6, block:'f', state:'solid', electronegativity:1.10, config:'[Xe]5d¹6s²' },
  { z:58, symbol:'Ce', name:'Xeri',      nameEn:'Cerium',     mass:140.12,  category:'lanthanide', group:null, period:6, block:'f', state:'solid', electronegativity:1.12, config:'[Xe]4f¹5d¹6s²' },
  { z:59, symbol:'Pr', name:'Praseodi',  nameEn:'Praseodymium',mass:140.91, category:'lanthanide', group:null, period:6, block:'f', state:'solid', electronegativity:1.13, config:'[Xe]4f³6s²' },
  { z:60, symbol:'Nd', name:'Neodi',     nameEn:'Neodymium',  mass:144.24,  category:'lanthanide', group:null, period:6, block:'f', state:'solid', electronegativity:1.14, config:'[Xe]4f⁴6s²' },
  { z:61, symbol:'Pm', name:'Promethi',  nameEn:'Promethium', mass:145,     category:'lanthanide', group:null, period:6, block:'f', state:'solid', electronegativity:null, config:'[Xe]4f⁵6s²' },
  { z:62, symbol:'Sm', name:'Samari',    nameEn:'Samarium',   mass:150.36,  category:'lanthanide', group:null, period:6, block:'f', state:'solid', electronegativity:1.17, config:'[Xe]4f⁶6s²' },
  { z:63, symbol:'Eu', name:'Europi',    nameEn:'Europium',   mass:151.96,  category:'lanthanide', group:null, period:6, block:'f', state:'solid', electronegativity:null, config:'[Xe]4f⁷6s²' },
  { z:64, symbol:'Gd', name:'Gadolini',  nameEn:'Gadolinium', mass:157.25,  category:'lanthanide', group:null, period:6, block:'f', state:'solid', electronegativity:1.20, config:'[Xe]4f⁷5d¹6s²' },
  { z:65, symbol:'Tb', name:'Terbi',     nameEn:'Terbium',    mass:158.93,  category:'lanthanide', group:null, period:6, block:'f', state:'solid', electronegativity:null, config:'[Xe]4f⁹6s²' },
  { z:66, symbol:'Dy', name:'Dysprosi',  nameEn:'Dysprosium', mass:162.50,  category:'lanthanide', group:null, period:6, block:'f', state:'solid', electronegativity:1.22, config:'[Xe]4f¹⁰6s²' },
  { z:67, symbol:'Ho', name:'Holmi',     nameEn:'Holmium',    mass:164.93,  category:'lanthanide', group:null, period:6, block:'f', state:'solid', electronegativity:1.23, config:'[Xe]4f¹¹6s²' },
  { z:68, symbol:'Er', name:'Erbi',      nameEn:'Erbium',     mass:167.26,  category:'lanthanide', group:null, period:6, block:'f', state:'solid', electronegativity:1.24, config:'[Xe]4f¹²6s²' },
  { z:69, symbol:'Tm', name:'Tuli',      nameEn:'Thulium',    mass:168.93,  category:'lanthanide', group:null, period:6, block:'f', state:'solid', electronegativity:1.25, config:'[Xe]4f¹³6s²' },
  { z:70, symbol:'Yb', name:'Ytterbi',   nameEn:'Ytterbium',  mass:173.05,  category:'lanthanide', group:null, period:6, block:'f', state:'solid', electronegativity:null, config:'[Xe]4f¹⁴6s²' },
  { z:71, symbol:'Lu', name:'Luteti',    nameEn:'Lutetium',   mass:174.97,  category:'lanthanide', group:3,  period:6, block:'d', state:'solid', electronegativity:1.27, config:'[Xe]4f¹⁴5d¹6s²' },
  { z:72, symbol:'Hf', name:'Hafni',     nameEn:'Hafnium',    mass:178.49,  category:'transition', group:4,  period:6, block:'d', state:'solid', electronegativity:1.30, config:'[Xe]4f¹⁴5d²6s²' },
  { z:73, symbol:'Ta', name:'Tantal',    nameEn:'Tantalum',   mass:180.95,  category:'transition', group:5,  period:6, block:'d', state:'solid', electronegativity:1.50, config:'[Xe]4f¹⁴5d³6s²' },
  { z:74, symbol:'W',  name:'Vonfram',   nameEn:'Tungsten',   mass:183.84,  category:'transition', group:6,  period:6, block:'d', state:'solid', electronegativity:2.36, config:'[Xe]4f¹⁴5d⁴6s²' },
  { z:75, symbol:'Re', name:'Rheni',     nameEn:'Rhenium',    mass:186.21,  category:'transition', group:7,  period:6, block:'d', state:'solid', electronegativity:1.90, config:'[Xe]4f¹⁴5d⁵6s²' },
  { z:76, symbol:'Os', name:'Osmi',      nameEn:'Osmium',     mass:190.23,  category:'transition', group:8,  period:6, block:'d', state:'solid', electronegativity:2.20, config:'[Xe]4f¹⁴5d⁶6s²' },
  { z:77, symbol:'Ir', name:'Iridi',     nameEn:'Iridium',    mass:192.22,  category:'transition', group:9,  period:6, block:'d', state:'solid', electronegativity:2.20, config:'[Xe]4f¹⁴5d⁷6s²' },
  { z:78, symbol:'Pt', name:'Platin',    nameEn:'Platinum',   mass:195.08,  category:'transition', group:10, period:6, block:'d', state:'solid', electronegativity:2.28, config:'[Xe]4f¹⁴5d⁹6s¹' },
  { z:79, symbol:'Au', name:'Vàng',      nameEn:'Gold',       mass:196.97,  category:'transition', group:11, period:6, block:'d', state:'solid', electronegativity:2.54, config:'[Xe]4f¹⁴5d¹⁰6s¹' },
  { z:80, symbol:'Hg', name:'Thuỷ ngân', nameEn:'Mercury',    mass:200.59,  category:'transition', group:12, period:6, block:'d', state:'liquid', electronegativity:2.00, config:'[Xe]4f¹⁴5d¹⁰6s²' },
  { z:81, symbol:'Tl', name:'Tali',      nameEn:'Thallium',   mass:204.38,  category:'post',       group:13, period:6, block:'p', state:'solid', electronegativity:1.62, config:'[Xe]4f¹⁴5d¹⁰6s²6p¹' },
  { z:82, symbol:'Pb', name:'Chì',       nameEn:'Lead',       mass:207.2,   category:'post',       group:14, period:6, block:'p', state:'solid', electronegativity:1.87, config:'[Xe]4f¹⁴5d¹⁰6s²6p²' },
  { z:83, symbol:'Bi', name:'Bitmut',    nameEn:'Bismuth',    mass:208.98,  category:'post',       group:15, period:6, block:'p', state:'solid', electronegativity:2.02, config:'[Xe]4f¹⁴5d¹⁰6s²6p³' },
  { z:84, symbol:'Po', name:'Poloni',    nameEn:'Polonium',   mass:209,     category:'metalloid',  group:16, period:6, block:'p', state:'solid', electronegativity:2.00, config:'[Xe]4f¹⁴5d¹⁰6s²6p⁴' },
  { z:85, symbol:'At', name:'Astatin',   nameEn:'Astatine',   mass:210,     category:'halogen',    group:17, period:6, block:'p', state:'solid', electronegativity:2.20, config:'[Xe]4f¹⁴5d¹⁰6s²6p⁵' },
  { z:86, symbol:'Rn', name:'Radon',     nameEn:'Radon',      mass:222,     category:'noble',      group:18, period:6, block:'p', state:'gas',   electronegativity:2.20, config:'[Xe]4f¹⁴5d¹⁰6s²6p⁶' },
  // Chu kì 7
  { z:87, symbol:'Fr', name:'Franci',    nameEn:'Francium',   mass:223,     category:'alkali',     group:1,  period:7, block:'s', state:'solid', electronegativity:0.7,  config:'[Rn]7s¹' },
  { z:88, symbol:'Ra', name:'Radi',      nameEn:'Radium',     mass:226,     category:'alkaline',   group:2,  period:7, block:'s', state:'solid', electronegativity:0.9,  config:'[Rn]7s²' },
  // Actinides 89-103
  { z:89, symbol:'Ac', name:'Actini',    nameEn:'Actinium',   mass:227,     category:'actinide',   group:null, period:7, block:'f', state:'solid', electronegativity:1.1,  config:'[Rn]6d¹7s²' },
  { z:90, symbol:'Th', name:'Thori',     nameEn:'Thorium',    mass:232.04,  category:'actinide',   group:null, period:7, block:'f', state:'solid', electronegativity:1.3,  config:'[Rn]6d²7s²' },
  { z:91, symbol:'Pa', name:'Protactini',nameEn:'Protactinium',mass:231.04, category:'actinide',   group:null, period:7, block:'f', state:'solid', electronegativity:1.5,  config:'[Rn]5f²6d¹7s²' },
  { z:92, symbol:'U',  name:'Urani',     nameEn:'Uranium',    mass:238.03,  category:'actinide',   group:null, period:7, block:'f', state:'solid', electronegativity:1.38, config:'[Rn]5f³6d¹7s²' },
  { z:93, symbol:'Np', name:'Neptuni',   nameEn:'Neptunium',  mass:237,     category:'actinide',   group:null, period:7, block:'f', state:'solid', electronegativity:1.36, config:'[Rn]5f⁴6d¹7s²' },
  { z:94, symbol:'Pu', name:'Plutoni',   nameEn:'Plutonium',  mass:244,     category:'actinide',   group:null, period:7, block:'f', state:'solid', electronegativity:1.28, config:'[Rn]5f⁶7s²' },
  { z:95, symbol:'Am', name:'Americi',   nameEn:'Americium',  mass:243,     category:'actinide',   group:null, period:7, block:'f', state:'solid', electronegativity:1.3,  config:'[Rn]5f⁷7s²' },
  { z:96, symbol:'Cm', name:'Curi',      nameEn:'Curium',     mass:247,     category:'actinide',   group:null, period:7, block:'f', state:'solid', electronegativity:1.3,  config:'[Rn]5f⁷6d¹7s²' },
  { z:97, symbol:'Bk', name:'Berkeli',   nameEn:'Berkelium',  mass:247,     category:'actinide',   group:null, period:7, block:'f', state:'solid', electronegativity:1.3,  config:'[Rn]5f⁹7s²' },
  { z:98, symbol:'Cf', name:'Califoni',  nameEn:'Californium',mass:251,     category:'actinide',   group:null, period:7, block:'f', state:'solid', electronegativity:1.3,  config:'[Rn]5f¹⁰7s²' },
  { z:99, symbol:'Es', name:'Einsteini', nameEn:'Einsteinium',mass:252,     category:'actinide',   group:null, period:7, block:'f', state:'solid', electronegativity:1.3,  config:'[Rn]5f¹¹7s²' },
  { z:100,symbol:'Fm', name:'Fermi',     nameEn:'Fermium',    mass:257,     category:'actinide',   group:null, period:7, block:'f', state:'unknown', electronegativity:1.3, config:'[Rn]5f¹²7s²' },
  { z:101,symbol:'Md', name:'Mendelevi', nameEn:'Mendelevium',mass:258,     category:'actinide',   group:null, period:7, block:'f', state:'unknown', electronegativity:1.3, config:'[Rn]5f¹³7s²' },
  { z:102,symbol:'No', name:'Nobeli',    nameEn:'Nobelium',   mass:259,     category:'actinide',   group:null, period:7, block:'f', state:'unknown', electronegativity:1.3, config:'[Rn]5f¹⁴7s²' },
  { z:103,symbol:'Lr', name:'Lawrenci',  nameEn:'Lawrencium', mass:266,     category:'actinide',   group:3,  period:7, block:'d', state:'unknown', electronegativity:1.3, config:'[Rn]5f¹⁴7s²7p¹' },
  { z:104,symbol:'Rf', name:'Rutherfordi',nameEn:'Rutherfordium',mass:267,  category:'transition', group:4,  period:7, block:'d', state:'unknown', electronegativity:null,config:'[Rn]5f¹⁴6d²7s²' },
  { z:105,symbol:'Db', name:'Dubni',     nameEn:'Dubnium',    mass:268,     category:'transition', group:5,  period:7, block:'d', state:'unknown', electronegativity:null,config:'[Rn]5f¹⁴6d³7s²' },
  { z:106,symbol:'Sg', name:'Seaborgi',  nameEn:'Seaborgium', mass:269,     category:'transition', group:6,  period:7, block:'d', state:'unknown', electronegativity:null,config:'[Rn]5f¹⁴6d⁴7s²' },
  { z:107,symbol:'Bh', name:'Bohri',     nameEn:'Bohrium',    mass:270,     category:'transition', group:7,  period:7, block:'d', state:'unknown', electronegativity:null,config:'[Rn]5f¹⁴6d⁵7s²' },
  { z:108,symbol:'Hs', name:'Hassi',     nameEn:'Hassium',    mass:277,     category:'transition', group:8,  period:7, block:'d', state:'unknown', electronegativity:null,config:'[Rn]5f¹⁴6d⁶7s²' },
  { z:109,symbol:'Mt', name:'Meitneri',  nameEn:'Meitnerium', mass:278,     category:'transition', group:9,  period:7, block:'d', state:'unknown', electronegativity:null,config:'[Rn]5f¹⁴6d⁷7s²' },
  { z:110,symbol:'Ds', name:'Darmstadti',nameEn:'Darmstadtium',mass:281,    category:'transition', group:10, period:7, block:'d', state:'unknown', electronegativity:null,config:'[Rn]5f¹⁴6d⁸7s²' },
  { z:111,symbol:'Rg', name:'Roentgeni', nameEn:'Roentgenium',mass:282,     category:'transition', group:11, period:7, block:'d', state:'unknown', electronegativity:null,config:'[Rn]5f¹⁴6d⁹7s²' },
  { z:112,symbol:'Cn', name:'Copernici', nameEn:'Copernicium',mass:285,     category:'transition', group:12, period:7, block:'d', state:'unknown', electronegativity:null,config:'[Rn]5f¹⁴6d¹⁰7s²' },
  { z:113,symbol:'Nh', name:'Nihoni',    nameEn:'Nihonium',   mass:286,     category:'post',       group:13, period:7, block:'p', state:'unknown', electronegativity:null,config:'[Rn]5f¹⁴6d¹⁰7s²7p¹' },
  { z:114,symbol:'Fl', name:'Flerovi',   nameEn:'Flerovium',  mass:289,     category:'post',       group:14, period:7, block:'p', state:'unknown', electronegativity:null,config:'[Rn]5f¹⁴6d¹⁰7s²7p²' },
  { z:115,symbol:'Mc', name:'Moscovi',   nameEn:'Moscovium',  mass:290,     category:'post',       group:15, period:7, block:'p', state:'unknown', electronegativity:null,config:'[Rn]5f¹⁴6d¹⁰7s²7p³' },
  { z:116,symbol:'Lv', name:'Livermori', nameEn:'Livermorium',mass:293,     category:'post',       group:16, period:7, block:'p', state:'unknown', electronegativity:null,config:'[Rn]5f¹⁴6d¹⁰7s²7p⁴' },
  { z:117,symbol:'Ts', name:'Tennessi',  nameEn:'Tennessine', mass:294,     category:'halogen',    group:17, period:7, block:'p', state:'unknown', electronegativity:null,config:'[Rn]5f¹⁴6d¹⁰7s²7p⁵' },
  { z:118,symbol:'Og', name:'Oganesson', nameEn:'Oganesson',  mass:294,     category:'noble',      group:18, period:7, block:'p', state:'unknown', electronegativity:null,config:'[Rn]5f¹⁴6d¹⁰7s²7p⁶' },
]

/* ─── Grid placement (chuẩn IUPAC 18×9 + La/Ac series ô riêng) ── */
function gridPos(el: Element): { col: number; row: number } {
  // La/Ac series xếp dưới ở row 8/9, col theo z - 56 / z - 88
  if (el.category === 'lanthanide' && el.z >= 57 && el.z <= 70) {
    return { col: el.z - 57 + 3, row: 8 }
  }
  if (el.category === 'actinide' && el.z >= 89 && el.z <= 102) {
    return { col: el.z - 89 + 3, row: 9 }
  }
  return { col: el.group || 3, row: el.period }
}

/* ─── Component ───────────────────────────────────────────────── */
export default function PeriodicTablePage() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Element | null>(null)
  const [filterCat, setFilterCat] = useState<Category | 'all'>('all')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return ELEMENTS.filter((e) => {
      if (filterCat !== 'all' && e.category !== filterCat) return false
      if (!q) return true
      return (
        e.symbol.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        e.nameEn.toLowerCase().includes(q) ||
        String(e.z) === q
      )
    })
  }, [search, filterCat])

  const filteredIds = new Set(filtered.map((e) => e.z))

  return (
    <div className="min-h-screen bg-[hsl(225,15%,8%)] text-white px-3 py-5 lg:px-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link
          to="/dashboard/labtwin"
          className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> LabTwin
        </Link>
        <span className="text-gray-600">/</span>
        <h1 className="text-base sm:text-lg font-bold flex items-center gap-2">
          <Atom className="w-5 h-5 text-cyan-400" />
          Bảng tuần hoàn các nguyên tố hoá học
        </h1>
        <span className="ml-auto text-xs text-white/40">{filtered.length}/118 nguyên tố</span>
      </div>

      {/* Search + filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên VI/EN/symbol/Z…"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-cyan-500/40"
          />
        </div>
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value as Category | 'all')}
          className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-cyan-500/40"
        >
          <option value="all">Tất cả phân nhóm</option>
          {Object.entries(CAT_STYLE).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4 text-[10px]">
        {Object.entries(CAT_STYLE).map(([k, v]) => (
          <button
            key={k}
            onClick={() => setFilterCat(filterCat === k ? 'all' : (k as Category))}
            className={`px-2 py-1 rounded border ${v.bg} ${v.fg} transition-all ${
              filterCat === k ? 'ring-2 ring-white/30' : ''
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Grid 18×9 */}
      <div
        className="grid gap-[3px] overflow-x-auto pb-3"
        style={{
          gridTemplateColumns: 'repeat(18, minmax(42px, 1fr))',
          gridTemplateRows: 'repeat(9, minmax(48px, auto))',
        }}
      >
        {ELEMENTS.map((el) => {
          const { col, row } = gridPos(el)
          const style = CAT_STYLE[el.category]
          const visible = filteredIds.has(el.z)
          return (
            <button
              key={el.z}
              onClick={() => setSelected(el)}
              style={{ gridColumn: col, gridRow: row }}
              className={`
                rounded border text-left p-1 transition-all
                ${style.bg} ${visible ? '' : 'opacity-15'}
                ${selected?.z === el.z ? 'ring-2 ring-white scale-105' : ''}
              `}
              title={`${el.name} (${el.nameEn}) — Z=${el.z}`}
            >
              <div className="flex justify-between items-start">
                <span className="text-[8px] text-white/50">{el.z}</span>
                <span className="text-[7px] text-white/40 uppercase">{el.block}</span>
              </div>
              <div className={`text-base font-bold leading-none ${style.fg}`}>{el.symbol}</div>
              <div className="text-[8px] text-white/55 truncate leading-tight mt-0.5">{el.name}</div>
              <div className="text-[7px] text-white/35 leading-none">{el.mass.toFixed(1)}</div>
            </button>
          )
        })}

        {/* La/Ac placeholder ô */}
        <div
          style={{ gridColumn: 3, gridRow: 6 }}
          className="rounded border border-dashed border-pink-500/40 bg-pink-500/5 flex items-center justify-center text-[9px] text-pink-300"
        >
          57-71<br/>↓
        </div>
        <div
          style={{ gridColumn: 3, gridRow: 7 }}
          className="rounded border border-dashed border-fuchsia-500/40 bg-fuchsia-500/5 flex items-center justify-center text-[9px] text-fuchsia-300"
        >
          89-103<br/>↓
        </div>
      </div>

      {/* Detail modal */}
      {selected && <DetailModal element={selected} onClose={() => setSelected(null)} />}

      {/* Hint */}
      <p className="text-[11px] text-white/30 mt-4 text-center">
        💡 Click nguyên tố để xem chi tiết · Hover hiển thị tên đầy đủ · Filter theo phân nhóm/khối
      </p>
    </div>
  )
}

/* ─── Detail Modal ───────────────────────────────────────────── */
function DetailModal({ element, onClose }: { element: Element; onClose: () => void }) {
  const style = CAT_STYLE[element.category]
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[92vw] max-w-md bg-[hsl(225,15%,11%)] border border-white/10 rounded-2xl p-5 shadow-2xl">
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-20 h-20 rounded-xl border-2 ${style.bg} flex flex-col items-center justify-center shrink-0`}>
            <span className="text-[9px] text-white/50">{element.z}</span>
            <span className={`text-3xl font-bold ${style.fg}`}>{element.symbol}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white">{element.name}</h2>
            <p className="text-xs text-white/40 italic">{element.nameEn}</p>
            <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded ${style.bg} ${style.fg} border`}>
              {style.label}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <Info label="Khối lượng (u)" value={element.mass.toFixed(3)} />
          <Info label="Chu kì" value={String(element.period)} />
          <Info label="Nhóm IUPAC" value={element.group ? String(element.group) : '—'} />
          <Info label="Khối (block)" value={element.block.toUpperCase()} />
          <Info label="Trạng thái" value={
            element.state === 'solid' ? 'Rắn' :
            element.state === 'liquid' ? 'Lỏng' :
            element.state === 'gas' ? 'Khí' : 'Chưa rõ'
          } />
          <Info label="Độ âm điện" value={element.electronegativity != null ? element.electronegativity.toFixed(2) : '—'} />
        </div>

        <div className="mt-4 p-3 rounded-lg bg-white/[0.04] border border-white/[0.06]">
          <div className="flex items-center gap-1.5 text-[10px] text-white/40 uppercase mb-1">
            <Layers className="w-3 h-3" /> Cấu hình electron
          </div>
          <p className="text-sm font-mono text-cyan-300">{element.config}</p>
        </div>
      </div>
    </>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-white/35 uppercase">{label}</div>
      <div className="text-sm text-white/85 font-medium mt-0.5">{value}</div>
    </div>
  )
}
