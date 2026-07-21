import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Typography, Button, Descriptions, Spin, message,
  Space, Tag, Tabs, Statistic, Row, Col,
} from 'antd';
import {
  ArrowLeftOutlined, ReloadOutlined,
  RiseOutlined, FallOutlined,
} from '@ant-design/icons';
import NetValueChart from '../../components/NetValueChart';
import { useFundStore } from '../../stores/fundStore';

const { Title, Text } = Typography;

const FundDetail = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const {
    currentFund, currentHistory, loading, historyLoading,
    fetchFundDetail, fetchFundHistory,
  } = useFundStore();

  useEffect(() => {
    if (code) {
      fetchFundDetail(code);
      fetchFundHistory(code, 90);
    }
  }, [code, fetchFundDetail, fetchFundHistory]);

  const handleRefresh = async () => {
    if (!code) return;
    try {
      await fetchFundDetail(code);
      await fetchFundHistory(code, 90);
      message.success('数据刷新成功');
    } catch {
      message.error('刷新失败');
    }
  };

  if (loading && !currentFund) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Spin size="large" tip="加载基金数据中..." />
      </div>
    );
  }

  if (!currentFund) {
    return (
      <div>
        <Title level={4}>未找到基金数据</Title>
        <Button onClick={() => navigate('/')}>返回列表</Button>
      </div>
    );
  }

  const isRise = currentFund.dayGrowth > 0;
  const isFlat = currentFund.dayGrowth === 0;

  const chartData = {
    dates: currentHistory.map((item) => item.date).reverse(),
    values: currentHistory.map((item) => item.nav).reverse(),
  };

  const tabItems = [
    {
      key: 'chart',
      label: '净值走势',
      children: (
        <Spin spinning={historyLoading}>
          {chartData.dates.length > 0 ? (
            <NetValueChart
              data={chartData}
              title={`${currentFund.name} 近期净值走势`}
              height={400}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
              {historyLoading ? '加载历史数据中...' : '暂无历史数据'}
            </div>
          )}
        </Spin>
      ),
    },
    {
      key: 'info',
      label: '基金信息',
      children: (
        <Descriptions bordered column={2}>
          <Descriptions.Item label="基金代码">{currentFund.code}</Descriptions.Item>
          <Descriptions.Item label="基金名称">{currentFund.name}</Descriptions.Item>
          <Descriptions.Item label="最新净值">
            <Text strong style={{ color: isFlat ? '#666' : isRise ? '#3f8600' : '#cf1322' }}>
              {currentFund.net_value?.toFixed(4) || '--'}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="日涨跌幅">
            {!isFlat ? (
              <Text style={{ color: isRise ? '#3f8600' : '#cf1322' }}>
                {isRise ? '+' : ''}{currentFund.dayGrowth?.toFixed(2)}%
              </Text>
            ) : '--'}
          </Descriptions.Item>
          <Descriptions.Item label="基金类型">{currentFund.type || '--'}</Descriptions.Item>
          <Descriptions.Item label="累计净值">{currentFund.totalNav?.toFixed(4) || '--'}</Descriptions.Item>
          <Descriptions.Item label="基金经理">{currentFund.manager || '--'}</Descriptions.Item>
          <Descriptions.Item label="基金公司">{currentFund.company || '--'}</Descriptions.Item>
          <Descriptions.Item label="更新时间" span={2}>
            {currentFund.update_time || '--'}
          </Descriptions.Item>
        </Descriptions>
      ),
    },
    {
      key: 'analysis',
      label: 'AI分析',
      children: (
        <Card>
          <div style={{
            padding: 24,
            border: '1px solid #d9d9d9',
            borderRadius: 8,
            background: '#fafafa',
          }}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Title level={5}>AI分析报告</Title>
              <Text>
                基于近期市场走势和基金表现分析，该基金{currentFund.name}近期表现
                {isRise ? '良好' : isFlat ? '平稳' : '承压'}。
              </Text>
              {currentHistory.length > 0 && (
                <Text>
                  近{currentHistory.length}个交易日中，
                  上涨{currentHistory.filter((h) => h.dayGrowth > 0).length}天，
                  下跌{currentHistory.filter((h) => h.dayGrowth < 0).length}天。
                </Text>
              )}
              <Space>
                <Tag color={isRise ? 'green' : isFlat ? 'blue' : 'red'}>
                  今日: {isRise ? '上涨' : isFlat ? '持平' : '下跌'}
                </Tag>
                <Tag color="blue">建议: 持有观察</Tag>
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>
                注意：以上分析仅供参考，不构成投资建议。投资有风险，入市需谨慎。
              </Text>
            </Space>
          </div>
        </Card>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>
          返回列表
        </Button>
        <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
          刷新数据
        </Button>
      </Space>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card>
            <Space size="large" wrap>
              <div>
                <Space>
                  <Title level={4} style={{ margin: 0 }}>{currentFund.name}</Title>
                  <Tag color="blue">{currentFund.code}</Tag>
                </Space>
                {currentFund.company && (
                  <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                    {currentFund.company}
                  </Text>
                )}
              </div>
              <Statistic
                title="最新净值"
                value={currentFund.net_value?.toFixed(4) || '--'}
                valueStyle={{ color: isFlat ? '#666' : isRise ? '#3f8600' : '#cf1322' }}
                prefix={!isFlat ? (isRise ? <RiseOutlined /> : <FallOutlined />) : undefined}
              />
              {!isFlat && (
                <Statistic
                  title="日涨跌幅"
                  value={`${isRise ? '+' : ''}${currentFund.dayGrowth?.toFixed(2)}%`}
                  valueStyle={{ color: isRise ? '#3f8600' : '#cf1322', fontSize: 20 }}
                />
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 16 }}>
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
};

export default FundDetail;