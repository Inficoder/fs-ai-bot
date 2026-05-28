import * as Lark from '@larksuiteoapi/node-sdk'

const configResp = await fetch('http://localhost:8000/api/config')
const config = (await configResp.json()).data

console.log('=== 测试 WS 事件接收 ===')
console.log('AppID:', config.feishuAppId)

let eventCount = 0
let pingCount = 0

const wsClient = new Lark.WSClient({
  appId: config.feishuAppId,
  appSecret: config.feishuAppSecret,
  loggerLevel: 'debug',
  onReady: () => {
    console.log('[TEST] ✅ WS 连接已就绪，等待事件...')
    console.log('[TEST] 请在飞书群给机器人发消息')
  },
  onError: (err) => {
    console.error('[TEST] ❌ WS 错误:', err.message)
  },
  onReconnecting: () => {
    console.log('[TEST] 🔄 重连中...')
  },
  onReconnected: () => {
    console.log('[TEST] ✅ 已重连')
  },
})

const handler = new Lark.EventDispatcher({})

handler.register({
  'im.message.receive_v1': async (data: any) => {
    eventCount++
    const chatId = data.message?.chat_id
    const text = data.message?.content ? JSON.parse(data.message.content).text : '(无内容)'
    console.log(`[TEST] 📩 收到消息 #${eventCount}: chat_id=${chatId}, text=${text}`)
    console.log('[TEST] 完整数据:', JSON.stringify(data).substring(0, 500))
    return {}
  },
})

// 也注册其他常见事件来看是否收到
handler.register({
  'im.message.receive_v1': async (data: any) => {
    // 这个会被上面的覆盖，但保留占位
  } as any,
})

console.log('[TEST] 启动 WS 客户端...')
await wsClient.start({ eventDispatcher: handler })
console.log('[TEST] start() 返回')

// 等待 30 秒收集事件
let waited = 0
while (waited < 30) {
  await new Promise(r => setTimeout(r, 1000))
  waited++
  if (eventCount > 0) {
    console.log(`[TEST] 已收集 ${eventCount} 个事件，继续等待...`)
  }
}

console.log(`[TEST] 测试结束，共收到 ${eventCount} 个事件`)
process.exit(0)
