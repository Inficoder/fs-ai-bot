import { getConfig } from '../config.js'

const SEARCH_MAX_RESULTS = 5
const SERPAPI_URL = 'https://serpapi.com/search'

interface SerpResult {
  title: string
  link: string
  snippet: string
}

export async function searchWeb(query: string): Promise<string> {
  const config = getConfig()
  if (!config.serpApiKey) {
    console.warn('[WebSearch] SerpAPI Key 未配置')
    return ''
  }

  try {
    const params = new URLSearchParams({
      engine: 'google',
      q: query,
      api_key: config.serpApiKey,
      num: String(SEARCH_MAX_RESULTS),
      hl: 'zh-CN',
    })

    const resp = await fetch(`${SERPAPI_URL}?${params}`, {
      headers: { 'Accept': 'application/json' },
    })

    if (!resp.ok) {
      console.warn('[WebSearch] SerpAPI 请求失败:', resp.status)
      return ''
    }

    const data = await resp.json() as {
      organic_results?: Array<{ title: string; link: string; snippet: string }>
      error?: string
    }

    if (data.error) {
      console.warn('[WebSearch] SerpAPI 错误:', data.error)
      return ''
    }

    const results: SerpResult[] = (data.organic_results ?? [])
      .slice(0, SEARCH_MAX_RESULTS)
      .map(r => ({
        title: r.title ?? '',
        link: r.link ?? '',
        snippet: r.snippet ?? '',
      }))

    if (results.length === 0) {
      console.log('[WebSearch] 无搜索结果')
      return ''
    }

    return results
      .map((r, i) => `${i + 1}. ${r.title}\n   ${r.link}\n   ${r.snippet}`)
      .join('\n\n')
  } catch (err) {
    console.error('[WebSearch] 搜索失败:', err)
    return ''
  }
}
