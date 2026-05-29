# imai

多平台即时通讯 AI 机器人，支持飞书 + DeepSeek，流式卡片回复。

## 快速开始

```bash
npm install -g imai
imai start
```

浏览器打开 `http://localhost:8000` 填写飞书和 DeepSeek 配置。

---

## 环境要求

| 依赖 | 版本 |
|------|------|
| Node.js | >= 20 |
| npm | >= 9 |

```bash
node --version
npm --version
```

---

## 从源码安装

```bash
git clone https://github.com/Inficoder/fs-ai-bot.git
cd fs-ai-bot
npm install
npm run build
npm run build:web
npm start
```

---

## 飞书应用配置

### 1. 创建应用

1. 打开 [飞书开放平台](https://open.feishu.cn/) → 开发者后台
2. 创建「企业自建应用」，填写名称和描述

### 2. 获取凭证

在「凭证与基础信息」页面记下 **App ID** 和 **App Secret**。

### 3. 添加机器人能力

「添加能力」→「机器人」→ 添加。

### 4. 配置权限

搜索并开启以下权限：

| 权限 | 说明 |
|------|------|
| `im:message` | 获取群聊消息 |
| `im:message:send_as_bot` | 以机器人身份发送消息 |
| `im:chat` | 获取群组信息 |
| `im:chat:create` | 创建群组（`/create` 命令需要） |

### 5. 配置事件

「事件与回调」→ 选择 **「长连接」模式** → 添加事件 **「接收消息」** (`im.message.receive_v1`)。

> 长连接模式不需要公网 HTTPS，适合内网部署。

### 6. 发布应用

「版本管理与发布」→ 创建版本 → 提交审核 → 发布。

### 7. 添加机器人到群

飞书客户端 → 群设置 → 群机器人 → 添加你的应用。

---

## DeepSeek API 申请

1. 访问 [DeepSeek 开放平台](https://platform.deepseek.com/)
2. 进入 **API Keys** 页面，创建 Key（以 `sk-` 开头）

---

## Web 配置页面

服务启动后访问 `http://localhost:8000`：

| 配置项 | 必填 | 说明 |
|--------|------|------|
| App ID | 是 | 飞书开放平台 → 凭证与基础信息 |
| App Secret | 是 | 飞书开放平台 → 凭证与基础信息 |
| Verification Token | 否 | Webhook 校验 token，长连接模式可留空 |
| API 地址（飞书） | 否 | 默认 `https://open.feishu.cn/open-apis` |
| API Key | 是 | DeepSeek 平台申请的 Key |
| API 地址（DeepSeek） | 否 | 默认 `https://api.deepseek.com` |
| 模型 | 否 | 默认 `deepseek-v4-flash`，可选 `deepseek-reasoner` 等 |
| SerpAPI Key | 否 | 联网搜索需要，[serpapi.com](https://serpapi.com) |
| 刷新间隔 | 否 | 流式卡片更新间隔(ms)，默认 500 |
| HTTP 端口 | 否 | 默认 8000 |

保存后飞书连接自动重连，无需手动重启。

---

## CLI 命令

```bash
imai start              # 启动服务（前台）
imai start -d           # 后台启动
imai start -p 8080      # 指定端口
imai stop               # 停止服务
imai status             # 查看状态
imai logs               # 查看最近 50 行日志
imai logs -f            # 实时跟踪日志
imai logs -n 100        # 查看最近 100 行
```

---

## 群内命令

| 命令 | 说明 |
|------|------|
| `@机器人 你的问题` | AI 对话，流式卡片回复 |
| `/help` | 显示帮助 |
| `/system <提示词>` | 设置 AI 角色 |
| `/model [名称]` | 查看/切换模型 |
| `/temp <0.0-2.0>` | 调整创意度 |
| `/search [on\|off]` | 开启/关闭智能搜索 |
| `/mode [all\|mention]` | 切换响应模式（all=全部消息，mention=仅@） |
| `/create <名称>` | 创建新群聊 |
| `/reset` | 清空对话历史 |
| `/list` | 列出所有活跃对话 |
| `/note <内容>` | 添加备注 |

---

## 流式回复

AI 回复以消息卡片形式逐段展示：发送后立即出现「思考中...」卡片 → 内容逐步更新 → 完成后显示完整回复。

## 智能搜索

开启 `/search on` 后，AI 自动联网检索（需要配置 SerpAPI Key）并结合搜索结果回答，适用于需要实时信息的场景。

---

## 常见问题

**Q: 群内 @机器人 没有响应？**  
确认应用已发布、已添加到群、事件配置已保存。

**Q: 如何修改端口？**  
Web 配置页面修改或 `imai start -p 8080`。

**Q: 如何查看日志？**  
前台运行时直接看控制台输出。后台运行时日志写入 `data/imai.log`，可用 `imai logs` 或 `imai logs -f` 查看。
