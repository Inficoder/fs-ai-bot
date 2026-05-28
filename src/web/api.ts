import type { AppConfig, ServiceStatus, Context } from '@shared/types/index'

const BASE = ''

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const resp = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json() as Promise<T>
}

export type { AppConfig, ServiceStatus }
export type ContextRecord = Context
export interface MessageRecord {
  id: number
  contextId: number
  role: string
  content: string
  createdAt: string
}

export async function getConfig(): Promise<AppConfig> {
  const res = await request<{ code: number; data: AppConfig }>('/api/config')
  return res.data
}

export async function saveConfig(config: Partial<AppConfig>): Promise<AppConfig> {
  const res = await request<{ code: number; data: AppConfig }>('/api/config', {
    method: 'PUT',
    body: JSON.stringify(config),
  })
  return res.data
}

export async function getStatus(): Promise<ServiceStatus> {
  const res = await request<{ code: number; data: ServiceStatus }>('/api/status')
  return res.data
}

export async function getContexts(): Promise<Array<ContextRecord & { messageCount: number }>> {
  const res = await request<{ code: number; data: Array<ContextRecord & { messageCount: number }> }>('/api/status/contexts')
  return res.data
}

export async function getDeletedContexts(): Promise<Array<ContextRecord & { messageCount: number }>> {
  const res = await request<{ code: number; data: Array<ContextRecord & { messageCount: number }> }>('/api/status/contexts/deleted')
  return res.data
}
