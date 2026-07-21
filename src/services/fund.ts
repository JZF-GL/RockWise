// 基金数据服务
export class FundService {
  private static instance: FundService;

  private constructor() {}

  public static getInstance(): FundService {
    if (!FundService.instance) {
      FundService.instance = new FundService();
    }
    return FundService.instance;
  }

  // 获取基金净值数据
  async getFundNetValue(fundCode: string): Promise<any> {
    try {
      // TODO: 实际调用基金数据API
      const mockData = {
        code: fundCode,
        name: this.getFundNameByCode(fundCode),
        net_value: this.generateRandomNetValue(),
        update_time: new Date().toISOString().split('T')[0],
        recent_trend: Math.random() > 0.5 ? '上涨' : '下跌',
        manager: '张三',
        scale: '50.23亿',
      };

      return mockData;
    } catch (error) {
      console.error('获取基金净值失败:', error);
      throw error;
    }
  }

  // 获取基金历史净值
  async getFundHistory(fundCode: string, days: number = 30): Promise<any[]> {
    try {
      // TODO: 实际调用基金历史数据API
      const mockData = [];
      const baseValue = 1.0 + Math.random() * 0.5;
      let currentValue = baseValue;

      for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        // 模拟真实的价格波动
        const change = (Math.random() - 0.48) * 0.02;
        currentValue = Math.max(0.8, Math.min(2.0, currentValue + change));

        mockData.push({
          date: date.toISOString().split('T')[0],
          net_value: parseFloat(currentValue.toFixed(4)),
        });
      }

      return mockData;
    } catch (error) {
      console.error('获取基金历史数据失败:', error);
      throw error;
    }
  }

  // 搜索基金
  async searchFund(keyword: string): Promise<any[]> {
    try {
      // TODO: 实际调用基金搜索API
      const allFunds = [
        { code: '000001', name: '华夏成长混合' },
        { code: '000002', name: '嘉实增长混合' },
        { code: '000003', name: '易方达蓝筹精选' },
        { code: '000004', name: '南方稳健混合' },
        { code: '000005', name: '博时主题混合' },
        { code: '000006', name: '广发小盘成长' },
        { code: '000007', name: '富国天惠混合' },
        { code: '000008', name: '中银收益混合' },
        { code: '000009', name: '工银瑞信混合' },
        { code: '000010', name: '建信核心精选' },
      ];

      return allFunds.filter(
        (fund) =>
          fund.name.includes(keyword) || fund.code.includes(keyword)
      );
    } catch (error) {
      console.error('搜索基金失败:', error);
      throw error;
    }
  }

  // 刷新所有基金数据
  async refreshAllFunds(): Promise<any[]> {
    try {
      const fundCodes = ['000001', '000002', '000003', '000004', '000005'];
      const promises = fundCodes.map((code) => this.getFundNetValue(code));
      return await Promise.all(promises);
    } catch (error) {
      console.error('刷新基金数据失败:', error);
      throw error;
    }
  }

  // 根据代码获取基金名称
  private getFundNameByCode(code: string): string {
    const nameMap: Record<string, string> = {
      '000001': '华夏成长混合',
      '000002': '嘉实增长混合',
      '000003': '易方达蓝筹精选',
      '000004': '南方稳健混合',
      '000005': '博时主题混合',
    };
    return nameMap[code] || '未知基金';
  }

  // 生成随机净值
  private generateRandomNetValue(): number {
    return parseFloat((1.0 + Math.random() * 1.0).toFixed(4));
  }
}

export default FundService;