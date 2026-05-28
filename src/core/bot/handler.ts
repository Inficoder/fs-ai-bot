import { chatQueue } from '../queue/chat-queue.js'
import { routeMessage } from './commands.js'

/**
 * 处理 im.message.receive_v1 事件（WS 和 Webhook 共用）
 */
export async function handleMessageEvent(event: any): Promise<void> {
  const chatId = event.message?.chat_id
  const messageId = event.message?.message_id
  const contentStr = event.message?.content

  if (!chatId || !messageId || !contentStr) {
    console.log('[Handler] 消息字段不完整:', { chatId, messageId, hasContent: !!contentStr })
    return
  }

  // 不处理机器人自己发的消息
  if (event.sender?.sender_type === 'bot') {
    console.log('[Handler] 忽略机器人消息')
    return
  }

  try {
    const content = JSON.parse(contentStr) as { text?: string }
    const text = content.text ?? ''

    const mentions: Array<{ id: { open_id?: string } }> = event.message?.mentions ?? []
    const mentionedIds = mentions
      .map((m: any) => m.id?.open_id)
      .filter(Boolean)
      .slice(1) as string[] // skip first mention (bot) — raw events lack isBot flag

    const senderId = event.sender?.sender_id?.open_id ?? ''

    if (!text) {
      console.log('[Handler] 消息内容为空，跳过')
      return
    }

    console.log('[Handler] 入队:', { chatId, text: text.substring(0, 50) })

    chatQueue.enqueue(chatId, () =>
      routeMessage(chatId, messageId, text, mentionedIds, senderId),
    )
  } catch (err) {
    console.error('[Handler] 解析消息失败:', err)
  }
}
