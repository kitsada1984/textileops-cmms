import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'drive-upload-dev-api',
      configureServer(server) {
        let handlerPromise
        const loadHandler = () => {
          if (!handlerPromise) {
            handlerPromise = import('./api/drive-upload.js').then((mod) => mod.default)
          }
          return handlerPromise
        }

        server.middlewares.use(async (req, res, next) => {
          if (!req.url || !req.url.startsWith('/api/drive-upload')) return next()

          try {
            const handler = await loadHandler()
            const method = String(req.method || 'GET').toUpperCase()
            let body = undefined

            if (method !== 'GET' && method !== 'HEAD') {
              const raw = await new Promise((resolve, reject) => {
                const chunks = []
                req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
                req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
                req.on('error', reject)
              })
              if (raw) {
                try {
                  body = JSON.parse(raw)
                } catch {
                  body = raw
                }
              }
            }

            let settled = false
            const finish = (statusCode, payload) => {
              if (settled) return
              settled = true
              res.statusCode = statusCode
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify(payload))
            }

            const mockRes = {
              status(code) {
                res.statusCode = code
                return mockRes
              },
              json(payload) {
                finish(res.statusCode || 200, payload)
                return mockRes
              },
            }

            const maybePromise = handler({ method, body }, mockRes)
            if (maybePromise && typeof maybePromise.then === 'function') {
              await maybePromise
            }
            if (!settled) {
              finish(200, { ok: true })
            }
          } catch (error) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({
              ok: false,
              error: error?.message || 'drive upload dev handler failed',
            }))
          }
        })
      },
    },
  ],
  server: { port: 3000 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
  },
})
