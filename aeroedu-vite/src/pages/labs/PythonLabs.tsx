import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  FlaskConical, Star, Clock, ArrowRight, Zap, Settings, Atom, Waves,
  Camera, Activity, Wind, Box, Brain, Flame, Trophy, ArrowLeft,
  Sparkles, Target, Filter, X, Info, Radio, Eye,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Simulation {
  id: string
  name: string
  description: string
  category: string
  level: string
  difficulty: string
  xp: number
  duration: string
  port?: number | null
  icon: string
  features: string[]
  learning_objectives: string[]
  tags: string[]
  internal_link?: string
}

// ─── Icon Map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Zap, Settings, Atom, Waves, Camera, Activity, FlaskConical,
  Wind, Box, Brain, Flame, Trophy, Clock, Radio, Eye, Target,
}

// ─── Category Styles (dark-first) ─────────────────────────────────────────────

const CATEGORY_STYLE: Record<string, { text: string; bg: string; border: string; badge: string; btn: string }> = {
  'Cơ học':                { text: 'text-pink-400',    bg: 'bg-pink-400/10',    border: 'border-pink-400/20',    badge: 'bg-pink-400/15 text-pink-300',    btn: 'from-pink-500 to-pink-600'       },
  'Quang học':             { text: 'text-yellow-400',  bg: 'bg-yellow-400/10',  border: 'border-yellow-400/20',  badge: 'bg-yellow-400/15 text-yellow-300', btn: 'from-yellow-500 to-yellow-600'   },
  'Machine Learning':      { text: 'text-purple-400',  bg: 'bg-purple-400/10',  border: 'border-purple-400/20',  badge: 'bg-purple-400/15 text-purple-300', btn: 'from-purple-500 to-purple-600'   },
  'Hóa học':               { text: 'text-sky-400',     bg: 'bg-sky-400/10',     border: 'border-sky-400/20',     badge: 'bg-sky-400/15 text-sky-300',      btn: 'from-sky-500 to-sky-600'         },
  'Sinh học':              { text: 'text-green-400',   bg: 'bg-green-400/10',   border: 'border-green-400/20',   badge: 'bg-green-400/15 text-green-300',   btn: 'from-green-500 to-green-600'     },
  'Sóng':                  { text: 'text-cyan-400',    bg: 'bg-cyan-400/10',    border: 'border-cyan-400/20',    badge: 'bg-cyan-400/15 text-cyan-300',    btn: 'from-cyan-500 to-cyan-600'       },
  'Computer Vision':       { text: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', badge: 'bg-emerald-400/15 text-emerald-300', btn: 'from-emerald-500 to-emerald-600' },
  'Thị giác máy tính':     { text: 'text-teal-400',    bg: 'bg-teal-400/10',    border: 'border-teal-400/20',    badge: 'bg-teal-400/15 text-teal-300',    btn: 'from-teal-500 to-teal-600'       },
  'Nhiệt học':             { text: 'text-orange-400',  bg: 'bg-orange-400/10',  border: 'border-orange-400/20',  badge: 'bg-orange-400/15 text-orange-300',  btn: 'from-orange-500 to-orange-600'   },
  'Procedural Generation': { text: 'text-indigo-400',  bg: 'bg-indigo-400/10',  border: 'border-indigo-400/20',  badge: 'bg-indigo-400/15 text-indigo-300', btn: 'from-indigo-500 to-indigo-600'   },
  'Học qua trò chơi':      { text: 'text-lime-400',    bg: 'bg-lime-400/10',    border: 'border-lime-400/20',    badge: 'bg-lime-400/15 text-lime-300',    btn: 'from-lime-500 to-lime-600'       },
  'Điện tử':               { text: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-400/20',    badge: 'bg-blue-400/15 text-blue-300',    btn: 'from-blue-500 to-blue-600'       },
}

const DEFAULT_STYLE: typeof CATEGORY_STYLE['Cơ học'] = { text: 'text-pink-400', bg: 'bg-pink-400/10', border: 'border-pink-400/20', badge: 'bg-pink-400/15 text-pink-300', btn: 'from-pink-500 to-pink-600' }

const CATEGORY_ICON: Record<string, string> = {
  'Cơ học': '⚡', 'Quang học': '💡', 'Điện từ': '🔋', 'Sóng': '🌊',
  'Nhiệt học': '🔥', 'Thị giác máy tính': '👁️', 'Computer Vision': '📷',
  'Procedural Generation': '🎲', 'Machine Learning': '🤖', 'Học qua trò chơi': '🎮',
  'Hóa học': '🧪', 'Sinh học': '🧬', 'Điện tử': '⚡',
}

// ─── Static Simulations Data (38 labs) ───────────────────────────────────────

const SIMULATIONS: Simulation[] = [
  {
    id: 'aerodynamics',
    name: 'Aerodynamics Simulation',
    description: 'Khám phá lực khí động học và dòng chảy không khí quanh các vật thể khác nhau. Tương tác với các tham số để hiểu cách máy bay bay!',
    category: 'Cơ học', level: 'Nâng cao', difficulty: 'Nâng cao', xp: 250, duration: '45 phút', port: 8008,
    icon: 'Wind',
    features: ['Mô phỏng dòng chảy 3D thời gian thực', 'Điều chỉnh góc tấn và tốc độ', 'Hiển thị vector lực và áp suất', 'So sánh các hình dạng khác nhau'],
    learning_objectives: ['Hiểu nguyên lý Bernoulli và lực nâng', 'Phân tích ảnh hưởng của hình dạng đến lực cản', 'Tính toán hiệu suất khí động học', 'Áp dụng kiến thức vào thiết kế máy bay'],
    tags: ['khí động học', 'dòng chảy', 'lực nâng', 'Bernoulli'],
  },
  {
    id: 'aeroflow-3d',
    name: 'AeroFlow 3D Advanced',
    description: 'Mô phỏng khí động học 3D tiên tiến với visualization đẹp mắt. Khám phá dòng chảy phức tạp và hiệu ứng xoáy!',
    category: 'Cơ học', level: 'Nâng cao', difficulty: 'Nâng cao', xp: 300, duration: '60 phút', port: 8009,
    icon: 'Wind',
    features: ['Visualization 3D với particle system', 'Mô phỏng xoáy và turbulence', 'Điều khiển thời gian thực', 'Export dữ liệu và hình ảnh'],
    learning_objectives: ['Hiểu turbulence và xoáy trong dòng chảy', 'Phân tích dòng chảy 3D phức tạp', 'Sử dụng CFD cơ bản', 'Thiết kế tối ưu khí động học'],
    tags: ['CFD', 'turbulence', '3D', 'visualization'],
  },
  {
    id: 'mechaforce',
    name: 'MechaForce Dynamics',
    description: 'Khám phá các lực cơ học cơ bản: ma sát, lực đàn hồi, và chuyển động. Tương tác với các vật thể để hiểu định luật Newton!',
    category: 'Cơ học', level: 'Trung bình', difficulty: 'Trung bình', xp: 180, duration: '30 phút', port: 8004,
    icon: 'Settings',
    features: ['Mô phỏng lực ma sát và đàn hồi', 'Điều chỉnh khối lượng và hệ số ma sát', 'Hiển thị vector lực thời gian thực', 'Thí nghiệm với các bề mặt khác nhau'],
    learning_objectives: ['Hiểu định luật Newton thứ nhất và thứ hai', 'Phân tích ảnh hưởng của ma sát', 'Tính toán lực đàn hồi theo định luật Hooke', 'Áp dụng cân bằng lực trong thực tế'],
    tags: ['Newton', 'ma sát', 'đàn hồi', 'cân bằng lực'],
  },
  {
    id: 'motion-sim',
    name: 'MotionSim Basic',
    description: 'Học chuyển động cơ bản: thẳng đều, biến đổi đều, và rơi tự do. Điều chỉnh các tham số để thấy sự khác biệt!',
    category: 'Cơ học', level: 'Trung bình', difficulty: 'Trung bình', xp: 200, duration: '35 phút', port: 8014,
    icon: 'Activity',
    features: ['Mô phỏng chuyển động 1D và 2D', 'Đồ thị vận tốc và gia tốc', 'Điều chỉnh vận tốc ban đầu và gia tốc', 'So sánh các loại chuyển động'],
    learning_objectives: ['Hiểu chuyển động thẳng đều và biến đổi đều', 'Phân tích đồ thị vận tốc-thời gian', 'Tính toán quãng đường và vận tốc', 'Áp dụng vào bài toán rơi tự do'],
    tags: ['chuyển động', 'vận tốc', 'gia tốc', 'rơi tự do'],
  },
  {
    id: 'motionsim',
    name: 'MotionSim Pro',
    description: 'Mô phỏng chuyển động nâng cao với nhiều lực tác dụng. Khám phá chuyển động phức tạp và va chạm!',
    category: 'Cơ học', level: 'Nâng cao', difficulty: 'Nâng cao', xp: 250, duration: '50 phút', port: 8005,
    icon: 'Activity',
    features: ['Mô phỏng nhiều lực đồng thời', 'Va chạm đàn hồi và không đàn hồi', 'Hệ thống nhiều vật thể', 'Phân tích năng lượng và động lượng'],
    learning_objectives: ['Hiểu bảo toàn động lượng và năng lượng', 'Phân tích va chạm đàn hồi', 'Tính toán hệ thống nhiều vật thể', 'Áp dụng định luật bảo toàn'],
    tags: ['động lượng', 'va chạm', 'bảo toàn', 'năng lượng'],
  },
  {
    id: 'physics-motion',
    name: 'Physics Motion Fundamentals',
    description: 'Học những khái niệm cơ bản nhất về chuyển động. Hoàn hảo cho người mới bắt đầu!',
    category: 'Cơ học', level: 'Dễ', difficulty: 'Dễ', xp: 120, duration: '20 phút', port: 8007,
    icon: 'Activity',
    features: ['Giao diện đơn giản, dễ hiểu', 'Hướng dẫn từng bước', 'Minh họa trực quan', 'Bài tập thực hành cơ bản'],
    learning_objectives: ['Hiểu khái niệm vị trí, vận tốc, gia tốc', 'Phân biệt chuyển động thẳng và cong', 'Đọc và hiểu đồ thị chuyển động', 'Áp dụng công thức cơ bản'],
    tags: ['cơ bản', 'vị trí', 'vận tốc', 'gia tốc'],
  },
  {
    id: 'projectile',
    name: 'Projectile Motion Lab',
    description: 'Khám phá chuyển động ném xiên và ném ngang. Điều chỉnh góc và vận tốc để đạt mục tiêu!',
    category: 'Cơ học', level: 'Dễ', difficulty: 'Dễ', xp: 120, duration: '25 phút', port: 8016,
    icon: 'Target',
    features: ['Mô phỏng ném xiên và ném ngang', 'Điều chỉnh góc ném và vận tốc ban đầu', 'Hiển thị quỹ đạo parabol', 'Tính toán tầm xa và độ cao cực đại'],
    learning_objectives: ['Hiểu chuyển động ném xiên', 'Tính toán tầm xa và thời gian bay', 'Phân tích thành phần vận tốc', 'Áp dụng vào bài toán thực tế'],
    tags: ['ném xiên', 'quỹ đạo', 'parabol', 'tầm xa'],
  },
  {
    id: 'circular-motion',
    name: 'Circular Motion Explorer',
    description: 'Khám phá chuyển động tròn đều và lực hướng tâm. Điều chỉnh bán kính và vận tốc góc!',
    category: 'Cơ học', level: 'Trung bình', difficulty: 'Trung bình', xp: 180, duration: '30 phút', port: 8020,
    icon: 'Activity',
    features: ['Mô phỏng chuyển động tròn đều', 'Hiển thị vector vận tốc và gia tốc', 'Điều chỉnh bán kính và vận tốc góc', 'Tính toán lực hướng tâm'],
    learning_objectives: ['Hiểu chuyển động tròn đều', 'Phân tích lực hướng tâm', 'Tính toán vận tốc góc và tuyến tính', 'Áp dụng vào chuyển động hành tinh'],
    tags: ['tròn đều', 'hướng tâm', 'vận tốc góc', 'gia tốc'],
  },
  {
    id: 'momentum-collision',
    name: 'Momentum & Collision Lab',
    description: 'Khám phá va chạm và bảo toàn động lượng. Thí nghiệm với các loại va chạm khác nhau!',
    category: 'Cơ học', level: 'Trung bình', difficulty: 'Trung bình', xp: 200, duration: '40 phút', port: 8021,
    icon: 'Activity',
    features: ['Mô phỏng va chạm 1D và 2D', 'Va chạm đàn hồi và không đàn hồi', 'Hiển thị vector động lượng', 'Tính toán hệ số hoàn nguyên'],
    learning_objectives: ['Hiểu khái niệm động lượng', 'Áp dụng định luật bảo toàn động lượng', 'Phân tích va chạm đàn hồi', 'Tính toán năng lượng mất mát'],
    tags: ['động lượng', 'va chạm', 'bảo toàn', 'đàn hồi'],
  },
  {
    id: 'rotational-dynamics',
    name: 'Rotational Dynamics',
    description: 'Khám phá chuyển động quay và mômen quán tính. Thí nghiệm với các hình dạng khác nhau!',
    category: 'Cơ học', level: 'Nâng cao', difficulty: 'Nâng cao', xp: 250, duration: '45 phút', port: 8022,
    icon: 'Settings',
    features: ['Mô phỏng chuyển động quay', 'Tính toán mômen quán tính', 'Điều chỉnh mômen lực', 'So sánh các hình dạng khác nhau'],
    learning_objectives: ['Hiểu chuyển động quay và mômen quán tính', 'Áp dụng định luật Newton cho chuyển động quay', 'Tính toán mômen động lượng', 'Phân tích chuyển động lăn'],
    tags: ['quay', 'mômen', 'quán tính', 'động lượng'],
  },
  {
    id: 'physics-engine-2d',
    name: 'Physics Engine 2D – Mô phỏng động lực học 2D',
    description: 'Engine vật lý 2D hoàn chỉnh với collision detection, rigid body dynamics, và particle system. Python xử lý physics simulation, export data cho visualization.',
    category: 'Cơ học', level: 'Nâng cao', difficulty: 'Nâng cao', xp: 320, duration: '70 phút', port: 8023,
    icon: 'Settings',
    features: ['🔧 Physics engine 2D hoàn chỉnh', '💥 Collision detection và response', '⚖️ Rigid body dynamics', '✨ Particle system và effects', '🐍 Python physics simulation', '📊 Real-time data export', '🎮 Interactive controls', '📈 Performance monitoring'],
    learning_objectives: ['Hiểu nguyên lý physics engine', 'Implement collision detection algorithms', 'Tính toán rigid body dynamics', 'Tối ưu hóa performance', 'Tích hợp với game engine', 'Áp dụng vào simulation thực tế'],
    tags: ['physics', 'engine', '2D', 'collision', 'dynamics', 'Python'],
  },
  {
    id: 'fluid-dynamics-2d',
    name: 'Fluid Dynamics 2D – Mô phỏng dòng chảy chất lỏng',
    description: 'Mô phỏng dòng chảy chất lỏng 2D với Navier-Stokes equations. Python solve PDE, WebGL render fluid visualization.',
    category: 'Cơ học', level: 'Nâng cao', difficulty: 'Nâng cao', xp: 350, duration: '80 phút', port: 8025,
    icon: 'Waves',
    features: ['🌊 2D fluid dynamics simulation', '📐 Navier-Stokes equations solver', '🎨 Real-time fluid visualization', '🐍 Python numerical methods', '🎮 Interactive flow control', '📊 Pressure và velocity fields', '⚡ GPU acceleration support', '💾 Export simulation data'],
    learning_objectives: ['Hiểu Navier-Stokes equations', 'Implement numerical methods', 'Visualize fluid flow', 'Tối ưu hóa computation', 'Áp dụng vào engineering', 'So sánh với experimental data'],
    tags: ['fluid', 'dynamics', 'Navier-Stokes', 'PDE', 'Python', 'visualization'],
  },
  {
    id: 'biogrowth',
    name: 'BioGrowth Simulation',
    description: 'Mô phỏng sự phát triển của quần thể sinh vật. Khám phá các yếu tố ảnh hưởng đến tăng trưởng!',
    category: 'Sinh học', level: 'Trung bình', difficulty: 'Trung bình', xp: 180, duration: '35 phút', port: 8001,
    icon: 'Activity',
    features: ['Mô phỏng tăng trưởng quần thể', 'Điều chỉnh tỷ lệ sinh và tử', 'Hiển thị đồ thị tăng trưởng', 'Mô hình logistic và exponential'],
    learning_objectives: ['Hiểu mô hình tăng trưởng quần thể', 'Phân tích các yếu tố hạn chế', 'So sánh tăng trưởng exponential và logistic', 'Áp dụng vào bảo tồn sinh học'],
    tags: ['sinh học', 'tăng trưởng', 'quần thể', 'logistic'],
  },
  {
    id: 'chemistry-lab',
    name: 'Chemistry Lab Basic',
    description: 'Phòng thí nghiệm hóa học ảo cơ bản. Thực hiện các phản ứng hóa học an toàn!',
    category: 'Hóa học', level: 'Dễ', difficulty: 'Dễ', xp: 120, duration: '25 phút', port: 8002,
    icon: 'FlaskConical',
    features: ['Phòng thí nghiệm ảo an toàn', 'Các phản ứng hóa học cơ bản', 'Tính toán mol và nồng độ', 'Hiển thị phương trình hóa học'],
    learning_objectives: ['Hiểu các phản ứng hóa học cơ bản', 'Tính toán mol và nồng độ', 'Cân bằng phương trình hóa học', 'Áp dụng định luật bảo toàn khối lượng'],
    tags: ['hóa học', 'phản ứng', 'mol', 'nồng độ'],
  },
  {
    id: 'chemlab-3d',
    name: 'ChemLab 3D Advanced',
    description: 'Phòng thí nghiệm hóa học 3D tiên tiến với mô phỏng phân tử và liên kết hóa học!',
    category: 'Hóa học', level: 'Trung bình', difficulty: 'Trung bình', xp: 200, duration: '40 phút', port: 8015,
    icon: 'FlaskConical',
    features: ['Mô phỏng phân tử 3D', 'Hiển thị liên kết hóa học', 'Phản ứng hóa học phức tạp', 'Tính toán năng lượng phản ứng'],
    learning_objectives: ['Hiểu cấu trúc phân tử 3D', 'Phân tích liên kết hóa học', 'Tính toán năng lượng phản ứng', 'Áp dụng vào thiết kế thuốc'],
    tags: ['phân tử', '3D', 'liên kết', 'năng lượng'],
  },
  {
    id: 'r3f-sandbox',
    name: '3D Simulation Sandbox',
    description: 'Sandbox giả lập 3D với React Three Fiber. Khám phá phân tử H₂O, phòng thí nghiệm hóa học, con lắc, hệ mặt trời và va chạm Newton trong không gian 3D tương tác!',
    category: 'Hóa học', level: 'Trung bình', difficulty: 'Trung bình', xp: 180, duration: '25 phút', port: null,
    icon: 'Atom',
    features: ['Xoay/zoom mô hình 3D tương tác', '5 giả lập: H₂O, phòng thí nghiệm, con lắc, hệ mặt trời, Newton\'s Cradle', 'Code editor hiển thị source code R3F', 'Hiệu ứng Bloom, Environment, Grid'],
    learning_objectives: ['Hiểu cấu trúc phân tử nước H₂O', 'Quan sát chuyển động con lắc và lò xo', 'Khám phá hệ mặt trời mô phỏng', 'Tìm hiểu va chạm đàn hồi Newton\'s Cradle'],
    tags: ['3D', 'R3F', 'phân tử', 'hóa học', 'vật lý', 'con lắc', 'hệ mặt trời'],
    internal_link: '/dashboard/aura',
  },
  {
    id: 'datasim-ai',
    name: 'DataSim AI',
    description: 'Mô phỏng dữ liệu và machine learning. Tạo dataset ảo và huấn luyện mô hình AI!',
    category: 'Machine Learning', level: 'Nâng cao', difficulty: 'Nâng cao', xp: 300, duration: '60 phút', port: 8003,
    icon: 'Brain',
    features: ['Tạo dataset ảo với nhiều loại dữ liệu', 'Huấn luyện mô hình machine learning', 'Visualization dữ liệu và kết quả', 'So sánh các thuật toán khác nhau'],
    learning_objectives: ['Hiểu quy trình machine learning', 'Tạo và xử lý dataset', 'Huấn luyện và đánh giá mô hình', 'Áp dụng vào bài toán thực tế'],
    tags: ['AI', 'machine learning', 'dataset', 'mô hình'],
  },
  {
    id: 'neural-network-sim',
    name: 'Neural Network Simulator – Mô phỏng mạng nơ-ron',
    description: 'Mô phỏng mạng nơ-ron từ cơ bản đến nâng cao. Python implement neural network, training algorithms, và visualization real-time.',
    category: 'Machine Learning', level: 'Nâng cao', difficulty: 'Nâng cao', xp: 300, duration: '65 phút', port: 8024,
    icon: 'Brain',
    features: ['🧠 Neural network architecture builder', '📚 Multiple activation functions', '🎯 Training algorithms (SGD, Adam, etc.)', '📊 Real-time loss visualization', '🐍 Python implementation', '🎨 Interactive network visualization', '📈 Performance metrics', '💾 Model export/import'],
    learning_objectives: ['Hiểu cấu trúc mạng nơ-ron', 'Implement training algorithms', 'Visualize learning process', 'Tối ưu hóa hyperparameters', 'Áp dụng vào bài toán thực tế', 'So sánh các architecture khác nhau'],
    tags: ['neural', 'network', 'AI', 'machine learning', 'Python', 'training'],
  },
  {
    id: 'genetic-algorithm',
    name: 'Genetic Algorithm Simulator – Mô phỏng thuật toán di truyền',
    description: 'Mô phỏng thuật toán di truyền để giải quyết optimization problems. Python implement GA, visualization evolution process.',
    category: 'Machine Learning', level: 'Nâng cao', difficulty: 'Nâng cao', xp: 280, duration: '60 phút', port: 8026,
    icon: 'Activity',
    features: ['🧬 Genetic algorithm implementation', '🎯 Multiple optimization problems', '📊 Evolution process visualization', '🐍 Python GA framework', '⚙️ Customizable parameters', '📈 Fitness tracking', '🎮 Interactive controls', '💾 Results export'],
    learning_objectives: ['Hiểu thuật toán di truyền', 'Implement selection, crossover, mutation', 'Visualize evolution process', 'Tối ưu hóa parameters', 'Áp dụng vào optimization', 'So sánh với other algorithms'],
    tags: ['genetic', 'algorithm', 'optimization', 'evolution', 'Python', 'AI'],
  },
  {
    id: 'harmonic-motion',
    name: 'Dao động điều hòa - Con lắc lò xo',
    description: 'Khám phá dao động điều hòa của con lắc lò xo với animation và đồ thị chi tiết',
    category: 'Sóng', level: 'Trung bình', difficulty: 'Trung bình', xp: 180, duration: '30 phút', port: 8010,
    icon: 'Waves',
    features: ['Animation lò xo dao động thực tế', 'Đồ thị x(t), v(t), a(t), E(t)', 'Điều chỉnh biên độ, tần số, pha ban đầu', 'Bảng dữ liệu chi tiết'],
    learning_objectives: ['Hiểu dao động điều hòa của lò xo', 'Tính toán chu kỳ và tần số góc', 'Phân tích năng lượng bảo toàn', 'Áp dụng công thức x = A·cos(ωt + φ)'],
    tags: ['dao động', 'điều hòa', 'lò xo', 'chu kỳ', 'năng lượng'],
  },
  {
    id: 'simple-pendulum',
    name: 'Con lắc đơn',
    description: 'Khám phá dao động điều hòa của con lắc đơn với các thông số điều chỉnh được',
    category: 'Sóng', level: 'Trung bình', difficulty: 'Trung bình', xp: 150, duration: '30 phút', port: 8025,
    icon: 'Clock',
    features: ['Animation con lắc đơn dao động', 'Đồ thị θ(t), ω(t), α(t), E(t)', 'Điều chỉnh chiều dài dây và góc lệch', 'Quan sát tính độc lập với khối lượng'],
    learning_objectives: ['Hiểu dao động của con lắc đơn', 'Tính chu kỳ T = 2π√(L/g)', 'Nhận biết tính độc lập với m và θ₀', 'Phân tích chuyển đổi năng lượng'],
    tags: ['con lắc', 'dao động', 'trọng lực', 'chu kỳ', 'góc nhỏ'],
  },
  {
    id: 'standing-waves',
    name: 'Sóng dừng',
    description: 'Khám phá sóng dừng trên dây và trong ống sáo với các ứng dụng thực tế',
    category: 'Sóng', level: 'Trung bình', difficulty: 'Trung bình', xp: 200, duration: '35 phút', port: 8026,
    icon: 'Radio',
    features: ['Sóng dừng 2 đầu cố định (guitar)', 'Sóng dừng 1 đầu mở (sáo, tiêu)', 'Chọn bậc sóng từ 1-8', 'Ứng dụng: đàn, sáo, ống nghiệm'],
    learning_objectives: ['Hiểu điều kiện tạo sóng dừng', 'Phân biệt nút sóng và bụng sóng', 'Tính λ = 2L/n và λ = 4L/(2n-1)', 'Áp dụng vào nhạc cụ thực tế'],
    tags: ['sóng dừng', 'nút sóng', 'bụng sóng', 'họa âm', 'nhạc cụ'],
  },
  {
    id: 'optics-lab',
    name: 'Optics Lab',
    description: 'Phòng thí nghiệm quang học ảo. Khám phá phản xạ, khúc xạ và giao thoa ánh sáng!',
    category: 'Quang học', level: 'Trung bình', difficulty: 'Trung bình', xp: 180, duration: '35 phút', port: 8013,
    icon: 'Zap',
    features: ['Mô phỏng phản xạ và khúc xạ', 'Giao thoa và nhiễu xạ', 'Điều chỉnh góc và chiết suất', 'Hiển thị tia sáng và sóng'],
    learning_objectives: ['Hiểu định luật phản xạ và khúc xạ', 'Phân tích giao thoa ánh sáng', 'Tính toán chiết suất', 'Áp dụng vào thiết kế quang học'],
    tags: ['quang học', 'phản xạ', 'khúc xạ', 'giao thoa'],
  },
  {
    id: 'refraction',
    name: 'Refraction Explorer',
    description: 'Khám phá hiện tượng khúc xạ ánh sáng. Thí nghiệm với các môi trường khác nhau!',
    category: 'Quang học', level: 'Dễ', difficulty: 'Dễ', xp: 120, duration: '20 phút', port: 8017,
    icon: 'Zap',
    features: ['Mô phỏng khúc xạ cơ bản', 'Điều chỉnh chiết suất', 'Hiển thị tia sáng', 'Tính toán góc khúc xạ'],
    learning_objectives: ['Hiểu định luật Snell', 'Tính toán góc khúc xạ', 'Phân tích ảnh hưởng của chiết suất', 'Áp dụng vào thấu kính'],
    tags: ['khúc xạ', 'Snell', 'chiết suất', 'thấu kính'],
  },
  {
    id: 'thermoflow',
    name: 'ThermoFlow Simulation',
    description: 'Mô phỏng dòng nhiệt và truyền nhiệt. Khám phá các cơ chế truyền nhiệt khác nhau!',
    category: 'Nhiệt học', level: 'Nâng cao', difficulty: 'Nâng cao', xp: 250, duration: '45 phút', port: 8006,
    icon: 'Flame',
    features: ['Mô phỏng dẫn nhiệt, đối lưu, bức xạ', 'Hiển thị gradient nhiệt độ', 'Điều chỉnh vật liệu và điều kiện', 'Tính toán hiệu suất truyền nhiệt'],
    learning_objectives: ['Hiểu các cơ chế truyền nhiệt', 'Tính toán dẫn nhiệt', 'Phân tích đối lưu và bức xạ', 'Áp dụng vào thiết kế hệ thống'],
    tags: ['nhiệt học', 'dẫn nhiệt', 'đối lưu', 'bức xạ'],
  },
  {
    id: 'wfc-builder',
    name: 'WFC Builder – Mô phỏng thuật toán Wave Function Collapse 3D',
    description: 'Tạo cấu trúc modular procedural với thuật toán Wave Function Collapse 3D. Python chạy thuật toán WFC 3D, export JSON, WebGL dựng kiến trúc modular, AI tự sinh pattern từ ảnh hoặc scan.',
    category: 'Procedural Generation', level: 'Nâng cao', difficulty: 'Nâng cao', xp: 350, duration: '75 phút', port: 8019,
    icon: 'Box',
    features: ['🧠 Thuật toán Wave Function Collapse 3D', '🏗️ Tạo cấu trúc modular procedural', '🐍 Python chạy thuật toán WFC 3D, export JSON', '🎮 WebGL dựng kiến trúc modular', '🤖 AI tự sinh pattern từ ảnh hoặc scan', '📊 Visualization 3D real-time', '⚙️ Điều chỉnh rules và constraints', '💾 Export kết quả và dữ liệu'],
    learning_objectives: ['Hiểu thuật toán Wave Function Collapse 3D', 'Thiết kế rules cho procedural generation', 'Tích hợp Python backend với WebGL frontend', 'Áp dụng AI để sinh pattern từ ảnh', 'Tối ưu hóa thuật toán cho kiến trúc 3D', 'Áp dụng vào game development và kiến trúc'],
    tags: ['procedural', 'WFC', '3D', 'modular', 'AI', 'WebGL', 'Python'],
  },
  {
    id: 'motion-tracking',
    name: 'Motion Tracking CV',
    description: 'Sử dụng computer vision để theo dõi chuyển động. Phát hiện và phân tích chuyển động trong video!',
    category: 'Computer Vision', level: 'Nâng cao', difficulty: 'Nâng cao', xp: 250, duration: '50 phút', port: 8011,
    icon: 'Camera',
    features: ['Theo dõi chuyển động thời gian thực', 'Phát hiện đối tượng trong video', 'Tính toán vận tốc và gia tốc', 'Export dữ liệu chuyển động'],
    learning_objectives: ['Hiểu computer vision cơ bản', 'Áp dụng thuật toán tracking', 'Phân tích chuyển động từ video', 'Tích hợp CV với vật lý'],
    tags: ['computer vision', 'tracking', 'video', 'phân tích'],
  },
  {
    id: 'ocr-grading',
    name: 'OCR Grading System',
    description: 'Hệ thống chấm điểm tự động bằng OCR. Nhận diện và đánh giá bài làm của học sinh!',
    category: 'Computer Vision', level: 'Nâng cao', difficulty: 'Nâng cao', xp: 300, duration: '55 phút', port: 8012,
    icon: 'Camera',
    features: ['Nhận diện chữ viết tay', 'Chấm điểm tự động', 'Phân tích lỗi và gợi ý', 'Báo cáo chi tiết'],
    learning_objectives: ['Hiểu OCR và text recognition', 'Áp dụng machine learning cho giáo dục', 'Phát triển hệ thống chấm điểm', 'Tối ưu hóa accuracy'],
    tags: ['OCR', 'chấm điểm', 'AI', 'giáo dục'],
  },
  {
    id: 'video-tracking',
    name: 'Video Trajectory Tracking',
    description: 'Upload video và phân tích quỹ đạo chuyển động của vật thể. Tính toán vận tốc, gia tốc từ video thực tế.',
    category: 'Thị giác máy tính', level: 'Nâng cao', difficulty: 'Nâng cao', xp: 200, duration: '45 phút',
    icon: 'Camera',
    features: ['Video Analysis - Phân tích video', 'Trajectory Plotting - Vẽ quỹ đạo', 'Velocity/Acceleration - Tính vận tốc', 'Data Export - Xuất dữ liệu CSV'],
    learning_objectives: ['Phân tích chuyển động từ video thực tế', 'Hiểu quỹ đạo và vectors', 'Xử lý dữ liệu thô từ tracking'],
    tags: ['tracking', 'video', 'kinematics', 'analysis'],
    internal_link: '/dashboard/labtwin/video-tracking',
  },
  {
    id: 'vision-tracker-main',
    name: 'AI Vision & Emotion Hub',
    description: 'Trung tâm xử lý thị giác máy tính: Nhận diện cảm xúc, Theo dõi khuôn mặt & Ngôn ngữ ký hiệu.',
    category: 'Thị giác máy tính', level: 'Nâng cao', difficulty: 'Nâng cao', xp: 250, duration: 'Unlimited',
    icon: 'Eye',
    features: ['Emotion Recognition - Nhận diện cảm xúc', 'Face Mesh - Lưới khuôn mặt 3D', 'Sign Language - Ngôn ngữ ký hiệu', 'Real-time Analytics - Thống kê'],
    learning_objectives: ['Hiểu cơ chế AI Vision', 'Phân tích biểu cảm khuôn mặt', 'Học ngôn ngữ ký hiệu với AI'],
    tags: ['AI', 'emotion', 'face', 'sign-language'],
    internal_link: '/dashboard/vision-tracker',
  },
  // ──────────────────────────────────────────────────────────────
  // 📌 6 game labs đã chuyển sang Game Hub (/dashboard/games)
  // - quiz-tug-of-war / keo-co-app    → /dashboard/games/keo-co
  // - assembly-sim                     → /dashboard/games/assembly-sim
  // - gesture-swarm                    → /dashboard/games/gesture-swarm
  // - roll-call-wheel                  → /dashboard/games/roll-call-wheel
  // - pixel-agents                     → /dashboard/games/pixel-agents
  // Mục "Học qua trò chơi" đã bỏ khỏi LabTwin để tách bạch lab khoa học
  // với trò chơi. Routes cũ /dashboard/labtwin/labs/<game> vẫn redirect
  // sang /dashboard/games/* cho link cũ không bị broken.
  // ──────────────────────────────────────────────────────────────
  {
    id: 'wokwi-sim',
    name: 'Electronics Simulator',
    description: 'Mô phỏng mạch điện tử kiểu Wokwi với ESP32, Arduino, LED, cảm biến và các linh kiện. Kéo thả linh kiện, nối dây và chạy mô phỏng ngay trên trình duyệt!',
    category: 'Điện tử', level: 'Trung bình', difficulty: 'Trung bình', xp: 200, duration: '30 phút', port: null,
    icon: 'Zap',
    features: ['Kéo thả linh kiện điện tử (ESP32, Arduino, LED, cảm biến)', 'Vẽ dây nối giữa các chân linh kiện', 'Code editor với 5 sketch Arduino mẫu', 'Serial Monitor mô phỏng', 'Mô phỏng LED nhấp nháy, servo quay, cảm biến'],
    learning_objectives: ['Hiểu cách kết nối linh kiện điện tử', 'Lập trình Arduino/ESP32 cơ bản', 'Sử dụng cảm biến và actuator', 'Thiết kế mạch IoT đơn giản'],
    tags: ['điện tử', 'ESP32', 'Arduino', 'IoT', 'mạch', 'LED', 'cảm biến', 'Wokwi'],
    internal_link: '/dashboard/labtwin/labs/wokwi-sim',
  },
]

// ─── Difficulty sort order ────────────────────────────────────────────────────

const DIFF_ORDER: Record<string, number> = { 'Dễ': 1, 'Trung bình': 2, 'Nâng cao': 3, 'Khó': 4 }

// ─── Component ────────────────────────────────────────────────────────────────

export default function PythonLabsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryFilter = searchParams.get('category')
  const [selectedSim, setSelectedSim] = useState<Simulation | null>(null)

  // Close modal on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedSim(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Group by category
  const categorizedSims = SIMULATIONS.reduce<Record<string, Simulation[]>>((acc, sim) => {
    if (!acc[sim.category]) acc[sim.category] = []
    acc[sim.category].push(sim)
    return acc
  }, {})

  // Filter
  const filteredSims = categoryFilter
    ? SIMULATIONS.filter(s => s.category === categoryFilter)
    : SIMULATIONS

  // Sort: difficulty asc, then XP desc
  const sortedSims = [...filteredSims].sort((a, b) => {
    const da = DIFF_ORDER[a.difficulty] ?? 2
    const db = DIFF_ORDER[b.difficulty] ?? 2
    if (da !== db) return da - db
    return b.xp - a.xp
  })

  const clearFilter = () => setSearchParams({})
  const setFilter = (cat: string) => setSearchParams({ category: cat })

  return (
    <div className="min-h-screen bg-[hsl(260,30%,8%)]">
      {/* Modal overlay */}
      {selectedSim && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedSim(null)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/[0.08] bg-[hsl(260,25%,10%)] p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setSelectedSim(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {(() => {
              const sim = selectedSim
              const style = CATEGORY_STYLE[sim.category] ?? DEFAULT_STYLE
              const Icon = ICON_MAP[sim.icon] ?? FlaskConical
              return (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-2xl ${style.bg} ${style.border} border`}>
                      <Icon className={`h-10 w-10 ${style.text}`} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white/90 leading-snug">{sim.name}</h2>
                      <p className="text-sm text-white/50 mt-1 line-clamp-2">{sim.description}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="text-2xl mb-1">⭐</div>
                      <div className="font-bold text-yellow-400">{sim.xp} XP</div>
                      <div className="text-xs text-white/40">Reward</div>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="text-2xl mb-1">📚</div>
                      <div className={`font-bold ${style.text}`}>{sim.level}</div>
                      <div className="text-xs text-white/40">Level</div>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="text-2xl mb-1">⏱️</div>
                      <div className="font-bold text-white/80">{sim.duration}</div>
                      <div className="text-xs text-white/40">Duration</div>
                    </div>
                  </div>

                  {/* Features */}
                  {sim.features.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-base mb-3 flex items-center gap-2 text-white/80">
                        <Sparkles className="h-4 w-4 text-yellow-400" />
                        Tính năng cool
                      </h3>
                      <div className="space-y-2">
                        {sim.features.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                            <span className="text-base shrink-0">✨</span>
                            <span className="text-sm text-white/70">{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Learning Objectives */}
                  {sim.learning_objectives.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-base mb-3 flex items-center gap-2 text-white/80">
                        <Target className="h-4 w-4 text-green-400" />
                        Bạn sẽ học được gì?
                      </h3>
                      <div className="space-y-2">
                        {sim.learning_objectives.map((obj, i) => (
                          <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-green-400/[0.05] border border-green-400/10">
                            <span className="text-green-400 font-bold text-sm mt-0.5">{i + 1}.</span>
                            <span className="text-sm text-white/70">{obj}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {sim.tags.length > 0 && (
                    <div>
                      <p className="text-xs text-white/40 mb-2">Tags:</p>
                      <div className="flex flex-wrap gap-2">
                        {sim.tags.map((tag, i) => (
                          <span key={i} className="px-2.5 py-1 text-xs rounded-full bg-white/[0.05] border border-white/[0.08] text-white/55">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CTA */}
                  <Link
                    to={sim.internal_link ?? `/dashboard/labtwin/labs/${sim.id}`}
                    onClick={() => setSelectedSim(null)}
                    className={`flex items-center justify-center gap-2 w-full py-4 px-4 rounded-xl font-semibold text-base transition-all bg-gradient-to-r ${style.btn} text-white shadow-lg hover:shadow-xl hover:scale-[1.02]`}
                  >
                    🚀 Bắt đầu thí nghiệm ngay!
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8 max-w-7xl">

        {/* Header */}
        <div className="mb-8">
          <Link
            to="/dashboard/labtwin"
            className="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 mb-5 font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại LabTwin
          </Link>

          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-2xl text-white shadow-lg shadow-purple-500/30">
              <FlaskConical className="h-10 w-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                🧪 Virtual Labs
              </h1>
              <p className="text-white/50 mt-1 text-base">
                Khám phá khoa học qua các thí nghiệm ảo siêu cool! 🚀
              </p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-purple-500/15 border border-purple-500/20 text-purple-300">
                  <Sparkles className="h-3 w-3" />
                  {SIMULATIONS.length} thí nghiệm
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/15 border border-blue-500/20 text-blue-300">
                  <Target className="h-3 w-3" />
                  100% interactive
                </span>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="relative rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-pink-500/8 to-orange-500/8 p-6 overflow-hidden mb-6">
            <div className="absolute top-0 right-4 text-8xl opacity-[0.06] select-none">🔬</div>
            <div className="relative flex items-start gap-4">
              <div className="p-3 rounded-xl bg-white/[0.05] border border-white/[0.08] shrink-0">
                <Sparkles className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white/90 mb-1.5">🎮 Học bằng cách chơi!</h3>
                <p className="text-white/55 text-sm mb-3 leading-relaxed">
                  Mỗi thí nghiệm là một trò chơi khoa học! Tương tác, thử nghiệm, và khám phá cách mọi thứ hoạt động.
                  Python simulations thật + WebGL visualization + AI integration = Học vừa vui vừa hiểu! 🎉
                </p>
                <div className="flex flex-wrap gap-2">
                  {[['🐍', 'Python Simulations', 'purple'], ['🎮', 'WebGL Visualization', 'pink'], ['🤖', 'AI Integration', 'orange'], ['🎯', 'Real Science', 'blue']].map(([em, label, _]) => (
                    <span key={label} className="px-2.5 py-1 text-xs rounded-full bg-white/[0.05] border border-white/[0.08] text-white/60">
                      {em} {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Category Filter */}
        {categoryFilter && (
          <div className="mb-6 rounded-2xl border-2 border-purple-500/30 bg-gradient-to-r from-purple-500/15 to-pink-500/10 p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Filter className="h-5 w-5 text-purple-400" />
                <div>
                  <span className="text-sm text-purple-300 font-medium">Đang lọc theo:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl">{CATEGORY_ICON[categoryFilter] ?? '🔬'}</span>
                    <span className="font-bold text-purple-100">{categoryFilter}</span>
                    <span className="px-2.5 py-0.5 text-xs rounded-full bg-purple-600/60 text-white font-semibold">
                      {filteredSims.length} labs
                    </span>
                  </div>
                </div>
              </div>
              <Link to="/dashboard/labtwin/labs">
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-purple-400/30 text-purple-300 hover:bg-purple-400/15 transition-colors"
                >
                  <X className="h-4 w-4" />
                  Xóa filter
                </button>
              </Link>
            </div>
          </div>
        )}

        {/* Quick Category Filter */}
        {!categoryFilter && Object.keys(categorizedSims).length > 1 && (
          <div className="mb-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-white/40" />
              <span className="text-sm font-medium text-white/55">Lọc theo danh mục:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.keys(categorizedSims).sort().map(cat => {
                const emoji = CATEGORY_ICON[cat] ?? '🔬'
                const count = categorizedSims[cat].length
                const style = CATEGORY_STYLE[cat] ?? DEFAULT_STYLE
                return (
                  <button
                    key={cat}
                    onClick={() => setFilter(cat)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-all hover:brightness-125 ${style.bg} ${style.border} ${style.text}`}
                  >
                    <span>{emoji}</span>
                    {cat}
                    <span className="px-1.5 py-0.5 text-xs rounded-full bg-black/20 text-white/60">
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Category Header when filtering */}
        {categoryFilter && sortedSims.length > 0 && (
          <div className="mb-6">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2 flex items-center gap-3">
              <span className="text-5xl">{CATEGORY_ICON[categoryFilter] ?? '🔬'}</span>
              {categoryFilter}
            </h2>
            <p className="text-white/50 text-lg">{sortedSims.length} thí nghiệm trong danh mục này</p>
          </div>
        )}

        {/* Empty state */}
        {sortedSims.length === 0 && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-16 text-center">
            <div className="text-6xl mb-4">🥺</div>
            <h3 className="text-xl font-semibold text-white/70 mb-2">
              {categoryFilter ? `Không có thí nghiệm nào trong danh mục "${categoryFilter}"` : 'Chưa có thí nghiệm nào'}
            </h3>
            {categoryFilter && (
              <button onClick={clearFilter} className="text-purple-400 hover:text-purple-300 underline text-sm transition-colors">
                Xem tất cả danh mục
              </button>
            )}
          </div>
        )}

        {/* Labs Grid */}
        {sortedSims.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sortedSims.map(sim => {
              const Icon = ICON_MAP[sim.icon] ?? FlaskConical
              const style = CATEGORY_STYLE[sim.category] ?? DEFAULT_STYLE
              return (
                <div
                  key={sim.id}
                  className={`group relative rounded-2xl border ${style.border} ${style.bg} overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-black/40 flex flex-col`}
                >
                  {/* Decorative circles */}
                  <div className="absolute top-0 right-0 w-28 h-28 rounded-full bg-white/[0.04] -mr-14 -mt-14 pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-white/[0.03] -ml-10 -mb-10 pointer-events-none" />

                  <div className="relative z-10 p-5 flex flex-col flex-1">
                    {/* Icon + XP */}
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-4 bg-white/[0.12] backdrop-blur-sm rounded-2xl shadow-lg ${style.text} transition-transform group-hover:rotate-12`}>
                        <Icon className="h-8 w-8" />
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-400/80 to-orange-400/80 text-white shadow-md">
                        <Star className="h-3 w-3 fill-white" />
                        +{sim.xp} XP
                      </span>
                    </div>

                    {/* Title & Description */}
                    <h3 className={`font-bold text-xl mb-1.5 ${style.text} leading-snug`}>{sim.name}</h3>
                    <p className="text-white/60 text-sm leading-relaxed line-clamp-2 mb-3 flex-1">{sim.description}</p>

                    {/* Level + Duration */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-white/[0.1] border border-white/[0.12] text-white/70">
                        📚 {sim.level}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-white/[0.1] border border-white/[0.12] text-white/70">
                        <Clock className="h-3 w-3" />
                        {sim.duration}
                      </span>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-2">
                      <Link
                        to={sim.internal_link ?? `/dashboard/labtwin/labs/${sim.id}`}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg hover:scale-105 bg-gradient-to-r ${style.btn} text-white border-0`}
                      >
                        🚀 Bắt đầu
                      </Link>
                      <button
                        onClick={() => setSelectedSim(sim)}
                        className="p-2.5 rounded-xl border-2 border-white/[0.1] bg-white/[0.08] hover:bg-white/[0.14] text-white/60 hover:text-white/90 transition-all"
                        title="Xem chi tiết"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* How It Works */}
        <div className="mt-14 rounded-2xl border border-blue-500/15 bg-blue-500/[0.04] overflow-hidden">
          <div className="p-6 border-b border-white/[0.05]">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white/80">
              <FlaskConical className="h-5 w-5 text-blue-400" />
              Cách hoạt động
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[
                { step: '1', color: 'bg-blue-500/15 text-blue-400', title: 'Viết Python', desc: 'Viết mô phỏng vật lý trong', code: '/python-simulations/' },
                { step: '2', color: 'bg-green-500/15 text-green-400', title: 'Build Data', desc: 'Chạy', code: 'build.py', desc2: 'để tạo', code2: 'data.json' },
                { step: '3', color: 'bg-purple-500/15 text-purple-400', title: 'Copy to App', desc: 'Script tự động copy sang', code: '/public/labs/' },
                { step: '4', color: 'bg-orange-500/15 text-orange-400', title: 'Hiển thị', desc: 'Tự động hiển thị trong giao diện LabTwin', code: null },
              ].map(({ step, color, title, desc, code, desc2, code2 }) => (
                <div key={step} className="text-center">
                  <div className={`w-11 h-11 rounded-full ${color} flex items-center justify-center mx-auto mb-3 font-bold text-base`}>
                    {step}
                  </div>
                  <h4 className="font-semibold text-white/75 mb-1.5">{title}</h4>
                  <p className="text-sm text-white/45">
                    {desc}{' '}
                    {code && <code className="px-1.5 py-0.5 rounded text-xs bg-white/[0.06] text-white/65 font-mono">{code}</code>}
                    {desc2 && <> {desc2} </>}
                    {code2 && <code className="px-1.5 py-0.5 rounded text-xs bg-white/[0.06] text-white/65 font-mono">{code2}</code>}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
              <p className="text-sm text-white/55 mb-3">
                <span className="text-white/75 font-medium">Python Simulations đã chạy:</span>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-4">
                {[
                  { color: 'text-purple-400', label: '🧠 WFC Builder 3D', sub: 'Wave Function Collapse + WebGL' },
                  { color: 'text-blue-400',   label: '🔧 Physics Engine 2D', sub: 'Collision detection + Dynamics' },
                  { color: 'text-green-400',  label: '🧬 Neural Network', sub: 'Training + Visualization' },
                  { color: 'text-orange-400', label: '🌊 Fluid Dynamics', sub: 'Navier-Stokes + WebGL' },
                ].map(({ color, label, sub }) => (
                  <div key={label} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                    <div className={`font-semibold ${color} text-sm`}>{label}</div>
                    <div className="text-white/40 text-xs mt-0.5">{sub}</div>
                  </div>
                ))}
              </div>
              <code className="block rounded-lg bg-black/40 text-green-400 p-3 font-mono text-sm border border-white/[0.05]">
                cd python-simulations && python build-all.py
              </code>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-white/30 pb-4">
          <p>🧪 Python Simulations System • Tích hợp với LabTwin</p>
          <p className="mt-1">
            <span className="text-white/45 font-medium">Đã chạy:</span> WFC Builder 3D, Physics Engine 2D, Neural Network, Fluid Dynamics, Genetic Algorithm, Ray Tracing 3D
          </p>
          <p className="mt-1">
            Xem hướng dẫn tại:{' '}
            <code className="px-2 py-0.5 rounded text-xs bg-white/[0.05] text-white/45 font-mono">/python-simulations/README.md</code>
          </p>
        </div>

      </div>
    </div>
  )
}
