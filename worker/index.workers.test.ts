/// <reference types="@cloudflare/vitest-plugin/types" />
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vite-plus/test";

import app from "./index.ts";
import { items } from "./db/schema.ts";
import { createDb } from "./db/client.ts";

/**
 * Runs inside workerd against a real (local) D1 binding, so this covers the
 * parts app.request() alone cannot: Drizzle's SQL, D1's integer-backed boolean
 * and timestamp columns, and the round-trip through the Hono routes.
 */
describe("items API against D1", () => {
  beforeEach(async () => {
    await createDb(env.DB).delete(items);
  });

  const create = async (title: string) =>
    app.request(
      "/api/items",
      {
        method: "POST",
        body: JSON.stringify({ title }),
        headers: { "Content-Type": "application/json" },
      },
      env,
    );

  it("creates an item and reads it back", async () => {
    const created = await create("write the report");
    expect(created.status).toBe(201);

    const listed = await app.request("/api/items", {}, env);
    expect(listed.status).toBe(200);

    const { items: rows } = await listed.json<{
      items: { id: string; title: string; done: boolean; createdAt: number }[];
    }>();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toBe("write the report");
    // D1 has no BOOLEAN — this proves the integer round-trips as a real false.
    expect(rows[0]?.done).toBe(false);
    // ...and no DATETIME, so createdAt must come back as a usable epoch.
    expect(rows[0]?.createdAt).toBeGreaterThan(0);
  });

  it("toggles done via PATCH", async () => {
    const created = await create("toggle me");
    const { item } = await created.json<{ item: { id: string } }>();

    const patched = await app.request(
      `/api/items/${item.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ done: true }),
        headers: { "Content-Type": "application/json" },
      },
      env,
    );
    expect(patched.status).toBe(200);

    const { item: updated } = await patched.json<{ item: { done: boolean } }>();
    expect(updated.done).toBe(true);
  });

  it("deletes an item", async () => {
    const created = await create("delete me");
    const { item } = await created.json<{ item: { id: string } }>();

    const deleted = await app.request(`/api/items/${item.id}`, { method: "DELETE" }, env);
    expect(deleted.status).toBe(204);

    const listed = await app.request("/api/items", {}, env);
    const { items: rows } = await listed.json<{ items: unknown[] }>();
    expect(rows).toHaveLength(0);
  });

  it("404s a PATCH against a missing id", async () => {
    const res = await app.request(
      "/api/items/3f1a7c2e-5d4b-4a91-8f2c-1b6e9d0a7c34",
      {
        method: "PATCH",
        body: JSON.stringify({ done: true }),
        headers: { "Content-Type": "application/json" },
      },
      env,
    );
    expect(res.status).toBe(404);
  });
});
