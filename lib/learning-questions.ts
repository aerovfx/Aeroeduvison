export interface Question {
  term: string;
  definition: string;
  options: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
  }>;
}

// Vật lý - Đầy đủ câu hỏi
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
    },
    {
      term: "Trọng lực có phương và chiều như thế nào?",
      definition: "Tính chất của trọng lực",
      options: [
        { id: "1", text: "Thẳng đứng, hướng xuống dưới", isCorrect: true },
        { id: "2", text: "Thẳng đứng, hướng lên trên", isCorrect: false },
        { id: "3", text: "Nằm ngang", isCorrect: false },
        { id: "4", text: "Theo hướng chuyển động", isCorrect: false }
      ]
    },
    {
      term: "Công thức tính trọng lực là gì?",
      definition: "Liên hệ giữa trọng lực và khối lượng",
      options: [
        { id: "1", text: "P = mg", isCorrect: true },
        { id: "2", text: "P = ma", isCorrect: false },
        { id: "3", text: "P = mv", isCorrect: false },
        { id: "4", text: "P = mgh", isCorrect: false }
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
    },
    {
      term: "Nhiệt độ đóng băng của nước là bao nhiêu?",
      definition: "Nhiệt độ chuyển pha lỏng-rắn",
      options: [
        { id: "1", text: "0°C", isCorrect: true },
        { id: "2", text: "100°C", isCorrect: false },
        { id: "3", text: "273°C", isCorrect: false },
        { id: "4", text: "-273°C", isCorrect: false }
      ]
    },
    {
      term: "Nhiệt lượng là gì?",
      definition: "Định nghĩa nhiệt lượng",
      options: [
        { id: "1", text: "Năng lượng trao đổi do chênh lệch nhiệt độ", isCorrect: true },
        { id: "2", text: "Nhiệt độ của vật", isCorrect: false },
        { id: "3", text: "Khối lượng của vật", isCorrect: false },
        { id: "4", text: "Thể tích của vật", isCorrect: false }
      ]
    },
    {
      term: "Công thức tính nhiệt lượng là gì?",
      definition: "Q = mcΔt",
      options: [
        { id: "1", text: "Q = mcΔt", isCorrect: true },
        { id: "2", text: "Q = mv", isCorrect: false },
        { id: "3", text: "Q = ma", isCorrect: false },
        { id: "4", text: "Q = mgh", isCorrect: false }
      ]
    },
    {
      term: "Đơn vị đo nhiệt lượng là gì?",
      definition: "Đơn vị cơ bản",
      options: [
        { id: "1", text: "Joule (J)", isCorrect: true },
        { id: "2", text: "Newton (N)", isCorrect: false },
        { id: "3", text: "Watt (W)", isCorrect: false },
        { id: "4", text: "Calorie (cal)", isCorrect: false }
      ]
    }
  ],
  "vat-ly-10-3": [
    {
      term: "Dòng điện là gì?",
      definition: "Định nghĩa dòng điện",
      options: [
        { id: "1", text: "Dòng chuyển động có hướng của các điện tích", isCorrect: true },
        { id: "2", text: "Dòng chuyển động của electron", isCorrect: false },
        { id: "3", text: "Dòng chuyển động của proton", isCorrect: false },
        { id: "4", text: "Dòng chuyển động của neutron", isCorrect: false }
      ]
    },
    {
      term: "Đơn vị đo cường độ dòng điện là gì?",
      definition: "Đơn vị cơ bản",
      options: [
        { id: "1", text: "Ampere (A)", isCorrect: true },
        { id: "2", text: "Volt (V)", isCorrect: false },
        { id: "3", text: "Ohm (Ω)", isCorrect: false },
        { id: "4", text: "Watt (W)", isCorrect: false }
      ]
    },
    {
      term: "Định luật Ohm phát biểu như thế nào?",
      definition: "Mối quan hệ giữa U, I, R",
      options: [
        { id: "1", text: "U = IR", isCorrect: true },
        { id: "2", text: "I = UR", isCorrect: false },
        { id: "3", text: "R = UI", isCorrect: false },
        { id: "4", text: "P = UI", isCorrect: false }
      ]
    },
    {
      term: "Đơn vị đo hiệu điện thế là gì?",
      definition: "Đơn vị cơ bản",
      options: [
        { id: "1", text: "Volt (V)", isCorrect: true },
        { id: "2", text: "Ampere (A)", isCorrect: false },
        { id: "3", text: "Ohm (Ω)", isCorrect: false },
        { id: "4", text: "Watt (W)", isCorrect: false }
      ]
    },
    {
      term: "Đơn vị đo điện trở là gì?",
      definition: "Đơn vị cơ bản",
      options: [
        { id: "1", text: "Ohm (Ω)", isCorrect: true },
        { id: "2", text: "Volt (V)", isCorrect: false },
        { id: "3", text: "Ampere (A)", isCorrect: false },
        { id: "4", text: "Watt (W)", isCorrect: false }
      ]
    }
  ],
  "vat-ly-10-4": [
    {
      term: "Từ trường là gì?",
      definition: "Định nghĩa từ trường",
      options: [
        { id: "1", text: "Môi trường xung quanh nam châm hoặc dòng điện", isCorrect: true },
        { id: "2", text: "Môi trường xung quanh điện tích", isCorrect: false },
        { id: "3", text: "Môi trường xung quanh vật thể", isCorrect: false },
        { id: "4", text: "Môi trường xung quanh ánh sáng", isCorrect: false }
      ]
    },
    {
      term: "Đơn vị đo từ trường là gì?",
      definition: "Đơn vị cơ bản",
      options: [
        { id: "1", text: "Tesla (T)", isCorrect: true },
        { id: "2", text: "Weber (Wb)", isCorrect: false },
        { id: "3", text: "Henry (H)", isCorrect: false },
        { id: "4", text: "Gauss (G)", isCorrect: false }
      ]
    },
    {
      term: "Quy tắc bàn tay phải dùng để làm gì?",
      definition: "Xác định chiều của từ trường",
      options: [
        { id: "1", text: "Xác định chiều của từ trường quanh dòng điện", isCorrect: true },
        { id: "2", text: "Xác định chiều của dòng điện", isCorrect: false },
        { id: "3", text: "Xác định chiều của lực", isCorrect: false },
        { id: "4", text: "Xác định chiều của chuyển động", isCorrect: false }
      ]
    },
    {
      term: "Lực từ tác dụng lên dòng điện có công thức là gì?",
      definition: "F = BIlsinθ",
      options: [
        { id: "1", text: "F = BIlsinθ", isCorrect: true },
        { id: "2", text: "F = BIl", isCorrect: false },
        { id: "3", text: "F = BIlcosθ", isCorrect: false },
        { id: "4", text: "F = BI²l", isCorrect: false }
      ]
    },
    {
      term: "Từ thông qua một diện tích có công thức là gì?",
      definition: "Φ = BScosθ",
      options: [
        { id: "1", text: "Φ = BScosθ", isCorrect: true },
        { id: "2", text: "Φ = BSsinθ", isCorrect: false },
        { id: "3", text: "Φ = BS", isCorrect: false },
        { id: "4", text: "Φ = B²S", isCorrect: false }
      ]
    }
  ]
};

// Hóa học - Đầy đủ câu hỏi
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
    },
    {
      term: "Proton có điện tích như thế nào?",
      definition: "Tính chất điện tích của proton",
      options: [
        { id: "1", text: "Điện tích dương (+1)", isCorrect: true },
        { id: "2", text: "Điện tích âm (-1)", isCorrect: false },
        { id: "3", text: "Không có điện tích", isCorrect: false },
        { id: "4", text: "Điện tích thay đổi", isCorrect: false }
      ]
    },
    {
      term: "Electron có điện tích như thế nào?",
      definition: "Tính chất điện tích của electron",
      options: [
        { id: "1", text: "Điện tích âm (-1)", isCorrect: true },
        { id: "2", text: "Điện tích dương (+1)", isCorrect: false },
        { id: "3", text: "Không có điện tích", isCorrect: false },
        { id: "4", text: "Điện tích thay đổi", isCorrect: false }
      ]
    },
    {
      term: "Neutron có điện tích như thế nào?",
      definition: "Tính chất điện tích của neutron",
      options: [
        { id: "1", text: "Không có điện tích", isCorrect: true },
        { id: "2", text: "Điện tích dương (+1)", isCorrect: false },
        { id: "3", text: "Điện tích âm (-1)", isCorrect: false },
        { id: "4", text: "Điện tích thay đổi", isCorrect: false }
      ]
    },
    {
      term: "Số proton trong hạt nhân bằng gì?",
      definition: "Số hiệu nguyên tử",
      options: [
        { id: "1", text: "Số hiệu nguyên tử (Z)", isCorrect: true },
        { id: "2", text: "Số khối (A)", isCorrect: false },
        { id: "3", text: "Số neutron", isCorrect: false },
        { id: "4", text: "Số electron", isCorrect: false }
      ]
    }
  ],
  "hoa-hoc-10-2": [
    {
      term: "Bảng tuần hoàn được sắp xếp theo nguyên tắc nào?",
      definition: "Nguyên tắc sắp xếp bảng tuần hoàn",
      options: [
        { id: "1", text: "Theo số hiệu nguyên tử tăng dần", isCorrect: true },
        { id: "2", text: "Theo khối lượng nguyên tử", isCorrect: false },
        { id: "3", text: "Theo tên nguyên tố", isCorrect: false },
        { id: "4", text: "Theo màu sắc", isCorrect: false }
      ]
    },
    {
      term: "Chu kỳ trong bảng tuần hoàn là gì?",
      definition: "Định nghĩa chu kỳ",
      options: [
        { id: "1", text: "Hàng ngang trong bảng tuần hoàn", isCorrect: true },
        { id: "2", text: "Cột dọc trong bảng tuần hoàn", isCorrect: false },
        { id: "3", text: "Nhóm nguyên tố", isCorrect: false },
        { id: "4", text: "Khối nguyên tố", isCorrect: false }
      ]
    },
    {
      term: "Nhóm trong bảng tuần hoàn là gì?",
      definition: "Định nghĩa nhóm",
      options: [
        { id: "1", text: "Cột dọc trong bảng tuần hoàn", isCorrect: true },
        { id: "2", text: "Hàng ngang trong bảng tuần hoàn", isCorrect: false },
        { id: "3", text: "Chu kỳ", isCorrect: false },
        { id: "4", text: "Khối nguyên tố", isCorrect: false }
      ]
    },
    {
      term: "Tính kim loại trong chu kỳ biến đổi như thế nào?",
      definition: "Quy luật biến đổi tính kim loại",
      options: [
        { id: "1", text: "Giảm dần từ trái sang phải", isCorrect: true },
        { id: "2", text: "Tăng dần từ trái sang phải", isCorrect: false },
        { id: "3", text: "Không thay đổi", isCorrect: false },
        { id: "4", text: "Thay đổi không đều", isCorrect: false }
      ]
    },
    {
      term: "Tính phi kim trong chu kỳ biến đổi như thế nào?",
      definition: "Quy luật biến đổi tính phi kim",
      options: [
        { id: "1", text: "Tăng dần từ trái sang phải", isCorrect: true },
        { id: "2", text: "Giảm dần từ trái sang phải", isCorrect: false },
        { id: "3", text: "Không thay đổi", isCorrect: false },
        { id: "4", text: "Thay đổi không đều", isCorrect: false }
      ]
    }
  ],
  
  "hoa-hoc-12-1": [
    {
      term: "Este được tạo thành từ phản ứng giữa axit cacboxylic và gì?",
      definition: "Phản ứng este hóa",
      options: [
        { id: "1", text: "Ancol", isCorrect: true },
        { id: "2", text: "Amin", isCorrect: false },
        { id: "3", text: "Anđehit", isCorrect: false },
        { id: "4", text: "Xeton", isCorrect: false }
      ]
    },
    {
      term: "Công thức chung của este no, đơn chức là gì?",
      definition: "Công thức tổng quát của este",
      options: [
        { id: "1", text: "CnH2nO2", isCorrect: true },
        { id: "2", text: "CnH2n+2O", isCorrect: false },
        { id: "3", text: "CnH2n-2O2", isCorrect: false },
        { id: "4", text: "CnH2n+1COOH", isCorrect: false }
      ]
    },
    {
      term: "Lipit là gì?",
      definition: "Định nghĩa về lipit",
      options: [
        { id: "1", text: "Hợp chất hữu cơ không tan trong nước, tan trong dung môi hữu cơ", isCorrect: true },
        { id: "2", text: "Chỉ là chất béo", isCorrect: false },
        { id: "3", text: "Chỉ là sáp", isCorrect: false },
        { id: "4", text: "Chỉ là phospholipid", isCorrect: false }
      ]
    },
    {
      term: "Chất béo là este của axit béo với gì?",
      definition: "Cấu tạo của chất béo",
      options: [
        { id: "1", text: "Glixerol", isCorrect: true },
        { id: "2", text: "Etanol", isCorrect: false },
        { id: "3", text: "Methanol", isCorrect: false },
        { id: "4", text: "Propanol", isCorrect: false }
      ]
    },
    {
      term: "Sáp là este của axit béo với gì?",
      definition: "Cấu tạo của sáp",
      options: [
        { id: "1", text: "Ancol có phân tử khối lớn", isCorrect: true },
        { id: "2", text: "Glixerol", isCorrect: false },
        { id: "3", text: "Etanol", isCorrect: false },
        { id: "4", text: "Methanol", isCorrect: false }
      ]
    },
    {
      term: "Phản ứng thủy phân este trong môi trường axit tạo ra gì?",
      definition: "Thủy phân este trong môi trường axit",
      options: [
        { id: "1", text: "Axit cacboxylic và ancol", isCorrect: true },
        { id: "2", text: "Muối và ancol", isCorrect: false },
        { id: "3", text: "Axit và muối", isCorrect: false },
        { id: "4", text: "Chỉ có axit", isCorrect: false }
      ]
    },
    {
      term: "Phản ứng thủy phân este trong môi trường bazơ tạo ra gì?",
      definition: "Thủy phân este trong môi trường bazơ",
      options: [
        { id: "1", text: "Muối của axit cacboxylic và ancol", isCorrect: true },
        { id: "2", text: "Axit và ancol", isCorrect: false },
        { id: "3", text: "Chỉ có muối", isCorrect: false },
        { id: "4", text: "Chỉ có ancol", isCorrect: false }
      ]
    },
    {
      term: "Chất béo không no có đặc điểm gì?",
      definition: "Tính chất của chất béo không no",
      options: [
        { id: "1", text: "Ở trạng thái lỏng ở nhiệt độ thường", isCorrect: true },
        { id: "2", text: "Ở trạng thái rắn ở nhiệt độ thường", isCorrect: false },
        { id: "3", text: "Không có liên kết đôi", isCorrect: false },
        { id: "4", text: "Chỉ có trong động vật", isCorrect: false }
      ]
    }
  ],
  
  "hoa-hoc-12-2": [
    {
      term: "Cacbohidrat là gì?",
      definition: "Định nghĩa về cacbohidrat",
      options: [
        { id: "1", text: "Hợp chất hữu cơ chứa C, H, O với tỷ lệ H:O = 2:1", isCorrect: true },
        { id: "2", text: "Chỉ là đường glucose", isCorrect: false },
        { id: "3", text: "Chỉ là tinh bột", isCorrect: false },
        { id: "4", text: "Chỉ là cellulose", isCorrect: false }
      ]
    },
    {
      term: "Glucose có công thức phân tử là gì?",
      definition: "Công thức của glucose",
      options: [
        { id: "1", text: "C6H12O6", isCorrect: true },
        { id: "2", text: "C6H10O5", isCorrect: false },
        { id: "3", text: "C12H22O11", isCorrect: false },
        { id: "4", text: "C5H10O5", isCorrect: false }
      ]
    },
    {
      term: "Saccarose được tạo thành từ những monosaccharide nào?",
      definition: "Cấu tạo của saccarose",
      options: [
        { id: "1", text: "Glucose + Fructose", isCorrect: true },
        { id: "2", text: "Glucose + Glucose", isCorrect: false },
        { id: "3", text: "Fructose + Fructose", isCorrect: false },
        { id: "4", text: "Glucose + Galactose", isCorrect: false }
      ]
    },
    {
      term: "Tinh bột được tạo thành từ những đơn vị nào?",
      definition: "Cấu tạo của tinh bột",
      options: [
        { id: "1", text: "Nhiều phân tử glucose", isCorrect: true },
        { id: "2", text: "Nhiều phân tử fructose", isCorrect: false },
        { id: "3", text: "Nhiều phân tử saccarose", isCorrect: false },
        { id: "4", text: "Nhiều phân tử galactose", isCorrect: false }
      ]
    },
    {
      term: "Cellulose có đặc điểm gì?",
      definition: "Tính chất của cellulose",
      options: [
        { id: "1", text: "Không tan trong nước, cấu tạo thành tế bào thực vật", isCorrect: true },
        { id: "2", text: "Tan trong nước", isCorrect: false },
        { id: "3", text: "Chỉ có trong động vật", isCorrect: false },
        { id: "4", text: "Có vị ngọt", isCorrect: false }
      ]
    }
  ],
  
  "hoa-hoc-12-3": [
    {
      term: "Amin là gì?",
      definition: "Định nghĩa về amin",
      options: [
        { id: "1", text: "Hợp chất hữu cơ có nhóm -NH2", isCorrect: true },
        { id: "2", text: "Chỉ là NH3", isCorrect: false },
        { id: "3", text: "Chỉ là muối amoni", isCorrect: false },
        { id: "4", text: "Chỉ là amino axit", isCorrect: false }
      ]
    },
    {
      term: "Amino axit có cấu tạo như thế nào?",
      definition: "Cấu tạo của amino axit",
      options: [
        { id: "1", text: "Có nhóm -NH2 và nhóm -COOH", isCorrect: true },
        { id: "2", text: "Chỉ có nhóm -NH2", isCorrect: false },
        { id: "3", text: "Chỉ có nhóm -COOH", isCorrect: false },
        { id: "4", text: "Chỉ có nhóm -OH", isCorrect: false }
      ]
    },
    {
      term: "Protein được tạo thành từ những đơn vị nào?",
      definition: "Cấu tạo của protein",
      options: [
        { id: "1", text: "Nhiều amino axit liên kết với nhau", isCorrect: true },
        { id: "2", text: "Nhiều glucose", isCorrect: false },
        { id: "3", text: "Nhiều axit béo", isCorrect: false },
        { id: "4", text: "Nhiều nucleotide", isCorrect: false }
      ]
    },
    {
      term: "Enzyme là gì?",
      definition: "Định nghĩa về enzyme",
      options: [
        { id: "1", text: "Protein xúc tác cho các phản ứng sinh học", isCorrect: true },
        { id: "2", text: "Chỉ là chất béo", isCorrect: false },
        { id: "3", text: "Chỉ là đường", isCorrect: false },
        { id: "4", text: "Chỉ là muối", isCorrect: false }
      ]
    },
    {
      term: "Liên kết peptide được tạo thành như thế nào?",
      definition: "Cách tạo liên kết peptide",
      options: [
        { id: "1", text: "Nhóm -COOH của amino axit này với nhóm -NH2 của amino axit kia", isCorrect: true },
        { id: "2", text: "Nhóm -NH2 với nhóm -NH2", isCorrect: false },
        { id: "3", text: "Nhóm -COOH với nhóm -COOH", isCorrect: false },
        { id: "4", text: "Nhóm -OH với nhóm -OH", isCorrect: false }
      ]
    }
  ],
  
  "hoa-hoc-12-4": [
    {
      term: "Polime là gì?",
      definition: "Định nghĩa về polime",
      options: [
        { id: "1", text: "Hợp chất có phân tử khối lớn, được tạo thành từ nhiều đơn vị nhỏ", isCorrect: true },
        { id: "2", text: "Chỉ là chất dẻo", isCorrect: false },
        { id: "3", text: "Chỉ là cao su", isCorrect: false },
        { id: "4", text: "Chỉ là tơ sợi", isCorrect: false }
      ]
    },
    {
      term: "Monome là gì?",
      definition: "Định nghĩa về monome",
      options: [
        { id: "1", text: "Đơn vị nhỏ tạo thành polime", isCorrect: true },
        { id: "2", text: "Polime có phân tử khối nhỏ", isCorrect: false },
        { id: "3", text: "Chất xúc tác", isCorrect: false },
        { id: "4", text: "Sản phẩm phụ", isCorrect: false }
      ]
    },
    {
      term: "Phản ứng trùng hợp là gì?",
      definition: "Định nghĩa phản ứng trùng hợp",
      options: [
        { id: "1", text: "Phản ứng kết hợp nhiều monome thành polime", isCorrect: true },
        { id: "2", text: "Phản ứng phân hủy polime", isCorrect: false },
        { id: "3", text: "Phản ứng thủy phân", isCorrect: false },
        { id: "4", text: "Phản ứng oxi hóa", isCorrect: false }
      ]
    },
    {
      term: "PVC (Polyvinyl clorua) được tạo thành từ monome nào?",
      definition: "Monome của PVC",
      options: [
        { id: "1", text: "Vinyl clorua (CH2=CHCl)", isCorrect: true },
        { id: "2", text: "Etilen (CH2=CH2)", isCorrect: false },
        { id: "3", text: "Styren (C6H5CH=CH2)", isCorrect: false },
        { id: "4", text: "Propylen (CH2=CHCH3)", isCorrect: false }
      ]
    },
    {
      term: "Cao su tự nhiên được tạo thành từ monome nào?",
      definition: "Monome của cao su tự nhiên",
      options: [
        { id: "1", text: "Isopren (C5H8)", isCorrect: true },
        { id: "2", text: "Butadien (C4H6)", isCorrect: false },
        { id: "3", text: "Styren (C8H8)", isCorrect: false },
        { id: "4", text: "Etilen (C2H4)", isCorrect: false }
      ]
    }
  ],
  
  "hoa-hoc-12-5": [
    {
      term: "Kim loại có tính chất chung nào?",
      definition: "Tính chất chung của kim loại",
      options: [
        { id: "1", text: "Dẫn điện, dẫn nhiệt, có ánh kim", isCorrect: true },
        { id: "2", text: "Không dẫn điện", isCorrect: false },
        { id: "3", text: "Không có ánh kim", isCorrect: false },
        { id: "4", text: "Không dẫn nhiệt", isCorrect: false }
      ]
    },
    {
      term: "Kim loại có xu hướng gì trong phản ứng hóa học?",
      definition: "Xu hướng phản ứng của kim loại",
      options: [
        { id: "1", text: "Nhường electron để tạo thành ion dương", isCorrect: true },
        { id: "2", text: "Nhận electron để tạo thành ion âm", isCorrect: false },
        { id: "3", text: "Không tham gia phản ứng", isCorrect: false },
        { id: "4", text: "Chỉ tạo thành hợp chất cộng hóa trị", isCorrect: false }
      ]
    },
    {
      term: "Dãy hoạt động hóa học của kim loại sắp xếp theo thứ tự nào?",
      definition: "Dãy hoạt động hóa học",
      options: [
        { id: "1", text: "Từ mạnh đến yếu: K, Na, Ca, Mg, Al, Zn, Fe, Pb, H, Cu, Ag, Au", isCorrect: true },
        { id: "2", text: "Từ yếu đến mạnh", isCorrect: false },
        { id: "3", text: "Theo thứ tự bảng tuần hoàn", isCorrect: false },
        { id: "4", text: "Theo khối lượng nguyên tử", isCorrect: false }
      ]
    },
    {
      term: "Kim loại nào đẩy được kim loại khác ra khỏi muối?",
      definition: "Phản ứng đẩy kim loại",
      options: [
        { id: "1", text: "Kim loại mạnh hơn đẩy kim loại yếu hơn", isCorrect: true },
        { id: "2", text: "Kim loại yếu hơn đẩy kim loại mạnh hơn", isCorrect: false },
        { id: "3", text: "Bất kỳ kim loại nào", isCorrect: false },
        { id: "4", text: "Chỉ kim loại kiềm", isCorrect: false }
      ]
    },
    {
      term: "Kim loại tác dụng với axit tạo ra gì?",
      definition: "Phản ứng kim loại với axit",
      options: [
        { id: "1", text: "Muối và khí H2", isCorrect: true },
        { id: "2", text: "Chỉ có muối", isCorrect: false },
        { id: "3", text: "Chỉ có khí H2", isCorrect: false },
        { id: "4", text: "Oxit và nước", isCorrect: false }
      ]
    }
  ],
  
  "hoa-hoc-12-6": [
    {
      term: "Kim loại kiềm có đặc điểm gì?",
      definition: "Tính chất của kim loại kiềm",
      options: [
        { id: "1", text: "Mềm, nhẹ, hoạt động mạnh, có 1 electron lớp ngoài", isCorrect: true },
        { id: "2", text: "Cứng, nặng, ít hoạt động", isCorrect: false },
        { id: "3", text: "Có 2 electron lớp ngoài", isCorrect: false },
        { id: "4", text: "Không phản ứng với nước", isCorrect: false }
      ]
    },
    {
      term: "Natri tác dụng với nước tạo ra gì?",
      definition: "Phản ứng natri với nước",
      options: [
        { id: "1", text: "NaOH và khí H2", isCorrect: true },
        { id: "2", text: "Na2O và H2", isCorrect: false },
        { id: "3", text: "NaCl và H2", isCorrect: false },
        { id: "4", text: "Chỉ có NaOH", isCorrect: false }
      ]
    },
    {
      term: "Kim loại kiềm thổ có đặc điểm gì?",
      definition: "Tính chất của kim loại kiềm thổ",
      options: [
        { id: "1", text: "Có 2 electron lớp ngoài, hoạt động mạnh", isCorrect: true },
        { id: "2", text: "Có 1 electron lớp ngoài", isCorrect: false },
        { id: "3", text: "Ít hoạt động", isCorrect: false },
        { id: "4", text: "Không phản ứng với axit", isCorrect: false }
      ]
    },
    {
      term: "Canxi tác dụng với axit HCl tạo ra gì?",
      definition: "Phản ứng canxi với HCl",
      options: [
        { id: "1", text: "CaCl2 và khí H2", isCorrect: true },
        { id: "2", text: "CaO và H2", isCorrect: false },
        { id: "3", text: "Ca(OH)2 và H2", isCorrect: false },
        { id: "4", text: "Chỉ có CaCl2", isCorrect: false }
      ]
    },
    {
      term: "Vôi sống (CaO) tác dụng với nước tạo ra gì?",
      definition: "Phản ứng vôi sống với nước",
      options: [
        { id: "1", text: "Ca(OH)2 (vôi tôi)", isCorrect: true },
        { id: "2", text: "CaCO3", isCorrect: false },
        { id: "3", text: "CaCl2", isCorrect: false },
        { id: "4", text: "CaSO4", isCorrect: false }
      ]
    }
  ],
  
  "hoa-hoc-12-7": [
    {
      term: "Nhôm có tính chất gì?",
      definition: "Tính chất của nhôm",
      options: [
        { id: "1", text: "Nhẹ, dẫn điện tốt, có lớp oxit bảo vệ", isCorrect: true },
        { id: "2", text: "Nặng, không dẫn điện", isCorrect: false },
        { id: "3", text: "Không có lớp oxit bảo vệ", isCorrect: false },
        { id: "4", text: "Không phản ứng với axit", isCorrect: false }
      ]
    },
    {
      term: "Nhôm tác dụng với axit HCl tạo ra gì?",
      definition: "Phản ứng nhôm với HCl",
      options: [
        { id: "1", text: "AlCl3 và khí H2", isCorrect: true },
        { id: "2", text: "Al2O3 và H2", isCorrect: false },
        { id: "3", text: "Al(OH)3 và H2", isCorrect: false },
        { id: "4", text: "Chỉ có AlCl3", isCorrect: false }
      ]
    },
    {
      term: "Nhôm tác dụng với dung dịch kiềm tạo ra gì?",
      definition: "Phản ứng nhôm với kiềm",
      options: [
        { id: "1", text: "Al(OH)3 và khí H2", isCorrect: true },
        { id: "2", text: "Al2O3 và H2", isCorrect: false },
        { id: "3", text: "AlCl3 và H2", isCorrect: false },
        { id: "4", text: "Chỉ có Al(OH)3", isCorrect: false }
      ]
    },
    {
      term: "Al2O3 (alumina) có tính chất gì?",
      definition: "Tính chất của Al2O3",
      options: [
        { id: "1", text: "Oxit lưỡng tính, rất cứng", isCorrect: true },
        { id: "2", text: "Chỉ có tính bazơ", isCorrect: false },
        { id: "3", text: "Chỉ có tính axit", isCorrect: false },
        { id: "4", text: "Mềm, dễ vỡ", isCorrect: false }
      ]
    },
    {
      term: "Phèn chua có công thức là gì?",
      definition: "Công thức của phèn chua",
      options: [
        { id: "1", text: "KAl(SO4)2.12H2O", isCorrect: true },
        { id: "2", text: "Al2(SO4)3", isCorrect: false },
        { id: "3", text: "K2SO4", isCorrect: false },
        { id: "4", text: "AlCl3", isCorrect: false }
      ]
    }
  ]
};

// Sinh học - Đầy đủ câu hỏi
const sinhHocQuestions: { [key: string]: Question[] } = {
  "sinh-hoc-10-1": [
    {
      term: "Thành phần hóa học chính của tế bào là gì?",
      definition: "Các hợp chất hữu cơ và vô cơ trong tế bào",
      options: [
        { id: "1", text: "Nước, muối khoáng, cacbohidrat, lipit, protein", isCorrect: true },
        { id: "2", text: "Chỉ nước và muối khoáng", isCorrect: false },
        { id: "3", text: "Chỉ cacbohidrat và lipit", isCorrect: false },
        { id: "4", text: "Chỉ protein và axit nucleic", isCorrect: false }
      ]
    },
    {
      term: "Nước chiếm bao nhiêu phần trăm khối lượng tế bào?",
      definition: "Tỷ lệ nước trong tế bào",
      options: [
        { id: "1", text: "70-90%", isCorrect: true },
        { id: "2", text: "50-60%", isCorrect: false },
        { id: "3", text: "30-40%", isCorrect: false },
        { id: "4", text: "10-20%", isCorrect: false }
      ]
    },
    {
      term: "Protein được cấu tạo từ các đơn vị nào?",
      definition: "Cấu trúc cơ bản của protein",
      options: [
        { id: "1", text: "Axit amin", isCorrect: true },
        { id: "2", text: "Monosaccharide", isCorrect: false },
        { id: "3", text: "Fatty acid", isCorrect: false },
        { id: "4", text: "Nucleotide", isCorrect: false }
      ]
    },
    {
      term: "Lipit có chức năng chính là gì?",
      definition: "Vai trò của lipit trong tế bào",
      options: [
        { id: "1", text: "Dự trữ năng lượng và cấu trúc màng", isCorrect: true },
        { id: "2", text: "Chỉ dự trữ năng lượng", isCorrect: false },
        { id: "3", text: "Chỉ cấu trúc màng", isCorrect: false },
        { id: "4", text: "Vận chuyển chất", isCorrect: false }
      ]
    },
    {
      term: "Cacbohidrat đơn giản nhất là gì?",
      definition: "Monosaccharide cơ bản",
      options: [
        { id: "1", text: "Glucose", isCorrect: true },
        { id: "2", text: "Sucrose", isCorrect: false },
        { id: "3", text: "Starch", isCorrect: false },
        { id: "4", text: "Cellulose", isCorrect: false }
      ]
    }
  ],
  "sinh-hoc-10-2": [
    {
      term: "Màng tế bào được cấu tạo chủ yếu bởi chất gì?",
      definition: "Cấu tạo màng tế bào",
      options: [
        { id: "1", text: "Phospholipid và protein", isCorrect: true },
        { id: "2", text: "Chỉ phospholipid", isCorrect: false },
        { id: "3", text: "Chỉ protein", isCorrect: false },
        { id: "4", text: "Chỉ carbohydrate", isCorrect: false }
      ]
    },
    {
      term: "Tế bào nhân thực khác tế bào nhân sơ ở điểm nào?",
      definition: "So sánh tế bào nhân thực và nhân sơ",
      options: [
        { id: "1", text: "Có màng nhân bao quanh vật chất di truyền", isCorrect: true },
        { id: "2", text: "Có thành tế bào", isCorrect: false },
        { id: "3", text: "Có màng tế bào", isCorrect: false },
        { id: "4", text: "Có tế bào chất", isCorrect: false }
      ]
    },
    {
      term: "Bào quan nào được gọi là 'nhà máy năng lượng' của tế bào?",
      definition: "Chức năng của ty thể",
      options: [
        { id: "1", text: "Ty thể", isCorrect: true },
        { id: "2", text: "Lục lạp", isCorrect: false },
        { id: "3", text: "Nhân tế bào", isCorrect: false },
        { id: "4", text: "Lưới nội chất", isCorrect: false }
      ]
    },
    {
      term: "Bào quan nào có chức năng quang hợp?",
      definition: "Chức năng của lục lạp",
      options: [
        { id: "1", text: "Lục lạp", isCorrect: true },
        { id: "2", text: "Ty thể", isCorrect: false },
        { id: "3", text: "Ribosome", isCorrect: false },
        { id: "4", text: "Golgi", isCorrect: false }
      ]
    },
    {
      term: "Ribosome có chức năng gì?",
      definition: "Vai trò của ribosome",
      options: [
        { id: "1", text: "Tổng hợp protein", isCorrect: true },
        { id: "2", text: "Tổng hợp lipid", isCorrect: false },
        { id: "3", text: "Tổng hợp carbohydrate", isCorrect: false },
        { id: "4", text: "Phân giải protein", isCorrect: false }
      ]
    }
  ],
  "sinh-hoc-10-3": [
    {
      term: "Quang hợp xảy ra ở bào quan nào?",
      definition: "Vị trí của quá trình quang hợp",
      options: [
        { id: "1", text: "Lục lạp", isCorrect: true },
        { id: "2", text: "Ty thể", isCorrect: false },
        { id: "3", text: "Nhân tế bào", isCorrect: false },
        { id: "4", text: "Ribosome", isCorrect: false }
      ]
    },
    {
      term: "Hô hấp tế bào xảy ra ở bào quan nào?",
      definition: "Vị trí của quá trình hô hấp",
      options: [
        { id: "1", text: "Ty thể", isCorrect: true },
        { id: "2", text: "Lục lạp", isCorrect: false },
        { id: "3", text: "Nhân tế bào", isCorrect: false },
        { id: "4", text: "Ribosome", isCorrect: false }
      ]
    },
    {
      term: "Sản phẩm chính của quang hợp là gì?",
      definition: "Kết quả của quá trình quang hợp",
      options: [
        { id: "1", text: "Glucose và oxy", isCorrect: true },
        { id: "2", text: "Chỉ glucose", isCorrect: false },
        { id: "3", text: "Chỉ oxy", isCorrect: false },
        { id: "4", text: "CO2 và nước", isCorrect: false }
      ]
    },
    {
      term: "ATP là gì?",
      definition: "Adenosine triphosphate",
      options: [
        { id: "1", text: "Đồng tiền năng lượng của tế bào", isCorrect: true },
        { id: "2", text: "Enzyme tiêu hóa", isCorrect: false },
        { id: "3", text: "Protein cấu trúc", isCorrect: false },
        { id: "4", text: "Hormone", isCorrect: false }
      ]
    },
    {
      term: "Quá trình hô hấp tế bào tạo ra gì?",
      definition: "Sản phẩm của hô hấp",
      options: [
        { id: "1", text: "ATP, CO2 và nước", isCorrect: true },
        { id: "2", text: "Chỉ ATP", isCorrect: false },
        { id: "3", text: "Chỉ CO2", isCorrect: false },
        { id: "4", text: "Glucose và oxy", isCorrect: false }
      ]
    }
  ],
  "sinh-hoc-10-4": [
    {
      term: "Phân bào là gì?",
      definition: "Định nghĩa phân bào",
      options: [
        { id: "1", text: "Quá trình tế bào phân chia để tạo tế bào mới", isCorrect: true },
        { id: "2", text: "Quá trình tế bào chết", isCorrect: false },
        { id: "3", text: "Quá trình tế bào lớn lên", isCorrect: false },
        { id: "4", text: "Quá trình tế bào di chuyển", isCorrect: false }
      ]
    },
    {
      term: "Nguyên phân tạo ra bao nhiêu tế bào con?",
      definition: "Kết quả của nguyên phân",
      options: [
        { id: "1", text: "2 tế bào con giống hệt nhau", isCorrect: true },
        { id: "2", text: "4 tế bào con", isCorrect: false },
        { id: "3", text: "1 tế bào con", isCorrect: false },
        { id: "4", text: "8 tế bào con", isCorrect: false }
      ]
    },
    {
      term: "Giảm phân tạo ra bao nhiêu tế bào con?",
      definition: "Kết quả của giảm phân",
      options: [
        { id: "1", text: "4 tế bào con với n NST", isCorrect: true },
        { id: "2", text: "2 tế bào con với 2n NST", isCorrect: false },
        { id: "3", text: "1 tế bào con", isCorrect: false },
        { id: "4", text: "8 tế bào con", isCorrect: false }
      ]
    },
    {
      term: "Kỳ nào của nguyên phân có NST co ngắn cực đại?",
      definition: "Các kỳ của nguyên phân",
      options: [
        { id: "1", text: "Kỳ giữa", isCorrect: true },
        { id: "2", text: "Kỳ đầu", isCorrect: false },
        { id: "3", text: "Kỳ sau", isCorrect: false },
        { id: "4", text: "Kỳ cuối", isCorrect: false }
      ]
    },
    {
      term: "Trao đổi chéo NST xảy ra trong quá trình nào?",
      definition: "Trao đổi chéo trong giảm phân",
      options: [
        { id: "1", text: "Giảm phân I", isCorrect: true },
        { id: "2", text: "Nguyên phân", isCorrect: false },
        { id: "3", text: "Giảm phân II", isCorrect: false },
        { id: "4", text: "Cả nguyên phân và giảm phân", isCorrect: false }
      ]
    }
  ],
  "sinh-hoc-11-1": [
    {
      term: "Cảm ứng ở thực vật là gì?",
      definition: "Phản ứng của thực vật với môi trường",
      options: [
        { id: "1", text: "Khả năng phản ứng với kích thích từ môi trường", isCorrect: true },
        { id: "2", text: "Khả năng di chuyển", isCorrect: false },
        { id: "3", text: "Khả năng sinh sản", isCorrect: false },
        { id: "4", text: "Khả năng quang hợp", isCorrect: false }
      ]
    },
    {
      term: "Hướng động là gì?",
      definition: "Định nghĩa hướng động",
      options: [
        { id: "1", text: "Sự sinh trưởng của cơ quan theo hướng kích thích", isCorrect: true },
        { id: "2", text: "Sự di chuyển của cơ thể", isCorrect: false },
        { id: "3", text: "Sự thay đổi hình dạng tạm thời", isCorrect: false },
        { id: "4", text: "Sự sinh sản", isCorrect: false }
      ]
    },
    {
      term: "Ứng động là gì?",
      definition: "Định nghĩa ứng động",
      options: [
        { id: "1", text: "Sự thay đổi hình dạng tạm thời do kích thích", isCorrect: true },
        { id: "2", text: "Sự sinh trưởng theo hướng", isCorrect: false },
        { id: "3", text: "Sự di chuyển có hướng", isCorrect: false },
        { id: "4", text: "Sự quang hợp", isCorrect: false }
      ]
    },
    {
      term: "Auxin có tác dụng gì?",
      definition: "Chức năng của auxin",
      options: [
        { id: "1", text: "Kích thích sinh trưởng và hướng động", isCorrect: true },
        { id: "2", text: "Ức chế sinh trưởng", isCorrect: false },
        { id: "3", text: "Kích thích ra hoa", isCorrect: false },
        { id: "4", text: "Kích thích rụng lá", isCorrect: false }
      ]
    },
    {
      term: "Rễ cây có hướng động gì?",
      definition: "Hướng động của rễ",
      options: [
        { id: "1", text: "Hướng đất dương và hướng nước dương", isCorrect: true },
        { id: "2", text: "Hướng sáng dương", isCorrect: false },
        { id: "3", text: "Hướng trọng lực âm", isCorrect: false },
        { id: "4", text: "Không có hướng động", isCorrect: false }
      ]
    }
  ],
  "sinh-hoc-11-2": [
    {
      term: "Sinh trưởng ở thực vật là gì?",
      definition: "Định nghĩa sinh trưởng",
      options: [
        { id: "1", text: "Sự tăng kích thước và khối lượng cơ thể", isCorrect: true },
        { id: "2", text: "Sự thay đổi hình dạng", isCorrect: false },
        { id: "3", text: "Sự di chuyển", isCorrect: false },
        { id: "4", text: "Sự quang hợp", isCorrect: false }
      ]
    },
    {
      term: "Phát triển ở thực vật là gì?",
      definition: "Định nghĩa phát triển",
      options: [
        { id: "1", text: "Sự biến đổi về chất, hình thành các cơ quan mới", isCorrect: true },
        { id: "2", text: "Sự tăng kích thước", isCorrect: false },
        { id: "3", text: "Sự di chuyển", isCorrect: false },
        { id: "4", text: "Sự quang hợp", isCorrect: false }
      ]
    },
    {
      term: "Gibberellin có tác dụng gì?",
      definition: "Chức năng của gibberellin",
      options: [
        { id: "1", text: "Kích thích sinh trưởng chiều cao", isCorrect: true },
        { id: "2", text: "Ức chế sinh trưởng", isCorrect: false },
        { id: "3", text: "Kích thích rụng lá", isCorrect: false },
        { id: "4", text: "Kích thích ra hoa", isCorrect: false }
      ]
    },
    {
      term: "Cytokinin có tác dụng gì?",
      definition: "Chức năng của cytokinin",
      options: [
        { id: "1", text: "Kích thích phân chia tế bào", isCorrect: true },
        { id: "2", text: "Ức chế phân chia tế bào", isCorrect: false },
        { id: "3", text: "Kích thích rụng lá", isCorrect: false },
        { id: "4", text: "Kích thích ra hoa", isCorrect: false }
      ]
    },
    {
      term: "Abscisic acid (ABA) có tác dụng gì?",
      definition: "Chức năng của ABA",
      options: [
        { id: "1", text: "Ức chế sinh trưởng và kích thích rụng lá", isCorrect: true },
        { id: "2", text: "Kích thích sinh trưởng", isCorrect: false },
        { id: "3", text: "Kích thích ra hoa", isCorrect: false },
        { id: "4", text: "Kích thích phân chia tế bào", isCorrect: false }
      ]
    }
  ]
};

// Python - Đầy đủ câu hỏi
const pythonQuestions: { [key: string]: Question[] } = {
  "python-10-1": [
    {
      term: "Python là ngôn ngữ lập trình gì?",
      definition: "Loại ngôn ngữ lập trình",
      options: [
        { id: "1", text: "Ngôn ngữ lập trình bậc cao, thông dịch", isCorrect: true },
        { id: "2", text: "Ngôn ngữ lập trình bậc thấp", isCorrect: false },
        { id: "3", text: "Ngôn ngữ đánh dấu", isCorrect: false },
        { id: "4", text: "Ngôn ngữ cơ sở dữ liệu", isCorrect: false }
      ]
    },
    {
      term: "Để in ra màn hình trong Python, ta dùng lệnh gì?",
      definition: "Lệnh print trong Python",
      options: [
        { id: "1", text: "print()", isCorrect: true },
        { id: "2", text: "echo()", isCorrect: false },
        { id: "3", text: "console.log()", isCorrect: false },
        { id: "4", text: "printf()", isCorrect: false }
      ]
    },
    {
      term: "Python sử dụng ký tự nào để bắt đầu comment?",
      definition: "Cú pháp comment trong Python",
      options: [
        { id: "1", text: "#", isCorrect: true },
        { id: "2", text: "//", isCorrect: false },
        { id: "3", text: "/*", isCorrect: false },
        { id: "4", text: "--", isCorrect: false }
      ]
    },
    {
      term: "Trong Python, để gán giá trị cho biến ta dùng ký hiệu gì?",
      definition: "Toán tử gán trong Python",
      options: [
        { id: "1", text: "=", isCorrect: true },
        { id: "2", text: ":=", isCorrect: false },
        { id: "3", text: "<-", isCorrect: false },
        { id: "4", text: "=>", isCorrect: false }
      ]
    },
    {
      term: "Python có phân biệt chữ hoa và chữ thường không?",
      definition: "Tính phân biệt chữ hoa/thường",
      options: [
        { id: "1", text: "Có phân biệt", isCorrect: true },
        { id: "2", text: "Không phân biệt", isCorrect: false },
        { id: "3", text: "Tùy trường hợp", isCorrect: false },
        { id: "4", text: "Chỉ phân biệt trong tên biến", isCorrect: false }
      ]
    }
  ],
  "python-10-2": [
    {
      term: "Kiểu dữ liệu nào dùng để lưu số nguyên trong Python?",
      definition: "Kiểu dữ liệu số nguyên",
      options: [
        { id: "1", text: "int", isCorrect: true },
        { id: "2", text: "integer", isCorrect: false },
        { id: "3", text: "number", isCorrect: false },
        { id: "4", text: "num", isCorrect: false }
      ]
    },
    {
      term: "Kiểu dữ liệu nào dùng để lưu số thực trong Python?",
      definition: "Kiểu dữ liệu số thực",
      options: [
        { id: "1", text: "float", isCorrect: true },
        { id: "2", text: "double", isCorrect: false },
        { id: "3", text: "real", isCorrect: false },
        { id: "4", text: "decimal", isCorrect: false }
      ]
    },
    {
      term: "Kiểu dữ liệu nào dùng để lưu chuỗi ký tự trong Python?",
      definition: "Kiểu dữ liệu chuỗi",
      options: [
        { id: "1", text: "str", isCorrect: true },
        { id: "2", text: "string", isCorrect: false },
        { id: "3", text: "text", isCorrect: false },
        { id: "4", text: "char", isCorrect: false }
      ]
    },
    {
      term: "Kiểu dữ liệu nào dùng để lưu giá trị True/False trong Python?",
      definition: "Kiểu dữ liệu boolean",
      options: [
        { id: "1", text: "bool", isCorrect: true },
        { id: "2", text: "boolean", isCorrect: false },
        { id: "3", text: "true", isCorrect: false },
        { id: "4", text: "false", isCorrect: false }
      ]
    },
    {
      term: "Hàm nào dùng để chuyển đổi kiểu dữ liệu thành số nguyên?",
      definition: "Chuyển đổi kiểu dữ liệu",
      options: [
        { id: "1", text: "int()", isCorrect: true },
        { id: "2", text: "integer()", isCorrect: false },
        { id: "3", text: "parseInt()", isCorrect: false },
        { id: "4", text: "toInt()", isCorrect: false }
      ]
    }
  ],
  "python-10-3": [
    {
      term: "Hàm nào dùng để nhập dữ liệu từ người dùng trong Python?",
      definition: "Nhập dữ liệu từ bàn phím",
      options: [
        { id: "1", text: "input()", isCorrect: true },
        { id: "2", text: "read()", isCorrect: false },
        { id: "3", text: "scanf()", isCorrect: false },
        { id: "4", text: "get()", isCorrect: false }
      ]
    },
    {
      term: "Hàm input() trả về kiểu dữ liệu gì?",
      definition: "Kiểu trả về của input()",
      options: [
        { id: "1", text: "str (chuỗi)", isCorrect: true },
        { id: "2", text: "int (số nguyên)", isCorrect: false },
        { id: "3", text: "float (số thực)", isCorrect: false },
        { id: "4", text: "Tùy theo input", isCorrect: false }
      ]
    },
    {
      term: "Để xuất dữ liệu ra màn hình trong Python ta dùng hàm gì?",
      definition: "Xuất dữ liệu ra màn hình",
      options: [
        { id: "1", text: "print()", isCorrect: true },
        { id: "2", text: "output()", isCorrect: false },
        { id: "3", text: "display()", isCorrect: false },
        { id: "4", text: "show()", isCorrect: false }
      ]
    },
    {
      term: "Trong print(), tham số sep dùng để làm gì?",
      definition: "Tham số sep trong print()",
      options: [
        { id: "1", text: "Xác định ký tự phân cách giữa các đối số", isCorrect: true },
        { id: "2", text: "Xác định ký tự kết thúc", isCorrect: false },
        { id: "3", text: "Xác định format", isCorrect: false },
        { id: "4", text: "Xác định màu sắc", isCorrect: false }
      ]
    },
    {
      term: "Trong print(), tham số end dùng để làm gì?",
      definition: "Tham số end trong print()",
      options: [
        { id: "1", text: "Xác định ký tự kết thúc của dòng", isCorrect: true },
        { id: "2", text: "Xác định ký tự phân cách", isCorrect: false },
        { id: "3", text: "Xác định số lượng ký tự", isCorrect: false },
        { id: "4", text: "Xác định màu sắc", isCorrect: false }
      ]
    }
  ],
  "python-10-4": [
    {
      term: "Toán tử nào dùng để tính lũy thừa trong Python?",
      definition: "Toán tử lũy thừa",
      options: [
        { id: "1", text: "**", isCorrect: true },
        { id: "2", text: "^", isCorrect: false },
        { id: "3", text: "pow", isCorrect: false },
        { id: "4", text: "exp", isCorrect: false }
      ]
    },
    {
      term: "Toán tử // trong Python dùng để làm gì?",
      definition: "Toán tử chia nguyên",
      options: [
        { id: "1", text: "Chia lấy phần nguyên", isCorrect: true },
        { id: "2", text: "Chia thông thường", isCorrect: false },
        { id: "3", text: "Chia lấy phần dư", isCorrect: false },
        { id: "4", text: "Chia lấy căn bậc hai", isCorrect: false }
      ]
    },
    {
      term: "Toán tử % trong Python dùng để làm gì?",
      definition: "Toán tử chia lấy phần dư",
      options: [
        { id: "1", text: "Chia lấy phần dư", isCorrect: true },
        { id: "2", text: "Chia thông thường", isCorrect: false },
        { id: "3", text: "Chia lấy phần nguyên", isCorrect: false },
        { id: "4", text: "Tính phần trăm", isCorrect: false }
      ]
    },
    {
      term: "Toán tử so sánh == dùng để làm gì?",
      definition: "Toán tử so sánh bằng",
      options: [
        { id: "1", text: "So sánh bằng", isCorrect: true },
        { id: "2", text: "Gán giá trị", isCorrect: false },
        { id: "3", text: "So sánh khác", isCorrect: false },
        { id: "4", text: "So sánh lớn hơn", isCorrect: false }
      ]
    },
    {
      term: "Toán tử logic nào dùng để phủ định trong Python?",
      definition: "Toán tử logic NOT",
      options: [
        { id: "1", text: "not", isCorrect: true },
        { id: "2", text: "!", isCorrect: false },
        { id: "3", text: "~", isCorrect: false },
        { id: "4", text: "-", isCorrect: false }
      ]
    }
  ],
  "python-10-5": [
    {
      term: "Cú pháp đúng của câu lệnh if trong Python là gì?",
      definition: "Cú pháp câu lệnh if",
      options: [
        { id: "1", text: "if điều_kiện:", isCorrect: true },
        { id: "2", text: "if (điều_kiện)", isCorrect: false },
        { id: "3", text: "if điều_kiện {", isCorrect: false },
        { id: "4", text: "if điều_kiện then", isCorrect: false }
      ]
    },
    {
      term: "Từ khóa nào dùng để xử lý trường hợp điều kiện sai?",
      definition: "Từ khóa else",
      options: [
        { id: "1", text: "else", isCorrect: true },
        { id: "2", text: "elseif", isCorrect: false },
        { id: "3", text: "elif", isCorrect: false },
        { id: "4", text: "otherwise", isCorrect: false }
      ]
    },
    {
      term: "Từ khóa nào dùng để xử lý nhiều điều kiện trong Python?",
      definition: "Từ khóa elif",
      options: [
        { id: "1", text: "elif", isCorrect: true },
        { id: "2", text: "else if", isCorrect: false },
        { id: "3", text: "elseif", isCorrect: false },
        { id: "4", text: "switch", isCorrect: false }
      ]
    },
    {
      term: "Trong Python, khối lệnh được xác định bằng gì?",
      definition: "Xác định khối lệnh",
      options: [
        { id: "1", text: "Thụt lề (indentation)", isCorrect: true },
        { id: "2", text: "Dấu ngoặc nhọn {}", isCorrect: false },
        { id: "3", text: "Dấu ngoặc vuông []", isCorrect: false },
        { id: "4", text: "Dấu ngoặc đơn ()", isCorrect: false }
      ]
    },
    {
      term: "Toán tử nào dùng để kết hợp nhiều điều kiện với logic AND?",
      definition: "Toán tử logic AND",
      options: [
        { id: "1", text: "and", isCorrect: true },
        { id: "2", text: "&&", isCorrect: false },
        { id: "3", text: "&", isCorrect: false },
        { id: "4", text: "+", isCorrect: false }
      ]
    }
  ],
  
  "python-10-6": [
    {
      term: "Hàm range(5) tạo ra dãy số nào?",
      definition: "Hàm range trong Python",
      options: [
        { id: "1", text: "0, 1, 2, 3, 4", isCorrect: true },
        { id: "2", text: "1, 2, 3, 4, 5", isCorrect: false },
        { id: "3", text: "0, 1, 2, 3, 4, 5", isCorrect: false },
        { id: "4", text: "5, 4, 3, 2, 1", isCorrect: false }
      ]
    },
    {
      term: "Hàm range(2, 8) tạo ra dãy số nào?",
      definition: "Hàm range với 2 tham số",
      options: [
        { id: "1", text: "2, 3, 4, 5, 6, 7", isCorrect: true },
        { id: "2", text: "2, 3, 4, 5, 6, 7, 8", isCorrect: false },
        { id: "3", text: "0, 1, 2, 3, 4, 5, 6, 7", isCorrect: false },
        { id: "4", text: "8, 7, 6, 5, 4, 3, 2", isCorrect: false }
      ]
    },
    {
      term: "Hàm range(0, 10, 2) tạo ra dãy số nào?",
      definition: "Hàm range với bước nhảy",
      options: [
        { id: "1", text: "0, 2, 4, 6, 8", isCorrect: true },
        { id: "2", text: "0, 1, 2, 3, 4, 5, 6, 7, 8, 9", isCorrect: false },
        { id: "3", text: "2, 4, 6, 8, 10", isCorrect: false },
        { id: "4", text: "0, 2, 4, 6, 8, 10", isCorrect: false }
      ]
    },
    {
      term: "Vòng lặp for với enumerate() dùng để làm gì?",
      definition: "Hàm enumerate trong vòng lặp",
      options: [
        { id: "1", text: "Lặp qua cả chỉ số và giá trị của danh sách", isCorrect: true },
        { id: "2", text: "Chỉ lặp qua chỉ số", isCorrect: false },
        { id: "3", text: "Chỉ lặp qua giá trị", isCorrect: false },
        { id: "4", text: "Đếm số phần tử", isCorrect: false }
      ]
    },
    {
      term: "Cú pháp đúng của vòng lặp for với enumerate là gì?",
      definition: "Cú pháp enumerate",
      options: [
        { id: "1", text: "for index, value in enumerate(list):", isCorrect: true },
        { id: "2", text: "for enumerate(index, value) in list:", isCorrect: false },
        { id: "3", text: "for list in enumerate(index, value):", isCorrect: false },
        { id: "4", text: "for value, index in enumerate(list):", isCorrect: false }
      ]
    }
  ],
  
  "python-10-7": [
    {
      term: "List trong Python là gì?",
      definition: "Định nghĩa list",
      options: [
        { id: "1", text: "Một tập hợp có thứ tự các phần tử", isCorrect: true },
        { id: "2", text: "Một tập hợp không có thứ tự", isCorrect: false },
        { id: "3", text: "Một cặp key-value", isCorrect: false },
        { id: "4", text: "Một chuỗi ký tự", isCorrect: false }
      ]
    },
    {
      term: "Cách tạo list rỗng trong Python?",
      definition: "Tạo list rỗng",
      options: [
        { id: "1", text: "my_list = []", isCorrect: true },
        { id: "2", text: "my_list = {}", isCorrect: false },
        { id: "3", text: "my_list = ()", isCorrect: false },
        { id: "4", text: "my_list = None", isCorrect: false }
      ]
    },
    {
      term: "Cách thêm phần tử vào cuối list?",
      definition: "Thêm phần tử vào list",
      options: [
        { id: "1", text: "list.append(item)", isCorrect: true },
        { id: "2", text: "list.add(item)", isCorrect: false },
        { id: "3", text: "list.insert(item)", isCorrect: false },
        { id: "4", text: "list.push(item)", isCorrect: false }
      ]
    },
    {
      term: "Cách lấy phần tử tại vị trí index 2 trong list?",
      definition: "Truy cập phần tử list",
      options: [
        { id: "1", text: "list[2]", isCorrect: true },
        { id: "2", text: "list(2)", isCorrect: false },
        { id: "3", text: "list.get(2)", isCorrect: false },
        { id: "4", text: "list.at(2)", isCorrect: false }
      ]
    },
    {
      term: "Cách lấy độ dài của list?",
      definition: "Độ dài list",
      options: [
        { id: "1", text: "len(list)", isCorrect: true },
        { id: "2", text: "list.length()", isCorrect: false },
        { id: "3", text: "list.size()", isCorrect: false },
        { id: "4", text: "list.count()", isCorrect: false }
      ]
    }
  ],
  
  "python-10-8": [
    {
      term: "Dictionary trong Python là gì?",
      definition: "Định nghĩa dictionary",
      options: [
        { id: "1", text: "Một tập hợp các cặp key-value", isCorrect: true },
        { id: "2", text: "Một danh sách có thứ tự", isCorrect: false },
        { id: "3", text: "Một tập hợp không có thứ tự", isCorrect: false },
        { id: "4", text: "Một chuỗi ký tự", isCorrect: false }
      ]
    },
    {
      term: "Cách tạo dictionary rỗng?",
      definition: "Tạo dictionary rỗng",
      options: [
        { id: "1", text: "my_dict = {}", isCorrect: true },
        { id: "2", text: "my_dict = []", isCorrect: false },
        { id: "3", text: "my_dict = ()", isCorrect: false },
        { id: "4", text: "my_dict = None", isCorrect: false }
      ]
    },
    {
      term: "Cách thêm hoặc cập nhật giá trị trong dictionary?",
      definition: "Thêm/cập nhật dictionary",
      options: [
        { id: "1", text: "dict[key] = value", isCorrect: true },
        { id: "2", text: "dict.add(key, value)", isCorrect: false },
        { id: "3", text: "dict.insert(key, value)", isCorrect: false },
        { id: "4", text: "dict.set(key, value)", isCorrect: false }
      ]
    },
    {
      term: "Cách lấy giá trị từ dictionary?",
      definition: "Truy cập dictionary",
      options: [
        { id: "1", text: "dict[key]", isCorrect: true },
        { id: "2", text: "dict(key)", isCorrect: false },
        { id: "3", text: "dict.get(key)", isCorrect: false },
        { id: "4", text: "dict.at(key)", isCorrect: false }
      ]
    },
    {
      term: "Cách kiểm tra key có tồn tại trong dictionary?",
      definition: "Kiểm tra key trong dictionary",
      options: [
        { id: "1", text: "key in dict", isCorrect: true },
        { id: "2", text: "dict.contains(key)", isCorrect: false },
        { id: "3", text: "dict.has(key)", isCorrect: false },
        { id: "4", text: "dict.exists(key)", isCorrect: false }
      ]
    }
  ],
  
  "python-10-9": [
    {
      term: "Hàm trong Python được định nghĩa bằng từ khóa nào?",
      definition: "Định nghĩa hàm",
      options: [
        { id: "1", text: "def", isCorrect: true },
        { id: "2", text: "function", isCorrect: false },
        { id: "3", text: "func", isCorrect: false },
        { id: "4", text: "define", isCorrect: false }
      ]
    },
    {
      term: "Cú pháp đúng để định nghĩa hàm là gì?",
      definition: "Cú pháp định nghĩa hàm",
      options: [
        { id: "1", text: "def function_name():", isCorrect: true },
        { id: "2", text: "function function_name():", isCorrect: false },
        { id: "3", text: "def function_name:", isCorrect: false },
        { id: "4", text: "function function_name:", isCorrect: false }
      ]
    },
    {
      term: "Cách gọi hàm trong Python?",
      definition: "Gọi hàm",
      options: [
        { id: "1", text: "function_name()", isCorrect: true },
        { id: "2", text: "call function_name()", isCorrect: false },
        { id: "3", text: "function_name", isCorrect: false },
        { id: "4", text: "execute function_name()", isCorrect: false }
      ]
    },
    {
      term: "Từ khóa return dùng để làm gì?",
      definition: "Từ khóa return",
      options: [
        { id: "1", text: "Trả về giá trị từ hàm", isCorrect: true },
        { id: "2", text: "Kết thúc chương trình", isCorrect: false },
        { id: "3", text: "In ra màn hình", isCorrect: false },
        { id: "4", text: "Nhập dữ liệu", isCorrect: false }
      ]
    },
    {
      term: "Hàm có thể trả về bao nhiêu giá trị?",
      definition: "Số lượng giá trị trả về",
      options: [
        { id: "1", text: "Một hoặc nhiều giá trị", isCorrect: true },
        { id: "2", text: "Chỉ một giá trị", isCorrect: false },
        { id: "3", text: "Chỉ hai giá trị", isCorrect: false },
        { id: "4", text: "Không thể trả về giá trị", isCorrect: false }
      ]
    }
  ],
  
  "python-10-10": [
    {
      term: "Module trong Python là gì?",
      definition: "Định nghĩa module",
      options: [
        { id: "1", text: "Một file chứa các hàm và biến có thể tái sử dụng", isCorrect: true },
        { id: "2", text: "Một chương trình hoàn chỉnh", isCorrect: false },
        { id: "3", text: "Một thư viện có sẵn", isCorrect: false },
        { id: "4", text: "Một biến đặc biệt", isCorrect: false }
      ]
    },
    {
      term: "Cách import module trong Python?",
      definition: "Import module",
      options: [
        { id: "1", text: "import module_name", isCorrect: true },
        { id: "2", text: "include module_name", isCorrect: false },
        { id: "3", text: "require module_name", isCorrect: false },
        { id: "4", text: "load module_name", isCorrect: false }
      ]
    },
    {
      term: "Cách import một hàm cụ thể từ module?",
      definition: "Import hàm cụ thể",
      options: [
        { id: "1", text: "from module_name import function_name", isCorrect: true },
        { id: "2", text: "import function_name from module_name", isCorrect: false },
        { id: "3", text: "import module_name.function_name", isCorrect: false },
        { id: "4", text: "include function_name from module_name", isCorrect: false }
      ]
    },
    {
      term: "Module math trong Python chứa gì?",
      definition: "Module math",
      options: [
        { id: "1", text: "Các hàm toán học như sin, cos, sqrt", isCorrect: true },
        { id: "2", text: "Các hàm xử lý chuỗi", isCorrect: false },
        { id: "3", text: "Các hàm xử lý file", isCorrect: false },
        { id: "4", text: "Các hàm xử lý mạng", isCorrect: false }
      ]
    },
    {
      term: "Cách sử dụng hàm sqrt từ module math?",
      definition: "Sử dụng hàm sqrt",
      options: [
        { id: "1", text: "math.sqrt(16)", isCorrect: true },
        { id: "2", text: "sqrt(16)", isCorrect: false },
        { id: "3", text: "math.square_root(16)", isCorrect: false },
        { id: "4", text: "square_root(16)", isCorrect: false }
      ]
    }
  ],
  
  "python-10-11": [
    {
      term: "String trong Python là gì?",
      definition: "Định nghĩa string",
      options: [
        { id: "1", text: "Một chuỗi ký tự được đặt trong dấu nháy", isCorrect: true },
        { id: "2", text: "Một số nguyên", isCorrect: false },
        { id: "3", text: "Một số thực", isCorrect: false },
        { id: "4", text: "Một danh sách", isCorrect: false }
      ]
    },
    {
      term: "Cách tạo string trong Python?",
      definition: "Tạo string",
      options: [
        { id: "1", text: "text = \"Hello\" hoặc text = 'Hello'", isCorrect: true },
        { id: "2", text: "text = Hello", isCorrect: false },
        { id: "3", text: "text = [Hello]", isCorrect: false },
        { id: "4", text: "text = {Hello}", isCorrect: false }
      ]
    },
    {
      term: "Cách nối hai string trong Python?",
      definition: "Nối string",
      options: [
        { id: "1", text: "string1 + string2", isCorrect: true },
        { id: "2", text: "string1 & string2", isCorrect: false },
        { id: "3", text: "string1 . string2", isCorrect: false },
        { id: "4", text: "string1 * string2", isCorrect: false }
      ]
    },
    {
      term: "Cách lấy độ dài của string?",
      definition: "Độ dài string",
      options: [
        { id: "1", text: "len(string)", isCorrect: true },
        { id: "2", text: "string.length()", isCorrect: false },
        { id: "3", text: "string.size()", isCorrect: false },
        { id: "4", text: "string.count()", isCorrect: false }
      ]
    },
    {
      term: "Cách chuyển string thành chữ hoa?",
      definition: "Chuyển thành chữ hoa",
      options: [
        { id: "1", text: "string.upper()", isCorrect: true },
        { id: "2", text: "string.toUpper()", isCorrect: false },
        { id: "3", text: "string.uppercase()", isCorrect: false },
        { id: "4", text: "string.capitalize()", isCorrect: false }
      ]
    }
  ],
  
  "python-10-12": [
    {
      term: "File handling trong Python dùng để làm gì?",
      definition: "Xử lý file",
      options: [
        { id: "1", text: "Đọc và ghi dữ liệu vào file", isCorrect: true },
        { id: "2", text: "Chỉ đọc file", isCorrect: false },
        { id: "3", text: "Chỉ ghi file", isCorrect: false },
        { id: "4", text: "Xóa file", isCorrect: false }
      ]
    },
    {
      term: "Cách mở file để đọc trong Python?",
      definition: "Mở file để đọc",
      options: [
        { id: "1", text: "open('filename.txt', 'r')", isCorrect: true },
        { id: "2", text: "open('filename.txt', 'w')", isCorrect: false },
        { id: "3", text: "open('filename.txt', 'a')", isCorrect: false },
        { id: "4", text: "open('filename.txt')", isCorrect: false }
      ]
    },
    {
      term: "Cách mở file để ghi trong Python?",
      definition: "Mở file để ghi",
      options: [
        { id: "1", text: "open('filename.txt', 'w')", isCorrect: true },
        { id: "2", text: "open('filename.txt', 'r')", isCorrect: false },
        { id: "3", text: "open('filename.txt', 'a')", isCorrect: false },
        { id: "4", text: "open('filename.txt')", isCorrect: false }
      ]
    },
    {
      term: "Cách đọc toàn bộ nội dung file?",
      definition: "Đọc toàn bộ file",
      options: [
        { id: "1", text: "file.read()", isCorrect: true },
        { id: "2", text: "file.readAll()", isCorrect: false },
        { id: "3", text: "file.getContent()", isCorrect: false },
        { id: "4", text: "file.load()", isCorrect: false }
      ]
    },
    {
      term: "Cách đóng file sau khi sử dụng?",
      definition: "Đóng file",
      options: [
        { id: "1", text: "file.close()", isCorrect: true },
        { id: "2", text: "file.end()", isCorrect: false },
        { id: "3", text: "file.finish()", isCorrect: false },
        { id: "4", text: "file.stop()", isCorrect: false }
      ]
    }
  ],
  
  "python-10-13": [
    {
      term: "Exception handling trong Python dùng để làm gì?",
      definition: "Xử lý ngoại lệ",
      options: [
        { id: "1", text: "Xử lý các lỗi và ngoại lệ trong chương trình", isCorrect: true },
        { id: "2", text: "Chỉ để bắt lỗi cú pháp", isCorrect: false },
        { id: "3", text: "Chỉ để bắt lỗi logic", isCorrect: false },
        { id: "4", text: "Để tạo ra lỗi", isCorrect: false }
      ]
    },
    {
      term: "Cú pháp try-except trong Python?",
      definition: "Cú pháp try-except",
      options: [
        { id: "1", text: "try: ... except: ...", isCorrect: true },
        { id: "2", text: "try: ... catch: ...", isCorrect: false },
        { id: "3", text: "try: ... error: ...", isCorrect: false },
        { id: "4", text: "try: ... handle: ...", isCorrect: false }
      ]
    },
    {
      term: "Cách bắt một loại exception cụ thể?",
      definition: "Bắt exception cụ thể",
      options: [
        { id: "1", text: "except ValueError:", isCorrect: true },
        { id: "2", text: "except error ValueError:", isCorrect: false },
        { id: "3", text: "except (ValueError):", isCorrect: false },
        { id: "4", text: "except ValueError as e:", isCorrect: false }
      ]
    },
    {
      term: "Khối finally trong Python dùng để làm gì?",
      definition: "Khối finally",
      options: [
        { id: "1", text: "Thực hiện code bất kể có exception hay không", isCorrect: true },
        { id: "2", text: "Chỉ thực hiện khi có exception", isCorrect: false },
        { id: "3", text: "Chỉ thực hiện khi không có exception", isCorrect: false },
        { id: "4", text: "Để tạo ra exception", isCorrect: false }
      ]
    },
    {
      term: "Cách tạo ra exception tùy chỉnh?",
      definition: "Tạo exception tùy chỉnh",
      options: [
        { id: "1", text: "raise Exception('message')", isCorrect: true },
        { id: "2", text: "throw Exception('message')", isCorrect: false },
        { id: "3", text: "create Exception('message')", isCorrect: false },
        { id: "4", text: "new Exception('message')", isCorrect: false }
      ]
    }
  ],
  
  "python-10-14": [
    {
      term: "Class trong Python là gì?",
      definition: "Định nghĩa class",
      options: [
        { id: "1", text: "Một khuôn mẫu để tạo ra các đối tượng", isCorrect: true },
        { id: "2", text: "Một biến đặc biệt", isCorrect: false },
        { id: "3", text: "Một hàm đặc biệt", isCorrect: false },
        { id: "4", text: "Một module", isCorrect: false }
      ]
    },
    {
      term: "Cách định nghĩa class trong Python?",
      definition: "Định nghĩa class",
      options: [
        { id: "1", text: "class ClassName:", isCorrect: true },
        { id: "2", text: "class ClassName()", isCorrect: false },
        { id: "3", text: "define ClassName:", isCorrect: false },
        { id: "4", text: "create ClassName:", isCorrect: false }
      ]
    },
    {
      term: "Method __init__ trong Python dùng để làm gì?",
      definition: "Method __init__",
      options: [
        { id: "1", text: "Khởi tạo đối tượng khi được tạo", isCorrect: true },
        { id: "2", text: "Kết thúc đối tượng", isCorrect: false },
        { id: "3", text: "In thông tin đối tượng", isCorrect: false },
        { id: "4", text: "Xóa đối tượng", isCorrect: false }
      ]
    },
    {
      term: "Cách tạo đối tượng từ class?",
      definition: "Tạo đối tượng",
      options: [
        { id: "1", text: "object_name = ClassName()", isCorrect: true },
        { id: "2", text: "object_name = new ClassName()", isCorrect: false },
        { id: "3", text: "object_name = create ClassName()", isCorrect: false },
        { id: "4", text: "object_name = ClassName.new()", isCorrect: false }
      ]
    },
    {
      term: "Cách gọi method của đối tượng?",
      definition: "Gọi method",
      options: [
        { id: "1", text: "object.method()", isCorrect: true },
        { id: "2", text: "object->method()", isCorrect: false },
        { id: "3", text: "object::method()", isCorrect: false },
        { id: "4", text: "method(object)", isCorrect: false }
      ]
    }
  ],
  
  "python-10-15": [
    {
      term: "Inheritance trong Python là gì?",
      definition: "Định nghĩa inheritance",
      options: [
        { id: "1", text: "Class con kế thừa thuộc tính và method từ class cha", isCorrect: true },
        { id: "2", text: "Class cha kế thừa từ class con", isCorrect: false },
        { id: "3", text: "Hai class độc lập với nhau", isCorrect: false },
        { id: "4", text: "Một class duy nhất", isCorrect: false }
      ]
    },
    {
      term: "Cách tạo class con kế thừa từ class cha?",
      definition: "Tạo class con",
      options: [
        { id: "1", text: "class ChildClass(ParentClass):", isCorrect: true },
        { id: "2", text: "class ChildClass extends ParentClass:", isCorrect: false },
        { id: "3", text: "class ChildClass inherits ParentClass:", isCorrect: false },
        { id: "4", text: "class ChildClass from ParentClass:", isCorrect: false }
      ]
    },
    {
      term: "Method overriding trong Python là gì?",
      definition: "Method overriding",
      options: [
        { id: "1", text: "Class con định nghĩa lại method của class cha", isCorrect: true },
        { id: "2", text: "Class cha định nghĩa lại method của class con", isCorrect: false },
        { id: "3", text: "Xóa method của class cha", isCorrect: false },
        { id: "4", text: "Tạo method mới hoàn toàn", isCorrect: false }
      ]
    },
    {
      term: "Cách gọi method của class cha từ class con?",
      definition: "Gọi method class cha",
      options: [
        { id: "1", text: "super().method_name()", isCorrect: true },
        { id: "2", text: "parent().method_name()", isCorrect: false },
        { id: "3", text: "base().method_name()", isCorrect: false },
        { id: "4", text: "ParentClass.method_name()", isCorrect: false }
      ]
    },
    {
      term: "Polymorphism trong Python là gì?",
      definition: "Định nghĩa polymorphism",
      options: [
        { id: "1", text: "Cùng một method có thể có nhiều hình thức khác nhau", isCorrect: true },
        { id: "2", text: "Chỉ có một hình thức duy nhất", isCorrect: false },
        { id: "3", text: "Method không thể thay đổi", isCorrect: false },
        { id: "4", text: "Chỉ có một method duy nhất", isCorrect: false }
      ]
    }
  ],
  
  "python-11-1": [
    {
      term: "Vòng lặp nào dùng để lặp với số lần xác định trong Python?",
      definition: "Vòng lặp for",
      options: [
        { id: "1", text: "for", isCorrect: true },
        { id: "2", text: "while", isCorrect: false },
        { id: "3", text: "loop", isCorrect: false },
        { id: "4", text: "repeat", isCorrect: false }
      ]
    },
    {
      term: "Hàm range(5) tạo ra dãy số nào?",
      definition: "Hàm range()",
      options: [
        { id: "1", text: "0, 1, 2, 3, 4", isCorrect: true },
        { id: "2", text: "1, 2, 3, 4, 5", isCorrect: false },
        { id: "3", text: "0, 1, 2, 3, 4, 5", isCorrect: false },
        { id: "4", text: "5, 4, 3, 2, 1", isCorrect: false }
      ]
    },
    {
      term: "Từ khóa nào dùng để thoát khỏi vòng lặp sớm?",
      definition: "Từ khóa break",
      options: [
        { id: "1", text: "break", isCorrect: true },
        { id: "2", text: "exit", isCorrect: false },
        { id: "3", text: "stop", isCorrect: false },
        { id: "4", text: "end", isCorrect: false }
      ]
    },
    {
      term: "Từ khóa nào dùng để bỏ qua phần còn lại của vòng lặp hiện tại?",
      definition: "Từ khóa continue",
      options: [
        { id: "1", text: "continue", isCorrect: true },
        { id: "2", text: "skip", isCorrect: false },
        { id: "3", text: "next", isCorrect: false },
        { id: "4", text: "pass", isCorrect: false }
      ]
    },
    {
      term: "Vòng lặp while lặp khi nào?",
      definition: "Điều kiện của vòng lặp while",
      options: [
        { id: "1", text: "Khi điều kiện đúng", isCorrect: true },
        { id: "2", text: "Khi điều kiện sai", isCorrect: false },
        { id: "3", text: "Luôn luôn", isCorrect: false },
        { id: "4", text: "Không bao giờ", isCorrect: false }
      ]
    }
  ],
  "python-11-2": [
    {
      term: "List trong Python được khai báo bằng dấu gì?",
      definition: "Cú pháp khai báo list",
      options: [
        { id: "1", text: "[]", isCorrect: true },
        { id: "2", text: "{}", isCorrect: false },
        { id: "3", text: "()", isCorrect: false },
        { id: "4", text: "<>", isCorrect: false }
      ]
    },
    {
      term: "Để thêm phần tử vào cuối list ta dùng phương thức gì?",
      definition: "Phương thức append",
      options: [
        { id: "1", text: "append()", isCorrect: true },
        { id: "2", text: "add()", isCorrect: false },
        { id: "3", text: "insert()", isCorrect: false },
        { id: "4", text: "push()", isCorrect: false }
      ]
    },
    {
      term: "Để xóa phần tử khỏi list ta dùng phương thức gì?",
      definition: "Phương thức xóa phần tử",
      options: [
        { id: "1", text: "remove() hoặc pop()", isCorrect: true },
        { id: "2", text: "delete()", isCorrect: false },
        { id: "3", text: "clear()", isCorrect: false },
        { id: "4", text: "erase()", isCorrect: false }
      ]
    },
    {
      term: "Để lấy độ dài của list ta dùng hàm gì?",
      definition: "Hàm len()",
      options: [
        { id: "1", text: "len()", isCorrect: true },
        { id: "2", text: "length()", isCorrect: false },
        { id: "3", text: "size()", isCorrect: false },
        { id: "4", text: "count()", isCorrect: false }
      ]
    },
    {
      term: "Để truy cập phần tử đầu tiên của list ta dùng chỉ số gì?",
      definition: "Chỉ số phần tử đầu tiên",
      options: [
        { id: "1", text: "0", isCorrect: true },
        { id: "2", text: "1", isCorrect: false },
        { id: "3", text: "-1", isCorrect: false },
        { id: "4", text: "first", isCorrect: false }
      ]
    }
  ],
  "python-11-3": [
    {
      term: "Dictionary trong Python được khai báo bằng dấu gì?",
      definition: "Cú pháp khai báo dictionary",
      options: [
        { id: "1", text: "{}", isCorrect: true },
        { id: "2", text: "[]", isCorrect: false },
        { id: "3", text: "()", isCorrect: false },
        { id: "4", text: "<>", isCorrect: false }
      ]
    },
    {
      term: "Để thêm cặp key-value vào dictionary ta dùng cách nào?",
      definition: "Thêm phần tử vào dictionary",
      options: [
        { id: "1", text: "dict[key] = value", isCorrect: true },
        { id: "2", text: "dict.add(key, value)", isCorrect: false },
        { id: "3", text: "dict.insert(key, value)", isCorrect: false },
        { id: "4", text: "dict.append(key, value)", isCorrect: false }
      ]
    },
    {
      term: "Để lấy tất cả các key trong dictionary ta dùng phương thức gì?",
      definition: "Phương thức keys()",
      options: [
        { id: "1", text: "keys()", isCorrect: true },
        { id: "2", text: "get_keys()", isCorrect: false },
        { id: "3", text: "all_keys()", isCorrect: false },
        { id: "4", text: "key_list()", isCorrect: false }
      ]
    },
    {
      term: "Để lấy tất cả các value trong dictionary ta dùng phương thức gì?",
      definition: "Phương thức values()",
      options: [
        { id: "1", text: "values()", isCorrect: true },
        { id: "2", text: "get_values()", isCorrect: false },
        { id: "3", text: "all_values()", isCorrect: false },
        { id: "4", text: "value_list()", isCorrect: false }
      ]
    },
    {
      term: "Để kiểm tra key có tồn tại trong dictionary ta dùng từ khóa gì?",
      definition: "Kiểm tra key trong dictionary",
      options: [
        { id: "1", text: "in", isCorrect: true },
        { id: "2", text: "has", isCorrect: false },
        { id: "3", text: "exists", isCorrect: false },
        { id: "4", text: "contains", isCorrect: false }
      ]
    }
  ],
  "python-11-4": [
    {
      term: "Để đọc dữ liệu từ file trong Python ta dùng chế độ gì?",
      definition: "Chế độ đọc file",
      options: [
        { id: "1", text: "'r'", isCorrect: true },
        { id: "2", text: "'w'", isCorrect: false },
        { id: "3", text: "'a'", isCorrect: false },
        { id: "4", text: "'x'", isCorrect: false }
      ]
    },
    {
      term: "Để ghi dữ liệu vào file trong Python ta dùng chế độ gì?",
      definition: "Chế độ ghi file",
      options: [
        { id: "1", text: "'w'", isCorrect: true },
        { id: "2", text: "'r'", isCorrect: false },
        { id: "3", text: "'a'", isCorrect: false },
        { id: "4", text: "'x'", isCorrect: false }
      ]
    },
    {
      term: "Để thêm dữ liệu vào cuối file ta dùng chế độ gì?",
      definition: "Chế độ append file",
      options: [
        { id: "1", text: "'a'", isCorrect: true },
        { id: "2", text: "'w'", isCorrect: false },
        { id: "3", text: "'r'", isCorrect: false },
        { id: "4", text: "'x'", isCorrect: false }
      ]
    },
    {
      term: "Hàm nào dùng để đọc toàn bộ nội dung file thành chuỗi?",
      definition: "Đọc toàn bộ file",
      options: [
        { id: "1", text: "read()", isCorrect: true },
        { id: "2", text: "readline()", isCorrect: false },
        { id: "3", text: "readlines()", isCorrect: false },
        { id: "4", text: "get()", isCorrect: false }
      ]
    },
    {
      term: "Hàm nào dùng để đọc file theo từng dòng?",
      definition: "Đọc file theo dòng",
      options: [
        { id: "1", text: "readlines()", isCorrect: true },
        { id: "2", text: "read()", isCorrect: false },
        { id: "3", text: "readline()", isCorrect: false },
        { id: "4", text: "getlines()", isCorrect: false }
      ]
    }
  ],
  
  "python-11-5": [
    {
      term: "Tuple trong Python là gì?",
      definition: "Định nghĩa tuple",
      options: [
        { id: "1", text: "Một tập hợp có thứ tự, không thể thay đổi", isCorrect: true },
        { id: "2", text: "Một tập hợp có thể thay đổi", isCorrect: false },
        { id: "3", text: "Một tập hợp không có thứ tự", isCorrect: false },
        { id: "4", text: "Một cặp key-value", isCorrect: false }
      ]
    },
    {
      term: "Cách tạo tuple trong Python?",
      definition: "Tạo tuple",
      options: [
        { id: "1", text: "my_tuple = (1, 2, 3)", isCorrect: true },
        { id: "2", text: "my_tuple = [1, 2, 3]", isCorrect: false },
        { id: "3", text: "my_tuple = {1, 2, 3}", isCorrect: false },
        { id: "4", text: "my_tuple = {1: 'a', 2: 'b'}", isCorrect: false }
      ]
    },
    {
      term: "Set trong Python là gì?",
      definition: "Định nghĩa set",
      options: [
        { id: "1", text: "Một tập hợp không có thứ tự, không trùng lặp", isCorrect: true },
        { id: "2", text: "Một tập hợp có thứ tự", isCorrect: false },
        { id: "3", text: "Một tập hợp có thể trùng lặp", isCorrect: false },
        { id: "4", text: "Một cặp key-value", isCorrect: false }
      ]
    },
    {
      term: "Cách tạo set trong Python?",
      definition: "Tạo set",
      options: [
        { id: "1", text: "my_set = {1, 2, 3}", isCorrect: true },
        { id: "2", text: "my_set = (1, 2, 3)", isCorrect: false },
        { id: "3", text: "my_set = [1, 2, 3]", isCorrect: false },
        { id: "4", text: "my_set = {1: 'a', 2: 'b'}", isCorrect: false }
      ]
    },
    {
      term: "Cách thêm phần tử vào set?",
      definition: "Thêm phần tử vào set",
      options: [
        { id: "1", text: "my_set.add(item)", isCorrect: true },
        { id: "2", text: "my_set.append(item)", isCorrect: false },
        { id: "3", text: "my_set.insert(item)", isCorrect: false },
        { id: "4", text: "my_set.push(item)", isCorrect: false }
      ]
    }
  ],
  
  "python-11-6": [
    {
      term: "List comprehension trong Python là gì?",
      definition: "Định nghĩa list comprehension",
      options: [
        { id: "1", text: "Cách tạo list ngắn gọn từ iterable", isCorrect: true },
        { id: "2", text: "Cách tạo list dài dòng", isCorrect: false },
        { id: "3", text: "Cách xóa list", isCorrect: false },
        { id: "4", text: "Cách sắp xếp list", isCorrect: false }
      ]
    },
    {
      term: "Cú pháp list comprehension đúng là gì?",
      definition: "Cú pháp list comprehension",
      options: [
        { id: "1", text: "[expression for item in iterable]", isCorrect: true },
        { id: "2", text: "[item for expression in iterable]", isCorrect: false },
        { id: "3", text: "[iterable for item in expression]", isCorrect: false },
        { id: "4", text: "[for item in iterable expression]", isCorrect: false }
      ]
    },
    {
      term: "Dictionary comprehension trong Python là gì?",
      definition: "Định nghĩa dictionary comprehension",
      options: [
        { id: "1", text: "Cách tạo dictionary ngắn gọn từ iterable", isCorrect: true },
        { id: "2", text: "Cách tạo dictionary dài dòng", isCorrect: false },
        { id: "3", text: "Cách xóa dictionary", isCorrect: false },
        { id: "4", text: "Cách sắp xếp dictionary", isCorrect: false }
      ]
    },
    {
      term: "Cú pháp dictionary comprehension đúng là gì?",
      definition: "Cú pháp dictionary comprehension",
      options: [
        { id: "1", text: "{key: value for item in iterable}", isCorrect: true },
        { id: "2", text: "{item for key: value in iterable}", isCorrect: false },
        { id: "3", text: "{iterable for key: value in item}", isCorrect: false },
        { id: "4", text: "{for key: value in iterable item}", isCorrect: false }
      ]
    },
    {
      term: "Set comprehension trong Python là gì?",
      definition: "Định nghĩa set comprehension",
      options: [
        { id: "1", text: "Cách tạo set ngắn gọn từ iterable", isCorrect: true },
        { id: "2", text: "Cách tạo set dài dòng", isCorrect: false },
        { id: "3", text: "Cách xóa set", isCorrect: false },
        { id: "4", text: "Cách sắp xếp set", isCorrect: false }
      ]
    }
  ],
  
  "python-11-7": [
    {
      term: "Lambda function trong Python là gì?",
      definition: "Định nghĩa lambda function",
      options: [
        { id: "1", text: "Hàm ẩn danh, ngắn gọn", isCorrect: true },
        { id: "2", text: "Hàm dài dòng", isCorrect: false },
        { id: "3", text: "Hàm không có tên", isCorrect: false },
        { id: "4", text: "Hàm không thể sử dụng", isCorrect: false }
      ]
    },
    {
      term: "Cú pháp lambda function đúng là gì?",
      definition: "Cú pháp lambda function",
      options: [
        { id: "1", text: "lambda x: x * 2", isCorrect: true },
        { id: "2", text: "lambda (x): x * 2", isCorrect: false },
        { id: "3", text: "lambda x => x * 2", isCorrect: false },
        { id: "4", text: "lambda x -> x * 2", isCorrect: false }
      ]
    },
    {
      term: "Map function trong Python dùng để làm gì?",
      definition: "Định nghĩa map function",
      options: [
        { id: "1", text: "Áp dụng hàm cho tất cả phần tử trong iterable", isCorrect: true },
        { id: "2", text: "Lọc các phần tử", isCorrect: false },
        { id: "3", text: "Sắp xếp các phần tử", isCorrect: false },
        { id: "4", text: "Xóa các phần tử", isCorrect: false }
      ]
    },
    {
      term: "Filter function trong Python dùng để làm gì?",
      definition: "Định nghĩa filter function",
      options: [
        { id: "1", text: "Lọc các phần tử thỏa mãn điều kiện", isCorrect: true },
        { id: "2", text: "Áp dụng hàm cho tất cả phần tử", isCorrect: false },
        { id: "3", text: "Sắp xếp các phần tử", isCorrect: false },
        { id: "4", text: "Xóa các phần tử", isCorrect: false }
      ]
    },
    {
      term: "Reduce function trong Python dùng để làm gì?",
      definition: "Định nghĩa reduce function",
      options: [
        { id: "1", text: "Kết hợp tất cả phần tử thành một giá trị", isCorrect: true },
        { id: "2", text: "Lọc các phần tử", isCorrect: false },
        { id: "3", text: "Sắp xếp các phần tử", isCorrect: false },
        { id: "4", text: "Xóa các phần tử", isCorrect: false }
      ]
    }
  ],
  
  "python-11-8": [
    {
      term: "Generator trong Python là gì?",
      definition: "Định nghĩa generator",
      options: [
        { id: "1", text: "Hàm tạo ra iterator một cách lazy", isCorrect: true },
        { id: "2", text: "Hàm tạo ra list", isCorrect: false },
        { id: "3", text: "Hàm tạo ra dictionary", isCorrect: false },
        { id: "4", text: "Hàm tạo ra set", isCorrect: false }
      ]
    },
    {
      term: "Cách tạo generator trong Python?",
      definition: "Tạo generator",
      options: [
        { id: "1", text: "Sử dụng yield thay vì return", isCorrect: true },
        { id: "2", text: "Sử dụng return thay vì yield", isCorrect: false },
        { id: "3", text: "Sử dụng print", isCorrect: false },
        { id: "4", text: "Sử dụng input", isCorrect: false }
      ]
    },
    {
      term: "Generator expression trong Python là gì?",
      definition: "Định nghĩa generator expression",
      options: [
        { id: "1", text: "Cách tạo generator ngắn gọn", isCorrect: true },
        { id: "2", text: "Cách tạo list ngắn gọn", isCorrect: false },
        { id: "3", text: "Cách tạo dictionary ngắn gọn", isCorrect: false },
        { id: "4", text: "Cách tạo set ngắn gọn", isCorrect: false }
      ]
    },
    {
      term: "Cú pháp generator expression đúng là gì?",
      definition: "Cú pháp generator expression",
      options: [
        { id: "1", text: "(expression for item in iterable)", isCorrect: true },
        { id: "2", text: "[expression for item in iterable]", isCorrect: false },
        { id: "3", text: "{expression for item in iterable}", isCorrect: false },
        { id: "4", text: "<expression for item in iterable>", isCorrect: false }
      ]
    },
    {
      term: "Lợi ích của generator là gì?",
      definition: "Lợi ích của generator",
      options: [
        { id: "1", text: "Tiết kiệm bộ nhớ, lazy evaluation", isCorrect: true },
        { id: "2", text: "Tốn nhiều bộ nhớ", isCorrect: false },
        { id: "3", text: "Chạy nhanh hơn list", isCorrect: false },
        { id: "4", text: "Dễ sử dụng hơn list", isCorrect: false }
      ]
    }
  ],
  
  "python-11-9": [
    {
      term: "Decorator trong Python là gì?",
      definition: "Định nghĩa decorator",
      options: [
        { id: "1", text: "Hàm bọc quanh hàm khác để mở rộng chức năng", isCorrect: true },
        { id: "2", text: "Hàm bọc quanh class", isCorrect: false },
        { id: "3", text: "Hàm bọc quanh module", isCorrect: false },
        { id: "4", text: "Hàm bọc quanh variable", isCorrect: false }
      ]
    },
    {
      term: "Cú pháp decorator đúng là gì?",
      definition: "Cú pháp decorator",
      options: [
        { id: "1", text: "@decorator_name", isCorrect: true },
        { id: "2", text: "#decorator_name", isCorrect: false },
        { id: "3", text: "$decorator_name", isCorrect: false },
        { id: "4", text: "&decorator_name", isCorrect: false }
      ]
    },
    {
      term: "Cách tạo decorator trong Python?",
      definition: "Tạo decorator",
      options: [
        { id: "1", text: "Tạo hàm nhận function làm tham số", isCorrect: true },
        { id: "2", text: "Tạo hàm nhận class làm tham số", isCorrect: false },
        { id: "3", text: "Tạo hàm nhận module làm tham số", isCorrect: false },
        { id: "4", text: "Tạo hàm nhận variable làm tham số", isCorrect: false }
      ]
    },
    {
      term: "Built-in decorator @property dùng để làm gì?",
      definition: "Decorator @property",
      options: [
        { id: "1", text: "Tạo property từ method", isCorrect: true },
        { id: "2", text: "Tạo method từ property", isCorrect: false },
        { id: "3", text: "Tạo class từ method", isCorrect: false },
        { id: "4", text: "Tạo module từ method", isCorrect: false }
      ]
    },
    {
      term: "Built-in decorator @staticmethod dùng để làm gì?",
      definition: "Decorator @staticmethod",
      options: [
        { id: "1", text: "Tạo static method không cần self", isCorrect: true },
        { id: "2", text: "Tạo instance method cần self", isCorrect: false },
        { id: "3", text: "Tạo class method cần cls", isCorrect: false },
        { id: "4", text: "Tạo property method", isCorrect: false }
      ]
    }
  ],
  
  "python-11-10": [
    {
      term: "Context manager trong Python là gì?",
      definition: "Định nghĩa context manager",
      options: [
        { id: "1", text: "Quản lý tài nguyên với with statement", isCorrect: true },
        { id: "2", text: "Quản lý tài nguyên với if statement", isCorrect: false },
        { id: "3", text: "Quản lý tài nguyên với for statement", isCorrect: false },
        { id: "4", text: "Quản lý tài nguyên với while statement", isCorrect: false }
      ]
    },
    {
      term: "Cú pháp with statement đúng là gì?",
      definition: "Cú pháp with statement",
      options: [
        { id: "1", text: "with open('file.txt') as f:", isCorrect: true },
        { id: "2", text: "with open('file.txt') f:", isCorrect: false },
        { id: "3", text: "with open('file.txt') in f:", isCorrect: false },
        { id: "4", text: "with open('file.txt') from f:", isCorrect: false }
      ]
    },
    {
      term: "Magic methods __enter__ và __exit__ dùng để làm gì?",
      definition: "Magic methods context manager",
      options: [
        { id: "1", text: "Định nghĩa context manager", isCorrect: true },
        { id: "2", text: "Định nghĩa iterator", isCorrect: false },
        { id: "3", text: "Định nghĩa generator", isCorrect: false },
        { id: "4", text: "Định nghĩa decorator", isCorrect: false }
      ]
    },
    {
      term: "Lợi ích của context manager là gì?",
      definition: "Lợi ích context manager",
      options: [
        { id: "1", text: "Tự động quản lý tài nguyên, cleanup", isCorrect: true },
        { id: "2", text: "Tốn nhiều tài nguyên", isCorrect: false },
        { id: "3", text: "Khó sử dụng", isCorrect: false },
        { id: "4", text: "Chỉ dùng cho file", isCorrect: false }
      ]
    },
    {
      term: "contextlib.contextmanager decorator dùng để làm gì?",
      definition: "contextlib.contextmanager",
      options: [
        { id: "1", text: "Tạo context manager từ generator", isCorrect: true },
        { id: "2", text: "Tạo context manager từ function", isCorrect: false },
        { id: "3", text: "Tạo context manager từ class", isCorrect: false },
        { id: "4", text: "Tạo context manager từ module", isCorrect: false }
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

// Toán học - Đầy đủ câu hỏi
const toanHocQuestions: { [key: string]: Question[] } = {
  "toan-hoc-10-1": [
    {
      term: "Tập hợp là gì?",
      definition: "Định nghĩa tập hợp",
      options: [
        { id: "1", text: "Một nhóm các đối tượng có cùng tính chất", isCorrect: true },
        { id: "2", text: "Chỉ là các số tự nhiên", isCorrect: false },
        { id: "3", text: "Chỉ là các số nguyên", isCorrect: false },
        { id: "4", text: "Chỉ là các số thực", isCorrect: false }
      ]
    },
    {
      term: "Mệnh đề là gì?",
      definition: "Định nghĩa mệnh đề",
      options: [
        { id: "1", text: "Một câu khẳng định có thể xác định được tính đúng sai", isCorrect: true },
        { id: "2", text: "Chỉ là câu hỏi", isCorrect: false },
        { id: "3", text: "Chỉ là câu cảm thán", isCorrect: false },
        { id: "4", text: "Chỉ là câu mệnh lệnh", isCorrect: false }
      ]
    },
    {
      term: "Phủ định của mệnh đề P được ký hiệu là gì?",
      definition: "Ký hiệu phủ định",
      options: [
        { id: "1", text: "¬P hoặc P̄", isCorrect: true },
        { id: "2", text: "P'", isCorrect: false },
        { id: "3", text: "~P", isCorrect: false },
        { id: "4", text: "P*", isCorrect: false }
      ]
    },
    {
      term: "Mệnh đề kéo theo P ⇒ Q có nghĩa là gì?",
      definition: "Mệnh đề kéo theo",
      options: [
        { id: "1", text: "Nếu P thì Q", isCorrect: true },
        { id: "2", text: "P và Q", isCorrect: false },
        { id: "3", text: "P hoặc Q", isCorrect: false },
        { id: "4", text: "P khác Q", isCorrect: false }
      ]
    },
    {
      term: "Mệnh đề tương đương P ⇔ Q có nghĩa là gì?",
      definition: "Mệnh đề tương đương",
      options: [
        { id: "1", text: "P khi và chỉ khi Q", isCorrect: true },
        { id: "2", text: "P hoặc Q", isCorrect: false },
        { id: "3", text: "P và Q", isCorrect: false },
        { id: "4", text: "P khác Q", isCorrect: false }
      ]
    }
  ],
  
  "toan-hoc-10-2": [
    {
      term: "Hàm số bậc nhất có dạng tổng quát là gì?",
      definition: "Dạng tổng quát hàm số bậc nhất",
      options: [
        { id: "1", text: "y = ax + b (a ≠ 0)", isCorrect: true },
        { id: "2", text: "y = ax² + bx + c", isCorrect: false },
        { id: "3", text: "y = a/x", isCorrect: false },
        { id: "4", text: "y = √x", isCorrect: false }
      ]
    },
    {
      term: "Đồ thị của hàm số bậc nhất là gì?",
      definition: "Đồ thị hàm số bậc nhất",
      options: [
        { id: "1", text: "Một đường thẳng", isCorrect: true },
        { id: "2", text: "Một parabol", isCorrect: false },
        { id: "3", text: "Một hyperbol", isCorrect: false },
        { id: "4", text: "Một đường tròn", isCorrect: false }
      ]
    },
    {
      term: "Hệ số góc của đường thẳng y = 2x + 3 là gì?",
      definition: "Hệ số góc",
      options: [
        { id: "1", text: "2", isCorrect: true },
        { id: "2", text: "3", isCorrect: false },
        { id: "3", text: "5", isCorrect: false },
        { id: "4", text: "6", isCorrect: false }
      ]
    },
    {
      term: "Đường thẳng y = -x + 1 có hệ số góc là gì?",
      definition: "Hệ số góc âm",
      options: [
        { id: "1", text: "-1", isCorrect: true },
        { id: "2", text: "1", isCorrect: false },
        { id: "3", text: "0", isCorrect: false },
        { id: "4", text: "2", isCorrect: false }
      ]
    },
    {
      term: "Hai đường thẳng song song khi nào?",
      definition: "Điều kiện song song",
      options: [
        { id: "1", text: "Có cùng hệ số góc và khác tung độ gốc", isCorrect: true },
        { id: "2", text: "Có cùng tung độ gốc", isCorrect: false },
        { id: "3", text: "Có hệ số góc khác nhau", isCorrect: false },
        { id: "4", text: "Có cùng hệ số góc", isCorrect: false }
      ]
    }
  ],
  
  "toan-hoc-10-3": [
    {
      term: "Hàm số bậc hai có dạng tổng quát là gì?",
      definition: "Dạng tổng quát hàm số bậc hai",
      options: [
        { id: "1", text: "y = ax² + bx + c (a ≠ 0)", isCorrect: true },
        { id: "2", text: "y = ax + b", isCorrect: false },
        { id: "3", text: "y = a/x", isCorrect: false },
        { id: "4", text: "y = √x", isCorrect: false }
      ]
    },
    {
      term: "Đồ thị của hàm số bậc hai là gì?",
      definition: "Đồ thị hàm số bậc hai",
      options: [
        { id: "1", text: "Một parabol", isCorrect: true },
        { id: "2", text: "Một đường thẳng", isCorrect: false },
        { id: "3", text: "Một hyperbol", isCorrect: false },
        { id: "4", text: "Một đường tròn", isCorrect: false }
      ]
    },
    {
      term: "Đỉnh của parabol y = ax² + bx + c có tọa độ là gì?",
      definition: "Tọa độ đỉnh parabol",
      options: [
        { id: "1", text: "(-b/2a, -Δ/4a)", isCorrect: true },
        { id: "2", text: "(b/2a, Δ/4a)", isCorrect: false },
        { id: "3", text: "(-b/a, -c/a)", isCorrect: false },
        { id: "4", text: "(b/a, c/a)", isCorrect: false }
      ]
    },
    {
      term: "Parabol y = x² - 4x + 3 có đỉnh tại điểm nào?",
      definition: "Tìm đỉnh parabol cụ thể",
      options: [
        { id: "1", text: "(2, -1)", isCorrect: true },
        { id: "2", text: "(-2, 1)", isCorrect: false },
        { id: "3", text: "(4, 3)", isCorrect: false },
        { id: "4", text: "(-4, -3)", isCorrect: false }
      ]
    },
    {
      term: "Parabol y = -x² + 2x - 1 có hướng như thế nào?",
      definition: "Hướng của parabol",
      options: [
        { id: "1", text: "Quay xuống dưới (a < 0)", isCorrect: true },
        { id: "2", text: "Quay lên trên (a > 0)", isCorrect: false },
        { id: "3", text: "Nằm ngang", isCorrect: false },
        { id: "4", text: "Thẳng đứng", isCorrect: false }
      ]
    }
  ],
  
  "toan-hoc-10-4": [
    {
      term: "Phương trình bậc nhất một ẩn có dạng tổng quát là gì?",
      definition: "Dạng tổng quát phương trình bậc nhất",
      options: [
        { id: "1", text: "ax + b = 0 (a ≠ 0)", isCorrect: true },
        { id: "2", text: "ax² + bx + c = 0", isCorrect: false },
        { id: "3", text: "ax³ + bx² + cx + d = 0", isCorrect: false },
        { id: "4", text: "a/x + b = 0", isCorrect: false }
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
      term: "Hệ phương trình bậc nhất hai ẩn có dạng tổng quát là gì?",
      definition: "Dạng tổng quát hệ phương trình",
      options: [
        { id: "1", text: "a₁x + b₁y = c₁ và a₂x + b₂y = c₂", isCorrect: true },
        { id: "2", text: "ax² + by² = c", isCorrect: false },
        { id: "3", text: "ax + by + cz = d", isCorrect: false },
        { id: "4", text: "a/x + b/y = c", isCorrect: false }
      ]
    },
    {
      term: "Phương pháp thế trong giải hệ phương trình là gì?",
      definition: "Phương pháp thế",
      options: [
        { id: "1", text: "Biểu diễn một ẩn theo ẩn kia rồi thế vào phương trình còn lại", isCorrect: true },
        { id: "2", text: "Cộng hoặc trừ hai phương trình", isCorrect: false },
        { id: "3", text: "Nhân hoặc chia hai phương trình", isCorrect: false },
        { id: "4", text: "Đặt ẩn phụ", isCorrect: false }
      ]
    },
    {
      term: "Nghiệm của hệ phương trình x + y = 5 và x - y = 1 là gì?",
      definition: "Giải hệ phương trình cụ thể",
      options: [
        { id: "1", text: "x = 3, y = 2", isCorrect: true },
        { id: "2", text: "x = 2, y = 3", isCorrect: false },
        { id: "3", text: "x = 4, y = 1", isCorrect: false },
        { id: "4", text: "x = 1, y = 4", isCorrect: false }
      ]
    }
  ],
  
  "toan-hoc-10-5": [
    {
      term: "Bất phương trình bậc nhất một ẩn có dạng tổng quát là gì?",
      definition: "Dạng tổng quát bất phương trình bậc nhất",
      options: [
        { id: "1", text: "ax + b > 0, ax + b < 0, ax + b ≥ 0, ax + b ≤ 0 (a ≠ 0)", isCorrect: true },
        { id: "2", text: "ax² + bx + c > 0", isCorrect: false },
        { id: "3", text: "ax³ + bx² + cx + d > 0", isCorrect: false },
        { id: "4", text: "a/x + b > 0", isCorrect: false }
      ]
    },
    {
      term: "Nghiệm của bất phương trình 3x - 6 > 0 là gì?",
      definition: "Giải bất phương trình bậc nhất",
      options: [
        { id: "1", text: "x > 2", isCorrect: true },
        { id: "2", text: "x < 2", isCorrect: false },
        { id: "3", text: "x > -2", isCorrect: false },
        { id: "4", text: "x < -2", isCorrect: false }
      ]
    },
    {
      term: "Khi nhân hai vế của bất phương trình với số âm thì điều gì xảy ra?",
      definition: "Quy tắc nhân với số âm",
      options: [
        { id: "1", text: "Chiều bất phương trình đổi ngược", isCorrect: true },
        { id: "2", text: "Chiều bất phương trình không đổi", isCorrect: false },
        { id: "3", text: "Bất phương trình trở thành phương trình", isCorrect: false },
        { id: "4", text: "Bất phương trình vô nghiệm", isCorrect: false }
      ]
    },
    {
      term: "Tập nghiệm của bất phương trình -2x + 4 ≤ 0 là gì?",
      definition: "Tìm tập nghiệm bất phương trình",
      options: [
        { id: "1", text: "x ≥ 2", isCorrect: true },
        { id: "2", text: "x ≤ 2", isCorrect: false },
        { id: "3", text: "x ≥ -2", isCorrect: false },
        { id: "4", text: "x ≤ -2", isCorrect: false }
      ]
    },
    {
      term: "Hệ bất phương trình bậc nhất một ẩn là gì?",
      definition: "Định nghĩa hệ bất phương trình",
      options: [
        { id: "1", text: "Tập hợp các bất phương trình bậc nhất cùng ẩn", isCorrect: true },
        { id: "2", text: "Chỉ có một bất phương trình", isCorrect: false },
        { id: "3", text: "Các bất phương trình khác ẩn", isCorrect: false },
        { id: "4", text: "Các phương trình bậc nhất", isCorrect: false }
      ]
    }
  ],
  
  "python-11-11": [
    {
      term: "Bài học Python 11-11",
      definition: "Nội dung bài học Python 11-11",
      options: [
        { id: "1", text: "Đáp án đúng", isCorrect: true },
        { id: "2", text: "Đáp án sai 1", isCorrect: false },
        { id: "3", text: "Đáp án sai 2", isCorrect: false },
        { id: "4", text: "Đáp án sai 3", isCorrect: false }
      ]
    }
  ],

  "python-11-12": [
    {
      term: "Bài học Python 11-12",
      definition: "Nội dung bài học Python 11-12",
      options: [
        { id: "1", text: "Đáp án đúng", isCorrect: true },
        { id: "2", text: "Đáp án sai 1", isCorrect: false },
        { id: "3", text: "Đáp án sai 2", isCorrect: false },
        { id: "4", text: "Đáp án sai 3", isCorrect: false }
      ]
    }
  ],

  "python-11-13": [
    {
      term: "Bài học Python 11-13",
      definition: "Nội dung bài học Python 11-13",
      options: [
        { id: "1", text: "Đáp án đúng", isCorrect: true },
        { id: "2", text: "Đáp án sai 1", isCorrect: false },
        { id: "3", text: "Đáp án sai 2", isCorrect: false },
        { id: "4", text: "Đáp án sai 3", isCorrect: false }
      ]
    }
  ],

  "python-11-14": [
    {
      term: "Bài học Python 11-14",
      definition: "Nội dung bài học Python 11-14",
      options: [
        { id: "1", text: "Đáp án đúng", isCorrect: true },
        { id: "2", text: "Đáp án sai 1", isCorrect: false },
        { id: "3", text: "Đáp án sai 2", isCorrect: false },
        { id: "4", text: "Đáp án sai 3", isCorrect: false }
      ]
    }
  ],

  "python-11-15": [
    {
      term: "Bài học Python 11-15",
      definition: "Nội dung bài học Python 11-15",
      options: [
        { id: "1", text: "Đáp án đúng", isCorrect: true },
        { id: "2", text: "Đáp án sai 1", isCorrect: false },
        { id: "3", text: "Đáp án sai 2", isCorrect: false },
        { id: "4", text: "Đáp án sai 3", isCorrect: false }
      ]
    }
  ],

  "python-12-1": [
    {
      term: "Bài học Python 12-1",
      definition: "Nội dung bài học Python 12-1",
      options: [
        { id: "1", text: "Đáp án đúng", isCorrect: true },
        { id: "2", text: "Đáp án sai 1", isCorrect: false },
        { id: "3", text: "Đáp án sai 2", isCorrect: false },
        { id: "4", text: "Đáp án sai 3", isCorrect: false }
      ]
    }
  ],

  "python-12-2": [
    {
      term: "Bài học Python 12-2",
      definition: "Nội dung bài học Python 12-2",
      options: [
        { id: "1", text: "Đáp án đúng", isCorrect: true },
        { id: "2", text: "Đáp án sai 1", isCorrect: false },
        { id: "3", text: "Đáp án sai 2", isCorrect: false },
        { id: "4", text: "Đáp án sai 3", isCorrect: false }
      ]
    }
  ],

  "python-12-3": [
    {
      term: "Bài học Python 12-3",
      definition: "Nội dung bài học Python 12-3",
      options: [
        { id: "1", text: "Đáp án đúng", isCorrect: true },
        { id: "2", text: "Đáp án sai 1", isCorrect: false },
        { id: "3", text: "Đáp án sai 2", isCorrect: false },
        { id: "4", text: "Đáp án sai 3", isCorrect: false }
      ]
    }
  ],

  "python-12-4": [
    {
      term: "Bài học Python 12-4",
      definition: "Nội dung bài học Python 12-4",
      options: [
        { id: "1", text: "Đáp án đúng", isCorrect: true },
        { id: "2", text: "Đáp án sai 1", isCorrect: false },
        { id: "3", text: "Đáp án sai 2", isCorrect: false },
        { id: "4", text: "Đáp án sai 3", isCorrect: false }
      ]
    }
  ],

  "python-12-5": [
    {
      term: "Bài học Python 12-5",
      definition: "Nội dung bài học Python 12-5",
      options: [
        { id: "1", text: "Đáp án đúng", isCorrect: true },
        { id: "2", text: "Đáp án sai 1", isCorrect: false },
        { id: "3", text: "Đáp án sai 2", isCorrect: false },
        { id: "4", text: "Đáp án sai 3", isCorrect: false }
      ]
    }
  ],

  "python-12-6": [
    {
      term: "Bài học Python 12-6",
      definition: "Nội dung bài học Python 12-6",
      options: [
        { id: "1", text: "Đáp án đúng", isCorrect: true },
        { id: "2", text: "Đáp án sai 1", isCorrect: false },
        { id: "3", text: "Đáp án sai 2", isCorrect: false },
        { id: "4", text: "Đáp án sai 3", isCorrect: false }
      ]
    }
  ],

  "python-12-7": [
    {
      term: "Bài học Python 12-7",
      definition: "Nội dung bài học Python 12-7",
      options: [
        { id: "1", text: "Đáp án đúng", isCorrect: true },
        { id: "2", text: "Đáp án sai 1", isCorrect: false },
        { id: "3", text: "Đáp án sai 2", isCorrect: false },
        { id: "4", text: "Đáp án sai 3", isCorrect: false }
      ]
    }
  ],

  "python-12-8": [
    {
      term: "Bài học Python 12-8",
      definition: "Nội dung bài học Python 12-8",
      options: [
        { id: "1", text: "Đáp án đúng", isCorrect: true },
        { id: "2", text: "Đáp án sai 1", isCorrect: false },
        { id: "3", text: "Đáp án sai 2", isCorrect: false },
        { id: "4", text: "Đáp án sai 3", isCorrect: false }
      ]
    }
  ],

  "python-12-9": [
    {
      term: "Bài học Python 12-9",
      definition: "Nội dung bài học Python 12-9",
      options: [
        { id: "1", text: "Đáp án đúng", isCorrect: true },
        { id: "2", text: "Đáp án sai 1", isCorrect: false },
        { id: "3", text: "Đáp án sai 2", isCorrect: false },
        { id: "4", text: "Đáp án sai 3", isCorrect: false }
      ]
    }
  ],

  "python-12-10": [
    {
      term: "Bài học Python 12-10",
      definition: "Nội dung bài học Python 12-10",
      options: [
        { id: "1", text: "Đáp án đúng", isCorrect: true },
        { id: "2", text: "Đáp án sai 1", isCorrect: false },
        { id: "3", text: "Đáp án sai 2", isCorrect: false },
        { id: "4", text: "Đáp án sai 3", isCorrect: false }
      ]
    }
  ],

  "python-12-11": [
    {
      term: "Bài học Python 12-11",
      definition: "Nội dung bài học Python 12-11",
      options: [
        { id: "1", text: "Đáp án đúng", isCorrect: true },
        { id: "2", text: "Đáp án sai 1", isCorrect: false },
        { id: "3", text: "Đáp án sai 2", isCorrect: false },
        { id: "4", text: "Đáp án sai 3", isCorrect: false }
      ]
    }
  ],

  "python-12-12": [
    {
      term: "Bài học Python 12-12",
      definition: "Nội dung bài học Python 12-12",
      options: [
        { id: "1", text: "Đáp án đúng", isCorrect: true },
        { id: "2", text: "Đáp án sai 1", isCorrect: false },
        { id: "3", text: "Đáp án sai 2", isCorrect: false },
        { id: "4", text: "Đáp án sai 3", isCorrect: false }
      ]
    }
  ],

  "python-12-13": [
    {
      term: "Bài học Python 12-13",
      definition: "Nội dung bài học Python 12-13",
      options: [
        { id: "1", text: "Đáp án đúng", isCorrect: true },
        { id: "2", text: "Đáp án sai 1", isCorrect: false },
        { id: "3", text: "Đáp án sai 2", isCorrect: false },
        { id: "4", text: "Đáp án sai 3", isCorrect: false }
      ]
    }
  ],

  "python-12-14": [
    {
      term: "Bài học Python 12-14",
      definition: "Nội dung bài học Python 12-14",
      options: [
        { id: "1", text: "Đáp án đúng", isCorrect: true },
        { id: "2", text: "Đáp án sai 1", isCorrect: false },
        { id: "3", text: "Đáp án sai 2", isCorrect: false },
        { id: "4", text: "Đáp án sai 3", isCorrect: false }
      ]
    }
  ],

  "python-12-15": [
    {
      term: "Bài học Python 12-15",
      definition: "Nội dung bài học Python 12-15",
      options: [
        { id: "1", text: "Đáp án đúng", isCorrect: true },
        { id: "2", text: "Đáp án sai 1", isCorrect: false },
        { id: "3", text: "Đáp án sai 2", isCorrect: false },
        { id: "4", text: "Đáp án sai 3", isCorrect: false }
      ]
    }
  ]
};

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