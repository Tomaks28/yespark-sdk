export const YESPARK_BASE_URLS = {
  production: "https://developers.zenpark.com",
  sandbox: "https://developers-preprod-env.zenpark.com",
} as const;

export type YesparkEnvironment = keyof typeof YESPARK_BASE_URLS;

/** Credentials used to obtain an access token via `POST /api/partner/auth`. */
export interface YesparkCredentials {
  email: string;
  password: string;
}

export interface YesparkClientConfig {
  /**
   * Base URL of the API. Either pass an explicit `baseUrl`, or select an
   * `environment` ("production" | "sandbox"). Defaults to "production".
   */
  baseUrl?: string;
  environment?: YesparkEnvironment;

  /**
   * A static Bearer token provided by Yespark Group. When set, the client uses
   * it directly and never calls the login endpoint.
   */
  token?: string;

  /**
   * Email/password credentials. When set (and no static `token` is provided),
   * the client lazily logs in on the first authenticated request, caches the
   * access token, and transparently re-authenticates on a 401.
   */
  credentials?: YesparkCredentials;

  /** Default request timeout in milliseconds. Defaults to 30000. */
  timeoutMs?: number;

  /**
   * Custom fetch implementation. Defaults to the global `fetch` (Node >= 18).
   * Useful for testing or for injecting an instrumented fetch.
   */
  fetch?: typeof fetch;

  /** Extra headers sent with every request. */
  defaultHeaders?: Record<string, string>;
}

export interface ResolvedConfig {
  baseUrl: string;
  token?: string;
  credentials?: YesparkCredentials;
  timeoutMs: number;
  fetch: typeof fetch;
  defaultHeaders: Record<string, string>;
}

export function resolveConfig(config: YesparkClientConfig): ResolvedConfig {
  const baseUrl =
    config.baseUrl ??
    YESPARK_BASE_URLS[config.environment ?? "production"];

  const fetchImpl = config.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error(
      "No global `fetch` available. Use Node >= 18 or provide a `fetch` in the config.",
    );
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    token: config.token,
    credentials: config.credentials,
    timeoutMs: config.timeoutMs ?? 30_000,
    fetch: fetchImpl,
    defaultHeaders: config.defaultHeaders ?? {},
  };
}
