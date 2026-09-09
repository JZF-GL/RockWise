import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Card, Typography, Button, Descriptions, Spin, message,
  Space, Tag, Tabs, Statistic, Row, Col,
} from 'antd';
import {
  ArrowLeftOutlined, ReloadOutlined,
  RiseOutlined, FallOutlined, LineChartOutlined,
  PercentageOutlined, FundOutlined, InfoCircleOutlined,
  RobotOutlined, ClockCircleOutlined, StarOutlined, StarFilled,
} from '@ant-design/icons';
import NetValueChart from '../../components/NetValueChart';
import GrowthRateChart from '../../components/GrowthRateChart';
import NetValueEstimateChart from '../../components/NetValueEstimateChart';
import TodayIntradayEstimateChart, { TodayEstimateData } from '../../components/TodayIntradayEstimateChart';
import { useFundStore } from '../../stores/fundStore';
import { FundDataService } from '../../services/fundData';
import { getMyFunds, addFundToMyFunds, removeFundFromMyFunds } from '../../utils/myFunds';
import AIFundAnalysisModal from '../../components/AIFundAnalysisModal';

const { Title, Text } = Typography;
const fundDataService = FundDataService.getInstance();

const FundDetail = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as { from?: string } | null)?.from;

  const [activeTab, setActiveTab] = useState('todayEstimate');
  const [todayEstimate, setTodayEstimate] = useState<TodayEstimateData | null>(null);
  const [todayLoading, setTodayLoading] = useState(false);
  const [isInMyFunds, setIsInMyFunds] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const handleBack = () => {
    if (fromPath) {
      navigate(fromPath);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  useEffect(() => {
    if (code) {
      setIsInMyFunds(getMyFunds().includes(code));
    }
  }, [code]);

  const handleToggleMyFund = () => {
    if (!code) return;
    if (isInMyFunds) {
      removeFundFromMyFunds(code);
      setIsInMyFunds(false);
      message.info(`已将 ${currentFund?.name || code} 从我的基金中移除`);
    } else {
      addFundToMyFunds(code);
      setIsInMyFunds(true);
      message.success(`已添加 ${currentFund?.name || code} 到我的基金`);
    }
  };

  const {
    currentFund, currentHistory, loading, historyLoading,
    fetchFundDetail, fetchFundHistory,
  } = useFundStore();

  const fetchTodayEstimate = useCallback(async (fundCode: string, nav?: number) => {
    setTodayLoading(true);
    try {
      const data = await fundDataService.getTodayIntradayEstimate(fundCode, nav);
      setTodayEstimate(data);
    } catch (e) {
      console.error('获取今日估值失败:', e);
    } finally {
      setTodayLoading(false);
    }
  }, []);

  useEffect(() => {
    if (code) {
      fetchFundDetail(code);
      fetchFundHistory(code, 250);
      fetchTodayEstimate(code);
    }
  }, [code, fetchFundDetail, fetchFundHistory, fetchTodayEstimate]);

  const handleRefresh = async () => {
    if (!code) return;
    try {
      await Promise.all([
        fetchFundDetail(code),
        fetchFundHistory(code, 250),
        fetchTodayEstimate(code, currentFund?.net_value),
      ]);
      message.success('数据刷新成功');
    } catch {
      message.error('刷新失败');
    }
  };

  // 历史净值序列按时间正序排列（从远到近）
  const chronologicalHistory = useMemo(() => {
    return [...currentHistory].reverse();
  }, [currentHistory]);

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
        <Button onClick={handleBack}>{fromPath === '/my-funds' ? '返回我的基金' : '返回列表'}</Button>
      </div>
    );
  }

  const isRise = currentFund.dayGrowth > 0;
  const isFlat = currentFund.dayGrowth === 0;

  const chartData = {
    dates: chronologicalHistory.map((item) => item.date),
    values: chronologicalHistory.map((item) => item.nav),
  };

  const tabItems = [
    {
      key: 'todayEstimate',
      label: (
        <span>
          <ClockCircleOutlined /> 今日盘中估值 (9:30-15:00)
        </span>
      ),
      children: (
        <Spin spinning={todayLoading}>
          <TodayIntradayEstimateChart
            data={todayEstimate}
            loading={todayLoading}
            fundName={currentFund.name}
            height={400}
            onRefresh={() => fetchTodayEstimate(currentFund.code, currentFund.net_value)}
          />
        </Spin>
      ),
    },
    {
      key: 'growth',
      label: (
        <span>
          <PercentageOutlined /> 百分比涨跌折线图
        </span>
      ),
      children: (
        <Spin spinning={historyLoading}>
          <GrowthRateChart
            data={chronologicalHistory}
            fundName={currentFund.name}
            height={400}
          />
        </Spin>
      ),
    },
    {
      key: 'chart',
      label: (
        <span>
          <LineChartOutlined /> 净值走势
        </span>
      ),
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
      key: 'estimate',
      label: (
        <span>
          <FundOutlined /> 多日净值推演
        </span>
      ),
      children: (
        <Spin spinning={historyLoading}>
          <NetValueEstimateChart
            data={chronologicalHistory}
            currentNetValue={currentFund.net_value}
            fundName={currentFund.name}
            height={400}
          />
        </Spin>
      ),
    },
    {
      key: 'info',
      label: (
        <span>
          <InfoCircleOutlined /> 基金信息
        </span>
      ),
      children: (
        <Descriptions bordered column={2}>
          <Descriptions.Item label="基金代码">{currentFund.code}</Descriptions.Item>
          <Descriptions.Item label="基金名称">{currentFund.name}</Descriptions.Item>
          <Descriptions.Item label="最新净值">
            <Text strong style={{ color: isFlat ? '#666' : isRise ? '#cf1322' : '#3f8600' }}>
              {currentFund.net_value?.toFixed(4) || '--'}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="日涨跌幅">
            {!isFlat ? (
              <Text style={{ color: isRise ? '#cf1322' : '#3f8600' }}>
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
      label: (
        <span>
          <RobotOutlined /> AI分析
        </span>
      ),
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
              <div style={{ marginTop: 8 }}>
                <Button
                  type="primary"
                  icon={<RobotOutlined />}
                  style={{ background: '#722ed1', borderColor: '#722ed1' }}
                  onClick={() => setAiModalOpen(true)}
                >
                  打开 AI 联网深度研判 (最新要闻 + 1个月/3个月趋势预测)
                </Button>
              </div>
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
        <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
          {fromPath === '/my-funds' ? '返回我的基金' : '返回列表'}
        </Button>
        <Space>
          <Button
            icon={isInMyFunds ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
            onClick={handleToggleMyFund}
            style={
              isInMyFunds
                ? {
                    borderColor: '#ffd591',
                    color: '#d48806',
                    background: '#fffbe6',
                  }
                : undefined
            }
          >
            {isInMyFunds ? '已在我的基金' : '+ 添加到我的基金'}
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
            刷新数据
          </Button>
        </Space>
      </Space>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card>
            <Space size="large" wrap>
              <div>
                <Space>
                  <Title level={4} style={{ margin: 0 }}>{currentFund.name}</Title>
                  <Tag color="blue">{currentFund.code}</Tag>
                  {currentFund.type && <Tag color="cyan">{currentFund.type}</Tag>}
                </Space>
                {currentFund.company && (
                  <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                    {currentFund.company} {currentFund.manager ? `· 经理: ${currentFund.manager}` : ''}
                  </Text>
                )}
              </div>
              <Statistic
                title="最新净值"
                value={currentFund.net_value?.toFixed(4) || '--'}
                valueStyle={{ color: isFlat ? '#666' : isRise ? '#cf1322' : '#3f8600' }}
                prefix={!isFlat ? (isRise ? <RiseOutlined /> : <FallOutlined />) : undefined}
              />
              {!isFlat && (
                <Statistic
                  title="日涨跌幅"
                  value={`${isRise ? '+' : ''}${currentFund.dayGrowth?.toFixed(2)}%`}
                  valueStyle={{ color: isRise ? '#cf1322' : '#3f8600', fontSize: 20 }}
                />
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 16 }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>

      <AIFundAnalysisModal
        open={aiModalOpen}
        fund={currentFund}
        onClose={() => setAiModalOpen(false)}
        onMyFundsChanged={() => {
          if (code) setIsInMyFunds(getMyFunds().includes(code));
        }}
      />
    </div>
  );
};

export default FundDetail;