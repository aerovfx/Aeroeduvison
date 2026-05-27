#!/usr/bin/env bash
# pack-release.sh — Đóng gói MCP server cho Mac + Win
# Output: releases/aeroedu-mcp-vX.Y.Z-{mac,win}.zip
#
# Mỗi zip chứa:
#   - dist/         (build TypeScript)
#   - node_modules/ (production deps only, không có devDeps)
#   - package.json + README + LICENSE
#   - bin/aeroedu-mcp  (Mac/Linux launcher)
#   - bin/aeroedu-mcp.cmd  (Windows launcher)
#   - INSTALL.md  (hướng dẫn 3 bước)
#
# User cần: Node.js ≥ 18 đã cài sẵn (download từ nodejs.org).
# Không cần git, không cần npm.

set -euo pipefail

cd "$(dirname "$0")/.."  # mcp-server root

VERSION=$(node -p "require('./package.json').version")
OUT_DIR="releases"
NAME="aeroedu-mcp-v${VERSION}"

echo "════════════════════════════════════════════════════════════"
echo "📦 Pack AeroEdu MCP Server v${VERSION}"
echo "════════════════════════════════════════════════════════════"

# Step 1: Clean build
echo "1/5  Clean + build TypeScript..."
rm -rf dist "${OUT_DIR}"
mkdir -p "${OUT_DIR}/staging"
npm run build > /dev/null
echo "  ✓ dist/ built"

# Step 2: Install production deps vào staging (không devDeps)
echo "2/5  Install production deps..."
cp package.json package-lock.json "${OUT_DIR}/staging/"
(cd "${OUT_DIR}/staging" && npm install --omit=dev --no-audit --no-fund --silent)
echo "  ✓ node_modules/ ($(du -sh "${OUT_DIR}/staging/node_modules" | cut -f1))"

# Step 3: Copy dist + assets vào staging
echo "3/5  Assemble release files..."
cp -r dist "${OUT_DIR}/staging/"
cp README.md "${OUT_DIR}/staging/" 2>/dev/null || true

# Wrapper scripts
mkdir -p "${OUT_DIR}/staging/bin"
cat > "${OUT_DIR}/staging/bin/aeroedu-mcp" <<'EOF'
#!/usr/bin/env bash
# AeroEdu MCP launcher (Mac/Linux)
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
exec node "${DIR}/dist/index.js" "$@"
EOF
chmod +x "${OUT_DIR}/staging/bin/aeroedu-mcp"

cat > "${OUT_DIR}/staging/bin/aeroedu-mcp.cmd" <<'EOF'
@echo off
REM AeroEdu MCP launcher (Windows)
set "DIR=%~dp0.."
node "%DIR%\dist\index.js" %*
EOF

# INSTALL.md
cat > "${OUT_DIR}/staging/INSTALL.md" <<EOF
# AeroEdu MCP Server v${VERSION}

## Yêu cầu
- Node.js ≥ 18 (tải https://nodejs.org)
- API Key từ https://inphysic.com/teacher/api-keys

## Cài đặt 3 bước

### Bước 1 — Giải nén
Giải nén file zip ra ổ đĩa (vd \`~/aeroedu-mcp/\` trên Mac, \`C:\\aeroedu-mcp\\\` trên Win).

### Bước 2 — Lấy API Key
Vào https://inphysic.com/teacher/api-keys → Tạo key mới → copy chuỗi \`AERO-...\`.

### Bước 3 — Cấu hình client (Claude Desktop / Cursor / Cherry Studio / Cline)

**Mac/Linux** — thêm vào config:
\`\`\`json
{
  "mcpServers": {
    "aeroedu": {
      "command": "/path/to/aeroedu-mcp/bin/aeroedu-mcp",
      "env": { "AEROEDU_API_KEY": "AERO-your-key-here" }
    }
  }
}
\`\`\`

**Windows** — thêm vào config:
\`\`\`json
{
  "mcpServers": {
    "aeroedu": {
      "command": "C:\\\\path\\\\to\\\\aeroedu-mcp\\\\bin\\\\aeroedu-mcp.cmd",
      "env": { "AEROEDU_API_KEY": "AERO-your-key-here" }
    }
  }
}
\`\`\`

Restart client → 24 MCP tools sẵn sàng.

## Hướng dẫn chi tiết
Xem https://inphysic.com/teacher/api-keys

## Hỗ trợ
- Email: support@inphysic.com
- Discord: https://inphysic.com/community
EOF

echo "  ✓ bin/ wrappers + INSTALL.md"

# Step 4: Create platform zips (cùng content, khác wrapper visibility)
echo "4/5  Create platform zips..."
(cd "${OUT_DIR}/staging" && zip -rq "../${NAME}-mac.zip" . \
  -x "*.DS_Store" "*/.DS_Store")
(cd "${OUT_DIR}/staging" && zip -rq "../${NAME}-win.zip" . \
  -x "*.DS_Store" "*/.DS_Store" "bin/aeroedu-mcp")
echo "  ✓ ${OUT_DIR}/${NAME}-mac.zip ($(du -sh "${OUT_DIR}/${NAME}-mac.zip" | cut -f1))"
echo "  ✓ ${OUT_DIR}/${NAME}-win.zip ($(du -sh "${OUT_DIR}/${NAME}-win.zip" | cut -f1))"

# Step 5: Cleanup staging
echo "5/5  Cleanup staging..."
rm -rf "${OUT_DIR}/staging"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ Release packages ready in ${OUT_DIR}/"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Upload to GCS for public download:"
echo "  gsutil cp ${OUT_DIR}/${NAME}-mac.zip gs://aeroedu-media-extreme-lattice-491123-p2/mcp/"
echo "  gsutil cp ${OUT_DIR}/${NAME}-win.zip gs://aeroedu-media-extreme-lattice-491123-p2/mcp/"
echo "  gsutil acl ch -u AllUsers:R gs://aeroedu-media-extreme-lattice-491123-p2/mcp/*"
echo ""
echo "Public URLs:"
echo "  https://storage.googleapis.com/aeroedu-media-extreme-lattice-491123-p2/mcp/${NAME}-mac.zip"
echo "  https://storage.googleapis.com/aeroedu-media-extreme-lattice-491123-p2/mcp/${NAME}-win.zip"
