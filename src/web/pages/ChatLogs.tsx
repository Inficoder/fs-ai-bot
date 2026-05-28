import { useState, useEffect } from 'react'
import { Result, Spin, Typography, Card, Statistic, Row, Col, theme } from 'antd'
import { MessageOutlined, TeamOutlined } from '@ant-design/icons'
import { getStatus, type ServiceStatus } from '../api'

const { Title } = Typography

export default function ChatLogs() {
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<ServiceStatus | null>(null)
  const { token } = theme.useToken()

  useEffect(() => {
    getStatus()
      .then(setStatus)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '120px auto' }} />

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>对话日志</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8}>
          <Card>
            <Statistic title="活跃群组" value={status?.activeChats ?? 0} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card>
            <Statistic title="总消息数" value={status?.totalMessages ?? 0} prefix={<MessageOutlined />} />
          </Card>
        </Col>
      </Row>

      <Card>
        <Result
          icon={<MessageOutlined style={{ color: token.colorPrimary }} />}
          title="详细日志即将上线"
          subTitle="按群组查看完整对话历史、搜索消息内容、导出聊天记录等功能开发中"
        />
      </Card>
    </div>
  )
}
