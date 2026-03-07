// d:\openfang\Aeroeduvison-main\scripts\seed-knowledge.ts
import { OpenFangClient } from '../lib/openfang';

async function seed() {
  const client = new OpenFangClient({ baseUrl: 'http://localhost:8080' });
  
  const concepts = [
    { title: "Định nghĩa Logarit", content: "Logarit của một số là số mũ mà một giá trị cố định, gọi là cơ số, phải được nâng lên để tạo ra số đó. Ví dụ, logarit cơ số 10 của 1000 là 3." },
    { title: "Quy tắc cơ bản của Logarit", content: "log(ab) = log(a) + log(b), log(a/b) = log(a) - log(b), log(a^n) = n*log(a)." },
    { title: "Tiền đề học Logarit", content: "Để học Logarit, học sinh cần nắm vững kiến thức về Lũy thừa, Hàm số mũ và các quy tắc biến đổi đại số cơ bản." },
    { title: "Ứng dụng Logarit", content: "Logarit được dùng trong thang đo pH, thang đo Richter (động đất), và trong tính toán lãi suất kép." }
  ];

  console.log("Seeding knowledge into Open Fang memory...");
  
  for (const concept of concepts) {
    const prompt = `Lưu thông tin sau vào bộ nhớ dài hạn của bạn: ${concept.title} - ${concept.content}`;
    try {
      await client.chat(prompt, 'tutor');
      console.log(`✅ Seeded: ${concept.title}`);
    } catch (e) {
      console.error(`❌ Failed to seed ${concept.title}:`, e);
    }
  }
  
  console.log("Done seeding!");
}

seed();
