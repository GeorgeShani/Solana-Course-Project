# server

Optional support backend for the project, built with [Hono](https://hono.dev) on [Bun](https://bun.sh).

## Purpose

Reminders, notifications, indexing, and caching. Nothing more.

This server **never holds keys, never signs, and never moves assets**. The Solana program is the only authority over rules and funds. If this server is offline, the app still works against the chain.

## Endpoints

| Method | Path | Response |
|---|---|---|
| `GET` | `/health` | `{ "ok": true }` |

## Environment variables

| Name | Default | Description |
|---|---|---|
| `PORT` | `3001` | Port to listen on. |
| `CORS_ORIGIN` | `http://localhost:5173` | Origin allowed to call the API (the Vite dev server). |

## Run

From the repo root:

```bash
bun run dev:server
```

Or from this folder:

```bash
bun install
bun run dev
```

Check it:

```bash
curl localhost:3001/health
```
