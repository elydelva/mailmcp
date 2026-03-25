export interface OAuthConfig {
  hydraAdminUrl: string;
  hydraPublicUrl: string;
  serverBaseUrl: string;
}

export function loadOAuthConfig(): OAuthConfig {
  return {
    hydraAdminUrl: process.env.HYDRA_ADMIN_URL ?? "http://localhost:4445",
    hydraPublicUrl: process.env.HYDRA_PUBLIC_URL ?? "http://localhost:4444",
    serverBaseUrl: process.env.SERVER_BASE_URL ?? "http://localhost:3000",
  };
}
