# syntax=docker/dockerfile:1
# SSR web app (TanStack Start).
#
# The build context is the REPO ROOT, not app/: the Bun workspace lockfile
# (bun.lock) lives there. Run from the root:
#
#   docker build -f app/Dockerfile \
#     --build-arg VITE_RPC_URL=https://api.devnet.solana.com -t app .

FROM oven/bun:1 AS build
WORKDIR /repo
COPY package.json bun.lock ./
COPY app/package.json app/
COPY server/package.json server/
COPY domain/package.json domain/
RUN bun install --frozen-lockfile --filter app
COPY app app
COPY domain domain
# VITE_* values are inlined into the client bundle at build time.
ARG VITE_RPC_URL
ARG VITE_API_URL=/api
ENV VITE_RPC_URL=$VITE_RPC_URL VITE_API_URL=$VITE_API_URL
RUN bun run --cwd app build

# The SSR bundle imports react, @tanstack/react-router, @solana/web3.js, ...
# at runtime, so the final image needs production node_modules.
FROM oven/bun:1 AS prod-deps
WORKDIR /repo
COPY package.json bun.lock ./
COPY app/package.json app/
COPY server/package.json server/
COPY domain/package.json domain/
RUN bun install --frozen-lockfile --production --filter app

FROM oven/bun:1-slim AS run
WORKDIR /repo/app
ENV NODE_ENV=production PORT=3000
COPY --from=prod-deps /repo/node_modules /repo/node_modules
COPY --from=prod-deps /repo/app/node_modules node_modules
COPY --from=build /repo/app/dist dist
COPY app/package.json app/serve.ts ./
USER bun
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["bun", "-e", "fetch('http://127.0.0.1:3000/favicon.svg').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["bun", "run", "serve.ts"]
