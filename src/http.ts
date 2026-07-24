/** Serialize a flat query object into a query string.
 *
 * The Yespark API uses dot-notation keys (e.g. `pagination.pageNumber`,
 * `locationBounds.northLatitude`). The generated types already flatten these,
 * so keys are used verbatim. `undefined` and `null` values are skipped.
 */
export function buildQuery(query?: Record<string, unknown> | null): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    params.append(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** Substitute `{param}` placeholders in a path template with encoded values. */
export function buildPath(
  template: string,
  params?: Record<string, string | number> | null,
): string {
  if (!params) return template;
  return template.replace(/\{([^}]+)\}/g, (_match, key: string) => {
    const value = params[key];
    if (value === undefined || value === null) {
      throw new Error(`Missing path parameter "${key}" for "${template}"`);
    }
    return encodeURIComponent(String(value));
  });
}
