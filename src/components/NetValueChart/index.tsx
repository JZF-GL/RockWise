import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Radio, Space, Card, Row, Col, Statistic } from 'antd';
import { RiseOutlined, FallOutlined } from '@ant-design/icons';
import { darkThemeTokens } from '../../styles/theme';

interface ChartData {
  dates: string[];
  values: number[];
}

interface NetValueChartProps {
  data: ChartData; // 建议按时间正序传入
  title?: string;
  height?: number;
}

export type PeriodType = '1m' | '3m' | '6m' | '1y';

const NetValueChart: React.FC<NetValueChartProps> = ({
  data,
  title = '净值走势图',
  height = 360,
}) => {
  const [period, setPeriod] = useState<PeriodType>('3m');

  // 根据选定周期过滤截取数据
  const filteredData = useMemo(() => {
    if (!data || !data.dates || data.dates.length === 0) {
      return { dates: [], values: [] };
    }

    let count = data.dates.length;
    // 1个月约 22 交易日，3个月约 66 交易日，半年约 125 交易日，一年约 250 交易日
    if (period === '1m') count = 22;
    else if (period === '3m') count = 66;
    else if (period === '6m') count = 125;
    else if (period === '1y') count = 250;

    const sliceCount = Math.min(count, data.dates.length);
    const startIndex = data.dates.length - sliceCount;

    return {
      dates: data.dates.slice(startIndex),
      values: data.values.slice(startIndex),
    };
  }, [data, period]);

  // 计算区间统计值
  const stats = useMemo(() => {
    const vals = filteredData.values;
    if (!vals || vals.length === 0) {
      return { startNav: 0, latestNav: 0, maxNav: 0, minNav: 0, growth: 0 };
    }
    const startNav = vals[0];
    const latestNav = vals[vals.length - 1];
    let maxNav = vals[0];
    let minNav = vals[0];

    vals.forEach((v) => {
      if (v > maxNav) maxNav = v;
      if (v < minNav) minNav = v;
    });

    const growth = startNav > 0 ? ((latestNav - startNav) / startNav) * 100 : 0;

    return {
      startNav,
      latestNav,
      maxNav,
      minNav,
      growth: parseFloat(growth.toFixed(2)),
    };
  }, [filteredData]);

  const isRise = stats.growth >= 0;

  const option = useMemo(() => {
    return {
      title: {
        text: title,
        left: 'center',
        textStyle: { fontSize: 13, fontWeight: 'normal', color: darkThemeTokens.textSecondary },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: darkThemeTokens.bgTooltip,
        borderColor: darkThemeTokens.border,
        textStyle: { color: darkThemeTokens.textPrimary },
        formatter: (params: any) => {
          const point = params[0];
          if (!point) return '';
          const val = point.value;
          const start = stats.startNav;
          const periodPct = start > 0 ? (((val - start) / start) * 100).toFixed(2) : '0.00';
          const pColor = Number(periodPct) >= 0 ? darkThemeTokens.up : darkThemeTokens.down;
          return `
            <div style="font-size:12px;">
              <div style="font-weight:600;margin-bottom:4px;color:${darkThemeTokens.textHeading};">${point.axisValue}</div>
              <div style="color:${darkThemeTokens.textSecondary};">单位净值: <b style="color:${darkThemeTokens.primaryHover}">${Number(val).toFixed(4)}</b></div>
              <div style="color:${darkThemeTokens.textSecondary};">较区间起点: <span style="font-weight:600;color:${pColor}">${Number(periodPct) >= 0 ? '+' : ''}${periodPct}%</span></div>
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
        data: filteredData.dates,
        axisLine: { lineStyle: { color: darkThemeTokens.border } },
        axisLabel: {
          rotate: filteredData.dates.length > 30 ? 30 : 0,
          fontSize: 11,
          color: darkThemeTokens.textSecondary,
        },
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLabel: {
          formatter: (value: number) => value.toFixed(3),
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
          name: '净值',
          type: 'line',
          data: filteredData.values,
          smooth: false,
          lineStyle: {
            color: darkThemeTokens.primaryHover,
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
                { offset: 0, color: 'rgba(77, 122, 176, 0.22)' },
                { offset: 1, color: 'rgba(77, 122, 176, 0.01)' },
              ],
            },
          },
          itemStyle: {
            color: darkThemeTokens.primaryHover,
          },
          markPoint: {
            data: [
              { type: 'max', name: '最高', itemStyle: { color: darkThemeTokens.up } },
              { type: 'min', name: '最低', itemStyle: { color: darkThemeTokens.down } },
            ],
            label: {
              fontSize: 10,
              formatter: '{c}',
              color: '#ffffff',
            },
          },
        },
      ],
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
        },
        {
          type: 'slider',
          start: 0,
          end: 100,
          height: 18,
          bottom: 2,
          borderColor: darkThemeTokens.border,
          backgroundColor: darkThemeTokens.bgInput,
          fillerColor: 'rgba(77, 122, 176, 0.15)',
          textStyle: { color: darkThemeTokens.textSecondary },
        },
      ],
    };
  }, [filteredData, title, stats]);

  return (
    <div>
      {/* 周期切换与数据统计 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <Space>
          <span style={{ fontSize: 12, color: darkThemeTokens.textSecondary, fontWeight: 500 }}>走势周期:</span>
          <Radio.Group
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            size="small"
            buttonStyle="solid"
          >
            <Radio.Button value="1m">1个月</Radio.Button>
            <Radio.Button value="3m">3个月</Radio.Button>
            <Radio.Button value="6m">半年</Radio.Button>
            <Radio.Button value="1y">一年</Radio.Button>
          </Radio.Group>
        </Space>
      </div>

      {/* 统计指标卡 */}
      <Row gutter={[12, 12]} style={{ marginBottom: 14 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ background: darkThemeTokens.bgInput, borderColor: darkThemeTokens.border }}>
            <Statistic
              title="区间涨跌幅"
              value={stats.growth}
              precision={2}
              valueStyle={{ color: isRise ? darkThemeTokens.up : darkThemeTokens.down, fontWeight: 'bold' }}
              prefix={isRise ? <RiseOutlined /> : <FallOutlined />}
              suffix="%"
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ background: darkThemeTokens.bgInput, borderColor: darkThemeTokens.border }}>
            <Statistic
              title="区间最高净值"
              value={stats.maxNav}
              precision={4}
              valueStyle={{ color: darkThemeTokens.up }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ background: darkThemeTokens.bgInput, borderColor: darkThemeTokens.border }}>
            <Statistic
              title="区间最低净值"
              value={stats.minNav}
              precision={4}
              valueStyle={{ color: darkThemeTokens.down }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ background: darkThemeTokens.bgInput, borderColor: darkThemeTokens.border }}>
            <Statistic
              title="起点净值"
              value={stats.startNav}
              precision={4}
              valueStyle={{ color: darkThemeTokens.textSecondary }}
            />
          </Card>
        </Col>
      </Row>

      <ReactECharts
        option={option}
        style={{ height: `${height}px`, width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
};

export default NetValueChart;
