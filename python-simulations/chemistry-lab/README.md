# 🧪 Phòng thí nghiệm Hóa học ảo

Mô phỏng phản ứng hóa học với: **Cân bằng phương trình tự động**, **Tính toán mol**, và **Hiệu ứng trực quan**.

## ✨ Tính năng

### 1. ⚗️ Cân bằng phương trình
- Cân bằng tự động (H2 + O2 → 2H2O)
- Hiển thị hệ số cân bằng
- Phân tích thành phần nguyên tố

### 2. 🔢 Tính toán mol
- Khối lượng ↔ Mol
- Mol ↔ Thể tích (khí)
- Nồng độ ↔ Mol
- Khối lượng phân tử

### 3. 💥 Mô phỏng phản ứng
- **7 phản ứng phổ biến** với hiệu ứng:
  - Trung hòa axit-bazơ (HCl + NaOH)
  - Kim loại + axit (Zn + HCl) → khí H₂
  - Kết tủa (CuSO₄ + NaOH) → Cu(OH)₂ xanh
  - Kết tủa trắng (AgNO₃ + NaCl) → AgCl
  - Phân hủy (H₂O₂) → bọt khí O₂
  - Cháy (Mg + O₂) → ánh sáng chói
  - Thế kim loại (Fe + CuSO₄) → Cu đỏ

### 4. 🎨 Hiệu ứng trực quan
- **Thay đổi màu**: Xanh → Trắng, Hồng → Không màu
- **Khí**: Bọt khí bay lên (H₂, O₂, CO₂)
- **Kết tủa**: Tạo chất rắn (Cu(OH)₂, AgCl)
- **Nhiệt**: Tỏa nhiệt/Thu nhiệt

## 🚀 Quick Start

### Build data
```bash
cd python-simulations/chemistry-lab
python3 build.py
```

### Khởi động API
```bash
bash start_api.sh
```

API: **http://localhost:8003**

## 📡 API Examples

### Cân bằng phương trình
```bash
curl -X POST "http://localhost:8003/api/balance" \
  -H "Content-Type: application/json" \
  -d '{"equation": "H2 + O2 -> H2O"}'
```

Response:
```json
{
  "status": "success",
  "data": {
    "equation": "2H2 + O2 → 2H2O",
    "is_balanced": true
  }
}
```

### Tính mol
```bash
curl -X POST "http://localhost:8003/api/calculate" \
  -H "Content-Type: application/json" \
  -d '{
    "calculation_type": "mass_to_mol",
    "mass": 36,
    "molecular_mass": 18
  }'
```

Response:
```json
{
  "status": "success",
  "data": {
    "mol": 2.0,
    "formula": "36g ÷ 18g/mol = 2.0 mol"
  }
}
```

### Mô phỏng phản ứng
```bash
curl -X POST "http://localhost:8003/api/simulate" \
  -H "Content-Type": application/json" \
  -d '{
    "reaction_id": "zn_hcl",
    "reactant_amounts": {"Zn": 0.1, "HCl": 0.3}
  }'
```

## 📊 Data có sẵn

File `output/data.json` chứa:
- **10 phương trình** đã cân bằng
- **3 ví dụ** tính toán
- **13 phân tử** với khối lượng mol
- **7 phản ứng** với hiệu ứng
- **32 nguyên tố** với khối lượng nguyên tử

## 🎯 Use Cases

### Lớp 8-9
- Cân bằng phương trình đơn giản
- Tính khối lượng phân tử
- Nhận biết phản ứng

### Lớp 10-12
- Tính toán mol nâng cao
- Xác định chất dư/hạn chế
- Tính nồng độ dung dịch
- Các loại phản ứng hóa học

## 🎨 Canvas Animation

Mỗi phản ứng có `effects` array:

```typescript
interface ReactionEffect {
  type: "color_change" | "gas" | "precipitate" | "heat"
  description: string
  color_before?: string
  color_after?: string
  gas_color?: string
  precipitate_color?: string
  temperature_change?: number
}
```

Example animation:
```javascript
// Vẽ bình phản ứng
function drawFlask(ctx, color, gasLevel = 0) {
  // Vẽ bình
  ctx.fillStyle = color;
  ctx.fillRect(100, 200, 200, 300);
  
  // Vẽ khí (nếu có)
  if (gasLevel > 0) {
    ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
    for (let i = 0; i < 10; i++) {
      // Vẽ bọt khí bay lên
    }
  }
}
```

## 📚 Công thức

### Tính mol
```
n = m/M        (mol từ khối lượng)
m = n × M      (khối lượng từ mol)
V = n × 22.4   (thể tích khí ở đktc)
C = n/V        (nồng độ mol)
```

### Cân bằng
```
Định luật bảo toàn khối lượng:
Tổng khối lượng chất phản ứng = Tổng khối lượng sản phẩm
```

## 🛠️ Dependencies

```
fastapi>=0.104.0
uvicorn>=0.24.0
pydantic>=2.0.0
```

## 📖 API Documentation

**Swagger UI**: http://localhost:8003/docs  
**ReDoc**: http://localhost:8003/redoc

## 📦 File Structure

```
chemistry-lab/
├── main.py              # Core logic
├── api.py               # FastAPI backend
├── build.py             # Build script
├── manifest.json        # Metadata
├── requirements.txt     # Dependencies
├── start_api.sh         # Startup script
├── README.md            # This file
└── output/
    └── data.json        # Generated data
```

## 🎓 Learning Path

1. **Cơ bản**: Cân bằng PT đơn giản (H2 + O2)
2. **Trung bình**: Tính mol, khối lượng
3. **Nâng cao**: Chất dư/hạn chế, nồng độ

---

**Enjoy chemistry experiments!** 🧪✨



