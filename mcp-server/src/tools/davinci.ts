/**
 * DaVinci Resolve tools (5 tools) — aeroedu_davinci_*
 *
 * Giao tiếp với DaVinci Resolve qua Python bridge (resolve_bridge.py)
 * sử dụng Resolve Python API chính thức của Blackmagic Design.
 *
 * Yêu cầu:
 *   - DaVinci Resolve ĐANG MỞ trên máy trước khi gọi bất kỳ tool nào
 *   - macOS với python3 (≥3.6, 64-bit) — đã confirm Python 3.14 arm64 OK
 *   - fusionscript.so: universal binary (x86_64 + arm64) — đã verify
 *
 * 1. aeroedu_davinci_project_open   — mở hoặc tạo project
 * 2. aeroedu_davinci_clip_import    — import media vào Media Pool
 * 3. aeroedu_davinci_color_apply_lut — áp LUT màu lên timeline
 * 4. aeroedu_davinci_timeline_export — set up render job (MP4/ProRes/...)
 * 5. aeroedu_davinci_render_start   — bắt đầu render queue
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Bridge script: dist/tools/../lib/resolve_bridge.py → dist/lib/resolve_bridge.py
// Fallback to src/lib/ for dev mode (tsx)
const BRIDGE_CANDIDATES = [
  join(__dirname, "..", "lib", "resolve_bridge.py"),
  join(__dirname, "..", "..", "src", "lib", "resolve_bridge.py"),
];

function findBridge(): string {
  for (const p of BRIDGE_CANDIDATES) {
    if (existsSync(p)) return p;
  }
  return BRIDGE_CANDIDATES[0]; // will fail at runtime with clear error
}

/**
 * Gửi 1 command tới resolve_bridge.py và đọc JSON response.
 * Bridge chạy dưới dạng child process với stdio pipe.
 */
async function callBridge(command: Record<string, unknown>, timeoutMs = 60_000): Promise<Record<string, unknown>> {
  const bridgePath = findBridge();
  const env = {
    ...process.env,
    RESOLVE_SCRIPT_API: "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting",
    RESOLVE_SCRIPT_LIB: "/Applications/DaVinci Resolve/DaVinci Resolve.app/Contents/Libraries/Fusion/fusionscript.so",
    PYTHONPATH: "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting/Modules/",
  };

  return new Promise((resolve, reject) => {
    const proc = spawn("python3", [bridgePath], {
      stdio: ["pipe", "pipe", "pipe"],
      env,
    });

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error(`Resolve bridge timeout (${timeoutMs}ms). Resolve có thể bị treo.`));
    }, timeoutMs);

    proc.on("close", (code) => {
      clearTimeout(timer);
      const lastLine = stdout.trim().split("\n").filter(Boolean).at(-1);
      if (!lastLine) {
        const detail = stderr.trim().slice(0, 500);
        reject(new Error(
          `Bridge không trả kết quả (exit ${code}).\n` +
          (detail ? `Python stderr: ${detail}` : "Đảm bảo DaVinci Resolve đang mở."),
        ));
        return;
      }
      try {
        resolve(JSON.parse(lastLine));
      } catch {
        reject(new Error(`Bridge trả output không phải JSON: ${lastLine.slice(0, 200)}`));
      }
    });

    proc.on("error", (e) => {
      clearTimeout(timer);
      reject(new Error(`Không khởi động được bridge: ${e.message}. Kiểm tra python3 trong PATH.`));
    });

    // Gửi command và đóng stdin
    proc.stdin.write(JSON.stringify(command) + "\n");
    proc.stdin.end();
  });
}

function formatBridgeResult(result: Record<string, unknown>): string {
  return JSON.stringify(result, null, 2);
}

function assertOk(result: Record<string, unknown>): void {
  if (!result.ok) {
    throw new Error(String(result.error ?? "DaVinci Resolve trả lỗi không xác định"));
  }
}

export function registerDaVinciTools(server: McpServer) {
  // ─────────────────────────────────────────────────────────────────────────
  // 1. aeroedu_davinci_project_open
  // ─────────────────────────────────────────────────────────────────────────
  server.registerTool(
    "aeroedu_davinci_project_open",
    {
      description:
        "Mở hoặc tạo project trong DaVinci Resolve. " +
        "DaVinci Resolve phải đang chạy trên máy. " +
        "Sau khi mở project có thể dùng aeroedu_davinci_clip_import để import video.",
      inputSchema: z.object({
        project_name: z.string().min(1).max(200).describe("Tên project trong Resolve"),
        create_if_missing: z
          .boolean()
          .optional()
          .default(false)
          .describe("Tạo project mới nếu chưa tồn tại (true) hay chỉ mở (false)"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ project_name, create_if_missing }) => {
      let result = await callBridge({ action: "project_open", name: project_name });

      if (!result.ok && create_if_missing) {
        // Project không tồn tại → tạo mới
        result = await callBridge({ action: "project_create", name: project_name });
      }

      assertOk(result);

      const text = formatBridgeResult({
        ...result,
        next_step: "Dùng aeroedu_davinci_clip_import để import video vào Media Pool",
      });

      return {
        content: [{ type: "text", text }],
        structuredContent: result,
      };
    },
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 2. aeroedu_davinci_clip_import
  // ─────────────────────────────────────────────────────────────────────────
  server.registerTool(
    "aeroedu_davinci_clip_import",
    {
      description:
        "Import file video/audio vào Media Pool của DaVinci Resolve. " +
        "File phải là đường dẫn tuyệt đối trên máy (local file). " +
        "Clip được import vào bin 'MCP Import' (tự tạo nếu chưa có).",
      inputSchema: z.object({
        file_path: z
          .string()
          .min(1)
          .describe(
            "Đường dẫn tuyệt đối đến file video/audio. " +
            "Hỗ trợ: .mp4, .mov, .mxf, .avi, .mp3, .wav, .aiff và các format Resolve hỗ trợ. " +
            "Ví dụ: /Users/pixidev/Movies/bai-giang.mp4",
          ),
        bin_name: z
          .string()
          .optional()
          .default("MCP Import")
          .describe("Tên bin (thư mục) trong Media Pool. Mặc định: 'MCP Import'"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ file_path, bin_name }) => {
      const result = await callBridge({
        action: "clip_import",
        file_path,
        bin_name: bin_name ?? "MCP Import",
      });
      assertOk(result);
      return {
        content: [{ type: "text", text: formatBridgeResult(result) }],
        structuredContent: result,
      };
    },
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 3. aeroedu_davinci_color_apply_lut
  // ─────────────────────────────────────────────────────────────────────────
  server.registerTool(
    "aeroedu_davinci_color_apply_lut",
    {
      description:
        "Áp dụng LUT (Look-Up Table) màu lên tất cả clip trong timeline của Resolve. " +
        "LUT được apply vào node chỉ định trên Color page. " +
        "Resolve chuyển sang Color page tự động. " +
        "File LUT: .cube, .3dl, .dat, .m hoặc các format Resolve hỗ trợ.",
      inputSchema: z.object({
        lut_path: z
          .string()
          .min(1)
          .describe(
            "Đường dẫn tuyệt đối đến file LUT. " +
            "Ví dụ: /Users/pixidev/LUTs/warm-classroom.cube",
          ),
        timeline_name: z
          .string()
          .optional()
          .describe("Tên timeline cụ thể. Bỏ trống = dùng timeline hiện tại"),
        node_index: z
          .number()
          .int()
          .min(1)
          .optional()
          .default(1)
          .describe("Node index trên Color page (1-based). Mặc định: node 1"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ lut_path, timeline_name, node_index }) => {
      const result = await callBridge({
        action: "color_apply_lut",
        lut_path,
        timeline_name: timeline_name ?? null,
        node_index: node_index ?? 1,
      });
      assertOk(result);
      return {
        content: [{ type: "text", text: formatBridgeResult(result) }],
        structuredContent: result,
      };
    },
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 4. aeroedu_davinci_timeline_export
  // ─────────────────────────────────────────────────────────────────────────
  server.registerTool(
    "aeroedu_davinci_timeline_export",
    {
      description:
        "Thiết lập render job trong Resolve Deliver page. " +
        "Hỗ trợ format: mp4 (H264/H265), mov (ProRes), prores, dnxhd. " +
        "Sau khi gọi tool này, dùng aeroedu_davinci_render_start để bắt đầu render.",
      inputSchema: z.object({
        output_path: z
          .string()
          .min(1)
          .describe(
            "Đường dẫn đầy đủ file output. " +
            "Ví dụ: /Users/pixidev/Movies/output/bai-giang-final.mp4",
          ),
        format: z
          .enum(["mp4", "mov", "prores", "h264", "h265", "dnxhd"])
          .optional()
          .default("mp4")
          .describe("Format xuất: mp4 (H264), mov/prores (ProRes422HQ), h265, dnxhd"),
        codec: z
          .string()
          .optional()
          .describe("Override codec (tuỳ chọn). Ví dụ: H265, ProRes4444, DNxHR HQX"),
        timeline_name: z
          .string()
          .optional()
          .describe("Tên timeline. Bỏ trống = timeline hiện tại"),
        preset: z
          .string()
          .optional()
          .describe("Tên Render Preset đã lưu trong Resolve (nếu có)"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ output_path, format, codec, timeline_name, preset }) => {
      const result = await callBridge({
        action: "timeline_export",
        output_path,
        format: format ?? "mp4",
        codec: codec ?? null,
        timeline_name: timeline_name ?? null,
        preset: preset ?? null,
      }, 30_000);
      assertOk(result);
      return {
        content: [{ type: "text", text: formatBridgeResult(result) }],
        structuredContent: result,
      };
    },
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 5. aeroedu_davinci_render_start
  // ─────────────────────────────────────────────────────────────────────────
  server.registerTool(
    "aeroedu_davinci_render_start",
    {
      description:
        "Bắt đầu render queue trong DaVinci Resolve. " +
        "Nếu wait=true (mặc định), tool sẽ đợi đến khi render xong và báo kết quả. " +
        "Nếu wait=false, trả về ngay và render tiếp tục nền trong Resolve. " +
        "Dùng aeroedu_davinci_timeline_export trước để set up render job.",
      inputSchema: z.object({
        wait: z
          .boolean()
          .optional()
          .default(true)
          .describe("Đợi render xong mới return (true) hay return ngay (false). Mặc định: true"),
        timeout_seconds: z
          .number()
          .int()
          .min(30)
          .max(7200)
          .optional()
          .default(600)
          .describe("Timeout tối đa (giây) khi wait=true. Mặc định: 600s (10 phút)"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ wait, timeout_seconds }) => {
      const effectiveTimeout = ((timeout_seconds ?? 600) + 30) * 1000; // thêm 30s buffer
      const result = await callBridge(
        { action: "render_start", wait: wait ?? true, timeout_seconds: timeout_seconds ?? 600 },
        effectiveTimeout,
      );
      assertOk(result);
      return {
        content: [{ type: "text", text: formatBridgeResult(result) }],
        structuredContent: result,
      };
    },
  );
}
