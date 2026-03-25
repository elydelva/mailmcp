import { beforeEach, describe, expect, mock, test } from "bun:test";
import { buildServer } from "../server.js";

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------

type FetchHandler = (url: string, opts?: RequestInit) => Promise<Response>;

let fetchHandler: FetchHandler = async () => new Response("{}", { status: 200 });

const mockFetch = mock(async (url: string, opts?: RequestInit) => {
  return fetchHandler(url, opts);
});

beforeEach(() => {
  globalThis.fetch = mockFetch as unknown as typeof fetch;
  mockFetch.mockClear();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function makeServer() {
  process.env.HYDRA_ADMIN_URL = "http://hydra-admin:4445";
  process.env.HYDRA_PUBLIC_URL = "http://hydra-public:4444";
  process.env.SERVER_BASE_URL = "http://server:3000";

  const server = await buildServer();
  await server.ready();
  return server;
}

// ---------------------------------------------------------------------------
// /.well-known/oauth-protected-resource
// ---------------------------------------------------------------------------

describe("GET /.well-known/oauth-protected-resource", () => {
  test("returns correct JSON shape", async () => {
    const server = await makeServer();
    const res = await server.inject({
      method: "GET",
      url: "/.well-known/oauth-protected-resource",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.resource).toBe("http://server:3000");
    expect(body.authorization_servers).toEqual(["http://hydra-public:4444"]);
    expect(body.bearer_methods_supported).toEqual(["header"]);
    expect(body.scopes_supported).toContain("openid");
  });
});

// ---------------------------------------------------------------------------
// /.well-known/openid-configuration
// ---------------------------------------------------------------------------

describe("GET /.well-known/openid-configuration", () => {
  test("proxies Hydra response", async () => {
    const hydraBody = { issuer: "http://hydra-public:4444", subject_types_supported: ["public"] };
    fetchHandler = async () => new Response(JSON.stringify(hydraBody), { status: 200 });

    const server = await makeServer();
    const res = await server.inject({ method: "GET", url: "/.well-known/openid-configuration" });

    expect(res.statusCode).toBe(200);
    expect(res.json().issuer).toBe("http://hydra-public:4444");
  });

  test("returns 502 when Hydra is down", async () => {
    fetchHandler = async () => {
      throw new Error("Connection refused");
    };

    const server = await makeServer();
    const res = await server.inject({ method: "GET", url: "/.well-known/openid-configuration" });

    expect(res.statusCode).toBe(502);
    expect(res.json().error).toBe("upstream_error");
  });
});

// ---------------------------------------------------------------------------
// POST /oauth2/register
// ---------------------------------------------------------------------------

describe("POST /oauth2/register", () => {
  test("strips empty string fields from Hydra response", async () => {
    const hydraResponse = {
      client_id: "abc",
      client_secret: "",
      redirect_uris: ["https://client.example.com/cb"],
      logo_uri: "",
    };
    fetchHandler = async () => new Response(JSON.stringify(hydraResponse), { status: 201 });

    const server = await makeServer();
    const res = await server.inject({
      method: "POST",
      url: "/oauth2/register",
      headers: { "content-type": "application/json" },
      payload: { redirect_uris: ["https://client.example.com/cb"] },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.client_id).toBe("abc");
    expect(body).not.toHaveProperty("client_secret");
    expect(body).not.toHaveProperty("logo_uri");
    expect(body.redirect_uris).toEqual(["https://client.example.com/cb"]);
  });

  test("returns 502 on Hydra error", async () => {
    fetchHandler = async () => {
      throw new Error("Network failure");
    };

    const server = await makeServer();
    const res = await server.inject({
      method: "POST",
      url: "/oauth2/register",
      headers: { "content-type": "application/json" },
      payload: {},
    });

    expect(res.statusCode).toBe(502);
    expect(res.json().error).toBe("upstream_error");
  });
});

// ---------------------------------------------------------------------------
// Introspection middleware
// ---------------------------------------------------------------------------

describe("Introspection middleware", () => {
  test("passes valid token (active: true)", async () => {
    fetchHandler = async (url) => {
      if (url.includes("introspect")) {
        return new Response(JSON.stringify({ active: true, sub: "user-123" }), { status: 200 });
      }
      return new Response("{}", { status: 200 });
    };

    const server = await makeServer();
    const res = await server.inject({
      method: "GET",
      url: "/api/accounts",
      headers: { authorization: "Bearer valid-token" },
    });

    // Should NOT be 401
    expect(res.statusCode).not.toBe(401);
  });

  test("rejects invalid token (active: false)", async () => {
    fetchHandler = async (url) => {
      if (url.includes("introspect")) {
        return new Response(JSON.stringify({ active: false }), { status: 200 });
      }
      return new Response("{}", { status: 200 });
    };

    const server = await makeServer();
    const res = await server.inject({
      method: "GET",
      url: "/api/accounts",
      headers: { authorization: "Bearer bad-token" },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe("unauthorized");
  });

  test("rejects request with no token", async () => {
    const server = await makeServer();
    const res = await server.inject({ method: "GET", url: "/api/accounts" });

    expect(res.statusCode).toBe(401);
  });

  test("skips introspection for GET /health", async () => {
    fetchHandler = async () => {
      throw new Error("fetch should not be called for public routes");
    };

    const server = await makeServer();
    const res = await server.inject({ method: "GET", url: "/health" });

    expect(res.statusCode).toBe(200);
  });

  test("skips introspection for GET /.well-known/* routes", async () => {
    const hydraBody = { issuer: "http://hydra-public:4444" };
    fetchHandler = async () => new Response(JSON.stringify(hydraBody), { status: 200 });

    const server = await makeServer();
    const res = await server.inject({
      method: "GET",
      url: "/.well-known/oauth-protected-resource",
    });

    expect(res.statusCode).toBe(200);
    // oauth-protected-resource is static — no fetch needed
    expect(mockFetch.mock.calls.length).toBe(0);
  });

  test("skips introspection for POST /oauth2/register", async () => {
    const hydraResponse = { client_id: "new-client" };
    fetchHandler = async () => new Response(JSON.stringify(hydraResponse), { status: 201 });

    const server = await makeServer();
    const res = await server.inject({
      method: "POST",
      url: "/oauth2/register",
      headers: { "content-type": "application/json" },
      payload: {},
    });

    expect(res.statusCode).toBe(201);
    // fetch called once (DCR to Hydra), not twice (which would indicate introspect was also called)
    expect(mockFetch.mock.calls.length).toBe(1);
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/clients");
  });
});
