import { useState, useEffect } from 'react';
import { Button, Card, Form, Input, message, Typography } from 'antd';
import { UserOutlined, LockOutlined, FundOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { darkThemeTokens } from '../../styles/theme';

const { Title, Text } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isLoggedIn, login, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isLoggedIn) {
      message.info('您已登录，正在跳转...');
      navigate('/');
    }
  }, [isLoggedIn, navigate]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      if (values.username && values.password) {
        login(values.username);
        message.success('登录成功');
        navigate('/my-funds');
      }
    } catch {
      message.error('登录失败');
    } finally {
      setLoading(false);
    }
  };

  if (isLoggedIn) return null;

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 'calc(100vh - 56px)',
      background: darkThemeTokens.bgApp,
    }}>
      <Card
        style={{
          width: 380,
          borderRadius: 10,
          background: darkThemeTokens.bgCard,
          border: `1px solid ${darkThemeTokens.border}`,
        }}
        bodyStyle={{ padding: '36px 32px 28px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 10,
            background: darkThemeTokens.primaryBg,
            border: `1px solid rgba(77, 122, 176, 0.25)`,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
          }}>
            <FundOutlined style={{ fontSize: 22, color: darkThemeTokens.primaryHover }} />
          </div>
          <Title level={4} style={{ marginBottom: 6, fontWeight: 500, color: darkThemeTokens.textHeading }}>
            欢迎回来
          </Title>
          <Text style={{ fontSize: 13, color: darkThemeTokens.textSecondary }}>
            登录后可管理自选基金，获取个性化推荐
          </Text>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
          size="middle"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: darkThemeTokens.textTertiary }} />}
              placeholder="用户名 / 手机号"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: darkThemeTokens.textTertiary }} />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16, marginTop: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{
                height: 38,
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
