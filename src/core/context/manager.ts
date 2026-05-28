import { execute, insert, queryAll, queryOne } from '../../db/index.js'
import { getConfig } from '../config.js'
import type { Context, Message } from '../../types/index.js'

const HISTORY_LIMIT = 50

// 共享的上下文列别名（snake_case → camelCase）
const CONTEXT_COLS = `id, chat_id AS chatId, name, system_prompt AS systemPrompt,
  model, temperature, search_enabled AS searchEnabled, deleted,
  created_at AS createdAt, updated_at AS updatedAt`

function ctxCols(prefix?: string): string {
  if (!prefix) return CONTEXT_COLS
  // Add table prefix to each column reference (but not to AS aliases)
  return CONTEXT_COLS.replace(/(^|,\s*)([a-z_]+)(?=\s|,|$)/g, `$1${prefix}.$2`)
}

export function createContext(chatId: string, name = '默认对话'): Context {
  const id = insert(
    'INSERT INTO contexts (chat_id, name, model) VALUES (?, ?, ?)',
    [chatId, name, getConfig().deepseekModel],
  )
  const ctx = queryOne<Context>(
    `SELECT ${CONTEXT_COLS} FROM contexts WHERE id = ?`,
    [id],
  )
  if (!ctx) throw new Error('创建上下文失败')
  return ctx
}

export function getContext(chatId: string): Context | null {
  return queryOne<Context>(
    `SELECT ${CONTEXT_COLS} FROM contexts WHERE chat_id = ? AND deleted = 0`,
    [chatId],
  ) ?? null
}

export function getOrCreateContext(chatId: string): Context {
  const active = getContext(chatId)
  if (active) return active

  // 如果存在已删除的上下文，恢复它
  const deleted = queryOne<Context>(
    `SELECT ${CONTEXT_COLS} FROM contexts WHERE chat_id = ? AND deleted = 1`,
    [chatId],
  )
  if (deleted) {
    restoreContext(chatId)
    return getContext(chatId)!
  }

  return createContext(chatId)
}

export function onChatDisbanded(chatId: string, source = 'unknown'): void {
  console.log(`[Context] 群组已解散 (${source}):`, chatId)
  deleteContext(chatId)
}

export function deleteContext(chatId: string): boolean {
  const affected = execute(
    'UPDATE contexts SET deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE chat_id = ? AND deleted = 0',
    [chatId],
  )
  return affected > 0
}

export function restoreContext(chatId: string): boolean {
  const affected = execute(
    'UPDATE contexts SET deleted = 0, updated_at = CURRENT_TIMESTAMP WHERE chat_id = ? AND deleted = 1',
    [chatId],
  )
  return affected > 0
}

export function resetContext(chatId: string): boolean {
  const ctx = queryOne<{ id: number }>('SELECT id FROM contexts WHERE chat_id = ? AND deleted = 0', [chatId])
  if (!ctx) return false
  execute('DELETE FROM messages WHERE context_id = ?', [ctx.id])
  execute('UPDATE contexts SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [ctx.id])
  return true
}

export function listContexts(): Array<Context & { messageCount: number }> {
  return queryAll<Context & { messageCount: number }>(
    `SELECT ${ctxCols('c')},
            COALESCE((SELECT COUNT(*) FROM messages m WHERE m.context_id = c.id), 0) AS messageCount
     FROM contexts c
     WHERE c.deleted = 0
     ORDER BY c.updated_at DESC`,
  )
}

export function listDeletedContexts(): Array<Context & { messageCount: number }> {
  return queryAll<Context & { messageCount: number }>(
    `SELECT ${ctxCols('c')},
            COALESCE((SELECT COUNT(*) FROM messages m WHERE m.context_id = c.id), 0) AS messageCount
     FROM contexts c
     WHERE c.deleted = 1
     ORDER BY c.updated_at DESC`,
  )
}

export function addMessage(contextId: number, role: string, content: string): Message {
  const id = insert(
    'INSERT INTO messages (context_id, role, content) VALUES (?, ?, ?)',
    [contextId, role, content],
  )
  execute('UPDATE contexts SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [contextId])
  const msg = queryOne<Message>(
    'SELECT id, context_id AS contextId, role, content, created_at AS createdAt FROM messages WHERE id = ?',
    [id],
  )
  if (!msg) throw new Error('添加消息失败')
  return msg
}

export function getMessages(contextId: number): Array<{ role: string; content: string }> {
  return queryAll<{ role: string; content: string }>(
    `SELECT role, content FROM (
       SELECT role, content, created_at FROM messages
       WHERE context_id = ?
       ORDER BY created_at DESC
       LIMIT ?
     ) ORDER BY created_at ASC`,
    [contextId, HISTORY_LIMIT],
  )
}

export function updateSystemPrompt(contextId: number, prompt: string): void {
  execute('UPDATE contexts SET system_prompt = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
    prompt,
    contextId,
  ])
}

export function updateModel(contextId: number, model: string): void {
  execute('UPDATE contexts SET model = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
    model,
    contextId,
  ])
}

export function updateTemperature(contextId: number, temperature: number): void {
  execute(
    'UPDATE contexts SET temperature = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [temperature, contextId],
  )
}

export function updateSearch(contextId: number, enabled: boolean): void {
  execute(
    'UPDATE contexts SET search_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [enabled ? 1 : 0, contextId],
  )
}
