import { getConfig } from '../config.js'
import { chatStream } from '../ai/deepseek.js'
import { searchWeb } from '../search/web-search.js'
import { replyText, replyWithCard, updateCardContent } from './cards.js'
import { createFeishuChat } from './cards.js'
import {
  addMessage,
  createContext,
  getContext,
  getMessages,
  getOrCreateContext,
  listContexts,
  resetContext,
  updateMentionMode,
  updateModel,
  updateSearch,
  updateSystemPrompt,
  updateTemperature,
} from '../context/manager.js'

import type { Context } from '../../types/index.js'

const HELP_TEXT = `**可用命令**

**对话管理**
\`/create <名称> [@用户...]\` 创建新群聊并设置 AI
\`/list\` 列出所有对话
\`/reset\` 清空对话历史

**AI 控制**
\`/system <提示词>\` 设置 AI 角色
\`/model [名称]\` 查看/切换模型
\`/temp <0.0-2.0>\` 调整创意度
\`/search [on|off]\` 查看/切换智能搜索

**协作**
\`/mode [all|mention]\` 切换响应模式
\`/note <内容>\` 添加备注
\`/help\` 显示帮助

直接发文字即可与 AI 对话`

const VALID_MODELS = new Set([
  'deepseek-chat',
  'deepseek-reasoner',
  'deepseek-v4-pro',
  'deepseek-v4-flash',
])

export async function routeMessage(
  chatId: string,
  messageId: string,
  text: string,
  mentionedIds: string[] = [],
  senderId = '',
  botMentioned = true,
): Promise<void> {
  text = text.trim()
  // 去除开头的 @mention
  text = text.replace(/^@\S+\s*/, '').trim()

  if (!text) return

  // 命令始终响应
  if (text.startsWith('/')) {
    await handleCommand(chatId, messageId, text, mentionedIds, senderId)
    return
  }

  // 需要 @ 模式：未 @ 机器人则不响应
  const ctx = getContext(chatId)
  if (ctx?.mentionOnly !== 0 && !botMentioned) {
    console.log('[Route] 跳过（仅@模式，未@机器人）', { chatId, mentionOnly: ctx?.mentionOnly, botMentioned })
    return
  }
  console.log('[Route] 进入AI对话', { chatId, mentionOnly: ctx?.mentionOnly, botMentioned })

  await handleAIChat(chatId, messageId, text)
}

async function handleCommand(
  chatId: string,
  messageId: string,
  text: string,
  mentionedIds: string[],
  senderId: string,
): Promise<void> {
  const parts = text.split(/\s+(.*)/)
  const cmd = parts[0].toLowerCase()
  const arg = parts[1]?.trim() ?? ''

  switch (cmd) {
    case '/help':
      await replyText(chatId, messageId, HELP_TEXT)
      break

    case '/create': {
      const atPos = arg.indexOf('@')
      const name = atPos > 0 ? arg.substring(0, atPos).trim() : arg.trim() || '新对话群'
      const inviteIds = [...mentionedIds]
      if (senderId && !inviteIds.includes(senderId)) {
        inviteIds.unshift(senderId)
      }

      try {
        const newChatId = await createFeishuChat(name, inviteIds, senderId)
        createContext(newChatId, name)
        await replyText(chatId, messageId, `群「${name}」已创建，对话上下文已就绪`)
      } catch (err) {
        console.error('[Cmd] 创建群聊失败:', err)
        await replyText(chatId, messageId, '创建群聊失败，请稍后重试')
      }
      break
    }

    case '/list': {
      const contexts = listContexts()
      if (contexts.length === 0) {
        await replyText(chatId, messageId, '暂无活跃对话')
        return
      }
      const lines = contexts.map(c =>
        `• **${c.name}** — ${c.messageCount} 条消息，模型: ${c.model}`,
      )
      await replyText(chatId, messageId, `**活跃对话** (${contexts.length} 个)\n` + lines.join('\n'))
      break
    }

    case '/reset': {
      if (resetContext(chatId)) {
        await replyText(chatId, messageId, '对话历史已清空')
      } else {
        await replyText(chatId, messageId, '当前群没有活跃对话')
      }
      break
    }

    case '/system': {
      const ctx = getOrCreateContext(chatId)
      updateSystemPrompt(ctx.id!, arg)
      await replyText(chatId, messageId, `已设置 AI 角色:\n> ${arg}`)
      break
    }

    case '/model': {
      const ctx = getOrCreateContext(chatId)
      if (arg) {
        if (!VALID_MODELS.has(arg)) {
          const models = [...VALID_MODELS].sort().join(', ')
          await replyText(chatId, messageId, `无效模型 \`${arg}\`。可用: ${models}`)
          return
        }
        updateModel(ctx.id!, arg)
        await replyText(chatId, messageId, `已切换模型: ${arg}`)
      } else {
        await replyText(chatId, messageId, `当前模型: ${ctx.model}`)
      }
      break
    }

    case '/temp': {
      const ctx = getOrCreateContext(chatId)
      const temp = parseFloat(arg)
      if (isNaN(temp) || temp < 0 || temp > 2) {
        await replyText(chatId, messageId, '温度值需为 0.0 ~ 2.0 之间的数字')
        return
      }
      updateTemperature(ctx.id!, temp)
      await replyText(chatId, messageId, `已设置创意度: ${temp}`)
      break
    }

    case '/search': {
      const ctx = getOrCreateContext(chatId)
      const value = arg.toLowerCase()
      if (value === 'on') {
        updateSearch(ctx.id!, true)
        await replyText(chatId, messageId, '已开启智能搜索')
      } else if (value === 'off') {
        updateSearch(ctx.id!, false)
        await replyText(chatId, messageId, '已关闭智能搜索')
      } else {
        const status = ctx.searchEnabled ? '开启' : '关闭'
        await replyText(
          chatId,
          messageId,
          `智能搜索: ${status}\n使用 \`/search on\` 或 \`/search off\` 切换`,
        )
      }
      break
    }

    case '/mode': {
      const ctx = getOrCreateContext(chatId)
      const value = arg.toLowerCase()
      if (value === 'all') {
        updateMentionMode(ctx.id!, false)
        await replyText(chatId, messageId, '已切换为 **全部消息** 模式，机器人会响应群内所有消息')
      } else if (value === 'mention') {
        updateMentionMode(ctx.id!, true)
        await replyText(chatId, messageId, '已切换为 **仅 @** 模式，机器人只响应 @ 它的消息')
      } else {
        const mode = ctx.mentionOnly !== false ? '仅 @（需 @机器人）' : '全部消息'
        await replyText(
          chatId,
          messageId,
          `当前模式: **${mode}**\n使用 \`/mode all\` 或 \`/mode mention\` 切换`,
        )
      }
      break
    }

    case '/note':
      await replyText(chatId, messageId, `备注已记录: ${arg || '(空)'}`)
      break

    default:
      await replyText(chatId, messageId, `未知命令 \`${cmd}\`，输入 /help 查看帮助`)
  }
}

async function handleAIChat(chatId: string, messageId: string, text: string): Promise<void> {
  const ctx = getOrCreateContext(chatId)

  // 智能搜索
  let userMessage = text
  if (ctx.searchEnabled) {
    try {
      const searchResults = await Promise.race([
        searchWeb(text),
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 10000),
        ),
      ])
      if (searchResults) {
        const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
        userMessage = text + `\n\n[当前日期: ${today}]\n\n[以下是相关网络搜索结果，请结合这些信息回答]\n` + searchResults
        console.log('[AI] 搜索已启用，获得结果:', searchResults.substring(0, 100))
      } else {
        console.log('[AI] 搜索已启用但无结果')
      }
    } catch {
      console.warn('[AI] 网络搜索超时')
    }
  }

  addMessage(ctx.id!, 'user', text)
  const history = getMessages(ctx.id!)
  history.pop() // 移除刚加入的 user 消息，由 deepseek 拼接

  // 发送"思考中"卡片
  const cardMsgId = await replyWithCard(chatId, messageId, '思考中...')
  if (!cardMsgId) {
    await replyText(chatId, messageId, 'AI 服务暂时不可用')
    return
  }

  // 流式获取回复
  let full = ''
  let chunkBuffer = ''
  let lastUpdate = Date.now()
  const config = getConfig()

  try {
    for await (const token of chatStream(
      ctx.systemPrompt,
      history,
      userMessage,
      ctx.model,
      ctx.temperature,
    )) {
      full += token
      chunkBuffer += token
      const now = Date.now()
      const enoughTokens = chunkBuffer.length >= config.streamChunkSize
      const enoughTime = (now - lastUpdate) >= config.streamThrottleMs

      if (enoughTokens || enoughTime) {
        await updateCardContent(cardMsgId, full + '\n\n---\n▋')
        chunkBuffer = ''
        lastUpdate = now
      }
    }

    // 最终更新
    await updateCardContent(cardMsgId, full)
    addMessage(ctx.id!, 'assistant', full)
  } catch (err) {
    console.error('[AI] 对话失败:', err)
    await updateCardContent(cardMsgId, 'AI 回复失败，请稍后重试')
  }
}

// 也导出给 webhook handler 用
export function getValidModels(): string[] {
  return [...VALID_MODELS]
}
