import axios from 'axios';
import { useSettingsStore, AI_PROVIDERS } from '../stores/settingsStore';

// AI分析服务
export class AIService {
  private static instance: AIService;

  private constructor() {}

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  // 获取当前 API 配置
  private getConfig() {
    const state = useSettingsStore.getState();
    return {
      apiUrl: state.aiApiUrl,
      apiKey: state.aiApiKey,
      model: state.aiModel,
      provider: state.aiProvider,
    };
  }

  // 云API分析（统一接口，兼容 OpenAI 格式的各家 API）
  async analyzeWithCloudAPI(prompt: string): Promise<string> {
    const config = this.getConfig();

    if (!config.apiKey) {
      throw new Error('请先在设置中配置 AI API Key');
    }
    if (!config.apiUrl) {
      throw new Error('请先在设置中配置 AI API 地址');
    }

    try {
      const response = await axios.post(
        `${config.apiUrl}/chat/completions`,
        {
          model: config.model,
          messages: [
            {
              role: 'system',
              content: '你是一个专业的基金分析师，提供买入卖出建议时要谨慎，给出合理的分析和建议。请用中文回复。',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        },
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      return response.data.choices[0].message.content;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('API Key 无效，请检查设置');
      }
      if (error.response?.status === 429) {
        throw new Error('API 请求频率过高，请稍后重试');
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('API 请求超时，请检查网络连接');
      }
      throw new Error(`AI 分析失败: ${error.message}`);
    }
  }

  // 单只基金分析
  async analyze(fundData: any): Promise<{ type: string; analysis: string }> {
    const prompt = this.generateAnalysisPrompt(fundData);
    const analysis = await this.analyzeWithCloudAPI(prompt);
    return { type: 'cloud', analysis };
  }

  // 市场综合分析
  async analyzeMarket(marketData: {
    topFunds: any[];
    sectorTrends: any[];
    overview: any;
  }): Promise<string> {
    const prompt = this.generateMarketAnalysisPrompt(marketData);
    return await this.analyzeWithCloudAPI(prompt);
  }

  // 生成单只基金分析提示词
  private generateAnalysisPrompt(fundData: any): string {
    return `
请分析以下基金数据，并提供买入或卖出建议：

基金代码：${fundData.code}
基金名称：${fundData.name}
最新净值：${fundData.net_value}
日涨跌幅：${fundData.dayGrowth || 0}%
近1月涨幅：${fundData.monthGrowth || 0}%
近1年涨幅：${fundData.yearGrowth || 0}%
基金经理：${fundData.manager || '未知'}
基金公司：${fundData.company || '未知'}
基金类型：${fundData.type || '未知'}

请提供：
1. 基金风险评估（高/中/低）
2. 买入建议（是/否）
3. 卖出建议（是/否）
4. 建议买入金额范围
5. 分析理由（3-5点）

注意：投资有风险，建议仅供参考。
    `.trim();
  }

  // 生成市场分析提示词
  private generateMarketAnalysisPrompt(marketData: any): string {
    const fundList = marketData.topFunds?.slice(0, 10).map((f: any) =>
      `${f.name}(${f.code}): 近1月${(f.monthGrowth || 0).toFixed(2)}%, 近1年${(f.yearGrowth || 0).toFixed(2)}%`
    ).join('\n') || '暂无数据';

    return `
当前市场概况：
- 分析基金数量：${marketData.overview?.totalFunds || 0}
- 今日平均涨幅：${marketData.overview?.avgGrowth || 0}%
- 市场情绪：${marketData.overview?.sentiment || '未知'}

近期表现最好的基金：
${fundList}

板块趋势：
${marketData.sectorTrends?.map((s: any) => `${s.type}: 近1月均涨${(s.avgMonthGrowth || 0).toFixed(2)}%`).join('\n') || '暂无数据'}

请分析当前市场形势，推荐3-5只值得关注的基金，并说明理由。
请用中文回复，分析要专业但通俗易懂。
    `.trim();
  }
}

export default AIService;
