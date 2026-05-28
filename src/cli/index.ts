#!/usr/bin/env node
import { Command } from 'commander'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(__dirname, '..', 'data')
const PID_PATH = path.join(DATA_DIR, 'feishu-ai.pid')

function readPid(): number | null {
  try {
    const pid = parseInt(fs.readFileSync(PID_PATH, 'utf-8').trim(), 10)
    return isNaN(pid) ? null : pid
  } catch {
    return null
  }
}

function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

const program = new Command()

program
  .name('im-ai-bot')
  .description('IM AI 辅助平台 — 多平台即时通讯 AI 机器人')
  .version('0.1.0')

program
  .command('start')
  .description('启动 AI 服务')
  .option('-p, --port <port>', 'HTTP 服务端口')
  .action(async (options) => {
    const existingPid = readPid()
    if (existingPid && isRunning(existingPid)) {
      console.log('服务已在运行 (PID: ' + existingPid + ')')
      return
    }

    // 先写 PID 文件，避免竞态条件
    fs.mkdirSync(path.dirname(PID_PATH), { recursive: true })
    fs.writeFileSync(PID_PATH, String(process.pid))

    const { startServer } = await import('../server/index.js')
    await startServer({ port: options.port ? parseInt(options.port) : undefined })
  })

program
  .command('stop')
  .description('停止 AI 服务')
  .action(() => {
    const pid = readPid()
    if (!pid) {
      console.log('服务未在运行')
      return
    }

    try {
      process.kill(pid, 'SIGTERM')
      console.log('已停止服务 (PID: ' + pid + ')')
    } catch {
      console.log('服务未在运行')
    }

    try { fs.unlinkSync(PID_PATH) } catch { /* ok */ }
  })

program
  .command('status')
  .description('查看服务状态')
  .action(() => {
    const pid = readPid()
    if (pid && isRunning(pid)) {
      console.log('运行中 (PID: ' + pid + ')')
    } else {
      console.log('已停止')
    }
  })

program
  .command('config')
  .description('打开 Web 配置页面')
  .action(() => {
    console.log('配置页面: http://localhost:8000')
  })

program.parse(process.argv)
