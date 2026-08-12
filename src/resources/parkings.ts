import type { YesparkClient } from "../client.js";
import type { operations } from "../generated/schema.js";
import type {
  OperationBody,
  OperationQuery,
  OperationResponse,
} from "../types.js";

type ListQuery = OperationQuery<operations["ParkingsGetParkingList"]>;
type ListResult = OperationResponse<operations["ParkingsGetParkingList"]>;
type DetailsResult = OperationResponse<operations["ParkingsGetParkingDetails"]>;
type OpenDoorBody = OperationBody<operations["ParkingsOpenDoor"]>;
type OpenDoorResult = OperationResponse<operations["ParkingsOpenDoor"]>;

export class ParkingsResource {
  constructor(private readonly client: YesparkClient) {}

  /** List parkings within a geographic bounding box (paginated). */
  list(query: ListQuery, signal?: AbortSignal): Promise<ListResult> {
    return this.client.request<ListResult>({
      method: "GET",
      path: "/api/partner/parkings",
      query: query as Record<string, unknown>,
      signal,
    });
  }

  /** Get details of a single parking. */
  get(parkingId: string, signal?: AbortSignal): Promise<DetailsResult> {
    return this.client.request<DetailsResult>({
      method: "GET",
      path: "/api/partner/parkings/{parkingId}",
      pathParams: { parkingId },
      signal,
    });
  }

  /** Open a door/gate of a parking. */
  openDoor(
    parkingId: string,
    body: OpenDoorBody,
    signal?: AbortSignal,
  ): Promise<OpenDoorResult> {
    return this.client.request<OpenDoorResult>({
      method: "POST",
      path: "/api/partner/parkings/{parkingId}/open-door",
      pathParams: { parkingId },
      body,
      signal,
    });
  }
}
