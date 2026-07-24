import type { components } from "./generated/schema.js";

export type ErrorResponseModel = components["schemas"]["ErrorResponseModel"];

/**
 * Thrown when the Yespark API returns a non-2xx response.
 * The parsed error body (when the API returned JSON) is exposed on `.body`.
 */
export class YesparkApiError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly errorCode?: string;
  readonly body?: ErrorResponseModel | unknown;
  readonly url: string;
  readonly method: string;

  constructor(params: {
    status: number;
    statusText: string;
    url: string;
    method: string;
    body?: unknown;
  }) {
    const parsed = params.body as ErrorResponseModel | undefined;
    const message =
      (parsed && typeof parsed === "object" && "message" in parsed && parsed.message) ||
      `Yespark API error ${params.status} ${params.statusText} on ${params.method} ${params.url}`;
    super(String(message));
    this.name = "YesparkApiError";
    this.status = params.status;
    this.statusText = params.statusText;
    this.url = params.url;
    this.method = params.method;
    this.body = params.body;
    this.errorCode =
      parsed && typeof parsed === "object" && "errorCode" in parsed
        ? (parsed.errorCode as string | undefined)
        : undefined;
  }
}

/** Thrown when the client is used without a resolvable authentication strategy. */
export class YesparkAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "YesparkAuthError";
  }
}

/** Thrown when the shared singleton is accessed before {@link configure} is called. */
export class YesparkConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "YesparkConfigError";
  }
}
