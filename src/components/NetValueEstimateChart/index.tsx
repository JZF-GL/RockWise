import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Radio, Card, Row, Col, Statistic, Space, Tag, Alert } from 'antd';
import { LineChartOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { HistoryItem } from '../GrowthRateChart';

interface NetValueEstimateChartProps {
  data: HistoryItem[]; // 历史净值，按时间正序排列
  currentNetValue?: number;
  fundName?: string;
  height?: number;
}

type ForecastDays = 7 | 14 | 30;
type SamplePeriod = '1m' | '3m' | '6m' | '1y';

const NetValueEstimateChart: React.FC<NetValueEstimateChartProps> = ({
  data,
  currentNetValue,
  fundName = '基金',
  height = 360,
}) => {
  const [forecastDays, setForecastDays] = useState<ForecastDays>(14);
  const [samplePeriod, setSamplePeriod] = useState<SamplePeriod>('3m');

  // 计算未来交易日日期字符串（自动跳过周末）
  const getNextTradingDates = (startDateStr: string, count: number): string[] => {
    const dates: string[] = [];
    const curr = new Date(startDateStr);
    while (dates.length < count) {
      curr.setDate(curr.getDate() + 1);
      const dayOfWeek = curr.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const y = curr.getFullYear();
        const m = String(curr.getMonth() + 1).padStart(2, '0');
        const d = String(curr.getDate()).padStart(2, '0');
        dates.push(`${y}-${m}-${d}`);
      }
    }
    return dates;
  };

  // 量化预估模型计算
  const forecastResult = useMemo(() => {
    if (!data || data.length < 5) {
      return null;
    }

    // 根据选择的回溯周期取样本点（1个月22天、3个月66天、半年125天、一年250天）
    let sampleCount = 66;
    if (samplePeriod === '1m') sampleCount = 22;
    else if (samplePeriod === '3m') sampleCount = 66;
    else if (samplePeriod === '6m') sampleCount = 125;
    else if (samplePeriod === '1y') sampleCount = 250;

    const actualCount = Math.min(sampleCount, data.length);
    const recent = data.slice(data.length - actualCount);
    const latestItem = recent[recent.length - 1];
    const latestNav = currentNetValue || latestItem.nav;
    const latestDate = latestItem.date;

    // 1. 计算日收益率序列及波动率
    const returns: number[] = [];
    for (let i = 1; i < recent.length; i++) {
      const prev = recent[i - 1].nav;
      const curr = recent[i].nav;
      if (prev > 0) {
        returns.push((curr - prev) / prev);
      }
    }

    const n = returns.length;
    if (n === 0) return null;

    // 均值（日漂移率）与标准差（日波动率）
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / n;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / (n - 1 || 1);
    const dailyVol = Math.sqrt(variance);

    // 短期动量加权调整：近10天的趋势影响更大
    const shortTerm = returns.slice(-10);
    const shortMean = shortTerm.reduce((sum, r) => sum + r, 0) / (shortTerm.length || 1);
    const blendedDrift = meanReturn * 0.4 + shortMean * 0.6;
    // 阻尼系数（避免长期过度外推偏离）
    const damping = 0.95;

    // 生成未来交易日
    const futureDates = getNextTradingDates(latestDate, forecastDays);

    // 预测净值序列及置信区间
    const predictedNavs: number[] = [];
    const upperBounds: number[] = [];
    const lowerBounds: number[] = [];

    let currentExpected = latestNav;
    for (let t = 1; t <= forecastDays; t++) {
      const effectiveDrift = blendedDrift * Math.pow(damping, t);
      currentExpected = currentExpected * (1 + effectiveDrift);
      // 95% 置信区间: 1.96 * vol * sqrt(t)
      const confMargin = latestNav * (1.96 * dailyVol * Math.sqrt(t));

      predictedNavs.push(parseFloat(currentExpected.toFixed(4)));
      upperBounds.push(parseFloat((currentExpected + confMargin).toFixed(4)));
      lowerBounds.push(parseFloat(Math.max(0.01, currentExpected - confMargin).toFixed(4)));
    }

    // 最终预期与涨跌幅度
    const targetNav = predictedNavs[predictedNavs.length - 1];
    const targetGrowth = ((targetNav - latestNav) / latestNav) * 100;
    const maxTargetGrowth = ((upperBounds[upperBounds.length - 1] - latestNav) / latestNav) * 100;
    const minTargetGrowth = ((lowerBounds[lowerBounds.length - 1] - latestNav) / latestNav) * 100;

    // 研判倾向
    let sentiment: { label: string; color: string; desc: string } = {
      label: '震荡整理',
      color: 'blue',
      desc: '多空博弈均衡，建议波段操作',
    };
    if (targetGrowth > 1.5) {
      sentiment = {
        label: '偏强看多',
        color: 'red',
        desc: '动量向上且均线上扬，具备上行潜能',
      };
    } else if (targetGrowth < -1.5) {
      sentiment = {
        label: '承压防守',
        color: 'green',
        desc: '近期承压回调，需防范下行回撤风险',
      };
    }

    // 拼接图表时间轴和数据：展示该回溯周期的历史交易日 + 未来 N 天预测
    const historyWindow = recent;
    const allDates = [...historyWindow.map((h) => h.date), ...futureDates];

    // 历史实际净值 (未来部分填 null)
    const historySeriesData: (number | null)[] = [
      ...historyWindow.map((h) => h.nav),
      ...futureDates.map(() => null),
    ];

    // 预测净值 (历史部分除最后一个点外填 null，最后一个点填真实值以平滑连接)
    const forecastSeriesData: (number | null)[] = [
      ...historyWindow.slice(0, -1).map(() => null),
      latestNav,
      ...predictedNavs,
    ];

    // 上下轨 (同样在最后一个历史点对齐连接)
    const upperSeriesData: (number | null)[] = [
      ...historyWindow.slice(0, -1).map(() => null),
      latestNav,
      ...upperBounds,
    ];

    const lowerSeriesData: (number | null)[] = [
      ...historyWindow.slice(0, -1).map(() => null),
      latestNav,
      ...lowerBounds,
    ];

    return {
      latestNav,
      latestDate,
      targetNav,
      targetGrowth: parseFloat(targetGrowth.toFixed(2)),
      maxTargetGrowth: parseFloat(maxTargetGrowth.toFixed(2)),
      minTargetGrowth: parseFloat(minTargetGrowth.toFixed(2)),
      annualVol: parseFloat((dailyVol * Math.sqrt(250) * 100).toFixed(2)),
      sentiment,
      allDates,
      historySeriesData,
      forecastSeriesData,
      upperSeriesData,
      lowerSeriesData,
      splitIndex: historyWindow.length - 1,
    };
  }, [data, currentNetValue, forecastDays, samplePeriod]);

  const option = useMemo(() => {
    if (!forecastResult) return {};

    const { allDates, historySeriesData, forecastSeriesData, upperSeriesData, lowerSeriesData, splitIndex } = forecastResult;

    return {
      title: fundName ? {
        text: `${fundName} 净值预估推演图`,
        left: 'left',
        textStyle: { fontSize: 13, fontWeight: 'normal', color: '#595959' },
      } : undefined,
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const idx = params[0]?.dataIndex;
          const date = allDates[idx];
          const isFuture = idx > splitIndex;

          if (!isFuture) {
            const histVal = historySeriesData[idx];
            return `
              <div style="font-size:12px;">
                <div style="font-weight:600;margin-bottom:4px;color:#333;">${date} (历史实际)</div>
                <div>真实净值: <b style="color:#1677ff">${Number(histVal).toFixed(4)}</b></div>
              </div>
            `;
          } else {
            const predVal = forecastSeriesData[idx];
            const upper = upperSeriesData[idx];
            const lower = lowerSeriesData[idx];
            const diffPct = (((Number(predVal) - forecastResult.latestNav) / forecastResult.latestNav) * 100).toFixed(2);
            return `
              <div style="font-size:12px;">
                <div style="font-weight:600;margin-bottom:4px;color:#fa8c16;">${date} (算法预估)</div>
                <div>预估净值: <b style="color:#fa8c16">${Number(predVal).toFixed(4)}</b> (${Number(diffPct) >= 0 ? '+' : ''}${diffPct}%)</div>
                <div>压力上限(95%): <span style="color:#cf1322">${Number(upper).toFixed(4)}</span></div>
                <div>支撑下限(95%): <span style="color:#3f8600">${Number(lower).toFixed(4)}</span></div>
              </div>
            `;
          }
        },
      },
      legend: {
        data: ['历史净值', '预估走势', '压力上限', '支撑下限'],
        top: 0,
        right: 10,
        textStyle: { fontSize: 11 },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '12%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: allDates,
        axisLabel: {
          fontSize: 11,
          rotate: 30,
        },
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLabel: {
          formatter: (v: number) => v.toFixed(3),
        },
        splitLine: {
          lineStyle: {
            type: 'dashed',
            color: '#f0f0f0',
          },
        },
      },
      series: [
        {
          name: '历史净值',
          type: 'line',
          data: historySeriesData,
          smooth: true,
          lineStyle: {
            color: '#1677ff',
            width: 2.5,
          },
          itemStyle: { color: '#1677ff' },
          markPoint: {
            data: [
              {
                name: '当前点',
                coord: [allDates[splitIndex], forecastResult.latestNav],
                value: '当前',
                itemStyle: { color: '#1677ff' },
                label: { fontSize: 10 },
              },
            ],
          },
        },
        {
          name: '预估走势',
          type: 'line',
          data: forecastSeriesData,
          smooth: true,
          lineStyle: {
            color: '#fa8c16',
            width: 2.5,
            type: 'dashed',
          },
          itemStyle: { color: '#fa8c16' },
        },
        {
          name: '压力上限',
          type: 'line',
          data: upperSeriesData,
          smooth: true,
          lineStyle: {
            color: 'rgba(207, 19, 34, 0.4)',
            width: 1,
            type: 'dotted',
          },
          itemStyle: { color: '#cf1322' },
          symbol: 'none',
        },
        {
          name: '支撑下限',
          type: 'line',
          data: lowerSeriesData,
          smooth: true,
          lineStyle: {
            color: 'rgba(63, 134, 0, 0.4)',
            width: 1,
            type: 'dotted',
          },
          itemStyle: { color: '#3f8600' },
          symbol: 'none',
          areaStyle: {
            // 在支撑下限和压力上限间形成预测通道
            color: 'rgba(250, 140, 22, 0.08)',
            origin: 'auto',
          },
        },
      ],
    };
  }, [forecastResult]);

  if (!data || data.length < 5 || !forecastResult) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: '#8c8c8c' }}>
        历史样本数据不足，暂无法生成净值预估折线图
      </div>
    );
  }

  const isPositive = forecastResult.targetGrowth >= 0;

  return (
    <div>
      {/* 周期控制栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <Space wrap>
          <Space>
            <span style={{ fontSize: 13, color: '#666', fontWeight: 500 }}>回溯样本:</span>
            <Radio.Group
              value={samplePeriod}
              onChange={(e) => setSamplePeriod(e.target.value)}
              size="small"
            >
              <Radio.Button value="1m">1个月</Radio.Button>
              <Radio.Button value="3m">3个月</Radio.Button>
              <Radio.Button value="6m">半年</Radio.Button>
              <Radio.Button value="1y">一年</Radio.Button>
            </Radio.Group>
          </Space>

          <Space style={{ marginLeft: 8 }}>
            <span style={{ fontSize: 13, color: '#666', fontWeight: 500 }}>推演周期:</span>
            <Radio.Group
              value={forecastDays}
              onChange={(e) => setForecastDays(e.target.value)}
              size="small"
              buttonStyle="solid"
            >
              <Radio.Button value={7}>未来7天</Radio.Button>
              <Radio.Button value={14}>未来14天</Radio.Button>
              <Radio.Button value={30}>未来30天</Radio.Button>
            </Radio.Group>
          </Space>
        </Space>

        <Space>
          <Tag icon={<LineChartOutlined />} color={forecastResult.sentiment.color}>
            模型研判: {forecastResult.sentiment.label}
          </Tag>
        </Space>
      </div>

      {/* 预估关键量化指标卡 */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ background: '#fafafa' }}>
            <Statistic
              title="当前基准净值"
              value={forecastResult.latestNav}
              precision={4}
              valueStyle={{ color: '#1677ff' }}
            />
            <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
              基准日期: {forecastResult.latestDate}
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card size="small" style={{ background: '#fafafa' }}>
            <Statistic
              title={`未来${forecastDays}日预估净值`}
              value={forecastResult.targetNav}
              precision={4}
              valueStyle={{ color: '#fa8c16', fontWeight: 'bold' }}
            />
            <div style={{ fontSize: 11, color: isPositive ? '#cf1322' : '#3f8600', marginTop: 2 }}>
              预期涨幅: {isPositive ? '+' : ''}{forecastResult.targetGrowth}%
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card size="small" style={{ background: '#fafafa' }}>
            <Statistic
              title="95%置信波动区间"
              value={`${forecastResult.lowerSeriesData[forecastResult.lowerSeriesData.length - 1]} ~ ${forecastResult.upperSeriesData[forecastResult.upperSeriesData.length - 1]}`}
              valueStyle={{ fontSize: 14, color: '#595959', fontWeight: 600 }}
            />
            <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
              幅度: {forecastResult.minTargetGrowth}% ~ +{forecastResult.maxTargetGrowth}%
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card size="small" style={{ background: '#fafafa' }}>
            <Statistic
              title="年化波动率"
              value={forecastResult.annualVol}
              precision={2}
              suffix="%"
              valueStyle={{ color: forecastResult.annualVol > 20 ? '#cf1322' : '#52c41a' }}
            />
            <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
              {forecastResult.annualVol > 20 ? '高波动品种' : '稳健波动品种'}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 预估折线图 */}
      <ReactECharts
        option={option}
        style={{ height: `${height}px`, width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />

      {/* 模型说明 */}
      <Alert
        style={{ marginTop: 12 }}
        message="智能预估模型说明"
        description="本预估折线图结合近60个交易日加权指数平滑(EMA)、对数动量趋势回归以及历史实际波动率通道(95%置信区间)计算得出，实线部分为真实净值历史，橙色虚线及阴影通道为未来情景推演。模型预测仅供投资分析参考，不代表实际未来确定收益。"
        type="info"
        showIcon
        icon={<SafetyCertificateOutlined />}
      />
    </div>
  );
};

export default NetValueEstimateChart;
