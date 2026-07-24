import type { YesparkClient } from "../client.js";
import type { operations } from "../generated/schema.js";
import type { OperationBody, OperationResponse } from "../types.js";

type LoginBody = OperationBody<operations["AuthLogin"]>;
type LoginResult = OperationResponse<operations["AuthLogin"]>;

export class AuthResource {
  constructor(private readonly client: YesparkClient) {}

  /**
   * Authenticate and obtain an access token. The returned token is cached on
   * the client and used for subsequent requests, so calling this manually is
   * only needed if you configured the client without `credentials`.
   */
  async login(credentials: LoginBody): Promise<LoginResult> {
    const data = await this.client.request<LoginResult>({
      method: "POST",
      path: "/api/partner/auth",
      body: credentials,
      skipAuth: true,
    });
    if (data.accessToken) {
      this.client.setAccessToken(data.accessToken, data.expiresIn);
    }
    return data;
  }
}
