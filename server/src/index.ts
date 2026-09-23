import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

app.use('*', cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }))

app.get('/health', (c) => c.json({ ok: true }))

export default {
  port: Number(process.env.PORT ?? 3001),
  fetch: app.fetch,
}
