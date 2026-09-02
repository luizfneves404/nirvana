import { useSyncExternalStore } from "react";

/**
 * The shared password, remembered in localStorage so it is typed once per
 * device. It gates a public URL against crawlers; it is not a user account.
 */

const STORAGE_KEY = "astro.password.v1";

function read(): string {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

let password = read();

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function setPassword(next: string): void {
  password = next;
  try {
    if (next === "") globalThis.localStorage?.removeItem(STORAGE_KEY);
    else globalThis.localStorage?.setItem(STORAGE_KEY, next);
  } catch {
    // Storage unavailable — the password lives for this page load only.
  }
  emit();
}

export function getPassword(): string {
  return password;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePassword(): string {
  return useSyncExternalStore(subscribe, getPassword, getPassword);
}
