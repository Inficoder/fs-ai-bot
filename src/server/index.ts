import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { cors } from 'hono/cors'
import { initDb } from '../db/index.js'
import { loadConfig, getConfig } from '../core/config.js'
import { startWsClient, stopWsClient } from '../core/bot/ws-client.js'
import { handleMessageEvent } from '../core/bot/handler.js'
import { onChatDisbanded } from '../core/context/manager.js'
import { configRouter } from './api/config.js'
import { statusRouter } from './api/status.js'
import fs from 'node:fs'
import path from 'node:path'

const app = new Hono()

app.use('*', cors())

// API routes
app.route('/api/config', configRouter)
app.route('/api/status', statusRouter)
app.get('/health', (c) => c.json({ status: 'ok' }))

// Webhook endpoint for Feishu event subscription
app.post('/webhook/event', async (c) => {
  const body = await c.req.json()

  // Challenge verification (for webhook URL configuration)
  if (body.type === 'url_verification' || body.challenge) {
    return c.json({ challenge: body.challenge })
  }

  // 验证 token（如果配置了）
  const token = getConfig().feishuVerificationToken
  if (token && body.header?.token && body.header.token !== token) {
    console.warn('[Webhook] Token 验证失败')
    return c.json({ code: 1, msg: 'invalid token' }, 403)
  }

  const eventType = body.header?.event_type

  if (eventType === 'im.message.receive_v1') {
    const event = body.event
    console.log('[Webhook] 收到消息事件:', eventType)
    // Don't await - process asynchronously
    handleMessageEvent(event).catch((err) => {
      console.error('[Webhook] 处理消息失败:', err)
    })
    return c.json({ code: 0 })
  }

  if (eventType === 'im.chat.disbanded' || eventType === 'im.chat.member.bot.removed_v1') {
    const chatId = body.event?.chat_id
    if (chatId) onChatDisbanded(chatId, 'webhook')
    return c.json({ code: 0 })
  }

  // Unknown event type
  console.log('[Webhook] 未处理的事件类型:', eventType)
  return c.json({ code: 0 })
})

// Serve static frontend (assets only via serveStatic)
// In dev (tsx), __dirname is src/server/; in prod (tsup bundled) it's dist/
let webDistPath = path.resolve(import.meta.dirname, '..', 'web-dist')
if (!fs.existsSync(webDistPath)) {
  webDistPath = path.resolve(import.meta.dirname, '../../web-dist')
}
if (fs.existsSync(webDistPath)) {
  app.use('/assets/*', serveStatic({ root: webDistPath }))
}

// Fallback to index.html for SPA routing (not API routes)
app.get('/*', (c) => {
  if (c.req.path.startsWith('/api/')) return c.json({ error: 'Not Found' }, 404)
  const indexPath = path.join(webDistPath, 'index.html')
  if (fs.existsSync(indexPath)) {
    return c.html(fs.readFileSync(indexPath, 'utf-8'))
  }
  return c.json({ error: 'Not Found' }, 404)
})

export interface StartOptions {
  port?: number
}

let serverInstance: ReturnType<typeof serve> | null = null

export async function startServer(options: StartOptions = {}): Promise<void> {
  await initDb()
  loadConfig()

  const config = getConfig()
  const port = options.port ?? config.port ?? 8000

  if (!config.feishuAppId || !config.deepseekApiKey) {
    console.log('-- 配置未完成，请访问 Web 页面进行配置')
  }

  serverInstance = serve({ fetch: app.fetch, port })
  console.log('服务已启动: http://localhost:' + port)
  console.log('Webhook 端点: http://localhost:' + port + '/webhook/event')

  await startWsClient().catch((err) => {
    console.error('WS 客户端启动失败:', err.message)
  })
}

export async function stopServer(): Promise<void> {
  await stopWsClient()
  if (serverInstance) {
    serverInstance.close()
    serverInstance = null
  }
}

// 直接运行时启动服务 (tsx src/server/index.ts / npm run dev)
const runningPath = process.argv[1]?.replace(/\\/g, '/')
if (runningPath?.includes('/src/server/index')) {
  startServer()
}
