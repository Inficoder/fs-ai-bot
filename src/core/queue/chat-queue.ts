import { getConfig } from '../config.js'

type TaskFn = () => Promise<void>

class ChatQueue {
  private queues = new Map<string, Array<TaskFn>>()
  private workers = new Map<string, Promise<void>>()
  private drainResolvers = new Map<string, (() => void)[]>()

  enqueue(chatId: string, task: TaskFn): void {
    if (!this.queues.has(chatId)) {
      this.queues.set(chatId, [])
    }
    this.queues.get(chatId)!.push(task)
    if (!this.workers.has(chatId)) {
      this.startWorker(chatId)
    }
  }

  private async startWorker(chatId: string): Promise<void> {
    const config = getConfig()
    const timeout = config.chatTimeout * 1000

    const worker = this.runWorker(chatId, timeout)
    this.workers.set(chatId, worker)
    await worker
  }

  private async runWorker(chatId: string, timeout: number): Promise<void> {
    while (true) {
      const queue = this.queues.get(chatId)
      if (!queue || queue.length === 0) {
        // Notify drain listeners
        const resolvers = this.drainResolvers.get(chatId) ?? []
        resolvers.forEach(r => r())
        this.workers.delete(chatId)
        this.queues.delete(chatId)
        return
      }

      const task = queue.shift()!
      try {
        await Promise.race([
          task(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`任务超时 (chat_id=${chatId})`)), timeout)
          ),
        ])
      } catch (err) {
        console.error(`[ChatQueue] 队列任务异常 (chat_id=${chatId}):`, err)
      }
    }
  }

  async waitForDrain(chatId: string): Promise<void> {
    const queue = this.queues.get(chatId)
    if (!queue || queue.length === 0) return

    return new Promise<void>((resolve) => {
      const resolvers = this.drainResolvers.get(chatId) ?? []
      resolvers.push(resolve)
      this.drainResolvers.set(chatId, resolvers)
    })
  }

  activeCount(): number {
    return this.queues.size
  }
}

export const chatQueue = new ChatQueue()
