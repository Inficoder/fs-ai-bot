import { getConfig } from '../config.js'

const MAX_CARD_CHARS = 20000

interface TokenCache {
  token: string
  expiresAt: number
}
let tokenCache: TokenCache = { token: '', expiresAt: 0 }

export async function getTenantToken(): Promise<string> {
  const now = Date.now() / 1000
  if (tokenCache.token && now < tokenCache.expiresAt - 60) {
    return tokenCache.token
  }

  const config = getConfig()
  const resp = await fetch(`${config.feishuBaseUrl}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: config.feishuAppId,
      app_secret: config.feishuAppSecret,
    }),
  })

  if (!resp.ok) throw new Error(`获取飞书 token 失败: ${resp.status}`)
  const data = await resp.json() as { code: number; tenant_access_token?: string; expire?: number }
  if (data.code !== 0) throw new Error(`获取飞书 token 失败: ${JSON.stringify(data)}`)

  tokenCache = {
    token: data.tenant_access_token!,
    expiresAt: now + (data.expire ?? 3600),
  }
  return tokenCache.token
}

function feishuRequest(
  method: string,
  path: string,
  body: Record<string, unknown> | null,
  returnMessageId = false,
): Promise<string | null> {
  return _feishuRequest(method, path, body, returnMessageId)
}

async function _feishuRequest(
  method: string,
  path: string,
  body: Record<string, unknown> | null,
  returnMessageId = false,
): Promise<string | null> {
  const config = getConfig()
  const token = await getTenantToken()
  const baseUrl = config.feishuBaseUrl

  const resp = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!resp.ok) throw new Error(`飞书 API 错误 ${resp.status}: ${await resp.text()}`)
  const data = await resp.json() as { code: number; data?: { message_id?: string } }
  if (data.code !== 0) throw new Error(`飞书 API 失败: ${JSON.stringify(data)}`)

  if (returnMessageId) {
    return data.data?.message_id ?? null
  }
  return null
}

function cardJson(markdownContent: string): Record<string, unknown> {
  if (markdownContent.length > MAX_CARD_CHARS) {
    markdownContent = markdownContent.substring(0, MAX_CARD_CHARS) + '\n\n...（内容过长已截断）'
  }
  return {
    config: { wide_screen_mode: true },
    header: {
      title: { content: 'AI 回复', tag: 'plain_text' },
      template: 'wathet',
    },
    elements: [
      { tag: 'markdown', content: markdownContent },
    ],
  }
}

export async function createFeishuChat(
  name: string,
  userIds: string[],
  ownerId = '',
): Promise<string> {
  const config = getConfig()
  const token = await getTenantToken()
  const baseUrl = config.feishuBaseUrl

  const body: Record<string, unknown> = {
    name,
    chat_type: 'private',
  }
  if (ownerId) body.owner_id = ownerId
  if (userIds.length > 0) body.user_id_list = userIds

  const params = new URLSearchParams({ user_id_type: 'open_id', set_bot_manager: 'true' })
  const resp = await fetch(`${baseUrl}/im/v1/chats?${params}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!resp.ok) throw new Error(`创建群聊失败: ${resp.status}`)
  const data = await resp.json() as { code: number; data?: { chat_id: string } }
  if (data.code !== 0) throw new Error(`创建群聊失败: ${JSON.stringify(data)}`)
  return data.data!.chat_id
}

export async function replyWithCard(
  chatId: string,
  messageId: string,
  content: string,
): Promise<string | null> {
  return feishuRequest(
    'POST',
    `/im/v1/messages/${messageId}/reply`,
    {
      msg_type: 'interactive',
      content: JSON.stringify(cardJson(content)),
    },
    true,
  )
}

export async function updateCardContent(messageId: string, content: string): Promise<void> {
  await feishuRequest(
    'PATCH',
    `/im/v1/messages/${messageId}`,
    {
      msg_type: 'interactive',
      content: JSON.stringify(cardJson(content)),
    },
    false,
  )
}

export async function replyText(
  chatId: string,
  messageId: string,
  content: string,
): Promise<string | null> {
  return feishuRequest(
    'POST',
    `/im/v1/messages/${messageId}/reply`,
    {
      msg_type: 'text',
      content: JSON.stringify({ text: content }),
    },
    true,
  )
}
