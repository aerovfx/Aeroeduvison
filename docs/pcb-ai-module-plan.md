# Module thiết kế mạch (PCB) có AI hỗ trợ — Kế hoạch

## Mục tiêu
Công cụ thiết kế mạch trong tài khoản giáo viên, từ sơ đồ nguyên lý → (về sau) PCB layout → xuất sản xuất, với **AI sinh/giải thích mạch** dựa trên hạ tầng sẵn có (React/Vite + `_aiComplete` DeepSeek/Anthropic + R3F + Docker).

## Kiến trúc
- **Lưu trữ**: dùng chung bảng `OfficeDoc` (kind=`pcb`, data JSONB = `{components, nets}`), CRUD `/api/office/docs`.
- **AI**: `/api/pcb/ai-generate` → `_aiComplete` (tool-calling nhẹ) trả netlist JSON; FE tự bố trí lưới.
- **FE**: SVG schematic editor (`pcbSymbols` + `PcbEditor`), autosave dùng `useOfficeAutosave`.

## Đã làm (Giai đoạn 1 — MVP)
- Schematic editor: thêm 13 loại linh kiện (R/C/LED/D/Q/SW/BAT/GND/VCC/MCU/IC/SENSOR/HDR), kéo-thả, nối chân (click 2 chân), sửa giá trị/ref, xoá.
- **AI sinh mạch từ mô tả** → netlist (components + nets), kèm cảnh báo kiểm chứng.
- Netlist/BOM panel + xuất netlist JSON + lưu/đọc theo GV.

## Đã làm (Giai đoạn 2 — Layout + Gerber + 3D)
- Footprint MM cho mọi loại linh kiện (`pcbFootprints`); chế độ **Bố trí**: đặt/kéo/xoay linh kiện trên board, đổi kích thước board.
- **Định tuyến tay 2 lớp** (trên/dưới, độ rộng tuỳ chỉnh) + **ratsnest** (đường khí); **DRC tối thiểu** (chân ngoài board, pad chồng, chưa đặt).
- **Xuất Gerber** RS-274X (.gtl/.gbl/.gko) + Excellon (.drl), đóng gói **.zip tự viết** (CRC32 + store, không thêm dep) — đã verify zip hợp lệ.
- **Xem board 3D** (R3F): nền FR4 + pad đồng + thân linh kiện + đường mạch 2 lớp.

## Lộ trình tiếp theo
- **GĐ3**: autorouter (Freerouting backend) + thư viện footprint lớn (KiCad/EasyEDA) + AI giải thích DRC/ERC + sinh BOM mua linh kiện + sinh firmware (đường AI sẵn có).
- **GĐ4**: tích hợp `tscircuit`/`kicad-cli` (Docker) để đạt chuẩn xuất xưởng + đặt JLCPCB; mô phỏng SPICE làm "trọng tài" cho AI.

## Giới hạn / nguyên tắc
- LLM **không đảm bảo đúng điện** → luôn cần DRC/ERC (+ mô phỏng) kiểm chứng; AI chỉ gợi ý.
- Footprint chính xác là phần tốn công nhất → tận dụng thư viện có sẵn, không tự vẽ.
- Autorouting chất lượng cao → dùng Freerouting thay vì tự viết.
