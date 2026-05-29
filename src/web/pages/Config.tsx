import { useEffect, useState } from 'react'
import { Form, Input, InputNumber, Button, message, Spin, Space, theme, Collapse } from 'antd'
import {
  SaveOutlined,
  ApiOutlined,
  RobotOutlined,
  SearchOutlined,
  SettingOutlined,
  CloudServerOutlined,
} from '@ant-design/icons'
import { getConfig, saveConfig, type AppConfig } from '../api'

const MASKED = '****'

function unmask(value: string): string {
  return value === MASKED ? '' : value
}

export default function Config() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { token } = theme.useToken()

  useEffect(() => {
    getConfig()
      .then((config) => {
        form.setFieldsValue({
          feishuAppId: config.feishuAppId,
          feishuAppSecret: unmask(config.feishuAppSecret),
          feishuVerificationToken: config.feishuVerificationToken,
          feishuBaseUrl: config.feishuBaseUrl,
          deepseekApiKey: unmask(config.deepseekApiKey),
          deepseekBaseUrl: config.deepseekBaseUrl,
          deepseekModel: config.deepseekModel,
          serpApiKey: unmask(config.serpApiKey),
          streamThrottleMs: config.streamThrottleMs,
          streamChunkSize: config.streamChunkSize,
          apiTimeout: config.apiTimeout,
          chatTimeout: config.chatTimeout,
          port: config.port,
        })
      })
      .finally(() => setLoading(false))
  }, [form])

  const handleSave = async (values: Record<string, unknown>) => {
    setSaving(true)
    try {
      const cleaned = { ...values } as Record<string, unknown>
      for (const k of ['feishuAppSecret', 'deepseekApiKey', 'serpApiKey']) {
        if (!cleaned[k]) delete cleaned[k]
      }
      await saveConfig(cleaned as Partial<AppConfig>)
      message.success('配置已保存')
      form.setFieldsValue({ feishuAppSecret: '', deepseekApiKey: '', serpApiKey: '' })
    } catch {
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '120px auto' }} />

  const iconStyle = { color: token.colorPrimary }

  const collapseItems = [
    {
      key: 'feishu',
      label: (
        <Space>
          <ApiOutlined style={iconStyle} />
          <span>Feishu 配置</span>
        </Space>
      ),
      children: (
        <>
          <Form.Item name="feishuAppId" label="App ID" rules={[{ required: true, message: '必填' }]}
            extra="飞书开放平台 → 应用凭证 → App ID">
            <Input placeholder="cli_xxxxxxxxxxxx" />
          </Form.Item>
          <Form.Item name="feishuAppSecret" label="App Secret"
            extra="已设置时留空保持原值">
            <Input.Password placeholder="飞书开放平台 → 应用凭证 → App Secret" />
          </Form.Item>
          <Form.Item name="feishuVerificationToken" label="Verification Token"
            extra="Webhook 模式校验 token，长连接模式可留空">
            <Input placeholder="可选" />
          </Form.Item>
          <Form.Item name="feishuBaseUrl" label="API 地址">
            <Input placeholder="https://open.feishu.cn/open-apis" />
          </Form.Item>
        </>
      ),
    },
    {
      key: 'deepseek',
      label: (
        <Space>
          <RobotOutlined style={iconStyle} />
          <span>DeepSeek 配置</span>
        </Space>
      ),
      children: (
        <>
          <Form.Item name="deepseekApiKey" label="API Key"
            extra="已设置时留空保持原值">
            <Input.Password placeholder="platform.deepseek.com → API Keys" />
          </Form.Item>
          <Form.Item name="deepseekBaseUrl" label="API 地址">
            <Input placeholder="https://api.deepseek.com" />
          </Form.Item>
          <Form.Item name="deepseekModel" label="模型"
            extra="可选 deepseek-chat / deepseek-reasoner / deepseek-v4-pro / deepseek-v4-flash">
            <Input placeholder="deepseek-v4-flash" />
          </Form.Item>
        </>
      ),
    },
    {
      key: 'serp',
      label: (
        <Space>
          <SearchOutlined style={iconStyle} />
          <span>联网搜索 (SerpAPI)</span>
        </Space>
      ),
      children: (
        <Form.Item name="serpApiKey" label="API Key"
          extra="已设置时留空保持原值。前往 serpapi.com 申请">
          <Input.Password placeholder="serpapi.com → API Key" />
        </Form.Item>
      ),
    },
    {
      key: 'stream',
      label: (
        <Space>
          <SettingOutlined style={iconStyle} />
          <span>流式输出与超时</span>
        </Space>
      ),
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Form.Item name="streamThrottleMs" label="刷新间隔 (ms)" style={{ marginBottom: 0 }}>
            <InputNumber min={50} max={5000} style={{ width: 200 }} addonAfter="ms" />
          </Form.Item>
          <Form.Item name="streamChunkSize" label="累积 Token 数" style={{ marginBottom: 0 }}>
            <InputNumber min={1} max={200} style={{ width: 200 }} addonAfter="tokens" />
          </Form.Item>
          <Form.Item name="apiTimeout" label="AI HTTP 超时" style={{ marginBottom: 0 }}>
            <InputNumber min={10} max={600} style={{ width: 200 }} addonAfter="秒" />
          </Form.Item>
          <Form.Item name="chatTimeout" label="对话任务超时" style={{ marginBottom: 0 }}>
            <InputNumber min={10} max={600} style={{ width: 200 }} addonAfter="秒" />
          </Form.Item>
        </Space>
      ),
    },
    {
      key: 'server',
      label: (
        <Space>
          <CloudServerOutlined style={iconStyle} />
          <span>服务端口</span>
        </Space>
      ),
      children: (
        <Form.Item name="port" label="HTTP 端口">
          <InputNumber min={1024} max={65535} style={{ width: 200 }} addonAfter="port" />
        </Form.Item>
      ),
    },
  ]

  return (
    <div style={{ maxWidth: 720 }}>
      <Form form={form} layout="vertical" onFinish={handleSave}>
        <Collapse
          defaultActiveKey={['feishu', 'deepseek']}
          items={collapseItems}
        />

        <div style={{
          position: 'sticky',
          bottom: 24,
          marginTop: 24,
          padding: '16px 24px',
          background: token.colorBgContainer,
          borderRadius: token.borderRadiusLG,
          boxShadow: token.boxShadowSecondary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 1,
        }}>
          <span style={{ color: token.colorTextSecondary }}>
            修改后自动重连，无需手动重启
          </span>
          <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />} size="large">
            保存配置
          </Button>
        </div>
      </Form>
    </div>
  )
}
