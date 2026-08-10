# AeroEduVision On-Premise Distribution

## Phạm vi hỗ trợ

Bản phân phối này chạy ứng dụng, xác thực local và dữ liệu nghiệp vụ trên hạ
tầng của đơn vị triển khai. Bản production dùng PostgreSQL 16 nội bộ để tương
thích đầy đủ với schema và truy vấn của backend. Dữ liệu database nằm trong
volume `aeroedu_onprem_postgres`; file/upload local nằm trong
`aeroedu_onprem_data`.

`OFFLINE_MODE=true` không biến các API bên thứ ba thành dịch vụ local. Google
OAuth, Telegram, thanh toán cloud và các AI provider cloud sẽ không khả dụng
khi mạng bị ngắt. Đăng nhập email/mật khẩu, dữ liệu local và nội dung tĩnh vẫn
hoạt động.

Hai gap trước đây chỉ có scaffolding chưa nối logic — nay đã hoạt động:

- **Upload file** (video khoá học, PDF, ảnh, truyện thiếu nhi có audio...):
  khi `DEPLOYMENT_MODE != cloud` server tự lưu xuống
  `DATA_DIR/uploads/media` thay vì GCS signed URL (xem `lib/local-storage.cjs`)
  — nằm trong volume `aeroedu_onprem_data` nên được backup/restore cùng dữ
  liệu ứng dụng, không cần cấu hình GCS.
- **AI** (Trợ lý AeroEdu, Gia Sư AI, sinh đề AI, AI chuyển LaTeX↔Word): khi
  `DEEPSEEK_API_KEY`/`ANTHROPIC_API_KEY` không cấu hình hoặc bị `OFFLINE_MODE`
  chặn, server thử gọi Ollama qua `OLLAMA_URL` (xem `lib/ai-provider.cjs`).
  Đặt `OLLAMA_URL` trỏ tới một Ollama server chạy trong mạng nội bộ (không đi
  kèm bản phân phối — đơn vị vận hành tự cài) để có AI hoạt động offline;
  không đặt thì các tính năng AI trả lỗi rõ ràng thay vì treo.

Cả hai vẫn CHƯA thay thế: Google OAuth (chỉ email/mật khẩu offline), thanh
toán cloud, Google TTS đọc truyện (fallback giọng trình duyệt), và các tính
năng cần Anthropic Vision (OCR chấm bài bằng ảnh) — những phần này vẫn cần
Internet hoặc key cloud.

## Yêu cầu máy chủ

- Linux x86_64 hoặc arm64 có Docker Engine 24+, Docker Compose v2 và Node.js 22
  cho deployment/operations CLI. Air-gap installer còn yêu cầu Cosign.
- Tối thiểu 4 CPU, 8 GB RAM, 20 GB ổ đĩa; tăng theo số người dùng và media.
- DNS/TLS reverse proxy do đơn vị vận hành quản lý nếu truy cập ngoài localhost.
- Internet chỉ cần lúc build/pull image. Runtime có thể chạy trong mạng kín.

## Cài đặt

Image chính thức đã nhúng public key kiểm tra license và chỉ được phân phối theo
digest đã ký. Trước khi cài, đơn vị phát hành cấp `license.json` khớp
`INSTALLATION_ID` và (nếu áp dụng) image digest.

```bash
./onprem.sh init
# sửa PUBLIC_URL trong .env.onprem nếu cần
./onprem.sh install
./onprem.sh diagnose
```

Mở `PUBLIC_URL` đã cấu hình. Không commit `.env.onprem`; file này chứa khóa ký
JWT. Container chạy non-root, bỏ Linux capabilities và bật
`no-new-privileges`.

## Vận hành

```bash
./onprem.sh status
./onprem.sh logs
./onprem.sh stop
./onprem.sh start
./onprem.sh upgrade
```

Probe dùng cho load balancer/orchestrator:

- `GET /api/health/live`: process HTTP còn sống.
- `GET /api/health/ready`: database sẵn sàng và capability hiện tại.

## Backup và restore

```bash
./onprem.sh backup
./onprem.sh backup /mnt/backup/aeroedu-20260809.dump

AEROEDU_CONFIRM_RESTORE=yes ./onprem.sh restore /mnt/backup/aeroedu-20260809.dump
```

Mỗi backup gồm `.dump`, `.data.tar.gz` và `.dump.sha256`. Restore từ chối bộ
không đầy đủ hoặc sai checksum, tạo safety backup, dừng ứng dụng và phục hồi cả
database lẫn file/upload. Kiểm tra không phá dữ liệu bằng `./onprem.sh
verify-backup /path/backup.dump`.

## Nâng cấp và rollback

Trước mỗi lần nâng cấp:

1. Tạo backup và kiểm tra archive đọc được.
2. Ghi lại `AEROEDU_VERSION` hoặc image digest hiện tại.
3. Đổi version/image trong `.env.onprem`, chạy `./onprem.sh upgrade`.
4. Chạy `./onprem.sh diagnose` và kiểm tra đăng nhập.

Rollback bằng cách khôi phục version/image cũ. Chỉ restore dữ liệu cũ nếu bản
nâng cấp đã thay đổi dữ liệu không tương thích.

## Khuyến nghị production

- Chỉ bind `127.0.0.1` khi đặt sau Nginx/Traefik; terminate TLS tại reverse proxy.
- Giới hạn quyền đọc `.env.onprem` (`chmod 600 .env.onprem`).
- PostgreSQL trong Compose phù hợp single-host. Khi cần HA, chuyển
  `DATABASE_URL` sang PostgreSQL cluster được quản trị trong mạng nội bộ và đưa
  lifecycle/backup database ra khỏi Compose.
- Thu thập container logs bằng hệ thống logging nội bộ của đơn vị.
- Quét image, pin image digest và ký image trước khi chuyển qua air-gap.

## Connected deployment

Connected production chỉ triển khai bằng `scripts/deploy-verified.sh`. Script
xác minh chữ ký, SBOM/provenance, license, tạo backup và verification receipt,
sau đó kiểm tra image ID đang chạy và readiness. Không gọi trực tiếp
`onprem.sh upgrade` để thay image registry.

## Phân phối air-gap

Tại máy build có Internet:

```bash
npm run onprem:bundle -- VERSION
```

Pipeline CI chính thức tạo archive đã ký Cosign, SBOM/provenance trên registry,
Compose, cấu hình mẫu, CLI, runbook và `SHA256SUMS`. Quy trình cấu hình chi tiết
nằm tại `docs/CI_CD_ONPREM_SETUP.md`.

Chuyển đúng archive theo kiến trúc, file `.bundle`, và Cosign public key được cấp
qua kênh độc lập sang mạng kín. Tại máy đích chỉ chạy installer đã xác minh:

```bash
export COSIGN_PUBLIC_KEY_SHA256="sha256:FINGERPRINT_DO_NHA_PHAT_HANH_CAP"
export GOVERNANCE_PUBLIC_KEY_FILE=/secure/governance.pub
export GOVERNANCE_PUBLIC_KEY_SHA256="sha256:FINGERPRINT_GOVERNANCE_DA_DUYET"
export APPROVED_RELEASE_POLICY_SHA256="sha256:HASH_POLICY_DA_DUYET"
openssl dgst -sha256 /secure/cosign.pub
./install-airgap.sh \
  aeroedu-onprem-VERSION-amd64.tar.gz \
  aeroedu-onprem-VERSION-amd64.bundle \
  /secure/cosign.pub \
  /opt/aeroedu
```

Installer kiểm signature trước extraction, checksum, kiến trúc và image ID của
cả app/PostgreSQL. Sau khi cấu hình `.env.onprem` và đặt `license.json`, chạy
`./onprem.sh install`. Không giải nén hoặc `docker load` archive chưa xác minh.

## Audit và disaster recovery

```bash
./onprem.sh inventory
./onprem.sh audit
```

Mặc định đề xuất RPO 24 giờ, RTO 4 giờ. Cài timer trong `ops/` để backup hàng
ngày và thực hiện restore drill hàng quý trên host cô lập. Chi tiết tại
`docs/PHASE_7_8_DEPLOYMENT_OPERATIONS.md`.

DR drill cô lập và release-governance được mô tả tại
`docs/PHASE_9_10_DR_RELEASE_GOVERNANCE.md`. Không chạy drill bằng volume
production; dùng `scripts/dr-drill.sh` để tạo project/volume tạm và evidence JSON.
