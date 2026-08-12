import {
  resolveConfig,
  type ResolvedConfig,
  type YesparkClientConfig,
} from "./config.js";
import { YesparkApiError, YesparkAuthError } from "./errors.js";
import { buildPath, buildQuery } from "./http.js";
import type { components } from "./generated/schema.js";

import { AuthResource } from "./resources/auth.js";
import { MembersResource } from "./resources/members.js";
import { ParkingsResource } from "./resources/parkings.js";
import { ReservationsResource } from "./resources/reservations.js";
import { OvertimesResource } from "./resources/overtimes.js";
import { AccessesResource } from "./resources/accesses.js";
import { SearchResource } from "./resources/search.js";

type LoginResponseModel = components["schemas"]["LoginResponseModel"];

export interface RequestOptions {
  method: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  /** Path template, e.g. `/api/partner/members/{userId}`. */
  path: string;
  pathParams?: Record<string, string | number>;
  query?: Record<string, unknown>;
  body?: unknown;
  /** Skip attaching the Authorization header (used by the login call itself). */
  skipAuth?: boolean;
  /** Per-request AbortSignal, merged with the configured timeout. */
  signal?: AbortSignal;
}

/**
 * Low-level, fetch-based client for the Yespark Group Partner API.
 *
 * Prefer the typed resource groups (`client.members`, `client.parkings`, ...).
 * `request()` is exposed for advanced/uncovered endpoints.
 */
export class YesparkClient {
  readonly config: ResolvedConfig;

  readonly auth: AuthResource;
  readonly members: MembersResource;
  readonly parkings: ParkingsResource;
  readonly reservations: ReservationsResource;
  readonly overtimes: OvertimesResource;
  readonly accesses: AccessesResource;
  readonly search: SearchResource;

  /** Cached access token (from a static token or a previous login). */
  private accessToken?: string;
  /** Epoch ms at which the cached token expires (best-effort). */
  private tokenExpiresAt?: number;
  /** De-duplicates concurrent logins into a single in-flight request. */
  private loginPromise?: Promise<string>;

  constructor(config: YesparkClientConfig = {}) {
    this.config = resolveConfig(config);
    this.accessToken = this.config.token;

    this.auth = new AuthResource(this);
    this.members = new MembersResource(this);
    this.parkings = new ParkingsResource(this);
    this.reservations = new ReservationsResource(this);
    this.overtimes = new OvertimesResource(this);
    this.accesses = new AccessesResource(this);
    this.search = new SearchResource(this);
  }

  /** Whether the client currently holds a (non-expired) access token. */
  isAuthenticated(): boolean {
    if (!this.accessToken) return false;
    if (this.tokenExpiresAt && Date.now() >= this.tokenExpiresAt) return false;
    return true;
  }

  /** Set the access token manually (e.g. one obtained out-of-band). */
  setAccessToken(token: string, expiresInSeconds?: number): void {
    this.accessToken = token;
    this.tokenExpiresAt =
      expiresInSeconds !== undefined
        ? Date.now() + expiresInSeconds * 1000
        : undefined;
  }

  /** Clear any cached token, forcing a fresh login on the next request. */
  clearAccessToken(): void {
    this.accessToken = undefined;
    this.tokenExpiresAt = undefined;
  }

  /**
   * Ensure a valid access token is available, logging in with configured
   * credentials if necessary. Concurrent calls share a single login request.
   */
  private async ensureToken(): Promise<string> {
    if (this.isAuthenticated()) return this.accessToken as string;

    // Static token that has (no) expiry but was cleared: fall through to login.
    if (!this.config.credentials) {
      if (this.accessToken) return this.accessToken;
      throw new YesparkAuthError(
        "No credentials or token configured. Provide `token` or `credentials`, " +
          "or call `client.setAccessToken()`.",
      );
    }

    if (!this.loginPromise) {
      this.loginPromise = this.performLogin().finally(() => {
        this.loginPromise = undefined;
      });
    }
    return this.loginPromise;
  }

  private async performLogin(): Promise<string> {
    const creds = this.config.credentials;
    if (!creds)
      throw new YesparkAuthError("No credentials configured for login.");

    const data = await this.request<LoginResponseModel>({
      method: "POST",
      path: "/api/partner/auth",
      body: creds,
      skipAuth: true,
    });

    if (!data.accessToken) {
      throw new YesparkAuthError(
        "Login response did not contain an accessToken.",
      );
    }
    this.setAccessToken(data.accessToken, data.expiresIn);
    return data.accessToken;
  }

  /**
   * Perform an HTTP request. Attaches auth (unless `skipAuth`), serializes the
   * JSON body, applies the timeout, parses the response, and — for credential
   * auth — retries once on a 401 after re-authenticating.
   */
  async request<T>(options: RequestOptions): Promise<T> {
    return this.doRequest<T>(options, false);
  }

  private async doRequest<T>(
    options: RequestOptions,
    isRetry: boolean,
  ): Promise<T> {
    const url =
      this.config.baseUrl +
      buildPath(options.path, options.pathParams) +
      buildQuery(options.query);

    const headers: Record<string, string> = {
      Accept: "application/json",
      ...this.config.defaultHeaders,
    };

    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    if (!options.skipAuth) {
      const token = await this.ensureToken();
      headers["Authorization"] = `Bearer ${token}`;
    }

    const timeoutSignal = AbortSignal.timeout(this.config.timeoutMs);
    const signal = options.signal
      ? anySignal([options.signal, timeoutSignal])
      : timeoutSignal;

    let response: Response;
    try {
      response = await this.config.fetch(url, {
        method: options.method,
        headers,
        body:
          options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "TimeoutError") {
        throw new YesparkApiError({
          status: 0,
          statusText: "Request timeout",
          url,
          method: options.method,
          body: {
            message: `Request timed out after ${this.config.timeoutMs}ms`,
          },
        });
      }
      throw err;
    }

    // Transparent re-auth on expired/invalid token (credentials mode only).
    if (
      response.status === 401 &&
      !options.skipAuth &&
      !isRetry &&
      this.config.credentials
    ) {
      this.clearAccessToken();
      return this.doRequest<T>(options, true);
    }

    const payload = await parseBody(response);

    if (!response.ok) {
      throw new YesparkApiError({
        status: response.status,
        statusText: response.statusText,
        url,
        method: options.method,
        body: payload,
      });
    }

    return payload as T;
  }
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

/** Merge multiple AbortSignals into one that aborts when any of them aborts. */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  const onAbort = (signal: AbortSignal) => () =>
    controller.abort(signal.reason);
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      break;
    }
    signal.addEventListener("abort", onAbort(signal), { once: true });
  }
  return controller.signal;
}
