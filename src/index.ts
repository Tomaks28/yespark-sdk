export { YesparkClient } from "./client.js";
export type { RequestOptions } from "./client.js";

export {
  configure,
  getClient,
  isConfigured,
  reset,
  yespark,
} from "./singleton.js";

export {
  YESPARK_BASE_URLS,
  resolveConfig,
} from "./config.js";
export type {
  YesparkClientConfig,
  YesparkCredentials,
  YesparkEnvironment,
  ResolvedConfig,
} from "./config.js";

export {
  YesparkApiError,
  YesparkAuthError,
  YesparkConfigError,
} from "./errors.js";
export type { ErrorResponseModel } from "./errors.js";

// Resource classes (mainly useful for typing).
export { AuthResource } from "./resources/auth.js";
export { MembersResource } from "./resources/members.js";
export { ParkingsResource } from "./resources/parkings.js";
export { ReservationsResource } from "./resources/reservations.js";
export { OvertimesResource } from "./resources/overtimes.js";
export { AccessesResource } from "./resources/accesses.js";
export { SearchResource } from "./resources/search.js";

// All domain types and the raw generated schema helpers.
export type * from "./types.js";
