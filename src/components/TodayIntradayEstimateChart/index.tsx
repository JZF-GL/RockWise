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

export interface IntradayPoint {
  time: string; // "09:30" ~ "15:00"
  estimateNav: number;
  growthRate: number; // 相对昨日收盘净值的涨跌百分比
}

export interface IntradayHolding {
  name: string;
  code: string;
  ratio: number;
}

export interface TodayEstimateData {
  updateTime: string;
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
    const lineColor = isRise ? '#cf1322' : '#3f8600';
    const areaColor = isRise ? 'rgba(207, 19, 34, 0.12)' : 'rgba(63, 134, 0, 0.12)';

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
        textStyle: { fontSize: 13, fontWeight: 'normal', color: '#595959' },
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const idx = params[0]?.dataIndex;
          const t = chartSeries.times[idx];
          const g = chartSeries.growths[idx];
          const n = chartSeries.navs[idx];
          if (n === null || n === undefined) return '';
          const gNum = Number(g);
          return `
            <div style="font-size:12px;min-width:140px;">
              <div style="font-weight:600;margin-bottom:4px;color:#333;">时间: ${t}</div>
              <div>预估涨跌幅: <span style="font-weight:bold;color:${gNum >= 0 ? '#cf1322' : '#3f8600'}">${gNum >= 0 ? '+' : ''}${gNum.toFixed(2)}%</span></div>
              <div>预估净值: <b style="color:#1677ff">${Number(n).toFixed(4)}</b></div>
              <div style="color:#8c8c8c;margin-top:2px;">昨日基准: ${data.baseNav.toFixed(4)}</div>
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
        axisLabel: {
          interval: (index: number) => {
            // 仅在 09:30, 10:30, 11:30/13:00, 14:00, 15:00 展示坐标标签
            const t = chartSeries.times[index];
            return ['09:30', '10:30', '11:30', '14:00', '15:00'].includes(t);
          },
          fontSize: 11,
        },
        splitLine: {
          show: true,
          lineStyle: { color: '#f5f5f5' },
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
            color: (v: number) => (v > 0 ? '#cf1322' : v < 0 ? '#3f8600' : '#8c8c8c'),
          },
          splitLine: {
            lineStyle: {
              type: 'dashed',
              color: '#f0f0f0',
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
            color: '#8c8c8c',
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
          smooth: true,
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
              color: '#bfbfbf',
              type: 'dashed',
              width: 1,
            },
            data: [
              {
                yAxis: 0,
                label: {
                  formatter: '昨收基准: 0.00%',
                  position: 'insideEndTop',
                  fontSize: 10,
                  color: '#8c8c8c',
                },
              },
            ],
          },
        },
      ],
    };
  }, [data, chartSeries, fundName]);

  const isRise = data ? data.latestEstimateGrowth >= 0 : false;

  // 重仓股表格列定义
  const columns = [
    {
      title: '重仓股票',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, row: IntradayHolding) => (
        <Space size="small">
          <span style={{ fontWeight: 500 }}>{text}</span>
          <Tag style={{ fontSize: 10 }}>{row.code}</Tag>
        </Space>
      ),
    },
    {
      title: '持仓占比',
      dataIndex: 'ratio',
      key: 'ratio',
      align: 'right' as const,
      render: (v: number) => <span style={{ fontWeight: 600 }}>{v.toFixed(2)}%</span>,
    },
  ];

  return (
    <div>
      {/* 顶部行情看板 */}
      <Card size="small" style={{ marginBottom: 16, background: '#fafcff', borderColor: '#d6e4ff' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={6}>
            <Statistic
              title={
                <Space>
                  <span>今日实时预估净值</span>
                  <Tooltip title="基于新浪行情盘中估值及核心重仓股日内分时拟合">
                    <InfoCircleOutlined style={{ color: '#1677ff' }} />
                  </Tooltip>
                </Space>
              }
              value={data?.latestEstimateNav || '--'}
              precision={4}
              valueStyle={{ color: isRise ? '#cf1322' : '#3f8600', fontWeight: 'bold' }}
              prefix={isRise ? <RiseOutlined /> : <FallOutlined />}
            />
          </Col>

          <Col xs={12} sm={6}>
            <Statistic
              title="盘中预估涨跌幅"
              value={`${isRise ? '+' : ''}${data?.latestEstimateGrowth?.toFixed(2) || '0.00'}%`}
              valueStyle={{ color: isRise ? '#cf1322' : '#3f8600', fontWeight: 'bold' }}
            />
          </Col>

          <Col xs={12} sm={6}>
            <Statistic
              title="昨收基准净值"
              value={data?.baseNav || '--'}
              precision={4}
              valueStyle={{ color: '#595959' }}
            />
          </Col>

          <Col xs={24} sm={6} style={{ textAlign: 'right' }}>
            <Space direction="vertical" size={2} align="end">
              <Space>
                <ClockCircleOutlined style={{ color: '#8c8c8c' }} />
                <span style={{ fontSize: 12, color: '#595959' }}>
                  更新时间: <b>{data?.updateTime || '交易日实时'}</b>
                </span>
              </Space>
              {onRefresh && (
                <a
                  onClick={onRefresh}
                  style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}
                >
                  <ReloadOutlined spin={loading} /> 点击刷新预估
                </a>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 分时图主体与重仓股侧栏 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={17}>
          <Card size="small">
            <ReactECharts
              option={option}
              style={{ height: `${height}px`, width: '100%' }}
              opts={{ renderer: 'canvas' }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={7}>
          <Card
            size="small"
            title={
              <Space>
                <FundViewOutlined />
                <span>估值拟合参考持仓 (Top 5)</span>
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
              注：根据基金最新季报披露的前十大重仓股日内分时行情，结合新浪财经盘中估值进行实时加权拟合。
            </div>
          </Card>
        </Col>
      </Row>

      {/* 说明栏 */}
      <Alert
        style={{ marginTop: 16 }}
        type="warning"
        showIcon
        message="盘中估值提示"
        description="本分时预估数据仅供盘中决策参考，非基金公司官方确认的清算净值。基金实际净值将于每个交易日晚间（通常为 19:00 - 22:00）由基金管理人与托管银行完成清算核对后正式发布。"
      />
    </div>
  );
};

export default TodayIntradayEstimateChart;
