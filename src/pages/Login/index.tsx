import { useState, useEffect } from 'react';
import { Button, Card, Form, Input, message, Typography, Space } from 'antd';
import { UserOutlined, LockOutlined, FundOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

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
    }}>
      <Card
        style={{
          width: 400,
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
        }}
        bodyStyle={{ padding: '40px 36px 32px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #1677ff, #0958d9)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            boxShadow: '0 4px 12px rgba(22, 119, 255, 0.3)',
          }}>
            <FundOutlined style={{ fontSize: 26, color: '#fff' }} />
          </div>
          <Title level={3} style={{ marginBottom: 6, fontWeight: 600 }}>
            欢迎回来
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            登录后可管理自选基金，获取个性化推荐
          </Text>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="用户名 / 手机号"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{
                height: 44,
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            提示：输入任意用户名密码即可登录体验
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default Login;
