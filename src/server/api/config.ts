import { Hono } from 'hono'
import { getConfig, updateConfig } from '../../core/config.js'
import { getDb } from '../../db/index.js'
import { restartWsClient } from '../../core/bot/ws-client.js'
import type { AppConfig } from '../../types/index.js'

const router = new Hono()

// GET /api/config - 读取当前配置（敏感字段脱敏）
router.get('/', (c) => {
  const config = getConfig()
  return c.json({
    code: 0,
    data: {
      ...config,
      feishuAppSecret: config.feishuAppSecret ? '****' : '',
      deepseekApiKey: config.deepseekApiKey ? '****' : '',
      serpApiKey: config.serpApiKey ? '****' : '',
    },
  })
})

// PUT /api/config - 保存配置
router.put('/', async (c) => {
  const body: Partial<AppConfig> = await c.req.json()
  const old = getConfig()
  try {
    const updated = updateConfig(body)
    // 飞书凭据变更时自动重连 WS
    const credChanged =
      (body.feishuAppId && body.feishuAppId !== old.feishuAppId) ||
      (body.feishuAppSecret && body.feishuAppSecret !== old.feishuAppSecret)
    if (credChanged) {
      restartWsClient().catch(err => console.error('[Config] WS 重连失败:', err))
    }
    return c.json({ code: 0, data: updated })
  } catch (err) {
    return c.json({ code: 1, error: String(err) }, 400)
  }
})

export { router as configRouter }
