import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Mobile clients reconnect often; refetching on every focus is noisy.
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: 2,
    },
  },
});

export const queryKeys = {
  items: ["items"] as const,
};
