/**
 * AeroEdu API client — undici wrapper với JWT/API-key auth + actionable errors.
 *
 * Auth Option A (API Key — khuyến nghị):
 *   env AEROEDU_API_KEY=AERO-xxxx
 *   Lấy key: vào https://inphysic.com/teacher/api-keys → Tạo API Key mới
 *
 * Auth Option B (JWT — legacy):
 *   env AEROEDU_JWT=eyJhbGc...
 *   Lấy JWT: login inphysic.com → DevTools Console:
 *     copy(localStorage.getItem('auth_token'))
 *
 * API key được validated qua POST /api/auth/validate-key → JWT issued per-request.
 */

import { request } from "undici";

const DEFAULT_API_URL = "https://inphysic.com";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiClientOptions {
  baseUrl?: string;
  jwt?: string;
  apiKey?: string;
  timeoutMs?: number;
}

export class AeroEduApiClient {
  readonly baseUrl: string;
  private jwt: string | undefined;
  private readonly apiKey: string | undefined;
  private readonly timeoutMs: number;

  constructor(opts: ApiClientOptions = {}) {
    this.baseUrl = (
      opts.baseUrl ?? process.env.AEROEDU_API_URL ?? DEFAULT_API_URL
    ).replace(/\/+$/, "");
    this.apiKey = opts.apiKey ?? process.env.AEROEDU_API_KEY;
    this.jwt = opts.jwt ?? process.env.AEROEDU_JWT;
    this.timeoutMs = opts.timeoutMs ?? 30_000;
  }

  hasAuth(): boolean {
    return !!(this.jwt || this.apiKey);
  }

  /** Resolve API key → JWT (cached per instance) */
  private async resolveToken(): Promise<string> {
    if (this.jwt) return this.jwt;
    if (!this.apiKey) throw new ApiError(
      [
        "Chưa cấu hình auth. Chọn một trong hai cách:",
        "",
        "Cách A — API Key (khuyến nghị):",
        "  1. Vào https://inphysic.com/teacher/api-keys",
        "  2. Nhấn 'Tạo API Key mới' → copy key (AERO-xxxx)",
        "  3. Thêm vào claude_desktop_config.json:",
        '     "env": { "AEROEDU_API_KEY": "AERO-xxxx" }',
        "",
        "Cách B — JWT (legacy):",
        "  1. Vào https://inphysic.com → đăng nhập",
        "  2. DevTools → Console: copy(localStorage.getItem('auth_token'))",
        '  3. "env": { "AEROEDU_JWT": "eyJhbGc..." }',
      ].join("\n"),
      401,
    );

    // Exchange API key → JWT. Server mint JWT signed bằng JWT_SECRET,
    // có claims { sub, userId, role, email, src:'api-key', keyId }.
    // Cache JWT trong this.jwt → các request sau dùng JWT làm Bearer
    // (vì _akVerify() server-side chỉ accept JWT, KHÔNG accept raw AERO-xxx).
    const url = `${this.baseUrl}/api/auth/validate-key`;
    const { statusCode, body } = await request(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "aeroedu-mcp/0.4.0" },
      body: JSON.stringify({ key: this.apiKey }),
      bodyTimeout: 10_000,
      headersTimeout: 10_000,
    });
    const text = await body.text();
    if (statusCode !== 200) {
      throw new ApiError(
        `API key không hợp lệ hoặc đã bị thu hồi.\n` +
        `→ Tạo key mới: https://inphysic.com/teacher/api-keys\n` +
        `→ Update env AEROEDU_API_KEY trong claude_desktop_config.json`,
        statusCode,
      );
    }
    const data = JSON.parse(text) as { ok: boolean; jwt?: string; userId?: string };
    if (!data.ok || !data.jwt) {
      throw new ApiError(
        "Server xác thực key thành công nhưng không trả JWT. " +
        "Có thể server đã cũ — admin cần redeploy phiên bản mới.",
        500,
      );
    }
    this.jwt = data.jwt;  // cache JWT cho mọi request sau (90 ngày TTL)
    return data.jwt;
  }

  async get<T = unknown>(path: string, query?: Record<string, string | number | boolean>): Promise<T> {
    let url = path;
    if (query) {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(query).map(([k, v]) => [k, String(v)])),
      ).toString();
      if (qs) url = `${path}?${qs}`;
    }
    return this.send<T>("GET", url);
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.send<T>("POST", path, body);
  }

  async patch<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.send<T>("PATCH", path, body);
  }

  async del<T = unknown>(path: string): Promise<T> {
    return this.send<T>("DELETE", path);
  }

  private async send<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = await this.resolveToken();

    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "User-Agent": "aeroedu-mcp/0.4.0",
      Accept: "application/json",
    };

    let payload: string | undefined;
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }

    const { statusCode, body: respBody } = await request(url, {
      method: method as "GET" | "POST" | "PATCH" | "DELETE",
      headers,
      body: payload,
      bodyTimeout: this.timeoutMs,
      headersTimeout: this.timeoutMs,
    });

    const text = await respBody.text();
    let parsed: unknown;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }

    if (statusCode >= 400) {
      const msg =
        typeof parsed === "object" &&
        parsed !== null &&
        "error" in parsed
          ? (parsed as { error: string }).error
          : text.slice(0, 300);

      const hint =
        statusCode === 401
          ? "\nGợi ý: JWT có thể hết hạn — login lại và copy token mới."
          : statusCode === 403
            ? "\nGợi ý: Tài khoản không đủ quyền (cần teacher hoặc admin)."
            : statusCode === 404
              ? "\nGợi ý: Resource không tồn tại — kiểm tra lại ID."
              : "";

      throw new ApiError(`[${statusCode}] ${method} ${path}: ${msg}${hint}`, statusCode, parsed);
    }

    return parsed as T;
  }
}
