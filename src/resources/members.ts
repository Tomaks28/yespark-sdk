import type { YesparkClient } from "../client.js";
import type { operations } from "../generated/schema.js";
import type { OperationBody, OperationQuery, OperationResponse } from "../types.js";

type ListQuery = OperationQuery<operations["MembersGetMemberList"]>;
type ListResult = OperationResponse<operations["MembersGetMemberList"]>;
type CreateBody = OperationBody<operations["MembersCreateMember"]>;
type CreateResult = OperationResponse<operations["MembersCreateMember"]>;
type GetResult = OperationResponse<operations["MembersGetMember"]>;
type UpdateBody = OperationBody<operations["MembersUpdateMember"]>;
type UpdateResult = OperationResponse<operations["MembersUpdateMember"]>;

export class MembersResource {
  constructor(private readonly client: YesparkClient) {}

  /** List members (paginated). */
  list(query?: ListQuery, signal?: AbortSignal): Promise<ListResult> {
    return this.client.request<ListResult>({
      method: "GET",
      path: "/api/partner/members",
      query: query as Record<string, unknown>,
      signal,
    });
  }

  /** Create a member. */
  create(body: CreateBody, signal?: AbortSignal): Promise<CreateResult> {
    return this.client.request<CreateResult>({
      method: "POST",
      path: "/api/partner/members",
      body,
      signal,
    });
  }

  /** Get a single member by user id. */
  get(userId: string, signal?: AbortSignal): Promise<GetResult> {
    return this.client.request<GetResult>({
      method: "GET",
      path: "/api/partner/members/{userId}",
      pathParams: { userId },
      signal,
    });
  }

  /** Update a member. */
  update(userId: string, body: UpdateBody, signal?: AbortSignal): Promise<UpdateResult> {
    return this.client.request<UpdateResult>({
      method: "PATCH",
      path: "/api/partner/members/{userId}",
      pathParams: { userId },
      body,
      signal,
    });
  }

  /** Delete a member. */
  delete(userId: string, signal?: AbortSignal): Promise<void> {
    return this.client.request<void>({
      method: "DELETE",
      path: "/api/partner/members/{userId}",
      pathParams: { userId },
      signal,
    });
  }
}
