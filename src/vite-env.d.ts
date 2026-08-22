/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Empty on the web (the Worker serves the SPA from the same origin).
   * Set to the deployed Worker URL for Capacitor builds, which have no Worker
   * on their local origin.
   */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
