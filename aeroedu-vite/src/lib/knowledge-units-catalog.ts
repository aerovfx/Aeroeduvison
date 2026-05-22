/**
 * Knowledge Units Catalog — danh mục đơn vị kiến thức chuẩn Bộ GD&ĐT 2018
 *
 * Hierarchy 4 cấp:
 *   Subject (môn)
 *     → Grade (khối)
 *       → Chapter (chương)
 *         → Lesson (bài)
 *           → Knowledge Unit (đơn vị KT)
 *
 * Code naming convention (để machine-readable):
 *   <SUBJECT>-G<GRADE>-CH<CHAPTER>-B<LESSON>[-DV<UNIT>]
 *   VD: VL-G11-CH1-B1-DV1 = Vật lý lớp 11, chương 1, bài 1, đơn vị KT 1
 *
 * Dùng cho:
 *   1. Form input GV pick từ dropdown thay vì gõ tay → consistent metadata
 *   2. Filter trong question bank
 *   3. AI tagging tự động khi import LaTeX/PDF
 *   4. Matrix đề (random theo đơn vị KT)
 *
 * Để thêm môn mới hoặc cập nhật: chỉ sửa file này, không sửa component.
 */

export interface KnowledgeUnit {
  code: string       // VD: "VL-G11-CH1-B1-DV1"
  label: string      // VD: "Đại lượng vô hướng vs vector"
  bloom?: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create'
}

export interface Lesson {
  code: string       // VD: "VL-G11-CH1-B1"
  label: string      // VD: "Bài 1: Đại cương về dòng điện không đổi"
  units?: KnowledgeUnit[]
}

export interface Chapter {
  code: string       // VD: "VL-G11-CH1"
  label: string      // VD: "Chương 1: Điện học"
  lessons: Lesson[]
}

export interface GradeCatalog {
  grade: number      // 10, 11, 12
  chapters: Chapter[]
}

export interface SubjectCatalog {
  subject: string    // VD: "Vật lý"
  code: string       // VD: "VL"
  grades: GradeCatalog[]
}

/* ────────────────────────────────────────────────────────────
 * VẬT LÝ (chuẩn 2018 — sách Cánh diều / Kết nối tri thức)
 * ────────────────────────────────────────────────────────── */
const VATLY: SubjectCatalog = {
  subject: 'Vật lý',
  code: 'VL',
  grades: [
    {
      grade: 10,
      chapters: [
        {
          code: 'VL-G10-CH1', label: 'Chương 1: Mở đầu',
          lessons: [
            { code: 'VL-G10-CH1-B1', label: 'Bài 1: Làm quen với Vật lí',
              units: [
                { code: 'VL-G10-CH1-B1-DV1', label: 'Đối tượng nghiên cứu', bloom: 'remember' },
                { code: 'VL-G10-CH1-B1-DV2', label: 'Phương pháp thực nghiệm', bloom: 'understand' },
              ] },
            { code: 'VL-G10-CH1-B2', label: 'Bài 2: Vấn đề an toàn trong Vật lí' },
          ]
        },
        {
          code: 'VL-G10-CH2', label: 'Chương 2: Động học',
          lessons: [
            { code: 'VL-G10-CH2-B1', label: 'Bài 1: Tốc độ và vận tốc',
              units: [
                { code: 'VL-G10-CH2-B1-DV1', label: 'Tốc độ trung bình', bloom: 'understand' },
                { code: 'VL-G10-CH2-B1-DV2', label: 'Vận tốc tức thời', bloom: 'understand' },
                { code: 'VL-G10-CH2-B1-DV3', label: 'Đồ thị độ dịch chuyển - thời gian', bloom: 'apply' },
              ] },
            { code: 'VL-G10-CH2-B2', label: 'Bài 2: Chuyển động thẳng đều' },
            { code: 'VL-G10-CH2-B3', label: 'Bài 3: Chuyển động biến đổi đều',
              units: [
                { code: 'VL-G10-CH2-B3-DV1', label: 'Gia tốc', bloom: 'understand' },
                { code: 'VL-G10-CH2-B3-DV2', label: 'Công thức chuyển động thẳng biến đổi đều', bloom: 'apply' },
                { code: 'VL-G10-CH2-B3-DV3', label: 'Rơi tự do', bloom: 'apply' },
              ] },
          ]
        },
        {
          code: 'VL-G10-CH3', label: 'Chương 3: Động lực học',
          lessons: [
            { code: 'VL-G10-CH3-B1', label: 'Bài 1: Tổng hợp và phân tích lực' },
            { code: 'VL-G10-CH3-B2', label: 'Bài 2: Ba định luật Newton',
              units: [
                { code: 'VL-G10-CH3-B2-DV1', label: 'Định luật I Newton (quán tính)', bloom: 'understand' },
                { code: 'VL-G10-CH3-B2-DV2', label: 'Định luật II Newton (F=ma)', bloom: 'apply' },
                { code: 'VL-G10-CH3-B2-DV3', label: 'Định luật III Newton', bloom: 'understand' },
              ] },
            { code: 'VL-G10-CH3-B3', label: 'Bài 3: Trọng lực và lực căng' },
            { code: 'VL-G10-CH3-B4', label: 'Bài 4: Lực ma sát' },
            { code: 'VL-G10-CH3-B5', label: 'Bài 5: Lực hướng tâm và chuyển động tròn' },
          ]
        },
        {
          code: 'VL-G10-CH4', label: 'Chương 4: Năng lượng - Công - Công suất',
          lessons: [
            { code: 'VL-G10-CH4-B1', label: 'Bài 1: Năng lượng và công cơ học' },
            { code: 'VL-G10-CH4-B2', label: 'Bài 2: Công suất - Hiệu suất' },
            { code: 'VL-G10-CH4-B3', label: 'Bài 3: Động năng - Thế năng - Cơ năng',
              units: [
                { code: 'VL-G10-CH4-B3-DV1', label: 'Động năng', bloom: 'apply' },
                { code: 'VL-G10-CH4-B3-DV2', label: 'Thế năng trọng trường', bloom: 'apply' },
                { code: 'VL-G10-CH4-B3-DV3', label: 'Bảo toàn cơ năng', bloom: 'apply' },
              ] },
          ]
        },
        {
          code: 'VL-G10-CH5', label: 'Chương 5: Động lượng',
          lessons: [
            { code: 'VL-G10-CH5-B1', label: 'Bài 1: Động lượng và bảo toàn động lượng' },
            { code: 'VL-G10-CH5-B2', label: 'Bài 2: Va chạm đàn hồi - không đàn hồi' },
          ]
        },
      ]
    },
    {
      grade: 11,
      chapters: [
        {
          code: 'VL-G11-CH1', label: 'Chương 1: Dao động',
          lessons: [
            { code: 'VL-G11-CH1-B1', label: 'Bài 1: Dao động điều hòa',
              units: [
                { code: 'VL-G11-CH1-B1-DV1', label: 'Phương trình dao động', bloom: 'apply' },
                { code: 'VL-G11-CH1-B1-DV2', label: 'Vận tốc - gia tốc tức thời', bloom: 'apply' },
                { code: 'VL-G11-CH1-B1-DV3', label: 'Năng lượng dao động', bloom: 'apply' },
              ] },
            { code: 'VL-G11-CH1-B2', label: 'Bài 2: Con lắc đơn - lò xo' },
            { code: 'VL-G11-CH1-B3', label: 'Bài 3: Dao động tắt dần - cưỡng bức' },
          ]
        },
        {
          code: 'VL-G11-CH2', label: 'Chương 2: Sóng',
          lessons: [
            { code: 'VL-G11-CH2-B1', label: 'Bài 1: Đại cương về sóng cơ',
              units: [
                { code: 'VL-G11-CH2-B1-DV1', label: 'Sóng dọc - sóng ngang', bloom: 'understand' },
                { code: 'VL-G11-CH2-B1-DV2', label: 'Bước sóng - tốc độ truyền', bloom: 'apply' },
              ] },
            { code: 'VL-G11-CH2-B2', label: 'Bài 2: Giao thoa sóng' },
            { code: 'VL-G11-CH2-B3', label: 'Bài 3: Sóng dừng' },
            { code: 'VL-G11-CH2-B4', label: 'Bài 4: Sóng âm' },
            { code: 'VL-G11-CH2-B5', label: 'Bài 5: Sóng điện từ' },
          ]
        },
        {
          code: 'VL-G11-CH3', label: 'Chương 3: Điện trường',
          lessons: [
            { code: 'VL-G11-CH3-B1', label: 'Bài 1: Điện tích - Lực Coulomb' },
            { code: 'VL-G11-CH3-B2', label: 'Bài 2: Cường độ điện trường - Đường sức' },
            { code: 'VL-G11-CH3-B3', label: 'Bài 3: Điện thế - Hiệu điện thế' },
            { code: 'VL-G11-CH3-B4', label: 'Bài 4: Tụ điện - Năng lượng tụ điện' },
          ]
        },
        {
          code: 'VL-G11-CH4', label: 'Chương 4: Dòng điện không đổi',
          lessons: [
            { code: 'VL-G11-CH4-B1', label: 'Bài 1: Đại cương về dòng điện',
              units: [
                { code: 'VL-G11-CH4-B1-DV1', label: 'Cường độ dòng điện', bloom: 'understand' },
                { code: 'VL-G11-CH4-B1-DV2', label: 'Định luật Ohm', bloom: 'apply' },
              ] },
            { code: 'VL-G11-CH4-B2', label: 'Bài 2: Điện trở suất - Định luật Joule-Lenz' },
            { code: 'VL-G11-CH4-B3', label: 'Bài 3: Ghép nguồn - Mạch điện kín' },
          ]
        },
      ]
    },
    {
      grade: 12,
      chapters: [
        {
          code: 'VL-G12-CH1', label: 'Chương 1: Vật lí nhiệt',
          lessons: [
            { code: 'VL-G12-CH1-B1', label: 'Bài 1: Cấu tạo phân tử - Thuyết động học' },
            { code: 'VL-G12-CH1-B2', label: 'Bài 2: Định luật khí lí tưởng' },
            { code: 'VL-G12-CH1-B3', label: 'Bài 3: Nguyên lí thứ I của nhiệt động lực học' },
            { code: 'VL-G12-CH1-B4', label: 'Bài 4: Sự chuyển thể - Nhiệt nóng chảy' },
          ]
        },
        {
          code: 'VL-G12-CH2', label: 'Chương 2: Khí lí tưởng - Nhiệt',
          lessons: [
            { code: 'VL-G12-CH2-B1', label: 'Bài 1: Phương trình trạng thái khí lí tưởng' },
            { code: 'VL-G12-CH2-B2', label: 'Bài 2: Quá trình đẳng nhiệt - đẳng tích - đẳng áp' },
          ]
        },
        {
          code: 'VL-G12-CH3', label: 'Chương 3: Từ trường',
          lessons: [
            { code: 'VL-G12-CH3-B1', label: 'Bài 1: Từ trường - Cảm ứng từ' },
            { code: 'VL-G12-CH3-B2', label: 'Bài 2: Lực từ - Lực Lorentz' },
            { code: 'VL-G12-CH3-B3', label: 'Bài 3: Cảm ứng điện từ' },
          ]
        },
        {
          code: 'VL-G12-CH4', label: 'Chương 4: Vật lí hạt nhân',
          lessons: [
            { code: 'VL-G12-CH4-B1', label: 'Bài 1: Cấu tạo hạt nhân' },
            { code: 'VL-G12-CH4-B2', label: 'Bài 2: Phóng xạ - Định luật phóng xạ' },
            { code: 'VL-G12-CH4-B3', label: 'Bài 3: Phản ứng hạt nhân - Năng lượng' },
          ]
        },
      ]
    }
  ]
}

/* ────────────────────────────────────────────────────────────
 * TOÁN HỌC (chuẩn 2018)
 * ────────────────────────────────────────────────────────── */
const TOAN: SubjectCatalog = {
  subject: 'Toán học',
  code: 'TO',
  grades: [
    {
      grade: 10,
      chapters: [
        { code: 'TO-G10-CH1', label: 'Chương 1: Mệnh đề - Tập hợp',
          lessons: [
            { code: 'TO-G10-CH1-B1', label: 'Bài 1: Mệnh đề' },
            { code: 'TO-G10-CH1-B2', label: 'Bài 2: Tập hợp - Phép toán trên tập hợp' },
          ] },
        { code: 'TO-G10-CH2', label: 'Chương 2: Bất phương trình - Hệ bất phương trình bậc nhất hai ẩn',
          lessons: [
            { code: 'TO-G10-CH2-B1', label: 'Bài 1: Bất phương trình bậc nhất hai ẩn' },
            { code: 'TO-G10-CH2-B2', label: 'Bài 2: Hệ bất phương trình' },
          ] },
        { code: 'TO-G10-CH3', label: 'Chương 3: Hàm số bậc hai - Đồ thị',
          lessons: [
            { code: 'TO-G10-CH3-B1', label: 'Bài 1: Hàm số - Đồ thị' },
            { code: 'TO-G10-CH3-B2', label: 'Bài 2: Hàm số bậc hai' },
            { code: 'TO-G10-CH3-B3', label: 'Bài 3: Dấu của tam thức bậc hai' },
          ] },
        { code: 'TO-G10-CH4', label: 'Chương 4: Hệ thức lượng trong tam giác',
          lessons: [
            { code: 'TO-G10-CH4-B1', label: 'Bài 1: Định lí cosine - sine' },
            { code: 'TO-G10-CH4-B2', label: 'Bài 2: Giải tam giác' },
          ] },
        { code: 'TO-G10-CH5', label: 'Chương 5: Vector',
          lessons: [
            { code: 'TO-G10-CH5-B1', label: 'Bài 1: Khái niệm vector' },
            { code: 'TO-G10-CH5-B2', label: 'Bài 2: Tổng - Hiệu vector' },
            { code: 'TO-G10-CH5-B3', label: 'Bài 3: Tích vô hướng' },
          ] },
        { code: 'TO-G10-CH6', label: 'Chương 6: Thống kê',
          lessons: [
            { code: 'TO-G10-CH6-B1', label: 'Bài 1: Số gần đúng - Sai số' },
            { code: 'TO-G10-CH6-B2', label: 'Bài 2: Các số đặc trưng' },
          ] },
      ]
    },
    {
      grade: 11,
      chapters: [
        { code: 'TO-G11-CH1', label: 'Chương 1: Hàm số lượng giác - Phương trình lượng giác',
          lessons: [
            { code: 'TO-G11-CH1-B1', label: 'Bài 1: Góc lượng giác - Giá trị lượng giác' },
            { code: 'TO-G11-CH1-B2', label: 'Bài 2: Công thức lượng giác' },
            { code: 'TO-G11-CH1-B3', label: 'Bài 3: Hàm số lượng giác' },
            { code: 'TO-G11-CH1-B4', label: 'Bài 4: Phương trình lượng giác cơ bản' },
          ] },
        { code: 'TO-G11-CH2', label: 'Chương 2: Dãy số - Cấp số',
          lessons: [
            { code: 'TO-G11-CH2-B1', label: 'Bài 1: Dãy số' },
            { code: 'TO-G11-CH2-B2', label: 'Bài 2: Cấp số cộng' },
            { code: 'TO-G11-CH2-B3', label: 'Bài 3: Cấp số nhân' },
          ] },
        { code: 'TO-G11-CH3', label: 'Chương 3: Giới hạn - Hàm số liên tục',
          lessons: [
            { code: 'TO-G11-CH3-B1', label: 'Bài 1: Giới hạn của dãy số' },
            { code: 'TO-G11-CH3-B2', label: 'Bài 2: Giới hạn của hàm số' },
            { code: 'TO-G11-CH3-B3', label: 'Bài 3: Hàm số liên tục' },
          ] },
        { code: 'TO-G11-CH4', label: 'Chương 4: Hàm số mũ - Logarit',
          lessons: [
            { code: 'TO-G11-CH4-B1', label: 'Bài 1: Hàm số mũ' },
            { code: 'TO-G11-CH4-B2', label: 'Bài 2: Hàm số logarit' },
            { code: 'TO-G11-CH4-B3', label: 'Bài 3: Phương trình - Bất phương trình mũ logarit' },
          ] },
        { code: 'TO-G11-CH5', label: 'Chương 5: Đạo hàm',
          lessons: [
            { code: 'TO-G11-CH5-B1', label: 'Bài 1: Định nghĩa đạo hàm' },
            { code: 'TO-G11-CH5-B2', label: 'Bài 2: Quy tắc tính đạo hàm' },
            { code: 'TO-G11-CH5-B3', label: 'Bài 3: Đạo hàm hàm số lượng giác - mũ - logarit' },
          ] },
      ]
    },
    {
      grade: 12,
      chapters: [
        { code: 'TO-G12-CH1', label: 'Chương 1: Ứng dụng đạo hàm để khảo sát hàm số',
          lessons: [
            { code: 'TO-G12-CH1-B1', label: 'Bài 1: Tính đơn điệu - Cực trị' },
            { code: 'TO-G12-CH1-B2', label: 'Bài 2: GTLN - GTNN' },
            { code: 'TO-G12-CH1-B3', label: 'Bài 3: Đường tiệm cận' },
            { code: 'TO-G12-CH1-B4', label: 'Bài 4: Khảo sát hàm số bậc 3, 4, phân thức' },
          ] },
        { code: 'TO-G12-CH2', label: 'Chương 2: Vector trong không gian - Hình học giải tích Oxyz',
          lessons: [
            { code: 'TO-G12-CH2-B1', label: 'Bài 1: Tọa độ điểm - Vector' },
            { code: 'TO-G12-CH2-B2', label: 'Bài 2: Phương trình mặt phẳng - đường thẳng' },
            { code: 'TO-G12-CH2-B3', label: 'Bài 3: Mặt cầu' },
          ] },
        { code: 'TO-G12-CH3', label: 'Chương 3: Nguyên hàm - Tích phân',
          lessons: [
            { code: 'TO-G12-CH3-B1', label: 'Bài 1: Nguyên hàm' },
            { code: 'TO-G12-CH3-B2', label: 'Bài 2: Tích phân' },
            { code: 'TO-G12-CH3-B3', label: 'Bài 3: Ứng dụng tích phân' },
          ] },
        { code: 'TO-G12-CH4', label: 'Chương 4: Số phức',
          lessons: [
            { code: 'TO-G12-CH4-B1', label: 'Bài 1: Khái niệm số phức' },
            { code: 'TO-G12-CH4-B2', label: 'Bài 2: Phương trình bậc 2 - Bậc cao trên ℂ' },
          ] },
        { code: 'TO-G12-CH5', label: 'Chương 5: Xác suất - Thống kê',
          lessons: [
            { code: 'TO-G12-CH5-B1', label: 'Bài 1: Xác suất có điều kiện' },
            { code: 'TO-G12-CH5-B2', label: 'Bài 2: Công thức Bayes' },
          ] },
      ]
    }
  ]
}

/* ────────────────────────────────────────────────────────────
 * HÓA HỌC, SINH HỌC — outline ngắn gọn, để mở rộng sau
 * ────────────────────────────────────────────────────────── */
const HOAHOC: SubjectCatalog = {
  subject: 'Hóa học',
  code: 'HH',
  grades: [
    {
      grade: 10,
      chapters: [
        { code: 'HH-G10-CH1', label: 'Chương 1: Cấu tạo nguyên tử', lessons: [
          { code: 'HH-G10-CH1-B1', label: 'Bài 1: Thành phần nguyên tử' },
          { code: 'HH-G10-CH1-B2', label: 'Bài 2: Cấu hình electron' },
        ] },
        { code: 'HH-G10-CH2', label: 'Chương 2: Bảng tuần hoàn', lessons: [
          { code: 'HH-G10-CH2-B1', label: 'Bài 1: Cấu tạo bảng tuần hoàn' },
          { code: 'HH-G10-CH2-B2', label: 'Bài 2: Quy luật biến đổi tính chất' },
        ] },
        { code: 'HH-G10-CH3', label: 'Chương 3: Liên kết hóa học', lessons: [
          { code: 'HH-G10-CH3-B1', label: 'Bài 1: Liên kết ion - cộng hóa trị' },
          { code: 'HH-G10-CH3-B2', label: 'Bài 2: Liên kết hydrogen' },
        ] },
      ]
    },
    {
      grade: 11,
      chapters: [
        { code: 'HH-G11-CH1', label: 'Chương 1: Cân bằng hóa học', lessons: [
          { code: 'HH-G11-CH1-B1', label: 'Bài 1: Cân bằng - Hằng số cân bằng' },
          { code: 'HH-G11-CH1-B2', label: 'Bài 2: Cân bằng pH' },
        ] },
        { code: 'HH-G11-CH2', label: 'Chương 2: Nitrogen - Sulfur', lessons: [
          { code: 'HH-G11-CH2-B1', label: 'Bài 1: Đại cương về Nitrogen' },
          { code: 'HH-G11-CH2-B2', label: 'Bài 2: Sulfur và hợp chất' },
        ] },
        { code: 'HH-G11-CH3', label: 'Chương 3: Đại cương Hóa học hữu cơ', lessons: [
          { code: 'HH-G11-CH3-B1', label: 'Bài 1: Phân loại chất hữu cơ' },
          { code: 'HH-G11-CH3-B2', label: 'Bài 2: Hydrocarbon' },
        ] },
      ]
    },
    {
      grade: 12,
      chapters: [
        { code: 'HH-G12-CH1', label: 'Chương 1: Ester - Lipid', lessons: [
          { code: 'HH-G12-CH1-B1', label: 'Bài 1: Ester' },
          { code: 'HH-G12-CH1-B2', label: 'Bài 2: Lipid - Chất béo' },
        ] },
        { code: 'HH-G12-CH2', label: 'Chương 2: Carbohydrate', lessons: [
          { code: 'HH-G12-CH2-B1', label: 'Bài 1: Glucose - Fructose' },
          { code: 'HH-G12-CH2-B2', label: 'Bài 2: Saccharose - Tinh bột - Cellulose' },
        ] },
        { code: 'HH-G12-CH3', label: 'Chương 3: Amin - Amino acid - Protein', lessons: [
          { code: 'HH-G12-CH3-B1', label: 'Bài 1: Amin' },
          { code: 'HH-G12-CH3-B2', label: 'Bài 2: Amino acid - Peptide - Protein' },
        ] },
        { code: 'HH-G12-CH4', label: 'Chương 4: Polymer', lessons: [
          { code: 'HH-G12-CH4-B1', label: 'Bài 1: Polymer - Vật liệu polymer' },
        ] },
        { code: 'HH-G12-CH5', label: 'Chương 5: Pin điện hóa - Điện phân', lessons: [
          { code: 'HH-G12-CH5-B1', label: 'Bài 1: Pin điện hóa' },
          { code: 'HH-G12-CH5-B2', label: 'Bài 2: Điện phân' },
        ] },
        { code: 'HH-G12-CH6', label: 'Chương 6: Kim loại', lessons: [
          { code: 'HH-G12-CH6-B1', label: 'Bài 1: Đại cương về kim loại' },
          { code: 'HH-G12-CH6-B2', label: 'Bài 2: Kim loại nhóm IA - IIA' },
          { code: 'HH-G12-CH6-B3', label: 'Bài 3: Sắt và hợp chất' },
        ] },
      ]
    }
  ]
}

const SINHHOC: SubjectCatalog = {
  subject: 'Sinh học',
  code: 'SH',
  grades: [
    {
      grade: 10,
      chapters: [
        { code: 'SH-G10-CH1', label: 'Chương 1: Giới thiệu chương trình', lessons: [
          { code: 'SH-G10-CH1-B1', label: 'Bài 1: Đặc điểm giới sinh học' },
        ] },
        { code: 'SH-G10-CH2', label: 'Chương 2: Sinh học tế bào', lessons: [
          { code: 'SH-G10-CH2-B1', label: 'Bài 1: Tế bào nhân sơ - nhân thực' },
          { code: 'SH-G10-CH2-B2', label: 'Bài 2: Trao đổi chất qua màng' },
          { code: 'SH-G10-CH2-B3', label: 'Bài 3: Hô hấp - Quang hợp' },
        ] },
      ]
    },
    {
      grade: 11,
      chapters: [
        { code: 'SH-G11-CH1', label: 'Chương 1: Chuyển hóa vật chất', lessons: [
          { code: 'SH-G11-CH1-B1', label: 'Bài 1: Trao đổi chất ở thực vật' },
          { code: 'SH-G11-CH1-B2', label: 'Bài 2: Trao đổi chất ở động vật' },
        ] },
        { code: 'SH-G11-CH2', label: 'Chương 2: Cảm ứng', lessons: [
          { code: 'SH-G11-CH2-B1', label: 'Bài 1: Cảm ứng thực vật' },
          { code: 'SH-G11-CH2-B2', label: 'Bài 2: Cảm ứng động vật' },
        ] },
      ]
    },
    {
      grade: 12,
      chapters: [
        { code: 'SH-G12-CH1', label: 'Chương 1: Di truyền học', lessons: [
          { code: 'SH-G12-CH1-B1', label: 'Bài 1: Cơ sở phân tử của di truyền' },
          { code: 'SH-G12-CH1-B2', label: 'Bài 2: Quy luật Mendel' },
          { code: 'SH-G12-CH1-B3', label: 'Bài 3: Liên kết - Hoán vị gene' },
        ] },
        { code: 'SH-G12-CH2', label: 'Chương 2: Tiến hóa', lessons: [
          { code: 'SH-G12-CH2-B1', label: 'Bài 1: Bằng chứng - Cơ chế tiến hóa' },
        ] },
        { code: 'SH-G12-CH3', label: 'Chương 3: Sinh thái', lessons: [
          { code: 'SH-G12-CH3-B1', label: 'Bài 1: Quần thể sinh vật' },
          { code: 'SH-G12-CH3-B2', label: 'Bài 2: Hệ sinh thái' },
        ] },
      ]
    }
  ]
}

/* ────────────────────────────────────────────────────────────
 * REGISTRY — tất cả môn được export
 * ────────────────────────────────────────────────────────── */
export const KNOWLEDGE_CATALOG: SubjectCatalog[] = [
  VATLY, TOAN, HOAHOC, SINHHOC,
]

/* ────────────────────────────────────────────────────────────
 * HELPER FUNCTIONS
 * ────────────────────────────────────────────────────────── */

export function getSubjects(): string[] {
  return KNOWLEDGE_CATALOG.map(s => s.subject)
}

export function getChapters(subject: string, grade: number): Chapter[] {
  const s = KNOWLEDGE_CATALOG.find(x => x.subject === subject)
  if (!s) return []
  const g = s.grades.find(x => x.grade === grade)
  return g?.chapters ?? []
}

export function getLessons(subject: string, grade: number, chapterCode: string): Lesson[] {
  const chapters = getChapters(subject, grade)
  const ch = chapters.find(c => c.code === chapterCode)
  return ch?.lessons ?? []
}

export function getUnits(subject: string, grade: number, chapterCode: string, lessonCode: string): KnowledgeUnit[] {
  const lessons = getLessons(subject, grade, chapterCode)
  const l = lessons.find(x => x.code === lessonCode)
  return l?.units ?? []
}

/**
 * Tìm metadata từ code đơn vị KT — dùng khi import dữ liệu có sẵn code.
 */
export function findByCode(code: string): { subject?: SubjectCatalog; chapter?: Chapter; lesson?: Lesson; unit?: KnowledgeUnit } {
  for (const subj of KNOWLEDGE_CATALOG) {
    for (const g of subj.grades) {
      for (const ch of g.chapters) {
        if (ch.code === code) return { subject: subj, chapter: ch }
        for (const les of ch.lessons) {
          if (les.code === code) return { subject: subj, chapter: ch, lesson: les }
          for (const u of les.units ?? []) {
            if (u.code === code) return { subject: subj, chapter: ch, lesson: les, unit: u }
          }
        }
      }
    }
  }
  return {}
}

/**
 * Tổng số đơn vị KT trong toàn catalog — dùng cho stats UI.
 */
export function getCatalogStats() {
  let chapters = 0, lessons = 0, units = 0
  for (const s of KNOWLEDGE_CATALOG) {
    for (const g of s.grades) {
      chapters += g.chapters.length
      for (const ch of g.chapters) {
        lessons += ch.lessons.length
        for (const le of ch.lessons) {
          units += (le.units?.length ?? 0)
        }
      }
    }
  }
  return {
    subjects: KNOWLEDGE_CATALOG.length,
    chapters, lessons, units,
  }
}
