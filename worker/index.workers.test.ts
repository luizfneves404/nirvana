/// <reference types="@cloudflare/vitest-plugin/types" />
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vite-plus/test";

import { createDb } from "./db/client.ts";
import { items } from "./db/schema.ts";

/**
 * Runs inside workerd against a real (local) D1 binding. Nothing in the voice
 * app reads the database yet, so this exists to keep the migrations honest:
 * it proves `drizzle/migrations` still applies cleanly and that D1's
 * integer-backed boolean and timestamp columns round-trip through Drizzle.
 */
describe("D1 schema", () => {
  beforeEach(async () => {
    await createDb(env.DB).delete(items);
  });

  it("round-trips a row through the migrated schema", async () => {
    const db = createDb(env.DB);

    const [inserted] = await db.insert(items).values({ title: "hello" }).returning();
    expect(inserted?.title).toBe("hello");
    // D1 has no BOOLEAN — this proves the integer comes back as a real false.
    expect(inserted?.done).toBe(false);
    // ...and no DATETIME, so createdAt must arrive as a usable Date.
    expect(inserted?.createdAt).toBeInstanceOf(Date);

    const rows = await db.select().from(items);
    expect(rows).toHaveLength(1);
  });

  it("generates a uuid primary key client-side", async () => {
    const db = createDb(env.DB);

    const [row] = await db.insert(items).values({ title: "keyed" }).returning();
    expect(row?.id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
