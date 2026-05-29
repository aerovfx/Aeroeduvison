/**
 * Math curriculum — HÀNH TRÌNH TOÁN HỌC toàn lứa tuổi.
 *
 * Lộ trình theo CẤP ĐỘ từ vỡ lòng → đại học → toán ứng dụng:
 *   🔢 Lớp 1–2 → ✖️ Lớp 3–5 → ➗ Lớp 6–7 → 📐 Lớp 8–9 → 📊 Lớp 10 →
 *   🧮 Lớp 11 → ∫ Lớp 12 → 🎓 Đại học → ⚛️ Toán cho Vật lí → 🤖 Toán cho AI.
 * Mỗi chặng = 1 bài gồm câu trắc nghiệm có LaTeX (ký hiệu + hình vẽ TikZ) +
 * giải thích. Khoá tuần tự, XP/streak/sao.
 *
 * LaTeX: prompt/options/explain hỗ trợ $...$ (KaTeX). Trường `tikz` (tuỳ chọn)
 * chứa mã TikZ → render hình vẽ bằng TikzFigure (tikzjax).
 */

export interface MathQuestion {
  id: string
  prompt: string
  options: string[]
  correctIdx: number
  explain: string
  /** Mã TikZ (vd "\\begin{tikzpicture}...\\end{tikzpicture}") để vẽ hình */
  tikz?: string
}

export interface MathLesson {
  id: string
  title: string
  icon: string
  questions: MathQuestion[]
}

export interface MathStop {
  id: string
  place: string        // nhãn ngắn EN
  placeVi: string      // tên chặng VN
  emoji: string
  era: string          // nhãn cấp độ (Lớp …/Đại học/Ứng dụng)
  figure: string       // chủ đề chính
  color: string
  blurbVi: string
  lessons: MathLesson[]
}

const q = (id: string, prompt: string, options: string[], correctIdx: number, explain: string, tikz?: string): MathQuestion =>
  ({ id, prompt, options, correctIdx, explain, ...(tikz ? { tikz } : {}) })

export const JOURNEY: MathStop[] = [
  {
    id: 'g1-2', place: 'Grade 1-2', placeVi: 'Số học vỡ lòng', emoji: '🔢',
    era: 'Lớp 1–2', figure: 'Đếm · Cộng · Trừ', color: '#58cc02',
    blurbVi: 'Khởi đầu: đếm số, cộng trừ trong phạm vi nhỏ.',
    lessons: [{
      id: 'math-g1-2-l1', title: 'Cộng trừ cơ bản', icon: '🧸', questions: [
        q('m-g12-1', '$3 + 4 = ?$', ['6', '7', '8', '5'], 1, '$3+4=7$.'),
        q('m-g12-2', '$9 - 5 = ?$', ['3', '4', '5', '6'], 1, '$9-5=4$.'),
        q('m-g12-3', 'Số liền sau của $7$ là?', ['6', '8', '9', '7'], 1, 'Liền sau $7$ là $8$.'),
        q('m-g12-4', '$2 + 2 + 2 = ?$', ['4', '6', '8', '5'], 1, 'Cộng ba lần $2$: $=6$.'),
        q('m-g12-5', '$10 - 1 - 1 = ?$', ['9', '8', '7', '10'], 1, '$10-1-1=8$.'),
      ],
    }],
  },
  {
    id: 'g3-5', place: 'Grade 3-5', placeVi: 'Tiểu học', emoji: '✖️',
    era: 'Lớp 3–5', figure: 'Nhân chia · Phân số', color: '#1cb0f6',
    blurbVi: 'Nhân chia, phân số và hình học cơ bản.',
    lessons: [{
      id: 'math-g3-5-l1', title: 'Nhân chia & phân số', icon: '🍕', questions: [
        q('m-g35-1', '$6 \\times 7 = ?$', ['42', '48', '36', '49'], 0, '$6\\times 7 = 42$.'),
        q('m-g35-2', '$56 \\div 8 = ?$', ['6', '7', '8', '9'], 1, '$56\\div 8 = 7$.'),
        q('m-g35-3', '$\\dfrac{1}{2} + \\dfrac{1}{4} = ?$', ['$\\frac{2}{6}$', '$\\frac{3}{4}$', '$\\frac{1}{6}$', '$\\frac{2}{4}$'], 1, 'Quy đồng: $\\frac{2}{4}+\\frac{1}{4}=\\frac{3}{4}$.'),
        q('m-g35-4', 'Chu vi hình vuông cạnh $5$ cm là?', ['$10$ cm', '$20$ cm', '$25$ cm', '$15$ cm'], 1, 'Chu vi $=4\\times 5 = 20$ cm.'),
        q('m-g35-5', '$\\dfrac{3}{5}$ của $20$ là?', ['$12$', '$15$', '$10$', '$6$'], 0, '$\\frac{3}{5}\\times 20 = 12$.'),
      ],
    }],
  },
  {
    id: 'g6-7', place: 'Grade 6-7', placeVi: 'THCS (đầu cấp)', emoji: '➗',
    era: 'Lớp 6–7', figure: 'Số nguyên · Tỉ lệ', color: '#ce82ff',
    blurbVi: 'Số nguyên âm, tỉ lệ và biểu thức đại số đầu tiên.',
    lessons: [{
      id: 'math-g6-7-l1', title: 'Số nguyên & biểu thức', icon: '🌡️', questions: [
        q('m-g67-1', '$(-7) + 12 = ?$', ['$-5$', '$5$', '$19$', '$-19$'], 1, '$-7+12 = 5$.'),
        q('m-g67-2', '$(-3) \\times (-6) = ?$', ['$-18$', '$18$', '$-9$', '$9$'], 1, 'Âm nhân âm ra dương: $18$.'),
        q('m-g67-3', 'Tính giá trị $2x + 5$ khi $x = 4$', ['$9$', '$13$', '$20$', '$11$'], 1, '$2\\cdot 4 + 5 = 13$.'),
        q('m-g67-4', 'Tỉ số $\\dfrac{12}{18}$ rút gọn là?', ['$\\frac{2}{3}$', '$\\frac{3}{4}$', '$\\frac{6}{9}$', '$\\frac{1}{2}$'], 0, 'Chia cả tử mẫu cho $6$: $\\frac{2}{3}$.'),
        q('m-g67-5', '$|-9| = ?$', ['$-9$', '$9$', '$0$', '$18$'], 1, 'Giá trị tuyệt đối: $|-9| = 9$.'),
      ],
    }],
  },
  {
    id: 'g8-9', place: 'Grade 8-9', placeVi: 'THCS', emoji: '📐',
    era: 'Lớp 8–9', figure: 'Phương trình · Pythagoras', color: '#ff9600',
    blurbVi: 'Phương trình bậc nhất, căn bậc hai, định lý Pythagoras.',
    lessons: [{
      id: 'math-g8-9-l1', title: 'Phương trình & hình học', icon: '📏', questions: [
        q('m-g89-1', 'Giải $2x - 6 = 10$', ['$x=2$', '$x=8$', '$x=4$', '$x=16$'], 1, '$2x=16 \\Rightarrow x=8$.'),
        q('m-g89-2', '$\\sqrt{144} = ?$', ['$12$', '$14$', '$72$', '$11$'], 0, '$12^2 = 144$.'),
        q('m-g89-3', 'Tam giác vuông có hai cạnh góc vuông $3$ và $4$. Cạnh huyền $c=?$', ['$5$', '$6$', '$7$', '$\\sqrt7$'], 0, 'Pythagoras: $c=\\sqrt{3^2+4^2}=\\sqrt{25}=5$.',
          '\\begin{tikzpicture}\\draw[thick] (0,0)--(3,0)--(3,2)--cycle; \\draw (2.75,0)--(2.75,0.25)--(3,0.25); \\node[below] at (1.5,0){$3$}; \\node[right] at (3,1){$4$}; \\node[above left] at (1.5,1){$c$};\\end{tikzpicture}'),
        q('m-g89-4', 'Nghiệm của $x^2 = 49$ là?', ['$x=7$', '$x=\\pm 7$', '$x=24.5$', '$x=-7$'], 1, '$x=\\pm\\sqrt{49}=\\pm 7$.'),
        q('m-g89-5', 'Hằng đẳng thức $(a+b)^2 = ?$', ['$a^2+b^2$', '$a^2+2ab+b^2$', '$a^2-b^2$', '$2a+2b$'], 1, '$(a+b)^2=a^2+2ab+b^2$.'),
      ],
    }],
  },
  {
    id: 'g10', place: 'Grade 10', placeVi: 'THPT — Lớp 10', emoji: '📊',
    era: 'Lớp 10', figure: 'Hàm số · Lượng giác', color: '#22d3ee',
    blurbVi: 'Tập hợp, hàm số bậc hai (parabol), lượng giác cơ bản.',
    lessons: [{
      id: 'math-g10-l1', title: 'Hàm số & lượng giác', icon: '📈', questions: [
        q('m-g10-1', 'Đồ thị hàm $y = x^2$ có dạng?', ['Đường thẳng', 'Parabol', 'Đường tròn', 'Hyperbol'], 1, '$y=x^2$ là parabol đỉnh $O$, mở lên.',
          '\\begin{tikzpicture}[scale=0.9]\\draw[->](-2.2,0)--(2.2,0) node[right]{$x$}; \\draw[->](0,-0.3)--(0,3) node[above]{$y$}; \\draw[thick,domain=-1.6:1.6,smooth,variable=\\x] plot ({\\x},{\\x*\\x});\\end{tikzpicture}'),
        q('m-g10-2', '$\\sin 30^\\circ = ?$', ['$\\frac{1}{2}$', '$\\frac{\\sqrt3}{2}$', '$1$', '$0$'], 0, '$\\sin 30^\\circ = \\tfrac12$.'),
        q('m-g10-3', '$\\cos 0^\\circ = ?$', ['$0$', '$1$', '$-1$', '$\\frac12$'], 1, '$\\cos 0^\\circ = 1$.'),
        q('m-g10-4', 'Đỉnh của parabol $y = (x-2)^2 + 3$ là?', ['$(2;3)$', '$(-2;3)$', '$(2;-3)$', '$(3;2)$'], 0, 'Dạng $y=(x-h)^2+k$ có đỉnh $(h;k)=(2;3)$.'),
        q('m-g10-5', '$\\sin^2\\alpha + \\cos^2\\alpha = ?$', ['$0$', '$1$', '$2$', '$\\tan\\alpha$'], 1, 'Hệ thức cơ bản: $\\sin^2\\alpha+\\cos^2\\alpha=1$.'),
      ],
    }],
  },
  {
    id: 'g11', place: 'Grade 11', placeVi: 'THPT — Lớp 11', emoji: '🧮',
    era: 'Lớp 11', figure: 'Đạo hàm · Xác suất', color: '#a06bff',
    blurbVi: 'Dãy số, giới hạn, đạo hàm, tổ hợp – xác suất.',
    lessons: [{
      id: 'math-g11-l1', title: 'Đạo hàm & xác suất', icon: '🎲', questions: [
        q('m-g11-1', 'Đạo hàm $(x^3)\' = ?$', ['$3x^2$', '$x^2$', '$3x$', '$x^4$'], 0, 'Quy tắc luỹ thừa: $(x^n)\'=nx^{n-1}$.'),
        q('m-g11-2', '$\\lim\\limits_{x\\to 0}\\dfrac{\\sin x}{x} = ?$', ['$0$', '$1$', '$\\infty$', 'Không tồn tại'], 1, 'Giới hạn lượng giác cơ bản $=1$.'),
        q('m-g11-3', 'Số hoán vị của $4$ phần tử: $4! = ?$', ['$12$', '$24$', '$16$', '$8$'], 1, '$4!=4\\cdot3\\cdot2\\cdot1=24$.'),
        q('m-g11-4', 'Tung 1 con xúc xắc, xác suất ra mặt $6$ là?', ['$\\frac16$', '$\\frac12$', '$\\frac{1}{36}$', '$1$'], 0, '1 trong 6 mặt: $P=\\frac16$.'),
        q('m-g11-5', 'Đạo hàm $(2x^2 + 3x)\' = ?$', ['$4x+3$', '$2x+3$', '$4x$', '$x^2+3$'], 0, "$(2x^2)'+(3x)'=4x+3$."),
      ],
    }],
  },
  {
    id: 'g12', place: 'Grade 12', placeVi: 'THPT — Lớp 12', emoji: '∫',
    era: 'Lớp 12', figure: 'Tích phân · Số phức', color: '#f5b301',
    blurbVi: 'Nguyên hàm – tích phân, số phức, hình giải tích $Oxyz$.',
    lessons: [{
      id: 'math-g12-l1', title: 'Tích phân & số phức', icon: '🧊', questions: [
        q('m-g12b-1', '$\\displaystyle\\int_0^1 2x\\,dx = ?$', ['$1$', '$2$', '$\\frac12$', '$0$'], 0, '$\\int 2x\\,dx = x^2$; thay cận: $1^2-0^2 = 1$.'),
        q('m-g12b-2', 'Với $i^2 = -1$, thì $i^4 = ?$', ['$-1$', '$1$', '$i$', '$-i$'], 1, '$i^4=(i^2)^2=(-1)^2=1$.'),
        q('m-g12b-3', 'Nguyên hàm $\\displaystyle\\int \\cos x\\,dx = ?$', ['$-\\sin x + C$', '$\\sin x + C$', '$\\cos x + C$', '$-\\cos x + C$'], 1, "$(\\sin x)'=\\cos x$ nên nguyên hàm là $\\sin x + C$."),
        q('m-g12b-4', 'Môđun của số phức $z = 3 + 4i$ là?', ['$5$', '$7$', '$\\sqrt7$', '$25$'], 0, '$|z|=\\sqrt{3^2+4^2}=5$.'),
        q('m-g12b-5', 'Trong $Oxyz$, vectơ $\\vec{AB}$ với $A(1;0;0),B(1;2;0)$ là?', ['$(0;2;0)$', '$(1;2;0)$', '$(0;0;0)$', '$(2;0;0)$'], 0, '$\\vec{AB}=B-A=(0;2;0)$.'),
      ],
    }],
  },
  {
    id: 'university', place: 'University', placeVi: 'Toán Đại học', emoji: '🎓',
    era: 'Đại học', figure: 'Đại số tuyến tính · Giải tích', color: '#3b6fe0',
    blurbVi: 'Đại số tuyến tính, giải tích nhiều biến, xác suất – thống kê.',
    lessons: [{
      id: 'math-university-l1', title: 'Toán cao cấp', icon: '🏛️', questions: [
        q('m-uni-1', 'Định thức $\\det\\begin{pmatrix}1&2\\\\3&4\\end{pmatrix} = ?$', ['$-2$', '$2$', '$10$', '$-10$'], 0, '$ad-bc = 1\\cdot4 - 2\\cdot3 = -2$.'),
        q('m-uni-2', 'Đạo hàm riêng $\\dfrac{\\partial}{\\partial x}(x^2 y) = ?$', ['$2xy$', '$x^2$', '$2x$', '$y$'], 0, 'Xem $y$ là hằng: $\\frac{\\partial}{\\partial x}(x^2y)=2xy$.'),
        q('m-uni-3', 'Kỳ vọng khi tung xúc xắc cân đối $E[X] = ?$', ['$3$', '$3.5$', '$6$', '$1$'], 1, '$E[X]=\\frac{1+2+\\dots+6}{6}=3.5$.'),
        q('m-uni-4', 'Ma trận đơn vị $I_2$ nhân với vectơ $v$ cho?', ['$0$', '$v$', '$2v$', '$-v$'], 1, '$I\\,v = v$ ($I$ là phần tử trung hoà của phép nhân ma trận).'),
        q('m-uni-5', '$\\displaystyle\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = ?$', ['$\\pi$', '$\\sqrt{\\pi}$', '$1$', '$2\\pi$'], 1, 'Tích phân Gauss: $\\int_{-\\infty}^{\\infty}e^{-x^2}dx=\\sqrt{\\pi}$.'),
      ],
    }],
  },
  {
    id: 'physics-math', place: 'Math for Physics', placeVi: 'Toán cho Vật lí', emoji: '⚛️',
    era: 'Ứng dụng', figure: 'Vector · Vi phân', color: '#ef4444',
    blurbVi: 'Công cụ toán cho vật lí: vector, đạo hàm/tích phân, phương trình vi phân.',
    lessons: [{
      id: 'math-physics-l1', title: 'Toán trong Vật lí', icon: '🚀', questions: [
        q('m-phy-1', 'Vận tốc là đạo hàm của quãng đường theo thời gian: $v = ?$', ['$\\frac{dx}{dt}$', '$\\int x\\,dt$', '$x\\cdot t$', '$\\frac{dt}{dx}$'], 0, '$v=\\dfrac{dx}{dt}$ — tốc độ thay đổi vị trí.'),
        q('m-phy-2', 'Gia tốc $a$ là đạo hàm của?', ['Quãng đường', 'Vận tốc theo thời gian', 'Lực', 'Khối lượng'], 1, '$a=\\dfrac{dv}{dt}=\\dfrac{d^2x}{dt^2}$.'),
        q('m-phy-3', 'Độ lớn vectơ $\\vec{F}=(3;4)$ N là?', ['$5$ N', '$7$ N', '$12$ N', '$1$ N'], 0, '$|\\vec F|=\\sqrt{3^2+4^2}=5$ N.',
          '\\begin{tikzpicture}[scale=0.8]\\draw[->](0,0)--(2,0) node[below]{$3$}; \\draw[->](2,0)--(2,1.6) node[right]{$4$}; \\draw[->,very thick,red](0,0)--(2,1.6) node[midway,above left]{$\\vec{F}$};\\end{tikzpicture}'),
        q('m-phy-4', 'Quãng đường = tích phân của vận tốc: $x = ?$', ['$\\frac{dv}{dt}$', '$\\int v\\,dt$', '$v^2$', '$\\frac{v}{t}$'], 1, '$x=\\int v\\,dt$ — tích luỹ vận tốc theo thời gian.'),
        q('m-phy-5', 'Công thức năng lượng nổi tiếng của Einstein?', ['$E=mc$', '$E=mc^2$', '$E=\\frac12 mv$', '$F=ma$'], 1, '$E=mc^2$ — tương đương khối lượng–năng lượng.'),
      ],
    }],
  },
  {
    id: 'ai-math', place: 'Math for AI', placeVi: 'Toán cho Nghiên cứu AI', emoji: '🤖',
    era: 'Ứng dụng', figure: 'Ma trận · Gradient · Xác suất', color: '#7c5cff',
    blurbVi: 'Đích đến: nền toán cho AI — đại số tuyến tính, gradient, xác suất, hàm mất mát.',
    lessons: [{
      id: 'math-ai-l1', title: 'Toán cho Machine Learning', icon: '🧠', questions: [
        q('m-ai-1', 'Đạo hàm hàm sigmoid $\\sigma(x)=\\dfrac{1}{1+e^{-x}}$ bằng?', ['$\\sigma(x)$', '$\\sigma(x)(1-\\sigma(x))$', '$e^{-x}$', '$1-\\sigma(x)$'], 1, 'Kết quả đẹp dùng trong backprop: $\\sigma\'=\\sigma(1-\\sigma)$.'),
        q('m-ai-2', 'Hàm mất mát MSE cho 1 mẫu là?', ['$|y-\\hat y|$', '$(y-\\hat y)^2$', '$y\\cdot\\hat y$', '$\\log y$'], 1, 'Mean Squared Error: $(y-\\hat y)^2$.'),
        q('m-ai-3', 'Gradient Descent cập nhật tham số theo hướng?', ['Cùng gradient', 'Ngược gradient', 'Vuông góc gradient', 'Ngẫu nhiên'], 1, '$\\theta \\leftarrow \\theta - \\eta\\nabla L$ — đi NGƯỢC gradient để giảm mất mát.'),
        q('m-ai-4', 'Tích vô hướng $\\vec{a}\\cdot\\vec{b}$ với $\\vec a=(1;2),\\vec b=(3;4)$ là?', ['$11$', '$10$', '$7$', '$(3;8)$'], 0, '$1\\cdot3 + 2\\cdot4 = 3+8 = 11$.'),
        q('m-ai-5', 'Hàm softmax biến vectơ điểm số thành?', ['Ma trận', 'Phân phối xác suất (tổng = 1)', 'Số nguyên', 'Đạo hàm'], 1, 'Softmax: $\\frac{e^{z_i}}{\\sum_j e^{z_j}}$ → các giá trị dương, tổng bằng $1$.'),
      ],
    }],
  },
]

// ─── Lookups ────────────────────────────────────────────────────────────────
export function allLessonsInOrder(): MathLesson[] {
  const out: MathLesson[] = []
  for (const s of JOURNEY) out.push(...s.lessons)
  return out
}
export function getLesson(lessonId: string): { stop: MathStop; lesson: MathLesson } | undefined {
  for (const stop of JOURNEY) {
    const lesson = stop.lessons.find(l => l.id === lessonId)
    if (lesson) return { stop, lesson }
  }
  return undefined
}
export function mathStats() {
  let lessons = 0, questions = 0
  for (const s of JOURNEY) for (const l of s.lessons) { lessons++; questions += l.questions.length }
  return { stops: JOURNEY.length, lessons, questions }
}
