// 飞书连通性测试脚本
const configResp = await fetch('http://localhost:8000/api/config')
const config = (await configResp.json()).data

// 1. 获取 tenant token
const tokenResp = await fetch(`${config.feishuBaseUrl}/auth/v3/tenant_access_token/internal`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ app_id: config.feishuAppId, app_secret: config.feishuAppSecret }),
})
const tokenData = await tokenResp.json()
if (tokenData.code !== 0) {
  console.error('获取 token 失败:', JSON.stringify(tokenData))
  process.exit(1)
}
const token = tokenData.tenant_access_token
console.log('✅ 获取 token 成功')

// 2. 列出机器人所在的群
const chatsResp = await fetch(`${config.feishuBaseUrl}/im/v1/chats?page_size=20`, {
  headers: { Authorization: `Bearer ${token}` },
})
const chatsData = await chatsResp.json()
if (chatsData.code !== 0) {
  console.error('获取群列表失败:', JSON.stringify(chatsData))
  process.exit(1)
}
const items = chatsData.data?.items ?? []
console.log(`📋 机器人所在群数: ${items.length}`)
for (const chat of items) {
  console.log(`  - ${chat.name} (${chat.chat_id}) 成员:${chat.member_count}`)
}

// 3. 如果有群，尝试发一条测试消息
if (items.length > 0) {
  const chat = items[0]
  const msgResp = await fetch(`${config.feishuBaseUrl}/im/v1/messages?receive_id_type=chat_id`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      receive_id: chat.chat_id,
      msg_type: 'text',
      content: JSON.stringify({ text: '🤖 机器人连通性测试 OK' }),
    }),
  })
  const msgData = await msgResp.json()
  if (msgData.code === 0) {
    console.log('✅ 测试消息发送成功')
  } else {
    console.error('❌ 发送消息失败:', JSON.stringify(msgData))
  }
} else {
  console.log('⚠️ 机器人没有加入任何群')
}

// 4. 测试卡片消息
if (items.length > 0) {
  const chat = items[0]
  const cardResp = await fetch(`${config.feishuBaseUrl}/im/v1/messages?receive_id_type=chat_id`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      receive_id: chat.chat_id,
      msg_type: 'interactive',
      content: JSON.stringify({
        config: { wide_screen_mode: true },
        header: { title: { content: '测试', tag: 'plain_text' }, template: 'green' },
        elements: [{ tag: 'markdown', content: '机器人可以正常发送卡片消息 ✅' }],
      }),
    }),
  })
  const cardData = await cardResp.json()
  if (cardData.code === 0) {
    console.log('✅ 卡片消息发送成功')
  } else {
    console.error('❌ 卡片消息失败:', JSON.stringify(cardData))
  }
}
