#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { Command } from 'commander'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(__dirname, '..', 'data')
const PID_PATH = path.join(DATA_DIR, 'fsbot.pid')
const LOG_PATH = path.join(DATA_DIR, 'fsbot.log')

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
  .name('fsbot')
  .description('IM AI 辅助平台 — 多平台即时通讯 AI 机器人')
  .version('0.1.0')

program
  .command('start')
  .description('启动 AI 服务')
  .option('-p, --port <port>', 'HTTP 服务端口')
  .option('-d, --daemon', '后台运行')
  .action(async (options) => {
    const existingPid = readPid()
    if (existingPid && isRunning(existingPid)) {
      console.log('服务已在运行 (PID: ' + existingPid + ')')
      return
    }

    if (options.daemon) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
      const logFd = fs.openSync(LOG_PATH, 'a')
      const childArgs = process.argv.slice(1).filter(a => a !== '-d' && a !== '--daemon')
      const child = spawn(process.execPath, childArgs, {
        detached: true,
        stdio: ['ignore', logFd, logFd],
      })
      fs.closeSync(logFd)
      child.unref()
      console.log('服务已后台启动 (PID: ' + child.pid + ')')
      console.log('日志文件: ' + LOG_PATH)
      return
    }

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

program
  .command('logs')
  .description('查看服务日志')
  .option('-f, --follow', '实时跟踪')
  .option('-n, --lines <count>', '显示行数', '50')
  .action((options) => {
    if (!fs.existsSync(LOG_PATH)) {
      console.log('暂无日志')
      return
    }

    const tail = (n: number) => {
      const content = fs.readFileSync(LOG_PATH, 'utf-8')
      const lines = content.split('\n').filter(Boolean)
      console.log(lines.slice(-n).join('\n'))
    }

    tail(parseInt(options.lines))

    if (options.follow) {
      console.log('[等待新日志... Ctrl+C 退出]')
      let lastSize = fs.statSync(LOG_PATH).size
      const watcher = fs.watch(LOG_PATH, () => {
        try {
          const stat = fs.statSync(LOG_PATH)
          if (stat.size > lastSize) {
            const stream = fs.createReadStream(LOG_PATH, { start: lastSize, encoding: 'utf-8' })
            stream.on('data', (chunk: string) => process.stdout.write(chunk))
            lastSize = stat.size
          }
        } catch { /* file removed */ }
      })
      process.on('SIGINT', () => { watcher.close(); process.exit(0) })
    }
  })

program.parse(process.argv)
