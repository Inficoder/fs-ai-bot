import { createLarkChannel } from '@larksuiteoapi/node-sdk'
import { getConfig } from '../config.js'
import { chatQueue } from '../queue/chat-queue.js'
import { routeMessage } from './commands.js'
import { replyWithCard } from './cards.js'
import { onChatDisbanded, listContexts } from '../context/manager.js'
import { getTenantToken } from './cards.js'

let _channel: any = null
let _connected = false

export function isWsConnected(): boolean {
  return _connected
}

export async function startWsClient(): Promise<void> {
  const config = getConfig()

  if (!config.feishuAppId || !config.feishuAppSecret) {
    console.log('[WS] 飞书配置不完整，跳过 WS 连接')
    return
  }

  console.log('[WS] 使用 Channel API 连接...')

  const channel = createLarkChannel({
    appId: config.feishuAppId,
    appSecret: config.feishuAppSecret,
    includeRawEvent: true,
  })

  channel.on('message', async (msg: any) => {
    const chatId = msg.chatId
    const messageId = msg.messageId
    const text = msg.content
    const mentionedIds: string[] = (msg.mentions ?? [])
      .filter((m: any) => !m.isBot)
      .map((m: any) => m.id?.open_id)
      .filter(Boolean)
    const senderId = msg.senderId ?? ''

    console.log('[WS] 收到消息:', { chatId, text: text?.substring(0, 50), mentionedIds, senderId })

    if (!chatId || !messageId || !text) {
      console.log('[WS] 消息字段不完整:', { chatId, messageId, hasText: !!text })
      return
    }

    chatQueue.enqueue(chatId, () =>
      routeMessage(chatId, messageId, text, mentionedIds, senderId),
    )
  })

  channel.on('error', (err: Error) => {
    _connected = false
    console.error('[WS] 错误:', err)
  })

  channel.on('reject', (evt: any) => {
    console.log('[WS] 事件被安全过滤:', JSON.stringify(evt).substring(0, 300))
  })

  channel.on('reconnecting', () => {
    _connected = false
    console.log('[WS] 重连中...')
  })

  channel.on('reconnected', () => {
    _connected = true
    console.log('[WS] 已重连')
  })

  channel.on('botAdded', (evt: any) => {
    console.log('[WS] 机器人被加入群:', JSON.stringify(evt).substring(0, 200))
  })

  channel.on('cardAction', (evt: any) => {
    console.log('[WS] 卡片动作:', JSON.stringify(evt).substring(0, 200))
  })

  // 注册 SDK 未内置的事件类型
  const onChatGone = (raw: any) => {
    const chatId = raw.event?.chat_id
    if (chatId) onChatDisbanded(chatId, 'ws')
  }
  ;(channel as any).dispatcher.register({
    'im.chat.disbanded': onChatGone,
    'im.chat.member.bot.removed_v1': onChatGone,
  })

  try {
    await channel.connect()
    _connected = true
    _channel = channel
    console.log('[WS] Channel 连接成功，开始接收消息')

    // 启动后验证已有群组是否仍然存在
    verifyActiveGroups().catch(err => console.error('[WS] 群组验证失败:', err))
  } catch (err) {
    _connected = false
    console.error('[WS] Channel 连接失败:', err)
    throw err
  }
}

async function verifyActiveGroups(): Promise<void> {
  const config = getConfig()
  if (!config.feishuAppId || !config.feishuAppSecret) return

  const contexts = listContexts()
  if (contexts.length === 0) return

  const token = await getTenantToken()
  const baseUrl = config.feishuBaseUrl

  await Promise.all(contexts.map(async (ctx) => {
    try {
      const resp = await fetch(`${baseUrl}/im/v1/chats/${ctx.chatId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!resp.ok) {
        console.log(`[WS] 群组不可达 (${resp.status})，标记为已解散:`, ctx.chatId, ctx.name)
        onChatDisbanded(ctx.chatId, 'verify')
        return
      }
      const data = await resp.json() as { data?: { chat_status?: string } }
      if (data.data?.chat_status === 'dissolved') {
        onChatDisbanded(ctx.chatId, 'verify')
      }
    } catch (err) {
      console.warn('[WS] 群组验证错误:', ctx.chatId, (err as Error).message)
    }
  }))
}

export async function stopWsClient(): Promise<void> {
  if (_channel) {
    try {
      await _channel.disconnect()
    } catch { /* ok */ }
    _channel = null
    _connected = false
    console.log('[WS] 连接已关闭')
  }
}

export async function restartWsClient(): Promise<void> {
  console.log('[WS] 配置变更，重新连接...')
  await stopWsClient()
  await startWsClient()
}
