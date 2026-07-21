import { useEffect } from 'react';
import {
  Card, Typography, Button, Space, Tag, Table, Tabs, Row, Col, Statistic,
  Empty, Progress, Spin,
} from 'antd';
import {
  ReloadOutlined, RiseOutlined, FallOutlined,
  ThunderboltOutlined, SafetyOutlined, BarChartOutlined, LineChartOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useMarketStore } from '../../stores/marketStore';

const { Text, Title } = Typography;

const MarketAnalysis = () => {
  const navigate = useNavigate();
  const {
    overview, recommendations, topFunds, sectorTrends, riskIndicators,
    loading, fetchAnalysis,
  } = useMarketStore();

  useEffect(() => {
    fetchAnalysis();
  }, []);

  // 情绪颜色
  const sentimentColor = overview?.sentiment === 'positive' ? '#52c41a'
    : overview?.sentiment === 'negative' ? '#ff4d4f' : '#faad14';
  const sentimentText = overview?.sentiment === 'positive' ? '市场向好'
    : overview?.sentiment === 'negative' ? '市场走弱' : '市场平稳';

  // 概览卡片数据
  const overviewCards = overview ? [
    {
      title: '分析基金数',
      value: overview.totalFunds,
      icon: <LineChartOutlined style={{ fontSize: 20 }} />,
      color: '#1677ff',
      bg: 'linear-gradient(135deg, #e6f4ff, #bae0ff)',
    },
    {
      title: '今日平均涨幅',
      value: overview.avgGrowth,
      suffix: '%',
      icon: <BarChartOutlined style={{ fontSize: 20 }} />,
      color: overview.avgGrowth >= 0 ? '#cf1322' : '#3f8600',
      bg: overview.avgGrowth >= 0 ? 'linear-gradient(135deg, #fff2f0, #ffccc7)' : 'linear-gradient(135deg, #f6ffed, #d9f7be)',
    },
    {
      title: '涨幅最大',
      value: overview.topGainer?.growth,
      suffix: '%',
      sub: overview.topGainer?.name,
      icon: <RiseOutlined style={{ fontSize: 20 }} />,
      color: '#cf1322',
      bg: 'linear-gradient(135deg, #fff2f0, #ffccc7)',
    },
    {
      title: '跌幅最大',
      value: overview.topLoser?.growth,
      suffix: '%',
      sub: overview.topLoser?.name,
      icon: <FallOutlined style={{ fontSize: 20 }} />,
      color: '#3f8600',
      bg: 'linear-gradient(135deg, #f6ffed, #d9f7be)',
    },
  ] : [];

  // 推荐表格列
  const recommendationColumns = [
    {
      title: '排名',
      width: 50,
      render: (_: any, __: any, index: number) => (
        <div style={{
          width: 24, height: 24, borderRadius: 6,
          background: index < 3 ? ['#ff4d4f', '#fa8c16', '#faad14'][index] : '#f0f0f0',
          color: index < 3 ? '#fff' : '#8c8c8c',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 600,
        }}>
          {index + 1}
        </div>
      ),
    },
    {
      title: '基金名称',
      dataIndex: 'fundName',
      width: 160,
      ellipsis: true,
      render: (name: string, record: any) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>{record.fundCode}</Text>
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'fundType',
      width: 70,
      render: (type: string) => (
        <Tag style={{ margin: 0, borderRadius: 4, fontSize: 11 }}>{type}</Tag>
      ),
    },
    {
      title: '评分',
      dataIndex: 'score',
      width: 80,
      render: (score: number, record: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Progress
            percent={score}
            size="small"
            strokeColor={record.levelColor}
            showInfo={false}
            style={{ width: 50, marginBottom: 0 }}
          />
          <Text strong style={{ color: record.levelColor, fontSize: 13 }}>{score}</Text>
        </div>
      ),
    },
    {
      title: '推荐',
      dataIndex: 'level',
      width: 88,
      render: (level: string, record: any) => (
        <Tag color={record.levelColor} style={{ borderRadius: 4, fontWeight: 500, margin: 0 }}>
          {level}
        </Tag>
      ),
    },
    {
      title: '近1月',
      dataIndex: 'monthGrowth',
      width: 72,
      align: 'right' as const,
      render: (v: number) => (
        <Text style={{ color: v > 0 ? '#cf1322' : v < 0 ? '#3f8600' : '#8c8c8c', fontVariantNumeric: 'tabular-nums' }}>
          {v > 0 ? '+' : ''}{(v || 0).toFixed(2)}%
        </Text>
      ),
    },
    {
      title: '近1年',
      dataIndex: 'yearGrowth',
      width: 72,
      align: 'right' as const,
      render: (v: number) => (
        <Text style={{ color: v > 0 ? '#cf1322' : v < 0 ? '#3f8600' : '#8c8c8c', fontVariantNumeric: 'tabular-nums' }}>
          {v > 0 ? '+' : ''}{(v || 0).toFixed(2)}%
        </Text>
      ),
    },
    {
      title: '操作',
      width: 70,
      render: (_: any, record: any) => (
        <Button
          type="primary"
          size="small"
          style={{ borderRadius: 6, fontSize: 12 }}
          onClick={() => navigate(`/trading`)}
        >
          买入
        </Button>
      ),
    },
  ];

  // 热门基金列
  const topFundsColumns = [
    {
      title: '序号',
      width: 50,
      render: (_: any, __: any, index: number) => (
        <Text type="secondary" style={{ fontSize: 12 }}>{index + 1}</Text>
      ),
    },
    {
      title: '基金代码',
      dataIndex: 'code',
      width: 88,
      render: (code: string) => <Text style={{ color: '#1677ff' }}>{code}</Text>,
    },
    {
      title: '基金名称',
      dataIndex: 'name',
      width: 160,
      ellipsis: true,
      render: (name: string) => <Text strong style={{ fontSize: 13 }}>{name}</Text>,
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 70,
      render: (type: string) => <Tag style={{ margin: 0, borderRadius: 4, fontSize: 11 }}>{type}</Tag>,
    },
    {
      title: '最新净值',
      dataIndex: 'nav',
      width: 80,
      align: 'right' as const,
      render: (v: number) => <Text style={{ fontVariantNumeric: 'tabular-nums' }}>{v?.toFixed(4) || '--'}</Text>,
    },
    {
      title: '日涨幅',
      dataIndex: 'dayGrowth',
      width: 72,
      align: 'right' as const,
      render: (v: number) => (
        <Text style={{ color: v > 0 ? '#cf1322' : v < 0 ? '#3f8600' : '#8c8c8c' }}>
          {v > 0 ? '+' : ''}{(v || 0).toFixed(2)}%
        </Text>
      ),
    },
    {
      title: '近1月',
      dataIndex: 'monthGrowth',
      width: 72,
      align: 'right' as const,
      render: (v: number) => (
        <Text style={{ color: v > 0 ? '#cf1322' : v < 0 ? '#3f8600' : '#8c8c8c' }}>
          {v > 0 ? '+' : ''}{(v || 0).toFixed(2)}%
        </Text>
      ),
    },
    {
      title: '近1年',
      dataIndex: 'yearGrowth',
      width: 72,
      align: 'right' as const,
      render: (v: number) => (
        <Text style={{ color: v > 0 ? '#cf1322' : v < 0 ? '#3f8600' : '#8c8c8c' }}>
          {v > 0 ? '+' : ''}{(v || 0).toFixed(2)}%
        </Text>
      ),
    },
  ];

  // 板块趋势列
  const sectorColumns = [
    {
      title: '板块',
      dataIndex: 'type',
      width: 100,
      render: (type: string) => <Text strong>{type}</Text>,
    },
    {
      title: '基金数量',
      dataIndex: 'count',
      width: 80,
      align: 'center' as const,
    },
    {
      title: '近1周均涨',
      dataIndex: 'avgWeekGrowth',
      width: 90,
      align: 'right' as const,
      render: (v: number) => (
        <Text style={{ color: v > 0 ? '#cf1322' : v < 0 ? '#3f8600' : '#8c8c8c', fontVariantNumeric: 'tabular-nums' }}>
          {v > 0 ? '+' : ''}{v.toFixed(2)}%
        </Text>
      ),
    },
    {
      title: '近1月均涨',
      dataIndex: 'avgMonthGrowth',
      width: 90,
      align: 'right' as const,
      render: (v: number) => (
        <Text style={{ color: v > 0 ? '#cf1322' : v < 0 ? '#3f8600' : '#8c8c8c', fontVariantNumeric: 'tabular-nums' }}>
          {v > 0 ? '+' : ''}{v.toFixed(2)}%
        </Text>
      ),
    },
    {
      title: '近1年均涨',
      dataIndex: 'avgYearGrowth',
      width: 90,
      align: 'right' as const,
      render: (v: number) => (
        <Text style={{ color: v > 0 ? '#cf1322' : v < 0 ? '#3f8600' : '#8c8c8c', fontVariantNumeric: 'tabular-nums' }}>
          {v > 0 ? '+' : ''}{v.toFixed(2)}%
        </Text>
      ),
    },
  ];

  // 风险指标列
  const riskColumns = [
    {
      title: '基金代码',
      dataIndex: 'fundCode',
      width: 88,
      render: (code: string) => <Text style={{ color: '#1677ff' }}>{code}</Text>,
    },
    {
      title: '基金名称',
      dataIndex: 'fundName',
      width: 160,
      ellipsis: true,
    },
    {
      title: '年化波动率',
      dataIndex: 'volatility',
      width: 90,
      align: 'right' as const,
      render: (v: number) => {
        const color = v < 10 ? '#52c41a' : v < 20 ? '#faad14' : '#ff4d4f';
        return <Text style={{ color }}>{v.toFixed(2)}%</Text>;
      },
    },
    {
      title: '最大回撤',
      dataIndex: 'maxDrawdown',
      width: 80,
      align: 'right' as const,
      render: (v: number) => {
        const color = v < 5 ? '#52c41a' : v < 15 ? '#faad14' : '#ff4d4f';
        return <Text style={{ color }}>-{v.toFixed(2)}%</Text>;
      },
    },
    {
      title: '夏普比率',
      dataIndex: 'sharpeRatio',
      width: 80,
      align: 'right' as const,
      render: (v: number) => {
        const color = v > 1 ? '#52c41a' : v > 0 ? '#faad14' : '#ff4d4f';
        return <Text strong style={{ color }}>{v.toFixed(2)}</Text>;
      },
    },
  ];

  return (
    <div>
      {/* 市场概览 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {overviewCards.map((card) => (
          <Col xs={24} sm={12} lg={6} key={card.title}>
            <Card bodyStyle={{ padding: '16px 18px' }} style={{ borderRadius: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: card.bg, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  color: card.color, flexShrink: 0,
                }}>
                  {card.icon}
                </div>
                <div style={{ minWidth: 0 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>{card.title}</Text>
                  <div style={{ fontSize: 18, fontWeight: 600, color: card.color, fontVariantNumeric: 'tabular-nums' }}>
                    {typeof card.value === 'number' ? `${card.value >= 0 && card.title.includes('涨幅') ? '+' : ''}${card.value.toFixed(2)}${card.suffix || ''}` : card.value}
                  </div>
                  {card.sub && <Text type="secondary" style={{ fontSize: 11 }} ellipsis>{card.sub}</Text>}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 市场情绪条 */}
      {overview && (
        <Card bodyStyle={{ padding: '12px 20px' }} style={{ marginBottom: 16, borderRadius: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ThunderboltOutlined style={{ color: sentimentColor, fontSize: 16 }} />
            <Text strong style={{ fontSize: 13 }}>市场情绪：</Text>
            <Tag color={sentimentColor} style={{ borderRadius: 4, fontWeight: 500 }}>{sentimentText}</Tag>
            <div style={{ flex: 1 }}>
              <Progress
                percent={overview.sentimentScore}
                strokeColor={sentimentColor}
                showInfo={false}
                size="small"
              />
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>{overview.sentimentScore}% 基金上涨</Text>
          </div>
        </Card>
      )}

      {/* 主要内容 */}
      <Spin spinning={loading}>
        <Tabs
          defaultActiveKey="recommendations"
          items={[
            {
              key: 'recommendations',
              label: (
                <span><SafetyOutlined /> 智能推荐</span>
              ),
              children: (
                <Card bodyStyle={{ padding: 0 }}>
                  <Table
                    columns={recommendationColumns}
                    dataSource={recommendations}
                    rowKey="fundCode"
                    pagination={{ pageSize: 10, showTotal: (t) => <Text type="secondary">共 {t} 只基金</Text>, size: 'small' }}
                    locale={{ emptyText: <Empty description="暂无推荐数据" /> }}
                    size="small"
                    scroll={{ x: 750 }}
                  />
                  <div style={{ padding: '8px 16px', borderTop: '1px solid #f0f0f0' }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      推荐算法基于动量、风险、一致性、价值四维度加权评分，仅供参考，不构成投资建议。
                    </Text>
                  </div>
                </Card>
              ),
            },
            {
              key: 'topFunds',
              label: <span><RiseOutlined /> 热门基金</span>,
              children: (
                <Card bodyStyle={{ padding: 0 }}>
                  <Table
                    columns={topFundsColumns}
                    dataSource={topFunds}
                    rowKey="code"
                    pagination={{ pageSize: 10, size: 'small' }}
                    locale={{ emptyText: <Empty description="暂无数据" /> }}
                    size="small"
                    scroll={{ x: 700 }}
                  />
                </Card>
              ),
            },
            {
              key: 'sectors',
              label: <span><BarChartOutlined /> 板块趋势</span>,
              children: (
                <Card bodyStyle={{ padding: 0 }}>
                  <Table
                    columns={sectorColumns}
                    dataSource={sectorTrends}
                    rowKey="type"
                    pagination={false}
                    locale={{ emptyText: <Empty description="暂无数据" /> }}
                    size="small"
                  />
                </Card>
              ),
            },
            {
              key: 'risk',
              label: <span><ThunderboltOutlined /> 风险指标</span>,
              children: (
                <Card bodyStyle={{ padding: 0 }}>
                  <Table
                    columns={riskColumns}
                    dataSource={riskIndicators}
                    rowKey="fundCode"
                    pagination={{ pageSize: 10, size: 'small' }}
                    locale={{ emptyText: <Empty description="暂无数据" /> }}
                    size="small"
                    scroll={{ x: 550 }}
                  />
                </Card>
              ),
            },
          ]}
        />
      </Spin>
    </div>
  );
};

export default MarketAnalysis;
