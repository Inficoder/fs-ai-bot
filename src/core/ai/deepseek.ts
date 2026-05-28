import { getConfig } from '../config.js'

function buildMessages(
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  userMessage: string,
): Array<{ role: string; content: string }> {
  const messages: Array<{ role: string; content: string }> = []
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
  messages.push(...history)
  messages.push({ role: 'user', content: userMessage })
  return messages
}

export async function* chatStream(
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  userMessage: string,
  model?: string,
  temperature?: number,
): AsyncGenerator<string> {
  const config = getConfig()
  const apiUrl = `${config.deepseekBaseUrl}/chat/completions`

  const body = {
    model: model || config.deepseekModel,
    temperature: temperature ?? 1.0,
    stream: true,
    messages: buildMessages(systemPrompt, history, userMessage),
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.deepseekApiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`DeepSeek API 错误 ${response.status}: ${text}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('响应体不可读')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data:')) continue
      const data = line.slice(5).trim()
      if (!data || data === '[DONE]') continue

      try {
        const chunk = JSON.parse(data)
        const content = chunk?.choices?.[0]?.delta?.content
        if (content) yield content
      } catch {
        // skip parse errors for partial lines
      }
    }
  }
}

export async function chat(
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  userMessage: string,
  model?: string,
  temperature?: number,
): Promise<string> {
  let full = ''
  for await (const token of chatStream(systemPrompt, history, userMessage, model, temperature)) {
    full += token
  }
  return full
}
