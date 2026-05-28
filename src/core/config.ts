import { DEFAULT_CONFIG, type AppConfig } from '../types/index.js'
import { queryOne, getDb, saveToDisk } from '../db/index.js'

let _current: AppConfig = { ...DEFAULT_CONFIG }

const CONFIG_KEYS: Record<string, keyof AppConfig> = {
  feishu_app_id: 'feishuAppId',
  feishu_app_secret: 'feishuAppSecret',
  feishu_verification_token: 'feishuVerificationToken',
  deepseek_api_key: 'deepseekApiKey',
  deepseek_base_url: 'deepseekBaseUrl',
  deepseek_model: 'deepseekModel',
  serp_api_key: 'serpApiKey',
  feishu_base_url: 'feishuBaseUrl',
  stream_throttle_ms: 'streamThrottleMs',
  stream_chunk_size: 'streamChunkSize',
  api_timeout: 'apiTimeout',
  chat_timeout: 'chatTimeout',
  port: 'port',
}

const VALUE_TYPES: Record<string, 'string' | 'number'> = {
  feishu_app_id: 'string',
  feishu_app_secret: 'string',
  feishu_verification_token: 'string',
  deepseek_api_key: 'string',
  deepseek_base_url: 'string',
  deepseek_model: 'string',
  serp_api_key: 'string',
  feishu_base_url: 'string',
  stream_throttle_ms: 'number',
  stream_chunk_size: 'number',
  api_timeout: 'number',
  chat_timeout: 'number',
  port: 'number',
}

function fromDb(): AppConfig {
  const config = { ...DEFAULT_CONFIG }
  for (const [dbKey, propKey] of Object.entries(CONFIG_KEYS)) {
    const row = queryOne<{ value: string }>('SELECT value FROM config WHERE key = ?', [dbKey])
    if (row) {
      const type = VALUE_TYPES[dbKey] ?? 'string'
      const record = config as unknown as Record<string, unknown>
      record[propKey] = type === 'number' ? Number(row.value) : row.value
    }
  }
  return config
}

function toDb(config: AppConfig): void {
  const db = getDb()
  for (const [dbKey, propKey] of Object.entries(CONFIG_KEYS)) {
    const record = config as unknown as Record<string, unknown>
    const value = String(record[propKey] ?? '')
    const existing = queryOne<{ value: string }>('SELECT value FROM config WHERE key = ?', [dbKey])
    if (existing) {
      db.run('UPDATE config SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?', [value, dbKey])
    } else {
      db.run('INSERT INTO config (key, value) VALUES (?, ?)', [dbKey, value])
    }
  }
  saveToDisk(db)
}

export function loadConfig(): AppConfig {
  _current = fromDb()
  return _current
}

export function getConfig(): AppConfig {
  return { ..._current }
}

export function updateConfig(partial: Partial<AppConfig>): AppConfig {
  // 忽略空字符串的敏感字段，保留已存储的值
  const cleaned = { ...partial }
  for (const k of ['feishuAppSecret', 'deepseekApiKey', 'serpApiKey'] as const) {
    if (cleaned[k] === '' || cleaned[k] === '****') delete cleaned[k]
  }
  _current = { ..._current, ...cleaned }
  toDb(_current)
  return getConfig()
}

export { AppConfig }
