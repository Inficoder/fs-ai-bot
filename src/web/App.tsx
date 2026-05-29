import { useState, useCallback } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Button, Grid, Drawer, Typography, Flex, theme } from 'antd'
import {
  DashboardOutlined,
  SettingOutlined,
  MessageOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  RobotOutlined,
} from '@ant-design/icons'
import Dashboard from './pages/Dashboard'
import Config from './pages/Config'
import ChatLogs from './pages/ChatLogs'

const { Header, Sider, Content } = Layout
const { Title } = Typography
const { useBreakpoint } = Grid

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/config', icon: <SettingOutlined />, label: '配置管理' },
  { key: '/logs', icon: <MessageOutlined />, label: '对话日志' },
]

const pageTitles: Record<string, string> = {
  '/': '概览',
  '/config': '配置管理',
  '/logs': '对话日志',
}

function BrandLogo({ collapsed }: { collapsed: boolean }) {
  const { token } = theme.useToken()
  return (
    <Flex align="center" gap={12} style={{
      padding: collapsed ? '20px 16px' : '20px 24px',
      whiteSpace: 'nowrap',
      borderBottom: `1px solid ${token.colorBorderSecondary}`,
      marginBottom: 4,
    }}>
      <RobotOutlined style={{ fontSize: 22, color: token.colorPrimary }} />
      {!collapsed && (
        <Typography.Text strong style={{ fontSize: 17 }}>
          FS Bot
        </Typography.Text>
      )}
    </Flex>
  )
}

export default function App() {
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const screens = useBreakpoint()
  const navigate = useNavigate()
  const location = useLocation()
  const { token } = theme.useToken()

  const isMobile = !screens.lg
  const pageTitle = pageTitles[location.pathname] ?? ''

  const onCollapse = useCallback((val: boolean) => {
    setCollapsed(val)
  }, [])

  const menuNode = (
    <>
      <BrandLogo collapsed={collapsed && !isMobile} />
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={({ key }) => {
          navigate(key)
          if (isMobile) setDrawerOpen(false)
        }}
        style={{ borderInlineEnd: 'none' }}
      />
    </>
  )

  const siderStyle: React.CSSProperties = {
    background: token.colorBgContainer,
    borderRight: `1px solid ${token.colorBorderSecondary}`,
  }

  const headerStyle: React.CSSProperties = {
    background: token.colorBgContainer,
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    height: 56,
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          onCollapse={onCollapse}
          width={220}
          style={siderStyle}
        >
          {menuNode}
        </Sider>
      )}

      {isMobile && (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          placement="left"
          width={220}
          styles={{ body: { padding: 0 } }}
          closable={false}
        >
          {menuNode}
        </Drawer>
      )}

      <Layout>
        <Header style={headerStyle}>
          <Flex align="center" gap={8}>
            {isMobile ? (
              <Button
                type="text"
                icon={<MenuUnfoldOutlined />}
                onClick={() => setDrawerOpen(true)}
              />
            ) : (
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
              />
            )}
            <Title level={5} style={{ margin: 0 }}>{pageTitle}</Title>
          </Flex>
        </Header>
        <Content style={{ padding: 24, minHeight: 280 }}>
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
