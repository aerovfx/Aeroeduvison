'use client';

"use client"

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { QuizletStyleLearning } from "@/components/quizlet-style-learning";
import { getQuestionsForLesson } from "@/lib/learning-questions";
import { useLanguage } from '@/contexts/LanguageContext';

// Mapping từ lesson ID sang tên bài học
const lessonTitles: { [key: string]: { vi: string; en: string } } = {
  // TOÁN HỌC LỚP 10
  "toan-hoc-10-1": { vi: "Tập hợp và mệnh đề - Khái niệm cơ bản", en: "Sets and Propositions - Basic Concepts" },
  "toan-hoc-10-2": { vi: "Hàm số bậc nhất - Đồ thị và tính chất", en: "Linear Functions - Graphs and Properties" },
  "toan-hoc-10-3": { vi: "Hàm số bậc hai - Parabol và ứng dụng", en: "Quadratic Functions - Parabolas and Applications" },
  "toan-hoc-10-4": { vi: "Phương trình bậc nhất - Giải và biện luận", en: "Linear Equations - Solving and Analysis" },
  "toan-hoc-10-5": { vi: "Phương trình bậc hai - Công thức nghiệm", en: "Quadratic Equations - Solution Formulas" },
  "toan-hoc-10-6": { vi: "Hệ phương trình - Phương pháp giải", en: "Systems of Equations - Solution Methods" },
  "toan-hoc-10-7": { vi: "Bất đẳng thức - Chứng minh và ứng dụng", en: "Inequalities - Proofs and Applications" },
  "toan-hoc-10-8": { vi: "Thống kê mô tả - Trung bình và độ lệch", en: "Descriptive Statistics - Mean and Deviation" },
  
  // TOÁN HỌC LỚP 11
  "toan-hoc-11-1": { vi: "Lượng giác cơ bản - Sin, Cos, Tan", en: "Basic Trigonometry - Sin, Cos, Tan" },
  "toan-hoc-11-2": { vi: "Tổ hợp và xác suất - Quy tắc đếm", en: "Combinations and Probability - Counting Rules" },
  "toan-hoc-11-3": { vi: "Dãy số và cấp số - Công thức tổng quát", en: "Sequences and Series - General Formulas" },
  "toan-hoc-11-4": { vi: "Giới hạn hàm số - Định nghĩa và tính chất", en: "Function Limits - Definition and Properties" },
  "toan-hoc-11-5": { vi: "Đạo hàm - Quy tắc tính đạo hàm", en: "Derivatives - Differentiation Rules" },
  "toan-hoc-11-6": { vi: "Ứng dụng đạo hàm - Cực trị và đồ thị", en: "Applications of Derivatives - Extrema and Graphs" },
  "toan-hoc-11-7": { vi: "Nguyên hàm - Tích phân bất định", en: "Antiderivatives - Indefinite Integrals" },
  "toan-hoc-11-8": { vi: "Tích phân - Ứng dụng tính diện tích", en: "Integrals - Area Calculation Applications" },
  
  // TOÁN HỌC LỚP 12
  "toan-hoc-12-1": { vi: "Đạo hàm nâng cao - Quy tắc chuỗi", en: "Advanced Derivatives - Chain Rule" },
  "toan-hoc-12-2": { vi: "Ứng dụng đạo hàm - Tối ưu hóa", en: "Applications of Derivatives - Optimization" },
  "toan-hoc-12-3": { vi: "Nguyên hàm và tích phân - Phương pháp đổi biến", en: "Antiderivatives and Integrals - Substitution Method" },
  "toan-hoc-12-4": { vi: "Tích phân xác định - Ứng dụng thực tế", en: "Definite Integrals - Real-world Applications" },
  "toan-hoc-12-5": { vi: "Số phức - Phép toán và ứng dụng", en: "Complex Numbers - Operations and Applications" },
  "toan-hoc-12-6": { vi: "Khối đa diện - Thể tích và diện tích", en: "Polyhedra - Volume and Surface Area" },
  "toan-hoc-12-7": { vi: "Mặt cầu và mặt trụ - Hình học không gian", en: "Spheres and Cylinders - Spatial Geometry" },
  "toan-hoc-12-8": { vi: "Phương pháp tọa độ - Vector và mặt phẳng", en: "Coordinate Methods - Vectors and Planes" },
  
  // HÓA HỌC LỚP 10
  "hoa-hoc-10-1": { vi: "Cấu tạo nguyên tử - Proton, neutron, electron", en: "Atomic Structure - Protons, neutrons, electrons" },
  "hoa-hoc-10-2": { vi: "Bảng tuần hoàn - Chu kỳ và nhóm", en: "Periodic Table - Periods and Groups" },
  "hoa-hoc-10-3": { vi: "Liên kết hóa học - Ion và cộng hóa trị", en: "Chemical Bonds - Ionic and Covalent" },
  "hoa-hoc-10-4": { vi: "Phản ứng hóa học - Cân bằng phương trình", en: "Chemical Reactions - Balancing Equations" },
  "hoa-hoc-10-5": { vi: "Mol và tính toán hóa học - Công thức phân tử", en: "Moles and Chemical Calculations - Molecular Formulas" },
  "hoa-hoc-10-6": { vi: "Dung dịch - Nồng độ và pha loãng", en: "Solutions - Concentration and Dilution" },
  "hoa-hoc-10-7": { vi: "Axit và bazơ - pH và pOH", en: "Acids and Bases - pH and pOH" },
  "hoa-hoc-10-8": { vi: "Muối và phản ứng trao đổi - Kết tủa", en: "Salts and Exchange Reactions - Precipitation" },
  
  // HÓA HỌC LỚP 11
  "hoa-hoc-11-1": { vi: "Sự điện li - Chất điện li mạnh và yếu", en: "Electrolytic Dissociation - Strong and Weak Electrolytes" },
  "hoa-hoc-11-2": { vi: "Nitơ và hợp chất - Amoniac và muối amoni", en: "Nitrogen and Compounds - Ammonia and Ammonium Salts" },
  "hoa-hoc-11-3": { vi: "Photpho và hợp chất - Axit photphoric", en: "Phosphorus and Compounds - Phosphoric Acid" },
  "hoa-hoc-11-4": { vi: "Cacbon và silic - Oxit và axit", en: "Carbon and Silicon - Oxides and Acids" },
  "hoa-hoc-11-5": { vi: "Đại cương về hóa hữu cơ - Hydrocarbon", en: "Introduction to Organic Chemistry - Hydrocarbons" },
  "hoa-hoc-11-6": { vi: "Ancol và phenol - Tính chất và ứng dụng", en: "Alcohols and Phenols - Properties and Applications" },
  "hoa-hoc-11-7": { vi: "Anđehit và xeton - Phản ứng đặc trưng", en: "Aldehydes and Ketones - Characteristic Reactions" },
  "hoa-hoc-11-8": { vi: "Axit cacboxylic - Este và phản ứng este hóa", en: "Carboxylic Acids - Esters and Esterification" },
  
  // HÓA HỌC LỚP 12
  "hoa-hoc-12-1": { vi: "Este và lipit - Chất béo và sáp", en: "Esters and Lipids - Fats and Waxes" },
  "hoa-hoc-12-2": { vi: "Cacbohidrat - Đường đơn và đường đa", en: "Carbohydrates - Monosaccharides and Polysaccharides" },
  "hoa-hoc-12-3": { vi: "Amin và amino axit - Protein và enzyme", en: "Amines and Amino Acids - Proteins and Enzymes" },
  "hoa-hoc-12-4": { vi: "Polime - Chất dẻo và cao su", en: "Polymers - Plastics and Rubber" },
  "hoa-hoc-12-5": { vi: "Đại cương về kim loại - Tính chất chung", en: "Introduction to Metals - General Properties" },
  "hoa-hoc-12-6": { vi: "Kim loại kiềm và kiềm thổ - Natri và canxi", en: "Alkali and Alkaline Earth Metals - Sodium and Calcium" },
  "hoa-hoc-12-7": { vi: "Nhôm và hợp chất - Alumina và nhôm sunfat", en: "Aluminum and Compounds - Alumina and Aluminum Sulfate" },
  "hoa-hoc-12-8": { vi: "Sắt và hợp kim - Gang và thép", en: "Iron and Alloys - Cast Iron and Steel" },
  
  // VẬT LÝ LỚP 10
  "vat-ly-10-1": { vi: "Cơ học - Chuyển động thẳng đều", en: "Mechanics - Uniform Linear Motion" },
  "vat-ly-10-2": { vi: "Nhiệt học - Nhiệt độ và nhiệt lượng", en: "Thermodynamics - Temperature and Heat" },
  "vat-ly-10-3": { vi: "Điện học - Điện trường và điện thế", en: "Electricity - Electric Field and Potential" },
  "vat-ly-10-4": { vi: "Từ học - Từ trường và lực từ", en: "Magnetism - Magnetic Field and Magnetic Force" },
  "vat-ly-10-5": { vi: "Động lực học - Định luật Newton", en: "Dynamics - Newton's Laws" },
  "vat-ly-10-6": { vi: "Năng lượng - Động năng và thế năng", en: "Energy - Kinetic and Potential Energy" },
  "vat-ly-10-7": { vi: "Chất khí - Định luật Boyle và Charles", en: "Gases - Boyle's and Charles' Laws" },
  "vat-ly-10-8": { vi: "Dòng điện không đổi - Định luật Ohm", en: "Direct Current - Ohm's Law" },
  
  // VẬT LÝ LỚP 11
  "vat-ly-11-1": { vi: "Dao động cơ - Con lắc đơn và lò xo", en: "Mechanical Oscillations - Simple Pendulum and Spring" },
  "vat-ly-11-2": { vi: "Sóng cơ - Sóng dọc và sóng ngang", en: "Mechanical Waves - Longitudinal and Transverse Waves" },
  "vat-ly-11-3": { vi: "Dòng điện xoay chiều - Mạch RLC", en: "Alternating Current - RLC Circuits" },
  "vat-ly-11-4": { vi: "Dao động điện từ - Mạch LC", en: "Electromagnetic Oscillations - LC Circuits" },
  "vat-ly-11-5": { vi: "Điện trường - Điện tích và lực Coulomb", en: "Electric Field - Electric Charge and Coulomb Force" },
  "vat-ly-11-6": { vi: "Từ trường - Dòng điện và lực từ", en: "Magnetic Field - Electric Current and Magnetic Force" },
  "vat-ly-11-7": { vi: "Cảm ứng điện từ - Định luật Faraday", en: "Electromagnetic Induction - Faraday's Law" },
  "vat-ly-11-8": { vi: "Khúc xạ ánh sáng - Định luật Snell", en: "Light Refraction - Snell's Law" },
  
  // VẬT LÝ LỚP 12
  "vat-ly-12-1": { vi: "Sóng ánh sáng - Giao thoa và nhiễu xạ", en: "Light Waves - Interference and Diffraction" },
  "vat-ly-12-2": { vi: "Lượng tử ánh sáng - Hiệu ứng quang điện", en: "Quantum Light - Photoelectric Effect" },
  "vat-ly-12-3": { vi: "Hạt nhân nguyên tử - Phóng xạ và phân hạch", en: "Atomic Nucleus - Radioactivity and Fission" },
  "vat-ly-12-4": { vi: "Từ vi mô đến vĩ mô - Vũ trụ học", en: "From Micro to Macro - Cosmology" },
  "vat-ly-12-5": { vi: "Sóng điện từ - Phổ điện từ", en: "Electromagnetic Waves - Electromagnetic Spectrum" },
  "vat-ly-12-6": { vi: "Laser và quang học - Ứng dụng công nghệ", en: "Lasers and Optics - Technological Applications" },
  "vat-ly-12-7": { vi: "Vật lý hạt nhân - Phản ứng hạt nhân", en: "Nuclear Physics - Nuclear Reactions" },
  "vat-ly-12-8": { vi: "Vật lý hiện đại - Thuyết tương đối", en: "Modern Physics - Theory of Relativity" },
  
  // SINH HỌC LỚP 10
  "sinh-hoc-10-1": { vi: "Tế bào - Cấu trúc và chức năng", en: "Cells - Structure and Function" },
  "sinh-hoc-10-2": { vi: "Trao đổi chất - Hô hấp và quang hợp", en: "Metabolism - Respiration and Photosynthesis" },
  "sinh-hoc-10-3": { vi: "Sinh trưởng và phát triển - Chu kỳ tế bào", en: "Growth and Development - Cell Cycle" },
  "sinh-hoc-10-4": { vi: "Sinh sản - Vô tính và hữu tính", en: "Reproduction - Asexual and Sexual" },
  "sinh-hoc-10-5": { vi: "Cảm ứng - Phản xạ và thích nghi", en: "Irritability - Reflexes and Adaptation" },
  "sinh-hoc-10-6": { vi: "Vận động - Cơ và xương", en: "Movement - Muscles and Bones" },
  "sinh-hoc-10-7": { vi: "Tiêu hóa - Hệ tiêu hóa và dinh dưỡng", en: "Digestion - Digestive System and Nutrition" },
  "sinh-hoc-10-8": { vi: "Tuần hoàn - Hệ tuần hoàn và máu", en: "Circulation - Circulatory System and Blood" },
  
  // SINH HỌC LỚP 11
  "sinh-hoc-11-1": { vi: "Di truyền học - Gen và nhiễm sắc thể", en: "Genetics - Genes and Chromosomes" },
  "sinh-hoc-11-2": { vi: "Biến dị - Đột biến và thường biến", en: "Variation - Mutations and Modifications" },
  "sinh-hoc-11-3": { vi: "Ứng dụng di truyền - Công nghệ gen", en: "Genetic Applications - Genetic Engineering" },
  "sinh-hoc-11-4": { vi: "Tiến hóa - Thuyết tiến hóa Darwin", en: "Evolution - Darwin's Theory of Evolution" },
  "sinh-hoc-11-5": { vi: "Sinh thái học - Môi trường và sinh vật", en: "Ecology - Environment and Organisms" },
  "sinh-hoc-11-6": { vi: "Hệ sinh thái - Chuỗi thức ăn", en: "Ecosystems - Food Chains" },
  "sinh-hoc-11-7": { vi: "Sinh học phân tử - DNA và protein", en: "Molecular Biology - DNA and Proteins" },
  "sinh-hoc-11-8": { vi: "Công nghệ sinh học - Ứng dụng thực tế", en: "Biotechnology - Practical Applications" },
  
  // SINH HỌC LỚP 12
  "sinh-hoc-12-1": { vi: "Cơ thể và môi trường - Thích nghi sinh học", en: "Organism and Environment - Biological Adaptation" },
  "sinh-hoc-12-2": { vi: "Quần thể sinh vật - Động thái quần thể", en: "Biological Populations - Population Dynamics" },
  "sinh-hoc-12-3": { vi: "Quần xã sinh vật - Tương tác sinh học", en: "Biological Communities - Biological Interactions" },
  "sinh-hoc-12-4": { vi: "Hệ sinh thái - Chu trình vật chất", en: "Ecosystems - Material Cycles" },
  "sinh-hoc-12-5": { vi: "Sinh học bảo tồn - Đa dạng sinh học", en: "Conservation Biology - Biodiversity" },
  "sinh-hoc-12-6": { vi: "Sinh học y học - Bệnh lý và điều trị", en: "Medical Biology - Pathology and Treatment" },
  "sinh-hoc-12-7": { vi: "Sinh học nông nghiệp - Cây trồng và vật nuôi", en: "Agricultural Biology - Crops and Livestock" },
  "sinh-hoc-12-8": { vi: "Sinh học công nghiệp - Vi sinh vật công nghiệp", en: "Industrial Biology - Industrial Microorganisms" },
  
  // PYTHON PROGRAMMING
  "python-1": { vi: "Python cơ bản - Cài đặt và Hello World", en: "Python Basics - Installation and Hello World" },
  "python-2": { vi: "Biến và kiểu dữ liệu - String, int, float, bool", en: "Variables and Data Types - String, int, float, bool" },
  "python-3": { vi: "Cấu trúc điều khiển - If, for, while", en: "Control Structures - If, for, while" },
  "python-4": { vi: "Hàm và module - Định nghĩa và import", en: "Functions and Modules - Definition and Import" },
  "python-5": { vi: "Cấu trúc dữ liệu - List, tuple, dict, set", en: "Data Structures - List, tuple, dict, set" },
  "python-6": { vi: "Xử lý file - Đọc và ghi file", en: "File Handling - Reading and Writing Files" },
  "python-7": { vi: "Lập trình hướng đối tượng - Class và object", en: "Object-Oriented Programming - Class and Object" },
  "python-8": { vi: "Xử lý lỗi - Try, except, finally", en: "Error Handling - Try, except, finally" },
  "python-9": { vi: "Thư viện Python - NumPy và Pandas", en: "Python Libraries - NumPy and Pandas" },
  "python-10": { vi: "Dự án thực tế - Web scraping và data analysis", en: "Real Projects - Web Scraping and Data Analysis" },
  "python-10-1": { vi: "Python cơ bản - Cài đặt và Hello World", en: "Python Basics - Installation and Hello World" },
  "python-10-2": { vi: "Biến và kiểu dữ liệu - String, int, float, bool", en: "Variables and Data Types - String, int, float, bool" },
  "python-10-3": { vi: "Cấu trúc điều khiển - If, for, while", en: "Control Structures - If, for, while" },
  "python-10-4": { vi: "Hàm và module - Định nghĩa và import", en: "Functions and Modules - Definition and Import" },
  "python-10-5": { vi: "Cấu trúc dữ liệu - List, tuple, dict, set", en: "Data Structures - List, tuple, dict, set" },
  "python-10-6": { vi: "Xử lý file - Đọc và ghi file", en: "File Handling - Reading and Writing Files" },
  "python-10-7": { vi: "Lập trình hướng đối tượng - Class và object", en: "Object-Oriented Programming - Class and Object" },
  "python-10-8": { vi: "Xử lý lỗi - Try, except, finally", en: "Error Handling - Try, except, finally" },
  "python-10-9": { vi: "Thư viện Python - NumPy và Pandas", en: "Python Libraries - NumPy and Pandas" },
  "python-10-10": { vi: "Dự án thực tế - Web scraping và data analysis", en: "Real Projects - Web Scraping and Data Analysis" }
};

export default function DynamicLearnPage() {
  const { t } = useLanguage();
  
  const params = useParams();
  const router = useRouter();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [language, setLanguage] = useState('vi');

  const lessonId = params.lessonId as string;
  const subject = params.subject as string;
  
  // Lấy câu hỏi từ database
  const questions = getQuestionsForLesson(lessonId);
  
  // Lấy tên bài học
  const lessonTitle = lessonTitles[lessonId] || { vi: "Bài học", en: "Lesson" };
  const currentLessonTitle = language === 'vi' ? lessonTitle.vi : lessonTitle.en;

  // Kiểm tra nếu không có câu hỏi
  useEffect(() => {
    if (questions.length === 0) {
      console.warn(`No questions found for lesson: ${lessonId}`);
    }
  }, [lessonId, questions.length]);

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Bài học không tìm thấy</h1>
          <p className="text-gray-400 mb-6">Không có câu hỏi cho bài học này</p>
          <button 
            onClick={() => router.back()}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg"
          >
            Quay lại
          </button>
        </div>
      
              </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isCorrect = selectedAnswer ? currentQuestion.options.find(opt => opt.id === selectedAnswer)?.isCorrect : false;

  const handleAnswer = (answerId: string) => {
    setSelectedAnswer(answerId);
    setShowResult(true);
    if (currentQuestion.options.find(opt => opt.id === answerId)?.isCorrect) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setShowResult(false);
      setSelectedAnswer(null);
    } else {
      // Quiz completed - simple completion without XP context
      console.log(`Lesson completed: ${lessonId}, Score: ${score}/${questions.length}`);
      
      // Redirect back to learning path
      setTimeout(() => {
        router.push(`/learning-paths-demo/${subject}`);
      }, 3000); // Wait 3 seconds to show celebration
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const isCompleted = currentQuestionIndex === questions.length - 1 && showResult;
  const totalXP = score * 10; // 10 XP per correct answer

  return (
    <QuizletStyleLearning
      subject={`${subject.toUpperCase()} - ${currentLessonTitle}`}
      totalQuestions={questions.length}
      currentQuestion={currentQuestionIndex + 1}
      question={currentQuestion}
      onAnswer={handleAnswer}
      onNext={handleNext}
      onSkip={handleSkip}
      showResult={showResult}
      selectedAnswer={selectedAnswer}
      isCorrect={isCorrect}
      isCompleted={isCompleted}
      totalXP={totalXP}
    />
  );
}