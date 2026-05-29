import { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Tag, Spin, Table, Tabs, Typography, theme, Alert } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  TeamOutlined,
  MessageOutlined,
  ApiOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { getStatus, getContexts, getDeletedContexts, type ServiceStatus, type ContextRecord } from '../api'

const { Title } = Typography

type ContextRow = ContextRecord & { messageCount: number }

export default function Dashboard() {
  const [status, setStatus] = useState<ServiceStatus | null>(null)
  const [contexts, setContexts] = useState<ContextRow[]>([])
  const [deleted, setDeleted] = useState<ContextRow[]>([])
  const [loading, setLoading] = useState(true)
  const { token } = theme.useToken()

  useEffect(() => {
    Promise.all([getStatus(), getContexts(), getDeletedContexts()])
      .then(([s, c, d]) => { setStatus(s); setContexts(c); setDeleted(d) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '120px auto' }} />

  const activeColumns: ColumnsType<ContextRow> = [
    { title: '群名称', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: '模型', dataIndex: 'model', key: 'model', width: 160 },
    { title: '消息数', dataIndex: 'messageCount', key: 'messageCount', width: 90, align: 'center' },
    {
      title: '搜索', dataIndex: 'searchEnabled', key: 'searchEnabled', width: 70, align: 'center',
      render: (v: boolean) => v
        ? <Tag color="blue" icon={<SearchOutlined />}>ON</Tag>
        : <Tag>OFF</Tag>,
    },
    { title: '最近更新', dataIndex: 'updatedAt', key: 'updatedAt', width: 170 },
  ]

  const deletedColumns: ColumnsType<ContextRow> = [
    { title: '群名称', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: '解散时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 180 },
  ]

  const statCardStyle = { height: '100%' }

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>概览</Title>

      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card hoverable style={statCardStyle}>
            <Statistic
              title="服务状态"
              value={status?.running ? '运行中' : '已停止'}
              valueStyle={{ color: status?.running ? token.colorSuccess : token.colorError, fontSize: 20 }}
              prefix={status?.running
                ? <CheckCircleOutlined style={{ color: token.colorSuccess }} />
                : <CloseCircleOutlined style={{ color: token.colorError }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable style={statCardStyle}>
            <Statistic
              title="WS 连接"
              value={status?.wsConnected ? '已连接' : '未连接'}
              valueStyle={{ color: status?.wsConnected ? token.colorSuccess : token.colorError, fontSize: 20 }}
              prefix={status?.wsConnected
                ? <CheckCircleOutlined style={{ color: token.colorSuccess }} />
                : <CloseCircleOutlined style={{ color: token.colorError }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable style={statCardStyle}>
            <Statistic
              title="活跃群组"
              value={status?.activeChats ?? 0}
              prefix={<TeamOutlined style={{ color: token.colorPrimary }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable style={statCardStyle}>
            <Statistic
              title="总消息数"
              value={status?.totalMessages ?? 0}
              prefix={<MessageOutlined style={{ color: token.colorPrimary }} />}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 16 }}>
        <Tabs
          defaultActiveKey="active"
          items={[
            {
              key: 'active',
              label: `活跃群组 (${contexts.length})`,
              children: (
                <Table
                  columns={activeColumns}
                  dataSource={contexts}
                  rowKey="id"
                  size="middle"
                  pagination={false}
                  locale={{ emptyText: '暂无活跃群组' }}
                />
              ),
            },
            {
              key: 'deleted',
              label: `已解散 (${deleted.length})`,
              children: (
                <Table
                  columns={deletedColumns}
                  dataSource={deleted}
                  rowKey="id"
                  size="middle"
                  pagination={false}
                  locale={{ emptyText: '暂无已解散群组' }}
                />
              ),
            },
          ]}
        />
      </Card>

      <div style={{ marginTop: 16 }}>
        {status?.configValid ? (
          <Alert
            type="success"
            showIcon
            icon={<ApiOutlined />}
            message="配置已完成"
            description="飞书和 DeepSeek API 均已配置，服务正常运行"
          />
        ) : (
          <Alert
            type="warning"
            showIcon
            icon={<ApiOutlined />}
            message="配置未完成"
            description="请前往「配置管理」页面填写飞书 App ID / Secret 和 DeepSeek API Key"
          />
        )}
      </div>
    </div>
  )
}
