/**
 * Math curriculum — HÀNH TRÌNH TOÁN HỌC theo dòng lịch sử.
 *
 * Lộ trình = chuỗi TRUNG TÂM TOÁN HỌC qua các thời đại, từ cổ đại đến hiện đại:
 *   🏛️ Alexandria → 🏟️ La Mã → 🕉️ Ấn Độ → 🐉 Trung Quốc → 🕌 Baghdad →
 *   🎨 Phục Hưng → 🍎 Giải tích → 🏰 Göttingen → 🎓 Viện IAS Princeton.
 * Mỗi chặng = 1 "bài" gồm câu hỏi trắc nghiệm + giải thích + bối cảnh lịch sử.
 * Càng tiến về hiện đại độ khó càng tăng. Khoá tuần tự, có XP/streak/sao.
 */

export interface MathQuestion {
  id: string
  prompt: string
  options: string[]
  correctIdx: number
  explain: string
}

export interface MathLesson {
  id: string
  title: string
  icon: string
  questions: MathQuestion[]
}

export interface MathStop {
  id: string
  place: string        // tên gốc
  placeVi: string      // tên + thời đại VN
  emoji: string
  era: string          // mốc thời gian
  figure: string       // nhà toán học tiêu biểu
  color: string
  blurbVi: string      // dẫn truyện lịch sử
  lessons: MathLesson[]
}

const q = (id: string, prompt: string, options: string[], correctIdx: number, explain: string): MathQuestion =>
  ({ id, prompt, options, correctIdx, explain })

export const JOURNEY: MathStop[] = [
  {
    id: 'alexandria', place: 'Alexandria', placeVi: 'Alexandria (Ai Cập cổ đại)', emoji: '🏛️',
    era: '~300 TCN', figure: 'Euclid', color: '#d4a017',
    blurbVi: 'Thư viện Alexandria — nơi Euclid viết "Cơ sở", đặt nền móng hình học.',
    lessons: [{
      id: 'math-alexandria-l1', title: 'Hình học Euclid', icon: '📐', questions: [
        q('m-alex-1', 'Tổng ba góc trong một tam giác bằng?', ['90°', '180°', '270°', '360°'], 1, 'Định lý cơ bản của hình học Euclid: tổng ba góc trong tam giác luôn = 180°.'),
        q('m-alex-2', 'Diện tích hình chữ nhật dài 8, rộng 5 là?', ['13', '26', '40', '45'], 2, 'Diện tích = dài × rộng = 8 × 5 = 40.'),
        q('m-alex-3', 'Theo định lý Pythagoras, với tam giác vuông cạnh 3 và 4, cạnh huyền là?', ['5', '6', '7', '12'], 0, '3² + 4² = 9 + 16 = 25 = 5². Cạnh huyền = 5.'),
        q('m-alex-4', 'Số nào sau đây là số nguyên tố?', ['1', '9', '11', '15'], 2, 'Euclid chứng minh có vô hạn số nguyên tố. 11 chỉ chia hết cho 1 và 11.'),
        q('m-alex-5', 'Hai đường thẳng song song thì có bao nhiêu điểm chung?', ['0', '1', '2', 'Vô số'], 0, 'Theo tiên đề Euclid, hai đường thẳng song song không có điểm chung.'),
      ],
    }],
  },
  {
    id: 'rome', place: 'Rome', placeVi: 'La Mã cổ đại', emoji: '🏟️',
    era: '~100 TCN', figure: 'Số La Mã', color: '#b03a2e',
    blurbVi: 'Đế chế La Mã dùng chữ số La Mã cho thương mại, kiến trúc và lịch.',
    lessons: [{
      id: 'math-rome-l1', title: 'Chữ số La Mã', icon: '🔢', questions: [
        q('m-rome-1', 'Chữ số La Mã "IV" bằng?', ['6', '4', '9', '14'], 1, 'I trước V nghĩa là trừ: V(5) − I(1) = 4.'),
        q('m-rome-2', '"IX" bằng bao nhiêu?', ['11', '8', '9', '19'], 2, 'I trước X: X(10) − I(1) = 9.'),
        q('m-rome-3', '"XL" bằng?', ['60', '40', '15', '90'], 1, 'X trước L: L(50) − X(10) = 40.'),
        q('m-rome-4', 'Số 7 viết bằng chữ La Mã là?', ['VII', 'IIV', 'VV', 'XII'], 0, '7 = 5 + 1 + 1 = VII.'),
        q('m-rome-5', '"C" trong chữ số La Mã bằng?', ['50', '100', '500', '1000'], 1, 'C = 100 (centum). M = 1000, D = 500, L = 50.'),
      ],
    }],
  },
  {
    id: 'india', place: 'India', placeVi: 'Ấn Độ', emoji: '🕉️',
    era: '~500', figure: 'Aryabhata, Brahmagupta', color: '#e67e22',
    blurbVi: 'Ấn Độ phát minh số 0 và hệ thập phân — bước ngoặt vĩ đại của toán học.',
    lessons: [{
      id: 'math-india-l1', title: 'Số 0 & hệ thập phân', icon: '⓪', questions: [
        q('m-india-1', 'Nền văn minh nào phát minh ra số 0 như một con số?', ['Hy Lạp', 'Ấn Độ', 'La Mã', 'Ai Cập'], 1, 'Brahmagupta (Ấn Độ, ~628) là người đầu tiên định nghĩa 0 và quy tắc tính với 0.'),
        q('m-india-2', 'Một số nhân với 0 bằng?', ['Chính nó', '0', '1', 'Không xác định'], 1, 'Brahmagupta: bất kỳ số nào nhân 0 đều bằng 0.'),
        q('m-india-3', 'Trong số 305, chữ số 0 có vai trò gì?', ['Vô nghĩa', 'Giữ hàng chục', 'Làm tròn', 'Dấu phẩy'], 1, 'Hệ thập phân: 0 giữ vị trí hàng chục → 3 trăm, 0 chục, 5 đơn vị.'),
        q('m-india-4', '7 + 0 = ?', ['0', '7', '70', '1'], 1, 'Cộng 0 không đổi giá trị (0 là phần tử trung hoà của phép cộng).'),
        q('m-india-5', 'Hệ cơ số chúng ta dùng hằng ngày là hệ?', ['Nhị phân', 'Thập phân', 'La Mã', 'Lục thập phân'], 1, 'Hệ thập phân (cơ số 10) từ Ấn Độ, lan sang Ả Rập rồi châu Âu.'),
      ],
    }],
  },
  {
    id: 'china', place: 'China', placeVi: 'Trung Quốc', emoji: '🐉',
    era: '~200 TCN–1300', figure: 'Cửu Chương Toán Thuật', color: '#c0392b',
    blurbVi: '"Cửu chương toán thuật" — số âm, giải hệ phương trình, định lý Câu Cổ.',
    lessons: [{
      id: 'math-china-l1', title: 'Số âm & hệ phương trình', icon: '🧮', questions: [
        q('m-china-1', '(−3) + 5 = ?', ['−8', '2', '8', '−2'], 1, 'Toán Trung Quốc cổ đã dùng số âm: −3 + 5 = 2.'),
        q('m-china-2', 'Định lý "Câu Cổ" của Trung Quốc tương ứng với định lý nào ở phương Tây?', ['Thales', 'Pythagoras', 'Euclid', 'Newton'], 1, 'Câu Cổ định lý = định lý Pythagoras (quan hệ cạnh tam giác vuông).'),
        q('m-china-3', 'Nếu x + 3 = 10 thì x = ?', ['6', '7', '13', '30'], 1, 'x = 10 − 3 = 7.'),
        q('m-china-4', '(−2) × (−4) = ?', ['−8', '−6', '8', '6'], 2, 'Âm nhân âm ra dương: (−2)×(−4) = 8.'),
        q('m-china-5', 'Tổng các số trong hình vuông ma phương 3×3 mỗi hàng bằng nhau gọi là?', ['Số trung bình', 'Hằng số ma phương', 'Số nguyên tố', 'Bội chung'], 1, 'Ma phương (Lạc Thư) — mỗi hàng/cột/chéo có tổng bằng "hằng số ma phương" (=15 với 3×3).'),
      ],
    }],
  },
  {
    id: 'baghdad', place: 'Baghdad', placeVi: 'Baghdad (Hồi giáo)', emoji: '🕌',
    era: '~820', figure: 'Al-Khwarizmi', color: '#16a085',
    blurbVi: 'Al-Khwarizmi viết sách "al-jabr" → sinh ra ĐẠI SỐ và từ "algorithm".',
    lessons: [{
      id: 'math-baghdad-l1', title: 'Đại số (Algebra)', icon: '🟰', questions: [
        q('m-bagh-1', 'Từ "algebra" bắt nguồn từ tên tác phẩm của ai?', ['Euclid', 'Al-Khwarizmi', 'Newton', 'Gauss'], 1, '"al-jabr" trong sách của Al-Khwarizmi → "algebra".'),
        q('m-bagh-2', 'Giải: 2x = 14, x = ?', ['6', '7', '12', '28'], 1, 'Chia hai vế cho 2: x = 14/2 = 7.'),
        q('m-bagh-3', 'Giải: x − 4 = 9, x = ?', ['5', '13', '36', '−5'], 1, 'Chuyển vế: x = 9 + 4 = 13.'),
        q('m-bagh-4', 'Từ "algorithm" (thuật toán) bắt nguồn từ?', ['Tên Al-Khwarizmi', 'Tiếng Hy Lạp', 'Tên Euclid', 'Tiếng La-tinh'], 0, '"Algorithm" Latin hoá từ tên Al-Khwarizmi.'),
        q('m-bagh-5', 'Giải: 3x + 1 = 10, x = ?', ['2', '3', '4', '9'], 1, '3x = 9 → x = 3.'),
      ],
    }],
  },
  {
    id: 'renaissance', place: 'Renaissance Europe', placeVi: 'Phục Hưng (Ý/Pháp)', emoji: '🎨',
    era: '~1200–1650', figure: 'Fibonacci, Descartes', color: '#8e44ad',
    blurbVi: 'Fibonacci đưa số Ả Rập vào châu Âu; Descartes sáng tạo hệ toạ độ.',
    lessons: [{
      id: 'math-renaissance-l1', title: 'Fibonacci & toạ độ', icon: '📈', questions: [
        q('m-ren-1', 'Dãy Fibonacci: 1, 1, 2, 3, 5, 8, … số tiếp theo là?', ['11', '13', '12', '10'], 1, 'Mỗi số = tổng hai số trước: 5 + 8 = 13.'),
        q('m-ren-2', 'Ai phát minh hệ toạ độ Descartes (Oxy)?', ['Fibonacci', 'Descartes', 'Fermat', 'Euclid'], 1, 'René Descartes — kết nối đại số và hình học bằng mặt phẳng toạ độ.'),
        q('m-ren-3', 'Điểm A(2; 3) nằm ở góc phần tư thứ mấy?', ['I', 'II', 'III', 'IV'], 0, 'x>0, y>0 → góc phần tư thứ I.'),
        q('m-ren-4', 'Số tiếp theo của dãy 2, 3, 5, 8, 13, … là?', ['18', '21', '20', '24'], 1, 'Fibonacci: 8 + 13 = 21.'),
        q('m-ren-5', 'Khoảng cách từ điểm (0;0) đến (3;4) là?', ['5', '7', '12', '25'], 0, '√(3² + 4²) = √25 = 5 (dùng toạ độ Descartes + Pythagoras).'),
      ],
    }],
  },
  {
    id: 'calculus', place: 'Calculus Era', placeVi: 'Kỷ nguyên Giải tích (Anh/Đức)', emoji: '🍎',
    era: '~1680', figure: 'Newton, Leibniz', color: '#2980b9',
    blurbVi: 'Newton và Leibniz độc lập sáng tạo Giải tích — đạo hàm & tích phân.',
    lessons: [{
      id: 'math-calculus-l1', title: 'Đạo hàm & tốc độ thay đổi', icon: '∫', questions: [
        q('m-calc-1', 'Đạo hàm mô tả điều gì?', ['Diện tích', 'Tốc độ thay đổi', 'Thể tích', 'Số đếm'], 1, 'Đạo hàm = tốc độ thay đổi tức thời (độ dốc tiếp tuyến).'),
        q('m-calc-2', 'Đạo hàm của hàm hằng (vd y = 5) bằng?', ['5', '0', '1', 'x'], 1, 'Hằng số không đổi → tốc độ thay đổi = 0.'),
        q('m-calc-3', 'Đạo hàm của y = x² là?', ['x', '2x', 'x²', '2'], 1, "Quy tắc luỹ thừa: (x²)' = 2x."),
        q('m-calc-4', 'Tích phân (ngược với đạo hàm) thường dùng để tính?', ['Độ dốc', 'Diện tích dưới đồ thị', 'Số nguyên tố', 'Góc'], 1, 'Tích phân tính diện tích/độ tích luỹ dưới đường cong.'),
        q('m-calc-5', 'Hai người đồng sáng lập giải tích là Newton và?', ['Gauss', 'Leibniz', 'Euler', 'Riemann'], 1, 'Gottfried Leibniz — ký hiệu ∫ và dy/dx là của ông.'),
      ],
    }],
  },
  {
    id: 'gottingen', place: 'Göttingen', placeVi: 'Göttingen (Đức)', emoji: '🏰',
    era: '~1800–1930', figure: 'Gauss, Riemann, Hilbert', color: '#34495e',
    blurbVi: 'Đại học Göttingen — "thủ đô toán học" với Gauss, Riemann, Hilbert.',
    lessons: [{
      id: 'math-gottingen-l1', title: 'Gauss & toán hiện đại', icon: '🔭', questions: [
        q('m-got-1', 'Tổng 1 + 2 + 3 + … + 100 = ? (mẹo của Gauss)', ['5000', '5050', '4950', '10000'], 1, 'Gauss: ghép cặp (1+100)×50 = 101×50 = 5050.'),
        q('m-got-2', 'Tổng 1 + 2 + … + 10 = ?', ['45', '55', '50', '100'], 1, '(1+10)×10/2 = 55.'),
        q('m-got-3', '"Vua của toán học" là biệt danh của ai?', ['Euclid', 'Gauss', 'Newton', 'Euler'], 1, 'Carl Friedrich Gauss được mệnh danh "Hoàng tử/Vua của toán học".'),
        q('m-got-4', 'Hilbert nổi tiếng với danh sách bao nhiêu bài toán mở (1900)?', ['10', '23', '50', '7'], 1, '23 bài toán Hilbert định hướng toán học thế kỷ 20.'),
        q('m-got-5', 'Phân phối "hình chuông" trong thống kê gắn với tên?', ['Riemann', 'Gauss', 'Fermat', 'Newton'], 1, 'Phân phối chuẩn (Gaussian) — đường cong hình chuông.'),
      ],
    }],
  },
  {
    id: 'princeton', place: 'Princeton IAS', placeVi: 'Viện IAS Princeton (Mỹ)', emoji: '🎓',
    era: '1930–nay', figure: 'Gödel, Einstein, von Neumann', color: '#7c5cff',
    blurbVi: 'Đích đến: Viện Nghiên cứu Cấp cao Princeton — thánh địa toán học hiện đại.',
    lessons: [{
      id: 'math-princeton-l1', title: 'Logic & toán hiện đại', icon: '♾️', questions: [
        q('m-prin-1', 'Định lý bất toàn (incompleteness) là của ai — làm việc tại IAS?', ['Gödel', 'Einstein', 'Turing', 'Nash'], 0, 'Kurt Gödel chứng minh định lý bất toàn — chấn động nền tảng toán học.'),
        q('m-prin-2', 'Tập hợp số tự nhiên {0,1,2,…} có số phần tử là?', ['Hữu hạn', 'Vô hạn đếm được', '100', 'Không xác định'], 1, 'Cantor: tập số tự nhiên là vô hạn ĐẾM ĐƯỢC.'),
        q('m-prin-3', 'Nhà bác học nào từng làm việc tại IAS Princeton?', ['Newton', 'Einstein', 'Euclid', 'Gauss'], 1, 'Albert Einstein là thành viên IAS từ 1933 đến cuối đời.'),
        q('m-prin-4', 'Logic mệnh đề: "NẾU trời mưa THÌ đường ướt". Trời mưa. Vậy?', ['Đường khô', 'Đường ướt', 'Không kết luận', 'Trời nắng'], 1, 'Suy diễn modus ponens: P→Q, P đúng ⇒ Q đúng → đường ướt.'),
        q('m-prin-5', '0,999… (lặp vô hạn) bằng?', ['Nhỏ hơn 1', '1', 'Không xác định', '0,9'], 1, 'Theo giải tích, 0,999… = 1 (giới hạn). Một kết quả hiện đại thú vị!'),
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
