import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit evaluates this config eagerly, including for offline commands
 * like `generate`. Throwing on missing credentials would break migration
 * generation for anyone without Cloudflare API access, so these stay empty and
 * only the commands that actually reach the network (push, studio, introspect)
 * fail — with Cloudflare's own auth error, which is clearer than ours.
 *
 * The normal migration path never needs these: `drizzle-kit generate` writes
 * the SQL, and `wrangler d1 migrations apply` runs it using wrangler's auth.
 */
const optionalEnv = (name: string): string => process.env[name] ?? "";

/**
 * CLI-only configuration. `d1-http` lets drizzle-kit talk to a remote D1
 * database over the HTTP API; the Worker itself uses `drizzle-orm/d1` against
 * the DB binding (see worker/db/client.ts).
 */
export default defineConfig({
  schema: "./worker/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: optionalEnv("CLOUDFLARE_ACCOUNT_ID"),
    databaseId: optionalEnv("CLOUDFLARE_D1_DATABASE_ID"),
    token: optionalEnv("CLOUDFLARE_API_TOKEN"),
  },
});
