import { describe, expect, it } from "vite-plus/test";

import app from "./index.ts";

/**
 * Node-project tests: routes that need no binding, driven through
 * `app.request()` — Hono's documented testing path, no server and no workerd.
 * Anything that touches D1 lives in index.workers.test.ts instead.
 */
describe("worker routing", () => {
  it("serves /api/health", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("404s an unknown api route", async () => {
    const res = await app.request("/api/nope");
    expect(res.status).toBe(404);
  });

  it("rejects an invalid create payload before touching the database", async () => {
    const res = await app.request("/api/items", {
      method: "POST",
      body: JSON.stringify({ title: "" }),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(400);
  });

  it("rejects a non-uuid id on patch", async () => {
    const res = await app.request("/api/items/not-a-uuid", {
      method: "PATCH",
      body: JSON.stringify({ done: true }),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(400);
  });

  it("allows the Capacitor native origin through CORS", async () => {
    const res = await app.request("/api/health", {
      headers: { Origin: "capacitor://localhost" },
    });
    expect(res.headers.get("access-control-allow-origin")).toBe("capacitor://localhost");
  });
});
