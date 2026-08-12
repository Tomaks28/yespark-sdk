import type { components, operations, paths } from "./generated/schema.js";

/** All named schemas from the OpenAPI spec, e.g. `Schemas["ParkingDetailResponseModel"]`. */
export type Schemas = components["schemas"];

/** Reference an operation that was inlined under `paths` (no named operationId). */
export type PathOperation<
  P extends keyof paths,
  M extends keyof paths[P],
> = paths[P][M];

// ---------------------------------------------------------------------------
// Operation helper types — extract request/response shapes from `operations`.
// ---------------------------------------------------------------------------

/** JSON request body of an operation (`never` if the operation has no body). */
export type OperationBody<O> = O extends {
  requestBody: { content: { "application/json": infer B } };
}
  ? B
  : never;

/** Query parameters of an operation (`never` if it has none). */
export type OperationQuery<O> = O extends { parameters: { query?: infer Q } }
  ? NonNullable<Q>
  : never;

/** Path parameters of an operation (`never` if it has none). */
export type OperationPath<O> = O extends { parameters: { path: infer P } }
  ? P
  : never;

/** The `2xx` JSON response body of an operation. */
export type OperationResponse<O> = O extends { responses: infer R }
  ? R extends { 200: { content: { "application/json": infer D } } }
    ? D
    : R extends { 201: { content: { "application/json": infer D } } }
      ? D
      : never
  : never;

// ---------------------------------------------------------------------------
// Convenience re-exports of the most-used domain models.
// ---------------------------------------------------------------------------

export type LoginRequestModel = Schemas["LoginRequestModel"];
export type LoginResponseModel = Schemas["LoginResponseModel"];

export type MemberDetailsResponseModel = Schemas["MemberDetailsResponseModel"];
export type MemberCreateRequestModel = Schemas["MemberCreateRequestModel"];
export type MemberModifyRequestModel = Schemas["MemberModifyRequestModel"];

export type ParkingPositionResponseModel =
  Schemas["ParkingPositionResponseModel"];
export type ParkingDetailResponseModel = Schemas["ParkingDetailResponseModel"];

export type ReservationResponseModel = Schemas["ReservationResponseModel"];
export type ReservationRequestModel = Schemas["ReservationRequestModel"];
export type ReservationSearchResultModel =
  Schemas["ReservationSearchResultModel"];

export type SearchSpaceRequestModel = Schemas["SearchSpaceRequestModel"];
export type SearchSpaceResponseModel = Schemas["SearchSpaceResponseModel"];

export type OvertimeResponseModel = Schemas["OvertimeResponseModel"];
export type AccessResponseModel = Schemas["AccessResponseModel"];

export type { operations, components, paths };
