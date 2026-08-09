#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VITE_DIR="$ROOT/aeroedu-vite"
TAURI_DIR="$VITE_DIR/src-tauri"
TARGET="aarch64-apple-darwin"
TARGET_DIR="$TAURI_DIR/target/$TARGET/release/bundle"
INSTALL_APP=false

usage() {
  cat <<'EOF'
Đóng gói AeroEdu Vision cho Apple Silicon macOS.

Cách dùng:
  bash scripts/package-tauri-macos.sh [--install]

Tùy chọn:
  --install  Cài bản .app vừa build vào /Applications (thay bản hiện có).
  -h, --help Hiển thị hướng dẫn này.
EOF
}

for argument in "$@"; do
  case "$argument" in
    --install) INSTALL_APP=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Tùy chọn không hợp lệ: $argument" >&2; usage >&2; exit 2 ;;
  esac
done

[ "$(uname -s)" = "Darwin" ] || { echo "Script chỉ hỗ trợ macOS." >&2; exit 2; }
[ "$(uname -m)" = "arm64" ] || { echo "Cần máy Mac Apple Silicon (arm64)." >&2; exit 2; }

for command in node npm cargo rustc xcrun; do
  command -v "$command" >/dev/null || { echo "Thiếu công cụ bắt buộc: $command" >&2; exit 2; }
done

command -v initdb >/dev/null || {
  echo "Thiếu PostgreSQL 16. Cài bằng: brew install postgresql@16" >&2
  exit 2
}
command -v tectonic >/dev/null || {
  echo "Thiếu Tectonic. Cài bằng: brew install tectonic" >&2
  exit 2
}

[ -x "$VITE_DIR/node_modules/.bin/tauri" ] || {
  echo "Thiếu dependency của frontend. Chạy: npm ci --prefix aeroedu-vite" >&2
  exit 2
}

[ -x "$ROOT/node_modules/.bin/prisma" ] && [ -x "$ROOT/node_modules/.bin/esbuild" ] || {
  echo "Thiếu dependency ở thư mục gốc. Chạy: npm ci" >&2
  exit 2
}

echo "==> Kiểm tra Rust desktop runtime"
cargo check --manifest-path "$TAURI_DIR/Cargo.toml" --target "$TARGET"

echo "==> Xóa artifact release cũ"
if [ -d "$TARGET_DIR" ]; then
  find "$TARGET_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
fi

echo "==> Đóng gói AeroEdu Vision (.app)"
cd "$VITE_DIR"
VITE_API_URL_NATIVE="http://127.0.0.1:43127/api" \
  npm run tauri:build -- --target "$TARGET" --bundles app

APP_PATH="$TARGET_DIR/macos/AeroEdu Vision.app"
[ -d "$APP_PATH" ] || { echo "Không tìm thấy app sau build: $APP_PATH" >&2; exit 1; }
[ "$APP_PATH" -nt "$VITE_DIR/dist/index.html" ] || {
  echo "App bundle cũ hơn frontend vừa build; từ chối cài artifact không đồng bộ." >&2
  exit 1
}

NODE_PATH="$APP_PATH/Contents/MacOS/aeroedu-node"
TECTONIC_PATH="$APP_PATH/Contents/MacOS/tectonic"
BACKEND_PATH="$APP_PATH/Contents/Resources/resources/backend/server.cjs"
[ -x "$NODE_PATH" ] || { echo "App thiếu Node runtime: $NODE_PATH" >&2; exit 1; }
[ -x "$TECTONIC_PATH" ] || { echo "App thiếu Tectonic runtime: $TECTONIC_PATH" >&2; exit 1; }
[ -f "$BACKEND_PATH" ] || { echo "App thiếu backend resource: $BACKEND_PATH" >&2; exit 1; }

APP_ARCH="$(lipo -archs "$APP_PATH/Contents/MacOS/aeroedu-desktop")"
case " $APP_ARCH " in
  *" arm64 "*) ;;
  *) echo "App build sai kiến trúc: $APP_ARCH" >&2; exit 1 ;;
esac

echo "==> Ký và xác minh app bundle"
codesign --force --deep --sign - "$APP_PATH"
codesign --verify --deep --strict "$APP_PATH"

echo "==> Tạo DMG từ app đã ký"
DMG_DIR="$TARGET_DIR/dmg"
DMG_PATH="$DMG_DIR/AeroEdu Vision_1.0.1_aarch64.dmg"
mkdir -p "$DMG_DIR"
hdiutil create -volname "AeroEdu Vision" -srcfolder "$APP_PATH" -ov -format UDZO "$DMG_PATH" >/dev/null
[ -f "$DMG_PATH" ] || { echo "Không tạo được file DMG: $DMG_PATH" >&2; exit 1; }

if [ "$INSTALL_APP" = true ]; then
  echo "==> Cài đặt vào /Applications"
  osascript -e 'tell application "AeroEdu Vision" to quit' 2>/dev/null || true
  sleep 1
  ditto "$APP_PATH" "/Applications/AeroEdu Vision.app"
  xattr -dr com.apple.quarantine "/Applications/AeroEdu Vision.app" 2>/dev/null || true
  BUILT_HASH="$(shasum -a 256 "$APP_PATH/Contents/MacOS/aeroedu-desktop" | awk '{print $1}')"
  INSTALLED_HASH="$(shasum -a 256 "/Applications/AeroEdu Vision.app/Contents/MacOS/aeroedu-desktop" | awk '{print $1}')"
  [ "$BUILT_HASH" = "$INSTALLED_HASH" ] || {
    echo "Checksum app đã cài không khớp bundle vừa build." >&2
    exit 1
  }
fi

echo
echo "Đóng gói thành công:"
echo "  APP: $APP_PATH"
echo "  DMG: $DMG_PATH"
[ "$INSTALL_APP" = true ] && echo "  INSTALLED: /Applications/AeroEdu Vision.app"
