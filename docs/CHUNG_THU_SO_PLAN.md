# Kế hoạch: Chứng thư số + Ký văn bản qua điện thoại

**Project:** AeroEduVision (inphysic.com) — module Digital Signature
**Phiên bản:** v1.0 (ngày 2026-05-15)
**Phạm vi:** Hybrid PKI — Internal CA mặc định + tuỳ chọn Smart-CA (VNPT/Viettel/FPT)
**Trạng thái:** Plan đã chốt, chờ approve để bước vào Phase 1

---

## 1. Mục tiêu

### Use cases được duyệt
| # | Đối tượng | Văn bản ký | Mức pháp lý |
|---|-----------|------------|-------------|
| 1 | Giáo viên | Bảng điểm, học bạ HS | Internal CA |
| 2 | Hiệu trưởng / Admin | Chứng chỉ HS, giải thưởng | Internal CA + Smart-CA (tuỳ chọn) |
| 3 | Giáo viên | Đề thi, đáp án, biên bản coi thi | Internal CA |
| 4 | Phụ huynh | Đồng ý tham gia, nhận học bạ | Internal CA + OTP |
| 5 | Hiệu trưởng | Học bạ chuẩn BGD&ĐT | Smart-CA bắt buộc |

### KPI
- ✅ Mọi văn bản tạo ra trong hệ thống đều ký số được trong < 3 click + 1 xác thực
- ✅ Verify chữ ký ở mọi máy tính khác (download PDF có embedded signature)
- ✅ Audit log đầy đủ — ai ký, khi nào, từ thiết bị nào, IP nào, sửa gì
- ✅ Mobile UX: bấm 1 nút trên điện thoại → vân tay/FaceID → xong < 5 giây

---

## 2. Kiến trúc tổng quan

### 2.1 PKI Hybrid

```
┌─────────────────────────────────────────────────────────┐
│                   AeroEduVision Root CA                  │
│             (offline, lưu HSM/encrypted vault)           │
└────────────┬───────────────────────────┬────────────────┘
             │                           │
   ┌─────────▼─────────┐       ┌─────────▼─────────┐
   │  Intermediate CA   │       │   Smart-CA Bridge  │
   │  (online, server)  │       │   (Viettel/VNPT)   │
   └─────────┬─────────┘       └─────────┬─────────┘
             │                           │
   ┌─────────▼──────────┐      ┌─────────▼──────────┐
   │ End-user certs:    │      │ Pháp lý certs:     │
   │  • GV (1 năm TTL)  │      │  • Hiệu trưởng     │
   │  • PH (1 năm TTL)  │      │  • Học bạ chính    │
   │  • Admin (2 năm)   │      │    quy BGD&DT      │
   └────────────────────┘      └────────────────────┘
```

### 2.2 Stack kỹ thuật
- **PKI library:** `node-forge` (JS, generate cert + RSA/ECDSA key) hoặc OpenSSL CLI
- **PDF signing:** `node-signpdf` + `pdf-lib` (PAdES B-LT compliant)
- **HTML/JSON signing:** JWS (RFC 7515) cho payload non-PDF
- **Key storage:**
  - Server-side: PostgreSQL `EncryptedPrivateKey` table, AES-256-GCM với KEK từ Cloud KMS
  - Client-side fallback: WebCrypto API + IndexedDB (cho mobile signing không cần round-trip)
- **OTP:** Twilio/Vonage SMS (Vietnam: VNPay SMS hoặc eSMS.vn)
- **Biometric:** WebAuthn API (FaceID/TouchID/Fingerprint trình duyệt mobile)
- **Time-stamp:** TSA của FreeTSA hoặc tự host (RFC 3161)
- **Smart-CA bridge:** REST adapter cho VNPT-CA SDK / Viettel-CA SDK

### 2.3 Document signing flow (server-mediated)

```
[Web/App FE] → POST /api/sign/request {docId, signerId}
                ↓
[Backend]   → Tạo SignRequest{id, ttl=10min}, gửi push notification + SMS OTP
                ↓
[GV mobile] → Mở app, thấy notification → bấm "Ký bảng điểm 12A1"
                ↓
[App FE]    → Hiển thị PDF preview + nút "Ký số"
                ↓
            → User bấm → WebAuthn prompt (FaceID/Fingerprint) hoặc nhập PIN
                ↓
[App FE]    → POST /api/sign/confirm {requestId, biometricToken|pin}
                ↓
[Backend]   → 1. Verify biometric/PIN → unlock private key from EncryptedPrivateKey table
            → 2. Compute hash của PDF
            → 3. Sign hash với private key
            → 4. Embed signature + cert chain vào PDF (PAdES)
            → 5. Apply RFC 3161 timestamp
            → 6. Lưu signed PDF vào GCS
            → 7. Insert SignedDocument record + audit log
            → 8. Trả URL signed PDF cho FE
```

---

## 3. Database schema

### 3.1 Tables mới

```sql
-- Chứng thư số (1 user có thể có nhiều cert: tự ký + Smart-CA)
CREATE TABLE "DigitalCertificate" (
  id              TEXT PRIMARY KEY,         -- nanoid 21
  userId          TEXT NOT NULL REFERENCES "User"(id),
  source          TEXT NOT NULL,            -- 'INTERNAL_CA' | 'VNPT_CA' | 'VIETTEL_CA' | 'FPT_CA'
  serialNumber    TEXT NOT NULL UNIQUE,     -- Cert serial từ CA
  subject         TEXT NOT NULL,            -- "CN=Nguyen Van A, O=THPT XYZ, C=VN"
  issuer          TEXT NOT NULL,            -- "CN=AeroEduVision Root CA, ..."
  publicKeyPem    TEXT NOT NULL,            -- PEM-encoded public key
  certificatePem  TEXT NOT NULL,            -- PEM-encoded X.509 cert
  validFrom       TIMESTAMPTZ NOT NULL,
  validTo         TIMESTAMPTZ NOT NULL,
  revokedAt       TIMESTAMPTZ,              -- NULL = còn hiệu lực
  revokeReason    TEXT,
  createdAt       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cert_validity_chk CHECK (validTo > validFrom)
);
CREATE INDEX idx_cert_user_active ON "DigitalCertificate"(userId, revokedAt) WHERE revokedAt IS NULL;
CREATE INDEX idx_cert_serial ON "DigitalCertificate"(serialNumber);

-- Private key encrypted (chỉ cho Internal CA — Smart-CA có HSM riêng)
CREATE TABLE "EncryptedPrivateKey" (
  id              TEXT PRIMARY KEY,
  certificateId   TEXT NOT NULL REFERENCES "DigitalCertificate"(id) ON DELETE CASCADE,
  encryptedKey    BYTEA NOT NULL,           -- AES-256-GCM ciphertext
  iv              BYTEA NOT NULL,           -- 12 bytes
  authTag         BYTEA NOT NULL,           -- 16 bytes
  kmsKeyId        TEXT NOT NULL,            -- Cloud KMS key ID đã wrap KEK
  createdAt       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Yêu cầu ký (request) — TTL ngắn, multi-step
CREATE TABLE "SignRequest" (
  id              TEXT PRIMARY KEY,
  documentId      TEXT NOT NULL,            -- ID của SignedDocument hoặc ref tới resource khác
  documentType    TEXT NOT NULL,            -- 'GRADEBOOK' | 'CERTIFICATE' | 'EXAM' | 'PARENT_CONSENT' | ...
  documentHash    TEXT NOT NULL,            -- SHA-256 của payload
  signerId        TEXT NOT NULL REFERENCES "User"(id),
  certificateId   TEXT REFERENCES "DigitalCertificate"(id),
  status          TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING|SIGNED|EXPIRED|REJECTED|FAILED
  expiresAt       TIMESTAMPTZ NOT NULL,     -- 10 min from creation
  challenge       TEXT NOT NULL,            -- random nonce client phải sign-back
  otpHash         TEXT,                     -- bcrypt hash của OTP (nếu method=OTP)
  otpAttempts     INT NOT NULL DEFAULT 0,
  signedAt        TIMESTAMPTZ,
  signatureBase64 TEXT,                     -- Raw signature output
  ipAddress       TEXT,
  userAgent       TEXT,
  deviceFingerprint TEXT,
  createdAt       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_signreq_signer ON "SignRequest"(signerId, status);
CREATE INDEX idx_signreq_expire ON "SignRequest"(expiresAt) WHERE status = 'PENDING';

-- Văn bản đã ký (signed document, immutable)
CREATE TABLE "SignedDocument" (
  id              TEXT PRIMARY KEY,
  documentType    TEXT NOT NULL,            -- 'PDF' | 'JSON' | 'XML'
  title           TEXT NOT NULL,
  description     TEXT,
  payloadHash     TEXT NOT NULL,            -- SHA-256 của file gốc
  storageUrl      TEXT NOT NULL,            -- GCS URL của signed file
  mimeType        TEXT NOT NULL,
  sizeBytes       BIGINT NOT NULL,
  -- Refs
  ownerId         TEXT NOT NULL REFERENCES "User"(id),  -- Người tạo văn bản
  classId         TEXT REFERENCES "TeacherClass"(id),
  studentId       TEXT REFERENCES "User"(id),
  examId          TEXT REFERENCES "Exam"(id),
  -- Verification
  verificationCode TEXT NOT NULL UNIQUE,    -- 8-char short code dễ verify (ABCD-1234)
  qrCodeUrl       TEXT,                     -- QR code → /verify/:code
  createdAt       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_signed_doc_owner ON "SignedDocument"(ownerId, createdAt DESC);
CREATE INDEX idx_signed_doc_verify ON "SignedDocument"(verificationCode);

-- Mỗi văn bản có thể có nhiều người ký (multi-sig)
CREATE TABLE "DocumentSignature" (
  id              TEXT PRIMARY KEY,
  documentId      TEXT NOT NULL REFERENCES "SignedDocument"(id) ON DELETE CASCADE,
  signRequestId   TEXT NOT NULL REFERENCES "SignRequest"(id),
  signerId        TEXT NOT NULL REFERENCES "User"(id),
  certificateId   TEXT NOT NULL REFERENCES "DigitalCertificate"(id),
  signatureBytes  BYTEA NOT NULL,           -- Raw signature
  signatureFormat TEXT NOT NULL,            -- 'PADES' | 'JWS' | 'CMS'
  timestampToken  BYTEA,                    -- RFC 3161 TSA token
  signerOrder     INT NOT NULL DEFAULT 1,   -- Thứ tự ký (cho sequential workflow)
  signedAt        TIMESTAMPTZ NOT NULL,
  ipAddress       TEXT,
  metadata        JSONB,                    -- Extra: location, reason, contact info
  CONSTRAINT uniq_doc_signer UNIQUE(documentId, signerId)
);

-- Audit log (immutable, không UPDATE/DELETE)
CREATE TABLE "SignatureAuditLog" (
  id              BIGSERIAL PRIMARY KEY,
  eventType       TEXT NOT NULL,            -- CERT_ISSUED | CERT_REVOKED | SIGN_REQUEST_CREATED |
                                            -- SIGN_REQUEST_OTP_SENT | SIGN_COMPLETED | SIGN_FAILED |
                                            -- DOCUMENT_VERIFIED | KEY_ACCESSED | ...
  actorId         TEXT REFERENCES "User"(id),
  targetId        TEXT,                     -- ID của resource liên quan (cert/request/doc)
  metadata        JSONB,
  ipAddress       TEXT,
  userAgent       TEXT,
  createdAt       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_actor ON "SignatureAuditLog"(actorId, createdAt DESC);
CREATE INDEX idx_audit_target ON "SignatureAuditLog"(targetId);
CREATE INDEX idx_audit_event ON "SignatureAuditLog"(eventType, createdAt DESC);

-- Revocation list (CRL) — tự host
CREATE TABLE "CertificateRevocation" (
  serialNumber    TEXT PRIMARY KEY,
  revokedAt       TIMESTAMPTZ NOT NULL,
  reason          TEXT NOT NULL,            -- 'KEY_COMPROMISE' | 'CESSATION' | 'SUPERSEDED' | ...
  revokedById     TEXT REFERENCES "User"(id)  -- Admin nào revoke
);
```

### 3.2 Cột mới trên existing tables

```sql
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "signaturePin" TEXT;
-- Bcrypt hash của PIN 6-digit user dùng làm fallback khi không có biometric

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "webauthnCredentials" JSONB DEFAULT '[]';
-- Array of WebAuthn credential IDs đã đăng ký
```

---

## 4. Backend API

### 4.1 Certificate management

| Method | Path | Mô tả | Auth |
|--------|------|-------|------|
| `POST` | `/api/certificates/issue` | Tự generate Internal CA cert cho user. Tạo keypair, issue cert TTL 1 năm. | User auth |
| `GET` | `/api/certificates/me` | List active certs của user | User auth |
| `POST` | `/api/certificates/revoke` | Admin revoke cert | Admin |
| `POST` | `/api/certificates/import-smart-ca` | Import cert từ Smart-CA bridge | User auth |
| `GET` | `/api/certificates/verify/:serial` | Public verify endpoint (cho 3rd-party check) | Public |
| `GET` | `/api/crl` | Trả CRL (Certificate Revocation List) | Public |

### 4.2 PIN / Biometric setup

| Method | Path | Mô tả |
|--------|------|-------|
| `POST` | `/api/sign/setup-pin` | Set PIN 6-digit (bcrypt hash) — required trước khi ký lần đầu |
| `POST` | `/api/sign/change-pin` | Đổi PIN (cần old PIN) |
| `POST` | `/api/sign/webauthn/register-begin` | Begin WebAuthn registration |
| `POST` | `/api/sign/webauthn/register-finish` | Hoàn tất registration, lưu credential |
| `DELETE` | `/api/sign/webauthn/:credentialId` | Xoá biometric credential |

### 4.3 Sign request (3-step flow)

| Method | Path | Mô tả |
|--------|------|-------|
| `POST` | `/api/sign/request` | Tạo SignRequest, gửi push notification + SMS OTP. Body: `{documentId|documentBytes, documentType, signMethod: 'OTP'\|'WEBAUTHN'\|'PIN'}`. Return: `{requestId, expiresAt, challenge}` |
| `POST` | `/api/sign/verify-otp` | Verify OTP (nếu method=OTP). Body: `{requestId, otp}` |
| `POST` | `/api/sign/confirm` | Hoàn tất ký. Body: `{requestId, webauthnAssertion\|pin\|otp}`. Backend unlock private key, sign, embed vào PDF, save GCS, return `{signedDocumentId, downloadUrl, verificationCode}` |
| `POST` | `/api/sign/reject` | User từ chối ký |
| `GET` | `/api/sign/pending` | List SignRequest đang chờ user xác nhận |

### 4.4 Document operations

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/api/signed-documents` | List văn bản đã ký của user (filter: type, classId, signerId) |
| `GET` | `/api/signed-documents/:id` | Detail + tất cả signatures |
| `GET` | `/api/signed-documents/:id/download` | Download signed PDF |
| `POST` | `/api/signed-documents/verify` | Body: file upload. Verify signature integrity, return `{valid, signers: [...], timestamps: [...]}` |
| `GET` | `/api/verify/:code` | Public verification page bằng verification code 8-char |

---

## 5. Frontend / Mobile UX

### 5.1 Onboarding (lần đầu setup)

```
[Settings → Chữ ký số]
  ↓
[Wizard 3 bước]
  ├─ Bước 1: Tạo PIN 6-digit (mask, confirm)
  ├─ Bước 2: Đăng ký vân tay/FaceID (WebAuthn) — optional
  └─ Bước 3: Tạo chứng thư Internal CA
       (auto: gen keypair, sign CSR, install cert)
       Hiển thị: "Chứng thư của bạn — Hiệu lực: 15/05/2026 → 15/05/2027"
       Có nút "Nâng cấp Smart-CA" (optional, redirect tới VNPT-CA registration)
```

### 5.2 Ký 1 văn bản từ desktop (GV)

```
[/teacher/gradebook?classId=...]
  ↓
GV nhập điểm xong → bấm "Ký số bảng điểm"
  ↓
[Modal "Ký số"]
  - Preview PDF bảng điểm (read-only, hash hiển thị ở footer)
  - Hiển thị thông tin cert sẽ dùng (CN, expires)
  - Nút lớn: "🔐 Gửi yêu cầu ký lên điện thoại"
  ↓
Backend POST /api/sign/request
  ↓
[Modal đổi sang trạng thái "Đang chờ"]
  - QR code (option để mở app web mobile)
  - Đếm ngược 10:00
  - "Mở app AeroEduVision trên điện thoại để ký"
  ↓
[Đồng thời trên điện thoại GV]
  - Push notification "Yêu cầu ký số: Bảng điểm 12A1"
  - Tap → mở app/web → trang Sign Pending
```

### 5.3 Ký trên điện thoại

```
[/sign/pending hoặc deep-link từ notification]
  ↓
[List Sign Requests]
  - Card mỗi request: title, type icon, người yêu cầu (chính mình hoặc admin),
    countdown, nút "Xem & ký"
  ↓
[Trang Sign Detail]
  - PDF preview (PDF.js hoặc native viewer)
  - Hiển thị metadata: ai tạo, lúc nào, hash SHA-256, document type
  - 3 nút: "Từ chối" / "Xem chi tiết" / "🔏 KÝ NGAY"
  ↓
Bấm KÝ NGAY:
  ┌─ Có WebAuthn → trigger biometric (FaceID/Fingerprint)
  ├─ Có PIN     → modal nhập PIN 6-digit
  └─ OTP method → modal nhập OTP đã nhận qua SMS
  ↓
Sign success:
  - Toast "✅ Đã ký thành công"
  - Auto-close, quay về list
  - Optional: hiển thị verification code "ABCD-1234"
```

### 5.4 Verification page (public)

```
[/verify/:code hoặc upload PDF]
  ↓
[Verification result page]
  ✅ Văn bản hợp lệ
  ─────────────────────
  📄 Bảng điểm 12A1 — Học kỳ 1 / 2026
  
  ✍️ Người ký:
   1. Nguyễn Văn A (Giáo viên) — 15/05/2026 14:32
      Cert: AeroEduVision Internal CA, valid until 15/05/2027
      ✅ Signature valid
      ✅ Cert valid (not revoked)
      ✅ Timestamp valid (FreeTSA, 15/05/2026 14:32:11)
   
   2. Trần Văn B (Hiệu trưởng) — 15/05/2026 16:00
      Cert: VNPT-CA, valid until 12/12/2026
      ✅ Signature valid
      ✅ Cert valid
      ✅ Timestamp valid
  
  📥 [Tải PDF gốc]
```

---

## 6. Security model

### 6.1 Key management
- **Root CA private key:** Generate offline, lưu trong Cloud KMS (managed HSM). Backup encrypted vào Vault. CHỈ dùng để sign Intermediate CA cert. KHÔNG online.
- **Intermediate CA private key:** Encrypted by KMS, backend unlock khi cần issue cert mới. Mỗi action audit log.
- **End-user private keys:** AES-256-GCM với DEK (Data Encryption Key) random per-key. DEK wrap bởi KMS KEK. PIN/biometric đóng vai trò access control, không phải key derivation.
- **Key access:** Chỉ unlock khi có valid SignRequest + biometric/PIN proof. Audit log mọi access.

### 6.2 Threat model

| Threat | Mitigation |
|--------|-----------|
| Backend compromise → leak private keys | Keys encrypted at rest with KMS. Key access requires valid SignRequest. Audit log. |
| User device stolen | PIN/biometric required. SignRequest TTL 10 min. WebAuthn binds to device. |
| OTP intercept | OTP one-time, 5-min TTL, rate limit 3 attempts. Plus device fingerprint check. |
| MITM trong sign flow | TLS 1.3 mandatory. Challenge-response binding (challenge nonce in SignRequest). |
| Tampering with signed PDF | PAdES B-LT format → tamper-evident. Verify always re-checks hash. |
| CA private key compromise | Offline storage. Multi-person ceremony to access. CRL ready. |
| Cert expired/revoked but used | Verify always checks CRL + OCSP-style endpoint. Frontend rejects expired. |
| Mass-sign abuse (1 GV ký 1000 doc/min) | Rate limit per-user (10 sign/min default, admin can lift). |

### 6.3 Compliance
- **Nghị định 130/2018/NĐ-CP** (chữ ký số): Internal CA KHÔNG meet — chỉ Smart-CA mới đủ
- **Thông tư 22/2020/TT-BTTTT** (PAdES): tuân thủ định dạng cho PDF signed
- **GDPR/PII:** Audit log không log private key bytes. PIN không log. OTP chỉ log "sent/verified" event không nội dung.
- **Backup retention:** Signed documents 10 năm minimum (luật giáo dục). Audit log 7 năm.

---

## 7. Phân kỳ (Milestones)

### M1 — Internal CA + Sign cơ bản (4 tuần)
**Goal:** GV ký được bảng điểm bằng app + biometric/PIN, verify được.

- [ ] Week 1: Database schema + migrations (lazy ALTER pattern)
- [ ] Week 1: Internal CA bootstrap script (generate Root + Intermediate)
- [ ] Week 2: Backend `/api/certificates/*` (issue, list, verify, revoke)
- [ ] Week 2: Backend `/api/sign/*` (request, OTP, confirm) + audit log
- [ ] Week 3: PDF signing module (node-signpdf + pdf-lib + PAdES B-LT)
- [ ] Week 3: PIN + WebAuthn setup endpoints
- [ ] Week 4: FE Settings → Chữ ký số (3-step wizard)
- [ ] Week 4: FE `/sign/pending` page (mobile-first)
- [ ] Week 4: FE Modal "Ký số" trong Gradebook
- [ ] Week 4: Public `/verify/:code` page

**Deliverable:** GV vào Gradebook → ký bảng điểm → mobile xác nhận → PDF có signature → tải về Adobe Reader thấy ✅ "Signed by Nguyễn Văn A".

### M2 — Multi-sig + workflow (3 tuần)
**Goal:** Văn bản cần nhiều chữ ký (GV + Hiệu trưởng), workflow tuần tự.

- [ ] Week 5: Backend `DocumentSignature` multi-sig logic, signerOrder
- [ ] Week 5: SignWorkflow engine (sequential / parallel)
- [ ] Week 6: FE workflow UI (drag-drop signers order)
- [ ] Week 6: Notification chain (GV ký xong → ping Hiệu trưởng)
- [ ] Week 7: Chứng chỉ HS — Admin ký chứng chỉ → email tự động
- [ ] Week 7: Email template với QR verification + link verify

**Deliverable:** Hiệu trưởng tạo chứng chỉ HS → assign GVCN ký trước → mình ký sau → auto email cho HS + PH.

### M3 — Smart-CA bridge + Compliance (4 tuần)
**Goal:** Hỗ trợ Smart-CA của VNPT/Viettel cho văn bản pháp lý.

- [ ] Week 8: Hợp đồng VNPT-CA / Viettel-CA (business)
- [ ] Week 8-9: VNPT-CA SDK adapter (REST bridge service trong rust-services/)
- [ ] Week 10: FE chọn cert source khi ký (Internal vs Smart-CA)
- [ ] Week 10: Smart-CA registration flow (GV setup OTP qua app VNPT)
- [ ] Week 11: Học bạ chuẩn BGD&ĐT format + Smart-CA mandatory cho học bạ
- [ ] Week 11: Audit + thẩm định kỹ thuật chuẩn NEAC

**Deliverable:** Hiệu trưởng ký học bạ bằng VNPT-CA app → PDF có pháp lý đầy đủ → tải về dùng được ở Sở GD.

### M4 — Polish + Scale (2 tuần, tuỳ chọn)
- [ ] Bulk sign (ký 1 lúc 30 chứng chỉ)
- [ ] Mobile native app (React Native) thay vì web mobile
- [ ] Hardware security key support (YubiKey)
- [ ] OCSP responder thay CRL polling
- [ ] Advanced PAdES B-LTA (long-term archival)

---

## 8. Tech debts & Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Smart-CA SDK của VN ko document tiếng Anh | Cao | Trung | Tìm partner integration; fallback REST API |
| KMS Cloud chi phí cao khi scale | Trung | Trung | Kết hợp local AES wrapping cho lower-tier |
| WebAuthn ko hỗ trợ trên trình duyệt cũ (Quest VR Browser) | Cao | Thấp | Fallback PIN method luôn available |
| User quên PIN → mất hết signed docs (verify vẫn OK nhưng ko ký mới) | Cao | Trung | Recovery flow qua admin (revoke cert + reissue) |
| Render PDF preview lớn trên mobile lag | Trung | Thấp | Server pre-rasterize first page, full PDF chỉ load on-demand |
| Audit log table phình to | Cao | Thấp | Partition theo tháng, archive sau 1 năm |

---

## 9. Resources cần chuẩn bị

### 9.1 Infrastructure
- [ ] Cloud KMS key (asia-southeast1) — `projects/extreme-lattice-491123-p2/locations/asia-southeast1/keyRings/aeroedu-pki/cryptoKeys/end-user-key-encryption-key`
- [ ] GCS bucket riêng cho signed docs: `aeroedu-signed-docs-asia-southeast1` với versioning + retention 10 năm
- [ ] PostgreSQL: thêm 6 tables mới + 2 ALTER cột User (lazy migration trong server.cjs)
- [ ] SMS provider: eSMS.vn account (giá ~300đ/SMS) hoặc Vonage backup
- [ ] FreeTSA TSA URL whitelisted (https://freetsa.org/tsr)

### 9.2 Business
- [ ] Quyết định: dùng Smart-CA partner nào (so sánh VNPT vs Viettel vs FPT về giá + SDK quality)
- [ ] Privacy policy update: thêm clause về xử lý chứng thư số + biometric
- [ ] T&C update: legal disclaimer cho Internal CA "không có giá trị pháp lý"

### 9.3 Tooling
- [ ] OpenSSL CLI installed trong Cloud Run image (cho fallback ngoài node-forge)
- [ ] Adobe Acrobat Reader DC test machine (để verify PDF signature từ Sở GD)

---

## 10. Cấu trúc code đề xuất

```
aeroedu-vite/src/
├─ pages/
│  ├─ sign/
│  │  ├─ Pending.tsx              # /sign/pending — list SignRequest đang chờ
│  │  ├─ SignDetail.tsx           # /sign/:requestId — detail + biometric
│  │  ├─ Settings.tsx             # /settings/signature — wizard onboard
│  │  └─ Verify.tsx               # /verify/:code — public verify
│  └─ teacher/
│     └─ Gradebook.tsx            # +button "Ký số"
├─ components/
│  └─ signature/
│     ├─ SignRequestCard.tsx
│     ├─ BiometricPrompt.tsx
│     ├─ PinPad.tsx
│     ├─ PdfPreview.tsx
│     ├─ CertificateBadge.tsx
│     └─ VerificationResult.tsx
├─ services/
│  └─ signature.service.ts        # API client cho /api/sign/* và /api/certificates/*
├─ hooks/
│  ├─ useWebAuthn.ts
│  └─ useSignRequest.ts

server.cjs:
├─ Block "DIGITAL SIGNATURE" (~800 dòng):
│  ├─ ensureSignatureTables()     # Lazy migration
│  ├─ Internal CA bootstrap (1 lần)
│  ├─ POST/GET/DELETE /api/certificates/*
│  ├─ POST /api/sign/setup-pin, /webauthn/*
│  ├─ POST /api/sign/request, /verify-otp, /confirm, /reject
│  ├─ GET /api/sign/pending
│  ├─ GET/POST /api/signed-documents/*
│  ├─ GET /api/verify/:code (public)
│  └─ GET /api/crl (public)

rust-services/ (M3):
└─ smart-ca-bridge/                # Mới
   ├─ Cargo.toml
   ├─ src/
   │  ├─ vnpt_adapter.rs
   │  ├─ viettel_adapter.rs
   │  └─ main.rs                   # Axum server :8094
```

---

## 11. Done criteria (definition of "ready to ship")

### M1 ready khi:
- ✅ GV mới đăng ký → setup PIN/biometric → tạo cert thành công
- ✅ GV ký bảng điểm trên desktop → mobile xác nhận → PDF có chữ ký
- ✅ Adobe Acrobat Reader DC verify PDF: "Signed by ... — Signature is valid"
- ✅ Trang `/verify/:code` hiển thị thông tin chính xác
- ✅ Audit log có đủ event: REQUEST_CREATED → OTP_SENT → CONFIRMED → SIGNED
- ✅ Revoke cert → verify chuyển sang ❌
- ✅ Test 100 sign requests/min không crash, latency < 500ms
- ✅ Mobile UI test trên iPhone Safari + Android Chrome + Quest browser

### M2 ready khi:
- ✅ Chứng chỉ HS có 2 chữ ký (GVCN + Hiệu trưởng) verify ✅
- ✅ Email tự động gửi với QR + link verify hoạt động

### M3 ready khi:
- ✅ Học bạ ký bằng VNPT-CA verify thành công ở Adobe + tools của Sở GD
- ✅ Pass audit kỹ thuật của NEAC (nếu apply)

---

## 12. Câu hỏi mở (chờ quyết)

1. **Định dạng văn bản:** Chỉ PDF hay cả Word/Excel? PDF khuyến nghị (PAdES standard).
2. **Multi-tenant:** Mỗi trường có CA riêng hay 1 Root CA chung cho cả AeroEduVision? **Đề xuất: 1 Root chung, mỗi trường 1 Intermediate.**
3. **Recovery:** User mất PIN + ko biometric → revoke + reissue (mất hết quyền ký mới, signed docs cũ vẫn valid). Có chấp nhận?
4. **Pricing model:** Internal CA free hay charge per signed doc? Smart-CA chắc chắn pass-through cost.
5. **Notification provider:** SMS (300đ/cái) vs Zalo OA (free nhưng cần user follow OA trước) vs Push notification (cần register service worker)?

---

**Next step gợi ý:** approve plan → bắt đầu Phase M1 Week 1 (DB schema + Internal CA bootstrap script).
