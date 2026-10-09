# syntax=docker/dockerfile:1
# Hono support server.
#
# The build context is the REPO ROOT, not server/: the Bun workspace lockfile
# (bun.lock) lives there. Run from the root:
#
#   docker build -f server/Dockerfile -t server .

FROM oven/bun:1-slim
WORKDIR /repo
ENV NODE_ENV=production PORT=3001
COPY package.json bun.lock ./
COPY app/package.json app/
COPY server/package.json server/
COPY domain/package.json domain/
RUN bun install --frozen-lockfile --production --filter server
COPY domain domain
COPY server server
WORKDIR /repo/server
USER bun
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD ["bun", "-e", "fetch('http://127.0.0.1:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["bun", "run", "start"]
