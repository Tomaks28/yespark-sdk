import type { YesparkClient } from "../client.js";
import type { operations } from "../generated/schema.js";
import type {
  OperationBody,
  OperationQuery,
  OperationResponse,
  PathOperation,
} from "../types.js";

type ListQuery = OperationQuery<operations["ReservationsGetReservationsList"]>;
type ListResult = OperationResponse<
  operations["ReservationsGetReservationsList"]
>;
type DetailResult = OperationResponse<
  operations["ReservationsGetReservationDetail"]
>;

// These operations were inlined under `paths` (their operationIds contained
// spaces), so they are referenced positionally.
type ReserveOp = PathOperation<"/api/partner/reservations/reserve", "post">;
type ReserveBody = OperationBody<ReserveOp>;
type ReserveResult = OperationResponse<ReserveOp>;

type CancelOp = PathOperation<
  "/api/partner/reservations/{number}/cancel",
  "patch"
>;
type CancelResult = OperationResponse<CancelOp>;

type CancelInfoOp = PathOperation<
  "/api/partner/reservations/{number}/cancellation-info",
  "get"
>;
type CancelInfoResult = OperationResponse<CancelInfoOp>;

type ExtendOp = PathOperation<
  "/api/partner/reservations/{number}/extend",
  "patch"
>;
type ExtendResult = OperationResponse<ExtendOp>;

type ExtendInfoOp = PathOperation<
  "/api/partner/reservations/{number}/extension-info",
  "get"
>;
type ExtendInfoResult = OperationResponse<ExtendInfoOp>;

export class ReservationsResource {
  constructor(private readonly client: YesparkClient) {}

  /** List reservations with optional filters (paginated). */
  list(query?: ListQuery, signal?: AbortSignal): Promise<ListResult> {
    return this.client.request<ListResult>({
      method: "GET",
      path: "/api/partner/reservations",
      query: query as Record<string, unknown>,
      signal,
    });
  }

  /** Get a single reservation by its number. */
  get(number: string, signal?: AbortSignal): Promise<DetailResult> {
    return this.client.request<DetailResult>({
      method: "GET",
      path: "/api/partner/reservations/{number}",
      pathParams: { number },
      signal,
    });
  }

  /** Create (reserve) a new reservation. */
  reserve(body: ReserveBody, signal?: AbortSignal): Promise<ReserveResult> {
    return this.client.request<ReserveResult>({
      method: "POST",
      path: "/api/partner/reservations/reserve",
      body,
      signal,
    });
  }

  /** Get cancellation information (fees, etc.) for a reservation. */
  cancellationInfo(
    number: string,
    signal?: AbortSignal,
  ): Promise<CancelInfoResult> {
    return this.client.request<CancelInfoResult>({
      method: "GET",
      path: "/api/partner/reservations/{number}/cancellation-info",
      pathParams: { number },
      signal,
    });
  }

  /** Cancel a reservation. */
  cancel(number: string, signal?: AbortSignal): Promise<CancelResult> {
    return this.client.request<CancelResult>({
      method: "PATCH",
      path: "/api/partner/reservations/{number}/cancel",
      pathParams: { number },
      signal,
    });
  }

  /** Get extension information for a reservation and a candidate new end date. */
  extensionInfo(
    number: string,
    newEndDate: string,
    signal?: AbortSignal,
  ): Promise<ExtendInfoResult> {
    return this.client.request<ExtendInfoResult>({
      method: "GET",
      path: "/api/partner/reservations/{number}/extension-info",
      pathParams: { number },
      query: { newEndDate },
      signal,
    });
  }

  /** Extend a reservation to a new end date. */
  extend(
    number: string,
    newEndDate: string,
    signal?: AbortSignal,
  ): Promise<ExtendResult> {
    return this.client.request<ExtendResult>({
      method: "PATCH",
      path: "/api/partner/reservations/{number}/extend",
      pathParams: { number },
      query: { newEndDate },
      signal,
    });
  }
}
