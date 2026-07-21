import { create } from 'zustand';
import { FundDataService } from '../services/fundData';

interface Fund {
  id: number;
  code: string;
  name: string;
  net_value: number;
  totalNav: number;
  dayGrowth: number;
  update_time: string;
  type: string;
  manager: string;
  company: string;
}

interface FundState {
  funds: Fund[];
  currentFund: Fund | null;
  currentHistory: { date: string; nav: number; totalNav: number; dayGrowth: number }[];
  hotFunds: any[];
  loading: boolean;
  historyLoading: boolean;
  error: string | null;
  lastUpdate: string | null;

  setFunds: (funds: Fund[]) => void;
  setCurrentFund: (fund: Fund | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchFunds: (codes: string[]) => Promise<void>;
  fetchFundDetail: (code: string) => Promise<void>;
  fetchFundHistory: (code: string, size?: number) => Promise<void>;
  fetchHotFunds: () => Promise<void>;
  searchFund: (keyword: string) => Promise<{ code: string; name: string; type: string }[]>;
}

const fundDataService = FundDataService.getInstance();

// 默认展示的基金列表
const DEFAULT_FUND_CODES = [
  '000001', '000002', '000003', '000004', '000005',
  '110011', '163406', '000961', '320007', '270002',
];

export const useFundStore = create<FundState>((set, get) => ({
  funds: [],
  currentFund: null,
  currentHistory: [],
  hotFunds: [],
  loading: false,
  historyLoading: false,
  error: null,
  lastUpdate: null,

  setFunds: (funds) => set({ funds }),
  setCurrentFund: (fund) => set({ currentFund: fund }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  fetchFunds: async (codes: string[] = DEFAULT_FUND_CODES) => {
    set({ loading: true, error: null });
    try {
      // 并行获取所有基金信息
      const promises = codes.map(async (code, index) => {
        const info = await fundDataService.getFundInfo(code);
        const estimate = await fundDataService.getFundEstimate(code);
        return {
          id: index + 1,
          code,
          name: info?.name || '加载中...',
          net_value: estimate?.estimate || info?.nav || 0,
          totalNav: info?.totalNav || 0,
          dayGrowth: estimate?.estimateGrowth || info?.dayGrowth || 0,
          update_time: estimate?.time || info?.navDate || '',
          type: info?.type || '',
          manager: info?.manager || '',
          company: info?.company || '',
        };
      });

      const funds = await Promise.all(promises);
      set({
        funds,
        lastUpdate: new Date().toLocaleString('zh-CN'),
      });
    } catch (error) {
      set({ error: '获取基金数据失败，请检查网络连接' });
      console.error('获取基金数据失败:', error);
    } finally {
      set({ loading: false });
    }
  },

  fetchFundDetail: async (code: string) => {
    set({ loading: true, error: null });
    try {
      const info = await fundDataService.getFundInfo(code);
      const estimate = await fundDataService.getFundEstimate(code);

      if (info) {
        set({
          currentFund: {
            id: Date.now(),
            code: info.code,
            name: info.name,
            net_value: estimate?.estimate || info.nav,
            totalNav: info.totalNav,
            dayGrowth: estimate?.estimateGrowth || info.dayGrowth,
            update_time: estimate?.time || info.navDate,
            type: info.type,
            manager: info.manager,
            company: info.company,
          },
        });
      }
    } catch (error) {
      set({ error: '获取基金详情失败' });
      console.error('获取基金详情失败:', error);
    } finally {
      set({ loading: false });
    }
  },

  fetchFundHistory: async (code: string, size = 90) => {
    set({ historyLoading: true });
    try {
      const history = await fundDataService.getFundHistory(code, size);
      set({ currentHistory: history });
    } catch (error) {
      console.error('获取基金历史净值失败:', error);
    } finally {
      set({ historyLoading: false });
    }
  },

  fetchHotFunds: async () => {
    try {
      const hotFunds = await fundDataService.getHotFunds(10);
      set({ hotFunds });
    } catch (error) {
      console.error('获取热门基金失败:', error);
    }
  },

  searchFund: async (keyword: string) => {
    return await fundDataService.searchFund(keyword);
  },
}));