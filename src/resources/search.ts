import type { YesparkClient } from "../client.js";
import type { operations } from "../generated/schema.js";
import type { OperationBody, OperationResponse } from "../types.js";

type SearchBody = OperationBody<operations["SearchSpace"]>;
type SearchResult = OperationResponse<operations["SearchSpace"]>;

export class SearchResource {
  constructor(private readonly client: YesparkClient) {}

  /** Search for available parking spaces for a location and date range. */
  space(body: SearchBody, signal?: AbortSignal): Promise<SearchResult> {
    return this.client.request<SearchResult>({
      method: "POST",
      path: "/api/partner/search/space",
      body,
      signal,
    });
  }
}
