import { create } from 'zustand';
import { Account, Order, Position, PositionWithMarketData } from '../types/trading';
import { FundDataService } from '../services/fundData';

interface TradingState {
  account: Account | null;
  positions: PositionWithMarketData[];
  orders: Order[];
  loading: boolean;
  error: string | null;

  fetchAccount: () => Promise<void>;
  buy: (fundCode: string, fundName: string, amount: number) => Promise<{ success: boolean; error?: string }>;
  sell: (fundCode: string, fundName: string, shares: number) => Promise<{ success: boolean; error?: string }>;
  fetchOrders: (limit?: number) => Promise<void>;
  refreshPositions: () => Promise<void>;
}

const fundDataService = FundDataService.getInstance();

export const useTradingStore = create<TradingState>((set, get) => ({
  account: null,
  positions: [],
  orders: [],
  loading: false,
  error: null,

  fetchAccount: async () => {
    try {
      const account = await window.electronAPI.invoke('trading:getAccount') as Account;
      set({ account });
    } catch (error) {
      console.error('获取账户失败:', error);
    }
  },

  buy: async (fundCode, fundName, amount) => {
    set({ loading: true, error: null });
    try {
      // 获取当前净值
      const estimate = await fundDataService.getFundEstimate(fundCode);
      const nav = estimate?.nav || estimate?.estimate;
      if (!nav || nav <= 0) {
        set({ loading: false });
        return { success: false, error: '无法获取基金净值' };
      }

      const account = get().account;
      if (!account) {
        set({ loading: false });
        return { success: false, error: '账户未加载' };
      }

      const result = await window.electronAPI.invoke('trading:buy', {
        accountId: account.id,
        fundCode,
        fundName,
        amount,
        nav,
      }) as { order: Order; position: Position };

      // 刷新数据
      await get().fetchAccount();
      await get().refreshPositions();
      await get().fetchOrders();

      set({ loading: false });
      return { success: true };
    } catch (error: any) {
      set({ loading: false, error: error.message || '买入失败' });
      return { success: false, error: error.message || '买入失败' };
    }
  },

  sell: async (fundCode, fundName, shares) => {
    set({ loading: true, error: null });
    try {
      const estimate = await fundDataService.getFundEstimate(fundCode);
      const nav = estimate?.nav || estimate?.estimate;
      if (!nav || nav <= 0) {
        set({ loading: false });
        return { success: false, error: '无法获取基金净值' };
      }

      const account = get().account;
      if (!account) {
        set({ loading: false });
        return { success: false, error: '账户未加载' };
      }

      const result = await window.electronAPI.invoke('trading:sell', {
        accountId: account.id,
        fundCode,
        fundName,
        shares,
        nav,
      }) as { order: Order; position: Position | null };

      await get().fetchAccount();
      await get().refreshPositions();
      await get().fetchOrders();

      set({ loading: false });
      return { success: true };
    } catch (error: any) {
      set({ loading: false, error: error.message || '卖出失败' });
      return { success: false, error: error.message || '卖出失败' };
    }
  },

  fetchOrders: async (limit = 100) => {
    try {
      const orders = await window.electronAPI.invoke('trading:getOrders', { limit }) as Order[];
      set({ orders });
    } catch (error) {
      console.error('获取订单失败:', error);
    }
  },

  refreshPositions: async () => {
    try {
      set({ loading: true });
      const positions = await window.electronAPI.invoke('trading:getPositions') as Position[];

      // 并行获取实时净值
      const enriched = await Promise.all(
        positions.map(async (pos) => {
          try {
            const estimate = await fundDataService.getFundEstimate(pos.fund_code);
            const currentNav = estimate?.nav || estimate?.estimate || pos.avg_cost;
            const currentValue = pos.shares * currentNav;
            const profitLoss = currentValue - pos.total_cost;
            const profitLossPercent = pos.total_cost > 0 ? (profitLoss / pos.total_cost) * 100 : 0;
            const dayGrowth = estimate?.estimateGrowth || 0;

            return {
              ...pos,
              currentNav,
              currentValue,
              profitLoss,
              profitLossPercent,
              dayGrowth,
            };
          } catch {
            return {
              ...pos,
              currentNav: pos.avg_cost,
              currentValue: pos.shares * pos.avg_cost,
              profitLoss: 0,
              profitLossPercent: 0,
              dayGrowth: 0,
            };
          }
        })
      );

      // 按市值降序排列
      enriched.sort((a, b) => b.currentValue - a.currentValue);
      set({ positions: enriched, loading: false });
    } catch (error) {
      console.error('刷新持仓失败:', error);
      set({ loading: false });
    }
  },
}));
