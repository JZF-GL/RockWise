import { Recommendation, SectorTrend, RiskIndicator, MarketOverview } from '../types/market';

interface FundRankingItem {
  code: string;
  name: string;
  type: string;
  nav: number;
  dayGrowth: number;
  weekGrowth: number;
  monthGrowth: number;
  threeMonthGrowth: number;
  yearGrowth: number;
  threeYearGrowth: number;
  totalGrowth: number;
}

interface DimensionScores {
  momentum: number;
  risk: number;
  consistency: number;
  value: number;
}

// 将值映射到0-100范围
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

// 计算动量评分
function calcMomentum(fund: FundRankingItem, allFunds: FundRankingItem[]): number {
  const rawScore =
    (fund.weekGrowth || 0) * 0.1 +
    (fund.monthGrowth || 0) * 0.3 +
    (fund.yearGrowth || 0) * 0.4 +
    (fund.threeYearGrowth || 0) * 0.2;

  // 在所有基金中做百分位排名
  const allScores = allFunds.map(f =>
    (f.weekGrowth || 0) * 0.1 +
    (f.monthGrowth || 0) * 0.3 +
    (f.yearGrowth || 0) * 0.4 +
    (f.threeYearGrowth || 0) * 0.2
  );
  const sorted = [...allScores].sort((a, b) => a - b);
  const rank = sorted.indexOf(rawScore);
  const percentile = rank >= 0 ? rank / sorted.length : 0.5;
  return Math.round(percentile * 100);
}

// 计算风险评分（反向：低风险=高分）
function calcRisk(fund: FundRankingItem): number {
  // 用波动率的近似值：日涨幅绝对值的年化
  const estimatedVolatility = Math.abs(fund.dayGrowth || 0) * 10 + Math.abs(fund.weekGrowth || 0) * 2;
  // 波动率越低分越高
  if (estimatedVolatility < 2) return 90;
  if (estimatedVolatility < 5) return 75;
  if (estimatedVolatility < 10) return 60;
  if (estimatedVolatility < 20) return 40;
  return 20;
}

// 计算一致性评分
function calcConsistency(fund: FundRankingItem): number {
  let score = 50;
  // 长期正收益加分
  if (fund.yearGrowth > 0) score += 20;
  if (fund.threeYearGrowth > 0) score += 15;
  // 短期正收益加分
  if (fund.weekGrowth > 0) score += 5;
  if (fund.monthGrowth > 0) score += 10;
  // 大幅回撤扣分
  if (fund.monthGrowth < -10) score -= 20;
  if (fund.monthGrowth < -5) score -= 10;
  return Math.max(0, Math.min(100, score));
}

// 计算价值评分
function calcValue(fund: FundRankingItem): number {
  let score = 50;
  // 超卖机会：短期跌但长期好
  if (fund.monthGrowth < -5 && fund.yearGrowth > 10) {
    score += 30;
  } else if (fund.monthGrowth < -3 && fund.yearGrowth > 5) {
    score += 15;
  }
  // 过热：短期涨太多
  if (fund.monthGrowth > 15) {
    score -= 20;
  } else if (fund.monthGrowth > 10) {
    score -= 10;
  }
  // 长期稳健
  if (fund.threeYearGrowth > 20) score += 10;
  return Math.max(0, Math.min(100, score));
}

// 生成推荐理由
function generateReasoning(fund: FundRankingItem, scores: DimensionScores): string[] {
  const reasons: string[] = [];

  if (scores.momentum > 70) {
    reasons.push(`近期表现强劲，近一月涨幅 ${(fund.monthGrowth || 0).toFixed(2)}%`);
  }
  if (scores.value > 70 && (fund.monthGrowth || 0) < 0) {
    reasons.push('近期回调但长期趋势向好，存在均值回归机会');
  }
  if (scores.consistency > 80) {
    reasons.push('历史收益稳定，回撤控制良好');
  }
  if (scores.risk > 75) {
    reasons.push('波动率较低，风险控制优秀');
  }
  if (fund.threeYearGrowth > 30) {
    reasons.push(`近三年累计收益 ${(fund.threeYearGrowth || 0).toFixed(2)}%，长期表现优秀`);
  }
  if (fund.yearGrowth > 20) {
    reasons.push(`近一年涨幅 ${(fund.yearGrowth || 0).toFixed(2)}%`);
  }

  // 限制最多3条主要理由
  if (reasons.length > 3) reasons.length = 3;
  reasons.push('以上分析基于历史数据，不构成投资建议');
  return reasons;
}

// 综合评分 → 推荐等级
function getRecommendation(score: number): { level: Recommendation['level']; color: string } {
  if (score >= 80) return { level: '强烈推荐', color: '#52c41a' };
  if (score >= 60) return { level: '推荐', color: '#1677ff' };
  if (score >= 40) return { level: '谨慎', color: '#faad14' };
  return { level: '回避', color: '#ff4d4f' };
}

// 主分析函数
export function analyzeFunds(funds: FundRankingItem[]): Recommendation[] {
  if (!funds || funds.length === 0) return [];

  return funds.map(fund => {
    const scores: DimensionScores = {
      momentum: calcMomentum(fund, funds),
      risk: calcRisk(fund),
      consistency: calcConsistency(fund),
      value: calcValue(fund),
    };

    // 加权综合评分
    const compositeScore = Math.round(
      scores.momentum * 0.30 +
      scores.risk * 0.25 +
      scores.consistency * 0.25 +
      scores.value * 0.20
    );

    const { level, color } = getRecommendation(compositeScore);
    const reasons = generateReasoning(fund, scores);

    return {
      fundCode: fund.code,
      fundName: fund.name,
      fundType: fund.type,
      score: compositeScore,
      level,
      levelColor: color,
      reasons,
      nav: fund.nav,
      dayGrowth: fund.dayGrowth,
      monthGrowth: fund.monthGrowth,
      yearGrowth: fund.yearGrowth,
      threeYearGrowth: fund.threeYearGrowth,
    };
  }).sort((a, b) => b.score - a.score);
}

// 计算板块趋势
export function calcSectorTrends(funds: FundRankingItem[]): SectorTrend[] {
  const groups: Record<string, FundRankingItem[]> = {};
  funds.forEach(f => {
    const type = f.type || '其他';
    if (!groups[type]) groups[type] = [];
    groups[type].push(f);
  });

  return Object.entries(groups).map(([type, items]) => ({
    type,
    count: items.length,
    avgWeekGrowth: items.reduce((s, f) => s + (f.weekGrowth || 0), 0) / items.length,
    avgMonthGrowth: items.reduce((s, f) => s + (f.monthGrowth || 0), 0) / items.length,
    avgYearGrowth: items.reduce((s, f) => s + (f.yearGrowth || 0), 0) / items.length,
  })).sort((a, b) => b.avgMonthGrowth - a.avgMonthGrowth);
}

// 计算风险指标
export function calcRiskIndicators(funds: FundRankingItem[]): RiskIndicator[] {
  return funds.map(fund => {
    // 用历史数据的近似计算
    const dailyReturns = Math.abs(fund.dayGrowth || 0);
    const weekReturns = Math.abs(fund.weekGrowth || 0);

    const volatility = Math.sqrt(dailyReturns * dailyReturns * 252 + weekReturns * weekReturns * 52);
    const maxDrawdown = Math.abs(Math.min(fund.monthGrowth || 0, fund.threeMonthGrowth || 0));
    const annualReturn = fund.yearGrowth || 0;
    const riskFreeRate = 3;
    const sharpeRatio = volatility > 0 ? (annualReturn - riskFreeRate) / volatility : 0;

    return {
      fundCode: fund.code,
      fundName: fund.name,
      volatility: Math.round(volatility * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    };
  }).sort((a, b) => b.sharpeRatio - a.sharpeRatio);
}

// 计算市场概览
export function calcMarketOverview(funds: FundRankingItem[]): MarketOverview {
  const totalFunds = funds.length;
  const avgGrowth = funds.reduce((s, f) => s + (f.dayGrowth || 0), 0) / totalFunds;

  let topGainer = null;
  let topLoser = null;
  funds.forEach(f => {
    if (!topGainer || (f.dayGrowth || 0) > topGainer.growth) {
      topGainer = { code: f.code, name: f.name, growth: f.dayGrowth || 0 };
    }
    if (!topLoser || (f.dayGrowth || 0) < topLoser.growth) {
      topLoser = { code: f.code, name: f.name, growth: f.dayGrowth || 0 };
    }
  });

  const positiveCount = funds.filter(f => (f.dayGrowth || 0) > 0).length;
  const sentimentScore = totalFunds > 0 ? (positiveCount / totalFunds) * 100 : 50;
  const sentiment = sentimentScore > 60 ? 'positive' : sentimentScore < 40 ? 'negative' : 'neutral';

  return {
    totalFunds,
    avgGrowth: Math.round(avgGrowth * 100) / 100,
    topGainer,
    topLoser,
    sentiment: sentiment as 'positive' | 'neutral' | 'negative',
    sentimentScore: Math.round(sentimentScore),
  };
}
