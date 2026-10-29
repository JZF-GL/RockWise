import ReactECharts from 'echarts-for-react';
import { darkThemeTokens } from '../../styles/theme';

interface PieData {
  name: string;
  value: number;
}

interface PieChartProps {
  data: PieData[];
  title?: string;
  height?: number;
}

const pieColors = [
  '#4d7ab0',
  '#4e9a74',
  '#826bb0',
  '#b8944d',
  '#c85e68',
  '#5b89c0',
  '#588b76',
];

const PieChart: React.FC<PieChartProps> = ({
  data,
  title = '持仓分布',
  height = 350,
}) => {
  const option = {
    color: pieColors,
    title: {
      text: title,
      left: 'center',
      textStyle: { fontSize: 13, color: darkThemeTokens.textSecondary, fontWeight: 'normal' },
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: darkThemeTokens.bgTooltip,
      borderColor: darkThemeTokens.border,
      textStyle: { color: darkThemeTokens.textPrimary },
      formatter: (params: any) => {
        return `<div style="font-size:12px;"><b style="color:${darkThemeTokens.textHeading};">${params.name}</b><br/><span style="color:${darkThemeTokens.textSecondary};">金额:</span> ¥${params.value.toLocaleString()}<br/><span style="color:${darkThemeTokens.textSecondary};">占比:</span> ${params.percent}%</div>`;
      },
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'middle',
      textStyle: { color: darkThemeTokens.textSecondary, fontSize: 11 },
    },
    series: [
      {
        name: title,
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['60%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: darkThemeTokens.bgCard,
          borderWidth: 2,
        },
        label: {
          show: false,
          position: 'center',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 500,
            color: darkThemeTokens.textHeading,
          },
        },
        labelLine: {
          show: false,
        },
        data: data,
      },
    ],
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: `${height}px`, width: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  );
};

export default PieChart;