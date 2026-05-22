/**
 * AeroEdu API client — wrapper undici fetch tới inphysic.com với JWT auth.
 *
 * Env vars:
 *   AEROEDU_API_URL — default https://inphysic.com
 *   AEROEDU_JWT     — JWT của user (teacher/admin) lấy từ DevTools localStorage
 *
 * Lưu ý MVP:
 *   - JWT cứng trong env. Tháng 2 sẽ chuyển sang OAuth device flow.
 *   - Mọi error đều throw ApiError để MCP server format lại cho Claude.
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
  private readonly baseUrl: string;
  private readonly jwt: string | undefined;
  private readonly timeoutMs: number;

  constructor(opts: ApiClientOptions = {}) {
    this.baseUrl = (opts.baseUrl ?? process.env.AEROEDU_API_URL ?? DEFAULT_API_URL).replace(
      /\/+$/,
      "",
    );
    this.jwt = opts.jwt ?? process.env.AEROEDU_JWT;
    this.timeoutMs = opts.timeoutMs ?? 30_000;
  }

  hasAuth(): boolean {
    return !!this.jwt;
  }

  async get<T = unknown>(path: string): Promise<T> {
    return this.send<T>("GET", path);
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
        "AEROEDU_JWT chưa được thiết lập. Vào https://inphysic.com → login → DevTools → localStorage → 'auth_token' → copy giá trị → set vào env AEROEDU_JWT.",
        401,
      );
    }

    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.jwt}`,
      "User-Agent": "aeroedu-mcp/0.1.0",
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
    let parsed: unknown = undefined;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }

    if (statusCode >= 400) {
      throw new ApiError(
        `${method} ${path} → ${statusCode}: ${
          typeof parsed === "object" && parsed !== null && "error" in parsed
            ? (parsed as { error: string }).error
            : text.slice(0, 300)
        }`,
        statusCode,
        parsed,
      );
    }

    return parsed as T;
  }
}
