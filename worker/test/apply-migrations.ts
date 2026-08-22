/// <reference types="@cloudflare/vitest-plugin/types" />
import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";

/**
 * Each Workers test file gets isolated storage, so migrations run once per file
 * rather than once per process. Reads the migrations bound in vite.config.ts
 * via readD1Migrations().
 *
 * `env` comes from "cloudflare:workers" — the "cloudflare:test" export of the
 * same name is deprecated as of @cloudflare/vitest-plugin v1.
 */
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
