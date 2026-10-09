// Production server: serves the built client assets and hands everything else
// to the TanStack Start SSR handler. Run `bun run build` first.
//
// Usage: bun run start   (PORT defaults to 3000)

import { join } from "node:path";

interface FetchHandler {
  fetch(request: Request): Response | Promise<Response>;
}

function isFetchHandler(value: unknown): value is FetchHandler {
  return (
    typeof value === "object" &&
    value !== null &&
    "fetch" in value &&
    typeof value.fetch === "function"
  );
}

const clientDir = join(import.meta.dir, "dist", "client");
// The SSR bundle only exists after `bun run build`, so it is imported by a
// non-literal path (not type-checked) and checked at runtime for the shape we use.
const serverEntry = "./dist/server/server.js";
const bundle: unknown = await import(serverEntry);
if (
  typeof bundle !== "object" ||
  bundle === null ||
  !("default" in bundle) ||
  !isFetchHandler(bundle.default)
) {
  throw new Error(`${serverEntry} does not export a default fetch handler`);
}
const server = bundle.default;

const port = Number(process.env.PORT ?? 3000);

Bun.serve({
  port,
  async fetch(request) {
    const { pathname } = new URL(request.url);
    if (pathname !== "/") {
      const file = Bun.file(join(clientDir, pathname));
      // Guard against path traversal out of the client directory.
      if (file.name?.startsWith(clientDir) && (await file.exists())) {
        return new Response(file);
      }
    }
    return server.fetch(request);
  },
});

console.log(`app listening on http://localhost:${port}`);
