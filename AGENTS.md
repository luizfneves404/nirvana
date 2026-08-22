<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

# Nirvana

Cloudflare Worker serving a Hono API and a React 19 SPA (Ionic) from static
assets. The same client bundle is packaged natively by Capacitor. Server state
is TanStack Query, validation is Zod.

The app is a voice-to-voice conversation with xAI's Grok voice model, over the
AI SDK's experimental realtime API routed through the Vercel AI Gateway. The
browser holds the WebSocket; the Worker only mints short-lived client secrets.
Drizzle + D1 is wired up and migrated but nothing reads it yet — it stays so the
migrations keep working.

Single package: `src/` is the SPA, `worker/` is the API, `shared/` holds code
both sides import (`realtime.ts` constants, `schemas.ts` Zod). Three tsconfig
projects (`app`, `worker`, `node`) share strict settings from
`tsconfig.strict.json`.

## Things that will bite you

- **React Compiler is on** (native Oxc, `react({ compiler: true })`). Do not add
  `useMemo`/`useCallback`/`React.memo` for performance — the compiler does it,
  and manual memoization can defeat it. Verified working: the dev transform
  emits `_c` cache slots from `react/compiler-runtime`.
- **Hono routes must stay chained.** Splitting the `.get().post()` chain in
  `worker/index.ts` into separate statements silently degrades RPC types to
  `any` — the client still compiles, it just stops type-checking.
- **Import test helpers from `vite-plus/test`, never `vitest`.** Vite+ re-exports
  its bundled Vitest 4.1.10; `vitest` is pinned in the catalog to that exact
  version because `@cloudflare/vitest-plugin` needs to resolve one copy.
- **`cloudflare()` is disabled under Vitest** (see the `isVitest` guard in
  `vite.config.ts`). Vite+ injects `resolve.external` into every environment and
  the Cloudflare plugin rejects that on Worker environments, so `vp test` cannot
  start with it loaded. The workers test project uses `cloudflareTest()` instead.
- **Ionic 9 uses React Router v6** — `element=` and `<Navigate>`, not `component=`
  or `<Redirect>`. Parent routes with nested children need a `/*` suffix.
- **D1 has no BOOLEAN or DATETIME.** Use `integer({ mode: "boolean" })` and
  `integer({ mode: "timestamp" })`. Foreign keys are always enforced, and a
  query is capped at 100 bound parameters.
- **Never hand-edit `worker-configuration.d.ts`.** Run `pnpm run cf-typegen`
  after any binding change. The interface is `CloudflareBindings`, named
  explicitly so it does not collide with Hono's own `Env`.
- **SPA deep links only fall back with a real navigation request.** `curl /voice`
  returns 404; a browser (or `-H "Sec-Fetch-Mode: navigate"`) gets index.html.
  That is expected, not a routing bug.

### Realtime voice

- **The server's model id is the one that counts.** `getToken()` bakes it into
  the WebSocket URL it returns (`?ai-model-id=...`). The id passed to
  `gateway.experimental_realtime()` in the browser only names the session — if
  the two ever drift, the server silently wins.
- **`model` and `sessionConfig` must be module constants.** `experimental_useRealtime`
  compares them by identity; an object literal in the component body rebuilds
  the session store on every render, which reads as a reconnect loop.
- **Start audio capture on `status === "connected"`, not after `connect()`.**
  `connect()` resolves when the token fetch does; events sent before the socket
  opens are dropped on the floor.
- **The hook owns the setup fetch**, so no custom headers are possible — that is
  why the shared password rides in the query string on `/api/realtime/setup`.
- **The AI Gateway needs a card on file** before it services any request, and
  `getSpendReport()` (real billed cost) is a paid-plan feature. The footer meter
  is therefore an estimate: it counts the PCM16 bytes in `audio-delta` events
  and prices them at the published per-minute rate.
- **Set both audio formats explicitly.** Leave them out and the provider picks
  its own while the browser captures/plays at `sampleRate` — a mismatch is
  garbled audio, not an error.

## Commands

`vp dev` · `vp check` · `vp test` · `vp build` · `pnpm run cf-typegen` ·
`pnpm run db:generate` then `pnpm run db:migrate:local` · `pnpm run cap:sync`.

Use `pnpx` rather than `npx` — `npx` fails on this repo's pnpm `devEngines` pin.
