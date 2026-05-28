// ====== 配置 ======
export interface AppConfig {
  feishuAppId: string
  feishuAppSecret: string
  feishuVerificationToken: string
  deepseekApiKey: string
  deepseekBaseUrl: string
  deepseekModel: string
  serpApiKey: string
  feishuBaseUrl: string
  streamThrottleMs: number
  streamChunkSize: number
  apiTimeout: number
  chatTimeout: number
  port: number
}

export const DEFAULT_CONFIG: AppConfig = {
  feishuAppId: '',
  feishuAppSecret: '',
  feishuVerificationToken: '',
  deepseekApiKey: '',
  deepseekBaseUrl: 'https://api.deepseek.com',
  deepseekModel: 'deepseek-chat',
  serpApiKey: '',
  feishuBaseUrl: 'https://open.feishu.cn/open-apis',
  streamThrottleMs: 500,
  streamChunkSize: 20,
  apiTimeout: 120,
  chatTimeout: 120,
  port: 8000,
}

// ====== 对话上下文 ======
export interface Context {
  id: number
  chatId: string
  name: string
  systemPrompt: string
  model: string
  temperature: number
  searchEnabled: boolean
  createdAt: string
  updatedAt: string
}

// ====== 消息 ======
export interface Message {
  id: number
  contextId: number
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: string
}

// ====== 服务状态 ======
export interface ServiceStatus {
  running: boolean
  wsConnected: boolean
  activeChats: number
  totalMessages: number
  configValid: boolean
}

// ====== 内部事件 ======
export interface ConfigChangeEvent {
  key: string
  value: string
}
