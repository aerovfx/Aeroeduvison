const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat,
  HeadingLevel, BorderStyle, WidthType, ShadingType,
  PageNumber, PageBreak, TabStopType, TabStopPosition,
  TableOfContents
} = require('docx');

// ============================================================
// CONFIG
// ============================================================
const PAGE_WIDTH = 11906; // A4
const PAGE_HEIGHT = 16838;
const MARGIN = 1440; // 1 inch
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN; // ~9026

const BLUE = "1F4E79";
const DARK = "1A1A2E";
const GRAY = "555555";
const LIGHT_BLUE = "D6E4F0";
const LIGHT_GRAY = "F2F2F2";

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, bold: true, size: 32, font: "Times New Roman", color: BLUE })]
  });
}
function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 160 },
    children: [new TextRun({ text, bold: true, size: 28, font: "Times New Roman", color: BLUE })]
  });
}
function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 120 },
    children: [new TextRun({ text, bold: true, italics: true, size: 26, font: "Times New Roman", color: DARK })]
  });
}
function para(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120, line: 360 },
    alignment: opts.align || AlignmentType.JUSTIFIED,
    indent: opts.indent ? { firstLine: 720 } : undefined,
    children: [new TextRun({ text, size: 24, font: "Times New Roman", color: DARK, ...opts.run })]
  });
}
function paraRuns(runs, opts = {}) {
  return new Paragraph({
    spacing: { after: 120, line: 360 },
    alignment: opts.align || AlignmentType.JUSTIFIED,
    indent: opts.indent ? { firstLine: 720 } : undefined,
    children: runs.map(r => typeof r === 'string' ? new TextRun({ text: r, size: 24, font: "Times New Roman", color: DARK }) : new TextRun({ size: 24, font: "Times New Roman", color: DARK, ...r }))
  });
}
function emptyLine() {
  return new Paragraph({ spacing: { after: 60 }, children: [] });
}

function makeCell(text, opts = {}) {
  return new TableCell({
    borders,
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    shading: opts.shading ? { fill: opts.shading, type: ShadingType.CLEAR } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({
      alignment: opts.align || AlignmentType.LEFT,
      children: [new TextRun({ text, size: 22, font: "Times New Roman", bold: !!opts.bold, color: opts.bold ? BLUE : DARK })]
    })]
  });
}

// ============================================================
// DOCUMENT CONTENT
// ============================================================

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Times New Roman", size: 24 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Times New Roman", color: BLUE },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Times New Roman", color: BLUE },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, italics: true, font: "Times New Roman", color: DARK },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
    ]
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
      ]},
      { reference: "numbers1", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers2", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers3", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers4", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers5", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  },
  sections: [
    // ============================================================
    // TITLE PAGE
    // ============================================================
    {
      properties: {
        page: { size: { width: PAGE_WIDTH, height: PAGE_HEIGHT }, margin: { top: 2160, right: MARGIN, bottom: MARGIN, left: MARGIN } }
      },
      children: [
        emptyLine(), emptyLine(), emptyLine(),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: "BO GIAO DUC VA DAO TAO", size: 28, font: "Times New Roman", bold: true, color: BLUE })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: "VIEN NGHIEN CUU CONG NGHE GIAO DUC", size: 24, font: "Times New Roman", color: GRAY })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: "----------oOo----------", size: 20, font: "Times New Roman", color: GRAY })] }),
        emptyLine(), emptyLine(), emptyLine(),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: "DE CUONG NGHIEN CUU KHOA HOC", size: 24, font: "Times New Roman", color: GRAY })] }),
        emptyLine(),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "HE THONG DAY HOC THICH UNG DA PHUONG THUC", size: 36, font: "Times New Roman", bold: true, color: BLUE })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "TICH HOP TRI TUE NHAN TAO BIEN VA HOC TANG CUONG", size: 36, font: "Times New Roman", bold: true, color: BLUE })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "TU PHAN HOI CON NGUOI: NEN TANG AEROEDU VISION", size: 36, font: "Times New Roman", bold: true, color: BLUE })] }),
        emptyLine(),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: "Multimodal Adaptive Learning System Integrating Edge AI", size: 22, font: "Times New Roman", italics: true, color: GRAY })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: "and Reinforcement Learning from Human Feedback:", size: 22, font: "Times New Roman", italics: true, color: GRAY })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "The AeroEdu Vision Platform", size: 22, font: "Times New Roman", italics: true, color: GRAY })] }),
        emptyLine(), emptyLine(),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: "Linh vuc: Cong nghe Giao duc (Educational Technology)", size: 24, font: "Times New Roman", color: DARK })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: "Ma so: 62.14.01.01", size: 24, font: "Times New Roman", color: DARK })] }),
        emptyLine(), emptyLine(),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: "Chu nhiem de tai: TS. Nguyen Aero", size: 26, font: "Times New Roman", bold: true, color: DARK })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: "Don vi: AeroVFX Research Lab", size: 24, font: "Times New Roman", color: GRAY })] }),
        emptyLine(), emptyLine(), emptyLine(),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Nam 2026", size: 28, font: "Times New Roman", bold: true, color: BLUE })] }),
      ]
    },

    // ============================================================
    // TOC + MAIN CONTENT
    // ============================================================
    {
      properties: {
        page: { size: { width: PAGE_WIDTH, height: PAGE_HEIGHT }, margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN } }
      },
      headers: {
        default: new Header({ children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 1 } },
          children: [new TextRun({ text: "De cuong NCKH: AeroEdu Vision | 2026", size: 18, font: "Times New Roman", italics: true, color: GRAY })]
        })] })
      },
      footers: {
        default: new Footer({ children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Trang ", size: 18, font: "Times New Roman", color: GRAY }), new TextRun({ children: [PageNumber.CURRENT], size: 18, font: "Times New Roman", color: GRAY })]
        })] })
      },
      children: [
        heading1("MUC LUC"),
        new TableOfContents("Muc luc", { hyperlink: true, headingStyleRange: "1-3" }),
        new Paragraph({ children: [new PageBreak()] }),

        // ============================================================
        // 1. TONG QUAN VA TINH CAP THIET
        // ============================================================
        heading1("1. TONG QUAN VA TINH CAP THIET CUA DE TAI"),

        heading2("1.1. Boi canh nghien cuu"),
        para("Cuoc cach mang cong nghiep 4.0 da tao ra nhung chuyen doi sau sac trong linh vuc giao duc, dac biet la su tich hop tri tue nhan tao (AI) vao qua trinh day va hoc. Theo bao cao cua UNESCO (2024), hon 89% co so giao duc tai cac nuoc phat trien da trien khai it nhat mot hinh thuc AI ho tro giang day, nhung chi khoang 12% dat duoc muc do ca nhan hoa hoc tap thuc su dua tren du lieu da phuong thuc (multimodal data). Khoang cach giua tiem nang cong nghe va thuc te ung dung nay boc lo mot van de nghien cuu quan trong: lam the nao de xay dung mot he thong giao duc thong minh co kha nang thich ung thoi gian thuc, bao ve quyen rieng tu du lieu hoc sinh, dong thoi toi uu hoa chat luong giang day thong qua hoc tang cuong tu phan hoi con nguoi?", { indent: true }),
        para("Nghien cuu nay duoc thuc hien trong boi canh ba xu huong lon dang dinh hinh lai giao duc toan cau: (1) su bung no cua cac mo hinh ngon ngu lon (LLM) va kha nang fine-tune chung cho muc dich giao duc chuyen biet; (2) su phat trien cua AI bien (Edge AI) cho phep xu ly du lieu tai cho ma khong can gui len dam may, dam bao tinh rieng tu; va (3) su ket hop giua thi giac may tinh (computer vision), xu ly ngon ngu tu nhien (NLP), va phan tich hanh vi hoc tap (learning analytics) tao nen mot he sinh thai giao duc da phuong thuc chua tung co.", { indent: true }),

        heading2("1.2. Van de nghien cuu"),
        para("Mac du da co nhieu nghien cuu ve he thong gia su thong minh (Intelligent Tutoring Systems - ITS) va hoc thich ung (Adaptive Learning), cac he thong hien tai van ton tai nhung han che co ban:", { indent: true }),

        new Paragraph({ numbering: { reference: "numbers1", level: 0 }, spacing: { after: 100, line: 360 }, children: [new TextRun({ text: "Phan lon ITS phu thuoc vao API dam may (OpenAI, Google), gay ra lo ngai ve bao mat du lieu hoc sinh va chi phi van hanh cao, khong phu hop voi cac co so giao duc tai cac nuoc dang phat trien.", size: 24, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbers1", level: 0 }, spacing: { after: 100, line: 360 }, children: [new TextRun({ text: "Cac he thong nhan dien cam xuc hien co (FER2013-based CNN) chi phat hien duoc 7 loai cam xuc co ban, khong du de mo hinh hoa trang thai nhan thuc phuc tap cua nguoi hoc nhu tap trung, chan nan, hay confused.", size: 24, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbers1", level: 0 }, spacing: { after: 100, line: 360 }, children: [new TextRun({ text: "Chua co nghien cuu nao ket hop dong thoi ba yeu to: fine-tuning LLM cuc bo (local) voi RLHF/DPO, nhan dien cam xuc da phuong thuc (40+ loai) theo thoi gian thuc, va mo phong STEM tuong tac trong mot nen tang thong nhat.", size: 24, font: "Times New Roman" })] }),

        heading2("1.3. Muc tieu nghien cuu"),
        heading3("1.3.1. Muc tieu tong quat"),
        para("Thiet ke, xay dung va danh gia nen tang giao duc thich ung da phuong thuc AeroEdu Vision, tich hop AI bien (Edge AI) va hoc tang cuong tu phan hoi con nguoi (RLHF), nham ca nhan hoa trai nghiem hoc tap, nang cao hieu qua giang day, va dam bao quyen rieng tu du lieu trong moi truong giao duc K-12 va dai hoc.", { indent: true }),
        heading3("1.3.2. Muc tieu cu the"),

        new Paragraph({ numbering: { reference: "numbers2", level: 0 }, spacing: { after: 100, line: 360 }, children: [new TextRun({ text: "Xay dung kien truc he thong da phuong thuc (multimodal) tich hop thi giac may tinh (MediaPipe), xu ly ngon ngu tu nhien (Ollama LLM), va phan tich hanh vi hoc tap trong mot nen tang web/desktop thong nhat.", size: 24, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbers2", level: 0 }, spacing: { after: 100, line: 360 }, children: [new TextRun({ text: "Phat trien quy trinh fine-tuning mo hinh ngon ngu cuc bo (edu-assistant:latest, 9.7B params, Qwen3.5) ap dung RLHF va DPO theo pipeline 6 giai doan dua tren phuong phap luan Aero-HowtoLLMs, toi uu cho mien giao duc tieng Viet.", size: 24, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbers2", level: 0 }, spacing: { after: 100, line: 360 }, children: [new TextRun({ text: "Xay dung he thong nhan dien cam xuc da phuong thuc (40+ loai cam xuc) ket hop Facial Action Units (FACS), nhan dien cu chi tay, va phan tich giong noi, hoat dong hoan toan tren thiet bi nguoi dung (client-side) de dam bao tinh rieng tu.", size: 24, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbers2", level: 0 }, spacing: { after: 100, line: 360 }, children: [new TextRun({ text: "Thiet ke va trien khai 41 module mo phong STEM tuong tac (Vat ly, Hoa hoc, Sinh hoc, Tin hoc) voi kha nang theo doi tien trinh hoc tap va danh gia ket qua tu dong.", size: 24, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbers2", level: 0 }, spacing: { after: 100, line: 360 }, children: [new TextRun({ text: "Danh gia hieu qua cua he thong thong qua thuc nghiem tren it nhat 500 hoc sinh va 30 giao vien trong thoi gian 6 thang, so sanh voi nhom doi chung su dung phuong phap truyen thong.", size: 24, font: "Times New Roman" })] }),

        heading2("1.4. Cau hoi nghien cuu"),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 100, line: 360 }, children: [new TextRun({ text: "RQ1: He thong fine-tuning LLM cuc bo voi RLHF/DPO co the dat duoc chat luong tuong duong voi cac API dam may (GPT-4, Gemini) trong nhiem vu gia su giao duc tieng Viet khong?", size: 24, font: "Times New Roman", italics: true })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 100, line: 360 }, children: [new TextRun({ text: "RQ2: Viec tich hop nhan dien cam xuc da phuong thuc (40+ loai) vao vong lap day hoc co cai thien dang ke muc do tham gia va ket qua hoc tap cua hoc sinh khong?", size: 24, font: "Times New Roman", italics: true })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 100, line: 360 }, children: [new TextRun({ text: "RQ3: Kien truc Edge AI (xu ly tai thiet bi) co the dam bao dong thoi hieu suat thoi gian thuc va quyen rieng tu du lieu so voi kien truc dam may truyen thong khong?", size: 24, font: "Times New Roman", italics: true })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 100, line: 360 }, children: [new TextRun({ text: "RQ4: Cac module mo phong STEM tuong tac co tac dong nhu the nao den kha nang tu duy phan bien va giai quyet van de cua hoc sinh?", size: 24, font: "Times New Roman", italics: true })] }),

        new Paragraph({ children: [new PageBreak()] }),

        // ============================================================
        // 2. TONG QUAN TAI LIEU
        // ============================================================
        heading1("2. TONG QUAN TAI LIEU VA KHOANG TRONG NGHIEN CUU"),

        heading2("2.1. Cac nghien cuu lien quan"),

        heading3("2.1.1. Nghien cuu 1: He thong gia su AI da phuong thuc voi nhan dien cam xuc (Gong, 2025)"),
        para("Gong (2025), dang tren Discover Artificial Intelligence (Springer), de xuat he thong giao duc thong minh tich hop nhan dien cam xuc da phuong thuc (bieu cam khuon mat, giong noi, van ban) su dung CNN, ket hop voi phan phoi noi dung thich ung. He thong nay danh dau buoc tien quan trong trong viec dua affective computing vao giao duc.", { indent: true }),
        paraRuns([{ text: "Han che: ", bold: true }, "He thong cua Gong phu thuoc hoan toan vao xu ly dam may, khong giai quyet van de rieng tu du lieu sinh trac hoc cua hoc sinh. Mo hinh CNN chi nhan dien 7 cam xuc co ban (happy, sad, angry, surprised, fearful, disgusted, neutral), khong du de phan biet cac trang thai nhan thuc quan trong nhu confused, thinking, hay sleepy. Ngoai ra, he thong khong tich hop LLM cho gia su ca nhan hoa, va khong co co che hoc tang cuong tu phan hoi giao vien."], { indent: true }),

        heading3("2.1.2. Nghien cuu 2: Khung AI da tac tu voi DPO cho hoc sinh K-12 (Singh et al., 2025)"),
        para("Singh va cong su (2025), dang tren GIRT Journal (Shodhsagar), de xuat khung AI da tac tu (multi-agent) ap dung phuong phap Socratic cho giao duc K-12, su dung Direct Preference Optimization (DPO) de fine-tune mo hinh theo phan hoi con nguoi. Day la mot trong nhung nghien cuu dau tien ap dung RLHF/DPO vao boi canh giao duc.", { indent: true }),
        paraRuns([{ text: "Han che: ", bold: true }, "Nghien cuu tap trung vao giai toan va chi su dung mo hinh dam may (API-based), khong xem xet viec trien khai cuc bo (on-premise). Khong co thanh phan nhan dien cam xuc hay phan tich hanh vi hoc tap. He thong chua duoc danh gia thuc nghiem quy mo lon va thieu tinh lien nganh (chi toan hoc, khong mo rong sang STEM)."], { indent: true }),

        heading3("2.1.3. Nghien cuu 3: FEA-LLaVA va nhan dien bieu cam khuon mat trong gia su LLM (Fleig, UCSD, 2024-2025)"),
        para("Fleig (2024-2025) tai Dai hoc California San Diego phat trien FEA-LLaVA (Facial Expression-Aware LLaVA), tich hop nhan dien bieu cam khuon mat vao LLM de tao phan hoi gia su thong minh hon. Mo hinh thay the hinh anh dau vao bang embeddings bieu cam tu phan tich Action Unit (AU), dieu kien hoa phan hoi dua tren ca van ban va hanh vi khuon mat cua hoc sinh.", { indent: true }),
        paraRuns([{ text: "Han che: ", bold: true }, "La du an nghien cuu (thesis), chua duoc trien khai thanh san pham giao duc hoan chinh. Chi tap trung vao bieu cam khuon mat, khong ket hop cu chi tay hay giong noi. Su dung mo hinh dam may (LLaVA), khong xem xet kien truc Edge AI hay van de rieng tu. Khong co co che RLHF/DPO de cai thien lien tuc tu phan hoi giao vien."], { indent: true }),

        heading2("2.2. Khoang trong nghien cuu (Research Gap)"),
        para("Tu phan tich ba nghien cuu tieu bieu tren, chung toi xac dinh bon khoang trong nghien cuu chinh:", { indent: true }),

        // Research gap table
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [500, 2200, 1600, 1600, 1600, 1500],
          rows: [
            new TableRow({ children: [
              makeCell("STT", { width: 500, shading: BLUE, bold: true }),
              makeCell("Khoang trong", { width: 2200, shading: BLUE, bold: true }),
              makeCell("Gong (2025)", { width: 1600, shading: BLUE, bold: true }),
              makeCell("Singh (2025)", { width: 1600, shading: BLUE, bold: true }),
              makeCell("Fleig (2025)", { width: 1600, shading: BLUE, bold: true }),
              makeCell("AeroEdu (De xuat)", { width: 1500, shading: BLUE, bold: true }),
            ].map(c => { if (c.options) {} return c; }) }),
            new TableRow({ children: [
              makeCell("1", { width: 500, shading: LIGHT_GRAY }), makeCell("Edge AI / LLM cuc bo", { width: 2200 }),
              makeCell("Khong", { width: 1600 }), makeCell("Khong", { width: 1600 }), makeCell("Khong", { width: 1600 }), makeCell("CO", { width: 1500, bold: true }),
            ]}),
            new TableRow({ children: [
              makeCell("2", { width: 500, shading: LIGHT_GRAY }), makeCell("RLHF/DPO fine-tuning", { width: 2200 }),
              makeCell("Khong", { width: 1600 }), makeCell("Co (API)", { width: 1600 }), makeCell("Khong", { width: 1600 }), makeCell("CO (Local)", { width: 1500, bold: true }),
            ]}),
            new TableRow({ children: [
              makeCell("3", { width: 500, shading: LIGHT_GRAY }), makeCell("Cam xuc 40+ loai", { width: 2200 }),
              makeCell("7 loai", { width: 1600 }), makeCell("Khong", { width: 1600 }), makeCell("AU-based", { width: 1600 }), makeCell("40+ loai", { width: 1500, bold: true }),
            ]}),
            new TableRow({ children: [
              makeCell("4", { width: 500, shading: LIGHT_GRAY }), makeCell("Mo phong STEM tich hop", { width: 2200 }),
              makeCell("Khong", { width: 1600 }), makeCell("Khong", { width: 1600 }), makeCell("Khong", { width: 1600 }), makeCell("41 modules", { width: 1500, bold: true }),
            ]}),
          ]
        }),
        emptyLine(),
        paraRuns([{ text: "Bang 1. ", bold: true, italics: true }, { text: "So sanh khoang trong nghien cuu giua cac cong trinh lien quan va de xuat AeroEdu Vision.", italics: true }], { align: AlignmentType.CENTER }),

        heading2("2.3. Dong gop ly thuyet moi"),
        new Paragraph({ numbering: { reference: "numbers3", level: 0 }, spacing: { after: 100, line: 360 }, children: [new TextRun({ text: "Mo hinh EALM (Edge Adaptive Learning Model): Khung ly thuyet dau tien ket hop AI bien (Edge AI) voi hoc tang cuong tu phan hoi con nguoi (RLHF) trong boi canh giao duc, cho phep fine-tuning LLM truc tiep tren co so ha tang cuc bo cua truong hoc ma khong can gui du lieu len dam may.", size: 24, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbers3", level: 0 }, spacing: { after: 100, line: 360 }, children: [new TextRun({ text: "Taxonomy cam xuc hoc tap mo rong (Extended Learning Emotion Taxonomy - ELET): Phan loai 40+ trang thai cam xuc-nhan thuc cua nguoi hoc thanh 5 nhom (Basic, Extended, Cognitive, Social, Physical), vuot xa mo hinh 7 cam xuc co ban cua Ekman, duoc thiet ke rieng cho boi canh hoc tap.", size: 24, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbers3", level: 0 }, spacing: { after: 100, line: 360 }, children: [new TextRun({ text: "Pipeline fine-tuning 6 giai doan voi LR Scheduling: Quy trinh fine-tuning co he thong gom Data Preparation, RLHF Filtering, DPO Preference Optimization, Config Generation (voi Learning Rate Scheduling), Model Creation, va Evaluation, ap dung khai niem gradient clipping va cosine decay tu ly thuyet toi uu hoa vao thuc tien fine-tuning Ollama.", size: 24, font: "Times New Roman" })] }),

        new Paragraph({ children: [new PageBreak()] }),

        // ============================================================
        // 3. PHUONG PHAP NGHIEN CUU
        // ============================================================
        heading1("3. PHUONG PHAP NGHIEN CUU"),

        heading2("3.1. Thiet ke nghien cuu"),
        para("Nghien cuu ap dung phuong phap ket hop (mixed-methods research design) gom ba giai doan chinh:", { indent: true }),
        paraRuns([{ text: "Giai doan 1 - Thiet ke va Phat trien (Design Science Research): ", bold: true }, "Xay dung kien truc he thong, phat trien cac thanh phan cot loi (AI engine, vision tracker, STEM modules, fine-tuning pipeline), va tich hop thanh nen tang AeroEdu Vision hoan chinh."], { indent: true }),
        paraRuns([{ text: "Giai doan 2 - Thuc nghiem co doi chung (Quasi-experimental Design): ", bold: true }, "Trien khai he thong tai 3 truong (1 tieu hoc, 1 THCS, 1 THPT) voi nhom thuc nghiem (su dung AeroEdu Vision) va nhom doi chung (phuong phap truyen thong). Thoi gian thuc nghiem: 6 thang (1 hoc ky)."], { indent: true }),
        paraRuns([{ text: "Giai doan 3 - Danh gia va Phan tich (Evaluation Research): ", bold: true }, "Thu thap du lieu dinh luong (diem so, thoi gian hoc, chi so tham gia) va dinh tinh (phong van giao vien, hoc sinh) de danh gia hieu qua he thong."], { indent: true }),

        heading2("3.2. Kien truc he thong AeroEdu Vision"),
        heading3("3.2.1. Kien truc tong the"),
        para("AeroEdu Vision duoc thiet ke theo kien truc microservices voi ba tang chinh: (1) Tang trinh bay (Presentation Layer) su dung Next.js 15 App Router voi React 19; (2) Tang nghiep vu (Business Layer) gom cac API routes xu ly logic giao duc, AI, va phan tich; (3) Tang du lieu (Data Layer) voi PostgreSQL (Prisma ORM), Redis caching, va Vector Database cho semantic search.", { indent: true }),
        para("Diem dac biet cua kien truc la su ket hop giua xu ly dam may (cho cac tac vu nhe, khong nhay cam) va xu ly bien (Edge Computing) cho cac tac vu nhay cam ve rieng tu nhu nhan dien cam xuc, fine-tuning mo hinh, va luu tru du lieu sinh trac hoc. Ngoai ra, he thong cung ho tro chay duoi dang ung dung desktop (Electron) de hoat dong offline.", { indent: true }),

        heading3("3.2.2. Thanh phan AI Engine"),
        para("AI Engine cua AeroEdu Vision bao gom cac thanh phan chinh sau:", { indent: true }),
        paraRuns([{ text: "Mo hinh ngon ngu cuc bo (Local LLM): ", bold: true }, "Su dung Ollama lam inference server voi mo hinh edu-assistant:latest (dua tren Qwen3.5, 9.7B parameters, luong tu hoa Q4_K_M). Mo hinh duoc fine-tune chuyen biet cho mien giao duc tieng Viet voi system prompt, few-shot examples, va pipeline RLHF/DPO 6 giai doan."], { indent: true }),
        paraRuns([{ text: "He thong da nha cung cap (Multi-provider): ", bold: true }, "Kien truc fallback voi 3 nha cung cap: Ollama (uu tien, cuc bo), Google Gemini (dam may, cho vision/OCR), va OpenAI (dam may, du phong). Load balancer tu dong chuyen doi khi mot nha cung cap khong kha dung."], { indent: true }),
        paraRuns([{ text: "He thong cham diem thong minh: ", bold: true }, "Ba engine cham diem chuyen biet cho Toan (math-grader), Van (essay-grader), va Khoa hoc (science-grader), ket hop voi quy trinh human-review-workflow de dam bao chat luong."], { indent: true }),

        heading3("3.2.3. Pipeline Fine-tuning voi RLHF va DPO"),
        para("Day la dong gop ky thuat cot loi cua nghien cuu, dua tren phuong phap luan Aero-HowtoLLMs Module 07 (Fine-tuning Pretrained Models) va duoc mo rong voi hoc tang cuong:", { indent: true }),

        paraRuns([{ text: "Phase 1 - Data Preparation: ", bold: true }, "Thu thap va xac thuc du lieu huan luyen tu hai nguon: (a) du lieu few-shot do giao vien tao thu cong (cap hoi-dap mau); (b) du lieu tu dong tu DPO comparisons. Ap dung validation de loai bo cac vi du trong hoac khong hop le."], { indent: true }),
        paraRuns([{ text: "Phase 2 - RLHF Filtering: ", bold: true }, "Giao vien danh gia chat luong cac vi du huan luyen tren thang diem 1-5 sao. Chi nhung vi du dat nguong reward_threshold (mac dinh >= 3 sao) moi duoc dua vao tap huan luyen. Cac vi du duoc sap xep theo diem danh gia (reward-weighted selection), tuong tu co che reward ranking trong RLHF truyen thong."], { indent: true }),
        paraRuns([{ text: "Phase 3 - DPO Preference Optimization: ", bold: true }, "He thong tao hai cau tra loi cho moi prompt voi nhiet do khac nhau (temperature=0.5 cho exploitation, temperature=1.3 cho exploration). Giao vien chon cau tra loi tot hon. He thong tinh DPO loss theo cong thuc: L_DPO = -log(sigmoid(beta * (r_w - r_l))), trong do r_w la reward cua phan hoi duoc chon, r_l la reward cua phan hoi bi loai, va beta la he so dieu chinh (mac dinh 0.1). Cac phan hoi duoc chon tu dong duoc them vao tap huan luyen voi rating = 5."], { indent: true }),
        paraRuns([{ text: "Phase 4 - Config Generation voi LR Scheduling: ", bold: true }, "Ap dung khai niem Learning Rate Scheduling tu ly thuyet toi uu hoa vao thuc tien fine-tuning. Ba che do: Warmup (giam temperature 30%, gioi han so vi du), Active (tham so day du), Cooldown (giam temperature 10% de on dinh). Tuong tu khai niem warm-up + cosine decay trong huan luyen LLM truyen thong."], { indent: true }),
        paraRuns([{ text: "Phase 5 - Model Creation: ", bold: true }, "Gui cau hinh den Ollama /api/create voi tham so model, from (base model), system prompt, parameters, va messages (few-shot). Ollama tao phien ban model moi voi cac thay doi duoc ap dung."], { indent: true }),
        paraRuns([{ text: "Phase 6 - Evaluation: ", bold: true }, "Danh gia tu dong bang phuong phap Token Frequency Analysis (tu Aero-HowtoLLMs): do do dai phan hoi trung binh, do nhat quan (coherence score), va ty le trung lap token voi mien giao duc. Ket qua duoc luu lai de theo doi su tien bo qua cac lan fine-tune."], { indent: true }),

        heading3("3.2.4. He thong nhan dien cam xuc da phuong thuc"),
        para("He thong nhan dien cam xuc cua AeroEdu Vision hoat dong hoan toan tren thiet bi nguoi dung (client-side processing) su dung WebAssembly (WASM), dam bao du lieu sinh trac hoc cua hoc sinh khong bao gio roi khoi thiet bi:", { indent: true }),
        paraRuns([{ text: "Facial Emotion Recognition: ", bold: true }, "Su dung MediaPipe FaceLandmarker de phat hien 468 diem moc khuon mat va phan tich 7 Facial Action Units (FACS). Tu do suy luan 40+ loai cam xuc thuoc 5 nhom: Basic (happy, sad, angry, neutral...), Extended (laughing, thinking, confused...), Cognitive (focused, distracted, bored...), Social (confident, anxious, grateful...), va Physical (sleepy, exhausted, energetic...). Moi cam xuc co emoji, ma mau RGB, nhan tieng Viet, va phan loai danh muc."], { indent: true }),
        paraRuns([{ text: "Hand Gesture Recognition: ", bold: true }, "Nhan dien cu chi tay voi MediaPipe HandLandmarker, theo doi 21 diem moc moi tay, phat hien 5 ngon tay va do luc kep (pinch strength). Du lieu cu chi duoc truc quan hoa tren ban do nhiet (heatmap 6x5)."], { indent: true }),
        paraRuns([{ text: "Emotion Buffering va Privacy: ", bold: true }, "Du lieu cam xuc duoc gom nhom (batch) moi 30 giay truoc khi gui len server duoi dang thong ke tong hop (khong gui hinh anh hay video). Chi co phan bo cam xuc va chi so tham gia duoc luu tru, khong phai du lieu sinh trac hoc tho."], { indent: true }),

        heading3("3.2.5. He sinh thai mo phong STEM"),
        para("AeroEdu Vision tich hop 41 module mo phong STEM tuong tac, bao phu 6 linh vuc khoa hoc:", { indent: true }),
        paraRuns([{ text: "Vat ly (Physics): ", bold: true }, "Mo phong chuyen dong, pha xuyen, dao dong dieu hoa, con lac, luc Newton, dong luong va va cham, he lo xo, quang hoc (khuc xa, truyen anh sang, thau kinh), dien tu truong."], { indent: true }),
        paraRuns([{ text: "Hoa hoc (Chemistry): ", bold: true }, "Phong thi nghiem 3D, truc quan hoa phan tu, enthalpy, can bang phuong trinh hoa hoc."], { indent: true }),
        paraRuns([{ text: "Sinh hoc (Biology): ", bold: true }, "Mo phong sinh truong, mo hinh he sinh thai."], { indent: true }),
        paraRuns([{ text: "Khi dong hoc (Aerodynamics): ", bold: true }, "Truc quan hoa dong chay 3D, toi uu hoa tham so khi dong luc hoc."], { indent: true }),
        paraRuns([{ text: "Tin hoc / AI (Computer Science): ", bold: true }, "Mo phong Wave Function Collapse, datasim voi AI, bieu do loss ML, scatter plot du lieu."], { indent: true }),
        paraRuns([{ text: "Lien nganh: ", bold: true }, "Mo phong thoi tiet, dong luc hoc chat long 2D, hieu ung song."], { indent: true }),

        new Paragraph({ children: [new PageBreak()] }),

        heading2("3.3. Phuong phap thu thap va phan tich du lieu"),
        heading3("3.3.1. Du lieu dinh luong"),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80, line: 360 }, children: [new TextRun({ text: "Diem so hoc tap (pre-test va post-test) cua ca hai nhom thuc nghiem va doi chung", size: 24, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80, line: 360 }, children: [new TextRun({ text: "Chi so tham gia hoc tap 6 chieu: Engagement, Motivation, Focus, Retention, Speed, Accuracy", size: 24, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80, line: 360 }, children: [new TextRun({ text: "Du lieu cam xuc tong hop (phan bo 40+ loai cam xuc theo thoi gian)", size: 24, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80, line: 360 }, children: [new TextRun({ text: "Log hoc tap: thoi gian su dung, so module hoan thanh, ty le dap an dung", size: 24, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80, line: 360 }, children: [new TextRun({ text: "Metrices RLHF: DPO loss, preference win rate, avg human rating, coherence score", size: 24, font: "Times New Roman" })] }),

        heading3("3.3.2. Du lieu dinh tinh"),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80, line: 360 }, children: [new TextRun({ text: "Phong van ban cau truc (semi-structured interviews) voi 30 giao vien ve trai nghiem su dung", size: 24, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80, line: 360 }, children: [new TextRun({ text: "Khao sat do hai long cua hoc sinh (Likert 5 muc)", size: 24, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80, line: 360 }, children: [new TextRun({ text: "Quan sat lop hoc (classroom observation) tai 3 truong thuc nghiem", size: 24, font: "Times New Roman" })] }),

        heading3("3.3.3. Phuong phap phan tich"),
        para("Du lieu dinh luong duoc phan tich bang kiem dinh t-test doc lap (so sanh hai nhom), ANOVA mot chieu (so sanh nhieu nhom), va hoi quy tuyen tinh boi (xac dinh cac yeu to anh huong). Chi so hieu qua (effect size) duoc bao cao bang Cohen d. Du lieu dinh tinh duoc phan tich theo phuong phap ma hoa chu de (thematic coding) voi phan mem NVivo.", { indent: true }),

        new Paragraph({ children: [new PageBreak()] }),

        // ============================================================
        // 4. TINH SANG TAO
        // ============================================================
        heading1("4. TINH SANG TAO VA DIEM MOI CUA NGHIEN CUU"),

        heading2("4.1. Phuong phap va ky thuat chua duoc ap dung truoc do"),

        heading3("4.1.1. RLHF/DPO cuc bo (On-Premise) cho giao duc"),
        para("Day la nghien cuu dau tien trien khai toan bo pipeline RLHF/DPO tren co so ha tang cuc bo (local infrastructure) cho muc dich giao duc. Trong khi cac nghien cuu truoc (Singh et al., 2025) su dung RLHF qua API dam may, AeroEdu Vision chay mo hinh 9.7B tham so tren may cuc bo voi Ollama, cho phep giao vien truc tiep tham gia vao vong lap fine-tuning ma khong can chia se du lieu hoc sinh voi ben thu ba.", { indent: true }),
        para("Pipeline 6 giai doan cua chung toi ap dung khai niem gradient clipping (gioi han so vi du de tranh overfitting) va learning rate scheduling (dieu chinh temperature theo giai doan warmup/active/cooldown) tu ly thuyet toi uu hoa deep learning vao thuc tien fine-tuning Ollama, tao ra mot phuong phap luan moi chua duoc mo ta trong tai lieu hoc thuat.", { indent: true }),

        heading3("4.1.2. Taxonomy cam xuc hoc tap 40+ loai voi xu ly client-side"),
        para("Cac he thong nhan dien cam xuc trong giao duc hien co deu gioi han o 7 cam xuc co ban (Ekman). AeroEdu Vision mo rong len 40+ loai cam xuc duoc to chuc thanh 5 nhom chuyen biet cho boi canh hoc tap, bao gom cac trang thai nhan thuc quan trong nhu focused, confused, thinking, bored ma khong he thong nao truoc do xu ly. Toan bo xu ly dien ra tren trinh duyet (WebAssembly + MediaPipe), dam bao du lieu sinh trac hoc khong roi khoi thiet bi.", { indent: true }),

        heading3("4.1.3. Strangler Pattern: Di cu tu Node.js sang Rust"),
        para("AeroEdu Vision la mot trong nhung nen tang giao duc dau tien ap dung Strangler Pattern de di cu dan tu kien truc monolithic (Node.js) sang microservices (Rust), bat dau voi dich vu vector similarity (port 8091) va dich vu xac thuc (canary 10%). Phuong phap nay dam bao khong co thoi gian ngung hoat dong (zero downtime) trong qua trinh nang cap.", { indent: true }),

        heading2("4.2. Goc nhin lien nganh (Interdisciplinary Approach)"),
        para("Nghien cuu nay ket hop kien thuc tu 5 linh vuc:", { indent: true }),
        new Paragraph({ numbering: { reference: "numbers4", level: 0 }, spacing: { after: 80, line: 360 }, children: [new TextRun({ text: "Khoa hoc Giao duc (Educational Science): Ly thuyet vung phat trien gan (ZPD) cua Vygotsky, hoc thich ung, va scaffolding.", size: 24, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbers4", level: 0 }, spacing: { after: 80, line: 360 }, children: [new TextRun({ text: "Tri tue Nhan tao (Artificial Intelligence): LLM fine-tuning, RLHF, DPO, transformer architecture, parameter-efficient fine-tuning (PEFT).", size: 24, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbers4", level: 0 }, spacing: { after: 80, line: 360 }, children: [new TextRun({ text: "Thi giac May tinh (Computer Vision): MediaPipe, FACS analysis, hand gesture recognition, emotion classification.", size: 24, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbers4", level: 0 }, spacing: { after: 80, line: 360 }, children: [new TextRun({ text: "Khoa hoc Du lieu (Data Science): Learning analytics, multimodal data fusion, predictive modeling cho hoc sinh co nguy co.", size: 24, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbers4", level: 0 }, spacing: { after: 80, line: 360 }, children: [new TextRun({ text: "Ky thuat Phan mem (Software Engineering): Microservices, Strangler Pattern, Edge Computing, real-time systems.", size: 24, font: "Times New Roman" })] }),

        heading2("4.3. Kha nang pha vo mo hinh cu (Disruptive Potential)"),
        para("AeroEdu Vision co tiem nang pha vo ba mo hinh cu trong giao duc:", { indent: true }),
        paraRuns([{ text: "Pha vo su phu thuoc dam may: ", bold: true }, "Thay vi phu thuoc vao API tra phi cua OpenAI hay Google, truong hoc co the tu van hanh mo hinh AI cuc bo voi chi phi phan cung mot lan (Mac Mini M-series hoac tuong duong). Dieu nay dac biet co y nghia voi cac nuoc dang phat trien noi ngan sach giao duc han che va ket noi internet khong on dinh."], { indent: true }),
        paraRuns([{ text: "Pha vo mo hinh danh gia mot chieu: ", bold: true }, "Thay vi chi dua vao diem so bai kiem tra, AeroEdu Vision danh gia hoc sinh tren 6 chieu (Engagement, Motivation, Focus, Retention, Speed, Accuracy) ket hop voi du lieu cam xuc thoi gian thuc, cho buc tranh toan dien hon ve qua trinh hoc tap."], { indent: true }),
        paraRuns([{ text: "Pha vo rao can tiep can STEM: ", bold: true }, "41 module mo phong tuong tac cho phep hoc sinh o vung sau vung xa tiep can cac thi nghiem vat ly, hoa hoc ma khong can phong thi nghiem vat ly, giam thieu bat binh dang giao duc."], { indent: true }),

        new Paragraph({ children: [new PageBreak()] }),

        // ============================================================
        // 5. KHA NANG MO RONG
        // ============================================================
        heading1("5. KHA NANG MO RONG VA UNG DUNG"),

        heading2("5.1. Huong nghien cuu tiep theo (Future Work)"),
        heading3("5.1.1. Ngan han (1-2 nam)"),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80, line: 360 }, children: [new TextRun({ text: "Tich hop speech-to-text va text-to-speech cho AI tutor, ho tro hoc sinh khuyet tat thi giac", size: 24, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80, line: 360 }, children: [new TextRun({ text: "Mo rong fine-tuning sang LoRA/QLoRA thuc su (weight-level) voi framework Unsloth hoac QVAC Fabric LLM", size: 24, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80, line: 360 }, children: [new TextRun({ text: "Phat trien ung dung di dong (React Native) voi on-device inference su dung ONNX Runtime hoac MLC-LLM", size: 24, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80, line: 360 }, children: [new TextRun({ text: "Tich hop GRPO (Group Relative Policy Optimization) thay the DPO de cai thien hieu suat RLHF", size: 24, font: "Times New Roman" })] }),

        heading3("5.1.2. Trung han (3-5 nam)"),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80, line: 360 }, children: [new TextRun({ text: "Xay dung Knowledge Graph lien truong (federated knowledge graph) cho phep nhieu truong chia se kien thuc ma khong chia se du lieu hoc sinh", size: 24, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80, line: 360 }, children: [new TextRun({ text: "Phat trien mo hinh du doan ket qua hoc tap (predictive analytics) su dung du lieu cam xuc da phuong thuc va machine learning", size: 24, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80, line: 360 }, children: [new TextRun({ text: "Tich hop thuc te ao tang cuong (AR/VR) vao cac module STEM su dung WebXR va hand tracking", size: 24, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80, line: 360 }, children: [new TextRun({ text: "Hoan thanh viec di cu sang Rust microservices de toi uu hieu suat va do tin cay", size: 24, font: "Times New Roman" })] }),

        heading3("5.1.3. Dai han (5-10 nam)"),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80, line: 360 }, children: [new TextRun({ text: "Phat trien AI Mentor ca nhan hoa tron doi (lifelong learning AI companion) hoc cung nguoi dung tu K-12 den dai hoc va nghe nghiep", size: 24, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80, line: 360 }, children: [new TextRun({ text: "Xay dung mang luoi giao duc phi tap trung (decentralized education network) dua tren blockchain va federated learning", size: 24, font: "Times New Roman" })] }),

        heading2("5.2. Kha nang ung dung thuc tien trong 5 nam toi"),
        para("Nghien cuu nay co kha nang ung dung thuc tien cao tai Viet Nam va khu vuc Dong Nam A, noi giao duc dang doi mat voi thach thuc kep: nhu cau ca nhan hoa hoc tap tang cao trong khi ngan sach va co so ha tang con han che.", { indent: true }),
        paraRuns([{ text: "Truong hoc cong lap: ", bold: true }, "Voi chi phi dau tu ban dau khoang 10-15 trieu VND (1 may Mac Mini M-series), mot truong hoc co the tu van hanh he thong AI gia su cuc bo phuc vu hang tram hoc sinh ma khong can tra phi API hang thang. Day la giai phap kha thi cho cac truong o vung sau vung xa noi ket noi internet khong on dinh."], { indent: true }),
        paraRuns([{ text: "Dao tao giao vien: ", bold: true }, "He thong RLHF cho phep giao vien tham gia truc tiep vao qua trinh fine-tune AI, bien ho thanh dong tac gia (co-creator) cua cong nghe giao duc, khong chi la nguoi su dung thu dong. Dieu nay cung nang cao nang luc so (digital literacy) cua giao vien."], { indent: true }),
        paraRuns([{ text: "Giao duc hoa nhap: ", bold: true }, "41 module mo phong STEM cho phep hoc sinh khuyet tat van dong tham gia thi nghiem ao, giam thieu rao can vat ly. He thong nhan dien cam xuc cung giup giao vien phat hien som hoc sinh gap kho khan tam ly."], { indent: true }),
        paraRuns([{ text: "Giao duc tu xa: ", bold: true }, "Ung dung desktop (Electron) va kha nang hoat dong offline lam cho he thong phu hop voi cac vung chua co Internet bang rong, dac biet la khu vuc nong thon va mien nui."], { indent: true }),

        heading2("5.3. Tiem nang thuong mai hoa va chinh sach"),
        heading3("5.3.1. Mo hinh thuong mai hoa"),
        paraRuns([{ text: "SaaS (Software as a Service): ", bold: true }, "Cung cap nen tang dam may cho cac truong co ha tang Internet tot, tinh phi theo so luong hoc sinh hoac giao vien su dung."], { indent: true }),
        paraRuns([{ text: "On-Premise License: ", bold: true }, "Ban giay phep cai dat cuc bo cho cac truong muon tu quan ly du lieu, dac biet phu hop voi yeu cau bao mat du lieu cua Luat An ninh Mang Viet Nam (2018)."], { indent: true }),
        paraRuns([{ text: "Open-Source Core + Premium: ", bold: true }, "Cong khai ma nguon phan loi de cong dong dong gop, thu phi cac tinh nang nang cao (RLHF pipeline, analytics dashboard, admin tools)."], { indent: true }),

        heading3("5.3.2. De xuat chinh sach"),
        new Paragraph({ numbering: { reference: "numbers5", level: 0 }, spacing: { after: 100, line: 360 }, children: [new TextRun({ text: "De xuat Bo Giao duc va Dao tao ban hanh huong dan ve viec su dung AI cuc bo (Edge AI) trong truong hoc de dam bao quyen rieng tu du lieu hoc sinh, thay vi phu thuoc hoan toan vao dich vu dam may cua nuoc ngoai.", size: 24, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbers5", level: 0 }, spacing: { after: 100, line: 360 }, children: [new TextRun({ text: "De xuat xay dung tieu chuan quoc gia ve taxonomy cam xuc hoc tap (ELET) lam co so cho viec danh gia suc khoe tam ly hoc sinh trong moi truong hoc tap so.", size: 24, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbers5", level: 0 }, spacing: { after: 100, line: 360 }, children: [new TextRun({ text: "De xuat chuong trinh dao tao giao vien ve AI va RLHF, giup giao vien tro thanh dong tac gia cua cong nghe giao duc thay vi chi la nguoi su dung thu dong.", size: 24, font: "Times New Roman" })] }),

        new Paragraph({ children: [new PageBreak()] }),

        // ============================================================
        // 6. KE HOACH THUC HIEN
        // ============================================================
        heading1("6. KE HOACH THUC HIEN VA NGUON LUC"),

        heading2("6.1. Tien do thuc hien"),

        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [600, 3200, 2000, 1000, 2200],
          rows: [
            new TableRow({ children: [
              makeCell("TT", { width: 600, shading: BLUE, bold: true }),
              makeCell("Noi dung", { width: 3200, shading: BLUE, bold: true }),
              makeCell("Thoi gian", { width: 2000, shading: BLUE, bold: true }),
              makeCell("Thang", { width: 1000, shading: BLUE, bold: true }),
              makeCell("San pham", { width: 2200, shading: BLUE, bold: true }),
            ]}),
            new TableRow({ children: [
              makeCell("1", { width: 600, shading: LIGHT_GRAY }), makeCell("Tong quan tai lieu va thiet ke kien truc", { width: 3200 }),
              makeCell("T1-T3/2026", { width: 2000 }), makeCell("3", { width: 1000 }), makeCell("Bao cao tong quan, ban thiet ke", { width: 2200 }),
            ]}),
            new TableRow({ children: [
              makeCell("2", { width: 600, shading: LIGHT_GRAY }), makeCell("Phat trien AI Engine va RLHF Pipeline", { width: 3200 }),
              makeCell("T4-T7/2026", { width: 2000 }), makeCell("4", { width: 1000 }), makeCell("He thong AI hoan chinh", { width: 2200 }),
            ]}),
            new TableRow({ children: [
              makeCell("3", { width: 600, shading: LIGHT_GRAY }), makeCell("Phat trien Vision Tracker va STEM Modules", { width: 3200 }),
              makeCell("T5-T9/2026", { width: 2000 }), makeCell("5", { width: 1000 }), makeCell("41 STEM modules, vision system", { width: 2200 }),
            ]}),
            new TableRow({ children: [
              makeCell("4", { width: 600, shading: LIGHT_GRAY }), makeCell("Tich hop he thong va thu nghiem noi bo", { width: 3200 }),
              makeCell("T10-T11/2026", { width: 2000 }), makeCell("2", { width: 1000 }), makeCell("Ban beta, bao cao bug", { width: 2200 }),
            ]}),
            new TableRow({ children: [
              makeCell("5", { width: 600, shading: LIGHT_GRAY }), makeCell("Thuc nghiem tai 3 truong (500 HS, 30 GV)", { width: 3200 }),
              makeCell("T1-T6/2027", { width: 2000 }), makeCell("6", { width: 1000 }), makeCell("Du lieu thuc nghiem", { width: 2200 }),
            ]}),
            new TableRow({ children: [
              makeCell("6", { width: 600, shading: LIGHT_GRAY }), makeCell("Phan tich du lieu va viet bao cao", { width: 3200 }),
              makeCell("T7-T9/2027", { width: 2000 }), makeCell("3", { width: 1000 }), makeCell("Bao cao cuoi ky, bai bao", { width: 2200 }),
            ]}),
          ]
        }),
        emptyLine(),
        paraRuns([{ text: "Bang 2. ", bold: true, italics: true }, { text: "Ke hoach thuc hien de tai nghien cuu (23 thang).", italics: true }], { align: AlignmentType.CENTER }),

        heading2("6.2. Nguon luc"),
        paraRuns([{ text: "Nhan luc: ", bold: true }, "Chu nhiem de tai (1 TS. CNTT), 2 nghien cuu sinh, 2 ky su phan mem, 1 chuyen gia giao duc, 1 chuyen gia tam ly hoc."], { indent: true }),
        paraRuns([{ text: "Phan cung: ", bold: true }, "3 may Mac Mini M4 Pro (cho Ollama inference va fine-tuning), 1 server PostgreSQL, 30 may tinh bang cho hoc sinh thuc nghiem."], { indent: true }),
        paraRuns([{ text: "Phan mem: ", bold: true }, "Toan bo ma nguon mo (open-source): Next.js, React, Ollama, MediaPipe, Prisma, PostgreSQL, Redis. Khong can giay phep phan mem tra phi."], { indent: true }),

        new Paragraph({ children: [new PageBreak()] }),

        // ============================================================
        // 7. KET QUA DU KIEN
        // ============================================================
        heading1("7. KET QUA DU KIEN VA SAN PHAM NGHIEN CUU"),

        heading2("7.1. Ket qua du kien"),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 100, line: 360 }, children: [new TextRun({ text: "Nhom thuc nghiem dat diem trung binh cao hon nhom doi chung it nhat 15% (p < 0.05, Cohen d >= 0.5)", size: 24, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 100, line: 360 }, children: [new TextRun({ text: "Chi so tham gia hoc tap (engagement score) tang it nhat 25% so voi lop hoc truyen thong", size: 24, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 100, line: 360 }, children: [new TextRun({ text: "Mo hinh LLM fine-tune cuc bo (edu-assistant) dat it nhat 85% chat luong cua GPT-4 trong cac nhiem vu gia su giao duc tieng Viet (do bang BLEU score va human evaluation)", size: 24, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 100, line: 360 }, children: [new TextRun({ text: "DPO preference win rate dat tren 70% sau 50+ vong fine-tune voi phan hoi giao vien", size: 24, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 100, line: 360 }, children: [new TextRun({ text: "Do chinh xac nhan dien cam xuc dat tren 80% cho 10 loai cam xuc pho bien nhat trong boi canh hoc tap", size: 24, font: "Times New Roman" })] }),

        heading2("7.2. San pham nghien cuu"),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80, line: 360 }, children: [new TextRun({ text: "Nen tang AeroEdu Vision (ma nguon mo, giay phep Apache 2.0)", size: 24, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80, line: 360 }, children: [new TextRun({ text: "02 bai bao khoa hoc dang tren tap chi quoc te (Q1/Q2 Scopus): 1 bai ve RLHF/DPO trong giao duc, 1 bai ve nhan dien cam xuc da phuong thuc", size: 24, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80, line: 360 }, children: [new TextRun({ text: "01 bai bao hoi nghi quoc te (AIED hoac ITS Conference)", size: 24, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80, line: 360 }, children: [new TextRun({ text: "01 mo hinh ngon ngu fine-tuned (edu-assistant) tren Hugging Face va Ollama Hub", size: 24, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80, line: 360 }, children: [new TextRun({ text: "01 bo du lieu RLHF/DPO cho giao duc tieng Viet (anonymized, 1000+ preference pairs)", size: 24, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80, line: 360 }, children: [new TextRun({ text: "01 de tai dao tao thac si, 02 de tai khoa luan tot nghiep dai hoc", size: 24, font: "Times New Roman" })] }),

        new Paragraph({ children: [new PageBreak()] }),

        // ============================================================
        // 8. TAI LIEU THAM KHAO
        // ============================================================
        heading1("8. TAI LIEU THAM KHAO"),
        emptyLine(),
        para("[1] Gong, Y. (2025). Design and implementation of an intelligent educational interaction system with integrated multimodal emotion recognition and adaptive content delivery. Discover Artificial Intelligence, Springer. DOI: 10.1007/s44163-025-00671-5"),
        para("[2] Singh, R. et al. (2025). A DPO-Based Multi-Agent AI Framework for K-12 Learners. GIRT Journal, Shodhsagar."),
        para("[3] Fleig, L. (2025). Towards Multimodal Affective Intelligence in Educational AI: FEA-LLaVA. Honors Thesis, UC San Diego."),
        para("[4] Alcauter, S. & Martinez-Villasenor, L. (2025). Real-Time Emotion Recognition in Intelligent Tutoring Systems. MICAI 2025, Springer. DOI: 10.1007/978-3-032-09044-7_26"),
        para("[5] Vistorte, A. et al. (2025). Development of adaptive and emotionally intelligent educational assistants. Frontiers in Computer Science. DOI: 10.3389/fcomp.2025.1628104"),
        para("[6] Lambert, N. (2025). Reinforcement Learning from Human Feedback. arXiv: 2504.12501v3. rlhfbook.com"),
        para("[7] ACM Computing Surveys (2025). RLHF Deciphered: A Critical Analysis. DOI: 10.1145/3743127"),
        para("[8] Khediri, A. et al. (2024). MITERS: Real-time Multimodal Intelligent Tutoring Emotion Recognition System. Multimedia Tools and Applications."),
        para("[9] Zhang, Y. et al. (2024). Self-supervised learning for student engagement recognition from facial expressions. IEEE Transactions on Affective Computing."),
        para("[10] Tether Data (2025). QVAC Fabric LLM: Edge-First LLM Inference Runtime and LoRA Fine-Tuning Framework. Apache 2.0 Open Source."),
        para("[11] UNESCO (2024). Global Education Monitoring Report: Technology in Education."),
        para("[12] Ekman, P. (1992). An argument for basic emotions. Cognition and Emotion, 6(3-4), 169-200."),
        para("[13] Vygotsky, L. S. (1978). Mind in Society: The Development of Higher Psychological Processes. Harvard University Press."),
        para("[14] D'Mello, S. & Graesser, A. (2012). Dynamics of affective states during complex learning. Learning and Instruction, 22(2), 145-157."),
        para("[15] Rafailov, R. et al. (2023). Direct Preference Optimization: Your Language Model is Secretly a Reward Model. NeurIPS 2023."),
        para("[16] Ouyang, L. et al. (2022). Training Language Models to Follow Instructions with Human Feedback. NeurIPS 2022."),
        para("[17] Shao, Z. et al. (2024). DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models. arXiv."),
        para("[18] Luong, M. T., Pham, H. & Manning, C. D. (2015). Effective approaches to attention-based neural machine translation. EMNLP 2015."),
        para("[19] Hu, E. J. et al. (2022). LoRA: Low-Rank Adaptation of Large Language Models. ICLR 2022."),
        para("[20] Loshchilov, I. & Hutter, F. (2019). Decoupled Weight Decay Regularization (AdamW). ICLR 2019."),
        emptyLine(),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 360 }, children: [new TextRun({ text: "--- Het ---", size: 24, font: "Times New Roman", italics: true, color: GRAY })] }),
      ]
    }
  ]
});

// ============================================================
// GENERATE
// ============================================================
const OUTPUT = "/Users/pixibox/Aeroeduvison/docs/DE_CUONG_NCKH_AEROEDU_VISION_2026.docx";
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(OUTPUT, buffer);
  console.log("Generated: " + OUTPUT);
  console.log("Size: " + (buffer.length / 1024).toFixed(1) + " KB");
});
