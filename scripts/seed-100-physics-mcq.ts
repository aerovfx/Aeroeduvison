/**
 * Seed đúng 100 câu trắc nghiệm 4 lựa chọn (A, B, C, D) - Vật lí 10, 11, 12.
 * Chạy: npx tsx scripts/seed-100-physics-mcq.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Difficulty = "EASY" | "MEDIUM" | "HARD";

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

/** Lấy n câu từ generator */
function take<T>(gen: Generator<T>, n: number): T[] {
  const out: T[] = [];
  for (let i = 0; i < n; i++) {
    const next = gen.next();
    if (next.done) break;
    out.push(next.value);
  }
  return out;
}

/** Vật lí 10: chuyển động thẳng đều, F=ma, động năng, thế năng */
function* genPhysics10(): Generator<QuestionInput> {
  const topics = ["Chuyển động cơ", "Động lực học chất điểm", "Các định luật bảo toàn", "Chất khí"];
  const diff: Difficulty[] = ["EASY", "MEDIUM", "HARD"];
  for (let i = 0; i < 50; i++) {
    const v = randInt(2, 20);
    const t = randInt(1, 15);
    const s = v * t;
    const wrong = [s + randInt(5, 15), s - randInt(2, 8), v * (t + 1)].filter((x) => x > 0 && x !== s);
    const opts = [String(s), ...wrong.map(String)];
    while (opts.length < 4) opts.push(String(randInt(10, 200)));
    const correct = opts[0];
    opts.sort(() => Math.random() - 0.5);
    yield {
      topic: pick(topics),
      subject: "Vật lí",
      grade: "10",
      questionType: "MCQ",
      difficulty: pick(diff),
      content: `Một vật chuyển động thẳng đều với vận tốc ${v} m/s. Quãng đường vật đi được trong ${t} s là bao nhiêu mét?`,
      options: opts,
      correctAnswer: String(opts.indexOf(correct)),
      explanation: `Quãng đường s = v.t = ${v}.${t} = ${s} m.`,
      learningObjectives: ["Vận dụng công thức chuyển động thẳng đều"],
      keywords: ["chuyển động thẳng đều", "quãng đường", "vận tốc"],
    };
  }
  for (let i = 0; i < 50; i++) {
    const m = randInt(1, 20);
    const a = randInt(1, 10);
    const f = m * a;
    const wrong = [f + randInt(5, 20), f - randInt(2, 15), m * (a + 1)].filter((x) => x > 0 && x !== f);
    const opts = [String(f), ...wrong.slice(0, 3).map(String)];
    while (opts.length < 4) opts.push(String(randInt(5, 150)));
    const correct = opts[0];
    opts.sort(() => Math.random() - 0.5);
    yield {
      topic: pick(topics),
      subject: "Vật lí",
      grade: "10",
      questionType: "MCQ",
      difficulty: pick(diff),
      content: `Vật có khối lượng ${m} kg chuyển động với gia tốc ${a} m/s². Độ lớn hợp lực tác dụng lên vật là bao nhiêu N?`,
      options: opts,
      correctAnswer: String(opts.indexOf(correct)),
      explanation: `Theo định luật II Newton: F = m.a = ${m}.${a} = ${f} N.`,
      learningObjectives: ["Vận dụng định luật II Newton"],
      keywords: ["định luật II Newton", "hợp lực", "gia tốc"],
    };
  }
}

/** Vật lí 11: Ohm, công suất, lực từ, khúc xạ */
function* genPhysics11(): Generator<QuestionInput> {
  const topics = ["Điện tích - Điện trường", "Dòng điện không đổi", "Từ trường", "Khúc xạ ánh sáng"];
  const diff: Difficulty[] = ["EASY", "MEDIUM", "HARD"];
  for (let i = 0; i < 50; i++) {
    const r = randInt(2, 50);
    const i_ = randInt(1, 10);
    const u = r * i_;
    const wrong = [u + randInt(5, 30), u - randInt(2, 20), r + i_].filter((x) => x > 0 && x !== u);
    const opts = [String(u), ...wrong.slice(0, 3).map(String)];
    while (opts.length < 4) opts.push(String(randInt(10, 200)));
    const correct = opts[0];
    opts.sort(() => Math.random() - 0.5);
    yield {
      topic: pick(topics),
      subject: "Vật lí",
      grade: "11",
      questionType: "MCQ",
      difficulty: pick(diff),
      content: `Đoạn mạch có điện trở R = ${r} Ω, cường độ dòng điện I = ${i_} A. Hiệu điện thế hai đầu đoạn mạch là bao nhiêu V?`,
      options: opts,
      correctAnswer: String(opts.indexOf(correct)),
      explanation: `Định luật Ohm: U = I.R = ${i_}.${r} = ${u} V.`,
      learningObjectives: ["Vận dụng định luật Ohm"],
      keywords: ["định luật Ohm", "hiệu điện thế", "cường độ dòng điện"],
    };
  }
  for (let i = 0; i < 50; i++) {
    const u = randInt(10, 220);
    const i_ = randInt(1, 10);
    const p = u * i_;
    const wrong = [p + randInt(20, 100), p - randInt(10, 80), u / i_].filter((x) => x > 0 && x !== p);
    const opts = [String(p), ...wrong.slice(0, 3).map(String)];
    while (opts.length < 4) opts.push(String(randInt(50, 500)));
    const correct = opts[0];
    opts.sort(() => Math.random() - 0.5);
    yield {
      topic: pick(topics),
      subject: "Vật lí",
      grade: "11",
      questionType: "MCQ",
      difficulty: pick(diff),
      content: `Mạch điện có hiệu điện thế U = ${u} V, cường độ dòng điện I = ${i_} A. Công suất tiêu thụ là bao nhiêu W?`,
      options: opts,
      correctAnswer: String(opts.indexOf(correct)),
      explanation: `Công suất P = U.I = ${u}.${i_} = ${p} W.`,
      learningObjectives: ["Tính công suất điện"],
      keywords: ["công suất", "hiệu điện thế", "dòng điện"],
    };
  }
}

/** Vật lí 12: con lắc đơn, sóng cơ, điện xoay chiều, hạt nhân */
function* genPhysics12(): Generator<QuestionInput> {
  const topics = ["Dao động cơ", "Sóng cơ", "Dòng điện xoay chiều", "Hạt nhân nguyên tử"];
  const diff: Difficulty[] = ["EASY", "MEDIUM", "HARD"];
  for (let i = 0; i < 40; i++) {
    const l = randInt(40, 120) / 100;
    const g = 10;
    const T = (2 * Math.PI * Math.sqrt(l / g)).toFixed(2);
    const wrong = [
      (parseFloat(T) + 0.2).toFixed(2),
      (parseFloat(T) - 0.1).toFixed(2),
      (2 * Math.PI * l).toFixed(2),
    ].filter((x) => parseFloat(x) > 0 && x !== T);
    const opts = [T, ...wrong.slice(0, 3)];
    while (opts.length < 4) opts.push((randInt(10, 30) / 10).toFixed(2));
    const correct = opts[0];
    opts.sort(() => Math.random() - 0.5);
    yield {
      topic: pick(topics),
      subject: "Vật lí",
      grade: "12",
      questionType: "MCQ",
      difficulty: pick(diff),
      content: `Con lắc đơn có chiều dài l = ${l} m, g = 10 m/s². Chu kì dao động T là bao nhiêu s?`,
      options: opts,
      correctAnswer: String(opts.indexOf(correct)),
      explanation: `T = 2π√(l/g) = 2π√(${l}/10) ≈ ${T} s.`,
      learningObjectives: ["Chu kì con lắc đơn"],
      keywords: ["con lắc đơn", "chu kì", "dao động"],
    };
  }
  for (let i = 0; i < 40; i++) {
    const lam = randInt(2, 20);
    const f = randInt(10, 100);
    const v = lam * f;
    const wrong = [v + randInt(20, 100), v - randInt(10, 50), lam + f].filter((x) => x > 0 && x !== v);
    const opts = [String(v), ...wrong.slice(0, 3).map(String)];
    while (opts.length < 4) opts.push(String(randInt(50, 500)));
    const correct = opts[0];
    opts.sort(() => Math.random() - 0.5);
    yield {
      topic: pick(topics),
      subject: "Vật lí",
      grade: "12",
      questionType: "MCQ",
      difficulty: pick(diff),
      content: `Sóng cơ có bước sóng λ = ${lam} m và tần số f = ${f} Hz. Tốc độ truyền sóng là bao nhiêu m/s?`,
      options: opts,
      correctAnswer: String(opts.indexOf(correct)),
      explanation: `v = λ.f = ${lam}.${f} = ${v} m/s.`,
      learningObjectives: ["Tốc độ truyền sóng"],
      keywords: ["sóng cơ", "bước sóng", "tần số"],
    };
  }
  for (let i = 0; i < 40; i++) {
    const z = randInt(1, 30);
    const n = randInt(0, 40);
    const a = z + n;
    const wrong = [a + 1, a - 1, z + n + 2].filter((x) => x > 0 && x !== a);
    const opts = [String(a), ...wrong.slice(0, 3).map(String)];
    while (opts.length < 4) opts.push(String(randInt(10, 80)));
    const correct = opts[0];
    opts.sort(() => Math.random() - 0.5);
    yield {
      topic: pick(topics),
      subject: "Vật lí",
      grade: "12",
      questionType: "MCQ",
      difficulty: pick(diff),
      content: `Hạt nhân có số proton Z = ${z}, số nơtron N = ${n}. Số khối A bằng bao nhiêu?`,
      options: opts,
      correctAnswer: String(opts.indexOf(correct)),
      explanation: `Số khối A = Z + N = ${z} + ${n} = ${a}.`,
      learningObjectives: ["Cấu tạo hạt nhân"],
      keywords: ["số khối", "proton", "nơtron"],
    };
  }
}

async function main() {
  let createdBy = "system-seed";
  try {
    const user = await prisma.user.findFirst({
      where: { role: { in: ["ADMIN", "TEACHER"] } },
      select: { id: true },
    });
    if (user) createdBy = user.id;
  } catch {
    // ignore
  }

  const all: QuestionInput[] = [
    ...take(genPhysics10(), 34),
    ...take(genPhysics11(), 33),
    ...take(genPhysics12(), 33),
  ];

  console.log(`Đang thêm ${all.length} câu trắc nghiệm 4 lựa chọn (Vật lí 10, 11, 12)...`);

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
          status: "Đã duyệt",
          aiGenerated: false,
          humanReviewed: false,
          createdBy,
        },
      });
      inserted++;
    } catch (e) {
      console.warn("Bỏ qua:", (e as Error).message);
    }
  }

  const counts = await prisma.question.groupBy({
    by: ["grade"],
    where: { subject: "Vật lí" },
    _count: { id: true },
  });
  console.log("Xong. Số câu Vật lí theo khối:", counts);
  console.log("Tổng câu Vật lí trong ngân hàng:", await prisma.question.count({ where: { subject: "Vật lí" } }));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
