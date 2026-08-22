import { z } from "zod";

/**
 * Zod lives here rather than in realtime.ts so the SPA can import the shared
 * constants without pulling the whole validation library into the client
 * bundle — these schemas only ever run on the Worker.
 */

export const PasswordSchema = z.object({
  password: z.string().min(1).max(200),
});

/**
 * The exact shape `experimental_useRealtime` destructures out of the setup
 * endpoint. `url` matters as much as `token`: without it the hook calls
 * `new WebSocket(undefined, ...)`, which fails looking like an auth problem.
 * Validating server-side turns that into an honest 502.
 */
export const RealtimeSetupSchema = z.object({
  token: z.string().min(1),
  url: z.url(),
  expiresAt: z.number().optional(),
});

export type RealtimeSetup = z.infer<typeof RealtimeSetupSchema>;
