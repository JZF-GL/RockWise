export interface Account {
  id: number;
  name: string;
  balance: number;
  initial_balance: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: number;
  account_id: number;
  fund_code: string;
  fund_name: string;
  type: 'buy' | 'sell';
  amount: number;
  nav: number;
  shares: number;
  status: string;
  created_at: string;
}

export interface Position {
  id: number;
  account_id: number;
  fund_code: string;
  fund_name: string;
  shares: number;
  avg_cost: number;
  total_cost: number;
  created_at: string;
  updated_at: string;
}

export interface PositionWithMarketData extends Position {
  currentNav: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercent: number;
  dayGrowth: number;
}
