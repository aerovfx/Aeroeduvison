export interface Question {
  term: string;
  definition: string;
  options: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
  }>;
}

// Toán học - Tập hợp và mệnh đề
const toanHocQuestions: { [key: string]: Question[] } = {
  "toan-hoc-10-1": [
    {
      term: "Tập hợp là gì?",
      definition: "Một nhóm các đối tượng có chung tính chất hoặc đặc điểm",
      options: [
        { id: "1", text: "Một nhóm các đối tượng có chung tính chất", isCorrect: true },
        { id: "2", text: "Một số nguyên dương", isCorrect: false },
        { id: "3", text: "Một phương trình", isCorrect: false },
        { id: "4", text: "Một hàm số", isCorrect: false }
      ]
    },
    {
      term: "Ký hiệu ∈ có nghĩa là gì?",
      definition: "Ký hiệu 'thuộc về' trong lý thuyết tập hợp",
      options: [
        { id: "1", text: "Không thuộc về", isCorrect: false },
        { id: "2", text: "Thuộc về", isCorrect: true },
        { id: "3", text: "Bằng nhau", isCorrect: false },
        { id: "4", text: "Khác nhau", isCorrect: false }
      ]
    },
    {
      term: "Tập hợp rỗng được ký hiệu như thế nào?",
      definition: "Tập hợp không chứa phần tử nào",
      options: [
        { id: "1", text: "∅ hoặc {}", isCorrect: true },
        { id: "2", text: "0", isCorrect: false },
        { id: "3", text: "∞", isCorrect: false },
        { id: "4", text: "∃", isCorrect: false }
      ]
    },
    {
      term: "Mệnh đề là gì?",
      definition: "Một câu khẳng định có thể xác định được tính đúng sai",
      options: [
        { id: "1", text: "Một câu hỏi", isCorrect: false },
        { id: "2", text: "Một câu khẳng định có thể xác định được tính đúng sai", isCorrect: true },
        { id: "3", text: "Một biểu thức", isCorrect: false },
        { id: "4", text: "Một tập hợp", isCorrect: false }
      ]
    },
    {
      term: "Phủ định của mệnh đề P được ký hiệu là gì?",
      definition: "Mệnh đề ngược lại với mệnh đề gốc",
      options: [
        { id: "1", text: "¬P hoặc P̄", isCorrect: true },
        { id: "2", text: "P²", isCorrect: false },
        { id: "3", text: "P⁻¹", isCorrect: false },
        { id: "4", text: "P*", isCorrect: false }
      ]
    },
    {
      term: "Giao của hai tập hợp A và B là gì?",
      definition: "Tập hợp chứa các phần tử chung của A và B",
      options: [
        { id: "1", text: "Tập hợp chứa tất cả phần tử của A và B", isCorrect: false },
        { id: "2", text: "Tập hợp chứa các phần tử chung của A và B", isCorrect: true },
        { id: "3", text: "Tập hợp chứa các phần tử chỉ thuộc A", isCorrect: false },
        { id: "4", text: "Tập hợp chứa các phần tử chỉ thuộc B", isCorrect: false }
      ]
    },
    {
      term: "Hợp của hai tập hợp A và B được ký hiệu là gì?",
      definition: "Tập hợp chứa tất cả phần tử của A và B",
      options: [
        { id: "1", text: "A ∩ B", isCorrect: false },
        { id: "2", text: "A ∪ B", isCorrect: true },
        { id: "3", text: "A - B", isCorrect: false },
        { id: "4", text: "A × B", isCorrect: false }
      ]
    },
    {
      term: "Tập con của A được ký hiệu như thế nào?",
      definition: "Tập hợp B chứa trong tập hợp A",
      options: [
        { id: "1", text: "B ⊂ A", isCorrect: true },
        { id: "2", text: "B ∈ A", isCorrect: false },
        { id: "3", text: "B = A", isCorrect: false },
        { id: "4", text: "B ∩ A", isCorrect: false }
      ]
    },
    {
      term: "Mệnh đề 'Nếu P thì Q' được ký hiệu là gì?",
      definition: "Mệnh đề kéo theo trong logic",
      options: [
        { id: "1", text: "P ∧ Q", isCorrect: false },
        { id: "2", text: "P ∨ Q", isCorrect: false },
        { id: "3", text: "P → Q", isCorrect: true },
        { id: "4", text: "P ↔ Q", isCorrect: false }
      ]
    },
    {
      term: "Tập hợp các số tự nhiên được ký hiệu là gì?",
      definition: "Tập hợp {0, 1, 2, 3, ...}",
      options: [
        { id: "1", text: "ℕ", isCorrect: true },
        { id: "2", text: "ℤ", isCorrect: false },
        { id: "3", text: "ℚ", isCorrect: false },
        { id: "4", text: "ℝ", isCorrect: false }
      ]
    }
  ],

  // Toán học - Hàm số bậc nhất
  "toan-hoc-10-2": [
    {
      term: "Hàm số bậc nhất có dạng như thế nào?",
      definition: "Hàm số có dạng y = ax + b với a ≠ 0",
      options: [
        { id: "1", text: "y = ax² + bx + c", isCorrect: false },
        { id: "2", text: "y = ax + b (a ≠ 0)", isCorrect: true },
        { id: "3", text: "y = x³", isCorrect: false },
        { id: "4", text: "y = sin x", isCorrect: false }
      ]
    },
    {
      term: "Đồ thị của hàm số bậc nhất là gì?",
      definition: "Một đường thẳng không song song với trục Oy",
      options: [
        { id: "1", text: "Một đường cong", isCorrect: false },
        { id: "2", text: "Một đường thẳng", isCorrect: true },
        { id: "3", text: "Một parabol", isCorrect: false },
        { id: "4", text: "Một đường tròn", isCorrect: false }
      ]
    },
    {
      term: "Hệ số góc của đường thẳng y = 2x + 3 là gì?",
      definition: "Hệ số a trong phương trình y = ax + b",
      options: [
        { id: "1", text: "2", isCorrect: true },
        { id: "2", text: "3", isCorrect: false },
        { id: "3", text: "5", isCorrect: false },
        { id: "4", text: "6", isCorrect: false }
      ]
    },
    {
      term: "Điểm cắt trục tung của y = -x + 4 là gì?",
      definition: "Điểm có hoành độ x = 0",
      options: [
        { id: "1", text: "(0, 4)", isCorrect: true },
        { id: "2", text: "(4, 0)", isCorrect: false },
        { id: "3", text: "(0, -4)", isCorrect: false },
        { id: "4", text: "(-4, 0)", isCorrect: false }
      ]
    },
    {
      term: "Hai đường thẳng song song khi nào?",
      definition: "Khi chúng có cùng hệ số góc nhưng khác tung độ gốc",
      options: [
        { id: "1", text: "Có cùng hệ số góc", isCorrect: true },
        { id: "2", text: "Có cùng tung độ gốc", isCorrect: false },
        { id: "3", text: "Có cùng hoành độ gốc", isCorrect: false },
        { id: "4", text: "Có cùng điểm cắt", isCorrect: false }
      ]
    },
    {
      term: "Hàm số y = 3x - 1 đồng biến hay nghịch biến?",
      definition: "Phụ thuộc vào dấu của hệ số a",
      options: [
        { id: "1", text: "Đồng biến", isCorrect: true },
        { id: "2", text: "Nghịch biến", isCorrect: false },
        { id: "3", text: "Không đổi", isCorrect: false },
        { id: "4", text: "Không xác định", isCorrect: false }
      ]
    },
    {
      term: "Điểm cắt trục hoành của y = 2x - 6 là gì?",
      definition: "Điểm có tung độ y = 0",
      options: [
        { id: "1", text: "(3, 0)", isCorrect: true },
        { id: "2", text: "(0, 3)", isCorrect: false },
        { id: "3", text: "(6, 0)", isCorrect: false },
        { id: "4", text: "(0, 6)", isCorrect: false }
      ]
    },
    {
      term: "Hàm số y = -2x + 5 có giá trị lớn nhất tại đâu?",
      definition: "Hàm số bậc nhất không có giá trị lớn nhất",
      options: [
        { id: "1", text: "Không có giá trị lớn nhất", isCorrect: true },
        { id: "2", text: "Tại x = 0", isCorrect: false },
        { id: "3", text: "Tại x = 5", isCorrect: false },
        { id: "4", text: "Tại x = -2", isCorrect: false }
      ]
    },
    {
      term: "Phương trình đường thẳng đi qua điểm (1, 2) và có hệ số góc 3 là gì?",
      definition: "Sử dụng công thức y - y₁ = a(x - x₁)",
      options: [
        { id: "1", text: "y = 3x - 1", isCorrect: true },
        { id: "2", text: "y = 3x + 2", isCorrect: false },
        { id: "3", text: "y = x + 3", isCorrect: false },
        { id: "4", text: "y = 2x + 3", isCorrect: false }
      ]
    },
    {
      term: "Hai đường thẳng y = 2x + 1 và y = 2x - 3 có vị trí như thế nào?",
      definition: "Cùng hệ số góc nhưng khác tung độ gốc",
      options: [
        { id: "1", text: "Song song", isCorrect: true },
        { id: "2", text: "Cắt nhau", isCorrect: false },
        { id: "3", text: "Trùng nhau", isCorrect: false },
        { id: "4", text: "Vuông góc", isCorrect: false }
      ]
    }
  ],

  // Toán học - Ứng dụng đạo hàm
  "toan-hoc-12-2": [
    {
      term: "Đạo hàm của hàm số f(x) = x³ tại x = 2 là gì?",
      definition: "Sử dụng công thức đạo hàm của xⁿ",
      options: [
        { id: "1", text: "12", isCorrect: true },
        { id: "2", text: "8", isCorrect: false },
        { id: "3", text: "6", isCorrect: false },
        { id: "4", text: "4", isCorrect: false }
      ]
    },
    {
      term: "Hàm số f(x) = x² - 4x + 3 có điểm cực trị tại x = ?",
      definition: "Tìm điểm mà f'(x) = 0",
      options: [
        { id: "1", text: "x = 2", isCorrect: true },
        { id: "2", text: "x = 0", isCorrect: false },
        { id: "3", text: "x = 4", isCorrect: false },
        { id: "4", text: "x = -2", isCorrect: false }
      ]
    },
    {
      term: "Đạo hàm của sin(x) là gì?",
      definition: "Công thức đạo hàm của hàm lượng giác",
      options: [
        { id: "1", text: "cos(x)", isCorrect: true },
        { id: "2", text: "-sin(x)", isCorrect: false },
        { id: "3", text: "tan(x)", isCorrect: false },
        { id: "4", text: "sec(x)", isCorrect: false }
      ]
    },
    {
      term: "Hàm số f(x) = eˣ có đạo hàm là gì?",
      definition: "Đạo hàm của hàm số mũ",
      options: [
        { id: "1", text: "eˣ", isCorrect: true },
        { id: "2", text: "xeˣ", isCorrect: false },
        { id: "3", text: "ln(x)", isCorrect: false },
        { id: "4", text: "1/x", isCorrect: false }
      ]
    },
    {
      term: "Quy tắc đạo hàm của tích (uv)' = ?",
      definition: "Quy tắc đạo hàm của tích hai hàm số",
      options: [
        { id: "1", text: "u'v + uv'", isCorrect: true },
        { id: "2", text: "u'v - uv'", isCorrect: false },
        { id: "3", text: "u'v'", isCorrect: false },
        { id: "4", text: "uv", isCorrect: false }
      ]
    },
    {
      term: "Đạo hàm của ln(x) là gì?",
      definition: "Đạo hàm của hàm logarit tự nhiên",
      options: [
        { id: "1", text: "1/x", isCorrect: true },
        { id: "2", text: "x", isCorrect: false },
        { id: "3", text: "eˣ", isCorrect: false },
        { id: "4", text: "1", isCorrect: false }
      ]
    },
    {
      term: "Hàm số f(x) = x⁴ - 2x² có bao nhiêu điểm cực trị?",
      definition: "Tìm số nghiệm của f'(x) = 0",
      options: [
        { id: "1", text: "3 điểm", isCorrect: true },
        { id: "2", text: "2 điểm", isCorrect: false },
        { id: "3", text: "1 điểm", isCorrect: false },
        { id: "4", text: "0 điểm", isCorrect: false }
      ]
    },
    {
      term: "Đạo hàm của cos(x) là gì?",
      definition: "Công thức đạo hàm của hàm lượng giác",
      options: [
        { id: "1", text: "-sin(x)", isCorrect: true },
        { id: "2", text: "sin(x)", isCorrect: false },
        { id: "3", text: "cos(x)", isCorrect: false },
        { id: "4", text: "-cos(x)", isCorrect: false }
      ]
    },
    {
      term: "Quy tắc đạo hàm của thương (u/v)' = ?",
      definition: "Quy tắc đạo hàm của thương hai hàm số",
      options: [
        { id: "1", text: "(u'v - uv')/v²", isCorrect: true },
        { id: "2", text: "(u'v + uv')/v²", isCorrect: false },
        { id: "3", text: "u'/v'", isCorrect: false },
        { id: "4", text: "u/v", isCorrect: false }
      ]
    },
    {
      term: "Hàm số f(x) = x³ - 3x có điểm cực đại tại x = ?",
      definition: "Tìm điểm cực đại bằng cách xét dấu f''(x)",
      options: [
        { id: "1", text: "x = -1", isCorrect: true },
        { id: "2", text: "x = 1", isCorrect: false },
        { id: "3", text: "x = 0", isCorrect: false },
        { id: "4", text: "x = 3", isCorrect: false }
      ]
    }
  ],

  // Toán học - Tích phân
  "toan-hoc-12-4": [
    {
      term: "Tích phân xác định ∫[a,b] f(x)dx có ý nghĩa gì?",
      definition: "Diện tích giới hạn bởi đồ thị hàm số f(x) và trục Ox từ a đến b",
      options: [
        { id: "1", text: "Diện tích giới hạn bởi đồ thị hàm số f(x) và trục Ox từ a đến b", isCorrect: true },
        { id: "2", text: "Đạo hàm của hàm số f(x)", isCorrect: false },
        { id: "3", text: "Giá trị của hàm số tại điểm x", isCorrect: false },
        { id: "4", text: "Nghiệm của phương trình f(x) = 0", isCorrect: false }
      ]
    },
    {
      term: "Nguyên hàm của x² là gì?",
      definition: "Sử dụng công thức ∫xⁿdx = xⁿ⁺¹/(n+1) + C",
      options: [
        { id: "1", text: "x³/3 + C", isCorrect: true },
        { id: "2", text: "x² + C", isCorrect: false },
        { id: "3", text: "2x + C", isCorrect: false },
        { id: "4", text: "x³ + C", isCorrect: false }
      ]
    },
    {
      term: "Tích phân ∫[0,1] x²dx bằng bao nhiêu?",
      definition: "Tính tích phân xác định từ 0 đến 1",
      options: [
        { id: "1", text: "1/3", isCorrect: true },
        { id: "2", text: "1/2", isCorrect: false },
        { id: "3", text: "1", isCorrect: false },
        { id: "4", text: "2/3", isCorrect: false }
      ]
    },
    {
      term: "Nguyên hàm của eˣ là gì?",
      definition: "Đạo hàm của eˣ chính là eˣ",
      options: [
        { id: "1", text: "eˣ + C", isCorrect: true },
        { id: "2", text: "xeˣ + C", isCorrect: false },
        { id: "3", text: "ln(x) + C", isCorrect: false },
        { id: "4", text: "1/x + C", isCorrect: false }
      ]
    },
    {
      term: "Nguyên hàm của 1/x là gì?",
      definition: "Công thức tích phân của 1/x",
      options: [
        { id: "1", text: "ln|x| + C", isCorrect: true },
        { id: "2", text: "x + C", isCorrect: false },
        { id: "3", text: "1/x² + C", isCorrect: false },
        { id: "4", text: "x²/2 + C", isCorrect: false }
      ]
    },
    {
      term: "Tích phân ∫[0,π] sin(x)dx bằng bao nhiêu?",
      definition: "Tích phân của sin(x) từ 0 đến π",
      options: [
        { id: "1", text: "2", isCorrect: true },
        { id: "2", text: "0", isCorrect: false },
        { id: "3", text: "1", isCorrect: false },
        { id: "4", text: "π", isCorrect: false }
      ]
    },
    {
      term: "Nguyên hàm của cos(x) là gì?",
      definition: "Tích phân của hàm lượng giác cos(x)",
      options: [
        { id: "1", text: "sin(x) + C", isCorrect: true },
        { id: "2", text: "-sin(x) + C", isCorrect: false },
        { id: "3", text: "cos(x) + C", isCorrect: false },
        { id: "4", text: "-cos(x) + C", isCorrect: false }
      ]
    },
    {
      term: "Tích phân ∫[1,2] (2x + 1)dx bằng bao nhiêu?",
      definition: "Tích phân của đa thức bậc nhất",
      options: [
        { id: "1", text: "4", isCorrect: true },
        { id: "2", text: "3", isCorrect: false },
        { id: "3", text: "5", isCorrect: false },
        { id: "4", text: "6", isCorrect: false }
      ]
    },
    {
      term: "Nguyên hàm của xⁿ (n ≠ -1) là gì?",
      definition: "Công thức tích phân cơ bản",
      options: [
        { id: "1", text: "xⁿ⁺¹/(n+1) + C", isCorrect: true },
        { id: "2", text: "nxⁿ⁻¹ + C", isCorrect: false },
        { id: "3", text: "xⁿ + C", isCorrect: false },
        { id: "4", text: "n!xⁿ + C", isCorrect: false }
      ]
    },
    {
      term: "Tích phân ∫[0,1] eˣdx bằng bao nhiêu?",
      definition: "Tích phân của hàm số mũ",
      options: [
        { id: "1", text: "e - 1", isCorrect: true },
        { id: "2", text: "e", isCorrect: false },
        { id: "3", text: "1", isCorrect: false },
        { id: "4", text: "e + 1", isCorrect: false }
      ]
    }
  ],

  // Toán học - Hàm số bậc hai
  "toan-hoc-10-3": [
    {
      term: "Hàm số bậc hai có dạng như thế nào?",
      definition: "Hàm số có dạng y = ax² + bx + c với a ≠ 0",
      options: [
        { id: "1", text: "y = ax + b", isCorrect: false },
        { id: "2", text: "y = ax² + bx + c (a ≠ 0)", isCorrect: true },
        { id: "3", text: "y = x³", isCorrect: false },
        { id: "4", text: "y = sin x", isCorrect: false }
      ]
    },
    {
      term: "Đồ thị của hàm số bậc hai được gọi là gì?",
      definition: "Một đường cong có hình dạng đặc biệt",
      options: [
        { id: "1", text: "Đường thẳng", isCorrect: false },
        { id: "2", text: "Parabol", isCorrect: true },
        { id: "3", text: "Đường tròn", isCorrect: false },
        { id: "4", text: "Elip", isCorrect: false }
      ]
    },
    {
      term: "Đỉnh của parabol y = x² - 4x + 3 có tọa độ là gì?",
      definition: "Sử dụng công thức x = -b/2a",
      options: [
        { id: "1", text: "(2, -1)", isCorrect: true },
        { id: "2", text: "(-2, 1)", isCorrect: false },
        { id: "3", text: "(4, 3)", isCorrect: false },
        { id: "4", text: "(0, 3)", isCorrect: false }
      ]
    },
    {
      term: "Parabol y = -x² + 2x - 1 có hướng như thế nào?",
      definition: "Phụ thuộc vào dấu của hệ số a",
      options: [
        { id: "1", text: "Quay xuống dưới", isCorrect: true },
        { id: "2", text: "Quay lên trên", isCorrect: false },
        { id: "3", text: "Nằm ngang", isCorrect: false },
        { id: "4", text: "Thẳng đứng", isCorrect: false }
      ]
    },
    {
      term: "Trục đối xứng của parabol y = 2x² - 8x + 6 là đường thẳng nào?",
      definition: "Đường thẳng x = -b/2a",
      options: [
        { id: "1", text: "x = 2", isCorrect: true },
        { id: "2", text: "x = -2", isCorrect: false },
        { id: "3", text: "x = 4", isCorrect: false },
        { id: "4", text: "x = -4", isCorrect: false }
      ]
    },
    {
      term: "Giá trị nhỏ nhất của hàm số y = x² - 6x + 10 là gì?",
      definition: "Giá trị tại đỉnh của parabol",
      options: [
        { id: "1", text: "1", isCorrect: true },
        { id: "2", text: "10", isCorrect: false },
        { id: "3", text: "0", isCorrect: false },
        { id: "4", text: "6", isCorrect: false }
      ]
    },
    {
      term: "Parabol y = x² - 4 cắt trục hoành tại những điểm nào?",
      definition: "Giải phương trình x² - 4 = 0",
      options: [
        { id: "1", text: "(-2, 0) và (2, 0)", isCorrect: true },
        { id: "2", text: "(0, -4)", isCorrect: false },
        { id: "3", text: "(4, 0)", isCorrect: false },
        { id: "4", text: "(-4, 0)", isCorrect: false }
      ]
    },
    {
      term: "Hàm số y = -2x² + 4x - 1 có giá trị lớn nhất là gì?",
      definition: "Giá trị tại đỉnh của parabol quay xuống",
      options: [
        { id: "1", text: "1", isCorrect: true },
        { id: "2", text: "-1", isCorrect: false },
        { id: "3", text: "4", isCorrect: false },
        { id: "4", text: "0", isCorrect: false }
      ]
    },
    {
      term: "Parabol y = 3x² - 12x + 9 có đỉnh tại đâu?",
      definition: "Tính tọa độ đỉnh bằng công thức",
      options: [
        { id: "1", text: "(2, -3)", isCorrect: true },
        { id: "2", text: "(-2, 3)", isCorrect: false },
        { id: "3", text: "(3, 9)", isCorrect: false },
        { id: "4", text: "(0, 9)", isCorrect: false }
      ]
    },
    {
      term: "Hàm số y = x² + 2x + 1 có thể viết dưới dạng gì?",
      definition: "Dạng bình phương của một tổng",
      options: [
        { id: "1", text: "y = (x + 1)²", isCorrect: true },
        { id: "2", text: "y = (x - 1)²", isCorrect: false },
        { id: "3", text: "y = x² + 1", isCorrect: false },
        { id: "4", text: "y = (x + 2)²", isCorrect: false }
      ]
    }
  ],

  // Toán học - Phương trình bậc nhất
  "toan-hoc-10-4": [
    {
      term: "Phương trình bậc nhất có dạng như thế nào?",
      definition: "Phương trình có dạng ax + b = 0 với a ≠ 0",
      options: [
        { id: "1", text: "ax + b = 0 (a ≠ 0)", isCorrect: true },
        { id: "2", text: "ax² + bx + c = 0", isCorrect: false },
        { id: "3", text: "x³ + 1 = 0", isCorrect: false },
        { id: "4", text: "sin x = 0", isCorrect: false }
      ]
    },
    {
      term: "Nghiệm của phương trình 2x - 6 = 0 là gì?",
      definition: "Giải phương trình bậc nhất",
      options: [
        { id: "1", text: "x = 3", isCorrect: true },
        { id: "2", text: "x = -3", isCorrect: false },
        { id: "3", text: "x = 6", isCorrect: false },
        { id: "4", text: "x = -6", isCorrect: false }
      ]
    },
    {
      term: "Công thức nghiệm tổng quát của ax + b = 0 là gì?",
      definition: "Công thức giải phương trình bậc nhất",
      options: [
        { id: "1", text: "x = -b/a", isCorrect: true },
        { id: "2", text: "x = b/a", isCorrect: false },
        { id: "3", text: "x = -a/b", isCorrect: false },
        { id: "4", text: "x = a/b", isCorrect: false }
      ]
    },
    {
      term: "Phương trình 0x + 5 = 0 có bao nhiêu nghiệm?",
      definition: "Khi a = 0 và b ≠ 0",
      options: [
        { id: "1", text: "Vô nghiệm", isCorrect: true },
        { id: "2", text: "1 nghiệm", isCorrect: false },
        { id: "3", text: "Vô số nghiệm", isCorrect: false },
        { id: "4", text: "2 nghiệm", isCorrect: false }
      ]
    },
    {
      term: "Phương trình 0x + 0 = 0 có bao nhiêu nghiệm?",
      definition: "Khi a = 0 và b = 0",
      options: [
        { id: "1", text: "Vô số nghiệm", isCorrect: true },
        { id: "2", text: "1 nghiệm", isCorrect: false },
        { id: "3", text: "Vô nghiệm", isCorrect: false },
        { id: "4", text: "2 nghiệm", isCorrect: false }
      ]
    },
    {
      term: "Nghiệm của phương trình -3x + 9 = 0 là gì?",
      definition: "Giải phương trình với hệ số âm",
      options: [
        { id: "1", text: "x = 3", isCorrect: true },
        { id: "2", text: "x = -3", isCorrect: false },
        { id: "3", text: "x = 9", isCorrect: false },
        { id: "4", text: "x = -9", isCorrect: false }
      ]
    },
    {
      term: "Phương trình 4x - 8 = 0 có nghiệm là gì?",
      definition: "Giải phương trình bậc nhất đơn giản",
      options: [
        { id: "1", text: "x = 2", isCorrect: true },
        { id: "2", text: "x = -2", isCorrect: false },
        { id: "3", text: "x = 4", isCorrect: false },
        { id: "4", text: "x = 8", isCorrect: false }
      ]
    },
    {
      term: "Để kiểm tra nghiệm, ta thay giá trị vào đâu?",
      definition: "Phương pháp kiểm tra nghiệm",
      options: [
        { id: "1", text: "Vào phương trình gốc", isCorrect: true },
        { id: "2", text: "Vào đạo hàm", isCorrect: false },
        { id: "3", text: "Vào tích phân", isCorrect: false },
        { id: "4", text: "Vào logarit", isCorrect: false }
      ]
    },
    {
      term: "Phương trình x/2 + 1 = 0 có nghiệm là gì?",
      definition: "Giải phương trình có phân số",
      options: [
        { id: "1", text: "x = -2", isCorrect: true },
        { id: "2", text: "x = 2", isCorrect: false },
        { id: "3", text: "x = -1", isCorrect: false },
        { id: "4", text: "x = 1", isCorrect: false }
      ]
    },
    {
      term: "Phương trình 5x = 15 có nghiệm là gì?",
      definition: "Phương trình bậc nhất không có hằng số",
      options: [
        { id: "1", text: "x = 3", isCorrect: true },
        { id: "2", text: "x = -3", isCorrect: false },
        { id: "3", text: "x = 5", isCorrect: false },
        { id: "4", text: "x = 15", isCorrect: false }
      ]
    }
  ],

  // Toán học - Phương trình bậc hai
  "toan-hoc-10-5": [
    {
      term: "Phương trình bậc hai có dạng như thế nào?",
      definition: "Phương trình có dạng ax² + bx + c = 0 với a ≠ 0",
      options: [
        { id: "1", text: "ax + b = 0", isCorrect: false },
        { id: "2", text: "ax² + bx + c = 0 (a ≠ 0)", isCorrect: true },
        { id: "3", text: "x³ + 1 = 0", isCorrect: false },
        { id: "4", text: "sin x = 0", isCorrect: false }
      ]
    },
    {
      term: "Công thức nghiệm của phương trình bậc hai là gì?",
      definition: "Công thức nghiệm tổng quát",
      options: [
        { id: "1", text: "x = (-b ± √(b² - 4ac))/2a", isCorrect: true },
        { id: "2", text: "x = (-b ± √(b² + 4ac))/2a", isCorrect: false },
        { id: "3", text: "x = (b ± √(b² - 4ac))/2a", isCorrect: false },
        { id: "4", text: "x = (-b ± √(4ac - b²))/2a", isCorrect: false }
      ]
    },
    {
      term: "Biệt thức Δ = b² - 4ac dùng để làm gì?",
      definition: "Xác định số nghiệm của phương trình",
      options: [
        { id: "1", text: "Xác định số nghiệm của phương trình", isCorrect: true },
        { id: "2", text: "Tính giá trị của x", isCorrect: false },
        { id: "3", text: "Tìm đỉnh parabol", isCorrect: false },
        { id: "4", text: "Tính diện tích", isCorrect: false }
      ]
    },
    {
      term: "Khi Δ > 0, phương trình có bao nhiêu nghiệm?",
      definition: "Trường hợp biệt thức dương",
      options: [
        { id: "1", text: "2 nghiệm phân biệt", isCorrect: true },
        { id: "2", text: "1 nghiệm kép", isCorrect: false },
        { id: "3", text: "Vô nghiệm", isCorrect: false },
        { id: "4", text: "Vô số nghiệm", isCorrect: false }
      ]
    },
    {
      term: "Khi Δ = 0, phương trình có bao nhiêu nghiệm?",
      definition: "Trường hợp biệt thức bằng 0",
      options: [
        { id: "1", text: "1 nghiệm kép", isCorrect: true },
        { id: "2", text: "2 nghiệm phân biệt", isCorrect: false },
        { id: "3", text: "Vô nghiệm", isCorrect: false },
        { id: "4", text: "Vô số nghiệm", isCorrect: false }
      ]
    },
    {
      term: "Khi Δ < 0, phương trình có bao nhiêu nghiệm?",
      definition: "Trường hợp biệt thức âm",
      options: [
        { id: "1", text: "Vô nghiệm", isCorrect: true },
        { id: "2", text: "2 nghiệm phân biệt", isCorrect: false },
        { id: "3", text: "1 nghiệm kép", isCorrect: false },
        { id: "4", text: "Vô số nghiệm", isCorrect: false }
      ]
    },
    {
      term: "Nghiệm của phương trình x² - 5x + 6 = 0 là gì?",
      definition: "Giải phương trình bậc hai",
      options: [
        { id: "1", text: "x = 2 và x = 3", isCorrect: true },
        { id: "2", text: "x = -2 và x = -3", isCorrect: false },
        { id: "3", text: "x = 1 và x = 6", isCorrect: false },
        { id: "4", text: "x = -1 và x = -6", isCorrect: false }
      ]
    },
    {
      term: "Định lý Vi-ét phát biểu như thế nào?",
      definition: "Mối quan hệ giữa nghiệm và hệ số",
      options: [
        { id: "1", text: "x₁ + x₂ = -b/a và x₁x₂ = c/a", isCorrect: true },
        { id: "2", text: "x₁ + x₂ = b/a và x₁x₂ = c/a", isCorrect: false },
        { id: "3", text: "x₁ + x₂ = -b/a và x₁x₂ = -c/a", isCorrect: false },
        { id: "4", text: "x₁ + x₂ = b/a và x₁x₂ = -c/a", isCorrect: false }
      ]
    },
    {
      term: "Phương trình x² - 4 = 0 có nghiệm là gì?",
      definition: "Phương trình bậc hai đơn giản",
      options: [
        { id: "1", text: "x = 2 và x = -2", isCorrect: true },
        { id: "2", text: "x = 4 và x = -4", isCorrect: false },
        { id: "3", text: "x = 0", isCorrect: false },
        { id: "4", text: "x = 1 và x = -1", isCorrect: false }
      ]
    },
    {
      term: "Phương trình 2x² - 8x + 6 = 0 có nghiệm là gì?",
      definition: "Giải phương trình bậc hai với hệ số a ≠ 1",
      options: [
        { id: "1", text: "x = 1 và x = 3", isCorrect: true },
        { id: "2", text: "x = -1 và x = -3", isCorrect: false },
        { id: "3", text: "x = 2 và x = 4", isCorrect: false },
        { id: "4", text: "x = -2 và x = -4", isCorrect: false }
      ]
    }
  ],

  // Toán học - Lượng giác cơ bản
  "toan-hoc-11-1": [
    { term: "Sin của góc 30° bằng bao nhiêu?", definition: "Giá trị lượng giác cơ bản", options: [
      { id: "1", text: "1/2", isCorrect: true }, { id: "2", text: "√3/2", isCorrect: false }, { id: "3", text: "1", isCorrect: false }, { id: "4", text: "0", isCorrect: false }]},
    { term: "Cos của góc 60° bằng bao nhiêu?", definition: "Giá trị lượng giác cơ bản", options: [
      { id: "1", text: "1/2", isCorrect: true }, { id: "2", text: "√3/2", isCorrect: false }, { id: "3", text: "1", isCorrect: false }, { id: "4", text: "0", isCorrect: false }]},
    { term: "Tan của góc 45° bằng bao nhiêu?", definition: "Giá trị lượng giác cơ bản", options: [
      { id: "1", text: "1", isCorrect: true }, { id: "2", text: "√3", isCorrect: false }, { id: "3", text: "1/√3", isCorrect: false }, { id: "4", text: "0", isCorrect: false }]},
    { term: "Công thức sin²x + cos²x = ?", definition: "Đồng nhất thức lượng giác cơ bản", options: [
      { id: "1", text: "1", isCorrect: true }, { id: "2", text: "0", isCorrect: false }, { id: "3", text: "sin x", isCorrect: false }, { id: "4", text: "cos x", isCorrect: false }]},
    { term: "Sin(90° - x) = ?", definition: "Công thức góc phụ", options: [
      { id: "1", text: "cos x", isCorrect: true }, { id: "2", text: "sin x", isCorrect: false }, { id: "3", text: "tan x", isCorrect: false }, { id: "4", text: "cot x", isCorrect: false }]},
    { term: "Cos(90° - x) = ?", definition: "Công thức góc phụ", options: [
      { id: "1", text: "sin x", isCorrect: true }, { id: "2", text: "cos x", isCorrect: false }, { id: "3", text: "tan x", isCorrect: false }, { id: "4", text: "cot x", isCorrect: false }]},
    { term: "Sin(-x) = ?", definition: "Tính chất hàm lẻ", options: [
      { id: "1", text: "-sin x", isCorrect: true }, { id: "2", text: "sin x", isCorrect: false }, { id: "3", text: "cos x", isCorrect: false }, { id: "4", text: "-cos x", isCorrect: false }]},
    { term: "Cos(-x) = ?", definition: "Tính chất hàm chẵn", options: [
      { id: "1", text: "cos x", isCorrect: true }, { id: "2", text: "-cos x", isCorrect: false }, { id: "3", text: "sin x", isCorrect: false }, { id: "4", text: "-sin x", isCorrect: false }]},
    { term: "Tan x = ?", definition: "Định nghĩa tan", options: [
      { id: "1", text: "sin x / cos x", isCorrect: true }, { id: "2", text: "cos x / sin x", isCorrect: false }, { id: "3", text: "1 / sin x", isCorrect: false }, { id: "4", text: "1 / cos x", isCorrect: false }]},
    { term: "Cot x = ?", definition: "Định nghĩa cot", options: [
      { id: "1", text: "cos x / sin x", isCorrect: true }, { id: "2", text: "sin x / cos x", isCorrect: false }, { id: "3", text: "1 / sin x", isCorrect: false }, { id: "4", text: "1 / cos x", isCorrect: false }]}
  ],

  // Toán học - Tổ hợp và xác suất
  "toan-hoc-11-2": [
    { term: "Hoán vị của n phần tử là gì?", definition: "Sắp xếp thứ tự n phần tử", options: [
      { id: "1", text: "n!", isCorrect: true }, { id: "2", text: "n", isCorrect: false }, { id: "3", text: "2ⁿ", isCorrect: false }, { id: "4", text: "n²", isCorrect: false }]},
    { term: "Chỉnh hợp chập k của n là gì?", definition: "Công thức chỉnh hợp", options: [
      { id: "1", text: "n!/(n-k)!", isCorrect: true }, { id: "2", text: "n!/k!", isCorrect: false }, { id: "3", text: "n!/k!(n-k)!", isCorrect: false }, { id: "4", text: "k!/n!", isCorrect: false }]},
    { term: "Tổ hợp chập k của n là gì?", definition: "Công thức tổ hợp", options: [
      { id: "1", text: "n!/k!(n-k)!", isCorrect: true }, { id: "2", text: "n!/(n-k)!", isCorrect: false }, { id: "3", text: "n!/k!", isCorrect: false }, { id: "4", text: "k!/n!", isCorrect: false }]},
    { term: "Xác suất của biến cố A là gì?", definition: "Định nghĩa xác suất", options: [
      { id: "1", text: "P(A) = n(A)/n(Ω)", isCorrect: true }, { id: "2", text: "P(A) = n(Ω)/n(A)", isCorrect: false }, { id: "3", text: "P(A) = n(A)", isCorrect: false }, { id: "4", text: "P(A) = n(Ω)", isCorrect: false }]},
    { term: "Xác suất của biến cố chắc chắn bằng bao nhiêu?", definition: "Biến cố chắc chắn", options: [
      { id: "1", text: "1", isCorrect: true }, { id: "2", text: "0", isCorrect: false }, { id: "3", text: "0.5", isCorrect: false }, { id: "4", text: "2", isCorrect: false }]},
    { term: "Xác suất của biến cố không thể bằng bao nhiêu?", definition: "Biến cố không thể", options: [
      { id: "1", text: "0", isCorrect: true }, { id: "2", text: "1", isCorrect: false }, { id: "3", text: "0.5", isCorrect: false }, { id: "4", text: "-1", isCorrect: false }]},
    { term: "P(A ∪ B) = ?", definition: "Công thức xác suất hợp", options: [
      { id: "1", text: "P(A) + P(B) - P(A ∩ B)", isCorrect: true }, { id: "2", text: "P(A) + P(B)", isCorrect: false }, { id: "3", text: "P(A) × P(B)", isCorrect: false }, { id: "4", text: "P(A) - P(B)", isCorrect: false }]},
    { term: "P(A ∩ B) = P(A) × P(B) khi nào?", definition: "Biến cố độc lập", options: [
      { id: "1", text: "A và B độc lập", isCorrect: true }, { id: "2", text: "A và B xung khắc", isCorrect: false }, { id: "3", text: "A = B", isCorrect: false }, { id: "4", text: "A ⊂ B", isCorrect: false }]},
    { term: "Có bao nhiêu cách chọn 2 người từ 5 người?", definition: "Tổ hợp chập 2 của 5", options: [
      { id: "1", text: "10", isCorrect: true }, { id: "2", text: "20", isCorrect: false }, { id: "3", text: "5", isCorrect: false }, { id: "4", text: "25", isCorrect: false }]},
    { term: "Có bao nhiêu cách xếp 3 người vào 3 ghế?", definition: "Hoán vị 3 phần tử", options: [
      { id: "1", text: "6", isCorrect: true }, { id: "2", text: "3", isCorrect: false }, { id: "3", text: "9", isCorrect: false }, { id: "4", text: "1", isCorrect: false }]}
  ],

  // Toán học - Dãy số và cấp số
  "toan-hoc-11-3": [
    { term: "Cấp số cộng có công thức tổng quát là gì?", definition: "uₙ = u₁ + (n-1)d", options: [
      { id: "1", text: "uₙ = u₁ + (n-1)d", isCorrect: true }, { id: "2", text: "uₙ = u₁ × rⁿ⁻¹", isCorrect: false }, { id: "3", text: "uₙ = u₁ + n", isCorrect: false }, { id: "4", text: "uₙ = u₁ × n", isCorrect: false }]},
    { term: "Cấp số nhân có công thức tổng quát là gì?", definition: "uₙ = u₁ × rⁿ⁻¹", options: [
      { id: "1", text: "uₙ = u₁ × rⁿ⁻¹", isCorrect: true }, { id: "2", text: "uₙ = u₁ + (n-1)d", isCorrect: false }, { id: "3", text: "uₙ = u₁ + n", isCorrect: false }, { id: "4", text: "uₙ = u₁ × n", isCorrect: false }]},
    { term: "Tổng n số hạng đầu của cấp số cộng là gì?", definition: "Sₙ = n(u₁ + uₙ)/2", options: [
      { id: "1", text: "Sₙ = n(u₁ + uₙ)/2", isCorrect: true }, { id: "2", text: "Sₙ = u₁(1-rⁿ)/(1-r)", isCorrect: false }, { id: "3", text: "Sₙ = u₁ + uₙ", isCorrect: false }, { id: "4", text: "Sₙ = n × u₁", isCorrect: false }]},
    { term: "Tổng n số hạng đầu của cấp số nhân là gì?", definition: "Sₙ = u₁(1-rⁿ)/(1-r)", options: [
      { id: "1", text: "Sₙ = u₁(1-rⁿ)/(1-r)", isCorrect: true }, { id: "2", text: "Sₙ = n(u₁ + uₙ)/2", isCorrect: false }, { id: "3", text: "Sₙ = u₁ + uₙ", isCorrect: false }, { id: "4", text: "Sₙ = n × u₁", isCorrect: false }]},
    { term: "Dãy số 2, 5, 8, 11, ... có công sai là gì?", definition: "Công sai d = 3", options: [
      { id: "1", text: "d = 3", isCorrect: true }, { id: "2", text: "d = 2", isCorrect: false }, { id: "3", text: "d = 5", isCorrect: false }, { id: "4", text: "d = 1", isCorrect: false }]},
    { term: "Dãy số 3, 6, 12, 24, ... có công bội là gì?", definition: "Công bội r = 2", options: [
      { id: "1", text: "r = 2", isCorrect: true }, { id: "2", text: "r = 3", isCorrect: false }, { id: "3", text: "r = 6", isCorrect: false }, { id: "4", text: "r = 1", isCorrect: false }]},
    { term: "Số hạng thứ 10 của cấp số cộng u₁=1, d=2 là gì?", definition: "u₁₀ = 1 + 9×2 = 19", options: [
      { id: "1", text: "19", isCorrect: true }, { id: "2", text: "20", isCorrect: false }, { id: "3", text: "18", isCorrect: false }, { id: "4", text: "21", isCorrect: false }]},
    { term: "Số hạng thứ 5 của cấp số nhân u₁=2, r=3 là gì?", definition: "u₅ = 2×3⁴ = 162", options: [
      { id: "1", text: "162", isCorrect: true }, { id: "2", text: "54", isCorrect: false }, { id: "3", text: "18", isCorrect: false }, { id: "4", text: "6", isCorrect: false }]},
    { term: "Tổng 10 số hạng đầu của cấp số cộng u₁=1, d=1 là gì?", definition: "S₁₀ = 10(1+10)/2 = 55", options: [
      { id: "1", text: "55", isCorrect: true }, { id: "2", text: "50", isCorrect: false }, { id: "3", text: "60", isCorrect: false }, { id: "4", text: "45", isCorrect: false }]},
    { term: "Tổng vô hạn của cấp số nhân khi |r|<1 là gì?", definition: "S = u₁/(1-r)", options: [
      { id: "1", text: "S = u₁/(1-r)", isCorrect: true }, { id: "2", text: "S = u₁(1-rⁿ)/(1-r)", isCorrect: false }, { id: "3", text: "S = u₁ + uₙ", isCorrect: false }, { id: "4", text: "S = n × u₁", isCorrect: false }]}
  ],

  // Toán học - Giới hạn hàm số
  "toan-hoc-11-4": [
    { term: "lim(x→0) sin(x)/x = ?", definition: "Giới hạn lượng giác cơ bản", options: [
      { id: "1", text: "1", isCorrect: true }, { id: "2", text: "0", isCorrect: false }, { id: "3", text: "∞", isCorrect: false }, { id: "4", text: "Không tồn tại", isCorrect: false }]},
    { term: "lim(x→∞) 1/x = ?", definition: "Giới hạn tại vô cực", options: [
      { id: "1", text: "0", isCorrect: true }, { id: "2", text: "1", isCorrect: false }, { id: "3", text: "∞", isCorrect: false }, { id: "4", text: "Không tồn tại", isCorrect: false }]},
    { term: "lim(x→0) (1-cos(x))/x² = ?", definition: "Giới hạn lượng giác", options: [
      { id: "1", text: "1/2", isCorrect: true }, { id: "2", text: "0", isCorrect: false }, { id: "3", text: "1", isCorrect: false }, { id: "4", text: "∞", isCorrect: false }]},
    { term: "lim(x→0) (eˣ-1)/x = ?", definition: "Giới hạn hàm số mũ", options: [
      { id: "1", text: "1", isCorrect: true }, { id: "2", text: "0", isCorrect: false }, { id: "3", text: "e", isCorrect: false }, { id: "4", text: "∞", isCorrect: false }]},
    { term: "lim(x→∞) x²/(x+1) = ?", definition: "Giới hạn phân thức", options: [
      { id: "1", text: "∞", isCorrect: true }, { id: "2", text: "0", isCorrect: false }, { id: "3", text: "1", isCorrect: false }, { id: "4", text: "Không tồn tại", isCorrect: false }]},
    { term: "lim(x→2) (x²-4)/(x-2) = ?", definition: "Giới hạn dạng 0/0", options: [
      { id: "1", text: "4", isCorrect: true }, { id: "2", text: "0", isCorrect: false }, { id: "3", text: "2", isCorrect: false }, { id: "4", text: "∞", isCorrect: false }]},
    { term: "lim(x→0) ln(1+x)/x = ?", definition: "Giới hạn hàm logarit", options: [
      { id: "1", text: "1", isCorrect: true }, { id: "2", text: "0", isCorrect: false }, { id: "3", text: "e", isCorrect: false }, { id: "4", text: "∞", isCorrect: false }]},
    { term: "lim(x→∞) (2x+1)/(x-3) = ?", definition: "Giới hạn phân thức bậc nhất", options: [
      { id: "1", text: "2", isCorrect: true }, { id: "2", text: "0", isCorrect: false }, { id: "3", text: "∞", isCorrect: false }, { id: "4", text: "1", isCorrect: false }]},
    { term: "lim(x→0) (1+x)¹/ˣ = ?", definition: "Giới hạn quan trọng", options: [
      { id: "1", text: "e", isCorrect: true }, { id: "2", text: "1", isCorrect: false }, { id: "3", text: "0", isCorrect: false }, { id: "4", text: "∞", isCorrect: false }]},
    { term: "lim(x→π/2) tan(x) = ?", definition: "Giới hạn tại điểm không xác định", options: [
      { id: "1", text: "∞", isCorrect: true }, { id: "2", text: "0", isCorrect: false }, { id: "3", text: "1", isCorrect: false }, { id: "4", text: "Không tồn tại", isCorrect: false }]}
  ],

  // Toán học - Đạo hàm
  "toan-hoc-12-1": [
    { term: "Đạo hàm của x³ là gì?", definition: "Sử dụng quy tắc đạo hàm", options: [
      { id: "1", text: "3x²", isCorrect: true }, { id: "2", text: "x²", isCorrect: false }, { id: "3", text: "3x", isCorrect: false }, { id: "4", text: "x³", isCorrect: false }]},
    { term: "Đạo hàm của sin(x) là gì?", definition: "Đạo hàm hàm lượng giác", options: [
      { id: "1", text: "cos(x)", isCorrect: true }, { id: "2", text: "-sin(x)", isCorrect: false }, { id: "3", text: "tan(x)", isCorrect: false }, { id: "4", text: "sec(x)", isCorrect: false }]},
    { term: "Đạo hàm của eˣ là gì?", definition: "Đạo hàm hàm số mũ", options: [
      { id: "1", text: "eˣ", isCorrect: true }, { id: "2", text: "xeˣ", isCorrect: false }, { id: "3", text: "ln(x)", isCorrect: false }, { id: "4", text: "1/x", isCorrect: false }]},
    { term: "Đạo hàm của ln(x) là gì?", definition: "Đạo hàm hàm logarit", options: [
      { id: "1", text: "1/x", isCorrect: true }, { id: "2", text: "x", isCorrect: false }, { id: "3", text: "eˣ", isCorrect: false }, { id: "4", text: "1", isCorrect: false }]},
    { term: "Đạo hàm của (x²+1)³ là gì?", definition: "Quy tắc chuỗi", options: [
      { id: "1", text: "6x(x²+1)²", isCorrect: true }, { id: "2", text: "3(x²+1)²", isCorrect: false }, { id: "3", text: "6x²(x²+1)", isCorrect: false }, { id: "4", text: "3x(x²+1)²", isCorrect: false }]},
    { term: "Đạo hàm của x·sin(x) là gì?", definition: "Quy tắc tích", options: [
      { id: "1", text: "sin(x) + x·cos(x)", isCorrect: true }, { id: "2", text: "x·cos(x)", isCorrect: false }, { id: "3", text: "sin(x)", isCorrect: false }, { id: "4", text: "cos(x)", isCorrect: false }]},
    { term: "Đạo hàm của x/sin(x) là gì?", definition: "Quy tắc thương", options: [
      { id: "1", text: "(sin(x) - x·cos(x))/sin²(x)", isCorrect: true }, { id: "2", text: "1/cos(x)", isCorrect: false }, { id: "3", text: "x/cos(x)", isCorrect: false }, { id: "4", text: "1/sin(x)", isCorrect: false }]},
    { term: "Đạo hàm của √(x²+1) là gì?", definition: "Đạo hàm hàm căn", options: [
      { id: "1", text: "x/√(x²+1)", isCorrect: true }, { id: "2", text: "1/√(x²+1)", isCorrect: false }, { id: "3", text: "2x/√(x²+1)", isCorrect: false }, { id: "4", text: "x²/√(x²+1)", isCorrect: false }]},
    { term: "Đạo hàm của cos(x) là gì?", definition: "Đạo hàm hàm lượng giác", options: [
      { id: "1", text: "-sin(x)", isCorrect: true }, { id: "2", text: "sin(x)", isCorrect: false }, { id: "3", text: "cos(x)", isCorrect: false }, { id: "4", text: "-cos(x)", isCorrect: false }]},
    { term: "Đạo hàm của tan(x) là gì?", definition: "Đạo hàm hàm lượng giác", options: [
      { id: "1", text: "sec²(x)", isCorrect: true }, { id: "2", text: "cos²(x)", isCorrect: false }, { id: "3", text: "sin²(x)", isCorrect: false }, { id: "4", text: "1/cos²(x)", isCorrect: false }]}
  ],

  // Toán học - Nguyên hàm
  "toan-hoc-12-3": [
    { term: "Nguyên hàm của x² là gì?", definition: "Sử dụng công thức tích phân", options: [
      { id: "1", text: "x³/3 + C", isCorrect: true }, { id: "2", text: "x² + C", isCorrect: false }, { id: "3", text: "2x + C", isCorrect: false }, { id: "4", text: "x³ + C", isCorrect: false }]},
    { term: "Nguyên hàm của 1/x là gì?", definition: "Tích phân hàm phân thức", options: [
      { id: "1", text: "ln|x| + C", isCorrect: true }, { id: "2", text: "x + C", isCorrect: false }, { id: "3", text: "1/x² + C", isCorrect: false }, { id: "4", text: "x²/2 + C", isCorrect: false }]},
    { term: "Nguyên hàm của eˣ là gì?", definition: "Tích phân hàm số mũ", options: [
      { id: "1", text: "eˣ + C", isCorrect: true }, { id: "2", text: "xeˣ + C", isCorrect: false }, { id: "3", text: "ln(x) + C", isCorrect: false }, { id: "4", text: "1/x + C", isCorrect: false }]},
    { term: "Nguyên hàm của sin(x) là gì?", definition: "Tích phân hàm lượng giác", options: [
      { id: "1", text: "-cos(x) + C", isCorrect: true }, { id: "2", text: "cos(x) + C", isCorrect: false }, { id: "3", text: "sin(x) + C", isCorrect: false }, { id: "4", text: "-sin(x) + C", isCorrect: false }]},
    { term: "Nguyên hàm của cos(x) là gì?", definition: "Tích phân hàm lượng giác", options: [
      { id: "1", text: "sin(x) + C", isCorrect: true }, { id: "2", text: "-sin(x) + C", isCorrect: false }, { id: "3", text: "cos(x) + C", isCorrect: false }, { id: "4", text: "-cos(x) + C", isCorrect: false }]},
    { term: "Nguyên hàm của 1/(x²+1) là gì?", definition: "Tích phân hàm phân thức", options: [
      { id: "1", text: "arctan(x) + C", isCorrect: true }, { id: "2", text: "ln(x²+1) + C", isCorrect: false }, { id: "3", text: "x/(x²+1) + C", isCorrect: false }, { id: "4", text: "1/(x²+1) + C", isCorrect: false }]},
    { term: "Nguyên hàm của 1/√(1-x²) là gì?", definition: "Tích phân hàm căn", options: [
      { id: "1", text: "arcsin(x) + C", isCorrect: true }, { id: "2", text: "arccos(x) + C", isCorrect: false }, { id: "3", text: "arctan(x) + C", isCorrect: false }, { id: "4", text: "ln(1-x²) + C", isCorrect: false }]},
    { term: "Nguyên hàm của x·eˣ là gì?", definition: "Tích phân từng phần", options: [
      { id: "1", text: "eˣ(x-1) + C", isCorrect: true }, { id: "2", text: "xeˣ + C", isCorrect: false }, { id: "3", text: "eˣ + C", isCorrect: false }, { id: "4", text: "x²eˣ/2 + C", isCorrect: false }]},
    { term: "Nguyên hàm của x·sin(x) là gì?", definition: "Tích phân từng phần", options: [
      { id: "1", text: "sin(x) - x·cos(x) + C", isCorrect: true }, { id: "2", text: "x·sin(x) + C", isCorrect: false }, { id: "3", text: "cos(x) + C", isCorrect: false }, { id: "4", text: "x·cos(x) + C", isCorrect: false }]},
    { term: "Nguyên hàm của 1/(x²-1) là gì?", definition: "Tích phân phân thức", options: [
      { id: "1", text: "(1/2)ln|(x-1)/(x+1)| + C", isCorrect: true }, { id: "2", text: "ln|x²-1| + C", isCorrect: false }, { id: "3", text: "1/(x²-1) + C", isCorrect: false }, { id: "4", text: "x/(x²-1) + C", isCorrect: false }]}
  ],

  // Toán học - Số phức
  "toan-hoc-12-5": [
    { term: "Số phức z = a + bi có phần thực là gì?", definition: "Phần thực của số phức", options: [
      { id: "1", text: "a", isCorrect: true }, { id: "2", text: "b", isCorrect: false }, { id: "3", text: "i", isCorrect: false }, { id: "4", text: "a + b", isCorrect: false }]},
    { term: "Số phức z = a + bi có phần ảo là gì?", definition: "Phần ảo của số phức", options: [
      { id: "1", text: "b", isCorrect: true }, { id: "2", text: "a", isCorrect: false }, { id: "3", text: "i", isCorrect: false }, { id: "4", text: "a + b", isCorrect: false }]},
    { term: "Mô đun của số phức z = a + bi là gì?", definition: "|z| = √(a² + b²)", options: [
      { id: "1", text: "√(a² + b²)", isCorrect: true }, { id: "2", text: "a² + b²", isCorrect: false }, { id: "3", text: "a + b", isCorrect: false }, { id: "4", text: "|a| + |b|", isCorrect: false }]},
    { term: "Số phức liên hợp của z = a + bi là gì?", definition: "z̄ = a - bi", options: [
      { id: "1", text: "a - bi", isCorrect: true }, { id: "2", text: "a + bi", isCorrect: false }, { id: "3", text: "-a + bi", isCorrect: false }, { id: "4", text: "-a - bi", isCorrect: false }]},
    { term: "i² = ?", definition: "Định nghĩa đơn vị ảo", options: [
      { id: "1", text: "-1", isCorrect: true }, { id: "2", text: "1", isCorrect: false }, { id: "3", text: "i", isCorrect: false }, { id: "4", text: "0", isCorrect: false }]},
    { term: "i³ = ?", definition: "Lũy thừa của i", options: [
      { id: "1", text: "-i", isCorrect: true }, { id: "2", text: "i", isCorrect: false }, { id: "3", text: "1", isCorrect: false }, { id: "4", text: "-1", isCorrect: false }]},
    { term: "i⁴ = ?", definition: "Lũy thừa của i", options: [
      { id: "1", text: "1", isCorrect: true }, { id: "2", text: "i", isCorrect: false }, { id: "3", text: "-1", isCorrect: false }, { id: "4", text: "-i", isCorrect: false }]},
    { term: "(2+3i) + (1-2i) = ?", definition: "Cộng số phức", options: [
      { id: "1", text: "3 + i", isCorrect: true }, { id: "2", text: "3 - i", isCorrect: false }, { id: "3", text: "1 + 5i", isCorrect: false }, { id: "4", text: "1 - 5i", isCorrect: false }]},
    { term: "(2+3i) × (1-2i) = ?", definition: "Nhân số phức", options: [
      { id: "1", text: "8 - i", isCorrect: true }, { id: "2", text: "8 + i", isCorrect: false }, { id: "3", text: "-4 + 7i", isCorrect: false }, { id: "4", text: "-4 - 7i", isCorrect: false }]},
    { term: "Nghiệm của phương trình z² + 1 = 0 là gì?", definition: "Phương trình bậc hai với số phức", options: [
      { id: "1", text: "z = ±i", isCorrect: true }, { id: "2", text: "z = ±1", isCorrect: false }, { id: "3", text: "z = 0", isCorrect: false }, { id: "4", text: "Vô nghiệm", isCorrect: false }]}
  ],

  // Toán học - Khối đa diện
  "toan-hoc-12-6": [
    { term: "Thể tích khối chóp có công thức là gì?", definition: "V = (1/3) × Sđáy × h", options: [
      { id: "1", text: "V = (1/3) × Sđáy × h", isCorrect: true }, { id: "2", text: "V = Sđáy × h", isCorrect: false }, { id: "3", text: "V = (1/2) × Sđáy × h", isCorrect: false }, { id: "4", text: "V = 2 × Sđáy × h", isCorrect: false }]},
    { term: "Thể tích khối lăng trụ có công thức là gì?", definition: "V = Sđáy × h", options: [
      { id: "1", text: "V = Sđáy × h", isCorrect: true }, { id: "2", text: "V = (1/3) × Sđáy × h", isCorrect: false }, { id: "3", text: "V = (1/2) × Sđáy × h", isCorrect: false }, { id: "4", text: "V = 2 × Sđáy × h", isCorrect: false }]},
    { term: "Thể tích khối lập phương cạnh a là gì?", definition: "V = a³", options: [
      { id: "1", text: "a³", isCorrect: true }, { id: "2", text: "a²", isCorrect: false }, { id: "3", text: "3a²", isCorrect: false }, { id: "4", text: "6a²", isCorrect: false }]},
    { term: "Thể tích khối hộp chữ nhật có kích thước a×b×c là gì?", definition: "V = abc", options: [
      { id: "1", text: "abc", isCorrect: true }, { id: "2", text: "a + b + c", isCorrect: false }, { id: "3", text: "2(ab + bc + ca)", isCorrect: false }, { id: "4", text: "a² + b² + c²", isCorrect: false }]},
    { term: "Diện tích xung quanh khối lập phương cạnh a là gì?", definition: "Sxq = 4a²", options: [
      { id: "1", text: "4a²", isCorrect: true }, { id: "2", text: "6a²", isCorrect: false }, { id: "3", text: "a²", isCorrect: false }, { id: "4", text: "2a²", isCorrect: false }]},
    { term: "Diện tích toàn phần khối lập phương cạnh a là gì?", definition: "Stp = 6a²", options: [
      { id: "1", text: "6a²", isCorrect: true }, { id: "2", text: "4a²", isCorrect: false }, { id: "3", text: "a²", isCorrect: false }, { id: "4", text: "2a²", isCorrect: false }]},
    { term: "Thể tích khối chóp tứ giác đều cạnh đáy a, chiều cao h là gì?", definition: "V = (1/3) × a² × h", options: [
      { id: "1", text: "(1/3) × a² × h", isCorrect: true }, { id: "2", text: "a² × h", isCorrect: false }, { id: "3", text: "(1/2) × a² × h", isCorrect: false }, { id: "4", text: "2 × a² × h", isCorrect: false }]},
    { term: "Thể tích khối lăng trụ tam giác đều cạnh đáy a, chiều cao h là gì?", definition: "V = (√3/4) × a² × h", options: [
      { id: "1", text: "(√3/4) × a² × h", isCorrect: true }, { id: "2", text: "a² × h", isCorrect: false }, { id: "3", text: "(1/2) × a² × h", isCorrect: false }, { id: "4", text: "√3 × a² × h", isCorrect: false }]},
    { term: "Thể tích khối cầu bán kính R là gì?", definition: "V = (4/3)πR³", options: [
      { id: "1", text: "(4/3)πR³", isCorrect: true }, { id: "2", text: "πR²", isCorrect: false }, { id: "3", text: "4πR²", isCorrect: false }, { id: "4", text: "πR³", isCorrect: false }]},
    { term: "Diện tích mặt cầu bán kính R là gì?", definition: "S = 4πR²", options: [
      { id: "1", text: "4πR²", isCorrect: true }, { id: "2", text: "πR²", isCorrect: false }, { id: "3", text: "(4/3)πR³", isCorrect: false }, { id: "4", text: "2πR²", isCorrect: false }]}
  ]
};

// Vật lý - Cơ học
const vatLyQuestions: { [key: string]: Question[] } = {
  "vat-ly-10-1": [
    {
      term: "Định luật Newton thứ nhất phát biểu như thế nào?",
      definition: "Định luật quán tính",
      options: [
        { id: "1", text: "Một vật sẽ giữ nguyên trạng thái chuyển động nếu không có lực tác dụng", isCorrect: true },
        { id: "2", text: "F = ma", isCorrect: false },
        { id: "3", text: "Lực tác dụng và phản lực có độ lớn bằng nhau", isCorrect: false },
        { id: "4", text: "Công bằng tích của lực và quãng đường", isCorrect: false }
      ]
    },
    {
      term: "Công thức tính lực là gì?",
      definition: "Định luật Newton thứ hai",
      options: [
        { id: "1", text: "F = ma", isCorrect: true },
        { id: "2", text: "F = mv", isCorrect: false },
        { id: "3", text: "F = mg", isCorrect: false },
        { id: "4", text: "F = mgh", isCorrect: false }
      ]
    },
    {
      term: "Đơn vị đo lực trong hệ SI là gì?",
      definition: "Đơn vị cơ bản của lực",
      options: [
        { id: "1", text: "Newton (N)", isCorrect: true },
        { id: "2", text: "Joule (J)", isCorrect: false },
        { id: "3", text: "Watt (W)", isCorrect: false },
        { id: "4", text: "Pascal (Pa)", isCorrect: false }
      ]
    }
  ],
  "vat-ly-10-2": [
    {
      term: "Nhiệt độ sôi của nước ở điều kiện tiêu chuẩn là bao nhiêu?",
      definition: "Nhiệt độ sôi của nước",
      options: [
        { id: "1", text: "100°C", isCorrect: true },
        { id: "2", text: "0°C", isCorrect: false },
        { id: "3", text: "273°C", isCorrect: false },
        { id: "4", text: "373°C", isCorrect: false }
      ]
    }
  ]
};

// Hóa học
const hoaHocQuestions: { [key: string]: Question[] } = {
  "hoa-hoc-10-1": [
    {
      term: "Nguyên tử được cấu tạo bởi những hạt nào?",
      definition: "Cấu tạo cơ bản của nguyên tử",
      options: [
        { id: "1", text: "Proton, neutron, electron", isCorrect: true },
        { id: "2", text: "Chỉ có proton và electron", isCorrect: false },
        { id: "3", text: "Chỉ có neutron và electron", isCorrect: false },
        { id: "4", text: "Chỉ có proton và neutron", isCorrect: false }
      ]
    }
  ]
};

// Sinh học
const sinhHocQuestions: { [key: string]: Question[] } = {
  "sinh-hoc-10-1": [
    {
      term: "Tế bào là gì?",
      definition: "Đơn vị cơ bản của sự sống",
      options: [
        { id: "1", text: "Đơn vị cơ bản của sự sống", isCorrect: true },
        { id: "2", text: "Đơn vị cơ bản của chất", isCorrect: false },
        { id: "3", text: "Đơn vị cơ bản của năng lượng", isCorrect: false },
        { id: "4", text: "Đơn vị cơ bản của thời gian", isCorrect: false }
      ]
    }
  ]
};

// Python
const pythonQuestions: { [key: string]: Question[] } = {
  "python-1": [
    {
      term: "Python là ngôn ngữ lập trình gì?",
      definition: "Loại ngôn ngữ lập trình",
      options: [
        { id: "1", text: "Ngôn ngữ lập trình bậc cao, thông dịch", isCorrect: true },
        { id: "2", text: "Ngôn ngữ lập trình bậc thấp", isCorrect: false },
        { id: "3", text: "Ngôn ngữ đánh dấu", isCorrect: false },
        { id: "4", text: "Ngôn ngữ cơ sở dữ liệu", isCorrect: false }
      ]
    }
  ]
};

// Hàm randomize array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Hàm randomize options trong câu hỏi
function randomizeQuestionOptions(question: Question): Question {
  const shuffledOptions = shuffleArray(question.options);
  return {
    ...question,
    options: shuffledOptions
  };
}

// Hàm lấy câu hỏi theo lesson ID với random
export function getQuestionsForLesson(lessonId: string, randomize: boolean = true): Question[] {
  let questions: Question[] = [];
  
  // Lấy câu hỏi từ các môn
  if (lessonId.startsWith('toan-hoc-')) {
    questions = toanHocQuestions[lessonId] || [];
  } else if (lessonId.startsWith('vat-ly-')) {
    questions = vatLyQuestions[lessonId] || [];
  } else if (lessonId.startsWith('hoa-hoc-')) {
    questions = hoaHocQuestions[lessonId] || [];
  } else if (lessonId.startsWith('sinh-hoc-')) {
    questions = sinhHocQuestions[lessonId] || [];
  } else if (lessonId.startsWith('python-')) {
    questions = pythonQuestions[lessonId] || [];
  }
  
  if (randomize && questions.length > 0) {
    // Randomize thứ tự câu hỏi
    questions = shuffleArray(questions);
    // Randomize thứ tự đáp án trong mỗi câu hỏi
    questions = questions.map(randomizeQuestionOptions);
  }
  
  return questions;
}

// Hàm lấy tất cả lesson IDs
export function getAllLessonIds(): string[] {
  return [
    ...Object.keys(toanHocQuestions),
    ...Object.keys(vatLyQuestions),
    ...Object.keys(hoaHocQuestions),
    ...Object.keys(sinhHocQuestions),
    ...Object.keys(pythonQuestions)
  ];
}
