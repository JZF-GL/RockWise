import { create } from 'zustand';
import { MarketOverview, SectorTrend, RiskIndicator, Recommendation } from '../types/market';
import { FundDataService } from '../services/fundData';
import { analyzeFunds, calcSectorTrends, calcRiskIndicators, calcMarketOverview } from '../services/heuristicAnalysis';

interface MarketState {
  overview: MarketOverview | null;
  recommendations: Recommendation[];
  topFunds: any[];
  sectorTrends: SectorTrend[];
  riskIndicators: RiskIndicator[];
  loading: boolean;
  error: string | null;

  fetchAnalysis: () => Promise<void>;
}

const fundDataService = FundDataService.getInstance();

export const useMarketStore = create<MarketState>((set) => ({
  overview: null,
  recommendations: [],
  topFunds: [],
  sectorTrends: [],
  riskIndicators: [],
  loading: false,
  error: null,

  fetchAnalysis: async () => {
    set({ loading: true, error: null });
    try {
      // 获取基金排行数据（前50只）
      const rankingResult = await fundDataService.getFundRanking({
        ft: 'all',
        sc: '1nzf',
        pi: 1,
        pn: 50,
      });

      const funds = rankingResult.list || [];

      // 运行启发式分析
      const recommendations = analyzeFunds(funds);
      const sectorTrends = calcSectorTrends(funds);
      const riskIndicators = calcRiskIndicators(funds);
      const overview = calcMarketOverview(funds);

      set({
        overview,
        recommendations,
        topFunds: funds,
        sectorTrends,
        riskIndicators,
        loading: false,
      });
    } catch (error: any) {
      console.error('获取市场分析失败:', error);
      set({ loading: false, error: error.message || '获取市场分析失败' });
    }
  },
}));
