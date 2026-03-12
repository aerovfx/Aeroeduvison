/**
 * Seed câu hỏi Vật lí 11 - Bài 1: Dao động điều hòa
 * Nguồn: https://vietjack.com/vat-li-11-cd/bai-1-dao-dong-dieu-hoa.jsp
 * Chạy: npx tsx scripts/seed-dao-dong-dieu-hoa.ts
 * Hoặc: bun run scripts/seed-dao-dong-dieu-hoa.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

interface QuestionInput {
  topic: string;
  subject: string;
  grade: string;
  questionType: string;
  difficulty: Difficulty;
  content: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  learningObjectives: string[];
  keywords: string[];
}

/** Sinh câu hỏi từ trang vietjack.com - Dao động điều hòa */
function* genDaoDongDieuHoa(): Generator<QuestionInput> {
  const topic = 'Dao động điều hòa';
  const subject = 'Vật lí';
  const grade = '11';

  // Câu 1: Khái niệm dao động
  yield {
    topic,
    subject,
    grade,
    questionType: 'MCQ',
    difficulty: 'EASY',
    content: 'Dao động là gì?',
    options: [
      'Chuyển động lặp đi lặp lại quanh một vị trí cân bằng',
      'Chuyển động theo đường thẳng với vận tốc không đổi',
      'Chuyển động tròn với tốc độ góc không đổi',
      'Chuyển động rơi tự do dưới tác dụng của trọng lực'
    ],
    correctAnswer: '0',
    explanation: 'Dao động là chuyển động lặp đi lặp lại quanh một vị trí cân bằng. Sau những khoảng thời gian bằng nhau, vật trở về vị trí cũ với vận tốc cũ.',
    learningObjectives: ['Hiểu khái niệm dao động'],
    keywords: ['dao động', 'vị trí cân bằng', 'chuyển động lặp']
  };

  // Câu 2: Dao động tự do
  yield {
    topic,
    subject,
    grade,
    questionType: 'MCQ',
    difficulty: 'MEDIUM',
    content: 'Nếu bỏ qua lực cản của môi trường, chuyển động nào sau đây là dao động tự do?',
    options: [
      'Con lắc lò xo dao động không ma sát',
      'Cánh muỗi đập liên tục',
      'Quả lắc đồng hồ chịu tác dụng của dây cót',
      'Chiếc lá rơi trong không khí'
    ],
    correctAnswer: '0',
    explanation: 'Dao động tự do là dao động chỉ chịu tác dụng của nội lực (lực đàn hồi, trọng lực...) mà không có ngoại lực tác dụng. Con lắc lò xo dao động không ma sát là dao động tự do.',
    learningObjectives: ['Phân biệt dao động tự do và dao động cưỡng bức'],
    keywords: ['dao động tự do', 'lực cản', 'con lắc lò xo']
  };

  // Câu 3: Ví dụ dao động trong thực tế
  yield {
    topic,
    subject,
    grade,
    questionType: 'MCQ',
    difficulty: 'EASY',
    content: 'Ví dụ nào sau đây KHÔNG phải là dao động?',
    options: [
      'Ô tô chuyển động thẳng đều trên đường cao tốc',
      'Con lắc đồng hồ đung đưa',
      'Sợi dây đàn guitar rung khi gảy',
      'Em bé ngồi trên xích đu đung đưa'
    ],
    correctAnswer: '0',
    explanation: 'Ô tô chuyển động thẳng đều không lặp lại quanh vị trí cân bằng nên không phải là dao động. Các trường hợp còn lại đều là dao động.',
    learningObjectives: ['Nhận biết dao động trong thực tế'],
    keywords: ['dao động', 'ví dụ thực tế', 'chuyển động']
  };

  // Câu 4: Chu kì và tần số
  yield {
    topic,
    subject,
    grade,
    questionType: 'MCQ',
    difficulty: 'EASY',
    content: 'Mối quan hệ giữa chu kì T và tần số f của dao động là:',
    options: [
      'f = 1/T',
      'f = T',
      'f = T²',
      'f = 2πT'
    ],
    correctAnswer: '0',
    explanation: 'Chu kì T là thời gian để thực hiện một dao động toàn phần. Tần số f là số dao động toàn phần thực hiện trong một giây. Mối quan hệ: f = 1/T hay T = 1/f.',
    learningObjectives: ['Hiểu mối quan hệ giữa chu kì và tần số'],
    keywords: ['chu kì', 'tần số', 'mối quan hệ']
  };

  // Câu 5: Định nghĩa dao động điều hòa
  yield {
    topic,
    subject,
    grade,
    questionType: 'MCQ',
    difficulty: 'MEDIUM',
    content: 'Dao động điều hòa là:',
    options: [
      'Dao động mà li độ của vật là hàm cosin (hoặc sin) theo thời gian',
      'Dao động có biên độ tăng dần theo thời gian',
      'Dao động chỉ xảy ra khi có lực cản môi trường',
      'Dao động có chu kì phụ thuộc vào biên độ'
    ],
    correctAnswer: '0',
    explanation: 'Dao động điều hòa là dao động mà li độ của vật là hàm cosin (hoặc sin) theo thời gian: x = A.cos(ωt + φ). Đây là dao động có phương trình vi tích phân mô tả bằng hàm điều hòa.',
    learningObjectives: ['Hiểu định nghĩa dao động điều hòa'],
    keywords: ['dao động điều hòa', 'hàm cosin', 'li độ']
  };

  // Câu 6: Tần số góc và tần số
  yield {
    topic,
    subject,
    grade,
    questionType: 'MCQ',
    difficulty: 'MEDIUM',
    content: 'Mối quan hệ giữa tần số góc ω và tần số f của dao động điều hòa là:',
    options: [
      'ω = 2πf',
      'ω = f/2π',
      'ω = f',
      'ω = πf'
    ],
    correctAnswer: '0',
    explanation: 'Tần số góc ω (rad/s) liên hệ với tần số f (Hz) qua công thức: ω = 2πf. Đây là mối quan hệ cơ bản trong dao động điều hòa.',
    learningObjectives: ['Hiểu mối quan hệ giữa tần số góc và tần số'],
    keywords: ['tần số góc', 'tần số', 'ω', 'mối quan hệ']
  };

  // Câu 7: Phương trình dao động - Xác định pha
  yield {
    topic,
    subject,
    grade,
    questionType: 'MCQ',
    difficulty: 'MEDIUM',
    content: 'Một vật dao động điều hòa với phương trình x = 5cos(10πt + π/2) (cm). Pha của dao động tại thời điểm t = 1/30 s là:',
    options: [
      '5π/6 rad',
      'π/2 rad',
      '2π/3 rad',
      'π/3 rad'
    ],
    correctAnswer: '0',
    explanation: 'Pha của dao động là (ωt + φ). Tại t = 1/30 s: pha = 10π.(1/30) + π/2 = π/3 + π/2 = 5π/6 rad.',
    learningObjectives: ['Tính pha của dao động tại thời điểm cho trước'],
    keywords: ['pha dao động', 'phương trình dao động', 'tính toán']
  };

  // Câu 8: Biên độ dao động
  yield {
    topic,
    subject,
    grade,
    questionType: 'MCQ',
    difficulty: 'EASY',
    content: 'Trong phương trình dao động điều hòa x = Acos(ωt + φ), đại lượng A được gọi là:',
    options: [
      'Biên độ dao động',
      'Chu kì dao động',
      'Tần số góc',
      'Pha ban đầu'
    ],
    correctAnswer: '0',
    explanation: 'Trong phương trình x = Acos(ωt + φ): A là biên độ (li độ cực đại), ω là tần số góc, φ là pha ban đầu, (ωt + φ) là pha tại thời điểm t.',
    learningObjectives: ['Nhận biết các đại lượng trong phương trình dao động'],
    keywords: ['biên độ', 'phương trình dao động', 'đại lượng']
  };

  // Câu 9: Vận tốc trong dao động điều hòa
  yield {
    topic,
    subject,
    grade,
    questionType: 'MCQ',
    difficulty: 'HARD',
    content: 'Vận tốc của vật dao động điều hòa x = Acos(ωt + φ) có biểu thức là:',
    options: [
      'v = -Aωsin(ωt + φ)',
      'v = Acos(ωt + φ)',
      'v = Aωcos(ωt + φ)',
      'v = -Asin(ωt + φ)'
    ],
    correctAnswer: '0',
    explanation: 'Vận tốc là đạo hàm của li độ theo thời gian: v = dx/dt = -Aωsin(ωt + φ). Vận tốc biến thiên điều hòa cùng tần số với li độ nhưng lệch pha π/2 so với li độ.',
    learningObjectives: ['Tìm biểu thức vận tốc từ phương trình li độ'],
    keywords: ['vận tốc', 'đạo hàm', 'dao động điều hòa']
  };

  // Câu 10: Gia tốc trong dao động điều hòa
  yield {
    topic,
    subject,
    grade,
    questionType: 'MCQ',
    difficulty: 'HARD',
    content: 'Gia tốc của vật dao động điều hòa x = Acos(ωt + φ) có đặc điểm gì?',
    options: [
      'a = -ω²x, luôn hướng về vị trí cân bằng',
      'a = ω²x, luôn hướng ra xa vị trí cân bằng',
      'a = -ωx, tỉ lệ với vận tốc',
      'a = ωx, không đổi theo thời gian'
    ],
    correctAnswer: '0',
    explanation: 'Gia tốc là đạo hàm của vận tốc: a = dv/dt = -Aω²cos(ωt + φ) = -ω²x. Gia tốc luôn ngược dấu với li độ, nghĩa là luôn hướng về vị trí cân bằng.',
    learningObjectives: ['Hiểu đặc điểm gia tốc trong dao động điều hòa'],
    keywords: ['gia tốc', 'vị trí cân bằng', 'li độ']
  };

  // Câu 11: Pha ban đầu
  yield {
    topic,
    subject,
    grade,
    questionType: 'MCQ',
    difficulty: 'MEDIUM',
    content: 'Pha ban đầu φ trong phương trình x = Acos(ωt + φ) được xác định bởi:',
    options: [
      'Cách chọn gốc thời gian và chiều dương',
      'Biên độ dao động của vật',
      'Tần số góc của dao động',
      'Lực cản của môi trường'
    ],
    correctAnswer: '0',
    explanation: 'Pha ban đầu φ phụ thuộc vào cách chọn gốc thời gian (t = 0) và chiều dương của trục tọa độ. Nó xác định trạng thái ban đầu của vật.',
    learningObjectives: ['Hiểu ý nghĩa của pha ban đầu'],
    keywords: ['pha ban đầu', 'gốc thời gian', 'trạng thái ban đầu']
  };

  // Câu 12: Chu kì con lắc lò xo
  yield {
    topic,
    subject,
    grade,
    questionType: 'MCQ',
    difficulty: 'MEDIUM',
    content: 'Chu kì dao động của con lắc lò xo được tính bằng công thức:',
    options: [
      'T = 2π√(m/k)',
      'T = 2π√(k/m)',
      'T = 2π√(l/g)',
      'T = 2π√(g/l)'
    ],
    correctAnswer: '0',
    explanation: 'Chu kì con lắc lò xo: T = 2π√(m/k), trong đó m là khối lượng vật nặng (kg), k là độ cứng lò xo (N/m). Chu kì không phụ thuộc vào biên độ.',
    learningObjectives: ['Nhớ công thức chu kì con lắc lò xo'],
    keywords: ['chu kì', 'con lắc lò xo', 'công thức']
  };

  // Câu 13: Tần số dao động
  yield {
    topic,
    subject,
    grade,
    questionType: 'MCQ',
    difficulty: 'EASY',
    content: 'Một vật dao động với chu kì T = 0,5 s. Tần số dao động của vật là:',
    options: [
      '2 Hz',
      '0,5 Hz',
      '1 Hz',
      '4 Hz'
    ],
    correctAnswer: '0',
    explanation: 'Tần số f = 1/T = 1/0,5 = 2 Hz. Vật thực hiện 2 dao động toàn phần trong một giây.',
    learningObjectives: ['Tính tần số từ chu kì'],
    keywords: ['tần số', 'chu kì', 'tính toán']
  };

  // Câu 14: Li độ cực đại
  yield {
    topic,
    subject,
    grade,
    questionType: 'MCQ',
    difficulty: 'EASY',
    content: 'Vật dao động điều hòa với phương trình x = 6cos(4πt) (cm). Li độ cực đại của vật là:',
    options: [
      '6 cm',
      '4 cm',
      '12 cm',
      '24 cm'
    ],
    correctAnswer: '0',
    explanation: 'Li độ cực đại chính là biên độ A. Từ phương trình x = 6cos(4πt), ta có A = 6 cm.',
    learningObjectives: ['Xác định biên độ từ phương trình dao động'],
    keywords: ['li độ cực đại', 'biên độ', 'phương trình']
  };

  // Câu 15: Vận tốc cực đại
  yield {
    topic,
    subject,
    grade,
    questionType: 'MCQ',
    difficulty: 'HARD',
    content: 'Vật dao động điều hòa với phương trình x = 5cos(10πt) (cm). Vận tốc cực đại của vật là:',
    options: [
      '50π cm/s',
      '10π cm/s',
      '5π cm/s',
      '25π cm/s'
    ],
    correctAnswer: '0',
    explanation: 'Vận tốc cực đại vmax = Aω. Từ phương trình: A = 5 cm, ω = 10π rad/s. Vậy vmax = 5 × 10π = 50π cm/s.',
    learningObjectives: ['Tính vận tốc cực đại'],
    keywords: ['vận tốc cực đại', 'biên độ', 'tần số góc']
  };

  // Câu 16: Gia tốc cực đại
  yield {
    topic,
    subject,
    grade,
    questionType: 'MCQ',
    difficulty: 'HARD',
    content: 'Vật dao động điều hòa với phương trình x = 4cos(5πt) (cm). Gia tốc cực đại của vật là (lấy π² ≈ 10):',
    options: [
      '10 m/s²',
      '5 m/s²',
      '20 m/s²',
      '2,5 m/s²'
    ],
    correctAnswer: '0',
    explanation: 'Gia tốc cực đại amax = Aω². Từ phương trình: A = 4 cm = 0,04 m, ω = 5π rad/s. amax = 0,04 × (5π)² = 0,04 × 25π² ≈ 0,04 × 25 × 10 = 10 m/s².',
    learningObjectives: ['Tính gia tốc cực đại'],
    keywords: ['gia tốc cực đại', 'biên độ', 'tần số góc']
  };

  // Câu 17: Dao động ngược pha
  yield {
    topic,
    subject,
    grade,
    questionType: 'MCQ',
    difficulty: 'MEDIUM',
    content: 'Hai dao động ngược pha khi độ lệch pha của chúng bằng:',
    options: [
      'π rad (180°)',
      '0 rad',
      'π/2 rad (90°)',
      '2π rad (360°)'
    ],
    correctAnswer: '0',
    explanation: 'Hai dao động ngược pha khi độ lệch pha Δφ = π rad (180°). Khi đó, nếu vật này ở li độ dương cực đại thì vật kia ở li độ âm cực đại.',
    learningObjectives: ['Hiểu khái niệm dao động ngược pha'],
    keywords: ['ngược pha', 'độ lệch pha', 'π rad']
  };

  // Câu 18: Dao động cùng pha
  yield {
    topic,
    subject,
    grade,
    questionType: 'MCQ',
    difficulty: 'MEDIUM',
    content: 'Hai dao động cùng pha khi độ lệch pha của chúng bằng:',
    options: [
      '0 rad hoặc bội số nguyên của 2π',
      'π rad',
      'π/2 rad',
      'π/4 rad'
    ],
    correctAnswer: '0',
    explanation: 'Hai dao động cùng pha khi độ lệch pha Δφ = 0 rad hoặc Δφ = 2kπ (k nguyên). Khi đó, hai vật luôn có cùng li độ tại mọi thời điểm.',
    learningObjectives: ['Hiểu khái niệm dao động cùng pha'],
    keywords: ['cùng pha', 'độ lệch pha', '2π']
  };

  // Câu 19: Ứng dụng thực tế - Nhịp tim
  yield {
    topic,
    subject,
    grade,
    questionType: 'MCQ',
    difficulty: 'EASY',
    content: 'Nhịp tim bình thường của người trưởng thành khoảng 60-100 lần/phút. Tần số tim là:',
    options: [
      '1-1,67 Hz',
      '60-100 Hz',
      '0,6-1 Hz',
      '10-16 Hz'
    ],
    correctAnswer: '0',
    explanation: 'Tần số f = số nhịp/giây. Với 60-100 nhịp/phút = 60-100 nhịp/60 giây = 1-1,67 nhịp/giây = 1-1,67 Hz.',
    learningObjectives: ['Áp dụng khái niệm tần số vào thực tế'],
    keywords: ['nhịp tim', 'tần số', 'ứng dụng thực tế']
  };

  // Câu 20: Tổng hợp kiến thức
  yield {
    topic,
    subject,
    grade,
    questionType: 'MCQ',
    difficulty: 'HARD',
    content: 'Vật dao động điều hòa với phương trình x = 10cos(2πt + π/3) (cm). Tại thời điểm t = 0, li độ của vật là:',
    options: [
      '5 cm',
      '10 cm',
      '-5 cm',
      '5√3 cm'
    ],
    correctAnswer: '0',
    explanation: 'Tại t = 0: x = 10cos(π/3) = 10 × 0,5 = 5 cm. Vật ở li độ dương và đang chuyển động theo chiều âm (vì pha ban đầu π/3 nằm trong góc phần tư thứ nhất).',
    learningObjectives: ['Tính li độ tại thời điểm cho trước'],
    keywords: ['li độ', 'pha ban đầu', 'tính toán']
  };
}

async function main() {
  let createdBy = 'system-seed';
  try {
    const user = await prisma.user.findFirst({
      where: { role: { in: ['ADMIN', 'TEACHER'] } },
      select: { id: true },
    });
    if (user) createdBy = user.id;
  } catch {
    // ignore
  }

  const all: QuestionInput[] = [];
  for (const q of genDaoDongDieuHoa()) {
    all.push(q);
  }

  console.log(`Generated ${all.length} questions about Dao động điều hòa. Inserting...`);

  let inserted = 0;
  for (const q of all) {
    try {
      await prisma.question.create({
        data: {
          topic: q.topic,
          subject: q.subject,
          grade: q.grade,
          questionType: q.questionType,
          difficulty: q.difficulty,
          content: q.content,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          learningObjectives: q.learningObjectives,
          keywords: q.keywords,
          tags: q.keywords,
          status: 'Công bố',
          aiGenerated: false,
          humanReviewed: false,
          createdBy,
        },
      });
      inserted++;
      console.log(`✓ Added: ${q.content.substring(0, 50)}...`);
    } catch (e) {
      console.warn('Skip:', (e as Error).message);
    }
  }

  console.log(`\n✅ Successfully inserted ${inserted}/${all.length} questions.`);

  const counts = await prisma.question.groupBy({
    by: ['grade', 'topic'],
    where: { subject: 'Vật lí', topic: 'Dao động điều hòa' },
    _count: { id: true },
  });
  console.log('\nQuestions by grade and topic:', counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
