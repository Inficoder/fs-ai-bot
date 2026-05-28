// 直接 WS 测试 - 从 SQLite 读取配置
import initSqlJs from 'sql.js'
import fs from 'fs'
import WebSocket from 'ws'

const SQL = await initSqlJs()
const buf = fs.readFileSync('E:/cicada/FS-tools/feishu-ai/data/feishu_ai.db')
const db = new SQL.Database(buf)
const rows = db.exec("SELECT key, value FROM config")[0]?.values ?? []
const cfg = Object.fromEntries(rows.map(([k, v]) => [k, v]))

console.log('AppID:', cfg.feishuAppId?.substring(0, 15) + '...')

// 获取 WS 地址
const ep = await fetch('https://open.feishu.cn/callback/ws/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ AppID: cfg.feishuAppId, AppSecret: cfg.feishuAppSecret }),
}).then(r => r.json())

console.log('WS URL:', ep.data?.URL?.substring(0, 100))

// 连接原始的 WS
const ws = new WebSocket(ep.data.URL)

ws.on('open', () => {
  console.log('✅ WS 已连接')
  console.log('请在飞书群里 @机器人 发消息...')
})

ws.on('message', (data) => {
  const hex = Buffer.from(data).toString('hex')
  console.log('📩 收到数据 (hex):', hex.substring(0, 100))
  console.log('📩 数据长度:', Buffer.from(data).length, 'bytes')
})

ws.on('error', (e) => console.error('❌ WS 错误:', e.message))
ws.on('close', (code, reason) => console.log('🔒 WS 已关闭, code:', code, 'reason:', reason?.toString()))

// 等 20 秒
console.log('监听中（20秒），请发消息...')
await new Promise(r => setTimeout(r, 20000))
ws.close()
console.log('测试完成')
process.exit(0)
