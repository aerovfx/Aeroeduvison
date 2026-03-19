# OpenFang Manual Control Guide

## 💤 Mặc Định: OpenFang TẮT (OFF)

Hệ thống được cấu hình để **tiết kiệm tài nguyên** - OpenFang Agent OS sẽ tắt mặc định và giáo viên chỉ kích hoạt khi cần sử dụng AI thực tế.

---

## 🎯 Thiết Lập Mặc Định

### Cấu Hình
```typescript
// lib/openfang-client.ts
const OPENFANG_MOCK_MODE = true;  // TRUE = Mock mode (OFF)
```

### Hành Vi Mặc Định
- ❌ OpenFang Agent OS: **TẮT**
- 💤 Service: **Không chạy**
- 💾 Tài nguyên: **Tiết kiệm**
- 🤖 AI thực tế: **Chưa kích hoạt**

---

## 🖥️ Giao Diện

### Service Control Panel

```
┌─────────────────────────────────────────────────────────┐
│  ● Offline - Nhấn Start để kích hoạt AI    [Start] [🔄]│
│  OpenFang Agent OS                                      │
├─────────────────────────────────────────────────────────┤
│  ℹ️ OpenFang đang tắt - Nhấn "Start OpenFang" để       │
│     kích hoạt AI thực tế. Service sẽ chạy nền và       │
│     tiêu tốn tài nguyên hệ thống.                      │
└─────────────────────────────────────────────────────────┘
```

### Empty States

#### Khi OpenFang TẮT (Mặc định):
```
┌──────────────────────────────┐
│      💤 OpenFang đang tắt    │
│                              │
│  Service đang tắt để tiết   │
│  kiệm tài nguyên hệ thống.  │
│                              │
│  Nhấn "Start OpenFang" ở    │
│  trên để kích hoạt AI thực  │
│  tế.                        │
└──────────────────────────────┘
```

#### Khi OpenFang BẬT:
```
┌──────────────────────────────┐
│   🤖 AI thực tế đã sẵn sàng! │
│                              │
│  Hỏi trợ giảng AI bất kỳ    │
│  câu hỏi nào về giảng dạy... │
└──────────────────────────────┘
```

---

## 🔧 Cách Sử Dụng

### Bước 1: Truy cập `/teacher/agents`
- Xem panel "OpenFang Agent OS" ở đầu trang
- Trạng thái: **● Offline** (màu xám)
- Nút: **▶ Start OpenFang**

### Bước 2: Kích hoạt AI (khi cần)
1. Nhấn **"▶ Start OpenFang"**
2. Chờ 3-5 giây
3. Trạng thái đổi thành: **● Online - AI thực tế đang chạy** (màu xanh)
4. Bắt đầu chat với AI!

### Bước 3: Tắt AI (khi không dùng)
1. Nhấn **"⏹ Stop OpenFang"**
2. Service dừng an toàn
3. Trạng thái về: **● Offline**
4. Tài nguyên được giải phóng

---

## 💡 Lợi Ích

### ✅ Khi TẮT (Mặc định):

| Lợi Ích | Mô Tả |
|---------|-------|
| **Tiết kiệm CPU** | Không chạy background process |
| **Tiết kiệm RAM** | ~50-100MB RAM được giải phóng |
| **Pin laptop** | Thời lượng pin lâu hơn |
| **Hệ thống nhẹ** | Không ảnh hưởng tác vụ khác |
| **Chủ động** | Giáo viên kiểm soát khi nào dùng |

### ✅ Khi BẬT (Kích hoạt):

| Lợi Ích | Mô Tả |
|---------|-------|
| **AI thực tế** | Câu trả lời thông minh, chi tiết |
| **Tiếng Việt** | Tự nhiên, chính xác |
| **Hữu ích** | Hỗ trợ giảng dạy thực sự |
| **Đa năng** | Soạn bài, đề thi, nhận xét, v.v. |

---

## 📊 So Sánh Trạng Thái

### Trạng thái TẮT (OFF):
```
Status Dot: ● (xám)
Text: "Offline - Nhấn Start để kích hoạt AI"
Button: ▶ Start OpenFang (gradient xanh)
Banner: ℹ️ OpenFang đang tắt...
Empty State: 💤 OpenFang đang tắt
```

### Trạng thái BẬT (ON):
```
Status Dot: ● (xanh, pulse)
Text: "Online - AI thực tế đang chạy"
Button: ⏹ Stop OpenFang (đỏ)
Banner: (không có)
Empty State: 🤖 AI thực tế đã sẵn sàng!
```

---

## 🎨 UI Elements

### Status Indicator
```tsx
<div className={`w-2 h-2 rounded-full ${
  openFangStatus?.running 
    ? 'bg-[hsl(var(--success))]'     // Xanh
    : 'bg-[hsl(var(--muted))]'       // Xám
} ${openFangStatus?.running ? 'animate-pulse' : ''}`} />
```

### Control Buttons
```tsx
// Start Button (khi tắt)
<button className="bg-gradient-to-r from-success to-info">
  <Play className="w-3 h-3" />
  Start OpenFang
</button>

// Stop Button (khi chạy)
<button className="bg-[hsl(var(--destructive)/0.2)] border border-destructive">
  <Square className="w-3 h-3" />
  Stop OpenFang
</button>
```

### Info Banner (chỉ hiển thị khi tắt)
```tsx
{!openFangStatus?.running && (
  <div className="bg-[hsl(var(--info)/0.1)] border border-info text-info">
    <AlertCircle className="w-3 h-3" />
    <strong>OpenFang đang tắt</strong> - Nhấn "Start OpenFang"...
  </div>
)}
```

---

## 🚀 Luồng Sử Dụng

### Giáo viên cần AI:
```
1. Vào /teacher/agents
2. Thấy "● Offline"
3. Nhấn "Start OpenFang"
4. Chờ 3-5 giây
5. Thấy "● Online"
6. Chat với AI ✅
```

### Giáo viên không cần AI:
```
1. Vào /teacher/agents
2. Thấy "● Offline"
3. Không làm gì cả
4. Service vẫn tắt ✅
5. Tài nguyên được tiết kiệm
```

### Sau khi dùng xong:
```
1. Nhấn "Stop OpenFang"
2. Service dừng
3. Trạng thái: "● Offline"
4. Tài nguyên giải phóng ✅
```

---

## 💾 Tài Nguyên Hệ Thống

### Khi TẮT:
```
CPU: 0%
RAM: 0 MB
Network: 0 connections
Disk: 0 I/O
```

### Khi BẬT (Idle):
```
CPU: <1%
RAM: ~50 MB
Network: 1 connection (localhost:4200)
Disk: Minimal
```

### Khi BẬT (Processing):
```
CPU: 10-50%
RAM: ~100-200 MB
Network: Active
Disk: Moderate I/O
```

---

## 🎯 Best Practices

### Nên:
- ✅ Tắt OpenFang khi không dùng
- ✅ Chỉ bật khi cần AI thực tế
- ✅ Dừng sau khi hoàn thành công việc
- ✅ Kiểm tra status trước khi chat

### Không nên:
- ❌ Để chạy 24/7 (lãng phí tài nguyên)
- ❌ Mở nhiều tab chat cùng lúc
- ❌ Gửi nhiều câu hỏi liên tiếp
- ❌ Quên tắt sau khi dùng xong

---

## 🔍 Troubleshooting

### Start không hoạt động:
**Triệu chứng**: Nhấn Start nhưng vẫn Offline

**Giải pháp**:
1. Kiểm tra terminal logs
2. Thử Refresh button
3. Kiểm tra Rust installation
4. Thử start từ terminal:
```bash
cd openfang-core
cargo run --release
```

### Stop không hoạt động:
**Triệu chứng**: Nhấn Stop nhưng vẫn Online

**Giải pháp**:
1. Chờ 5-10 giây
2. Nhấn Refresh button
3. Kill process từ terminal:
```bash
pkill -f openfang
```

### Service tự động tắt:
**Triệu chứng**: Đang Online tự thành Offline

**Nguyên nhân**:
- Process crash
- Hết RAM
- Lỗi Rust runtime

**Giải pháp**:
1. Start lại
2. Check logs
3. Restart nếu cần

---

## 📝 Configuration

### Environment Variables
```bash
# .env.local
OPENFANG_MOCK_MODE=true      # TRUE = TẮT mặc định
OPENFANG_BASE_URL=http://127.0.0.1:4200
OPENFANG_INTERNAL_TOKEN=changeme-internal-token
```

### Code Logic
```typescript
// lib/openfang-client.ts
const OPENFANG_MOCK_MODE = true;  // ← TRUE = OFF

// agents/page.tsx
{!openFangStatus?.running && (
  <InfoBanner>
    OpenFang đang tắt - Nhấn Start...
  </InfoBanner>
)}
```

---

## 🎉 Kết Luận

### Mặc Định: TẮT
- 💤 Service không chạy
- 💾 Tiết kiệm tài nguyên
- 🎯 Giáo viên chủ động kích hoạt

### Khi Cần: BẬT
1. Nhấn "Start OpenFang"
2. Chờ 3-5 giây
3. Chat với AI thực tế
4. Xong thì tắt để tiết kiệm

### Lợi Ích:
- ✅ Tiết kiệm RAM, CPU, pin
- ✅ Chủ động sử dụng
- ✅ Không lãng phí tài nguyên
- ✅ Chỉ chạy khi thực sự cần

---

**Last Updated:** 2026-03-16  
**Version:** 4.0.0 (Manual Control)  
**Status:** ✅ Production Ready - Default OFF
