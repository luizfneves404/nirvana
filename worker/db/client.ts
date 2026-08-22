import { drizzle } from "drizzle-orm/d1";

import * as schema from "./schema.ts";

/**
 * Runtime driver. This is `drizzle-orm/d1` bound to the Worker's D1 binding —
 * distinct from the `d1-http` driver in drizzle.config.ts, which exists only so
 * drizzle-kit can reach a remote database from the CLI.
 */
export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

export type Db = ReturnType<typeof createDb>;
