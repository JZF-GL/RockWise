export interface MarketOverview {
  totalFunds: number;
  avgGrowth: number;
  topGainer: { code: string; name: string; growth: number } | null;
  topLoser: { code: string; name: string; growth: number } | null;
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;
}

export interface SectorTrend {
  type: string;
  count: number;
  avgWeekGrowth: number;
  avgMonthGrowth: number;
  avgYearGrowth: number;
}

export interface RiskIndicator {
  fundCode: string;
  fundName: string;
  volatility: number;
  maxDrawdown: number;
  sharpeRatio: number;
}

export interface Recommendation {
  fundCode: string;
  fundName: string;
  fundType: string;
  score: number;
  level: '强烈推荐' | '推荐' | '谨慎' | '回避';
  levelColor: string;
  reasons: string[];
  nav: number;
  dayGrowth: number;
  monthGrowth: number;
  yearGrowth: number;
  threeYearGrowth: number;
}
