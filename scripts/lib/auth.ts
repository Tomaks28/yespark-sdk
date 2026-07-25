import { select, input, password } from "@inquirer/prompts";
import { YesparkClient } from "../../src/index.js";

export interface GlobalAuthConfig {
  environment: "sandbox" | "production";
  token: string;
  email: string;
  password: string;
}

export const globalConfig: GlobalAuthConfig = {
  environment: (process.env.YESPARK_ENV as "sandbox" | "production") || "sandbox",
  token: process.env.YESPARK_TOKEN || "",
  email: process.env.YESPARK_EMAIL || "",
  password: process.env.YESPARK_PASSWORD || "",
};

let clientInstance: YesparkClient | null = null;

export function resetClientInstance(): void {
  clientInstance = null;
  globalConfig.token = "";
  globalConfig.email = "";
  globalConfig.password = "";
}

export async function getAuthenticatedClient(): Promise<YesparkClient> {
  if (clientInstance) return clientInstance;

  if (!globalConfig.token && (!globalConfig.email || !globalConfig.password)) {
    console.log("\n🔐 Authentification Yespark requise :");
    const authChoice = await select({
      message: "Choisissez la méthode d'authentification :",
      choices: [
        { name: "Email + Mot de passe", value: "credentials" },
        { name: "Token Bearer statique", value: "token" },
      ],
    });

    if (authChoice === "credentials") {
      globalConfig.email = await input({
        message: "Email partenaire :",
        default: globalConfig.email || "partner@example.com",
      });
      globalConfig.password = await password({
        message: "Mot de passe :",
      });
    } else {
      globalConfig.token = await input({
        message: "Bearer Token :",
      });
    }
  }

  const env: "sandbox" | "production" = globalConfig.environment === "production" ? "production" : "sandbox";

  const clientConfig = globalConfig.token
    ? { environment: env, token: globalConfig.token }
    : {
        environment: env,
        credentials: { email: globalConfig.email, password: globalConfig.password },
      };

  clientInstance = new YesparkClient(clientConfig);
  return clientInstance;
}
