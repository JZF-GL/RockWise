import { useState, useEffect } from 'react';
import { Card, Form, InputNumber, Switch, Button, Space, Typography, message, Divider, Tabs, Alert, Input, Select, Tag } from 'antd';
import { SaveOutlined, SettingOutlined, BellOutlined, SafetyOutlined, ApiOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useSettingsStore, AI_PROVIDERS } from '../../stores/settingsStore';
import { AIService } from '../../services/ai';

const { Title, Text } = Typography;

const Settings = () => {
  const [form] = Form.useForm();
  const [aiForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'fail' | null>(null);
  const {
    buyLimit, sellLimit, stopLoss, takeProfit, enableAIAnalysis,
    aiApiUrl, aiApiKey, aiModel, aiProvider,
    setBuyLimit, setSellLimit, setStopLoss, setTakeProfit, setEnableAIAnalysis,
    setAiApiUrl, setAiApiKey, setAiModel, setAiProvider,
    loadSettings, saveSettings,
  } = useSettingsStore();

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    form.setFieldsValue({
      buyLimit, sellLimit, stopLoss, takeProfit, enableAIAnalysis,
    });
  }, [form, buyLimit, sellLimit, stopLoss, takeProfit, enableAIAnalysis]);

  useEffect(() => {
    aiForm.setFieldsValue({
      aiProvider, aiApiUrl, aiApiKey, aiModel,
    });
  }, [aiForm, aiProvider, aiApiUrl, aiApiKey, aiModel]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      setBuyLimit(values.buyLimit);
      setSellLimit(values.sellLimit);
      setStopLoss(values.stopLoss);
      setTakeProfit(values.takeProfit);
      setEnableAIAnalysis(values.enableAIAnalysis);
      await saveSettings();
      message.success('设置保存成功');
    } catch (error) {
      message.error('保存设置失败');
    } finally {
      setLoading(false);
    }
  };

  const onAiFinish = async (values: any) => {
    setLoading(true);
    try {
      setAiProvider(values.aiProvider);
      setAiApiUrl(values.aiApiUrl);
      setAiApiKey(values.aiApiKey);
      setAiModel(values.aiModel);
      // 直接保存到 localStorage
      const state = useSettingsStore.getState();
      await state.saveSettings();
      message.success('AI 设置保存成功');
    } catch (error) {
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    const values = aiForm.getFieldsValue();
    if (!values.aiApiKey || !values.aiApiUrl) {
      message.warning('请先填写 API 地址和 Key');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const aiService = AIService.getInstance();
      // 临时设置到 store 供 ai.ts 读取
      setAiApiUrl(values.aiApiUrl);
      setAiApiKey(values.aiApiKey);
      setAiModel(values.aiModel);
      await aiService.analyzeWithCloudAPI('请回复"连接成功"四个字');
      setTestResult('success');
      message.success('API 连接测试成功');
    } catch (error: any) {
      setTestResult('fail');
      message.error(error.message || '连接测试失败');
    } finally {
      setTesting(false);
    }
  };

  const tabItems = [
    {
      key: 'trading',
      label: (
        <span>
          <SettingOutlined />
          交易设置
        </span>
      ),
      children: (
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            buyLimit: 10000,
            sellLimit: 10000,
            stopLoss: 10,
            takeProfit: 20,
            enableAIAnalysis: true,
          }}
        >
          <Title level={5}>金额限制</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            设置单次交易的最大金额限制，超出限制时将不会执行交易建议
          </Text>

          <Space size="large" style={{ width: '100%' }}>
            <Form.Item
              label="单次买入金额限制（元）"
              name="buyLimit"
              rules={[{ required: true, message: '请输入买入金额限制' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                min={0}
                max={1000000}
                style={{ width: '100%' }}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => value!.replace(/,/g, '') as unknown as number}
              />
            </Form.Item>

            <Form.Item
              label="单次卖出金额限制（元）"
              name="sellLimit"
              rules={[{ required: true, message: '请输入卖出金额限制' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                min={0}
                max={1000000}
                style={{ width: '100%' }}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => value!.replace(/,/g, '') as unknown as number}
              />
            </Form.Item>
          </Space>

          <Divider />

          <Title level={5}>止损止盈</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            设置止损止盈百分比，当基金涨跌达到设定值时触发提醒
          </Text>

          <Space size="large" style={{ width: '100%' }}>
            <Form.Item
              label="止损百分比（%）"
              name="stopLoss"
              rules={[{ required: true, message: '请输入止损百分比' }]}
              style={{ flex: 1 }}
            >
              <InputNumber min={1} max={100} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              label="止盈百分比（%）"
              name="takeProfit"
              rules={[{ required: true, message: '请输入止盈百分比' }]}
              style={{ flex: 1 }}
            >
              <InputNumber min={1} max={100} style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Divider />

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={loading}
                size="large"
              >
                保存设置
              </Button>
              <Button onClick={() => form.resetFields()} size="large">
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'ai',
      label: (
        <span>
          <SafetyOutlined />
          AI设置
        </span>
      ),
      children: (
        <Form form={aiForm} layout="vertical" onFinish={onAiFinish}>
          <Alert
            message="AI分析功能"
            description="配置 API 后，系统将使用大模型对基金进行智能分析，提供买入/卖出建议。支持 OpenAI、智谱AI、DeepSeek 等兼容 OpenAI 格式的 API。"
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />

          <Form.Item
            label="启用AI分析"
            name="enableAIAnalysis"
            valuePropName="checked"
            initialValue={enableAIAnalysis}
          >
            <Switch onChange={(v) => setEnableAIAnalysis(v)} />
          </Form.Item>

          <Divider />

          <Title level={5}>
            <ApiOutlined style={{ marginRight: 6 }} />
            API 配置
          </Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            选择服务商或自定义 API 地址，所有兼容 OpenAI 格式的接口均可使用
          </Text>

          <Form.Item
            label="API 服务商"
            name="aiProvider"
            initialValue={aiProvider}
          >
            <Select
              options={[
                { value: 'openai', label: 'OpenAI (GPT)' },
                { value: 'deepseek', label: 'DeepSeek' },
                { value: 'zhipu', label: '智谱AI (GLM)' },
                { value: 'custom', label: '自定义' },
              ]}
              onChange={(v) => {
                const preset = AI_PROVIDERS[v];
                aiForm.setFieldsValue({ aiApiUrl: preset.baseUrl, aiModel: preset.model });
              }}
            />
          </Form.Item>

          <Form.Item
            label="API 地址"
            name="aiApiUrl"
            initialValue={aiApiUrl}
            rules={[{ required: true, message: '请输入 API 地址' }]}
          >
            <Input
              placeholder="https://api.openai.com/v1"
              addonBefore={<Text type="secondary" style={{ fontSize: 12 }}>URL</Text>}
            />
          </Form.Item>

          <Form.Item
            label={
              <Space>
                <span>API Key</span>
                {testResult === 'success' && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
                {testResult === 'fail' && <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
              </Space>
            }
            name="aiApiKey"
            initialValue={aiApiKey}
            rules={[{ required: true, message: '请输入 API Key' }]}
          >
            <Input.Password
              placeholder="sk-..."
              visibilityToggle
            />
          </Form.Item>

          <Form.Item
            label="模型名称"
            name="aiModel"
            initialValue={aiModel}
            rules={[{ required: true, message: '请输入模型名称' }]}
          >
            <Input placeholder="gpt-3.5-turbo / deepseek-chat / glm-4-flash" />
          </Form.Item>

          <Divider />

          <Space>
            <Button
              onClick={handleTestConnection}
              loading={testing}
              icon={<ApiOutlined />}
            >
              测试连接
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={loading}
            >
              保存 AI 设置
            </Button>
          </Space>

          <div style={{ marginTop: 16 }}>
            <Alert
              type="warning"
              showIcon
              message="提示"
              description={
                <div>
                  <Text style={{ fontSize: 12 }}>
                    API Key 仅存储在本地浏览器中，不会上传到任何服务器。
                    <br />
                    常用模型：<Tag>gpt-3.5-turbo</Tag> <Tag>deepseek-chat</Tag> <Tag>glm-4-flash</Tag>
                  </Text>
                </div>
              }
            />
          </div>
        </Form>
      ),
    },
    {
      key: 'notification',
      label: (
        <span>
          <BellOutlined />
          通知设置
        </span>
      ),
      children: (
        <Form form={form} layout="vertical">
          <Alert
            message="通知功能"
            description="设置交易提醒和系统通知的方式和时间。"
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />

          <Form.Item label="启用桌面通知" valuePropName="checked">
            <Switch defaultChecked />
          </Form.Item>

          <Form.Item label="启用声音提醒" valuePropName="checked">
            <Switch defaultChecked />
          </Form.Item>

          <Divider />

          <Form.Item label="刷新间隔（分钟）">
            <InputNumber min={1} max={60} defaultValue={30} style={{ width: 200 }} />
          </Form.Item>
        </Form>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
};

export default Settings;