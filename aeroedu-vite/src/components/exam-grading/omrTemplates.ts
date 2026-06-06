// ===================== OMR TEMPLATE CONFIG =====================
// Mẫu phiếu trắc nghiệm có thể cấu hình cho engine chấm trên máy (ScanGrading).
//
// Toàn bộ toạ độ ô tô được khai báo trong hệ TEMPLATE-ABSOLUTE [0..1] của cả tờ
// phiếu (đo từ phiếu thật). Engine sẽ quy đổi sang hệ tham chiếu theo 4 ô vuông
// góc (markerTL/markerBR) rồi map ra pixel. Muốn hỗ trợ một loại phiếu MỚI: thêm
// một OmrTemplate với toạ độ đo từ phiếu đó — KHÔNG cần sửa engine.
//
// ⚠️ Các con số trong BGD_2025 được lấy NGUYÊN từ bản hiệu chỉnh phiếu "PHIẾU
// TRẢ LỜI TRẮC NGHIỆM" chuẩn (Bộ GD&ĐT 2025) đang chạy ổn định — giữ nguyên để
// không phá luồng dò ô đã kiểm chứng.

export interface OmrTemplate {
  id: string;
  name: string;
  description: string;

  /** Vị trí 2 ô vuông góc đối (trên-trái, dưới-phải) trong hệ template-absolute */
  markerTL: { x: number; y: number };
  markerBR: { x: number; y: number };

  /** PHẦN I — Trắc nghiệm nhiều lựa chọn */
  part1: {
    count: number;                 // tổng số câu
    options: string[];             // ['A','B','C','D']
    rowsPerColumn: number;         // số câu mỗi cột (vd 10)
    firstRowY: number;             // Y tâm hàng đầu
    lastRowY: number;              // Y tâm hàng cuối (trong 1 cột)
    columns: { qStart: number; optXs: number[] }[]; // X tâm các ô A,B,C,D mỗi cột
  };

  /** PHẦN II — Đúng/Sai (mỗi câu 4 ý a-d, mỗi ý 2 ô Đ/S) */
  part2: {
    count: number;                 // tổng số câu
    subItems: string[];            // ['a','b','c','d']
    firstRowY: number;
    subSpacing: number;            // khoảng cách Y giữa các ý
    /** Mỗi nhóm gồm 2 câu cạnh nhau: X ô Đúng/Sai của câu trái và câu phải */
    groups: { qStart: number; dongX: number; saiX: number; dongX2: number; saiX2: number }[];
  };

  /** PHẦN III — Trả lời ngắn (lưới chữ số) */
  part3: {
    count: number;                 // tổng số câu
    digitRows: string[];           // ['-',',','0'..'9']
    firstRowY: number;
    lastRowY: number;
    digitsRead: number;            // số cột chữ số đọc ra đáp án (vd 4)
    questions: { q: number; cols: number[] }[]; // X tâm từng cột chữ số
  };
}

// ───────────────────────────────────────────────────────────────
// Mẫu chuẩn BGD-2025: 40 TN · 8 Đúng/Sai · 6 Trả lời ngắn
// (giá trị lấy nguyên từ engine đã hiệu chỉnh)
// ───────────────────────────────────────────────────────────────
export const BGD_2025: OmrTemplate = {
  id: 'bgd-2025',
  name: 'BGD 2025 — 40 TN · 8 Đ/S · 6 TLN',
  description: 'Phiếu trả lời trắc nghiệm chuẩn Bộ GD&ĐT 2025 (Phần I/II/III).',

  markerTL: { x: 0.022, y: 0.315 },
  markerBR: { x: 0.975, y: 0.980 },

  part1: {
    count: 40,
    options: ['A', 'B', 'C', 'D'],
    rowsPerColumn: 10,
    firstRowY: 0.342,
    lastRowY: 0.555,
    columns: [
      { qStart: 1,  optXs: [0.052, 0.082, 0.112, 0.142] },
      { qStart: 11, optXs: [0.286, 0.316, 0.346, 0.376] },
      { qStart: 21, optXs: [0.520, 0.550, 0.580, 0.610] },
      { qStart: 31, optXs: [0.752, 0.782, 0.812, 0.842] },
    ],
  },

  part2: {
    count: 8,
    subItems: ['a', 'b', 'c', 'd'],
    firstRowY: 0.618,
    subSpacing: 0.024,
    groups: [
      { qStart: 1, dongX: 0.048, saiX: 0.078, dongX2: 0.148, saiX2: 0.178 },
      { qStart: 3, dongX: 0.268, saiX: 0.298, dongX2: 0.368, saiX2: 0.398 },
      { qStart: 5, dongX: 0.510, saiX: 0.540, dongX2: 0.618, saiX2: 0.648 },
      { qStart: 7, dongX: 0.738, saiX: 0.768, dongX2: 0.858, saiX2: 0.888 },
    ],
  },

  part3: {
    count: 6,
    digitRows: ['-', ',', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    firstRowY: 0.745,
    lastRowY: 0.968,
    digitsRead: 4,
    questions: [
      { q: 1, cols: [0.042, 0.060, 0.078, 0.096, 0.114] },
      { q: 2, cols: [0.205, 0.223, 0.241, 0.259, 0.277] },
      { q: 3, cols: [0.370, 0.388, 0.406, 0.424, 0.442] },
      { q: 4, cols: [0.535, 0.553, 0.571, 0.589, 0.607] },
      { q: 5, cols: [0.695, 0.713, 0.731, 0.749, 0.767] },
      { q: 6, cols: [0.860, 0.878, 0.896, 0.914, 0.932] },
    ],
  },
};

/** Danh sách mẫu phiếu khả dụng (thêm mẫu mới vào đây) */
export const OMR_TEMPLATES: OmrTemplate[] = [BGD_2025];

export const DEFAULT_TEMPLATE = BGD_2025;

export function getTemplateById(id: string | undefined): OmrTemplate {
  if (!id) return DEFAULT_TEMPLATE;
  const found = OMR_TEMPLATES.find(t => t.id === id);
  if (!found) {
    console.warn(`[omr] Không tìm thấy mẫu phiếu "${id}" — dùng mẫu mặc định ${DEFAULT_TEMPLATE.id}`);
    return DEFAULT_TEMPLATE;
  }
  return found;
}
