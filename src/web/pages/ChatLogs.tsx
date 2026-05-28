import { useEffect, useState } from 'react'
import { Spin } from 'antd'
import { getStatus, type ServiceStatus } from '../api'

export default function ChatLogs() {
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<ServiceStatus | null>(null)

  useEffect(() => {
    getStatus()
      .then(setStatus)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />

  return (
    <div>
      <h3>对话概览</h3>
      <p>活跃群组: {status?.activeChats ?? 0} | 总消息数: {status?.totalMessages ?? 0}</p>
      <p style={{ color: '#999' }}>详细对话日志功能开发中...</p>
    </div>
  )
}
