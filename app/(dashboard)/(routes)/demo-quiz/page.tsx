'use client';

"use client";

import { StudentQuizInterface } from "@/components/student-quiz-interface";
import { useLanguage } from '@/contexts/LanguageContext';

// Mock quiz data for demo - Chuẩn Bộ Giáo dục
const demoQuizData = {
  id: "001",
  title: "KỲ THI TRUNG HỌC PHỔ THÔNG QUỐC GIA NĂM 2024 - MÔN HÓA HỌC",
  description: "Đề thi chính thức - Mã đề 001",
  timeLimit: 50, // 50 minutes (chuẩn THPT Quốc gia)
  totalQuestions: 40, // Chuẩn 40 câu
  questions: [
    {
      id: 1,
      question: "Este X được tạo thành từ ancol etylic và axit fomic có công thức là:",
      options: [
        "HCOOCH₃",
        "CH₃COOCH₃", 
        "HCOOCH₂CH₃",
        "CH₃COOCH₂CH₃"
      ],
      points: 2
    },
    {
      id: 2,
      question: "Este X có tỉ khối hơi so với không khí bằng 2,07. Este X là:",
      options: [
        "HCOOCH₃",
        "CH₃COOCH₃",
        "HCOOCH₂CH₃", 
        "CH₃COOCH₂CH₃"
      ],
      points: 2
    },
    {
      id: 3,
      question: "Chất nào sau đây có nhiệt độ sôi thấp nhất?",
      options: [
        "CH₃COOH",
        "CH₃COOCH₃",
        "CH₃CH₂OH",
        "CH₃CH₂CH₂OH"
      ],
      points: 2
    },
    {
      id: 4,
      question: "Chất nào sau đây là axit béo không no?",
      options: [
        "Axit stearic",
        "Axit oleic", 
        "Axit palmitic",
        "Axit lauric"
      ],
      points: 2
    },
    {
      id: 5,
      question: "Số đồng phân este ứng với công thức phân tử C₄H₈O₂ là:",
      options: ["2", "3", "4", "5"],
      points: 2
    },
    {
      id: 6,
      question: "Loại dầu nào sau đây không phải là este của axit béo và glixerol?",
      options: [
        "Dầu dừa",
        "Dầu đậu nành",
        "Dầu mỡ động vật",
        "Dầu ô liu"
      ],
      points: 2
    },
    {
      id: 7,
      question: "Chất nào sau đây ở điều kiện thường là chất lỏng?",
      options: [
        "CH₃(CH₂)₁₆COOH",
        "CH₃(CH₂)₁₄COOH",
        "CH₃(CH₂)₁₂COOH", 
        "CH₃(CH₂)₁₀COOH"
      ],
      points: 2
    },
    {
      id: 8,
      question: "Este nào sau đây khi thủy phân trong môi trường kiềm cho sản phẩm có khả năng tham gia phản ứng tráng bạc?",
      options: [
        "CH₃COOCH₃",
        "HCOOCH₃",
        "CH₃COOCH₂CH₃",
        "C₂H₅COOCH₃"
      ],
      points: 2
    },
    {
      id: 9,
      question: "Nhóm chức được khoanh tròn trong công thức sau là:",
      options: [
        "Nhóm este",
        "Nhóm axit",
        "Nhóm muối",
        "Nhóm ancol"
      ],
      points: 2
    },
    {
      id: 10,
      question: "Phản ứng este hóa giữa axit và ancol là phản ứng:",
      options: [
        "Thuận nghịch",
        "Một chiều",
        "Oxi hóa khử",
        "Thế"
      ],
      points: 2
    },
    {
      id: 11,
      question: "Để điều chế este từ axit cacboxylic, người ta thường dùng:",
      options: [
        "Ancol và xúc tác H₂SO₄ đặc",
        "Ancol và xúc tác NaOH",
        "Ancol và xúc tác HCl",
        "Ancol và xúc tác KOH"
      ],
      points: 2
    },
    {
      id: 12,
      question: "Este không tan trong nước vì:",
      options: [
        "Không có liên kết hidro với nước",
        "Có phân tử khối lớn",
        "Có cấu trúc phân cực",
        "Có nhóm chức ưa nước"
      ],
      points: 2
    },
    {
      id: 13,
      question: "Phản ứng thủy phân este trong môi trường axit là phản ứng:",
      options: [
        "Thuận nghịch",
        "Một chiều", 
        "Oxi hóa",
        "Khử"
      ],
      points: 2
    },
    {
      id: 14,
      question: "Chất nào sau đây có thể tham gia phản ứng tráng bạc?",
      options: [
        "CH₃COOCH₃",
        "HCOOCH₃",
        "CH₃COOCH₂CH₃",
        "C₂H₅COOCH₃"
      ],
      points: 2
    },
    {
      id: 15,
      question: "Este của axit fomic có đặc điểm:",
      options: [
        "Có thể tham gia phản ứng tráng bạc",
        "Không tan trong nước",
        "Có mùi thơm",
        "Có tính axit"
      ],
      points: 2
    },
    {
      id: 16,
      question: "Số mol NaOH cần để thủy phân hoàn toàn 1 mol este đơn chức là:",
      options: ["0.5 mol", "1 mol", "1.5 mol", "2 mol"],
      points: 2
    },
    {
      id: 17,
      question: "Este nào sau đây có mùi chuối chín?",
      options: [
        "CH₃COOCH₃",
        "CH₃COOCH₂CH₃",
        "CH₃COOCH₂CH₂CH₃",
        "CH₃COOCH₂CH₂CH₂CH₃"
      ],
      points: 2
    },
    {
      id: 18,
      question: "Phản ứng xà phòng hóa là phản ứng thủy phân este trong:",
      options: [
        "Môi trường axit",
        "Môi trường kiềm",
        "Môi trường trung tính",
        "Môi trường nước"
      ],
      points: 2
    },
    // Thêm câu hỏi để đủ 40 câu
    {
      id: 19,
      question: "Cho các phát biểu sau: (1) Este là sản phẩm của phản ứng giữa axit cacboxylic và ancol. (2) Este đơn giản nhất có công thức CH₂O₂. (3) Este có thể tham gia phản ứng thủy phân. (4) Este của axit fomic có thể tham gia phản ứng tráng bạc. Số phát biểu đúng là:",
      options: ["1", "2", "3", "4"],
      points: 2
    },
    {
      id: 20,
      question: "Cho 0,1 mol este X tác dụng với dung dịch NaOH dư, thu được 8,2 gam muối và 4,6 gam ancol. Công thức của X là:",
      options: ["HCOOCH₃", "CH₃COOCH₃", "HCOOCH₂CH₃", "CH₃COOCH₂CH₃"],
      points: 2
    },
    // Thêm 20 câu hỏi nữa để đủ 40 câu
    ...Array.from({ length: 20 }, (_, i) => ({
      id: 21 + i,
      question: `Câu hỏi ${21 + i}: Đây là câu hỏi mẫu cho đề thi THPT Quốc gia môn Hóa học.`,
      options: ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
      points: 2
    }))
  ]
};

export default function DemoQuizPage() {
  const { t } = useLanguage();
  
  const handleQuizSubmit = (answers: Record<number, number>) => {
    console.log("Quiz submitted with answers:", answers);
    alert(`Quiz submitted! You answered ${Object.keys(answers).length} questions.`);
  };

  const handleBack = () => {
    typeof window !== 'undefined' && window.history.back();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-600 text-white p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold">Demo Quiz Interface - Chuẩn Bộ Giáo dục</h1>
          <p className="text-blue-100">Giao diện trắc nghiệm theo chuẩn THPT Quốc gia Việt Nam</p>
        
              </div>
      </div>
      
      <StudentQuizInterface
        quizData={demoQuizData}
        onSubmit={handleQuizSubmit}
        onBack={handleBack}
      />
    </div>
  );
}
