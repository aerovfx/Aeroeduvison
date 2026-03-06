# Phần 1: Làm quen với Python

## Bài 1: Giới thiệu Python và cài đặt môi trường

### Tại sao học Python?

Python là một trong những ngôn ngữ lập trình phổ biến nhất hiện nay, đặc biệt trong lĩnh vực STEM:

- **Khoa học dữ liệu (Data Science)**: Phân tích dữ liệu, machine learning
- **Trí tuệ nhân tạo (AI)**: Deep learning, neural networks  
- **Tự động hóa**: Scripting, automation
- **Phát triển web**: Django, Flask
- **Game development**: Pygame, Arcade

### Ưu điểm của Python

✅ **Cú pháp đơn giản**: Dễ đọc, dễ hiểu  
✅ **Thư viện phong phú**: Hàng nghìn thư viện có sẵn  
✅ **Cộng đồng lớn**: Nhiều tài liệu và hỗ trợ  
✅ **Đa nền tảng**: Chạy trên Windows, Mac, Linux  
✅ **Miễn phí**: Hoàn toàn mã nguồn mở  

### Cài đặt Python

#### Bước 1: Tải Python
1. Truy cập [python.org](https://python.org)
2. Tải phiên bản mới nhất (Python 3.12+)
3. Chạy file installer
4. **Quan trọng**: Tích chọn "Add Python to PATH"

#### Bước 2: Kiểm tra cài đặt
Mở Command Prompt (Windows) hoặc Terminal (Mac/Linux):

```bash
python --version
# Kết quả mong đợi: Python 3.12.x
```

#### Bước 3: Cài đặt VSCode
1. Tải [VSCode](https://code.visualstudio.com)
2. Cài đặt extension Python
3. Cài đặt extension Python Debugger

#### Bước 4: Cài đặt Jupyter Notebook
```bash
pip install notebook
jupyter notebook
```

### Môi trường phát triển

**VSCode**: IDE mạnh mẽ với IntelliSense, debugging  
**Jupyter Notebook**: Tương tác, thử nghiệm code  
**PyCharm**: IDE chuyên nghiệp cho Python  

---

## Bài 2: Chương trình đầu tiên

### Hello World!

Tạo file `hello.py`:

```python
print("Hello, World!")
print("Chào mừng đến với Python!")
print("Tôi đang học lập trình Python.")
```

**Chạy chương trình:**
```bash
python hello.py
```

**Kết quả:**
```
Hello, World!
Chào mừng đến với Python!
Tôi đang học lập trình Python.
```

### Các cách sử dụng print()

```python
# In nhiều giá trị
print("Tên:", "Alice", "Tuổi:", 20)

# In với separator
print("Python", "Programming", "Course", sep="-")
# Kết quả: Python-Programming-Course

# In với end
print("Hello", end=" ")
print("World")
# Kết quả: Hello World (không xuống dòng)

# In đặc biệt
print("Đường dẫn: C:\\Users\\Alice\\Documents")
print("Dấu nháy kép: \"Hello\"")
print("Dấu nháy đơn: 'World'")
```

---

## Bài 3: Các kiểu dữ liệu cơ bản

### 1. Kiểu số nguyên (int)

```python
so_nguyen = 42
so_am = -15
so_lon = 1000000

print(type(so_nguyen))  # <class 'int'>
print(so_nguyen + so_am)  # 27
```

### 2. Kiểu số thực (float)

```python
pi = 3.14159
euler = 2.71828
so_thuc = 0.5

print(type(pi))  # <class 'float'>
print(pi * 2)    # 6.28318
```

### 3. Kiểu chuỗi (str)

```python
ten = "Alice"
ho = 'Nguyễn'
cau_chao = """Xin chào!
Tôi đang học Python."""

print(type(ten))  # <class 'str'>
print(len(ten))   # 5 (số ký tự)
```

### 4. Kiểu boolean (bool)

```python
dung = True
sai = False

print(type(dung))  # <class 'bool'>
print(dung and sai)  # False
```

### Chuyển đổi kiểu dữ liệu

```python
# Chuyển đổi kiểu
so_chuoi = "123"
so_nguyen = int(so_chuoi)  # 123
so_thuc = float(so_chuoi)  # 123.0

# Chuyển sang chuỗi
so = 456
chuoi = str(so)  # "456"

# Kiểm tra kiểu
print(isinstance(so_nguyen, int))  # True
print(isinstance(so_thuc, float))  # True
```

---

## Bài 4: Toán tử và biểu thức

### Toán tử số học

| Toán tử | Mô tả | Ví dụ |
|---------|-------|-------|
| `+` | Cộng | `5 + 3 = 8` |
| `-` | Trừ | `5 - 3 = 2` |
| `*` | Nhân | `5 * 3 = 15` |
| `/` | Chia | `5 / 3 = 1.666...` |
| `//` | Chia nguyên | `5 // 3 = 1` |
| `%` | Chia dư | `5 % 3 = 2` |
| `**` | Lũy thừa | `5 ** 3 = 125` |

```python
a = 10
b = 3

print(f"Cộng: {a} + {b} = {a + b}")
print(f"Trừ: {a} - {b} = {a - b}")
print(f"Nhân: {a} * {b} = {a * b}")
print(f"Chia: {a} / {b} = {a / b}")
print(f"Chia nguyên: {a} // {b} = {a // b}")
print(f"Chia dư: {a} % {b} = {a % b}")
print(f"Lũy thừa: {a} ** {b} = {a ** b}")
```

### Toán tử so sánh

```python
x = 10
y = 5

print(x > y)   # True
print(x < y)   # False
print(x >= y)  # True
print(x <= y)  # False
print(x == y)  # False
print(x != y)  # True
```

### Toán tử logic

```python
a = True
b = False

print(a and b)  # False
print(a or b)   # True
print(not a)    # False
```

### Thứ tự ưu tiên

1. `()` - Dấu ngoặc
2. `**` - Lũy thừa
3. `*`, `/`, `//`, `%` - Nhân, chia
4. `+`, `-` - Cộng, trừ
5. `==`, `!=`, `<`, `>`, `<=`, `>=` - So sánh
6. `not` - Phủ định
7. `and` - Và
8. `or` - Hoặc

```python
ket_qua = 2 + 3 * 4 ** 2  # 2 + 3 * 16 = 2 + 48 = 50
print(ket_qua)
```

---

## Bài 5: Nhập và xuất dữ liệu

### Hàm input()

```python
# Nhập chuỗi
ten = input("Nhập tên của bạn: ")
print(f"Xin chào, {ten}!")

# Nhập số
tuoi = int(input("Nhập tuổi: "))
print(f"Bạn {tuoi} tuổi.")

# Nhập số thực
chieu_cao = float(input("Nhập chiều cao (m): "))
print(f"Chiều cao: {chieu_cao}m")
```

### Định dạng chuỗi với f-string

```python
ten = "Alice"
tuoi = 20
diem = 8.5

# f-string (khuyến nghị)
print(f"Tên: {ten}, Tuổi: {tuoi}, Điểm: {diem}")

# Định dạng số
print(f"Điểm: {diem:.2f}")  # 8.50
print(f"Số: {123456:,}")    # 123,456
```

### Định dạng chuỗi với format()

```python
ten = "Alice"
tuoi = 20

# Phương thức format()
print("Tên: {}, Tuổi: {}".format(ten, tuoi))
print("Tuổi: {1}, Tên: {0}".format(ten, tuoi))

# Định dạng số
so_pi = 3.14159
print("Pi = {:.2f}".format(so_pi))  # Pi = 3.14
```

### Định dạng chuỗi với %

```python
ten = "Alice"
tuoi = 20
diem = 8.5

print("Tên: %s, Tuổi: %d, Điểm: %.2f" % (ten, tuoi, diem))
# %s: chuỗi, %d: số nguyên, %f: số thực
```

---

## Bài tập thực hành

### Bài 1: Máy tính đơn giản
Viết chương trình thực hiện 4 phép toán cơ bản:

```python
# Gợi ý code
so1 = float(input("Nhập số thứ nhất: "))
so2 = float(input("Nhập số thứ hai: "))
phep_toan = input("Chọn phép toán (+, -, *, /): ")

# Viết code xử lý phép toán ở đây...
```

### Bài 2: Chuyển đổi nhiệt độ
Viết chương trình chuyển đổi từ Celsius sang Fahrenheit:

```python
# Công thức: F = C * 9/5 + 32
celsius = float(input("Nhập nhiệt độ Celsius: "))
fahrenheit = celsius * 9/5 + 32
print(f"{celsius}°C = {fahrenheit}°F")
```

### Bài 3: Tính chu vi và diện tích hình tròn
```python
# Công thức: Chu vi = 2πr, Diện tích = πr²
import math
r = float(input("Nhập bán kính: "))
chu_vi = 2 * math.pi * r
dien_tich = math.pi * r ** 2
print(f"Chu vi: {chu_vi:.2f}")
print(f"Diện tích: {dien_tich:.2f}")
```

---

## Tóm tắt

✅ **Đã học được:**
- Cài đặt Python và môi trường phát triển
- Viết chương trình Python đầu tiên
- Hiểu các kiểu dữ liệu cơ bản: int, float, str, bool
- Sử dụng toán tử số học, so sánh, logic
- Nhập/xuất dữ liệu với input() và print()

🚀 **Chuẩn bị cho phần tiếp theo:**
- Cấu trúc điều khiển: if/else, vòng lặp
- Làm thế nào để Python "quyết định" và "lặp lại"

