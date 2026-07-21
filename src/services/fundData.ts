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
  fundHistory: (code: string, page = 1, size = 30) =>
    `/api/f10/lsjz?fundCode=${code}&pageIndex=${page}&pageSize=${size}`,
  fundRank: '/api/fund/data/rankhandler.aspx',
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

  async getFundCodeList(): Promise<{ code: string; name: string; type: string }[]> {
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

  async getFundInfo(code: string) {
    try {
      const response = await api.get(API.fundInfo(code));
      const data = response.data.Datas || response.data;
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

  async getFundHistory(code: string, pageSize = 30) {
    try {
      const response = await api.get(API.fundHistory(code, 1, pageSize));
      const data = response.data.Data;
      if (!data?.LSJZList) return [];
      return data.LSJZList.map((item: any) => ({
        date: item.FSRQ,
        nav: parseFloat(item.DWJZ) || 0,
        totalNav: parseFloat(item.LJJZ) || 0,
        dayGrowth: parseFloat(item.JZZZL) || 0,
      }));
    } catch {
      return [];
    }
  }

  async searchFund(keyword: string): Promise<{ code: string; name: string; type: string }[]> {
    const list = await this.getFundCodeList();
    const kw = keyword.toLowerCase();
    return list
      .filter((item) => item.code.includes(kw) || item.name.toLowerCase().includes(kw))
      .slice(0, 30);
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