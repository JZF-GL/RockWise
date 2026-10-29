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
import { darkThemeTokens } from '../../styles/theme';

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
        height: 34,
        background: darkThemeTokens.bgTitleBar,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 4px 0 12px',
        WebkitAppRegion: 'drag',
        userSelect: 'none',
        borderBottom: `1px solid ${darkThemeTokens.border}`,
        position: 'relative',
        zIndex: 100,
      } as any}
    >
      <Space size={8}>
        <div style={{
          width: 20,
          height: 20,
          borderRadius: 4,
          background: 'rgba(255, 255, 255, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <FundOutlined style={{ color: darkThemeTokens.primaryHover, fontSize: 12 }} />
        </div>
        <Text style={{
          color: darkThemeTokens.textHeading,
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: 0.3,
        }}>
          基金智能分析
        </Text>
      </Space>

      <Space size={2} style={{ WebkitAppRegion: 'no-drag', alignItems: 'center' } as any}>
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
              padding: '2px 8px',
              borderRadius: 4,
              transition: 'background 0.2s',
            }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Avatar
                icon={<UserOutlined />}
                size={18}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: darkThemeTokens.textPrimary,
                  fontSize: 10,
                }}
              />
              <Text style={{ color: darkThemeTokens.textSecondary, fontSize: 12 }}>{username}</Text>
            </div>
          </Dropdown>
        )}
        {!isLoggedIn && (
          <Button
            type="text"
            size="small"
            icon={<LoginOutlined />}
            style={{
              color: darkThemeTokens.textSecondary,
              height: 24,
              padding: '0 8px',
              borderRadius: 4,
              fontSize: 12,
            }}
            onClick={() => navigate('/login')}
          >
            登录
          </Button>
        )}

        <div style={{
          width: 1,
          height: 12,
          background: 'rgba(255,255,255,0.08)',
          margin: '0 3px',
        }} />

        {/* 窗口控制按钮 */}
        {[
          { icon: <MinusOutlined style={{ fontSize: 10 }} />, action: () => window.electronAPI?.minimize(), hoverBg: 'rgba(255,255,255,0.08)' },
          { icon: <BorderOutlined style={{ fontSize: 9 }} />, action: () => window.electronAPI?.maximize(), hoverBg: 'rgba(255,255,255,0.08)' },
          { icon: <CloseOutlined style={{ fontSize: 10 }} />, action: () => window.electronAPI?.close(), hoverBg: 'rgba(180, 60, 60, 0.75)' },
        ].map((btn, i) => (
          <button
            key={i}
            onClick={btn.action}
            style={{
              width: 28,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              color: darkThemeTokens.textSecondary,
              cursor: 'pointer',
              borderRadius: 4,
              transition: 'background 0.15s ease, color 0.15s ease',
              WebkitAppRegion: 'no-drag',
              outline: 'none',
            } as any}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = btn.hoverBg;
              e.currentTarget.style.color = '#e1e6ee';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = darkThemeTokens.textSecondary;
            }}
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
    <Layout style={{ height: '100vh', overflow: 'hidden', background: darkThemeTokens.bgApp }}>
      <TitleBar />

      <Layout style={{ flex: 1, overflow: 'hidden', background: darkThemeTokens.bgApp }}>
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          theme="dark"
          width={180}
          collapsedWidth={52}
          style={{
            overflow: 'auto',
            background: darkThemeTokens.bgSider,
            borderRight: `1px solid ${darkThemeTokens.border}`,
          }}
        >
          <div style={{ height: 6 }} />
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{
              borderInlineEnd: 'none',
              fontSize: 13,
            }}
          />
        </Sider>

        <Content
          style={{
            overflow: 'auto',
            padding: 16,
            background: darkThemeTokens.bgApp,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
