import { YesparkClient } from "./client.js";
import type { YesparkClientConfig } from "./config.js";
import { YesparkConfigError } from "./errors.js";

let instance: YesparkClient | undefined;

/**
 * Configure (or reconfigure) the shared singleton client. Call this once during
 * your app's startup, then import {@link getClient} / {@link yespark} anywhere.
 */
export function configure(config: YesparkClientConfig): YesparkClient {
  instance = new YesparkClient(config);
  return instance;
}

/** Get the shared singleton client. Throws if {@link configure} was never called. */
export function getClient(): YesparkClient {
  if (!instance) {
    throw new YesparkConfigError(
      "Yespark SDK is not configured. Call `configure({ ... })` before `getClient()`.",
    );
  }
  return instance;
}

/** Whether the shared singleton has been configured. */
export function isConfigured(): boolean {
  return instance !== undefined;
}

/** Reset the singleton (mainly useful in tests). */
export function reset(): void {
  instance = undefined;
}

/**
 * Ergonomic proxy to the shared singleton. `yespark.members.list()` resolves the
 * configured client at call time, so it can be imported before `configure()` runs
 * (as long as `configure()` has run by the time a property is actually used).
 */
export const yespark: YesparkClient = new Proxy({} as YesparkClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop, client);
    // Bind own methods so `this` stays the real client; resource groups are
    // plain properties that already close over the client, so pass through.
    return typeof value === "function" ? value.bind(client) : value;
  },
});
