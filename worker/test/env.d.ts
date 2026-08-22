import type { D1Migration } from "@cloudflare/vitest-plugin";

/**
 * @cloudflare/vitest-plugin v1 types `env` as `Cloudflare.Env` — the namespace
 * generated into worker-configuration.d.ts — rather than the `ProvidedEnv`
 * interface older examples augment. Interface merging adds the test-only
 * binding that vite.config.ts supplies through readD1Migrations().
 */
declare global {
  namespace Cloudflare {
    interface Env {
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}
