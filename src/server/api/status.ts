import { Hono } from 'hono'
import { getConfig } from '../../core/config.js'
import { queryAll } from '../../db/index.js'
import { isWsConnected } from '../../core/bot/ws-client.js'
import { listContexts, listDeletedContexts } from '../../core/context/manager.js'

const router = new Hono()

router.get('/', (c) => {
  const config = getConfig()
  const hasConfig = config.feishuAppId !== '' && config.deepseekApiKey !== ''
  const activeChats = queryAll<{ count: number }>('SELECT COUNT(*) as count FROM contexts WHERE deleted = 0')
  const totalMessages = queryAll<{ count: number }>('SELECT COUNT(*) as count FROM messages')

  return c.json({
    code: 0,
    data: {
      running: true,
      wsConnected: isWsConnected(),
      activeChats: activeChats[0]?.count ?? 0,
      totalMessages: totalMessages[0]?.count ?? 0,
      configValid: hasConfig,
    },
  })
})

router.get('/contexts', (c) => {
  const contexts = listContexts()
  return c.json({ code: 0, data: contexts })
})

router.get('/contexts/deleted', (c) => {
  const contexts = listDeletedContexts()
  return c.json({ code: 0, data: contexts })
})

export { router as statusRouter }
