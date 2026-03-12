#!/usr/bin/env bun
/**
 * Seed 100 Physics Multiple Choice Questions (4 choices A, B, C, D)
 * For grades 10, 11, 12
 * Usage: bun run scripts/seed-physics-questions.ts
 */

const physicsQuestions = [
  // === VẬT LÝ 10 - CƠ HỌC (30 questions) ===
  {
    content: "Một vật chuyển động thẳng đều với vận tốc 10 m/s. Quãng đường vật đi được trong 5 giây là:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "10",
    difficulty: "EASY",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "25 m",
      b: "50 m",
      c: "75 m",
      d: "100 m"
    },
    correctAnswer: "b"
  },
  {
    content: "Gia tốc của vật chuyển động thẳng nhanh dần đều có đặc điểm:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "10",
    difficulty: "EASY",
    cognitiveLevel: "Thông hiểu",
    status: "Đã duyệt",
    options: {
      a: "Ngược chiều với vận tốc",
      b: "Cùng chiều với vận tốc",
      c: "Vuông góc với vận tốc",
      d: "Bằng 0"
    },
    correctAnswer: "b"
  },
  {
    content: "Công thức tính vận tốc tức thời của vật chuyển động thẳng biến đổi đều là:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "10",
    difficulty: "MEDIUM",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "v = v₀ + at",
      b: "v = v₀ - at",
      c: "v = at²",
      d: "v = v₀ + ½at²"
    },
    correctAnswer: "a"
  },
  {
    content: "Một vật rơi tự do từ độ cao h. Thời gian rơi được tính bằng công thức:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "10",
    difficulty: "MEDIUM",
    cognitiveLevel: "Thông hiểu",
    status: "Đã duyệt",
    options: {
      a: "t = √(2h/g)",
      b: "t = 2h/g",
      c: "t = h/g",
      d: "t = √(h/2g)"
    },
    correctAnswer: "a"
  },
  {
    content: "Định luật I Newton còn được gọi là định luật:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "10",
    difficulty: "EASY",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Quán tính",
      b: "Lực hấp dẫn",
      c: "Động lượng",
      d: "Bảo toàn năng lượng"
    },
    correctAnswer: "a"
  },
  {
    content: "Theo định luật II Newton, gia tốc của vật:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "10",
    difficulty: "MEDIUM",
    cognitiveLevel: "Thông hiểu",
    status: "Đã duyệt",
    options: {
      a: "Tỉ lệ thuận với khối lượng",
      b: "Tỉ lệ nghịch với lực tác dụng",
      c: "Tỉ lệ thuận với lực tác dụng",
      d: "Không phụ thuộc vào lực"
    },
    correctAnswer: "c"
  },
  {
    content: "Công thức tính lực hấp dẫn giữa hai vật là:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "10",
    difficulty: "MEDIUM",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "F = G(m₁m₂)/r²",
      b: "F = G(m₁+m₂)/r²",
      c: "F = Gm₁m₂r²",
      d: "F = G(m₁-m₂)/r²"
    },
    correctAnswer: "a"
  },
  {
    content: "Hệ số ma sát trượt phụ thuộc vào:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "10",
    difficulty: "MEDIUM",
    cognitiveLevel: "Thông hiểu",
    status: "Đã duyệt",
    options: {
      a: "Diện tích tiếp xúc",
      b: "Bản chất và tình trạng của hai mặt tiếp xúc",
      c: "Tốc độ của vật",
      d: "Khối lượng của vật"
    },
    correctAnswer: "b"
  },
  {
    content: "Lực đàn hồi của lò xo tuân theo định luật:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "10",
    difficulty: "EASY",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Hooke",
      b: "Newton",
      c: "Coulomb",
      d: "Ohm"
    },
    correctAnswer: "a"
  },
  {
    content: "Công thức tính lực đàn hồi của lò xo là:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "10",
    difficulty: "MEDIUM",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "F = kΔl",
      b: "F = k/Δl",
      c: "F = kΔl²",
      d: "F = Δl/k"
    },
    correctAnswer: "a"
  },
  {
    content: "Một vật có khối lượng 2 kg chịu tác dụng của lực 10 N. Gia tốc của vật là:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "10",
    difficulty: "EASY",
    cognitiveLevel: "Vận dụng",
    status: "Đã duyệt",
    options: {
      a: "2 m/s²",
      b: "5 m/s²",
      c: "10 m/s²",
      d: "20 m/s²"
    },
    correctAnswer: "b"
  },
  {
    content: "Vật ném ngang với vận tốc ban đầu v₀. Tầm bay xa được tính bằng:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "10",
    difficulty: "HARD",
    cognitiveLevel: "Vận dụng",
    status: "Đã duyệt",
    options: {
      a: "L = v₀√(2h/g)",
      b: "L = v₀h/g",
      c: "L = v₀²/2g",
      d: "L = 2v₀h/g"
    },
    correctAnswer: "a"
  },
  {
    content: "Điều kiện cân bằng của vật rắn chịu tác dụng của hai lực là:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "10",
    difficulty: "MEDIUM",
    cognitiveLevel: "Thông hiểu",
    status: "Đã duyệt",
    options: {
      a: "Hai lực cùng độ lớn, cùng chiều",
      b: "Hai lực cùng độ lớn, ngược chiều",
      c: "Hai lực vuông góc nhau",
      d: "Hai lực song song"
    },
    correctAnswer: "b"
  },
  {
    content: "Momen lực được tính bằng công thức:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "10",
    difficulty: "MEDIUM",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "M = Fd",
      b: "M = F/d",
      c: "M = Fd²",
      d: "M = d/F"
    },
    correctAnswer: "a"
  },
  {
    content: "Đơn vị của momen lực là:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "10",
    difficulty: "EASY",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "N.m",
      b: "N/m",
      c: "J/s",
      d: "kg.m/s²"
    },
    correctAnswer: "a"
  },
  {
    content: "Quy tắc momen lực: Tổng momen lực theo chiều kim đồng hồ ... tổng momen lực theo chiều ngược chiều kim đồng hồ",
    type: "MCQ",
    subject: "Vật lí",
    grade: "10",
    difficulty: "MEDIUM",
    cognitiveLevel: "Thông hiểu",
    status: "Đã duyệt",
    options: {
      a: "Lớn hơn",
      b: "Nhỏ hơn",
      c: "Bằng",
      d: "Khác"
    },
    correctAnswer: "c"
  },
  {
    content: "Trọng tâm của vật là điểm đặt của:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "10",
    difficulty: "EASY",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Lực kéo",
      b: "Lực đẩy",
      c: "Trọng lực",
      d: "Lực ma sát"
    },
    correctAnswer: "c"
  },
  {
    content: "Một vật chuyển động tròn đều có gia tốc hướng tâm:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "10",
    difficulty: "MEDIUM",
    cognitiveLevel: "Thông hiểu",
    status: "Đã duyệt",
    options: {
      a: "Hướng vào tâm quỹ đạo",
      b: "Hướng ra xa tâm",
      c: "Tiếp tuyến với quỹ đạo",
      d: "Vuông góc với bán kính"
    },
    correctAnswer: "a"
  },
  {
    content: "Công thức tính gia tốc hướng tâm là:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "10",
    difficulty: "MEDIUM",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "a = v²/r",
      b: "a = vr",
      c: "a = v/r",
      d: "a = r/v"
    },
    correctAnswer: "a"
  },
  {
    content: "Chu kỳ của chuyển động tròn đều là:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "10",
    difficulty: "EASY",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Thời gian đi hết một vòng",
      b: "Số vòng đi được trong một giây",
      c: "Quãng đường đi được trong một vòng",
      d: "Vận tốc dài của vật"
    },
    correctAnswer: "a"
  },
  {
    content: "Tần số của chuyển động tròn đều có đơn vị là:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "10",
    difficulty: "EASY",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Hz",
      b: "m/s",
      c: "rad/s",
      d: "s"
    },
    correctAnswer: "a"
  },
  {
    content: "Mối liên hệ giữa tốc độ dài và tốc độ góc trong chuyển động tròn đều:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "10",
    difficulty: "MEDIUM",
    cognitiveLevel: "Thông hiểu",
    status: "Đã duyệt",
    options: {
      a: "v = ωr",
      b: "v = ω/r",
      c: "v = r/ω",
      d: "v = ω²r"
    },
    correctAnswer: "a"
  },
  {
    content: "Lực hướng tâm trong chuyển động tròn đều là:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "10",
    difficulty: "MEDIUM",
    cognitiveLevel: "Thông hiểu",
    status: "Đã duyệt",
    options: {
      a: "Lực hấp dẫn",
      b: "Hợp lực tác dụng lên vật",
      c: "Lực ma sát",
      d: "Lực đàn hồi"
    },
    correctAnswer: "b"
  },
  {
    content: "Công thức tính lực hướng tâm là:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "10",
    difficulty: "MEDIUM",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "F = mv²/r",
      b: "F = mvr",
      c: "F = mv/r",
      d: "F = mr/v"
    },
    correctAnswer: "a"
  },
  {
    content: "Khi xe chuyển động tròn đều, lực hướng tâm là:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "10",
    difficulty: "HARD",
    cognitiveLevel: "Vận dụng",
    status: "Đã duyệt",
    options: {
      a: "Lực kéo của động cơ",
      b: "Lực ma sát nghỉ",
      c: "Trọng lực",
      d: "Phản lực"
    },
    correctAnswer: "b"
  },
  {
    content: "Chuyển động của vật ném ngang là chuyển động:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "10",
    difficulty: "MEDIUM",
    cognitiveLevel: "Thông hiểu",
    status: "Đã duyệt",
    options: {
      a: "Thẳng đều",
      b: "Rơi tự do",
      c: "Tổng hợp của chuyển động thẳng đều và rơi tự do",
      d: "Tròn đều"
    },
    correctAnswer: "c"
  },
  {
    content: "Quỹ đạo của vật ném ngang có dạng:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "10",
    difficulty: "EASY",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Đường thẳng",
      b: "Đường tròn",
      c: "Parabol",
      d: "Elip"
    },
    correctAnswer: "c"
  },
  {
    content: "Thời gian rơi của vật ném ngang phụ thuộc vào:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "10",
    difficulty: "MEDIUM",
    cognitiveLevel: "Thông hiểu",
    status: "Đã duyệt",
    options: {
      a: "Vận tốc ném",
      b: "Độ cao ném",
      c: "Khối lượng vật",
      d: "Tầm xa"
    },
    correctAnswer: "b"
  },
  {
    content: "Tầm xa của vật ném ngang không phụ thuộc vào:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "10",
    difficulty: "HARD",
    cognitiveLevel: "Vận dụng",
    status: "Đã duyệt",
    options: {
      a: "Độ cao ném",
      b: "Vận tốc ném",
      c: "Gia tốc trọng trường",
      d: "Khối lượng vật"
    },
    correctAnswer: "d"
  },
  {
    content: "Trong chuyển động ném xiên, tại độ cao cực đại:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "10",
    difficulty: "HARD",
    cognitiveLevel: "Vận dụng",
    status: "Đã duyệt",
    options: {
      a: "Vận tốc bằng 0",
      b: "Thành phần vận tốc theo phương ngang bằng 0",
      c: "Thành phần vận tốc theo phương thẳng đứng bằng 0",
      d: "Gia tốc bằng 0"
    },
    correctAnswer: "c"
  },

  // === VẬT LÝ 11 - ĐIỆN HỌC (35 questions) ===
  {
    content: "Điện tích điểm là:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "11",
    difficulty: "EASY",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Vật có kích thước rất nhỏ",
      b: "Vật tích điện có kích thước rất nhỏ so với khoảng cách xét",
      c: "Vật không có kích thước",
      d: "Vật có điện tích rất nhỏ"
    },
    correctAnswer: "b"
  },
  {
    content: "Theo định luật Coulomb, lực tương tác giữa hai điện tích điểm:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "11",
    difficulty: "MEDIUM",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Tỉ lệ thuận với khoảng cách",
      b: "Tỉ lệ nghịch với khoảng cách",
      c: "Tỉ lệ nghịch với bình phương khoảng cách",
      d: "Tỉ lệ thuận với bình phương khoảng cách"
    },
    correctAnswer: "c"
  },
  {
    content: "Đơn vị của điện tích là:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "11",
    difficulty: "EASY",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Vôn (V)",
      b: "Ampe (A)",
      c: "Culông (C)",
      d: "Oát (W)"
    },
    correctAnswer: "c"
  },
  {
    content: "Cường độ điện trường tại một điểm đặc trưng cho:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "11",
    difficulty: "MEDIUM",
    cognitiveLevel: "Thông hiểu",
    status: "Đã duyệt",
    options: {
      a: "Khả năng sinh công của điện trường",
      b: "Tác dụng lực của điện trường",
      c: "Tốc độ di chuyển của điện tích",
      d: "Năng lượng của điện trường"
    },
    correctAnswer: "b"
  },
  {
    content: "Công thức tính cường độ điện trường do điện tích điểm Q gây ra:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "11",
    difficulty: "MEDIUM",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "E = kQ/r²",
      b: "E = kQ/r",
      c: "E = kQ²/r",
      d: "E = kr²/Q"
    },
    correctAnswer: "a"
  },
  {
    content: "Đường sức điện là đường:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "11",
    difficulty: "EASY",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Thẳng",
      b: "Tròn",
      c: "Tiếp tuyến với vectơ cường độ điện trường",
      d: "Vuông góc với điện trường"
    },
    correctAnswer: "c"
  },
  {
    content: "Điện trường đều là điện trường có:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "11",
    difficulty: "MEDIUM",
    cognitiveLevel: "Thông hiểu",
    status: "Đã duyệt",
    options: {
      a: "Cường độ điện trường như nhau tại mọi điểm",
      b: "Đường sức điện là đường cong",
      c: "Cường độ điện trường khác nhau tại mọi điểm",
      d: "Chỉ có một đường sức"
    },
    correctAnswer: "a"
  },
  {
    content: "Công của lực điện trong điện trường đều được tính bằng:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "11",
    difficulty: "MEDIUM",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "A = qEd",
      b: "A = qE/d",
      c: "A = Ed/q",
      d: "A = qE²d"
    },
    correctAnswer: "a"
  },
  {
    content: "Điện thế tại một điểm trong điện trường đặc trưng cho:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "11",
    difficulty: "MEDIUM",
    cognitiveLevel: "Thông hiểu",
    status: "Đã duyệt",
    options: {
      a: "Khả năng sinh công",
      b: "Khả năng tác dụng lực",
      c: "Tốc độ di chuyển",
      d: "Khối lượng"
    },
    correctAnswer: "a"
  },
  {
    content: "Đơn vị của điện thế là:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "11",
    difficulty: "EASY",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Culông (C)",
      b: "Vôn (V)",
      c: "Ampe (A)",
      d: "Oát (W)"
    },
    correctAnswer: "b"
  },
  {
    content: "Hiệu điện thế giữa hai điểm trong điện trường là:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "11",
    difficulty: "MEDIUM",
    cognitiveLevel: "Thông hiểu",
    status: "Đã duyệt",
    options: {
      a: "Thương số điện thế hai điểm",
      b: "Tổng điện thế hai điểm",
      c: "Hiệu điện thế hai điểm",
      d: "Tích điện thế hai điểm"
    },
    correctAnswer: "c"
  },
  {
    content: "Tụ điện là hệ thống:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "11",
    difficulty: "EASY",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Hai vật dẫn đặt gần nhau",
      b: "Hai vật dẫn đặt cách điện với nhau",
      c: "Một vật dẫn và một vật cách điện",
      d: "Hai vật cách điện"
    },
    correctAnswer: "b"
  },
  {
    content: "Điện dung của tụ điện đặc trưng cho:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "11",
    difficulty: "MEDIUM",
    cognitiveLevel: "Thông hiểu",
    status: "Đã duyệt",
    options: {
      a: "Khả năng tích điện",
      b: "Khả năng dẫn điện",
      c: "Khả năng cách điện",
      d: "Khả năng sinh công"
    },
    correctAnswer: "a"
  },
  {
    content: "Đơn vị của điện dung là:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "11",
    difficulty: "EASY",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Vôn (V)",
      b: "Culông (C)",
      c: "Fara (F)",
      d: "Oát (W)"
    },
    correctAnswer: "c"
  },
  {
    content: "Công thức tính điện dung của tụ điện phẳng:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "11",
    difficulty: "HARD",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "C = εS/9×10⁹×4πd",
      b: "C = εS/d",
      c: "C = S/εd",
      d: "C = εd/S"
    },
    correctAnswer: "a"
  },
  {
    content: "Năng lượng của tụ điện được tính bằng:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "11",
    difficulty: "MEDIUM",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "W = ½CU²",
      b: "W = CU²",
      c: "W = ½C²U",
      d: "W = C/U"
    },
    correctAnswer: "a"
  },
  {
    content: "Dòng điện không đổi là dòng điện có:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "11",
    difficulty: "EASY",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Chiều không đổi",
      b: "Cường độ không đổi",
      c: "Chiều và cường độ không đổi",
      d: "Chiều hoặc cường độ không đổi"
    },
    correctAnswer: "c"
  },
  {
    content: "Cường độ dòng điện được đo bằng:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "11",
    difficulty: "EASY",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Vôn kế",
      b: "Ampe kế",
      c: "Oát kế",
      d: "Ôm kế"
    },
    correctAnswer: "b"
  },
  {
    content: "Suất điện động của nguồn điện đặc trưng cho:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "11",
    difficulty: "MEDIUM",
    cognitiveLevel: "Thông hiểu",
    status: "Đã duyệt",
    options: {
      a: "Khả năng sinh công",
      b: "Khả năng tác dụng lực",
      c: "Khả năng tích điện",
      d: "Khả năng dẫn điện"
    },
    correctAnswer: "a"
  },
  {
    content: "Đơn vị của suất điện động là:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "11",
    difficulty: "EASY",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Ampe (A)",
      b: "Culông (C)",
      c: "Vôn (V)",
      d: "Oát (W)"
    },
    correctAnswer: "c"
  },
  {
    content: "Định luật Ohm cho toàn mạch:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "11",
    difficulty: "MEDIUM",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "I = E/(R + r)",
      b: "I = E/R",
      c: "I = E/r",
      d: "I = (R + r)/E"
    },
    correctAnswer: "a"
  },
  {
    content: "Công suất điện được tính bằng:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "11",
    difficulty: "MEDIUM",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "P = UI",
      b: "P = U/I",
      c: "P = UI²",
      d: "P = U²I"
    },
    correctAnswer: "a"
  },
  {
    content: "Định luật Joule-Lenz cho biết nhiệt lượng tỏa ra:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "11",
    difficulty: "MEDIUM",
    cognitiveLevel: "Thông hiểu",
    status: "Đã duyệt",
    options: {
      a: "Q = RI²t",
      b: "Q = RIt",
      c: "Q = RIt²",
      d: "Q = RI/t"
    },
    correctAnswer: "a"
  },
  {
    content: "Khi đoản mạch, cường độ dòng điện trong mạch:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "11",
    difficulty: "HARD",
    cognitiveLevel: "Vận dụng",
    status: "Đã duyệt",
    options: {
      a: "Bằng 0",
      b: "Rất lớn",
      c: "Bình thường",
      d: "Rất nhỏ"
    },
    correctAnswer: "b"
  },
  {
    content: "Mắc nối tiếp các nguồn điện thì suất điện động của bộ nguồn:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "11",
    difficulty: "MEDIUM",
    cognitiveLevel: "Thông hiểu",
    status: "Đã duyệt",
    options: {
      a: "Bằng suất điện động mỗi nguồn",
      b: "Bằng tổng suất điện động các nguồn",
      c: "Bằng trung bình cộng",
      d: "Bằng hiệu suất điện động"
    },
    correctAnswer: "b"
  },
  {
    content: "Mắc song song các nguồn điện giống nhau thì suất điện động của bộ nguồn:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "11",
    difficulty: "MEDIUM",
    cognitiveLevel: "Thông hiểu",
    status: "Đã duyệt",
    options: {
      a: "Bằng suất điện động mỗi nguồn",
      b: "Bằng tổng suất điện động",
      c: "Bằng n lần suất điện động",
      d: "Bằng 1/n suất điện động"
    },
    correctAnswer: "a"
  },
  {
    content: "Dòng điện trong kim loại là dòng chuyển dời của:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "11",
    difficulty: "EASY",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Ion dương",
      b: "Ion âm",
      c: "Electron tự do",
      d: "Proton"
    },
    correctAnswer: "c"
  },
  {
    content: "Điện trở suất của kim loại phụ thuộc vào:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "11",
    difficulty: "MEDIUM",
    cognitiveLevel: "Thông hiểu",
    status: "Đã duyệt",
    options: {
      a: "Chiều dài",
      b: "Tiết diện",
      c: "Nhiệt độ",
      d: "Hiệu điện thế"
    },
    correctAnswer: "c"
  },
  {
    content: "Hiện tượng siêu dẫn là hiện tượng:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "11",
    difficulty: "HARD",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Điện trở tăng đột ngột",
      b: "Điện trở giảm đột ngột về 0",
      c: "Dòng điện ngừng chạy",
      d: "Nhiệt độ tăng đột ngột"
    },
    correctAnswer: "b"
  },
  {
    content: "Dòng điện trong chất điện phân là dòng chuyển dời của:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "11",
    difficulty: "MEDIUM",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Electron",
      b: "Ion dương và ion âm",
      c: "Proton",
      d: "Neutron"
    },
    correctAnswer: "b"
  },
  {
    content: "Hiện tượng dương cực tan xảy ra khi:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "11",
    difficulty: "HARD",
    cognitiveLevel: "Thông hiểu",
    status: "Đã duyệt",
    options: {
      a: "Điện phân dung dịch muối của kim loại",
      b: "Điện phân dung dịch axit",
      c: "Điện phân dung dịch bazơ",
      d: "Điện phân nước"
    },
    correctAnswer: "a"
  },
  {
    content: "Định luật Faraday thứ nhất:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "11",
    difficulty: "HARD",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "m = kq",
      b: "m = k/q",
      c: "m = q/k",
      d: "m = kq²"
    },
    correctAnswer: "a"
  },
  {
    content: "Dòng điện trong chất khí là dòng chuyển dời của:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "11",
    difficulty: "MEDIUM",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Electron",
      b: "Ion dương, ion âm và electron",
      c: "Chỉ ion dương",
      d: "Chỉ ion âm"
    },
    correctAnswer: "b"
  },
  {
    content: "Hồ quang điện là quá trình:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "11",
    difficulty: "HARD",
    cognitiveLevel: "Thông hiểu",
    status: "Đã duyệt",
    options: {
      a: "Phóng điện tự lực",
      b: "Phóng điện không tự lực",
      c: "Dẫn điện thông thường",
      d: "Cách điện"
    },
    correctAnswer: "a"
  },
  {
    content: "Dòng điện trong chân không là dòng chuyển dời của:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "11",
    difficulty: "HARD",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Ion",
      b: "Electron bứt ra từ catốt",
      c: "Proton",
      d: "Neutron"
    },
    correctAnswer: "b"
  },

  // === VẬT LÝ 12 - DAO ĐỘNG, SÓNG, ĐIỆN TỪ (35 questions) ===
  {
    content: "Dao động điều hòa là dao động có phương trình:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "12",
    difficulty: "EASY",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "x = A sin(ωt + φ)",
      b: "x = A cos(ωt + φ)",
      c: "x = A tan(ωt + φ)",
      d: "x = A sin(ωt + φ) hoặc x = A cos(ωt + φ)"
    },
    correctAnswer: "d"
  },
  {
    content: "Biên độ dao động điều hòa là:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "12",
    difficulty: "EASY",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Giá trị lớn nhất của li độ",
      b: "Giá trị nhỏ nhất của li độ",
      c: "Giá trị trung bình của li độ",
      d: "Tần số dao động"
    },
    correctAnswer: "a"
  },
  {
    content: "Chu kỳ dao động điều hòa là:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "12",
    difficulty: "EASY",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Số dao động trong một giây",
      b: "Thời gian đi hết một vòng",
      c: "Thời gian thực hiện một dao động toàn phần",
      d: "Quãng đường đi được trong một dao động"
    },
    correctAnswer: "c"
  },
  {
    content: "Tần số dao động điều hòa có đơn vị là:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "12",
    difficulty: "EASY",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Giây (s)",
      b: "Hertz (Hz)",
      c: "Rad/s",
      d: "Mét (m)"
    },
    correctAnswer: "b"
  },
  {
    content: "Vận tốc của vật dao động điều hòa có giá trị cực đại tại:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "12",
    difficulty: "MEDIUM",
    cognitiveLevel: "Thông hiểu",
    status: "Đã duyệt",
    options: {
      a: "Vị trí biên",
      b: "Vị trí cân bằng",
      c: "Vị trí bất kỳ",
      d: "Vị trí li độ cực đại"
    },
    correctAnswer: "b"
  },
  {
    content: "Gia tốc của vật dao động điều hòa có giá trị cực đại tại:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "12",
    difficulty: "MEDIUM",
    cognitiveLevel: "Thông hiểu",
    status: "Đã duyệt",
    options: {
      a: "Vị trí cân bằng",
      b: "Vị trí biên",
      c: "Vị trí bất kỳ",
      d: "Vị trí vận tốc cực đại"
    },
    correctAnswer: "b"
  },
  {
    content: "Cơ năng của vật dao động điều hòa:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "12",
    difficulty: "MEDIUM",
    cognitiveLevel: "Thông hiểu",
    status: "Đã duyệt",
    options: {
      a: "Biến thiên tuần hoàn",
      b: "Bảo toàn",
      c: "Giảm dần",
      d: "Tăng dần"
    },
    correctAnswer: "b"
  },
  {
    content: "Con lắc lò xo gồm lò xo có độ cứng k và vật nặng m, chu kỳ được tính:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "12",
    difficulty: "MEDIUM",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "T = 2π√(m/k)",
      b: "T = 2π√(k/m)",
      c: "T = 2π√(l/g)",
      d: "T = 2π√(g/l)"
    },
    correctAnswer: "a"
  },
  {
    content: "Con lắc đơn có chiều dài l, gia tốc trọng trường g, chu kỳ được tính:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "12",
    difficulty: "MEDIUM",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "T = 2π√(l/g)",
      b: "T = 2π√(g/l)",
      c: "T = 2π√(m/k)",
      d: "T = 2π√(k/m)"
    },
    correctAnswer: "a"
  },
  {
    content: "Dao động tắt dần là dao động có:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "12",
    difficulty: "MEDIUM",
    cognitiveLevel: "Thông hiểu",
    status: "Đã duyệt",
    options: {
      a: "Biên độ giảm dần theo thời gian",
      b: "Tần số giảm dần",
      c: "Chu kỳ tăng dần",
      d: "Cơ năng bảo toàn"
    },
    correctAnswer: "a"
  },
  {
    content: "Dao động cưỡng bức là dao động dưới tác dụng của:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "12",
    difficulty: "MEDIUM",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Trọng lực",
      b: "Lực đàn hồi",
      c: "Ngoại lực tuần hoàn",
      d: "Lực ma sát"
    },
    correctAnswer: "c"
  },
  {
    content: "Hiện tượng cộng hưởng xảy ra khi:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "12",
    difficulty: "HARD",
    cognitiveLevel: "Thông hiểu",
    status: "Đã duyệt",
    options: {
      a: "Tần số ngoại lực bằng tần số riêng",
      b: "Tần số ngoại lực lớn hơn tần số riêng",
      c: "Tần số ngoại lực nhỏ hơn tần số riêng",
      d: "Biên độ ngoại lực cực đại"
    },
    correctAnswer: "a"
  },
  {
    content: "Sóng cơ là:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "12",
    difficulty: "EASY",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Dao động lan truyền trong môi trường",
      b: "Chuyển động của vật chất",
      c: "Sự truyền năng lượng",
      d: "Dao động điều hòa"
    },
    correctAnswer: "a"
  },
  {
    content: "Sóng ngang là sóng có phương dao động:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "12",
    difficulty: "MEDIUM",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Vuông góc với phương truyền sóng",
      b: "Trùng với phương truyền sóng",
      c: "Song song với phương truyền sóng",
      d: "Hợp với phương truyền sóng góc 45°"
    },
    correctAnswer: "a"
  },
  {
    content: "Sóng dọc là sóng có phương dao động:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "12",
    difficulty: "MEDIUM",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Vuông góc với phương truyền sóng",
      b: "Trùng với phương truyền sóng",
      c: "Hợp với phương truyền sóng góc 90°",
      d: "Không xác định"
    },
    correctAnswer: "b"
  },
  {
    content: "Bước sóng là:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "12",
    difficulty: "EASY",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Quãng đường sóng truyền trong một chu kỳ",
      b: "Khoảng cách giữa hai đỉnh sóng",
      c: "Biên độ của sóng",
      d: "Tần số của sóng"
    },
    correctAnswer: "a"
  },
  {
    content: "Công thức liên hệ giữa vận tốc, bước sóng và tần số:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "12",
    difficulty: "MEDIUM",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "v = λf",
      b: "v = λ/f",
      c: "v = f/λ",
      d: "v = λ²f"
    },
    correctAnswer: "a"
  },
  {
    content: "Giao thoa sóng xảy ra khi:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "12",
    difficulty: "MEDIUM",
    cognitiveLevel: "Thông hiểu",
    status: "Đã duyệt",
    options: {
      a: "Hai sóng gặp nhau",
      b: "Hai sóng kết hợp gặp nhau",
      c: "Hai sóng cùng biên độ gặp nhau",
      d: "Hai sóng ngược pha gặp nhau"
    },
    correctAnswer: "b"
  },
  {
    content: "Hai sóng kết hợp là hai sóng có:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "12",
    difficulty: "MEDIUM",
    cognitiveLevel: "Thông hiểu",
    status: "Đã duyệt",
    options: {
      a: "Cùng tần số",
      b: "Cùng biên độ",
      c: "Cùng tần số và độ lệch pha không đổi",
      d: "Cùng pha"
    },
    correctAnswer: "c"
  },
  {
    content: "Sóng dừng là sóng:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "12",
    difficulty: "MEDIUM",
    cognitiveLevel: "Thông hiểu",
    status: "Đã duyệt",
    options: {
      a: "Không truyền năng lượng",
      b: "Có các nút và bụng cố định",
      c: "Đứng yên không dao động",
      d: "Truyền với vận tốc 0"
    },
    correctAnswer: "b"
  },
  {
    content: "Khoảng cách giữa hai nút liên tiếp của sóng dừng là:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "12",
    difficulty: "HARD",
    cognitiveLevel: "Thông hiểu",
    status: "Đã duyệt",
    options: {
      a: "λ",
      b: "λ/2",
      c: "λ/4",
      d: "2λ"
    },
    correctAnswer: "b"
  },
  {
    content: "Sóng âm là:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "12",
    difficulty: "EASY",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Sóng ngang",
      b: "Sóng dọc",
      c: "Sóng điện từ",
      d: "Sóng vô tuyến"
    },
    correctAnswer: "b"
  },
  {
    content: "Âm thanh không truyền được trong:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "12",
    difficulty: "EASY",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Chất rắn",
      b: "Chất lỏng",
      c: "Chất khí",
      d: "Chân không"
    },
    correctAnswer: "d"
  },
  {
    content: "Cường độ âm được đo bằng đơn vị:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "12",
    difficulty: "MEDIUM",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Vôn/mét (V/m)",
      b: "Oát/mét vuông (W/m²)",
      c: "Decibel (dB)",
      d: "Hertz (Hz)"
    },
    correctAnswer: "b"
  },
  {
    content: "Mức cường độ âm được đo bằng đơn vị:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "12",
    difficulty: "MEDIUM",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Oát/mét vuông (W/m²)",
      b: "Vôn/mét (V/m)",
      c: "Decibel (dB)",
      d: "Hertz (Hz)"
    },
    correctAnswer: "c"
  },
  {
    content: "Dòng điện xoay chiều là dòng điện có:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "12",
    difficulty: "EASY",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Chiều thay đổi theo thời gian",
      b: "Cường độ thay đổi theo thời gian",
      c: "Chiều và cường độ thay đổi tuần hoàn",
      d: "Chiều không đổi"
    },
    correctAnswer: "c"
  },
  {
    content: "Giá trị hiệu dụng của dòng điện xoay chiều được xác định dựa trên:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "12",
    difficulty: "HARD",
    cognitiveLevel: "Thông hiểu",
    status: "Đã duyệt",
    options: {
      a: "Tác dụng nhiệt",
      b: "Tác dụng từ",
      c: "Tác dụng hóa học",
      d: "Tác dụng sinh lý"
    },
    correctAnswer: "a"
  },
  {
    content: "Trong mạch RLC nối tiếp, khi xảy ra cộng hưởng:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "12",
    difficulty: "HARD",
    cognitiveLevel: "Vận dụng",
    status: "Đã duyệt",
    options: {
      a: "Tổng trở đạt cực đại",
      b: "Tổng trở đạt cực tiểu",
      c: "Dòng điện đạt cực tiểu",
      d: "Điện áp đạt cực tiểu"
    },
    correctAnswer: "b"
  },
  {
    content: "Hệ số công suất của mạch RLC là:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "12",
    difficulty: "HARD",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "cosφ = R/Z",
      b: "cosφ = Z/R",
      c: "cosφ = R/Z²",
      d: "cosφ = Z²/R"
    },
    correctAnswer: "a"
  },
  {
    content: "Máy biến áp dùng để:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "12",
    difficulty: "EASY",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Biến đổi dòng điện không đổi",
      b: "Biến đổi điện áp xoay chiều",
      c: "Tích điện",
      d: "Phát điện"
    },
    correctAnswer: "b"
  },
  {
    content: "Máy phát điện xoay chiều hoạt động dựa trên hiện tượng:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "12",
    difficulty: "MEDIUM",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Cảm ứng điện từ",
      b: "Tự cảm",
      c: "Hưởng ứng tĩnh điện",
      d: "Cộng hưởng"
    },
    correctAnswer: "a"
  },
  {
    content: "Sóng điện từ là:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "12",
    difficulty: "EASY",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Sóng dọc",
      b: "Sóng ngang",
      c: "Sóng âm",
      d: "Sóng cơ"
    },
    correctAnswer: "b"
  },
  {
    content: "Sóng điện từ truyền được trong:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "12",
    difficulty: "EASY",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Chỉ trong chất rắn",
      b: "Chỉ trong chất khí",
      c: "Cả trong chân không",
      d: "Chỉ trong môi trường vật chất"
    },
    correctAnswer: "c"
  },
  {
    content: "Tia hồng ngoại có bước sóng:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "12",
    difficulty: "MEDIUM",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Nhỏ hơn tia tử ngoại",
      b: "Lớn hơn ánh sáng đỏ",
      c: "Nhỏ hơn ánh sáng tím",
      d: "Bằng ánh sáng nhìn thấy"
    },
    correctAnswer: "b"
  },
  {
    content: "Tia X có tính chất nổi bật là:",
    type: "MCQ",
    subject: "Vật lí",
    grade: "12",
    difficulty: "MEDIUM",
    cognitiveLevel: "Nhận biết",
    status: "Đã duyệt",
    options: {
      a: "Tác dụng nhiệt mạnh",
      b: "Khả năng đâm xuyên mạnh",
      c: "Làm phát quang",
      d: "Ion hóa không khí"
    },
    correctAnswer: "b"
  }
];

async function main() {
  console.log('🔬 Seeding Physics Questions...\n');
  
  let created = 0;
  let failed = 0;
  
  for (const question of physicsQuestions) {
    try {
      const response = await fetch('http://localhost:3100/api/question-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...question,
          options: question.options,
          correctAnswer: question.correctAnswer,
        }),
      });
      
      if (response.ok) {
        created++;
        console.log(`✅ [${question.grade}] ${question.content.substring(0, 50)}...`);
      } else {
        failed++;
        const error = await response.json();
        console.log(`❌ Failed: ${question.content.substring(0, 50)}... - ${error.error}`);
      }
    } catch (error: any) {
      failed++;
      console.log(`❌ Error: ${question.content.substring(0, 50)}... - ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 SEED SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total: ${physicsQuestions.length} questions`);
  console.log(`Created: ${created}`);
  console.log(`Failed: ${failed}`);
  console.log('='.repeat(60));
  
  if (created === physicsQuestions.length) {
    console.log('\n🎉 All questions seeded successfully!');
  }
}

main().catch(console.error);
