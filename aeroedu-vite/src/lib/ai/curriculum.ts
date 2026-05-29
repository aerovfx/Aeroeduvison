/**
 * AI curriculum — HÀNH TRÌNH AI: TỪ MÁY GIẢI MÃ ĐẾN TRÍ TUỆ TƯƠNG LAI.
 *
 * Du hành theo dòng lịch sử công nghệ tính toán → trí tuệ nhân tạo:
 *   🔐 Bombe/Colossus (Anh, Turing) → 🧠 Máy Turing & Turing Test →
 *   🏢 IBM & Dartmouth (khai sinh "AI") → ❄️ Mùa đông AI → 💻 PC & Deep Blue →
 *   🖧 Siêu máy tính & Big Data → ⚡ Deep Learning (AlexNet+GPU) →
 *   👁️ CNN (thị giác máy) → 🔁 Transformer → 💬 LLM (GPT/Claude) →
 *   ⚛️ Máy tính lượng tử → 🚀 AGI & Tương lai AI.
 * Mỗi chặng = 1 bài trắc nghiệm phổ cập (dễ hiểu cho HS/PH/GV) + giải thích.
 * Khoá tuần tự, XP/streak/sao. Hỗ trợ $...$ LaTeX (KaTeX) trong prompt/options/explain.
 */

export interface AIQuestion {
  id: string
  prompt: string
  options: string[]
  correctIdx: number
  explain: string
}

export interface AILesson {
  id: string
  title: string
  icon: string
  questions: AIQuestion[]
}

export interface AIStop {
  id: string
  place: string        // nhãn ngắn EN
  placeVi: string      // tên mốc/cột mốc công nghệ VN
  year: string         // mốc thời gian
  emoji: string
  era: string          // nhãn cấp độ (Khởi đầu/Nền tảng/Hiện đại/Tương lai)
  topicVi: string      // chủ đề học của chặng
  figure: string       // nhân vật/cột mốc tiêu biểu
  color: string
  blurbVi: string
  lessons: AILesson[]
  /** Link tham khảo riêng (vd giả lập LLM) hiện trên thẻ chặng */
  refUrl?: string
  refLabel?: string
}

const q = (id: string, prompt: string, options: string[], correctIdx: number, explain: string): AIQuestion =>
  ({ id, prompt, options, correctIdx, explain })

export const JOURNEY: AIStop[] = [
  {
    id: 'bombe', place: 'Bletchley Park', placeVi: 'Máy Bombe & Colossus (Anh)', year: '1939–1945', emoji: '🔐',
    era: 'Khởi đầu', topicVi: 'Máy tính & thuật toán sơ khai', figure: 'Alan Turing · giải mã Enigma', color: '#58cc02',
    blurbVi: 'Trong Thế chiến II, Alan Turing và đồng đội ở Bletchley Park chế tạo máy Bombe để giải mã Enigma của Đức — khởi nguồn ý tưởng máy móc có thể tự động hoá tư duy.',
    lessons: [{ id: 'bombe-1', title: 'Máy giải mã & ý tưởng tính toán', icon: '🔐', questions: [
      q('bombe-q1', 'Máy Bombe ở Anh thời Thế chiến II dùng để làm gì?', ['Giải mã Enigma của Đức', 'Dự báo thời tiết', 'Chơi cờ vua', 'Vẽ bản đồ'], 0, 'Bombe do Turing thiết kế để dò khoá mã Enigma — rút ngắn chiến tranh và mở đường cho khoa học máy tính.'),
      q('bombe-q2', 'Ai được xem là "cha đẻ của khoa học máy tính"?', ['Isaac Newton', 'Alan Turing', 'Albert Einstein', 'Thomas Edison'], 1, 'Alan Turing đặt nền móng lý thuyết tính toán (máy Turing) và trí tuệ nhân tạo.'),
      q('bombe-q3', '"Thuật toán" nghĩa là gì?', ['Một loại máy tính', 'Tập các bước có thứ tự để giải một bài toán', 'Một ngôn ngữ nước ngoài', 'Một con chip'], 1, 'Thuật toán là chuỗi bước rõ ràng, hữu hạn để giải quyết vấn đề — nền tảng của mọi chương trình.'),
    ] }],
  },
  {
    id: 'turing-test', place: 'Turing Machine', placeVi: 'Máy Turing & "Máy có biết nghĩ?"', year: '1950', emoji: '🧠',
    era: 'Khởi đầu', topicVi: 'AI là gì', figure: 'Turing Test · "Computing Machinery and Intelligence"', color: '#1cb0f6',
    blurbVi: 'Năm 1950 Turing đặt câu hỏi "Máy móc có thể suy nghĩ không?" và đề xuất phép thử Turing (Turing Test) — nếu con người không phân biệt được máy với người qua hội thoại thì coi như máy "thông minh".',
    lessons: [{ id: 'turing-1', title: 'Trí tuệ nhân tạo là gì', icon: '🧠', questions: [
      q('tt-q1', 'Phép thử Turing (Turing Test) đánh giá điều gì?', ['Tốc độ máy tính', 'Máy có hội thoại giống người đến mức khó phân biệt không', 'Dung lượng ổ cứng', 'Độ bền pin'], 1, 'Turing Test: nếu giám khảo không phân biệt được câu trả lời của máy với người → máy vượt qua.'),
      q('tt-q2', 'Trí tuệ nhân tạo (AI) là gì?', ['Máy móc mô phỏng khả năng tư duy/học hỏi của con người', 'Một loại robot hình người', 'Internet tốc độ cao', 'Một phần mềm diệt virus'], 0, 'AI là lĩnh vực giúp máy thực hiện các tác vụ cần "trí tuệ": nhận dạng, suy luận, học từ dữ liệu.'),
      q('tt-q3', 'ChatGPT/Claude trả lời trôi chảy là ví dụ gần với ý tưởng nào của Turing?', ['Máy giải mã', 'Turing Test (hội thoại giống người)', 'Máy đánh chữ', 'Máy chiếu'], 1, 'LLM hội thoại tự nhiên chính là hiện thực hoá ý tưởng "máy trò chuyện như người" mà Turing nêu năm 1950.'),
    ] }],
  },
  {
    id: 'ibm-dartmouth', place: 'IBM & Dartmouth', placeVi: 'IBM Mainframe · Hội nghị Dartmouth', year: '1956', emoji: '🏢',
    era: 'Nền tảng', topicVi: 'Lịch sử AI · Perceptron', figure: 'McCarthy đặt tên "AI" · Rosenblatt (Perceptron 1958)', color: '#ce82ff',
    blurbVi: 'Năm 1956 tại Hội nghị Dartmouth, John McCarthy đặt ra thuật ngữ "Artificial Intelligence". IBM phổ biến máy mainframe; Rosenblatt (1958) tạo Perceptron — mạng nơ-ron nhân tạo đầu tiên.',
    lessons: [{ id: 'ibm-1', title: 'Khai sinh ngành AI', icon: '🏢', questions: [
      q('ibm-q1', 'Thuật ngữ "Artificial Intelligence" ra đời tại sự kiện nào?', ['Hội nghị Dartmouth 1956', 'Olympic 1960', 'Hội nghị Yalta', 'Triển lãm Paris'], 0, 'Hội nghị Dartmouth 1956 được coi là nơi khai sinh ngành AI; John McCarthy đặt ra tên gọi này.'),
      q('ibm-q2', 'Perceptron (1958) là gì?', ['Một con chip', 'Mô hình nơ-ron nhân tạo đầu tiên có thể học', 'Một ngôn ngữ lập trình', 'Một loại màn hình'], 1, 'Perceptron của Rosenblatt là viên gạch đầu tiên của mạng nơ-ron — học bằng cách điều chỉnh trọng số.'),
      q('ibm-q3', 'IBM nổi tiếng giai đoạn này với loại máy nào?', ['Máy tính cá nhân để bàn', 'Máy mainframe cỡ lớn cho doanh nghiệp', 'Điện thoại di động', 'Máy chơi game'], 1, 'Thập niên 1950–60, IBM dẫn đầu với mainframe — máy tính lớn phục vụ tính toán doanh nghiệp/khoa học.'),
    ] }],
  },
  {
    id: 'ai-winter', place: 'AI Winter', placeVi: 'Mùa đông AI · Hệ chuyên gia', year: '1974–1993', emoji: '❄️',
    era: 'Nền tảng', topicVi: 'Vì sao AI từng thất bại', figure: 'Expert Systems · kỳ vọng vs thực tế', color: '#ff9600',
    blurbVi: '"Mùa đông AI" là những giai đoạn kỳ vọng quá lớn nhưng kết quả kém → tài trợ bị cắt. Hệ chuyên gia (expert systems) dựa trên luật "nếu–thì" hữu ích nhưng cứng nhắc, khó mở rộng.',
    lessons: [{ id: 'winter-1', title: 'Bài học từ thất bại', icon: '❄️', questions: [
      q('aw-q1', '"Mùa đông AI" mô tả điều gì?', ['Máy tính bị đóng băng', 'Giai đoạn AI bị cắt tài trợ do kỳ vọng vượt xa thực tế', 'AI chỉ chạy mùa đông', 'Lỗi phần cứng do lạnh'], 1, 'Khi AI không đạt lời hứa, đầu tư bị cắt → "mùa đông". Bài học: cần dữ liệu + sức tính toán thực tế.'),
      q('aw-q2', 'Hệ chuyên gia (expert system) hoạt động dựa trên gì?', ['Mạng nơ-ron sâu', 'Các luật "nếu… thì…" do chuyên gia viết', 'Dữ liệu lớn tự học', 'Máy tính lượng tử'], 1, 'Expert system mã hoá tri thức thành luật if-then — mạnh trong miền hẹp nhưng khó mở rộng, dễ "giòn".'),
      q('aw-q3', 'Yếu tố nào về sau giúp AI vượt "mùa đông"?', ['Dữ liệu lớn + sức mạnh tính toán (GPU)', 'Màn hình màu', 'Bàn phím cơ', 'Chuột không dây'], 0, 'Big Data + GPU + thuật toán học sâu (2010s) mới giúp AI thực sự bùng nổ.'),
    ] }],
  },
  {
    id: 'pc-deepblue', place: 'PC & Deep Blue', placeVi: 'PC & Deep Blue thắng cờ vua', year: '1981–1997', emoji: '💻',
    era: 'Hiện đại', topicVi: 'Tìm kiếm · heuristics', figure: 'IBM Deep Blue thắng Kasparov (1997)', color: '#2563eb',
    blurbVi: 'Máy tính cá nhân (PC) phổ cập từ 1981. Năm 1997, siêu máy IBM Deep Blue đánh bại đại kiện tướng cờ vua Garry Kasparov — cột mốc máy "thắng người" nhờ tìm kiếm hàng triệu nước đi.',
    lessons: [{ id: 'pc-1', title: 'Máy tính thắng con người', icon: '💻', questions: [
      q('pc-q1', 'Deep Blue (1997) nổi tiếng vì điều gì?', ['Vẽ tranh', 'Đánh bại nhà vô địch cờ vua Kasparov', 'Viết nhạc', 'Lái xe'], 1, 'Deep Blue của IBM thắng Kasparov nhờ duyệt rất nhiều nước đi + hàm đánh giá (heuristic).'),
      q('pc-q2', 'Deep Blue thắng chủ yếu nhờ?', ['Cảm xúc', 'Sức mạnh tìm kiếm hàng triệu nước đi + heuristic', 'Mạng xã hội', 'Internet'], 1, 'Đây là AI "tìm kiếm" (search) — chưa phải học máy, nhưng cho thấy sức mạnh tính toán.'),
      q('pc-q3', '"Heuristic" trong AI nghĩa là gì?', ['Quy tắc ước lượng giúp chọn hướng đi tốt mà không duyệt hết', 'Một loại chip', 'Tên một lập trình viên', 'Một ngôn ngữ'], 0, 'Heuristic là "mẹo" ước lượng để cắt giảm không gian tìm kiếm khổng lồ.'),
    ] }],
  },
  {
    id: 'supercomputer-bigdata', place: 'Supercomputers & Big Data', placeVi: 'Siêu máy tính & Big Data', year: '2000s', emoji: '🖧',
    era: 'Hiện đại', topicVi: 'Machine Learning cơ bản', figure: 'Dữ liệu lớn · học từ ví dụ', color: '#06b6d4',
    blurbVi: 'Internet + cảm biến tạo ra lượng dữ liệu khổng lồ (Big Data). Siêu máy tính + dữ liệu lớn cho phép Machine Learning: máy "học từ ví dụ" thay vì được lập trình từng luật.',
    lessons: [{ id: 'ml-1', title: 'Máy học từ dữ liệu', icon: '🖧', questions: [
      q('ml-q1', 'Machine Learning (học máy) khác lập trình truyền thống ở điểm nào?', ['Máy tự rút ra quy luật từ DỮ LIỆU thay vì được viết từng luật', 'Không cần máy tính', 'Chỉ chạy offline', 'Không dùng dữ liệu'], 0, 'Thay vì viết luật tay, ta đưa dữ liệu + nhãn để máy tự học mô hình dự đoán.'),
      q('ml-q2', 'Phân loại email "spam / không spam" là dạng bài toán nào?', ['Phân loại (classification)', 'Vẽ hình', 'Nén ảnh', 'Sắp xếp file'], 0, 'Đây là phân loại có giám sát: học từ email đã gắn nhãn để dự đoán email mới.'),
      q('ml-q3', '"Big Data" quan trọng với AI hiện đại vì?', ['Càng nhiều dữ liệu chất lượng, mô hình học càng tốt', 'Làm máy chạy chậm', 'Tốn điện vô ích', 'Không liên quan'], 0, 'Mô hình học sâu cần lượng dữ liệu lớn để khái quát hoá tốt.'),
    ] }],
  },
  {
    id: 'deep-learning', place: 'Deep Learning', placeVi: 'Deep Learning bùng nổ · AlexNet + GPU', year: '2012', emoji: '⚡',
    era: 'Hiện đại', topicVi: 'Mạng nơ-ron · backpropagation', figure: 'AlexNet (Hinton) thắng ImageNet · GPU', color: '#f59e0b',
    blurbVi: 'Năm 2012, AlexNet (nhóm Geoffrey Hinton) dùng mạng nơ-ron sâu + GPU thắng vang dội cuộc thi nhận dạng ảnh ImageNet — khởi đầu kỷ nguyên Deep Learning.',
    lessons: [{ id: 'dl-1', title: 'Mạng nơ-ron sâu', icon: '⚡', questions: [
      q('dl-q1', 'Mạng nơ-ron nhân tạo lấy cảm hứng từ đâu?', ['Cách các tế bào thần kinh trong não kết nối', 'Hệ mặt trời', 'Mạch điện đèn pin', 'Dòng sông'], 0, 'Nơ-ron nhân tạo mô phỏng neuron sinh học: nhận tín hiệu, nhân trọng số, kích hoạt.'),
      q('dl-q2', '"Deep" (sâu) trong Deep Learning nghĩa là?', ['Mạng có NHIỀU lớp nơ-ron xếp chồng', 'Đặt máy dưới lòng đất', 'Học ban đêm', 'Ổ cứng lớn'], 0, 'Nhiều lớp ẩn cho phép học các đặc trưng từ đơn giản → phức tạp.'),
      q('dl-q3', 'Vì sao GPU quan trọng cho Deep Learning?', ['GPU tính song song hàng nghìn phép → huấn luyện nhanh', 'GPU để chơi game thôi', 'GPU làm mát máy', 'Không liên quan'], 0, 'GPU xử lý song song ma trận cực nhanh — đúng thứ mạng nơ-ron cần.'),
    ] }],
  },
  {
    id: 'cnn', place: 'CNN — Computer Vision', placeVi: 'CNN — Thị giác máy tính', year: '2012–2016', emoji: '👁️',
    era: 'Hiện đại', topicVi: 'CNN hoạt động thế nào', figure: 'Convolution · nhận dạng ảnh · xe tự lái', color: '#10b981',
    blurbVi: 'Mạng tích chập (CNN — Convolutional Neural Network) giúp máy "nhìn": nhận dạng khuôn mặt, vật thể, chữ viết, hỗ trợ xe tự lái và chẩn đoán y khoa từ ảnh.',
    lessons: [{ id: 'cnn-1', title: 'Máy biết nhìn', icon: '👁️', questions: [
      q('cnn-q1', 'CNN (mạng tích chập) giỏi nhất ở việc gì?', ['Xử lý & nhận dạng HÌNH ẢNH', 'Phát điện', 'Lưu trữ file', 'Gửi email'], 0, 'CNN dùng "bộ lọc" trượt trên ảnh để phát hiện cạnh, hình, vật thể.'),
      q('cnn-q2', 'Ứng dụng nào dưới đây dùng thị giác máy tính (CNN)?', ['Xe tự lái nhận diện biển báo', 'Máy nướng bánh mì', 'Quạt điện', 'Đồng hồ cát'], 0, 'Xe tự lái, nhận diện khuôn mặt, chẩn đoán X-quang… đều dựa trên CNN.'),
      q('cnn-q3', '"Convolution" (tích chập) trong CNN làm gì?', ['Dùng bộ lọc nhỏ trượt khắp ảnh để trích đặc trưng', 'Xoá ảnh', 'In ảnh ra giấy', 'Đổi màu màn hình'], 0, 'Phép tích chập trích đặc trưng cục bộ (cạnh, góc, hoa văn) rồi ghép thành nhận dạng.'),
    ] }],
  },
  {
    id: 'transformer', place: 'Transformer', placeVi: 'Transformer — "Attention is All You Need"', year: '2017', emoji: '🔁',
    era: 'Hiện đại', topicVi: 'Attention · xử lý ngôn ngữ', figure: 'Google · cơ chế self-attention', color: '#7c5cff',
    refUrl: '/free-courses/llm-mastery/visualize', refLabel: '🔬 Giả lập attention',
    blurbVi: 'Năm 2017, bài báo "Attention is All You Need" của Google giới thiệu kiến trúc Transformer + cơ chế attention — nền tảng cho mọi LLM hiện đại (GPT, BERT, Claude).',
    lessons: [{ id: 'tf-1', title: 'Cơ chế Attention', icon: '🔁', questions: [
      q('tf-q1', 'Kiến trúc Transformer (2017) là nền tảng của?', ['Các mô hình ngôn ngữ lớn LLM (GPT, Claude…)', 'Máy giặt', 'Trình duyệt web', 'Pin mặt trời'], 0, 'Transformer thay RNN/LSTM, xử lý song song và là "xương sống" của LLM ngày nay.'),
      q('tf-q2', 'Cơ chế "attention" giúp mô hình làm gì?', ['Tập trung vào những từ quan trọng/liên quan trong câu', 'Tăng độ sáng màn hình', 'Nén video', 'Sạc pin'], 0, 'Attention cho mô hình "chú ý" các từ liên quan bất kể vị trí → hiểu ngữ cảnh tốt.'),
      q('tf-q3', 'Ưu điểm lớn của Transformer so với mạng cũ (RNN)?', ['Xử lý SONG SONG cả câu → huấn luyện nhanh, nhớ ngữ cảnh dài', 'Tốn ít chữ hơn', 'Không cần dữ liệu', 'Chạy không cần điện'], 0, 'RNN xử lý tuần tự và "quên" ngữ cảnh dài; Transformer song song hoá và giữ ngữ cảnh xa.'),
    ] }],
  },
  {
    id: 'llm', place: 'LLM', placeVi: 'LLM — Mô hình ngôn ngữ lớn (GPT, Claude)', year: '2018→', emoji: '💬',
    era: 'Hiện tại', topicVi: 'LLM · token · prompt · RAG', figure: 'GPT · BERT · ChatGPT · Claude', color: '#22d3ee',
    refUrl: '/free-courses/llm-mastery/visualize', refLabel: '🔬 Mở giả lập LLM (token→embedding→attention)',
    blurbVi: 'Mô hình ngôn ngữ lớn (LLM) học từ khối lượng văn bản khổng lồ, dự đoán từ tiếp theo → trò chuyện, viết, lập trình. ChatGPT (2022) đưa AI đến mọi người.',
    lessons: [{ id: 'llm-1', title: 'Hiểu về LLM', icon: '💬', questions: [
      q('llm-q1', 'LLM (như ChatGPT, Claude) về cơ bản học cách?', ['Dự đoán từ/token tiếp theo dựa trên ngữ cảnh', 'Sao chép Google', 'Quay video', 'Vẽ 3D'], 0, 'LLM được huấn luyện dự đoán token kế tiếp trên lượng văn bản khổng lồ → sinh ra văn bản mạch lạc.'),
      q('llm-q2', '"Prompt" là gì?', ['Câu lệnh/đề bài ta nhập cho AI', 'Tên một con chip', 'Một loại file ảnh', 'Mật khẩu'], 0, 'Prompt là đầu vào ta đưa cho LLM; prompt rõ ràng → câu trả lời tốt hơn (prompt engineering).'),
      q('llm-q3', 'RAG (Retrieval-Augmented Generation) giúp LLM điều gì?', ['Tra cứu tài liệu thật rồi trả lời → chính xác, ít bịa', 'Chạy nhanh hơn 100 lần', 'Tự sạc pin', 'Vẽ biểu đồ'], 0, 'RAG nối LLM với kho tài liệu để trả lời dựa trên nguồn thật, giảm "ảo giác" (hallucination).'),
      q('llm-q4', '"Token" với LLM là?', ['Mẩu văn bản (từ/mảnh từ) mà mô hình xử lý', 'Tiền điện tử', 'Vé xem phim', 'Một nút bấm'], 0, 'LLM chia văn bản thành token; độ dài ngữ cảnh đo bằng số token.'),
    ] }],
  },
  {
    id: 'quantum', place: 'Quantum Computing', placeVi: 'Máy tính lượng tử & AI lượng tử', year: 'Hiện tại →', emoji: '⚛️',
    era: 'Tương lai gần', topicVi: 'Qubit · tính toán lượng tử', figure: 'Qubit · chồng chập · ưu thế lượng tử', color: '#ec4899',
    blurbVi: 'Máy tính lượng tử dùng qubit (chồng chập 0 và 1 cùng lúc) để giải một số bài toán nhanh vượt bậc — hứa hẹn tăng tốc AI, mô phỏng phân tử, mật mã.',
    lessons: [{ id: 'qc-1', title: 'Tính toán lượng tử', icon: '⚛️', questions: [
      q('qc-q1', 'Qubit khác bit thường ở điểm nào?', ['Qubit có thể ở trạng thái CHỒNG CHẬP (vừa 0 vừa 1)', 'Qubit to hơn', 'Qubit màu xanh', 'Không khác gì'], 0, 'Nhờ chồng chập + vướng víu lượng tử, máy lượng tử khám phá nhiều khả năng song song.'),
      q('qc-q2', 'Máy tính lượng tử hứa hẹn mạnh ở loại bài toán nào?', ['Mô phỏng phân tử, tối ưu, một số bài toán mật mã', 'Soạn thảo văn bản', 'Xem phim', 'Lướt web'], 0, 'Không thay PC thường, nhưng vượt trội ở lớp bài toán đặc thù (hoá học lượng tử, tối ưu lớn).'),
      q('qc-q3', '"Ưu thế lượng tử" (quantum advantage) nghĩa là?', ['Máy lượng tử giải nhanh hơn hẳn máy thường ở một bài toán', 'Máy lượng tử rẻ hơn', 'Máy lượng tử nhỏ hơn', 'Máy lượng tử nhiều màu hơn'], 0, 'Là cột mốc máy lượng tử làm được việc mà siêu máy tính thường mất thời gian khổng lồ.'),
    ] }],
  },
  {
    id: 'agi-future', place: 'AGI & Future', placeVi: 'AGI & Tương lai AI', year: 'Tương lai', emoji: '🚀',
    era: 'Tương lai', topicVi: 'AI có trách nhiệm · nghề nghiệp', figure: 'Agent · đạo đức AI · an toàn AI', color: '#ef4444',
    blurbVi: 'Tương lai AI: tác tử (agent) tự hành động, AI tạo sinh, hướng tới AGI (trí tuệ tổng quát). Đi kèm là đạo đức, an toàn, công bằng — và những nghề nghiệp mới.',
    lessons: [{ id: 'agi-1', title: 'AI có trách nhiệm & tương lai', icon: '🚀', questions: [
      q('agi-q1', 'AGI (Artificial General Intelligence) là gì?', ['AI tổng quát làm được đa dạng việc như con người', 'Một con robot', 'Một hãng máy tính', 'Một trò chơi'], 0, 'AGI là mục tiêu giả định: AI linh hoạt như trí tuệ con người ở nhiều lĩnh vực (chưa đạt được).'),
      q('agi-q2', '"AI agent" (tác tử) khác chatbot thường ở chỗ?', ['Có thể tự lập kế hoạch & THỰC HIỆN nhiều bước/công cụ', 'Chỉ đổi màu chữ', 'Chạy chậm hơn', 'Không trả lời được'], 0, 'Agent không chỉ trả lời mà còn dùng công cụ, gọi API, thực thi chuỗi hành động để hoàn thành mục tiêu.'),
      q('agi-q3', 'Vì sao "AI có trách nhiệm" (đạo đức, an toàn) quan trọng?', ['Tránh thiên lệch, sai lệch, lạm dụng và bảo vệ con người', 'Để AI chạy nhanh hơn', 'Để tiết kiệm điện', 'Không quan trọng'], 0, 'AI ảnh hưởng lớn đến xã hội → cần minh bạch, công bằng, riêng tư, an toàn và có giám sát con người.'),
    ] }],
  },
]

// ── Nạp câu hỏi từ khoá LLM Mastery (/free-courses/llm-mastery) ──────────────
// Lấy các câu MCQ trong AI_LLM_QUIZ, đổi đáp án chữ→index, tiêm vào chặng tương
// ứng — PHẦN LỚN vào chặng 10 (LLM); một số vào Transformer & AGI/Safety.
import { AI_LLM_QUIZ } from '@/data/aiLlmCourse'

const _LETTER: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, E: 4 }
// Map module khoá LLM → chặng AI. Mặc định (không có trong map) → 'llm'.
const _MODULE_TO_STOP: Record<string, string> = {
  'm4-build-gpt': 'transformer',   // xây GPT/transformer
  'm9-safety': 'agi-future',       // an toàn AI → tương lai/AGI
  'm8-interpretability': 'agi-future',
}
function _stopForModule(moduleId: string): string {
  return _MODULE_TO_STOP[moduleId] || 'llm'
}
try {
  const byStop: Record<string, AIQuestion[]> = {}
  for (const qz of AI_LLM_QUIZ) {
    if (qz.questionType !== 'MCQ') continue // chỉ lấy trắc nghiệm 1 đáp án
    const idx = _LETTER[String(qz.correctAnswer || 'A').trim().toUpperCase()] ?? 0
    if (!Array.isArray(qz.options) || qz.options.length < 2) continue
    const stopId = _stopForModule(qz.moduleId)
    ;(byStop[stopId] ||= []).push({
      id: `llmc-${qz.id}`,
      prompt: qz.content,
      options: qz.options,
      correctIdx: Math.min(idx, qz.options.length - 1),
      explain: qz.explanation || '',
    })
  }
  for (const stop of JOURNEY) {
    const add = byStop[stop.id]
    if (add && add.length && stop.lessons[0]) {
      const existing = new Set(stop.lessons[0].questions.map(q => q.id))
      stop.lessons[0].questions.push(...add.filter(q => !existing.has(q.id)))
    }
  }
} catch { /* dữ liệu khoá lỗi → giữ câu gốc */ }

// ── Lookups (giống math/curriculum) ───────────────────────────────
export function allLessonsInOrder(): AILesson[] {
  return JOURNEY.flatMap(s => s.lessons)
}
export function getLesson(lessonId: string): { stop: AIStop; lesson: AILesson } | null {
  for (const stop of JOURNEY) for (const lesson of stop.lessons) if (lesson.id === lessonId) return { stop, lesson }
  return null
}
export function aiStats() {
  let lessons = 0, questions = 0
  for (const s of JOURNEY) for (const l of s.lessons) { lessons++; questions += l.questions.length }
  return { stops: JOURNEY.length, lessons, questions }
}
export function allQuestions(): { q: AIQuestion; stop: AIStop }[] {
  const out: { q: AIQuestion; stop: AIStop }[] = []
  for (const s of JOURNEY) for (const l of s.lessons) for (const qq of l.questions) out.push({ q: qq, stop: s })
  return out
}
export function questionById(): Record<string, { q: AIQuestion; stop: AIStop }> {
  const map: Record<string, { q: AIQuestion; stop: AIStop }> = {}
  for (const item of allQuestions()) map[item.q.id] = item
  return map
}
