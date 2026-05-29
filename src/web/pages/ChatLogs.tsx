import { useState, useEffect } from 'react'
import { Card, Spin, Typography, Row, Col, Statistic, theme } from 'antd'
import { MessageOutlined, TeamOutlined, InboxOutlined } from '@ant-design/icons'
import { getStatus, type ServiceStatus } from '../api'

const { Title, Paragraph } = Typography

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
          <Card hoverable>
            <Statistic title="活跃群组" value={status?.activeChats ?? 0} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card hoverable>
            <Statistic title="总消息数" value={status?.totalMessages ?? 0} prefix={<MessageOutlined />} />
          </Card>
        </Col>
      </Row>

      <Card>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <InboxOutlined style={{ fontSize: 56, color: token.colorBorderSecondary }} />
          <Title level={5} style={{ marginTop: 16 }}>详细日志即将上线</Title>
          <Paragraph type="secondary">
            按群组查看完整对话历史、搜索消息内容、导出聊天记录等功能开发中
          </Paragraph>
        </div>
      </Card>
    </div>
  )
}
