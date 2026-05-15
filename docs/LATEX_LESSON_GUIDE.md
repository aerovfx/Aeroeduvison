# Hướng dẫn LaTeX cho Giáo viên — Soạn Đề thi & Bài giảng

**Phạm vi:** Cú pháp LaTeX cần dùng khi soạn bài/đề thi trên AeroEduVision (inphysic.com)
**Đối tượng:** Giáo viên các môn Toán/Lý/Hoá/Văn (tiểu học → THPT)
**Yêu cầu:** Cài đặt MiKTeX/TeX Live, hoặc soạn trực tiếp trên `/teacher/latex-editor`

---

## 📑 Mục lục

1. [Khung mẫu sẵn sàng dùng](#1-khung-mẫu-sẵn-sàng-dùng)
2. [Cấu trúc cơ bản](#2-cấu-trúc-cơ-bản)
3. [Header chuẩn 2 cột (trường + đề)](#3-header-chuẩn-2-cột-trường--đề)
4. [Định dạng văn bản](#4-định-dạng-văn-bản)
5. [Công thức toán học](#5-công-thức-toán-học)
6. [Danh sách & đánh số](#6-danh-sách--đánh-số)
7. [Bảng biểu](#7-bảng-biểu)
8. [Hình ảnh & đồ thị](#8-hình-ảnh--đồ-thị)
9. [Cấu trúc đề thi 4 phần (chuẩn BGD&ĐT)](#9-cấu-trúc-đề-thi-4-phần-chuẩn-bgdđt)
10. [Mẹo & lỗi thường gặp](#10-mẹo--lỗi-thường-gặp)

---

## 1. Khung mẫu sẵn sàng dùng

> Copy nguyên đoạn này vào trình soạn LaTeX, chỉnh thông tin trường/đề/môn rồi soạn nội dung.

```latex
\documentclass[12pt,a4paper]{article}
\usepackage[utf8]{inputenc}
\usepackage[vietnamese]{babel}
\usepackage{amsmath,amssymb}      % Công thức toán
\usepackage{geometry}              % Lề trang
\usepackage{enumitem}              % Danh sách tuỳ chỉnh
\usepackage{graphicx}              % Chèn ảnh
\usepackage{tikz}                  % Vẽ hình
\usepackage{array}                 % Bảng nâng cao
\usepackage{booktabs}              % Đường kẻ bảng đẹp
\usepackage{multicol}              % Cột song song
\usepackage{fancyhdr}              % Header/Footer

\geometry{top=2cm,bottom=2cm,left=2cm,right=2cm}
\setlength{\parindent}{0pt}
\setlength{\parskip}{6pt}

\begin{document}

%================ HEADER =================
\begin{center}
  \begin{minipage}[t]{0.45\textwidth}
    \centering
    \textbf{TRƯỜNG TIỂU HỌC AEROSCHOOL} \\
    \textbf{Tổ Toán - Tin} \\
    \rule{5cm}{0.4pt}
  \end{minipage}
  \begin{minipage}[t]{0.54\textwidth}
    \centering
    \textbf{HƯỚNG DẪN GIẢI CHI TIẾT - ĐỀ SỐ 1} \\
    \textbf{NĂM HỌC 2025 -- 2026} \\
    \textbf{MÔN: TOÁN LỚP 3}
  \end{minipage}
\end{center}

\rule{\textwidth}{0.4pt}

% --- NỘI DUNG CHÍNH ---

\section*{Bài 1.}
Tính: $25 + 37 - 12 = ?$

\textbf{Lời giải:}
$25 + 37 - 12 = 62 - 12 = 50$.

\end{document}
```

---

## 2. Cấu trúc cơ bản

### 2.1 Phần đầu (Preamble — trước `\begin{document}`)

| Lệnh | Tác dụng |
|---|---|
| `\documentclass[12pt,a4paper]{article}` | Loại tài liệu + cỡ chữ + giấy |
| `\usepackage[utf8]{inputenc}` | **BẮT BUỘC** — cho phép gõ tiếng Việt UTF-8 |
| `\usepackage[vietnamese]{babel}` | **BẮT BUỘC** — cấu hình ngôn ngữ Việt (ngày tháng, kerning) |
| `\usepackage{amsmath,amssymb}` | Công thức toán + ký hiệu đặc biệt |
| `\usepackage{geometry}` | Tuỳ chỉnh lề trang |
| `\geometry{top=2cm,...}` | Set lề (mặc định LaTeX khá rộng) |
| `\setlength{\parindent}{0pt}` | Bỏ thụt dòng đầu đoạn |
| `\setlength{\parskip}{6pt}` | Khoảng cách giữa các đoạn |

### 2.2 Phần thân (giữa `\begin{document}` và `\end{document}`)

- **Comments**: dòng bắt đầu bằng `%` — LaTeX bỏ qua
- **Section**: `\section*{Tên}` (có sao = không đánh số) hoặc `\section{Tên}` (đánh số tự động)
- **Subsection**: `\subsection*{Tên}` cho mục con
- **Page break**: `\newpage` hoặc `\clearpage`

### 2.3 Các loại documentclass thường dùng

```latex
\documentclass[12pt,a4paper]{article}   % Bài viết ngắn (đề thi, bài giảng 1-10 trang)
\documentclass[12pt,a4paper]{report}    % Báo cáo dài (có chapter)
\documentclass[12pt,a4paper]{book}      % Sách giáo khoa
\documentclass[12pt,a4paper]{exam}      % Đề thi chuyên dụng (auto-numbering câu)
```

---

## 3. Header chuẩn 2 cột (trường + đề)

### 3.1 Mẫu header chuẩn

```latex
\begin{center}
  \begin{minipage}[t]{0.45\textwidth}
    \centering
    \textbf{SỞ GD\&ĐT HÀ NỘI} \\
    \textbf{TRƯỜNG THPT CHU VĂN AN} \\
    \rule{5cm}{0.4pt}
  \end{minipage}%
  \begin{minipage}[t]{0.54\textwidth}
    \centering
    \textbf{ĐỀ KIỂM TRA HỌC KỲ I} \\
    \textbf{NĂM HỌC 2025 -- 2026} \\
    \textbf{MÔN: TOÁN LỚP 11} \\
    \textit{Thời gian làm bài: 90 phút}
  \end{minipage}
\end{center}
\rule{\textwidth}{0.4pt}
```

### 3.2 Giải thích

- `\begin{minipage}[t]{0.45\textwidth}` — Tạo block ngang chiếm 45% chiều rộng. `[t]` = canh đỉnh, `0.45` = 45%
- `\textbf{}` — In đậm
- `\\` — Xuống dòng trong minipage
- `\rule{5cm}{0.4pt}` — Vẽ đường ngang (rộng 5cm, dày 0.4pt)
- `%` cuối dòng — **QUAN TRỌNG**: không để khoảng trắng giữa 2 minipage (tránh xuống dòng)
- `\rule{\textwidth}{0.4pt}` cuối — Vẽ đường ngang phân cách

### 3.3 Biến thể

**Header có logo (PNG):**
```latex
\begin{minipage}[t]{0.2\textwidth}
  \includegraphics[width=3cm]{logo-truong.png}
\end{minipage}%
\begin{minipage}[t]{0.4\textwidth}
  \centering \textbf{TRƯỜNG ...}
\end{minipage}%
\begin{minipage}[t]{0.4\textwidth}
  \centering \textbf{ĐỀ THI ...}
\end{minipage}
```

**Header chỉ 1 dòng (đơn giản):**
```latex
\begin{center}
  \textbf{\Large ĐỀ KIỂM TRA TOÁN LỚP 9 — Tuần 5} \\
  \textit{Năm học 2025-2026}
\end{center}
```

---

## 4. Định dạng văn bản

### 4.1 Kiểu chữ

| Lệnh | Kết quả |
|---|---|
| `\textbf{abc}` | **abc** (in đậm) |
| `\textit{abc}` | *abc* (in nghiêng) |
| `\underline{abc}` | <ins>abc</ins> (gạch chân) |
| `\texttt{abc}` | `abc` (font code) |
| `\textsc{abc}` | ᴀʙᴄ (chữ in nhỏ) |

### 4.2 Cỡ chữ

```latex
{\tiny       Rất nhỏ}      % ≈ 6pt
{\scriptsize Nhỏ hơn}      % ≈ 8pt
{\small      Nhỏ}          % ≈ 10pt
{\normalsize Bình thường}  % ≈ 11-12pt
{\large      To}           % ≈ 14pt
{\Large      To hơn}       % ≈ 17pt
{\LARGE      Rất to}       % ≈ 20pt
{\huge       Khổng lồ}     % ≈ 25pt
```

### 4.3 Căn lề

```latex
\begin{center}     Căn giữa     \end{center}
\begin{flushleft}  Căn trái     \end{flushleft}
\begin{flushright} Căn phải     \end{flushright}
```

### 4.4 Xuống dòng & đoạn văn

```latex
Dòng 1.\\          % Xuống dòng (cùng đoạn)
Dòng 2.

Đoạn mới.          % Bỏ trắng 1 dòng = đoạn mới
\newpage           % Sang trang mới
\bigskip           % Khoảng trắng dọc to
\medskip           % Khoảng trắng dọc vừa
\smallskip         % Khoảng trắng dọc nhỏ
\vspace{1cm}       % Khoảng trắng tuỳ chỉnh
\hspace{2em}       % Khoảng trắng ngang (2em = 2 chữ M)
```

### 4.5 Ký hiệu đặc biệt trong tiếng Việt

- Dấu nháy thông minh: ``...''` (2 backtick + 2 quote) → "..."
- Dấu nháy đơn: `` ` ` `` và `'` → 'abc'
- Gạch ngang nối từ: `nửa-mặt` → nửa-mặt
- Gạch nối đoạn: `2025--2026` → 2025–2026 (gạch trung)
- Gạch nói: `--- ` → — (em-dash, dùng làm dấu nói)
- `\&` để gõ chữ `&` (vì `&` là ký tự đặc biệt)
- `\%` để gõ `%`
- `\#`, `\$`, `\_`, `\{`, `\}` cho các ký tự đặc biệt

---

## 5. Công thức toán học

### 5.1 Inline vs Display

```latex
% Inline (trong dòng)
Diện tích hình tròn là $S = \pi r^2$.

% Display (1 dòng riêng, căn giữa)
\[ S = \pi r^2 \]

% Display có đánh số (refer được)
\begin{equation}
  S = \pi r^2
\end{equation}

% Display nhiều dòng căn theo dấu =
\begin{align}
  (a+b)^2 &= a^2 + 2ab + b^2 \\
  (a-b)^2 &= a^2 - 2ab + b^2
\end{align}
```

### 5.2 Toán tử & ký hiệu cơ bản

| Mã | Hiển thị | Mô tả |
|---|---|---|
| `a^2` | a² | Mũ |
| `a_n` | aₙ | Chỉ số dưới |
| `a^{n+1}` | aⁿ⁺¹ | Mũ nhiều ký tự (dùng {}) |
| `\frac{a}{b}` | a/b | Phân số |
| `\sqrt{x}` | √x | Căn bậc 2 |
| `\sqrt[3]{x}` | ∛x | Căn bậc 3 |
| `\cdot` | · | Nhân (chấm giữa) |
| `\times` | × | Nhân (dấu X) |
| `\div` | ÷ | Chia |
| `\pm` | ± | Cộng hoặc trừ |
| `\mp` | ∓ | Trừ hoặc cộng |
| `\neq` | ≠ | Khác |
| `\leq` `\geq` | ≤ ≥ | Nhỏ/lớn hơn hoặc bằng |
| `\approx` | ≈ | Xấp xỉ |
| `\infty` | ∞ | Vô cực |
| `\pi` | π | Pi |
| `\alpha \beta \gamma` | α β γ | Hy Lạp |
| `\Delta` | Δ | Delta hoa |

### 5.3 Đại số

```latex
% Phương trình bậc 2
\[ ax^2 + bx + c = 0 \quad (a \neq 0) \]
\[ x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a} \]

% Hệ phương trình
\begin{equation*}
  \begin{cases}
    2x + y = 5 \\
    x - 3y = -1
  \end{cases}
\end{equation*}

% Bất phương trình
\[ |x - 3| \leq 5 \iff -2 \leq x \leq 8 \]
```

### 5.4 Giải tích

```latex
% Giới hạn
\[ \lim_{x \to 0} \frac{\sin x}{x} = 1 \]

% Đạo hàm
\[ f'(x) = \lim_{h \to 0} \frac{f(x+h) - f(x)}{h} \]
\[ \frac{dy}{dx}, \quad \frac{d^2y}{dx^2}, \quad \frac{\partial f}{\partial x} \]

% Tích phân
\[ \int_a^b f(x) \, dx \]
\[ \iint_D f(x,y) \, dA \]
\[ \oint_C \vec{F} \cdot d\vec{r} \]

% Tổng, tích
\[ \sum_{i=1}^{n} i = \frac{n(n+1)}{2} \]
\[ \prod_{i=1}^{n} i = n! \]
```

### 5.5 Lượng giác

```latex
\[ \sin x, \cos x, \tan x, \cot x \]
\[ \sin^2 x + \cos^2 x = 1 \]
\[ \tan x = \frac{\sin x}{\cos x} \]
\[ \arcsin x, \arccos x \]
% Để có ký hiệu sin⁻¹: \sin^{-1} x
```

### 5.6 Vector & ma trận

```latex
% Vector
\[ \vec{a}, \quad \overrightarrow{AB}, \quad \mathbf{v} \]
\[ \vec{a} \cdot \vec{b} = |\vec{a}||\vec{b}|\cos\theta \]
\[ \vec{a} \times \vec{b} \]

% Ma trận
\[ A = \begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix} \]
\[ B = \begin{bmatrix} a & b \\ c & d \end{bmatrix} \]
\[ \det(A) = \begin{vmatrix} a & b \\ c & d \end{vmatrix} = ad - bc \]
```

Các kiểu ngoặc ma trận:
- `pmatrix` — ngoặc tròn `(  )`
- `bmatrix` — ngoặc vuông `[  ]`
- `Bmatrix` — ngoặc nhọn `{  }`
- `vmatrix` — gạch dọc `|  |` (định thức)
- `Vmatrix` — gạch đôi `‖  ‖`

### 5.7 Hoá học (mod phụ)

Thêm package `\usepackage{mhchem}` rồi:
```latex
\ce{H2SO4}          % H₂SO₄
\ce{Fe^{3+}}        % Fe³⁺
\ce{NaCl -> Na+ + Cl-}     % Phương trình
\ce{2H2 + O2 -> 2H2O}
```

---

## 6. Danh sách & đánh số

### 6.1 Liệt kê có gạch đầu dòng

```latex
\begin{itemize}
  \item Mục đầu tiên
  \item Mục thứ hai
  \item Mục thứ ba có \textbf{định dạng}
\end{itemize}
```

### 6.2 Liệt kê đánh số

```latex
\begin{enumerate}
  \item Câu 1
  \item Câu 2
  \item Câu 3
\end{enumerate}
```

### 6.3 Tuỳ chỉnh ký hiệu (cần `\usepackage{enumitem}`)

```latex
% Đánh số La Mã hoa
\begin{enumerate}[label=\Roman*.]
  \item Phần một
  \item Phần hai
\end{enumerate}

% Đánh số chữ thường + ngoặc
\begin{enumerate}[label=(\alph*)]
  \item Trường hợp a
  \item Trường hợp b
\end{enumerate}

% Đánh số chữ cái IN HOA
\begin{enumerate}[label=\textbf{Câu \arabic*.}, leftmargin=1.5cm]
  \item Tính tổng...
  \item Giải phương trình...
\end{enumerate}

% Khoảng cách giữa các item
\begin{itemize}[itemsep=4pt, topsep=4pt]
  \item ...
\end{itemize}
```

### 6.4 Danh sách lồng nhau

```latex
\begin{enumerate}[label=\arabic*.]
  \item Câu 1
    \begin{enumerate}[label=(\alph*)]
      \item Phần a
      \item Phần b
    \end{enumerate}
  \item Câu 2
\end{enumerate}
```

---

## 7. Bảng biểu

### 7.1 Bảng cơ bản

```latex
\begin{tabular}{|c|l|r|}
  \hline
  STT & Học sinh    & Điểm \\
  \hline
  1   & Nguyễn A    & 9.5  \\
  2   & Trần B      & 8.0  \\
  3   & Lê C        & 7.5  \\
  \hline
\end{tabular}
```

**Ký hiệu cột:**
- `c` — căn giữa
- `l` — căn trái
- `r` — căn phải
- `|` — viền dọc
- `p{3cm}` — cột rộng 3cm, tự xuống dòng

### 7.2 Bảng có gộp ô

Cần `\usepackage{multirow}`:

```latex
\begin{tabular}{|c|c|c|}
  \hline
  \multicolumn{3}{|c|}{\textbf{ĐIỂM KIỂM TRA}} \\
  \hline
  STT & Tên & Điểm \\
  \hline
  \multirow{2}{*}{1} & Nguyễn A & 9 \\
                     & Nguyễn A1 & 8 \\
  \hline
\end{tabular}
```

### 7.3 Bảng đẹp với booktabs

```latex
\begin{tabular}{lcc}
  \toprule
  Học sinh & Toán & Văn \\
  \midrule
  Nguyễn A & 9.0  & 8.5 \\
  Trần B   & 7.5  & 9.0 \\
  \bottomrule
\end{tabular}
```

---

## 8. Hình ảnh & đồ thị

### 8.1 Chèn ảnh PNG/JPG

```latex
\usepackage{graphicx}

% Trong document
\begin{figure}[h]
  \centering
  \includegraphics[width=0.6\textwidth]{anh-hinh-tron.png}
  \caption{Hình tròn bán kính 5cm}
  \label{fig:circle}
\end{figure}
```

**Tham số `\includegraphics`:**
- `width=0.6\textwidth` — Rộng 60% chiều ngang trang
- `height=5cm` — Cao 5cm
- `scale=0.5` — Phóng to/thu nhỏ 50%
- `angle=90` — Xoay 90°

### 8.2 Vẽ hình với TikZ

```latex
\usepackage{tikz}

% Tam giác đều
\begin{tikzpicture}
  \draw (0,0) -- (4,0) -- (2,3.46) -- cycle;
  \node at (-0.3,0)   {A};
  \node at (4.3,0)    {B};
  \node at (2,3.86)   {C};
\end{tikzpicture}

% Hệ trục toạ độ + đồ thị y = x²
\begin{tikzpicture}[scale=0.8]
  \draw[->] (-3,0) -- (3,0) node[right] {$x$};
  \draw[->] (0,-1) -- (0,8) node[above] {$y$};
  \draw[blue, thick, domain=-2.5:2.5, samples=50] plot (\x, {\x*\x});
  \node at (1.5,5.5) [blue] {$y = x^2$};
\end{tikzpicture}

% Hình tròn
\begin{tikzpicture}
  \draw (0,0) circle (2cm);
  \node at (0,0) {$O$};
  \draw[red, ->] (0,0) -- (1.4,1.4) node[midway, above] {$R$};
\end{tikzpicture}
```

### 8.3 Biểu đồ với pgfplots (mức nâng cao)

```latex
\usepackage{pgfplots}
\pgfplotsset{compat=1.18}

\begin{tikzpicture}
  \begin{axis}[xlabel={$x$}, ylabel={$f(x)$}, grid=major]
    \addplot[blue,domain=-3:3,samples=50] {x^2};
    \addplot[red, domain=-3:3,samples=50] {x^3};
  \end{axis}
\end{tikzpicture}
```

---

## 9. Cấu trúc đề thi 4 phần (chuẩn BGD&ĐT)

> Cấu trúc đề thi mới TT22/2021/TT-BGDĐT cho HS THPT

### 9.1 Phần I — Trắc nghiệm 4 lựa chọn

```latex
\section*{PHẦN I (3,0 điểm) — Câu trắc nghiệm nhiều phương án lựa chọn}
\textit{Học sinh trả lời từ câu 1 đến câu 12. Mỗi câu chỉ chọn 1 phương án đúng.}

\textbf{Câu 1.} Cho hàm số $f(x) = 2x + 1$. Giá trị $f(3)$ bằng:
\begin{enumerate}[label=\textbf{\Alph*.}, itemsep=0pt, leftmargin=2cm]
  \item 5     \item 6     \item 7     \item 8
\end{enumerate}

\textbf{Câu 2.} Nghiệm của phương trình $x^2 - 4 = 0$ là:
\begin{enumerate}[label=\textbf{\Alph*.}, itemsep=0pt, leftmargin=2cm]
  \item $x = 2$        \item $x = -2$
  \item $x = \pm 2$    \item Vô nghiệm
\end{enumerate}
```

### 9.2 Phần II — Đúng/Sai (4 ý/câu)

```latex
\section*{PHẦN II (2,0 điểm) — Câu trắc nghiệm Đúng/Sai}
\textit{Học sinh trả lời từ câu 1 đến câu 4. Mỗi câu có 4 ý a, b, c, d. Chọn Đúng hoặc Sai cho từng ý.}

\textbf{Câu 1.} Cho parabol $(P): y = x^2 - 2x - 3$.
\begin{enumerate}[label=\textbf{\alph*)}, itemsep=2pt, leftmargin=1cm]
  \item Đỉnh của $(P)$ có toạ độ $(1, -4)$.
  \item Trục đối xứng của $(P)$ là đường thẳng $x = 1$.
  \item $(P)$ cắt trục hoành tại 2 điểm có hoành độ là $-1$ và $3$.
  \item $(P)$ đi qua điểm $M(2, -3)$.
\end{enumerate}
```

### 9.3 Phần III — Trả lời ngắn

```latex
\section*{PHẦN III (2,0 điểm) — Câu hỏi trả lời ngắn}
\textit{Học sinh trả lời từ câu 1 đến câu 6.}

\textbf{Câu 1.} Tổng các nghiệm của phương trình $x^2 - 5x + 6 = 0$ bằng \underline{\hspace{2cm}}.

\textbf{Câu 2.} Giá trị của $\lim_{x \to 2} \frac{x^2 - 4}{x - 2}$ bằng \underline{\hspace{2cm}}.
```

### 9.4 Phần IV — Tự luận

```latex
\section*{PHẦN IV (3,0 điểm) — Tự luận}

\textbf{Bài 1.} (1,5 điểm) Giải phương trình
\[ x^2 - 5x + 6 = 0 \]

\textbf{Lời giải.}
Ta có $\Delta = b^2 - 4ac = 25 - 24 = 1 > 0$.

Phương trình có 2 nghiệm phân biệt:
\[ x_1 = \frac{5 + 1}{2} = 3, \quad x_2 = \frac{5 - 1}{2} = 2 \]

Vậy tập nghiệm $S = \{2, 3\}$.

\bigskip

\textbf{Bài 2.} (1,5 điểm) ...
```

### 9.5 Block "Lời giải" có khung

```latex
\usepackage{tcolorbox}

\begin{tcolorbox}[colback=blue!5,colframe=blue!50,title=Lời giải]
  Bước 1: Tính $\Delta = b^2 - 4ac$. \\
  Bước 2: Nếu $\Delta > 0$, áp dụng công thức nghiệm. \\
  Bước 3: Kiểm tra điều kiện ban đầu.
\end{tcolorbox}
```

---

## 10. Mẹo & lỗi thường gặp

### 10.1 Tiếng Việt không hiển thị / lỗi font

- ✅ Đảm bảo có `\usepackage[utf8]{inputenc}` + `\usepackage[vietnamese]{babel}`
- ✅ File phải save dưới dạng **UTF-8** (không phải Windows-1252)
- ✅ Compile bằng **XeLaTeX** hoặc **LuaLaTeX** nếu vẫn lỗi:
  ```latex
  \usepackage{fontspec}
  \setmainfont{Times New Roman}   % Hoặc font khác có sẵn
  ```

### 10.2 Lỗi `Missing $ inserted`

- **Nguyên nhân**: ký tự toán học ngoài chế độ math
- **Sửa**: bọc trong `$...$`. Ví dụ:
  ```latex
  % SAI:
  Giá trị x^2 là...
  % ĐÚNG:
  Giá trị $x^2$ là...
  ```

### 10.3 Lỗi `Undefined control sequence`

- **Nguyên nhân**: dùng lệnh chưa khai báo package
- **Sửa**: thêm package phù hợp ở preamble. Bảng tham chiếu:
  - `\frac, \sum, \int` → `\usepackage{amsmath}`
  - `\mathbb{R}, \mathbb{N}` → `\usepackage{amssymb}`
  - `\ce{...}` (hoá) → `\usepackage{mhchem}`
  - `\includegraphics` → `\usepackage{graphicx}`
  - `\rowcolor` (màu bảng) → `\usepackage{colortbl}`

### 10.4 Khoảng cách trong công thức

- `\,` — khoảng nhỏ (3/18em)
- `\:` — khoảng vừa
- `\;` — khoảng to
- `\quad` — 1 chữ M
- `\qquad` — 2 chữ M
- `\!` — khoảng âm (kéo lại gần)

```latex
\[ \int_0^1 f(x) \, dx \]   % \, tạo khoảng nhỏ giữa f(x) và dx
```

### 10.5 Hoa lá cành (\\)

- `\\` trong **bảng** = sang dòng
- `\\` trong **văn bản** = xuống dòng (cùng đoạn)
- `\\` trong **align/equation** = sang dòng công thức mới
- `\\*` = không cho ngắt trang sau dòng này

### 10.6 Đặt tên file & encoding

- Tên file: chỉ dùng chữ Latin + số + `-`/`_`, **không dùng tiếng Việt có dấu**
  - ✅ `de-thi-toan-lop-9.tex`
  - ❌ `Đề thi Toán lớp 9.tex`
- Lưu UTF-8 (TeXstudio: Options → Configure → Default Font Encoding → UTF-8)

### 10.7 Mẹo tăng tốc soạn bài

1. **Snippet/template**: lưu các block hay dùng (header, câu trắc nghiệm, lời giải) thành snippet
2. **Compile từng phần**: thêm `\includeonly{part1}` để chỉ render 1 phần khi sửa đổi
3. **Xem trước nhanh**: dùng [Overleaf](https://overleaf.com) (online, không cài đặt) hoặc TeXstudio (desktop)
4. **Auto-format**: cài extension LaTeX Workshop cho VS Code
5. **Kiểm tra chính tả**: tích hợp Grammarly/LanguageTool cho `.tex`

---

## 📚 Tài liệu tham khảo

- [LaTeX Wikibook (tiếng Anh)](https://en.wikibooks.org/wiki/LaTeX)
- [Hỗ trợ tiếng Việt — VietTUG](http://viettug.org)
- [Symbol List (CTAN)](https://ctan.org/pkg/comprehensive) — bảng tra cứu 14000+ ký hiệu
- [TikZ Manual](https://ctan.org/pkg/pgf) — hướng dẫn vẽ hình chi tiết
- AeroEduVision LaTeX Editor: https://inphysic.com/teacher/latex-editor

---

## 🎯 Checklist trước khi nộp đề

- [ ] Header trường + đề rõ ràng (có thời gian, môn, lớp)
- [ ] Đánh số câu nhất quán (Câu 1, Câu 2, ... hoặc Bài 1, Bài 2, ...)
- [ ] Công thức toán bọc trong `$...$` hoặc `\[ ... \]`
- [ ] Đáp án trắc nghiệm có 4 lựa chọn A/B/C/D
- [ ] Lời giải có bước rõ ràng (không bỏ qua bước trung gian)
- [ ] Tiếng Việt có dấu đầy đủ, không lỗi font
- [ ] Compile ra PDF không lỗi (warning OK, error KHÔNG OK)
- [ ] Số trang + lề ổn (in ra A4 vừa khít)
- [ ] Tên file follow convention `de-<mon>-<lop>-<tuan>.tex`
