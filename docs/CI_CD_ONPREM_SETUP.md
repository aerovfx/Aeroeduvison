# Thiết lập CI/CD phân phối on-premise

## 1. Tạo khóa

Khóa license và khóa Cosign là hai cặp khóa độc lập. Không dùng chung.

```bash
npm run license:keygen -- --private secrets/license-private.pem --public license-public.pem
cosign generate-key-pair
```

Lưu private key vào secret manager ngoại tuyến. Đưa các giá trị sau vào GitHub:

### Repository secrets

- `LICENSE_PRIVATE_KEY`: nội dung `secrets/license-private.pem`.
- `COSIGN_PRIVATE_KEY`: nội dung `cosign.key`.
- `COSIGN_PASSWORD`: password của khóa Cosign.
- `GOVERNANCE_COSIGN_PRIVATE_KEY` và `GOVERNANCE_COSIGN_PASSWORD`: khóa riêng
  cho environment `release-governance`; không dùng chung khóa release.

### Repository variables

- `LICENSE_PUBLIC_KEY_B64`: `base64 < license-public.pem | tr -d '\n'`.
- `COSIGN_PUBLIC_KEY_B64`: `base64 < cosign.pub | tr -d '\n'`.
- `NODE_IMAGE`: approved Node base image pinned by multi-arch digest.
- `POSTGRES_IMAGE`: approved PostgreSQL image pinned by multi-arch digest.
- `EXPECTED_SOURCE_REPOSITORY`: `owner/repository` accepted by deploy policy.
- `COSIGN_PUBLIC_KEY_SHA256`: fingerprint dạng `sha256:<64 hex>`, cấp cho site
  qua kênh độc lập.
- `LAST_DR_APPROVAL_RUN_ID`: run ID của workflow DR governance đã được ký.
- `GOVERNANCE_PUBLIC_KEY_B64`, `GOVERNANCE_PUBLIC_KEY_SHA256`: trust anchor
  riêng dùng để xác minh DR approval.
- `APPROVED_RELEASE_POLICY_SHA256`: hash của `governance/release-policy.json`,
  phân phối tới site qua kênh quản trị độc lập.
- Khi deploy, nhập `source_sha` đúng commit 40 ký tự đã được phê duyệt cho release.
- Tạo trước package `aeroedu-onprem` trong GHCR với visibility `private`; preflight sẽ từ chối push nếu package chưa tồn tại hoặc không private.

Protect GitHub Environment `license-issuance` bằng required reviewers. Chỉ nhóm
phát hành được chạy workflow cấp license.

## 2. Private registry

Workflow release dùng `GITHUB_TOKEN` với `packages:write` để push vào
`ghcr.io/<owner>/aeroedu-onprem`. Trong package settings, đặt visibility Private
và chỉ cấp read access cho repository/deploy identity cần thiết. Máy on-premise
dùng token chỉ có `read:packages`, không dùng token của developer.

## 3. Quy tắc release

1. Pull request chạy test license, protected bundle và schema gate.
2. Tag dạng `vX.Y.Z` kích hoạt build đa kiến trúc.
3. BuildKit tạo SBOM và provenance.
4. Trivy chặn vulnerability CRITICAL đã có bản sửa.
5. Cosign ký đúng image digest, sau đó push signature vào registry.
6. CI tạo và ký blob bundle air-gap riêng cho amd64 và arm64.
7. CI ký release manifest gắn DR evidence, policy, source commit và image digest.

```bash
git tag v1.0.0
git push origin v1.0.0
```

## 4. Cấp license

Chạy workflow `Issue On-Premise License`, nhập customer ID, installation ID,
seat, feature, thời hạn và tùy chọn image digest. Artifact `license.json` chỉ
được giữ ngắn hạn; chuyển cho khách hàng qua kênh bảo mật.

Cấp thủ công ngoại tuyến:

```bash
node scripts/license-cli.cjs issue \
  --private secrets/license-private.pem \
  --customer school-a \
  --installation school-a-prod-01 \
  --days 365 --seats 500 --features core,ai-local \
  --image-digest sha256:... --out license.json
```

## 5. Deploy connected

Self-hosted runner cần Docker, Compose, Cosign và label `onprem`. Cấu hình
GitHub Environment riêng cho từng khách hàng với read-only registry token,
đường dẫn license/public keys và `INSTALLATION_ID`. Workflow deploy chỉ nhận
image dạng `registry/image@sha256:digest`, xác minh Cosign và license trước khi
gọi upgrade.

## 6. Deploy air-gap

Chuyển archive và `.bundle` phù hợp kiến trúc. `cosign.pub` cùng fingerprint phải
được cấp qua kênh độc lập, không lấy từ cùng release artifact.

```bash
sudo ./install-airgap.sh \
  aeroedu-onprem-v1.0.0-amd64.tar.gz \
  aeroedu-onprem-v1.0.0-amd64.bundle \
  cosign.pub /opt/aeroedu
```

Trước khi chạy installer:

```bash
export COSIGN_PUBLIC_KEY_SHA256=sha256:...
```

Installer xác minh chữ ký blob trước khi giải nén, kiểm tra toàn bộ SHA-256 rồi
mới `docker load`. Sau đó đặt `license.json`, sửa `.env.onprem` và chạy install.
Public key `cosign.pub` phải được cung cấp qua kênh tin cậy độc lập; pipeline cố
ý không đóng gói trust anchor chung với archive và chữ ký.

## Giới hạn bảo vệ source

Minify/bundle và image-only distribution không thể ngăn quản trị viên có root
reverse-engineer tuyệt đối. Cơ chế này bảo vệ chuỗi cung ứng và tăng chi phí sao
chép; license là kiểm soát thương mại có chữ ký, không phải DRM bất khả phá.
