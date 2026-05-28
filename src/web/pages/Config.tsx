import { useEffect, useState } from 'react'
import { Card, Form, Input, InputNumber, Button, message, Spin } from 'antd'
import { getConfig, saveConfig, type AppConfig } from '../api'

const MASKED = '****'

function unmask(value: string): string {
  return value === MASKED ? '' : value
}

export default function Config() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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
      // Remove empty secret fields so backend keeps existing values
      const cleaned = { ...values } as Record<string, unknown>
      for (const k of ['feishuAppSecret', 'deepseekApiKey', 'serpApiKey']) {
        if (!cleaned[k]) delete cleaned[k]
      }
      await saveConfig(cleaned as Partial<AppConfig>)
      message.success('配置已保存')
      // Clear secret fields to show masked state
      form.setFieldsValue({ feishuAppSecret: '', deepseekApiKey: '', serpApiKey: '' })
    } catch {
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />

  return (
    <Form form={form} layout="vertical" onFinish={handleSave} style={{ maxWidth: 640 }}>
      <Card title="飞书配置">
        <Form.Item name="feishuAppId" label="App ID" rules={[{ required: true, message: '必填' }]}>
          <Input placeholder="飞书开放平台 → 应用凭证 → App ID" />
        </Form.Item>
        <Form.Item name="feishuAppSecret" label="App Secret">
          <Input.Password placeholder="飞书开放平台 → 应用凭证 → App Secret（已设置则不显示）" />
        </Form.Item>
        <Form.Item name="feishuVerificationToken" label="Verification Token">
          <Input placeholder="可选，Webhook 模式的校验 token" />
        </Form.Item>
        <Form.Item name="feishuBaseUrl" label="API 地址">
          <Input placeholder="https://open.feishu.cn/open-apis" />
        </Form.Item>
      </Card>

      <Card title="DeepSeek 配置" style={{ marginTop: 16 }}>
        <Form.Item name="deepseekApiKey" label="API Key">
          <Input.Password placeholder="https://platform.deepseek.com/api_keys（已设置则不显示）" />
        </Form.Item>
        <Form.Item name="deepseekBaseUrl" label="API 地址">
          <Input placeholder="https://api.deepseek.com" />
        </Form.Item>
        <Form.Item name="deepseekModel" label="模型">
          <Input placeholder="deepseek-chat" />
        </Form.Item>
      </Card>

      <Card title="联网搜索 (SerpAPI)" style={{ marginTop: 16 }}>
        <Form.Item name="serpApiKey" label="API Key">
          <Input.Password placeholder="https://serpapi.com/manage-api-key（已设置则不显示）" />
        </Form.Item>
      </Card>

      <Card title="流式输出控制" style={{ marginTop: 16 }}>
        <Form.Item name="streamThrottleMs" label="刷新间隔 (ms)">
          <InputNumber min={50} max={5000} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="streamChunkSize" label="累积 Token 数">
          <InputNumber min={1} max={200} style={{ width: '100%' }} />
        </Form.Item>
      </Card>

      <Card title="超时设置" style={{ marginTop: 16 }}>
        <Form.Item name="apiTimeout" label="DeepSeek HTTP 超时 (秒)">
          <InputNumber min={10} max={600} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="chatTimeout" label="单次对话任务超时 (秒)">
          <InputNumber min={10} max={600} style={{ width: '100%' }} />
        </Form.Item>
      </Card>

      <Card title="服务" style={{ marginTop: 16 }}>
        <Form.Item name="port" label="HTTP 端口">
          <InputNumber min={1024} max={65535} style={{ width: '100%' }} />
        </Form.Item>
      </Card>

      <Button type="primary" htmlType="submit" loading={saving} style={{ marginTop: 16 }}>
        保存配置
      </Button>
    </Form>
  )
}
