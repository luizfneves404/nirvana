import { hc } from "hono/client";

import type { AppType } from "../../worker/index.ts";

/**
 * On the web the SPA is served by the same Worker, so a relative base works.
 * Bundled into Capacitor there is no Worker on the origin, so the native build
 * sets VITE_API_BASE_URL to the deployed Worker URL (see .env.capacitor).
 */
const baseUrl = import.meta.env.VITE_API_BASE_URL || "/";

/**
 * Instantiating `hc<AppType>` at every call site makes tsserver re-expand the
 * whole route tree and gets slow fast. Naming the type once here is Hono's
 * documented fix: `tsc` does the expansion a single time.
 */
export type Client = ReturnType<typeof hc<AppType>>;

export const client: Client = hc<AppType>(baseUrl);

export const api = client.api;
