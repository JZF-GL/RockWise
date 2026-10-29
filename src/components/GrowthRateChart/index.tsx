import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Radio, Card, Row, Col, Statistic, Space, Tag } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { darkThemeTokens } from '../../styles/theme';

export interface HistoryItem {
  date: string;
  nav: number;
  totalNav: number;
  dayGrowth: number;
}

interface GrowthRateChartProps {
  data: HistoryItem[]; // 建议传入时间正序数组
  fundName?: string;
  height?: number;
}

type ViewMode = 'cumulative' | 'daily';
type PeriodOption = '1m' | '3m' | '6m' | '1y';

const GrowthRateChart: React.FC<GrowthRateChartProps> = ({
  data,
  fundName,
  height = 360,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('cumulative');
  const [period, setPeriod] = useState<PeriodOption>('3m');

  // 根据选择周期截取数据（假设 data 是正序：旧 -> 新）
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    let count = data.length;
    if (period === '1m') count = 22;
    else if (period === '3m') count = 66;
    else if (period === '6m') count = 125;
    else if (period === '1y') count = 250;

    const sliceCount = Math.min(count, data.length);
    return data.slice(data.length - sliceCount);
  }, [data, period]);

  // 计算累计收益率序列及各项量化统计指标
  const stats = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        cumReturn: 0,
        maxRate: 0,
        minRate: 0,
        maxRateDate: '',
        minRateDate: '',
        maxDrawdown: 0,
        upCount: 0,
        downCount: 0,
        flatCount: 0,
        winRate: 0,
        chartDates: [] as string[],
        chartValues: [] as number[],
        navValues: [] as number[],
        dailyValues: [] as number[],
      };
    }

    const baseNav = filteredData[0].nav || 1;
    const chartDates: string[] = [];
    const chartValues: number[] = [];
    const navValues: number[] = [];
    const dailyValues: number[] = [];

    let upCount = 0;
    let downCount = 0;
    let flatCount = 0;

    filteredData.forEach((item) => {
      chartDates.push(item.date);
      navValues.push(item.nav);
      dailyValues.push(item.dayGrowth);

      if (item.dayGrowth > 0) upCount++;
      else if (item.dayGrowth < 0) downCount++;
      else flatCount++;

      // 累计收益率计算: ((nav - baseNav) / baseNav) * 100
      const cum = ((item.nav - baseNav) / baseNav) * 100;
      chartValues.push(parseFloat(cum.toFixed(2)));
    });

    const activeValues = viewMode === 'cumulative' ? chartValues : dailyValues;

    let maxVal = activeValues[0];
    let minVal = activeValues[0];
    let maxDate = chartDates[0];
    let minDate = chartDates[0];

    activeValues.forEach((val, idx) => {
      if (val > maxVal) {
        maxVal = val;
        maxDate = chartDates[idx];
      }
      if (val < minVal) {
        minVal = val;
        minDate = chartDates[idx];
      }
    });

    // 计算区间最大回撤 (基于净值序列)
    let peak = navValues[0];
    let maxDrawdown = 0;
    for (const val of navValues) {
      if (val > peak) {
        peak = val;
      }
      const dd = peak > 0 ? ((peak - val) / peak) * 100 : 0;
      if (dd > maxDrawdown) {
        maxDrawdown = dd;
      }
    }

    const lastCum = chartValues[chartValues.length - 1];
    const totalDays = upCount + downCount + flatCount;
    const winRate = totalDays > 0 ? (upCount / totalDays) * 100 : 0;

    return {
      cumReturn: lastCum,
      maxRate: maxVal,
      minRate: minVal,
      maxRateDate: maxDate,
      minRateDate: minDate,
      maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
      upCount,
      downCount,
      flatCount,
      winRate: parseFloat(winRate.toFixed(1)),
      chartDates,
      chartValues,
      navValues,
      dailyValues,
    };
  }, [filteredData, viewMode]);

  // ECharts 配置项
  const option = useMemo(() => {
    const isCum = viewMode === 'cumulative';
    const currentValues = isCum ? stats.chartValues : stats.dailyValues;

    if (isCum) {
      // 累计收益率折线图
      const isOverallRise = stats.cumReturn >= 0;
      const lineColor = isOverallRise ? darkThemeTokens.up : darkThemeTokens.down;
      const areaColor = isOverallRise ? darkThemeTokens.upBg : darkThemeTokens.downBg;

      return {
        title: fundName ? {
          text: `${fundName} 累计收益率走势`,
          left: 'center',
          textStyle: { fontSize: 13, fontWeight: 'normal', color: darkThemeTokens.textSecondary },
        } : undefined,
        tooltip: {
          trigger: 'axis',
          backgroundColor: darkThemeTokens.bgTooltip,
          borderColor: darkThemeTokens.border,
          textStyle: { color: darkThemeTokens.textPrimary },
          formatter: (params: any) => {
            const idx = params[0]?.dataIndex;
            const date = stats.chartDates[idx];
            const cumVal = stats.chartValues[idx];
            const dGrowth = stats.dailyValues[idx];
            const nav = stats.navValues[idx];
            return `
              <div style="font-size:12px;">
                <div style="font-weight:600;margin-bottom:4px;color:${darkThemeTokens.textHeading};">${date}</div>
                <div style="color:${darkThemeTokens.textSecondary};">区间累计收益: <span style="font-weight:600;color:${cumVal >= 0 ? darkThemeTokens.up : darkThemeTokens.down}">${cumVal >= 0 ? '+' : ''}${cumVal}%</span></div>
                <div style="color:${darkThemeTokens.textSecondary};">当日涨跌幅: <span style="color:${dGrowth >= 0 ? darkThemeTokens.up : darkThemeTokens.down}">${dGrowth >= 0 ? '+' : ''}${dGrowth}%</span></div>
                <div style="color:${darkThemeTokens.textSecondary};">对应净值: <b style="color:${darkThemeTokens.primaryHover}">${nav.toFixed(4)}</b></div>
              </div>
            `;
          },
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '12%',
          top: '12%',
          containLabel: true,
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: stats.chartDates,
          axisLine: { lineStyle: { color: darkThemeTokens.border } },
          axisLabel: {
            fontSize: 11,
            rotate: stats.chartDates.length > 30 ? 30 : 0,
            color: darkThemeTokens.textSecondary,
          },
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            formatter: '{value}%',
            color: darkThemeTokens.textSecondary,
          },
          splitLine: {
            lineStyle: {
              type: 'dashed',
              color: 'rgba(255, 255, 255, 0.05)',
            },
          },
        },
        series: [
          {
            name: '累计收益率',
            type: 'line',
            data: currentValues,
            smooth: false,
            lineStyle: {
              color: lineColor,
              width: 2.2,
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
            itemStyle: {
              color: lineColor,
            },
            markLine: {
              silent: true,
              symbol: 'none',
              lineStyle: {
                color: 'rgba(255, 255, 255, 0.12)',
                type: 'dashed',
                width: 1,
              },
              data: [{ yAxis: 0, label: { formatter: '0%', color: darkThemeTokens.textTertiary, position: 'end' } }],
            },
            markPoint: {
              data: [
                { type: 'max', name: '最高', itemStyle: { color: darkThemeTokens.up } },
                { type: 'min', name: '最低', itemStyle: { color: darkThemeTokens.down } },
              ],
              label: {
                fontSize: 10,
                formatter: '{c}%',
                color: '#ffffff',
              },
            },
          },
        ],
        dataZoom: [
          { type: 'inside', start: 0, end: 100 },
          {
            type: 'slider',
            start: 0,
            end: 100,
            height: 18,
            bottom: 0,
            borderColor: darkThemeTokens.border,
            backgroundColor: darkThemeTokens.bgInput,
            fillerColor: 'rgba(77, 122, 176, 0.15)',
            textStyle: { color: darkThemeTokens.textSecondary },
          },
        ],
      };
    } else {
      // 单日涨跌幅柱状图/折线图
      return {
        title: fundName ? {
          text: `${fundName} 历史单日涨跌走势`,
          left: 'center',
          textStyle: { fontSize: 13, fontWeight: 'normal', color: darkThemeTokens.textSecondary },
        } : undefined,
        tooltip: {
          trigger: 'axis',
          backgroundColor: darkThemeTokens.bgTooltip,
          borderColor: darkThemeTokens.border,
          textStyle: { color: darkThemeTokens.textPrimary },
          formatter: (params: any) => {
            const idx = params[0]?.dataIndex;
            const date = stats.chartDates[idx];
            const dGrowth = stats.dailyValues[idx];
            const nav = stats.navValues[idx];
            return `
              <div style="font-size:12px;">
                <div style="font-weight:600;margin-bottom:4px;color:${darkThemeTokens.textHeading};">${date}</div>
                <div style="color:${darkThemeTokens.textSecondary};">日涨跌幅: <span style="font-weight:600;color:${dGrowth >= 0 ? darkThemeTokens.up : darkThemeTokens.down}">${dGrowth >= 0 ? '+' : ''}${dGrowth}%</span></div>
                <div style="color:${darkThemeTokens.textSecondary};">当日净值: <b style="color:${darkThemeTokens.primaryHover}">${nav.toFixed(4)}</b></div>
              </div>
            `;
          },
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '12%',
          top: '12%',
          containLabel: true,
        },
        xAxis: {
          type: 'category',
          data: stats.chartDates,
          axisLine: { lineStyle: { color: darkThemeTokens.border } },
          axisLabel: {
            fontSize: 11,
            rotate: stats.chartDates.length > 30 ? 30 : 0,
            color: darkThemeTokens.textSecondary,
          },
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            formatter: '{value}%',
            color: darkThemeTokens.textSecondary,
          },
          splitLine: {
            lineStyle: {
              type: 'dashed',
              color: 'rgba(255, 255, 255, 0.05)',
            },
          },
        },
        series: [
          {
            name: '日涨跌幅',
            type: 'bar',
            data: stats.dailyValues.map((val) => ({
              value: val,
              itemStyle: {
                color: val >= 0 ? darkThemeTokens.up : darkThemeTokens.down,
              },
            })),
            markLine: {
              silent: true,
              symbol: 'none',
              lineStyle: {
                color: 'rgba(255, 255, 255, 0.12)',
                type: 'dashed',
              },
              data: [{ yAxis: 0, label: { formatter: '0%', color: darkThemeTokens.textTertiary } }],
            },
          },
        ],
        dataZoom: [
          { type: 'inside', start: 0, end: 100 },
          {
            type: 'slider',
            start: 0,
            end: 100,
            height: 18,
            bottom: 0,
            borderColor: darkThemeTokens.border,
            backgroundColor: darkThemeTokens.bgInput,
            fillerColor: 'rgba(77, 122, 176, 0.15)',
            textStyle: { color: darkThemeTokens.textSecondary },
          },
        ],
      };
    }
  }, [viewMode, stats]);

  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: '#8c8c8c' }}>
        暂无百分比涨跌历史数据
      </div>
    );
  }

  const isRise = stats.cumReturn > 0;

  return (
    <div>
      {/* 顶部控制栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <Space wrap>
          <Radio.Group
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            buttonStyle="solid"
            size="small"
          >
            <Radio.Button value="cumulative">累计收益率走势</Radio.Button>
            <Radio.Button value="daily">单日涨跌走势</Radio.Button>
          </Radio.Group>

          <Radio.Group
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            size="small"
          >
            <Radio.Button value="1m">1个月</Radio.Button>
            <Radio.Button value="3m">3个月</Radio.Button>
            <Radio.Button value="6m">半年</Radio.Button>
            <Radio.Button value="1y">一年</Radio.Button>
          </Radio.Group>
        </Space>

        <Space>
          <Tag style={{
            background: 'rgba(255, 255, 255, 0.04)',
            borderColor: darkThemeTokens.border,
            color: darkThemeTokens.textSecondary,
          }}>
            胜率: {stats.winRate}% (涨{stats.upCount}天/跌{stats.downCount}天)
          </Tag>
        </Space>
      </div>

      {/* 量化指标小卡片 */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ background: darkThemeTokens.bgInput, borderColor: darkThemeTokens.border }}>
            <Statistic
              title="区间累计收益率"
              value={stats.cumReturn}
              precision={2}
              valueStyle={{ color: isRise ? darkThemeTokens.up : darkThemeTokens.down, fontWeight: 'bold' }}
              prefix={isRise ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              suffix="%"
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ background: darkThemeTokens.bgInput, borderColor: darkThemeTokens.border }}>
            <Statistic
              title="区间最高点"
              value={stats.maxRate}
              precision={2}
              valueStyle={{ color: darkThemeTokens.up }}
              suffix="%"
            />
            <div style={{ fontSize: 11, color: darkThemeTokens.textTertiary, marginTop: 2 }}>{stats.maxRateDate}</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ background: darkThemeTokens.bgInput, borderColor: darkThemeTokens.border }}>
            <Statistic
              title="区间最低点"
              value={stats.minRate}
              precision={2}
              valueStyle={{ color: darkThemeTokens.down }}
              suffix="%"
            />
            <div style={{ fontSize: 11, color: darkThemeTokens.textTertiary, marginTop: 2 }}>{stats.minRateDate}</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ background: darkThemeTokens.bgInput, borderColor: darkThemeTokens.border }}>
            <Statistic
              title="区间最大回撤"
              value={stats.maxDrawdown}
              precision={2}
              valueStyle={{ color: darkThemeTokens.gold }}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      {/* 图表渲染 */}
      <ReactECharts
        option={option}
        style={{ height: `${height}px`, width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
};

export default GrowthRateChart;
