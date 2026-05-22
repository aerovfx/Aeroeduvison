/**
 * AeroEdu API client — undici wrapper với JWT auth + actionable errors.
 *
 * Auth (MVP): JWT từ env var AEROEDU_JWT
 *   Lấy JWT: vào https://inphysic.com → login → DevTools Console:
 *     copy(localStorage.getItem('auth_token'))
 *
 * Auth (Phase 2 — Tháng 4): OAuth 2.1 device flow
 *   Spec backend: POST /api/oauth/device → {device_code, user_code, verification_uri}
 *                 POST /api/oauth/token  → {access_token, refresh_token, expires_in}
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
  timeoutMs?: number;
}

export class AeroEduApiClient {
  readonly baseUrl: string;
  private readonly jwt: string | undefined;
  private readonly timeoutMs: number;

  constructor(opts: ApiClientOptions = {}) {
    this.baseUrl = (
      opts.baseUrl ?? process.env.AEROEDU_API_URL ?? DEFAULT_API_URL
    ).replace(/\/+$/, "");
    this.jwt = opts.jwt ?? process.env.AEROEDU_JWT;
    this.timeoutMs = opts.timeoutMs ?? 30_000;
  }

  hasAuth(): boolean {
    return !!this.jwt;
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
    if (!this.jwt) {
      throw new ApiError(
        [
          "AEROEDU_JWT chưa được thiết lập.",
          "Cách lấy JWT:",
          "  1. Vào https://inphysic.com → đăng nhập tài khoản teacher/admin",
          "  2. Mở DevTools (Cmd+Opt+I) → Console",
          "  3. Chạy: copy(localStorage.getItem('auth_token'))",
          "  4. Paste vào env var AEROEDU_JWT trong claude_desktop_config.json",
          "  5. Restart Claude Desktop",
        ].join("\n"),
        401,
      );
    }

    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.jwt}`,
      "User-Agent": "aeroedu-mcp/0.2.0",
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
