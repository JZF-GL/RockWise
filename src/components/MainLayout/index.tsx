import { useState, useEffect } from 'react';
import { Layout, Menu, Space, Button, Typography, Avatar, Dropdown, message } from 'antd';
import {
  FundOutlined, SettingOutlined, LoginOutlined,
  StarOutlined, LogoutOutlined, UserOutlined,
  MinusOutlined, BorderOutlined, CloseOutlined,
  LineChartOutlined, TransactionOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

const { Sider, Content } = Layout;
const { Text } = Typography;

const TitleBar = () => {
  const { isLoggedIn, username, checkAuth, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLogout = () => {
    logout();
    navigate('/');
    message.success('已退出登录');
  };

  return (
    <div
      style={{
        height: 36,
        background: 'linear-gradient(90deg, #0050b3 0%, #1677ff 50%, #0958d9 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 6px 0 14px',
        WebkitAppRegion: 'drag',
        userSelect: 'none',
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.15)',
        position: 'relative',
        zIndex: 100,
      }}
    >
      <Space size={8}>
        <div style={{
          width: 22,
          height: 22,
          borderRadius: 5,
          background: 'rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(4px)',
        }}>
          <FundOutlined style={{ color: '#fff', fontSize: 13 }} />
        </div>
        <Text style={{
          color: '#fff',
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: 0.3,
          textShadow: '0 1px 2px rgba(0,0,0,0.1)',
        }}>
          基金智能分析
        </Text>
      </Space>

      <Space size={2} style={{ WebkitAppRegion: 'no-drag', alignItems: 'center' }}>
        {isLoggedIn && (
          <Dropdown
            menu={{
              items: [
                { key: 'my-funds', icon: <StarOutlined />, label: '我的基金', onClick: () => navigate('/my-funds') },
                { key: 'settings', icon: <SettingOutlined />, label: '设置', onClick: () => navigate('/settings') },
                { type: 'divider' },
                { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: handleLogout },
              ],
            }}
            trigger={['click']}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              padding: '3px 10px',
              borderRadius: 6,
              transition: 'background 0.2s',
            }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Avatar
                icon={<UserOutlined />}
                size={20}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.25)',
                  color: '#fff',
                  fontSize: 11,
                  border: '1.5px solid rgba(255,255,255,0.4)',
                }}
              />
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: 500 }}>{username}</Text>
            </div>
          </Dropdown>
        )}
        {!isLoggedIn && (
          <Button
            type="text"
            size="small"
            icon={<LoginOutlined />}
            style={{
              color: '#fff',
              height: 26,
              padding: '0 10px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
            }}
            onClick={() => navigate('/login')}
          >
            登录
          </Button>
        )}

        <div style={{
          width: 1,
          height: 14,
          background: 'rgba(255,255,255,0.2)',
          margin: '0 4px',
        }} />

        {/* 窗口控制按钮 */}
        {[
          { icon: <MinusOutlined style={{ fontSize: 11 }} />, action: () => window.electronAPI?.minimize(), hoverBg: 'rgba(255,255,255,0.2)' },
          { icon: <BorderOutlined style={{ fontSize: 10 }} />, action: () => window.electronAPI?.maximize(), hoverBg: 'rgba(255,255,255,0.2)' },
          { icon: <CloseOutlined style={{ fontSize: 11 }} />, action: () => window.electronAPI?.close(), hoverBg: 'rgba(220,53,69,0.9)' },
        ].map((btn, i) => (
          <button
            key={i}
            onClick={btn.action}
            style={{
              width: 30,
              height: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              borderRadius: 4,
              transition: 'background 0.15s ease',
              WebkitAppRegion: 'no-drag',
              outline: 'none',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = btn.hoverBg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {btn.icon}
          </button>
        ))}
      </Space>
    </div>
  );
};

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const menuItems = [
    {
      key: '/',
      icon: <FundOutlined />,
      label: '基金超市',
    },
    {
      key: '/analysis',
      icon: <LineChartOutlined />,
      label: '市场分析',
    },
    ...(isLoggedIn
      ? [{ key: '/my-funds', icon: <StarOutlined />, label: '我的基金' }]
      : []),
    {
      key: '/trading',
      icon: <TransactionOutlined />,
      label: '虚拟交易',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '交易设置',
    },
  ];

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <TitleBar />

      <Layout style={{ flex: 1, overflow: 'hidden' }}>
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          theme="dark"
          width={196}
          collapsedWidth={56}
          style={{
            overflow: 'auto',
            borderRight: 'none',
          }}
        >
          <div style={{ height: 8 }} />
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{
              borderInlineEnd: 'none',
              fontSize: 14,
            }}
          />
        </Sider>

        <Content
          style={{
            overflow: 'auto',
            padding: 20,
            background: '#f5f7fa',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
