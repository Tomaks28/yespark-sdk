import type { YesparkClient } from "../client.js";
import type { operations } from "../generated/schema.js";
import type { OperationResponse } from "../types.js";

type ListResult = OperationResponse<operations["AccessesGetAccessesList"]>;

export class AccessesResource {
  constructor(private readonly client: YesparkClient) {}

  /** Get all accesses of a parking. */
  listForParking(parkingId: string, signal?: AbortSignal): Promise<ListResult> {
    return this.client.request<ListResult>({
      method: "GET",
      path: "/api/partner/parkings/{id}/accesses",
      pathParams: { id: parkingId },
      signal,
    });
  }
}
