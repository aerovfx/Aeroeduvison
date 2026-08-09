# Phase 0–1 — Kiến trúc và runtime on-premise

## Phạm vi

Phase này tạo baseline chạy độc lập trên một máy chủ Linux. Nó chưa bao gồm
promotion qua private registry hay quy trình phát hành license; các thành phần
đó thuộc phase sau dù repository đã có scaffolding chuẩn bị.

## Topology

```text
Client/LAN
    |
    v
Reverse proxy TLS (do đơn vị vận hành)
    |
    v 127.0.0.1:8080
AeroEdu application container
    |-- /var/lib/aeroedu       persistent files/runtime state
    |-- /api/health/live
    |-- /api/health/ready
    |
    v
PostgreSQL 16 container
    |-- aeroedu_onprem_postgres persistent volume
```

Ứng dụng và PostgreSQL giao tiếp trong private Compose network. PostgreSQL
không publish port ra host. HTTP application mặc định chỉ bind loopback; khi cần
truy cập LAN phải đặt reverse proxy TLS hoặc chủ động thay bind address.

## Threat model baseline

### Được bảo vệ

- Không công khai PostgreSQL ra host network.
- Container ứng dụng chạy non-root, drop toàn bộ Linux capabilities và bật
  `no-new-privileges`.
- Secret cấu hình nằm trong `.env.onprem` quyền `0600`.
- Runtime data nằm trong named volumes, tách khỏi image lifecycle.
- Offline mode chặn `fetch` tới public host trừ allowlist rõ ràng.
- Database migrations có advisory lock, version và checksum.

### Không thể bảo vệ tuyệt đối

- Root trên host có thể đọc container, volume, environment và sửa runtime.
- TLS, host firewall, OS patching và Docker daemon security thuộc trách nhiệm
  đơn vị vận hành.
- Tính năng cloud không hoạt động trong mạng kín; local AI chỉ hoạt động khi có
  Ollama endpoint trong LAN.

## Runtime contract

- Node.js 22 application container.
- PostgreSQL 16, single-host topology.
- `DATABASE_URL` do Compose tạo từ credential URL-safe.
- Initial schema sinh từ `prisma/schema.prisma` khi build.
- Các nâng cấp sau dùng SQL bất biến trong `onprem-migrations/`.
- Startup từ chối chạy nếu schema/license/configuration không hợp lệ.
- `ready` chỉ trả thành công khi database và schema sẵn sàng.

## Dữ liệu bền vững

| Dữ liệu | Vị trí | Cơ chế backup |
|---|---|---|
| PostgreSQL | `aeroedu_onprem_postgres` | `pg_dump` custom format |
| Upload/runtime state | `aeroedu_onprem_data` | tar archive riêng |
| Cấu hình/secret | `.env.onprem` trên host | secret backup của đơn vị |
| License | file read-only trên host | kênh cấp phép riêng |

## Lệnh vận hành

```bash
./onprem.sh init
# sửa PUBLIC_URL, INSTALLATION_ID và cài license
./onprem.sh install
./onprem.sh diagnose
./onprem.sh backup
./onprem.sh status
./onprem.sh logs
```

## Ma trận nghiệm thu

| Tiêu chí | Trạng thái | Bằng chứng |
|---|---|---|
| Cấu hình on-prem riêng | Đạt | `.env.onprem.example` |
| Runtime reproducible | Đạt về cấu hình | `Dockerfile.onprem`, Compose |
| PostgreSQL không public port | Đạt | Không có `ports` ở service database |
| Persistent database/files | Đạt | Hai named volumes |
| Non-root/capability hardening | Đạt | Dockerfile và Compose security options |
| Health/live readiness | Đạt về code | `/api/health/live`, `/api/health/ready` |
| Migration serialization/checksum | Đạt | `scripts/onprem-bootstrap.cjs` |
| Backup database + files | Đạt về script | `./onprem.sh backup` |
| Restore transaction + safety backup | Đạt về script | `./onprem.sh restore` |
| Offline outbound baseline | Đạt về Node fetch | `OFFLINE_MODE` + allowlist |
| Docker build/boot test | Chưa chạy tại máy này | Docker CLI không có trong môi trường hiện tại |

## Exit gate trước Phase 2

Trên một Linux VM sạch có Docker, bắt buộc chạy:

1. Build image từ đầu.
2. `onprem.sh install` và chờ `ready`.
3. Đăng ký/đăng nhập local.
4. Restart toàn stack và xác nhận dữ liệu còn nguyên.
5. Chặn outbound Internet và kiểm tra các chức năng core.
6. Backup, xóa môi trường thử nghiệm, restore và đối chiếu dữ liệu.

Chỉ đánh dấu Phase 0–1 hoàn tất production sau khi cả sáu bài test này đạt.
