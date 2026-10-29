import { useEffect } from 'react';
import {
  Card, Typography, Button, Tag, Table, Tabs, Row, Col,
  Empty, Progress, Spin,
} from 'antd';
import {
  RiseOutlined, FallOutlined,
  ThunderboltOutlined, SafetyOutlined, BarChartOutlined, LineChartOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useMarketStore } from '../../stores/marketStore';
import { darkThemeTokens } from '../../styles/theme';

const { Text } = Typography;

const MarketAnalysis = () => {
  const navigate = useNavigate();
  const {
    overview, recommendations, topFunds, sectorTrends, riskIndicators,
    loading, fetchAnalysis,
  } = useMarketStore();

  useEffect(() => {
    fetchAnalysis();
  }, []);

  // 情绪颜色 (低调雅致)
  const sentimentColor = overview?.sentiment === 'positive' ? darkThemeTokens.up
    : overview?.sentiment === 'negative' ? darkThemeTokens.down : darkThemeTokens.gold;
  const sentimentText = overview?.sentiment === 'positive' ? '市场向好'
    : overview?.sentiment === 'negative' ? '市场走弱' : '市场平稳';

  // 概览卡片数据
  const overviewCards = overview ? [
    {
      title: '分析基金数',
      value: overview.totalFunds,
      icon: <LineChartOutlined style={{ fontSize: 18 }} />,
      color: darkThemeTokens.primaryHover,
      bg: darkThemeTokens.primaryBg,
    },
    {
      title: '今日平均涨幅',
      value: overview.avgGrowth,
      suffix: '%',
      icon: <BarChartOutlined style={{ fontSize: 18 }} />,
      color: overview.avgGrowth >= 0 ? darkThemeTokens.up : darkThemeTokens.down,
      bg: overview.avgGrowth >= 0 ? darkThemeTokens.upBg : darkThemeTokens.downBg,
    },
    {
      title: '涨幅最大',
      value: overview.topGainer?.growth,
      suffix: '%',
      sub: overview.topGainer?.name,
      icon: <RiseOutlined style={{ fontSize: 18 }} />,
      color: darkThemeTokens.up,
      bg: darkThemeTokens.upBg,
    },
    {
      title: '跌幅最大',
      value: overview.topLoser?.growth,
      suffix: '%',
      sub: overview.topLoser?.name,
      icon: <FallOutlined style={{ fontSize: 18 }} />,
      color: darkThemeTokens.down,
      bg: darkThemeTokens.downBg,
    },
  ] : [];

  // 推荐表格列
  const recommendationColumns = [
    {
      title: '排名',
      width: 50,
      render: (_: any, __: any, index: number) => {
        const bgRank = index === 0 ? 'rgba(200, 94, 104, 0.2)' : index === 1 ? 'rgba(184, 148, 77, 0.2)' : index === 2 ? 'rgba(77, 122, 176, 0.2)' : 'rgba(255, 255, 255, 0.04)';
        const colRank = index === 0 ? darkThemeTokens.up : index === 1 ? darkThemeTokens.gold : index === 2 ? darkThemeTokens.primaryHover : darkThemeTokens.textTertiary;
        return (
          <div style={{
            width: 22, height: 22, borderRadius: 4,
            background: bgRank,
            color: colRank,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 600,
          }}>
            {index + 1}
          </div>
        );
      },
    },
    {
      title: '基金名称',
      dataIndex: 'fundName',
      width: 160,
      ellipsis: true,
      render: (name: string, record: any) => (
        <div>
          <Text strong style={{ fontSize: 13, color: darkThemeTokens.textHeading }}>{name}</Text>
          <br />
          <Text style={{ fontSize: 11, color: darkThemeTokens.textTertiary }}>{record.fundCode}</Text>
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'fundType',
      width: 70,
      render: (type: string) => (
        <Tag style={{ margin: 0, borderRadius: 4, fontSize: 11, background: 'rgba(255, 255, 255, 0.04)', borderColor: darkThemeTokens.border, color: darkThemeTokens.textSecondary }}>{type}</Tag>
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
            style={{ width: 44, marginBottom: 0 }}
          />
          <Text strong style={{ color: record.levelColor, fontSize: 12 }}>{score}</Text>
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
        <Text style={{ color: v > 0 ? darkThemeTokens.up : v < 0 ? darkThemeTokens.down : darkThemeTokens.flat, fontVariantNumeric: 'tabular-nums' }}>
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
        <Text style={{ color: v > 0 ? darkThemeTokens.up : v < 0 ? darkThemeTokens.down : darkThemeTokens.flat, fontVariantNumeric: 'tabular-nums' }}>
          {v > 0 ? '+' : ''}{(v || 0).toFixed(2)}%
        </Text>
      ),
    },
    {
      title: '操作',
      width: 70,
      render: () => (
        <Button
          type="primary"
          size="small"
          style={{ borderRadius: 4, fontSize: 12 }}
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
        <Text style={{ fontSize: 12, color: darkThemeTokens.textTertiary }}>{index + 1}</Text>
      ),
    },
    {
      title: '基金代码',
      dataIndex: 'code',
      width: 88,
      render: (code: string) => <Text style={{ color: darkThemeTokens.textLink }}>{code}</Text>,
    },
    {
      title: '基金名称',
      dataIndex: 'name',
      width: 160,
      ellipsis: true,
      render: (name: string) => <Text strong style={{ fontSize: 13, color: darkThemeTokens.textHeading }}>{name}</Text>,
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 70,
      render: (type: string) => <Tag style={{ margin: 0, borderRadius: 4, fontSize: 11, background: 'rgba(255, 255, 255, 0.04)', borderColor: darkThemeTokens.border, color: darkThemeTokens.textSecondary }}>{type}</Tag>,
    },
    {
      title: '最新净值',
      dataIndex: 'nav',
      width: 80,
      align: 'right' as const,
      render: (v: number) => <Text style={{ fontVariantNumeric: 'tabular-nums', color: darkThemeTokens.textPrimary }}>{v?.toFixed(4) || '--'}</Text>,
    },
    {
      title: '日涨幅',
      dataIndex: 'dayGrowth',
      width: 72,
      align: 'right' as const,
      render: (v: number) => (
        <Text style={{ color: v > 0 ? darkThemeTokens.up : v < 0 ? darkThemeTokens.down : darkThemeTokens.flat }}>
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
        <Text style={{ color: v > 0 ? darkThemeTokens.up : v < 0 ? darkThemeTokens.down : darkThemeTokens.flat }}>
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
        <Text style={{ color: v > 0 ? darkThemeTokens.up : v < 0 ? darkThemeTokens.down : darkThemeTokens.flat }}>
          {v > 0 ? '+' : ''}{(v || 0).toFixed(2)}%
        </Text>
      ),
    },
  ];

  // 板块趋势列
  const sectorColumns = [
    {
      title: '板块类型',
      dataIndex: 'type',
      width: 90,
      render: (type: string) => <Tag style={{ borderRadius: 4, background: 'rgba(255, 255, 255, 0.04)', borderColor: darkThemeTokens.border, color: darkThemeTokens.textSecondary }}>{type}</Tag>,
    },
    {
      title: '基金数量',
      dataIndex: 'count',
      width: 70,
      align: 'right' as const,
      render: (v: number) => <Text style={{ color: darkThemeTokens.textSecondary }}>{v}</Text>,
    },
    {
      title: '今日均涨',
      dataIndex: 'avgDayGrowth',
      width: 90,
      align: 'right' as const,
      render: (v: number) => (
        <Text style={{ color: v > 0 ? darkThemeTokens.up : v < 0 ? darkThemeTokens.down : darkThemeTokens.flat, fontVariantNumeric: 'tabular-nums' }}>
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
        <Text style={{ color: v > 0 ? darkThemeTokens.up : v < 0 ? darkThemeTokens.down : darkThemeTokens.flat, fontVariantNumeric: 'tabular-nums' }}>
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
        <Text style={{ color: v > 0 ? darkThemeTokens.up : v < 0 ? darkThemeTokens.down : darkThemeTokens.flat, fontVariantNumeric: 'tabular-nums' }}>
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
      render: (code: string) => <Text style={{ color: darkThemeTokens.textLink }}>{code}</Text>,
    },
    {
      title: '基金名称',
      dataIndex: 'fundName',
      width: 160,
      ellipsis: true,
      render: (name: string) => <Text style={{ color: darkThemeTokens.textHeading }}>{name}</Text>,
    },
    {
      title: '年化波动率',
      dataIndex: 'volatility',
      width: 90,
      align: 'right' as const,
      render: (v: number) => {
        const color = v < 10 ? darkThemeTokens.down : v < 20 ? darkThemeTokens.gold : darkThemeTokens.up;
        return <Text style={{ color }}>{v.toFixed(2)}%</Text>;
      },
    },
    {
      title: '最大回撤',
      dataIndex: 'maxDrawdown',
      width: 80,
      align: 'right' as const,
      render: (v: number) => {
        const color = v < 5 ? darkThemeTokens.down : v < 15 ? darkThemeTokens.gold : darkThemeTokens.up;
        return <Text style={{ color }}>-{v.toFixed(2)}%</Text>;
      },
    },
    {
      title: '夏普比率',
      dataIndex: 'sharpeRatio',
      width: 80,
      align: 'right' as const,
      render: (v: number) => {
        const color = v > 1 ? darkThemeTokens.down : v > 0 ? darkThemeTokens.gold : darkThemeTokens.up;
        return <Text strong style={{ color }}>{v.toFixed(2)}</Text>;
      },
    },
  ];

  return (
    <div>
      {/* 市场概览 */}
      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        {overviewCards.map((card) => (
          <Col xs={24} sm={12} lg={6} key={card.title}>
            <Card bodyStyle={{ padding: '14px 16px' }} style={{ borderRadius: 8, background: darkThemeTokens.bgCard, border: `1px solid ${darkThemeTokens.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 6,
                  background: card.bg, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  color: card.color, flexShrink: 0,
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                }}>
                  {card.icon}
                </div>
                <div style={{ minWidth: 0 }}>
                  <Text style={{ fontSize: 12, color: darkThemeTokens.textSecondary }}>{card.title}</Text>
                  <div style={{ fontSize: 17, fontWeight: 600, color: card.color, fontVariantNumeric: 'tabular-nums' }}>
                    {typeof card.value === 'number' ? `${card.value >= 0 && card.title.includes('涨幅') ? '+' : ''}${card.value.toFixed(2)}${card.suffix || ''}` : card.value}
                  </div>
                  {card.sub && <Text style={{ fontSize: 11, color: darkThemeTokens.textTertiary }} ellipsis>{card.sub}</Text>}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 市场情绪条 */}
      {overview && (
        <Card bodyStyle={{ padding: '10px 16px' }} style={{ marginBottom: 12, borderRadius: 8, background: darkThemeTokens.bgCard, border: `1px solid ${darkThemeTokens.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ThunderboltOutlined style={{ color: sentimentColor, fontSize: 15 }} />
            <Text strong style={{ fontSize: 12, color: darkThemeTokens.textHeading }}>市场情绪：</Text>
            <Tag color={sentimentColor} style={{ borderRadius: 4, fontWeight: 500, margin: 0 }}>{sentimentText}</Tag>
            <div style={{ flex: 1 }}>
              <Progress
                percent={overview.sentimentScore}
                strokeColor={sentimentColor}
                showInfo={false}
                size="small"
              />
            </div>
            <Text style={{ fontSize: 12, color: darkThemeTokens.textSecondary }}>{overview.sentimentScore}% 基金上涨</Text>
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
                    pagination={{ pageSize: 10, showTotal: (t) => <Text style={{ color: darkThemeTokens.textSecondary, fontSize: 12 }}>共 {t} 只基金</Text>, size: 'small' }}
                    locale={{ emptyText: <Empty description="暂无推荐数据" /> }}
                    size="small"
                    scroll={{ x: 750 }}
                  />
                  <div style={{ padding: '8px 16px', borderTop: `1px solid ${darkThemeTokens.border}` }}>
                    <Text style={{ fontSize: 11, color: darkThemeTokens.textTertiary }}>
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