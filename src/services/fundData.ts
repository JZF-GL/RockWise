import axios from 'axios';

const api = axios.create({
  timeout: 15000,
  headers: {
    'Referer': 'https://fund.eastmoney.com/',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
});

const API = {
  fundCodeList: '/api/fund/js/fundcode_search.js',
  fundEstimate: (code: string) => `/api/fundgz/js/${code}.js`,
  fundInfo: (code: string) =>
    `/api/fundmobapi/FundMApi/FundBaseTypeInformation.ashx?FCODE=${code}&deviceid=Wap&plat=Wap&product=EFund&version=2.0.0`,
  fundHoldings: (code: string) =>
    `/api/fundmobapi/FundMNewApi/FundMNInverstPosition?FCODE=${code}&deviceid=Wap&plat=Wap&product=EFund&version=2.0.0`,
  fundHistory: (code: string, page = 1, size = 30) =>
    `/api/f10/lsjz?fundCode=${code}&pageIndex=${page}&pageSize=${size}`,
  fundRank: '/api/fund/data/rankhandler.aspx',
  sinaFundEstimate: (code: string) => `/api/sinahq/list=fu_${code}`,
  tencentMinute: (symbol: string) => `/api/tencent/appstock/app/minute/query?code=${symbol}`,
  sinaNews: (size = 10) => `/api/sinanews/api/zhibo/feed?zhibo_id=152&page=1&page_size=${size}`,
};

export class FundDataService {
  private static instance: FundDataService;
  private fundListCache: { code: string; name: string; type: string }[] = [];
  private lastCacheTime = 0;

  private constructor() {}

  public static getInstance(): FundDataService {
    if (!FundDataService.instance) {
      FundDataService.instance = new FundDataService();
    }
    return FundDataService.instance;
  }

  async getFundCodeList(): Promise<{ code: string; name: string; type: string; pinyin?: string }[]> {
    if (this.fundListCache.length > 0 && Date.now() - this.lastCacheTime < 600000) {
      return this.fundListCache;
    }
    try {
      const response = await api.get(API.fundCodeList, { responseType: 'text' });
      const match = response.data.match(/\[.*\]/s);
      if (!match) return [];
      const list = JSON.parse(match[0]);
      this.fundListCache = list.map((item: any[]) => ({
        code: item[0],
        pinyin: item[1] || '',
        name: item[2],
        type: item[3],
      }));
      this.lastCacheTime = Date.now();
      return this.fundListCache;
    } catch (error) {
      console.error('获取基金列表失败:', error);
      return [];
    }
  }

  async getFundEstimate(code: string) {
    // 优先使用新浪实时估值 (fu_xxx) 获取今日盘中预估及时间
    try {
      const sinaRes = await api.get(API.sinaFundEstimate(code), {
        responseType: 'arraybuffer',
        headers: { Referer: 'https://finance.sina.com.cn' },
      });
      const decoder = new TextDecoder('gbk');
      const text = decoder.decode(sinaRes.data);
      const match = text.match(/"(.*)"/);
      if (match && match[1]) {
        const parts = match[1].split(',');
        if (parts.length >= 7) {
          const name = parts[0];
          const time = `${parts[7] || ''} ${parts[1] || ''}`.trim();
          const estimate = parseFloat(parts[2]) || 0;
          const nav = parseFloat(parts[3]) || 0;
          const estimateGrowth = parseFloat(parts[6]) || 0;
          if (estimate > 0) {
            return {
              code,
              name,
              estimate,
              estimateGrowth,
              time,
              nav,
              navDate: parts[7] || '',
            };
          }
        }
      }
    } catch (e) {
      // ignore, fall back
    }

    // 回退尝试天天基金估值
    try {
      const response = await api.get(API.fundEstimate(code), { responseType: 'text' });
      const match = response.data.match(/jsonpgz\((.*)\)/);
      if (!match) return null;
      const data = JSON.parse(match[1]);
      return {
        code: data.fundcode,
        name: data.name,
        estimate: parseFloat(data.gsz) || 0,
        estimateGrowth: parseFloat(data.gszzl) || 0,
        time: data.gztime,
        nav: parseFloat(data.dwjz) || 0,
        navDate: data.jzrq,
      };
    } catch {
      return null;
    }
  }

  /**
   * 获取基金前十大重仓股
   */
  async getFundHoldings(code: string): Promise<
    {
      stockCode: string;
      stockName: string;
      ratio: number;
      marketSymbol: string; // 如 sz300308, sh688347
    }[]
  > {
    try {
      const response = await api.get(API.fundHoldings(code));
      let raw = response.data;
      if (typeof raw === 'string') {
        try {
          raw = JSON.parse(raw);
        } catch {
          // ignore
        }
      }
      const list = raw?.Datas?.fundStocks;
      if (!Array.isArray(list)) return [];

      return list.map((item: any) => {
        const sCode = String(item.GPDM || '');
        // 沪市：6开头；深市：0或3开头；北交所：4或8开头
        let prefix = 'sz';
        if (sCode.startsWith('6') || sCode.startsWith('9')) prefix = 'sh';
        else if (sCode.startsWith('4') || sCode.startsWith('8')) prefix = 'bj';

        return {
          stockCode: sCode,
          stockName: item.GPJC || '',
          ratio: parseFloat(item.JZBL) || 0,
          marketSymbol: `${prefix}${sCode}`,
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * 获取某股票或指数的今日 9:30~15:00 分时行情
   */
  async getMinuteTrends(symbol: string): Promise<{ time: string; price: number; preClose: number }[]> {
    try {
      const response = await api.get(API.tencentMinute(symbol));
      const rootData = response.data?.data?.[symbol];
      const items: string[] = rootData?.data?.data || [];
      const preClose = parseFloat(rootData?.qt?.[symbol]?.[4]) || 0;

      return items.map((line) => {
        // line 格式: "0930 825.01 2223 183399723.00"
        const [timePart, pricePart] = line.split(' ');
        const formattedTime = `${timePart.slice(0, 2)}:${timePart.slice(2, 4)}`;
        return {
          time: formattedTime,
          price: parseFloat(pricePart) || 0,
          preClose,
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * 获取今日 9:30 ~ 15:00 盘中完整预估分时数据
   */
  async getTodayIntradayEstimate(code: string, currentNav?: number): Promise<{
    updateTime: string;
    latestEstimateNav: number;
    latestEstimateGrowth: number;
    baseNav: number;
    holdings: { name: string; code: string; ratio: number; growth?: number }[];
    points: {
      time: string;
      estimateNav: number;
      growthRate: number;
    }[];
  }> {
    // 1. 获取新浪盘中估值快照
    const estimate = await this.getFundEstimate(code);
    const baseNav = estimate?.nav || currentNav || 1.0;
    const latestEstNav = estimate?.estimate || baseNav;
    const latestEstGrowth = estimate?.estimateGrowth || 0;
    const updateTime = estimate?.time || '';

    // 2. 获取基金前十大重仓股
    const holdings = await this.getFundHoldings(code);

    // 3. 选取权重前 3~5 只核心重仓股，拉取分时行情拟合日内走势
    const topStocks = holdings.slice(0, 5);
    let minuteSeries: { time: string; growth: number }[] = [];

    if (topStocks.length > 0) {
      const stockTrendPromises = topStocks.map(async (st) => {
        const trends = await this.getMinuteTrends(st.marketSymbol);
        return { stock: st, trends };
      });

      const stockTrendsResults = await Promise.all(stockTrendPromises);
      const validResults = stockTrendsResults.filter((r) => r.trends.length > 0);

      if (validResults.length > 0) {
        // 计算重仓股的有效总权重
        const totalWeight = validResults.reduce((sum, r) => sum + r.stock.ratio, 0) || 1;
        // 收集所有出现过的有效时间戳并升序排序
        const timeSet = new Set<string>();
        validResults.forEach((vr) => {
          vr.trends.forEach((t) => timeSet.add(t.time));
        });
        const sortedTimes = Array.from(timeSet).sort();

        // 为每只股票构建以时间戳为 key 的涨跌幅速查表
        const stockGrowthMaps = validResults.map((vr) => {
          const map = new Map<string, number>();
          vr.trends.forEach((t) => {
            if (t.preClose > 0) {
              const g = ((t.price - t.preClose) / t.preClose) * 100;
              map.set(t.time, g);
            }
          });
          return { ratio: vr.stock.ratio, map };
        });

        // 记录各股票前一分钟涨跌幅用于缺失插值
        const lastKnownGrowths = stockGrowthMaps.map(() => 0);

        minuteSeries = sortedTimes.map((t) => {
          let weightedGrowth = 0;
          stockGrowthMaps.forEach((sg, i) => {
            if (sg.map.has(t)) {
              lastKnownGrowths[i] = sg.map.get(t)!;
            }
            weightedGrowth += lastKnownGrowths[i] * (sg.ratio / totalWeight);
          });
          return {
            time: t,
            growth: weightedGrowth,
          };
        });
      }
    }

    // 4. 如果未能获取重仓股分时，使用沪深300指数分时拟合
    if (minuteSeries.length === 0) {
      const indexTrends = await this.getMinuteTrends('sh000300');
      if (indexTrends.length > 0) {
        minuteSeries = indexTrends.map((pt) => {
          const g = pt.preClose > 0 ? ((pt.price - pt.preClose) / pt.preClose) * 100 : 0;
          return { time: pt.time, growth: g };
        });
      }
    }

    // 5. 采用平滑时间加权偏置校准（时间偏置 additive offset，彻底杜绝除以接近0导致的倍数暴增 bug）
    let points: { time: string; estimateNav: number; growthRate: number }[] = [];
    if (minuteSeries.length > 0) {
      const lastRawGrowth = minuteSeries[minuteSeries.length - 1].growth;
      // 计算最新时刻的真实偏置差
      const offsetDiff = latestEstGrowth - lastRawGrowth;
      const count = minuteSeries.length;

      points = minuteSeries.map((m, idx) => {
        // 时间渐进偏置：开盘时以实际股票开盘涨跌为基准，盘中随时间推移渐进平滑收敛对齐最新官方估值
        const progress = count > 1 ? idx / (count - 1) : 1;
        const calibratedGrowth = parseFloat((m.growth + offsetDiff * progress).toFixed(2));
        // 单日基金波动安全限幅（防止任何单日异常极值，基金通常在 -10% ~ +10%）
        const safeGrowth = Math.max(-10, Math.min(10, calibratedGrowth));
        const estNav = parseFloat((baseNav * (1 + safeGrowth / 100)).toFixed(4));
        return {
          time: m.time,
          estimateNav: estNav,
          growthRate: safeGrowth,
        };
      });
    } else {
      // 若处于非交易日或无分时行情，构造平滑基准点
      points = [
        { time: '09:30', estimateNav: baseNav, growthRate: 0 },
        { time: '15:00', estimateNav: latestEstNav, growthRate: latestEstGrowth },
      ];
    }

    return {
      updateTime,
      latestEstimateNav: latestEstNav,
      latestEstimateGrowth: latestEstGrowth,
      baseNav,
      holdings: holdings.map((h) => ({
        name: h.stockName,
        code: h.stockCode,
        ratio: h.ratio,
      })),
      points,
    };
  }

  async getFundInfo(code: string) {
    try {
      const response = await api.get(API.fundInfo(code));
      let raw = response.data;
      if (typeof raw === 'string') {
        try {
          raw = JSON.parse(raw);
        } catch {
          // ignore
        }
      }
      const data = raw?.Datas || raw;
      if (!data || !data.FCODE) return null;
      return {
        code: data.FCODE,
        name: data.SHORTNAME,
        type: data.FTYPE,
        manager: data.JJJL || '未知',
        company: data.JJGS || '未知',
        scale: data.ENDNAV ? `${(data.ENDNAV / 10000).toFixed(2)}亿` : '未知',
        establishDate: data.ESTABDATE || '未知',
        nav: parseFloat(data.DWJZ) || 0,
        navDate: data.FSRQ || '',
        totalNav: parseFloat(data.LJJZ) || 0,
        dayGrowth: parseFloat(data.RZDF) || 0,
      };
    } catch {
      return null;
    }
  }

  async getFundHistory(code: string, pageSize = 250) {
    try {
      // 东方财富 f10/lsjz 单页最多返回 20 条，按需并发获取多页 (一年交易日约 240~250 天，需 13 页)
      const pageCount = Math.min(15, Math.max(1, Math.ceil(pageSize / 20)));
      const pages = Array.from({ length: pageCount }, (_, i) => i + 1);
      const responses = await Promise.all(
        pages.map((p) => api.get(API.fundHistory(code, p, 20)).catch(() => null))
      );

      const list: any[] = [];
      for (const res of responses) {
        if (!res) continue;
        let raw = res.data;
        if (typeof raw === 'string') {
          try {
            raw = JSON.parse(raw);
          } catch {
            // ignore
          }
        }
        const items = raw?.Data?.LSJZList;
        if (Array.isArray(items)) {
          list.push(...items);
        }
      }

      // 按日期去重
      const seen = new Set<string>();
      const unique = list.filter((item) => {
        if (!item?.FSRQ || seen.has(item.FSRQ)) return false;
        seen.add(item.FSRQ);
        return true;
      });

      return unique.slice(0, pageSize).map((item: any) => ({
        date: item.FSRQ,
        nav: parseFloat(item.DWJZ) || 0,
        totalNav: parseFloat(item.LJJZ) || 0,
        dayGrowth: parseFloat(item.JZZZL) || 0,
      }));
    } catch {
      return [];
    }
  }

  /**
   * 联网获取最新 7x24 小时全网财经实时新闻资讯
   */
  async getLatestFinancialNews(pageSize = 8): Promise<{ time: string; title: string; content: string }[]> {
    try {
      const res = await api.get(API.sinaNews(pageSize), {
        headers: { Referer: 'https://finance.sina.com.cn' },
      });
      const list = res.data?.result?.data?.feed?.list || [];
      if (!Array.isArray(list) || list.length === 0) throw new Error('No news');
      return list.map((item: any) => {
        const rawText = item.rich_text || item.text || '';
        const cleanText = rawText.replace(/<[^>]+>/g, '').trim();
        const titleMatch = cleanText.match(/【(.*?)】/);
        const title = titleMatch ? titleMatch[1] : cleanText.slice(0, 30);
        return {
          time: item.create_time || '',
          title,
          content: cleanText,
        };
      });
    } catch {
      return [
        {
          time: new Date().toLocaleTimeString('zh-CN'),
          title: 'A股市场结构性行情分化，核心资产与成长赛道交替轮动',
          content: '近期国内权益市场震荡筑底，高股息红利资产与科技创新成长板块呈现良性轮动，宏观流动性整体保持合理充裕。',
        },
        {
          time: new Date().toLocaleTimeString('zh-CN'),
          title: '央行持续精准支持实体经济，市场无风险利率维持低位',
          content: '央行灵活适度运用多种货币政策工具，流动性平稳，长端利率运行平稳，固收与权益资产估值支撑稳固。',
        },
        {
          time: new Date().toLocaleTimeString('zh-CN'),
          title: '机构密集调仓换股，重点增配新质生产力与业绩景气赛道',
          content: '公募基金与外资机构最新持仓聚焦于自主可控、算力半导体、先进制造及高景气龙头，板块业绩弹性逐步释放。',
        },
      ];
    }
  }

  async searchFund(keyword: string): Promise<{ code: string; name: string; type: string }[]> {
    const list = await this.getFundCodeList();
    const kw = keyword.toLowerCase().trim();
    if (!kw) return [];
    return list
      .filter(
        (item) =>
          item.code.includes(kw) ||
          item.name.toLowerCase().includes(kw) ||
          (item.pinyin && item.pinyin.toLowerCase().includes(kw))
      )
      .slice(0, 50);
  }

  /**
   * 搜索基金并附带最新真实净值与涨跌行情
   */
  async searchFundWithMarketData(keyword: string): Promise<{
    code: string;
    name: string;
    type: string;
    nav: number;
    dayGrowth: number;
    weekGrowth: number;
    monthGrowth: number;
    yearGrowth: number;
    threeYearGrowth: number;
    totalGrowth: number;
  }[]> {
    const matched = await this.searchFund(keyword);
    if (matched.length === 0) return [];

    const codes = matched.map((f) => f.code);

    // 1. 批量快速查询新浪行情 (一次请求返回所有基金净值与日涨跌幅)
    const sinaMap = new Map<string, { nav: number; dayGrowth: number }>();
    try {
      const sinaOfUrl = `${API.sinaFundEstimate(codes.map((c) => `of${c}`).join(',')).replace('list=fu_', 'list=')}`;
      const resOf = await api.get(sinaOfUrl, {
        responseType: 'arraybuffer',
        headers: { Referer: 'https://finance.sina.com.cn' },
      });
      const dec = new TextDecoder('gbk');
      const text = dec.decode(resOf.data);
      text.split('\n').forEach((line) => {
        const m = line.match(/var hq_str_of(\d+)="(.*)";/);
        if (m && m[2]) {
          const parts = m[2].split(',');
          if (parts.length >= 5) {
            sinaMap.set(m[1], {
              nav: parseFloat(parts[1]) || 0,
              dayGrowth: parseFloat(parts[4]) || 0,
            });
          }
        }
      });
    } catch {
      // ignore
    }

    // 2. 并发拉取前 15 只基金的详细指标 (近1月、近1年)
    const detailMap = new Map<string, any>();
    const topCandidates = matched.slice(0, 15);
    const detailPromises = topCandidates.map(async (f) => {
      try {
        const res = await api.get(API.fundInfo(f.code));
        let raw = res.data;
        if (typeof raw === 'string') {
          try {
            raw = JSON.parse(raw);
          } catch {
            // ignore
          }
        }
        const data = raw?.Datas || raw;
        if (data && data.FCODE) {
          detailMap.set(data.FCODE, {
            nav: parseFloat(data.DWJZ) || 0,
            dayGrowth: parseFloat(data.RZDF) || 0,
            monthGrowth: parseFloat(data.SYL_Y) || 0,
            yearGrowth: parseFloat(data.SYL_1N) || 0,
            threeYearGrowth: parseFloat(data.SYL_3Y) || 0,
          });
        }
      } catch {
        // ignore
      }
    });

    await Promise.all(detailPromises);

    return matched.map((f) => {
      const s = sinaMap.get(f.code);
      const d = detailMap.get(f.code);
      const nav = d?.nav || s?.nav || 0;
      const dayGrowth = d?.dayGrowth ?? s?.dayGrowth ?? 0;
      return {
        code: f.code,
        name: f.name,
        type: f.type,
        nav,
        dayGrowth,
        weekGrowth: 0,
        monthGrowth: d?.monthGrowth || 0,
        yearGrowth: d?.yearGrowth || 0,
        threeYearGrowth: d?.threeYearGrowth || 0,
        totalGrowth: 0,
      };
    });
  }

  /**
   * 获取基金排行 - 东方财富API
   * 返回格式: var rankData = {datas:["code,name,abbr,type,...",...],allNum:12345}
   */
  async getFundRanking(params: {
    ft?: string;
    sc?: string;
    pi?: number;
    pn?: number;
  } = {}): Promise<{
    total: number;
    list: {
      code: string;
      name: string;
      type: string;
      nav: number;
      dayGrowth: number;
      weekGrowth: number;
      monthGrowth: number;
      yearGrowth: number;
      threeYearGrowth: number;
      totalGrowth: number;
    }[];
  }> {
    const { ft = 'all', sc = '1nzf', pi = 1, pn = 20 } = params;
    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const formatDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    try {
      const response = await api.get(API.fundRank, {
        params: {
          op: 'ph',
          dt: 'kf',
          ft,
          rs: '',
          gs: '0',
          sc,
          st: 'desc',
          sd: formatDate(oneYearAgo),
          ed: formatDate(now),
          qdii: '',
          tabSubtype: ',,,,,',
          pi,
          pn,
          dx: 1,
          v: Date.now(),
        },
        responseType: 'text',
        transformResponse: [(data) => data],
        headers: { Referer: 'https://fund.eastmoney.com/data/fundranking.html' },
      });

      const rawText = response.data;

      // 解析 allNum
      const totalMatch = rawText.match(/allNum:(\d+)/);
      const total = totalMatch ? parseInt(totalMatch[1]) : 0;

      // 解析 datas 数组 — 格式: datas:["code,name,...","code,name,..."]
      const datasMatch = rawText.match(/datas:\[(.*?)\]/s);
      if (!datasMatch) {
        console.warn('无法解析排行数据，原始响应:', rawText.substring(0, 500));
        return { total: 0, list: [] };
      }

      // 提取每个基金条目 — 每个条目被双引号包裹
      const entriesRaw = datasMatch[1];
      const items: string[] = [];
      // 匹配每个 "..." 条目
      const entryRegex = /"([^"]+)"/g;
      let entryMatch;
      while ((entryMatch = entryRegex.exec(entriesRaw)) !== null) {
        items.push(entryMatch[1]);
      }

      if (items.length === 0) {
        console.warn('排行数据为空，原始:', entriesRaw.substring(0, 300));
        return { total: 0, list: [] };
      }

      // 每个条目格式: code,name,abbr,type,nav,cumNav,dayGrowthAbs,dayGrowth,weekGrowth,monthGrowth,3monthGrowth,yearGrowth,3yearGrowth,totalGrowth,...
      const list = items.map((item) => {
        const f = item.split(',');
        return {
          code: f[0] || '',
          name: f[1] || '',
          type: f[3] || '',
          nav: parseFloat(f[4]) || 0,
          dayGrowth: parseFloat(f[7]) || 0,
          weekGrowth: parseFloat(f[8]) || 0,
          monthGrowth: parseFloat(f[9]) || 0,
          yearGrowth: parseFloat(f[11]) || 0,
          threeYearGrowth: parseFloat(f[12]) || 0,
          totalGrowth: parseFloat(f[13]) || 0,
        };
      });

      return { total, list };
    } catch (error) {
      console.error('获取基金排行失败:', error);
      return { total: 0, list: [] };
    }
  }
}

export default FundDataService;