import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, Row, Col, Statistic, Space, Tag, Alert, Table, Tooltip } from 'antd';
import {
  RiseOutlined,
  FallOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined,
  FundViewOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { darkThemeTokens } from '../../styles/theme';

export interface IntradayPoint {
  time: string; // "09:30" ~ "15:00"
  estimateNav: number;
  growthRate: number; // 相对昨日收盘净值的涨跌百分比
}

export interface IntradayHolding {
  name: string;
  code: string;
  ratio: number;
  price?: number;
  growth?: number;
  contribution?: number;
}

export interface TodayEstimateData {
  updateTime: string;
  // 平台自计算实时估值
  selfEstimateNav?: number;
  selfEstimateGrowth?: number;
  topHoldingsGrowth?: number;
  residualGrowth?: number;
  topHoldingsRatio?: number;
  benchmarkGrowth?: number;
  // 盘中估值（第三方参考）
  latestEstimateNav: number;
  latestEstimateGrowth: number;
  baseNav: number;
  holdings: IntradayHolding[];
  points: IntradayPoint[];
}

interface TodayIntradayEstimateChartProps {
  data: TodayEstimateData | null;
  loading?: boolean;
  fundName?: string;
  fundCode?: string;
  height?: number;
  onRefresh?: () => void;
}

const TodayIntradayEstimateChart: React.FC<TodayIntradayEstimateChartProps> = ({
  data,
  loading = false,
  fundName = '基金',
  height = 380,
  onRefresh,
}) => {
  // 生成分时图完整横轴 (09:30 - 11:30, 13:00 - 15:00，共 241 个分钟点)
  const fullTimeline = useMemo(() => {
    const times: string[] = [];
    const addRange = (startHour: number, startMin: number, endHour: number, endMin: number) => {
      let h = startHour;
      let m = startMin;
      while (h < endHour || (h === endHour && m <= endMin)) {
        const hh = String(h).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        times.push(`${hh}:${mm}`);
        m++;
        if (m >= 60) {
          h++;
          m = 0;
        }
      }
    };
    addRange(9, 30, 11, 30);
    addRange(13, 0, 15, 0);
    return times;
  }, []);

  // 整理图表数据
  const chartSeries = useMemo(() => {
    if (!data || !data.points || data.points.length === 0) {
      return {
        times: fullTimeline,
        navs: [] as (number | null)[],
        growths: [] as (number | null)[],
        maxGrowth: 0,
        minGrowth: 0,
        baseNav: data?.baseNav || 1,
      };
    }

    const pointMap = new Map<string, IntradayPoint>();
    data.points.forEach((p) => pointMap.set(p.time, p));

    // 获取数据源包含的最新有效交易时间戳
    const latestTime = data.points[data.points.length - 1]?.time || '15:00';

    const navs: (number | null)[] = [];
    const growths: (number | null)[] = [];
    let maxG = -999;
    let minG = 999;
    let lastKnownNav = data.baseNav;
    let lastKnownGrowth = 0;

    // 填充到全天分时时间轴中，当前未发生的未来时间填 null 保持留白
    fullTimeline.forEach((t) => {
      if (t > latestTime) {
        navs.push(null);
        growths.push(null);
      } else {
        if (pointMap.has(t)) {
          const pt = pointMap.get(t)!;
          lastKnownNav = pt.estimateNav;
          lastKnownGrowth = pt.growthRate;
        }
        navs.push(lastKnownNav);
        growths.push(lastKnownGrowth);
        if (lastKnownGrowth > maxG) maxG = lastKnownGrowth;
        if (lastKnownGrowth < minG) minG = lastKnownGrowth;
      }
    });

    if (maxG === -999) maxG = data.latestEstimateGrowth || 0;
    if (minG === 999) minG = data.latestEstimateGrowth || 0;

    return {
      times: fullTimeline,
      navs,
      growths,
      maxGrowth: parseFloat(maxG.toFixed(2)),
      minGrowth: parseFloat(minG.toFixed(2)),
      baseNav: data.baseNav,
    };
  }, [data, fullTimeline]);

  // ECharts 配置项
  const option = useMemo(() => {
    if (!data) return {};

    const isRise = data.latestEstimateGrowth >= 0;
    const lineColor = isRise ? darkThemeTokens.up : darkThemeTokens.down;
    const areaColor = isRise ? darkThemeTokens.upBg : darkThemeTokens.downBg;

    // 计算对称合理的 Y 轴幅度（使 0% 基准线正好居中）
    const validGrowths = chartSeries.growths.filter((g): g is number => g !== null && !isNaN(g));
    let maxAbs = 0.5;
    if (validGrowths.length > 0) {
      maxAbs = Math.max(...validGrowths.map(Math.abs), Math.abs(data.latestEstimateGrowth || 0));
    }
    // 留出 25% 视觉缓冲空间，保底 0.5%
    const yLimit = Math.max(0.5, parseFloat((maxAbs * 1.25).toFixed(2)));

    return {
      title: {
        text: `${fundName} 今日分时净值预估 (9:30 - 15:00)`,
        left: 'center',
        textStyle: { fontSize: 13, fontWeight: 'normal', color: darkThemeTokens.textSecondary },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: darkThemeTokens.bgTooltip,
        borderColor: darkThemeTokens.border,
        textStyle: { color: darkThemeTokens.textPrimary },
        formatter: (params: any) => {
          const idx = params[0]?.dataIndex;
          const t = chartSeries.times[idx];
          const g = chartSeries.growths[idx];
          const n = chartSeries.navs[idx];
          if (n === null || n === undefined) return '';
          const gNum = Number(g);
          const pColor = gNum >= 0 ? darkThemeTokens.up : darkThemeTokens.down;
          return `
            <div style="font-size:12px;min-width:140px;">
              <div style="font-weight:600;margin-bottom:4px;color:${darkThemeTokens.textHeading};">时间: ${t}</div>
              <div style="color:${darkThemeTokens.textSecondary};">预估涨跌幅: <span style="font-weight:bold;color:${pColor}">${gNum >= 0 ? '+' : ''}${gNum.toFixed(2)}%</span></div>
              <div style="color:${darkThemeTokens.textSecondary};">预估净值: <b style="color:${darkThemeTokens.primaryHover}">${Number(n).toFixed(4)}</b></div>
              <div style="color:${darkThemeTokens.textTertiary};margin-top:2px;">昨日基准: ${data.baseNav.toFixed(4)}</div>
            </div>
          `;
        },
      },
      grid: {
        left: '4%',
        right: '4%',
        bottom: '10%',
        top: '14%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: chartSeries.times,
        axisLine: { lineStyle: { color: darkThemeTokens.border } },
        axisLabel: {
          interval: (index: number) => {
            const t = chartSeries.times[index];
            return ['09:30', '10:30', '11:30', '14:00', '15:00'].includes(t);
          },
          fontSize: 11,
          color: darkThemeTokens.textSecondary,
        },
        splitLine: {
          show: true,
          lineStyle: { color: 'rgba(255, 255, 255, 0.04)' },
        },
      },
      yAxis: [
        // 左侧：预估涨跌幅百分比
        {
          type: 'value',
          min: -yLimit,
          max: yLimit,
          splitNumber: 4,
          axisLabel: {
            formatter: (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(2)}%`,
            color: (v: number) => (v > 0 ? darkThemeTokens.up : v < 0 ? darkThemeTokens.down : darkThemeTokens.flat),
          },
          splitLine: {
            lineStyle: {
              type: 'dashed',
              color: 'rgba(255, 255, 255, 0.05)',
            },
          },
        },
        // 右侧：对应预估净值
        {
          type: 'value',
          min: parseFloat((data.baseNav * (1 - yLimit / 100)).toFixed(4)),
          max: parseFloat((data.baseNav * (1 + yLimit / 100)).toFixed(4)),
          splitNumber: 4,
          axisLabel: {
            formatter: (v: number) => v.toFixed(4),
            color: darkThemeTokens.textTertiary,
          },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: '盘中预估涨跌幅',
          type: 'line',
          yAxisIndex: 0,
          data: chartSeries.growths,
          smooth: false,
          symbol: 'none',
          lineStyle: {
            color: lineColor,
            width: 2,
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: areaColor },
                { offset: 1, color: 'rgba(255, 255, 255, 0.01)' },
              ],
            },
          },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: {
              color: 'rgba(255, 255, 255, 0.12)',
              type: 'dashed',
              width: 1,
            },
            data: [
              {
                yAxis: 0,
                label: {
                  show: true,
                  formatter: '0.00%',
                  color: darkThemeTokens.textTertiary,
                  position: 'insideEndTop',
                  fontSize: 10,
                },
              },
            ],
          },
        },
      ],
    };
  }, [data, chartSeries, fundName]);

    const isOfficialRise = data ? data.latestEstimateGrowth >= 0 : false;
    const isSelfRise = data ? (data.selfEstimateGrowth ?? 0) >= 0 : false;

    // 重仓股表格列定义
    const columns = [
      {
        title: '重仓股票',
        dataIndex: 'name',
        key: 'name',
        render: (text: string, row: IntradayHolding) => (
          <Space direction="vertical" size={0}>
            <span style={{ fontWeight: 500, color: darkThemeTokens.textHeading }}>{text}</span>
            <Tag style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '16px' }}>{row.code}</Tag>
          </Space>
        ),
      },
      {
        title: '持仓占比',
        dataIndex: 'ratio',
        key: 'ratio',
        align: 'right' as const,
        render: (v: number) => <span style={{ fontWeight: 500 }}>{v.toFixed(2)}%</span>,
      },
      {
        title: '实时涨跌',
        dataIndex: 'growth',
        key: 'growth',
        align: 'right' as const,
        render: (v?: number) => {
          if (v === undefined || v === null) return '--';
          const up = v > 0;
          const color = v === 0 ? darkThemeTokens.flat : up ? darkThemeTokens.up : darkThemeTokens.down;
          return <span style={{ color, fontWeight: 600 }}>{up ? '+' : ''}{v.toFixed(2)}%</span>;
        },
      },
      {
        title: (
          <Tooltip title="估值拉动贡献 = 持仓占比 × 股票涨跌幅 / 100">
            <span>贡献度 <InfoCircleOutlined style={{ fontSize: 11 }} /></span>
          </Tooltip>
        ),
        dataIndex: 'contribution',
        key: 'contribution',
        align: 'right' as const,
        render: (v?: number) => {
          if (v === undefined || v === null) return '--';
          const up = v > 0;
          const color = v === 0 ? darkThemeTokens.flat : up ? darkThemeTokens.up : darkThemeTokens.down;
          return (
            <Tooltip title={`持仓贡献拉动估值: ${up ? '+' : ''}${v.toFixed(4)}%`}>
              <span style={{ color, fontWeight: 600 }}>{up ? '+' : ''}{v.toFixed(2)}%</span>
            </Tooltip>
          );
        },
      },
    ];

    return (
      <div>
        {/* 顶部行情看板：平台自计算实时估值置于三方盘中估值前面 */}
        <Card size="small" style={{ marginBottom: 16, background: darkThemeTokens.bgInput, borderColor: darkThemeTokens.border }}>
          <Row gutter={[16, 16]} align="middle">
            {/* 1. 平台自计算实时估值（核心自研算法） */}
            <Col xs={24} sm={12} md={5}>
              <Statistic
                title={
                  <Space size={4}>
                    <Tag color="blue" style={{ fontSize: 11, margin: 0, padding: '0 4px', lineHeight: '18px' }}>平台自算</Tag>
                    <span>实时估值净值</span>
                    <Tooltip
                      title={
                        <div>
                          <div><b>平台自计算估值算法模型：</b></div>
                          <div>· 前十大重仓股加权贡献: {data?.topHoldingsGrowth !== undefined ? `${data.topHoldingsGrowth > 0 ? '+' : ''}${data.topHoldingsGrowth.toFixed(4)}%` : '--'} (持仓占比 {data?.topHoldingsRatio || 0}%)</div>
                          <div>· 剩余未披露持仓拟合贡献: {data?.residualGrowth !== undefined ? `${data.residualGrowth > 0 ? '+' : ''}${data.residualGrowth.toFixed(4)}%` : '--'} (沪深300指数今日 {data?.benchmarkGrowth !== undefined ? `${data.benchmarkGrowth > 0 ? '+' : ''}${data.benchmarkGrowth}%` : '--'})</div>
                          <div>· 平台自算总估值涨幅 = 重仓贡献 + 剩余仓位基准拟合</div>
                        </div>
                      }
                    >
                      <InfoCircleOutlined style={{ color: darkThemeTokens.primaryHover, cursor: 'pointer' }} />
                    </Tooltip>
                  </Space>
                }
                value={data?.selfEstimateNav || data?.latestEstimateNav || '--'}
                precision={4}
                valueStyle={{ color: isSelfRise ? darkThemeTokens.up : darkThemeTokens.down, fontWeight: 'bold' }}
                prefix={isSelfRise ? <RiseOutlined /> : <FallOutlined />}
              />
            </Col>

            <Col xs={12} sm={6} md={4}>
              <Statistic
                title={
                  <Space size={4}>
                    <Tag color="blue" style={{ fontSize: 11, margin: 0, padding: '0 4px', lineHeight: '18px' }}>平台自算</Tag>
                    <span>估值涨跌幅</span>
                  </Space>
                }
                value={`${isSelfRise ? '+' : ''}${(data?.selfEstimateGrowth ?? data?.latestEstimateGrowth)?.toFixed(2) || '0.00'}%`}
                valueStyle={{ color: isSelfRise ? darkThemeTokens.up : darkThemeTokens.down, fontWeight: 'bold' }}
              />
            </Col>

            {/* 2. 传统盘中估值（第三方参考源） */}
            <Col xs={12} sm={6} md={5}>
              <Statistic
                title={
                  <Space size={4}>
                    <Tag style={{ fontSize: 11, margin: 0, padding: '0 4px', lineHeight: '18px' }}>三方参考</Tag>
                    <span>盘中预估净值</span>
                  </Space>
                }
                value={data?.latestEstimateNav || '--'}
                precision={4}
                valueStyle={{ color: isOfficialRise ? darkThemeTokens.up : darkThemeTokens.down, opacity: 0.85 }}
              />
            </Col>

            <Col xs={12} sm={6} md={3}>
              <Statistic
                title="盘中预估涨幅"
                value={`${isOfficialRise ? '+' : ''}${data?.latestEstimateGrowth?.toFixed(2) || '0.00'}%`}
                valueStyle={{ color: isOfficialRise ? darkThemeTokens.up : darkThemeTokens.down, opacity: 0.85 }}
              />
            </Col>

            <Col xs={12} sm={6} md={3}>
              <Statistic
                title="昨收基准净值"
                value={data?.baseNav || '--'}
                precision={4}
                valueStyle={{ color: darkThemeTokens.textSecondary }}
              />
            </Col>

            <Col xs={24} sm={12} md={4} style={{ textAlign: 'right' }}>
              <Space direction="vertical" size={2} align="end">
                <Space>
                  <ClockCircleOutlined style={{ color: darkThemeTokens.textTertiary }} />
                  <span style={{ fontSize: 12, color: darkThemeTokens.textSecondary }}>
                    更新: <b style={{ color: darkThemeTokens.textHeading }}>{data?.updateTime || '交易日实时'}</b>
                  </span>
                </Space>
                {onRefresh && (
                  <a
                    onClick={onRefresh}
                    style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, color: darkThemeTokens.textLink }}
                  >
                    <ReloadOutlined spin={loading} /> 刷新自算估值
                  </a>
                )}
              </Space>
            </Col>
          </Row>
        </Card>

        {/* 分时图主体与重仓股侧栏 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card size="small">
              <ReactECharts
                option={option}
                style={{ height: `${height}px`, width: '100%' }}
                opts={{ renderer: 'canvas' }}
              />
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card
              size="small"
              title={
                <Space>
                  <FundViewOutlined />
                  <span>平台自算持仓拟合明细 (Top 5)</span>
                </Space>
              }
              style={{ height: '100%' }}
            >
              {data && data.holdings && data.holdings.length > 0 ? (
                <Table
                  dataSource={data.holdings.slice(0, 5)}
                  columns={columns}
                  rowKey="code"
                  pagination={false}
                  size="small"
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 0', color: '#8c8c8c' }}>
                  暂无披露重仓股数据
                </div>
              )}
              <div style={{ marginTop: 12, fontSize: 11, color: '#8c8c8c', lineHeight: '18px' }}>
                注：平台自计算估值根据基金季报披露的前十大重仓股实时涨跌幅逐笔加权，并结合沪深300指数拟合剩余仓位。
              </div>
            </Card>
          </Col>
        </Row>

        {/* 说明栏 */}
        <Alert
          style={{ marginTop: 16 }}
          type="warning"
          showIcon
          message="估值说明提示"
          description="平台自计算实时估值采用持仓加权量化模型（重仓股实时逐笔加权 + 剩余股票仓位基准指数拟合），与第三方参考估值共同提供盘中参考。基金每日官方结算净值将于交易日晚间清算后正式公布。"
        />
      </div>
  );
};

export default TodayIntradayEstimateChart;
