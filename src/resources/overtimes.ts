import type { YesparkClient } from "../client.js";
import type { operations } from "../generated/schema.js";
import type { OperationQuery, OperationResponse } from "../types.js";

type ListQuery = OperationQuery<operations["OvertimesGetOvertimeList"]>;
type ListResult = OperationResponse<operations["OvertimesGetOvertimeList"]>;
type DetailsResult = OperationResponse<operations["OvertimesGetOvertimeDetails"]>;

export class OvertimesResource {
  constructor(private readonly client: YesparkClient) {}

  /** List overtimes (paginated). */
  list(query?: ListQuery, signal?: AbortSignal): Promise<ListResult> {
    return this.client.request<ListResult>({
      method: "GET",
      path: "/api/partner/overtimes",
      query: query as Record<string, unknown>,
      signal,
    });
  }

  /** Get details of a single overtime. */
  get(overtimeId: string, signal?: AbortSignal): Promise<DetailsResult> {
    return this.client.request<DetailsResult>({
      method: "GET",
      path: "/api/partner/overtimes/{overtimeId}",
      pathParams: { overtimeId },
      signal,
    });
  }
}
