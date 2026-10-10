import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

/**
 * App-wide providers. One QueryClient per browser session (and per server request), so cached feed
 * pages survive route changes. The wallet provider joins here, client-only, when Review needs it.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { refetchOnWindowFocus: false } },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
