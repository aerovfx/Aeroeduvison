# Hầm Khoa Học — Dungeon Học Qua Trò Chơi cho Labtwin

Thiết kế game pixel hành động-giáo dục lấy cảm hứng từ **Swordtail Dungeon (Poki)** và ghép vào danh mục **"Học qua trò chơi"** tại `/dashboard/labtwin/labs`.

Tên đề xuất: **Hầm Khoa Học** (tiếng Anh: *Physics Knight Dungeon*)
Route đề xuất: `/dashboard/labtwin/labs/physics-dungeon`
File: `aeroedu-vite/src/pages/labs/PhysicsDungeon.tsx`

---

## 1. Phân tích Swordtail Dungeon

### 1.1 Cốt lõi gameplay

Swordtail Dungeon là một **action roguelite pixel top-down** với vòng lặp ngắn 3–6 phút/phòng. Những yếu tố tạo nên sức hút của nó:

- **Mỗi phòng là một thử thách đóng kín**: cửa khoá cho đến khi giết sạch quái → buộc người chơi tập trung, không lan man.
- **Combat cảm giác tốt**: tấn công kiếm 2 nhịp (slash trái → slash phải), dash bất tử ngắn (~0.4s), knockback rõ rệt. Mỗi hành động đều có **hit-stop** (đóng băng khung hình 40–80 ms khi chạm) và **screen-shake** khi boss phá giáp.
- **Loot vòng ngắn**: sau mỗi 2–3 phòng có rương → gem/nhẫn/vũ khí. Người chơi liên tục nhận phần thưởng nhỏ.
- **Quái theo kiểu AI đơn giản nhưng đặc sắc**:
  - *Slime*: nhảy về phía người chơi mỗi 1.2s
  - *Skeleton archer*: đứng yên, bắn mỗi 2s
  - *Bat*: bay sin wave, lướt qua người
  - *Shielded knight*: phải đánh vào lưng
- **Boss 3 phase**: boss cuối mỗi tầng đổi pattern ở 66% và 33% HP.
- **Điều khiển một tay trái, một tay phải**: WASD + J/K, học trong 10 giây.
- **Pixel art 16×16** + palette 8 màu/biome + bảng màu warm-dark cho dungeon → ai cũng thấy "đẹp".

### 1.2 Vì sao nó phù hợp để bê vào giáo dục

1. **Vòng phần thưởng ngắn** = não tiết dopamine liên tục → tạo trạng thái **flow**, lý tưởng để lồng kiến thức dưới lớp trò chơi mà không gây mệt.
2. **Phòng đóng** = có thể dùng làm một **microlearning unit** (1 khái niệm → 1 phòng). Học sinh đi qua 8 phòng = xem 8 concept.
3. **Combat kiểu "có điều kiện"** (vũ khí ≠ điểm yếu quái = không chết) cho phép thiết kế enemy kiểu **"hiểu sai khái niệm"**: muốn diệt phải áp đúng kiến thức.
4. **Pixel art nhẹ**: một tileset 16×16 + 4–6 sprite-sheet nhân vật đủ cả game, không tốn asset budget lớn.

---

## 2. Định vị trong Labtwin

Labtwin hiện đã có 6 trò trong "Học qua trò chơi":

| Lab hiện có        | Cơ chế chính                       | Khoảng trống còn lại                         |
|--------------------|------------------------------------|-----------------------------------------------|
| Pixel Agents       | RPG pixel + NPC Q&A phím E        | **Exploration + hội thoại** — thiếu hành động |
| Keo Co App         | Quiz 2 đội kéo co                  | Team-play realtime                            |
| Roll Call Wheel    | Gọi tên ngẫu nhiên                 | Tiện ích lớp học                              |
| Gesture Swarm      | MediaPipe cử chỉ                   | Camera-based                                  |
| Assembly Sim       | Lắp chi tiết kéo-thả               | Puzzle tĩnh                                   |
| (slot 6)           | —                                  | **Action combat đơn-người-chơi** ← chỗ mới   |

**Hầm Khoa Học** lấp đúng khoảng trống còn lại: cùng DNA pixel với Pixel Agents nhưng cảm giác rất khác — hành động, rút kiếm, tránh né, boss fight — để học sinh yêu thích game mobile/web cảm thấy quen thuộc.

---

## 3. Tên, concept, tagline

- **Tên**: Hầm Khoa Học
- **Tagline**: *"Mỗi con quái là một hiểu lầm khoa học. Đánh đúng — học đúng."*
- **Đối tượng**: học sinh 12–17 tuổi, môn Vật Lý — Hoá — Sinh (mở rộng sau).
- **Độ dài 1 run**: 15–25 phút (4 tầng × 6–8 phòng).
- **Độ dài 1 phòng**: 45–90 giây.

### Concept narrative

> Bạn là **Kiếm Sĩ Kiến Thức** lạc vào Hầm Khoa Học — nơi giam giữ những **Quái Hiểu Lầm** (Misconception Monsters). Mỗi con quái là một quan niệm sai trong SGK, và chỉ có thể tiêu diệt bằng cách vung đúng **kiếm nguyên lý** tương ứng. Đánh bại hết = giải phóng tri thức, cứu các **NPC Học Giả** bị nhốt, và nhận **Hạt Tri Thức** để lên cấp.

Narrative này cho phép ghép mọi môn học: môn mới = thêm biome + skin kiếm + quái mới, không phải viết lại engine.

---

## 4. Vòng lặp cốt lõi

```
   Vào phòng
      │
      ▼
   Cửa khoá lại ─────► Đọc "Câu đố phòng" hiển thị ở đỉnh màn hình
      │                (VD: "Quái này bật lại — định luật III Newton. Đánh vào đâu để hết phản lực?")
      ▼
   Chiến đấu ──► Chọn đúng kiếm (1/2/3/4) ──► Chém đúng điểm yếu ──► Quái tan
      │
      ▼
   Thu 1 Hạt Tri Thức  +  Câu tóm tắt kiến thức hiện ra 2 giây
      │
      ▼
   Cửa mở ──► Phòng tiếp theo, rương, hoặc Trạm Học Giả
      │
      ▼
   Mỗi 3 phòng: Trạm Học Giả
      - NPC nhắc lại 3 concept vừa gặp
      - Hỏi 1 câu trắc nghiệm (giống PixelAgents)
      - Trả đúng → +30% HP / mở buff
      - Trả sai → mất 1 HP, concept đó vào "Sổ Sai" để ôn
      │
      ▼
   Cuối tầng: Boss
      - 3 phase, mỗi phase một cơ chế vật lý
      - Phải vừa dodge vừa giải câu hỏi ngắn
```

---

## 5. Cơ chế chiến đấu gắn với kiến thức

### 5.1 Bốn "Kiếm Nguyên Lý" (phím 1-4)

| Phím | Kiếm              | Màu aura | Nguyên lý                      | Hiệu ứng                                   |
|------|-------------------|----------|--------------------------------|--------------------------------------------|
| 1    | Kiếm Quán Tính    | Trắng    | Newton I                       | Đứng yên 0.3s trước đòn → sát thương ×2   |
| 2    | Kiếm Lực          | Đỏ       | Newton II (F=ma)               | Càng charge lâu càng mạnh, có hit-stop    |
| 3    | Kiếm Phản Lực     | Lam      | Newton III                     | Đánh xong bật ngược lại → dùng để dodge   |
| 4    | Kiếm Năng Lượng   | Vàng     | Bảo toàn năng lượng            | Tốn 1 MP, AoE tròn, hồi HP theo dmg gây   |

→ Nâng cấp: mỗi 10 Hạt Tri Thức mở một **runes** (crit+20%, MP max+1, v.v.) — tạo cảm giác tiến triển giữa các run.

### 5.2 Quái và điểm yếu

| Quái                   | Ngoại hình                      | Hành vi                                      | Điểm yếu (đánh bằng kiếm)                |
|------------------------|----------------------------------|----------------------------------------------|--------------------------------------------|
| Slime Quán Tính        | Slime xanh, chỉ lăn thẳng        | Lăn không đổi hướng trừ khi chạm tường      | **Kiếm Lực** (cần F để đổi hướng nó)     |
| Bóng Ma Phản Lực       | Hồn trong suốt, đẩy lùi         | Mỗi đòn bạn đánh nó đẩy bạn lùi 1 ô         | **Kiếm Phản Lực** (tự đẩy ngược lại)     |
| Bướm Năng Lượng        | Nhảy cóc, mất HP chậm           | Di chuyển sin wave, chạm = -1 HP            | **Kiếm Năng Lượng** (AoE tránh né)       |
| Cục Nam Châm           | Hút mũi tên + người chơi       | Kéo bạn lại gần                              | **Kiếm Quán Tính** (đứng yên → miễn hút) |
| Mini-Boss "Tấn Công/Phản Ứng" | 2 khối dính liền         | Đánh 1 bên, bên kia ra đòn ngược            | Phải đánh **đồng thời** — tránh dual swap|

Mỗi lần quái chết, popup nhỏ hiện 1 câu **factoid**:
> *"Newton II: F = m·a. Muốn slime này đổi hướng, cần lực tác dụng."*

Kiến thức gắn liền với khoảnh khắc chiến thắng → nhớ lâu hơn so với đọc SGK.

### 5.3 Phòng puzzle xen kẽ (không combat)

Cứ 3 phòng lại có 1 phòng không có quái, chỉ có **puzzle vật lý**:

- **Phòng Mạch Điện**: 2 bức tường có ampe kế, cửa chỉ mở khi dòng điện qua mạch = 0.5 A. Player có 3 "pin" (1.5V, 3V, 9V) và 4 "điện trở" trong inventory → kéo thả đặt trên bàn để đạt dòng đúng. Khi lắp xong bấm **E** để đo.
- **Phòng Gương & Thấu Kính**: chiếu tia laser từ A đến B, người chơi xoay các gương có sẵn để laser đến đúng cửa.
- **Phòng Cân Bằng**: đòn bẩy có 2 đầu, phải đặt các khối m₁, m₂ ở khoảng cách đúng để cân bằng momen. Sai → sàn sụp → về đầu tầng.
- **Phòng Hoá Học** (tầng 3+): ghép 2 chất để giải phóng khí mở cửa, nhưng nếu sai công thức → phát nổ mất 2 HP.

Puzzle phòng dùng cùng engine lưới 16×16 với combat → tái dùng code input/collision.

---

## 6. Bản đồ & biomes

4 tầng, mỗi tầng 1 chủ đề vật lý + 1 bộ tileset:

```
Tầng 1 – Hang Quán Tính      (Newton I–III)          | đá xám, đuốc cam
Tầng 2 – Động Năng Lượng     (năng lượng, công, CS)  | hang xanh ngọc, nước glow
Tầng 3 – Xưởng Điện Từ       (điện, từ, mạch)        | kim loại, dây cáp, neon
Tầng 4 – Đền Sóng            (quang, sóng, âm)       | lăng kính tím, lasers
```

Mỗi tầng:
- 6–8 phòng combat
- 2 phòng puzzle
- 1 Trạm Học Giả (giữa tầng)
- 1 Boss ở cuối

**Kích thước phòng**: 13×9 tile (vừa khít viewport 208×144 px × scale 3 = ~620×430 px). Map tổng: mảng 2D các phòng nối nhau theo grid 4×4, nhưng người chơi đi tuần tự (Swordtail style).

**Phong cảnh tham khảo Swordtail**:
- Sàn 2 tone tile xen kẽ cho cảm giác chess-board mờ
- Đuốc gắn tường với spritesheet 4 frame
- Tường có viền sáng top 1 px
- Vệt bụi chuyển động khi player chạy
- Ánh sáng vignette đen 4 góc màn hình để dồn attention vào giữa

---

## 7. NPC và học liệu

### Học Giả tại Trạm Học Giả

| NPC              | Môn phụ trách | Câu hỏi mẫu                                   |
|------------------|----------------|------------------------------------------------|
| Sư Phụ Kiến Thức | Vật lý tổng    | "Lực ma sát phụ thuộc vào: a) khối lượng..."  |
| Thợ Rèn Linh Kiện| Điện tử        | "Điện trở 1kΩ, dòng 10mA → U=?"               |
| Nhà Giả Kim      | Hoá            | "H₂SO₄ + NaOH → ?"                            |

Câu hỏi kéo từ **ngân hàng câu hỏi có sẵn** (`/api/exam/questions/physics` — có thể tái sử dụng endpoint của ExamPrep).

### NPC bị cứu

Cuối mỗi tầng giải cứu 1 NPC — họ mở cửa hàng rune cho run sau → recycle narrative tốt.

---

## 8. Điều khiển & UX

| Hành động           | Bàn phím       | Gamepad          |
|---------------------|----------------|-------------------|
| Di chuyển           | WASD / Arrows  | D-pad / left stick |
| Đổi kiếm            | 1 / 2 / 3 / 4  | D-pad 4 hướng     |
| Chém                | J / Space      | A                 |
| Dash                | K / Shift      | B                 |
| Tương tác / E       | E / Enter      | X                 |
| Mở inventory        | Tab            | Y                 |
| Tạm dừng            | P / Esc        | Start             |

Hướng dẫn học trong **30 giây đầu** — sảnh mở game có 4 biển báo pixel khắc chữ: "Di chuyển — WASD", "Chém — J", "Đổi kiếm — 1/2/3/4", "Nói chuyện — E". Giống cách Swordtail dạy bằng tile dưới sàn.

---

## 9. UI & bố cục màn hình

```
┌─────────────────────────────────────────────────────────┐
│ ♥♥♥♥♡       MP ●●○○          💎 14         🕐 03:42     │  <- HUD 32px
├─────────────────────────────────────────────────────────┤
│                                                         │
│                       [GAME]                            │  <- canvas
│                      13×9 tile                          │     208×144×3 = 624×432
│                                                         │
├─────────────────────────────────────────────────────────┤
│  🗡 Kiếm hiện tại: Lực   │   "Đánh slime quán tính      │  <- strip 40px
│  [1][2][3][4]            │    bằng kiếm Lực"             │
└─────────────────────────────────────────────────────────┘
```

- **HUD trên**: HP + MP + gem + timer — pixel font để đồng nhất.
- **Strip dưới**: nhắc kiếm đang dùng + hint theo phòng, đọc là hiểu ngay.
- **Modal Trạm Học Giả**: gọi lại component dialog của PixelAgents (đã có) — không viết lại.
- **Modal Boss**: hiển thị tên + thanh HP dài, background dim 50%.

---

## 10. Tech stack & file structure

Tái dùng pattern của `PixelAgents.tsx` — single file, canvas 2D, không cần thêm dependency.

```
aeroedu-vite/src/pages/labs/PhysicsDungeon.tsx     (~1500-2000 LOC)
  ├─ types: Entity, Room, Enemy, Weapon, Level, Boss
  ├─ data:
  │   WEAPONS[4]              hằng
  │   ENEMIES[10]             template
  │   ROOMS_L1..L4            layout 13×9
  │   FACT_BANK               map enemyId → factoid string
  │   QUESTIONS_BY_FLOOR      (pull thêm từ API nếu có)
  ├─ engine helpers:
  │   tick(state, dt)         physics + AI
  │   resolveCollision(a,b)   AABB
  │   damage(enemy, weapon)   check điểm yếu
  │   drawTile / drawSprite   canvas ops
  ├─ subcomponents React:
  │   <HUD hp mp gem timer weaponId />
  │   <HintStrip text />
  │   <ScholarDialog question onAnswer />
  │   <BossHpBar />
  │   <GameOverModal stats />
  └─ export default PhysicsDungeonPage
```

**Asset**: 1 spritesheet PNG 128×128 (16×16 tile) + 1 spritesheet characters 192×96. Có thể dùng bộ [Ninja Adventure Pack](https://pixel-boy.itch.io/ninja-adventure-asset-pack) (CC0) hoặc đặt hàng artist 400k VND/bộ.

**Âm thanh** (tùy chọn phase 2): 6 SFX 8-bit + 4 BGM (1 cho mỗi tầng) — dùng `howler.js` đã có trong repo.

**Lưu tiến trình**: localStorage key `physicsDungeon.save` — lưu `{highestFloor, totalGems, unlockedRunes}`. Không đụng DB ở MVP.

---

## 11. Tích hợp vào dashboard

### 11.1 Thêm card trong `LabsIndex.tsx`

Category `"Học qua trò chơi"` đang show `count: 6, totalXP: 900`. Tăng lên `count: 7, totalXP: 1100` và thêm vào `preview`:

```tsx
{ name: 'Hầm Khoa Học', duration: '15-25 phút', xp: 200 },
```

### 11.2 Route

Trong `router/index.tsx`:

```tsx
const PhysicsDungeon = lazy(() => import('@/pages/labs/PhysicsDungeon'))
// ...
<Route path="/dashboard/labtwin/labs/physics-dungeon" element={<PhysicsDungeon />} />
```

### 11.3 Ghi learning events

Sau mỗi phòng + sau mỗi boss, gọi `/api/learning/events` (đã có ở `server.cjs`) với payload:

```json
{ "type": "game_progress", "labId": "physics-dungeon",
  "payload": { "floor": 2, "roomId": "r7", "enemyKilled": "slime_inertia",
               "weaponUsed": 2, "timeMs": 54321 } }
```

Sẽ tự xuất hiện trong Course History Timeline — tái dùng stack có sẵn, không phát sinh table mới.

### 11.4 Ghép quiz vào cây kiến thức

Câu hỏi tại Trạm Học Giả gọi API ngân hàng câu hỏi Vật Lý (nếu chưa có thì hard-code 30 câu/môn cho MVP). Người chơi trả sai → concept vào "Sổ Sai" lưu cloud (Prisma `MissedConcept`) → nối sang **ExamPrep** để luyện lại.

---

## 12. Roadmap triển khai

### Phase 1 — MVP 1 tầng (1 tuần dev)
- [ ] Scaffold `PhysicsDungeon.tsx` + route + card Labs
- [ ] Engine: tile render, player movement, collision, 1 kiếm, 2 loại quái
- [ ] 6 phòng layout tầng 1 + cửa khoá
- [ ] Factoid popup
- [ ] Trạm Học Giả 1 câu hỏi
- [ ] Boss đơn giản 1 phase
- [ ] TypeScript verify
- [ ] Playtest nội bộ

### Phase 2 — Full 4 tầng (2 tuần)
- [ ] 4 kiếm đầy đủ + UI đổi kiếm
- [ ] 10 loại quái + 4 boss
- [ ] Puzzle phòng: mạch điện, gương, đòn bẩy, hoá học
- [ ] 3 Trạm Học Giả đầy đủ
- [ ] HUD hoàn chỉnh + SFX
- [ ] Save/load localStorage

### Phase 3 — Polish & tích hợp học liệu (1 tuần)
- [ ] Nối API ngân hàng câu hỏi ExamPrep
- [ ] Sổ Sai (MissedConcept) → DB
- [ ] Leaderboard trong lớp (dùng `/api/learning/events` + aggregate)
- [ ] Unlock rune / cosmetics
- [ ] Tutorial 30 giây đầu
- [ ] i18n (VN/EN)

### Phase 4 — Mở rộng (opt.)
- [ ] Thêm tầng Sinh học, Thiên văn
- [ ] Mode co-op 2 người cùng bàn phím (P1 WASD, P2 IJKL)
- [ ] Editor phòng cho giáo viên đăng custom dungeon

---

## 13. Rủi ro & cách giảm

| Rủi ro                                      | Ảnh hưởng       | Cách giảm                                             |
|---------------------------------------------|------------------|-------------------------------------------------------|
| Bundle JS phình to do pixel asset           | chậm tải Labs    | Lazy-load route, chia spritesheet theo tầng           |
| Canvas 2D lag khi nhiều enemy               | giật frame       | Object pooling + dirty-rect render; cap 30 enemy/room |
| Câu hỏi học lặp giống PixelAgents           | trùng UX         | Gameplay combat là khác biệt chính; dialog chỉ 1 câu/trạm |
| Học sinh chỉ chơi không đọc factoid         | học kém hiệu quả | Bắt buộc đọc 2s + Trạm Học Giả hỏi đúng factoid đó     |
| Quá khó → nghỉ game                         | drop-off         | Mode "Nhà Nghiên Cứu" (easy): HP ×2, factoid hiện trước combat |

---

## 14. Metrics thành công

- **Retention 7 ngày** ≥ 30% (Labtwin baseline ~18%).
- **Avg session** ≥ 12 phút.
- **% người chơi đến tầng 2** ≥ 60% → nếu thấp hơn, tầng 1 quá khó.
- **Accuracy Sổ Sai sau 1 tuần ôn tại ExamPrep** tăng ≥ 15% so với học sinh không chơi (A/B test).

---

## 15. Tham khảo nhanh — mapping với Swordtail

| Swordtail                       | Hầm Khoa Học                                  |
|---------------------------------|------------------------------------------------|
| Kiếm đôi slash                  | 4 kiếm theo nguyên lý, phím 1–4                |
| Dash bất tử                     | **Giữ nguyên** — K/Shift, 0.4s                 |
| Chest loot ngẫu nhiên           | Hạt Tri Thức + rune cố định                    |
| Skeleton archer / bat           | Slime Quán Tính / Cục Nam Châm / Bướm Năng Lượng |
| Cửa khoá tới khi clear phòng    | **Giữ nguyên** — cộng câu đố phòng hiển thị    |
| Boss 3 phase                    | Boss 3 phase + mỗi phase một cơ chế vật lý     |
| Pixel 16×16 palette warm-dark   | **Giữ nguyên** cho tầng 1, đổi palette mỗi tầng|
| Gem → upgrade vũ khí            | Hạt Tri Thức → unlock rune/skin                |
| Không có học liệu               | **Khác biệt chính**: factoid + Trạm Học Giả    |

---

## 16. Kế hoạch tiếp theo

Nếu bạn đồng ý hướng này, bước kế là **scaffold Phase 1**: tôi có thể tạo file `PhysicsDungeon.tsx` với engine tile + 1 kiếm + 1 phòng demo để bạn chạy thử trong ~30 phút. Cho biết khi nào muốn bắt đầu.
