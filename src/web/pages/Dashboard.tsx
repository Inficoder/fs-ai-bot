import { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Tag, Spin, Table, Tabs } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  TeamOutlined,
  MessageOutlined,
} from '@ant-design/icons'
import { getStatus, getContexts, getDeletedContexts, type ServiceStatus, type ContextRecord } from '../api'

type ContextRow = ContextRecord & { messageCount: number }

export default function Dashboard() {
  const [status, setStatus] = useState<ServiceStatus | null>(null)
  const [contexts, setContexts] = useState<ContextRow[]>([])
  const [deleted, setDeleted] = useState<ContextRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getStatus(), getContexts(), getDeletedContexts()])
      .then(([s, c, d]) => { setStatus(s); setContexts(c); setDeleted(d) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />

  const activeColumns: ColumnsType<ContextRow> = [
    { title: '群名称', dataIndex: 'name', key: 'name' },
    { title: '模型', dataIndex: 'model', key: 'model' },
    { title: '消息数', dataIndex: 'messageCount', key: 'messageCount', width: 100 },
    { title: '搜索', dataIndex: 'searchEnabled', key: 'searchEnabled', width: 80,
      render: (v: boolean) => v ? <Tag color="blue">ON</Tag> : <Tag>OFF</Tag> },
    { title: '最近更新', dataIndex: 'updatedAt', key: 'updatedAt', width: 180 },
  ]

  const deletedColumns: ColumnsType<ContextRow> = [
    { title: '群名称', dataIndex: 'name', key: 'name' },
    { title: '解散时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 180 },
  ]

  return (
    <div>
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic title="服务状态" value={status?.running ? '运行中' : '已停止'}
              valueStyle={{ color: status?.running ? '#52c41a' : '#ff4d4f' }}
              prefix={status?.running ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="飞书连接" value={status?.wsConnected ? '已连接' : '未连接'}
              valueStyle={{ color: status?.wsConnected ? '#52c41a' : '#ff4d4f' }}
              prefix={status?.wsConnected ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="活跃群组" value={status?.activeChats ?? 0}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="总消息数" value={status?.totalMessages ?? 0}
              prefix={<MessageOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 16 }}>
        <Tabs defaultActiveKey="active" items={[
          {
            key: 'active',
            label: `活跃群组 (${contexts.length})`,
            children: (
              <Table columns={activeColumns} dataSource={contexts} rowKey="id" size="small"
                pagination={false} locale={{ emptyText: '暂无活跃群组' }} />
            ),
          },
          {
            key: 'deleted',
            label: `已解散 (${deleted.length})`,
            children: (
              <Table columns={deletedColumns} dataSource={deleted} rowKey="id" size="small"
                pagination={false} locale={{ emptyText: '暂无已解散群组' }} />
            ),
          },
        ]} />
      </Card>

      <Card style={{ marginTop: 16 }}>
        <h3>配置状态</h3>
        {status?.configValid ? (
          <Tag color="green">配置已完成</Tag>
        ) : (
          <Tag color="red">配置未完成 — 请前往「配置管理」页面填写飞书和 AI 参数</Tag>
        )}
      </Card>
    </div>
  )
}
