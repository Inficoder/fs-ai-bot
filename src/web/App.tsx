import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu } from 'antd'
import {
  DashboardOutlined,
  SettingOutlined,
  MessageOutlined,
} from '@ant-design/icons'
import Dashboard from './pages/Dashboard'
import Config from './pages/Config'
import ChatLogs from './pages/ChatLogs'

const { Header, Sider, Content } = Layout

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/config', icon: <SettingOutlined />, label: '配置管理' },
  { key: '/logs', icon: <MessageOutlined />, label: '对话日志' },
]

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider>
        <div style={{
          color: '#fff',
          textAlign: 'center',
          padding: '16px',
          fontWeight: 'bold',
          fontSize: 16,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}>
          飞书 AI 管理
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Content style={{ margin: 24 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/config" element={<Config />} />
            <Route path="/logs" element={<ChatLogs />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}
