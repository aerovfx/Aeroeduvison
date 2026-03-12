/**
 * Seed ~1000 câu trắc nghiệm Vật lí 10, 11, 12 vào ngân hàng câu hỏi.
 * Chạy: npx tsx scripts/seed-physics-question-bank.ts
 * Hoặc: bun run scripts/seed-physics-question-bank.ts
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

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Sinh câu hỏi Vật lí 10 */
function* genPhysics10(): Generator<QuestionInput> {
  const topics = [
    'Chuyển động cơ',
    'Động lực học chất điểm',
    'Cân bằng và chuyển động vật rắn',
    'Các định luật bảo toàn',
    'Chất khí',
    'Cơ sở nhiệt động lực học',
    'Chất rắn và chất lỏng',
  ];
  const diff: Difficulty[] = ['EASY', 'MEDIUM', 'HARD'];

  // Mẫu: chuyển động thẳng đều
  for (let i = 0; i < 80; i++) {
    const v = randInt(2, 20);
    const t = randInt(1, 15);
    const s = v * t;
    const wrong = [s + randInt(5, 15), s - randInt(2, 8), v * (t + 1), v * (t - 1)].filter((x) => x > 0 && x !== s);
    const opts = [String(s), ...wrong.slice(0, 3).map(String)];
    for (let j = opts.length; j < 4; j++) opts.push(String(randInt(10, 200)));
    const correct = opts[0];
    opts.sort(() => Math.random() - 0.5);
    const correctIndex = opts.indexOf(correct);
    yield {
      topic: pick(topics),
      subject: 'Vật lí',
      grade: '10',
      questionType: 'MCQ',
      difficulty: pick(diff),
      content: `Một vật chuyển động thẳng đều với vận tốc ${v} m/s. Quãng đường vật đi được trong ${t} s là bao nhiêu mét?`,
      options: opts,
      correctAnswer: String(correctIndex),
      explanation: `Quãng đường s = v.t = ${v}.${t} = ${s} m.`,
      learningObjectives: ['Vận dụng công thức chuyển động thẳng đều'],
      keywords: ['chuyển động thẳng đều', 'quãng đường', 'vận tốc'],
    };
  }

  // Định luật II Newton: F = ma
  for (let i = 0; i < 80; i++) {
    const m = randInt(1, 20);
    const a = randInt(1, 10);
    const f = m * a;
    const wrong = [f + randInt(5, 20), f - randInt(2, 15), m + a, m * (a + 1)];
    const opts = [String(f), ...wrong.filter((x) => x > 0 && x !== f).slice(0, 3).map(String)];
    while (opts.length < 4) opts.push(String(randInt(5, 150)));
    const correct = opts[0];
    opts.sort(() => Math.random() - 0.5);
    yield {
      topic: pick(topics),
      subject: 'Vật lí',
      grade: '10',
      questionType: 'MCQ',
      difficulty: pick(diff),
      content: `Vật có khối lượng ${m} kg chuyển động với gia tốc ${a} m/s². Độ lớn hợp lực tác dụng lên vật là bao nhiêu N?`,
      options: opts,
      correctAnswer: String(opts.indexOf(correct)),
      explanation: `Theo định luật II Newton: F = m.a = ${m}.${a} = ${f} N.`,
      learningObjectives: ['Vận dụng định luật II Newton'],
      keywords: ['định luật II Newton', 'hợp lực', 'gia tốc'],
    };
  }

  // Động năng Wđ = (1/2)mv²
  for (let i = 0; i < 70; i++) {
    const m = randInt(2, 15);
    const v = randInt(2, 12);
    const w = Math.round(0.5 * m * v * v);
    const wrong = [w + randInt(10, 50), w - randInt(5, 30), m * v, 2 * w];
    const opts = [String(w), ...wrong.filter((x) => x > 0 && x !== w).slice(0, 3).map(String)];
    while (opts.length < 4) opts.push(String(randInt(20, 500)));
    const correct = opts[0];
    opts.sort(() => Math.random() - 0.5);
    yield {
      topic: pick(topics),
      subject: 'Vật lí',
      grade: '10',
      questionType: 'MCQ',
      difficulty: pick(diff),
      content: `Vật khối lượng ${m} kg đang chuyển động với vận tốc ${v} m/s. Động năng của vật là bao nhiêu J?`,
      options: opts,
      correctAnswer: String(opts.indexOf(correct)),
      explanation: `Động năng Wđ = (1/2)mv² = 0,5.${m}.${v}² = ${w} J.`,
      learningObjectives: ['Tính động năng'],
      keywords: ['động năng', 'khối lượng', 'vận tốc'],
    };
  }

  // Thế năng hấp dẫn Wt = mgh
  for (let i = 0; i < 60; i++) {
    const m = randInt(1, 10);
    const g = 10;
    const h = randInt(2, 20);
    const w = m * g * h;
    const wrong = [w + randInt(20, 80), w - randInt(10, 50), m * h, w / 2];
    const opts = [String(w), ...wrong.filter((x) => x > 0 && x !== w).slice(0, 3).map(String)];
    while (opts.length < 4) opts.push(String(randInt(50, 300)));
    const correct = opts[0];
    opts.sort(() => Math.random() - 0.5);
    yield {
      topic: pick(topics),
      subject: 'Vật lí',
      grade: '10',
      questionType: 'MCQ',
      difficulty: pick(diff),
      content: `Vật khối lượng ${m} kg đặt ở độ cao ${h} m so với mặt đất (g = 10 m/s²). Thế năng trọng trường của vật là bao nhiêu J?`,
      options: opts,
      correctAnswer: String(opts.indexOf(correct)),
      explanation: `Thế năng Wt = mgh = ${m}.10.${h} = ${w} J.`,
      learningObjectives: ['Tính thế năng hấp dẫn'],
      keywords: ['thế năng', 'trọng trường', 'độ cao'],
    };
  }

  // Nhiệt độ, áp suất chất khí (đơn giản)
  for (let i = 0; i < 60; i++) {
    const t = randInt(27, 47);
    const T = t + 273;
    const wrong = [T + randInt(5, 30), T - randInt(5, 20), t, T * 2];
    const opts = [String(T), ...wrong.filter((x) => x > 0 && x !== T).slice(0, 3).map(String)];
    while (opts.length < 4) opts.push(String(randInt(250, 350)));
    const correct = opts[0];
    opts.sort(() => Math.random() - 0.5);
    yield {
      topic: pick(topics),
      subject: 'Vật lí',
      grade: '10',
      questionType: 'MCQ',
      difficulty: pick(diff),
      content: `Nhiệt độ ${t}°C bằng bao nhiêu K trong thang Kelvin?`,
      options: opts,
      correctAnswer: String(opts.indexOf(correct)),
      explanation: `T(K) = t(°C) + 273 = ${t} + 273 = ${T} K.`,
      learningObjectives: ['Đổi đơn vị nhiệt độ'],
      keywords: ['nhiệt độ', 'Kelvin', 'Celsius'],
    };
  }
}

/** Sinh câu hỏi Vật lí 11 */
function* genPhysics11(): Generator<QuestionInput> {
  const topics = [
    'Điện tích - Điện trường',
    'Dòng điện không đổi',
    'Dòng điện trong các môi trường',
    'Từ trường',
    'Cảm ứng điện từ',
    'Khúc xạ ánh sáng',
    'Mắt và dụng cụ quang học',
  ];
  const diff: Difficulty[] = ['EASY', 'MEDIUM', 'HARD'];

  // Định luật Ohm U = I.R
  for (let i = 0; i < 100; i++) {
    const r = randInt(2, 50);
    const i_ = randInt(1, 10);
    const u = r * i_;
    const wrong = [u + randInt(5, 30), u - randInt(2, 20), r + i_, r / i_].filter((x) => x > 0 && x !== u);
    const opts = [String(u), ...wrong.slice(0, 3).map(String)];
    while (opts.length < 4) opts.push(String(randInt(10, 200)));
    const correct = opts[0];
    opts.sort(() => Math.random() - 0.5);
    yield {
      topic: pick(topics),
      subject: 'Vật lí',
      grade: '11',
      questionType: 'MCQ',
      difficulty: pick(diff),
      content: `Đoạn mạch có điện trở R = ${r} Ω, cường độ dòng điện I = ${i_} A. Hiệu điện thế hai đầu đoạn mạch là bao nhiêu V?`,
      options: opts,
      correctAnswer: String(opts.indexOf(correct)),
      explanation: `Định luật Ohm: U = I.R = ${i_}.${r} = ${u} V.`,
      learningObjectives: ['Vận dụng định luật Ohm'],
      keywords: ['định luật Ohm', 'hiệu điện thế', 'cường độ dòng điện'],
    };
  }

  // Công suất P = U.I
  for (let i = 0; i < 80; i++) {
    const u = randInt(10, 220);
    const i_ = randInt(1, 10);
    const p = u * i_;
    const wrong = [p + randInt(20, 100), p - randInt(10, 80), u + i_, u / i_];
    const opts = [String(p), ...wrong.filter((x) => x > 0 && x !== p).slice(0, 3).map(String)];
    while (opts.length < 4) opts.push(String(randInt(50, 500)));
    const correct = opts[0];
    opts.sort(() => Math.random() - 0.5);
    yield {
      topic: pick(topics),
      subject: 'Vật lí',
      grade: '11',
      questionType: 'MCQ',
      difficulty: pick(diff),
      content: `Mạch điện có hiệu điện thế U = ${u} V, cường độ dòng điện I = ${i_} A. Công suất tiêu thụ là bao nhiêu W?`,
      options: opts,
      correctAnswer: String(opts.indexOf(correct)),
      explanation: `Công suất P = U.I = ${u}.${i_} = ${p} W.`,
      learningObjectives: ['Tính công suất điện'],
      keywords: ['công suất', 'hiệu điện thế', 'dòng điện'],
    };
  }

  // Lực từ F = B.I.l (đơn giản)
  for (let i = 0; i < 70; i++) {
    const b = randInt(1, 5) * 0.1;
    const i_ = randInt(1, 5);
    const l = randInt(10, 50);
    const f = Math.round(b * i_ * l * 10) / 10;
    const wrong = [f + 0.5, f - 0.3, b * i_, b * l];
    const opts = [String(f), ...wrong.filter((x) => x > 0 && x !== f).slice(0, 3).map(String)];
    while (opts.length < 4) opts.push((f + randInt(1, 5)).toFixed(1));
    const correct = opts[0];
    opts.sort(() => Math.random() - 0.5);
    yield {
      topic: pick(topics),
      subject: 'Vật lí',
      grade: '11',
      questionType: 'MCQ',
      difficulty: pick(diff),
      content: `Dây dẫn thẳng dài ${l} cm đặt trong từ trường đều B = ${b} T, dòng điện I = ${i_} A vuông góc với cảm ứng từ. Độ lớn lực từ tác dụng lên đoạn dây là bao nhiêu N?`,
      options: opts,
      correctAnswer: String(opts.indexOf(correct)),
      explanation: `F = B.I.l = ${b}.${i_}.${l / 100} = ${f} N (l đổi ra m).`,
      learningObjectives: ['Lực từ tác dụng lên dây dẫn'],
      keywords: ['lực từ', 'cảm ứng từ', 'dòng điện'],
    };
  }

  // Định luật khúc xạ n1.sin(i) = n2.sin(r) - câu hỏi lý thuyết / số đơn giản
  const n1n2 = [
    { n1: 1, n2: 1.33, name: 'không khí - nước' },
    { n1: 1, n2: 1.5, name: 'không khí - thủy tinh' },
    { n1: 1.33, n2: 1, name: 'nước - không khí' },
  ];
  for (let i = 0; i < 60; i++) {
    const { n1, n2, name } = pick(n1n2);
    const i_deg = randInt(20, 50);
    const i_rad = (i_deg * Math.PI) / 180;
    const sinR = (n1 / n2) * Math.sin(i_rad);
    const r_deg = Math.round((Math.asin(Math.min(1, sinR)) * 180) / Math.PI);
    const wrong = [r_deg + randInt(2, 10), r_deg - randInt(2, 8), i_deg, Math.round(i_deg * n2 / n1)];
    const opts = [String(r_deg), ...wrong.filter((x) => x > 0 && x < 90 && x !== r_deg).slice(0, 3).map(String)];
    while (opts.length < 4) opts.push(String(randInt(10, 60)));
    const correct = opts[0];
    opts.sort(() => Math.random() - 0.5);
    yield {
      topic: pick(topics),
      subject: 'Vật lí',
      grade: '11',
      questionType: 'MCQ',
      difficulty: pick(diff),
      content: `Tia sáng truyền từ môi trường (1) sang môi trường (2) với góc tới ${i_deg}°. Biết chiết suất n1 = ${n1}, n2 = ${n2}. Góc khúc xạ gần bằng bao nhiêu độ?`,
      options: opts,
      correctAnswer: String(opts.indexOf(correct)),
      explanation: `Định luật khúc xạ: n1.sini = n2.sinr ⇒ sinr = (n1/n2)sini ⇒ r ≈ ${r_deg}°.`,
      learningObjectives: ['Định luật khúc xạ ánh sáng'],
      keywords: ['khúc xạ', 'chiết suất', 'góc tới'],
    };
  }
}

/** Sinh câu hỏi Vật lí 12 */
function* genPhysics12(): Generator<QuestionInput> {
  const topics = [
    'Dao động cơ',
    'Sóng cơ',
    'Dòng điện xoay chiều',
    'Dao động và sóng điện từ',
    'Sóng ánh sáng',
    'Lượng tử ánh sáng',
    'Hạt nhân nguyên tử',
  ];
  const diff: Difficulty[] = ['EASY', 'MEDIUM', 'HARD'];

  // Dao động: T = 2π√(l/g), ω = 2π/T
  for (let i = 0; i < 100; i++) {
    const l = randInt(40, 120) / 100;
    const g = 10;
    const T = (2 * Math.PI * Math.sqrt(l / g)).toFixed(2);
    const wrong = [(parseFloat(T) + 0.2).toFixed(2), (parseFloat(T) - 0.1).toFixed(2), (2 * Math.PI * l).toFixed(2), (Math.sqrt(l) * 2).toFixed(2)];
    const opts = [T, ...wrong.filter((x) => parseFloat(x) > 0 && x !== T).slice(0, 3)];
    while (opts.length < 4) opts.push((randInt(10, 30) / 10).toFixed(2));
    const correct = opts[0];
    opts.sort(() => Math.random() - 0.5);
    yield {
      topic: pick(topics),
      subject: 'Vật lí',
      grade: '12',
      questionType: 'MCQ',
      difficulty: pick(diff),
      content: `Con lắc đơn có chiều dài l = ${l} m, g = 10 m/s². Chu kì dao động T là bao nhiêu s?`,
      options: opts,
      correctAnswer: String(opts.indexOf(correct)),
      explanation: `T = 2π√(l/g) = 2π√(${l}/10) ≈ ${T} s.`,
      learningObjectives: ['Chu kì con lắc đơn'],
      keywords: ['con lắc đơn', 'chu kì', 'dao động'],
    };
  }

  // Sóng: v = λ.f
  for (let i = 0; i < 90; i++) {
    const lam = randInt(2, 20);
    const f = randInt(10, 100);
    const v = lam * f;
    const wrong = [v + randInt(20, 100), v - randInt(10, 50), lam + f, lam / f];
    const opts = [String(v), ...wrong.filter((x) => x > 0 && x !== v).slice(0, 3).map(String)];
    while (opts.length < 4) opts.push(String(randInt(50, 500)));
    const correct = opts[0];
    opts.sort(() => Math.random() - 0.5);
    yield {
      topic: pick(topics),
      subject: 'Vật lí',
      grade: '12',
      questionType: 'MCQ',
      difficulty: pick(diff),
      content: `Sóng cơ có bước sóng λ = ${lam} m và tần số f = ${f} Hz. Tốc độ truyền sóng là bao nhiêu m/s?`,
      options: opts,
      correctAnswer: String(opts.indexOf(correct)),
      explanation: `v = λ.f = ${lam}.${f} = ${v} m/s.`,
      learningObjectives: ['Tốc độ truyền sóng'],
      keywords: ['sóng cơ', 'bước sóng', 'tần số'],
    };
  }

  // Dòng điện xoay chiều: U = U0/√2
  for (let i = 0; i < 80; i++) {
    const u0 = randInt(100, 400);
    const u = Math.round((u0 / Math.sqrt(2)) * 10) / 10;
    const wrong = [u + randInt(5, 30), u - randInt(5, 20), u0, u0 / 2];
    const opts = [String(u), ...wrong.filter((x) => x > 0 && x !== u).slice(0, 3).map(String)];
    while (opts.length < 4) opts.push(String(randInt(50, 350)));
    const correct = opts[0];
    opts.sort(() => Math.random() - 0.5);
    yield {
      topic: pick(topics),
      subject: 'Vật lí',
      grade: '12',
      questionType: 'MCQ',
      difficulty: pick(diff),
      content: `Điện áp xoay chiều có giá trị cực đại U0 = ${u0} V. Giá trị hiệu dụng U là bao nhiêu V?`,
      options: opts,
      correctAnswer: String(opts.indexOf(correct)),
      explanation: `U = U0/√2 = ${u0}/√2 ≈ ${u} V.`,
      learningObjectives: ['Giá trị hiệu dụng điện áp xoay chiều'],
      keywords: ['điện áp xoay chiều', 'giá trị hiệu dụng'],
    };
  }

  // Lượng tử: E = hf, h = 6,625.10^-34
  for (let i = 0; i < 70; i++) {
    const f = randInt(4, 15) * 1e14;
    const h = 6.625e-34;
    const e = (h * f).toExponential(2);
    const wrong = [(h * f * 2).toExponential(2), (h * f * 0.5).toExponential(2), (h * (f + 1e14)).toExponential(2)];
    const opts = [e, ...wrong.filter((x) => x !== e).slice(0, 3)];
    while (opts.length < 4) opts.push((h * randInt(1, 20) * 1e14).toExponential(2));
    const correct = opts[0];
    opts.sort(() => Math.random() - 0.5);
    yield {
      topic: pick(topics),
      subject: 'Vật lí',
      grade: '12',
      questionType: 'MCQ',
      difficulty: pick(diff),
      content: `Photon có tần số f = ${(f / 1e14).toFixed(1)}.10¹⁴ Hz. Năng lượng photon (h = 6,625.10⁻³⁴ J.s) có giá trị gần đúng nào sau đây?`,
      options: opts,
      correctAnswer: String(opts.indexOf(correct)),
      explanation: `E = h.f = 6,625.10⁻³⁴.${f} ≈ ${e} J.`,
      learningObjectives: ['Năng lượng photon'],
      keywords: ['lượng tử', 'photon', 'năng lượng'],
    };
  }

  // Hạt nhân: số khối A, điện tích Z
  for (let i = 0; i < 60; i++) {
    const z = randInt(1, 30);
    const n = randInt(0, 40);
    const a = z + n;
    const wrong = [a + 1, a - 1, z + n + 2, n - z];
    const opts = [String(a), ...wrong.filter((x) => x > 0 && x !== a).slice(0, 3).map(String)];
    while (opts.length < 4) opts.push(String(randInt(10, 80)));
    const correct = opts[0];
    opts.sort(() => Math.random() - 0.5);
    yield {
      topic: pick(topics),
      subject: 'Vật lí',
      grade: '12',
      questionType: 'MCQ',
      difficulty: pick(diff),
      content: `Hạt nhân có số proton Z = ${z}, số nơtron N = ${n}. Số khối A bằng bao nhiêu?`,
      options: opts,
      correctAnswer: String(opts.indexOf(correct)),
      explanation: `Số khối A = Z + N = ${z} + ${n} = ${a}.`,
      learningObjectives: ['Cấu tạo hạt nhân'],
      keywords: ['số khối', 'proton', 'nơtron'],
    };
  }
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

  const totalTarget = 1000;
  const all: QuestionInput[] = [];
  const g10 = genPhysics10();
  const g11 = genPhysics11();
  const g12 = genPhysics12();
  const gens = [g10, g11, g12];
  let gi = 0;
  while (all.length < totalTarget) {
    const g = gens[gi % 3];
    const next = g.next();
    if (next.done) {
      gi++;
      if (gi >= 3) break;
      continue;
    }
    all.push(next.value);
    gi++;
  }

  console.log(`Generated ${all.length} questions. Inserting...`);
  const batchSize = 50;
  let inserted = 0;
  for (let i = 0; i < all.length; i += batchSize) {
    const batch = all.slice(i, i + batchSize);
    for (const q of batch) {
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
      } catch (e) {
        console.warn('Skip:', (e as Error).message);
      }
    }
    console.log(`Inserted ${inserted}/${all.length}...`);
  }

  const counts = await prisma.question.groupBy({
    by: ['grade'],
    where: { subject: 'Vật lí' },
    _count: { id: true },
  });
  console.log('Done. Vật lí theo khối:', counts);
  console.log('Tổng câu Vật lí:', await prisma.question.count({ where: { subject: 'Vật lí' } }));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
