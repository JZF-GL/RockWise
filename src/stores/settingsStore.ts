import { create } from 'zustand';

const STORAGE_KEY = 'fundhub_settings';

interface SettingsState {
  buyLimit: number;
  sellLimit: number;
  stopLoss: number;
  takeProfit: number;
  enableAIAnalysis: boolean;
  // AI API 配置
  aiApiUrl: string;
  aiApiKey: string;
  aiModel: string;
  aiProvider: 'openai' | 'zhipu' | 'deepseek' | 'custom';

  // Actions
  setBuyLimit: (limit: number) => void;
  setSellLimit: (limit: number) => void;
  setStopLoss: (percent: number) => void;
  setTakeProfit: (percent: number) => void;
  setEnableAIAnalysis: (enable: boolean) => void;
  setAiApiUrl: (url: string) => void;
  setAiApiKey: (key: string) => void;
  setAiModel: (model: string) => void;
  setAiProvider: (provider: 'openai' | 'zhipu' | 'deepseek' | 'custom') => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

// 预设 API 提供商
export const AI_PROVIDERS = {
  openai: { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-3.5-turbo' },
  zhipu: { name: '智谱AI', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  deepseek: { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  custom: { name: '自定义', baseUrl: '', model: '' },
} as const;

const loadFromStorage = (): Partial<SettingsState> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveToStorage = (state: SettingsState) => {
  try {
    const data = {
      buyLimit: state.buyLimit,
      sellLimit: state.sellLimit,
      stopLoss: state.stopLoss,
      takeProfit: state.takeProfit,
      enableAIAnalysis: state.enableAIAnalysis,
      aiApiUrl: state.aiApiUrl,
      aiApiKey: state.aiApiKey,
      aiModel: state.aiModel,
      aiProvider: state.aiProvider,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('保存设置失败:', error);
  }
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  buyLimit: 10000,
  sellLimit: 10000,
  stopLoss: 10,
  takeProfit: 20,
  enableAIAnalysis: true,
  aiApiUrl: '',
  aiApiKey: '',
  aiModel: '',
  aiProvider: 'openai',

  setBuyLimit: (limit) => set({ buyLimit: limit }),
  setSellLimit: (limit) => set({ sellLimit: limit }),
  setStopLoss: (percent) => set({ stopLoss: percent }),
  setTakeProfit: (percent) => set({ takeProfit: percent }),
  setEnableAIAnalysis: (enable) => set({ enableAIAnalysis: enable }),
  setAiApiUrl: (url) => set({ aiApiUrl: url }),
  setAiApiKey: (key) => set({ aiApiKey: key }),
  setAiModel: (model) => set({ aiModel: model }),
  setAiProvider: (provider) => {
    const preset = AI_PROVIDERS[provider];
    set({
      aiProvider: provider,
      aiApiUrl: preset.baseUrl,
      aiModel: preset.model,
    });
  },

  loadSettings: async () => {
    try {
      const saved = loadFromStorage();
      if (Object.keys(saved).length > 0) {
        set(saved as Partial<SettingsState>);
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  },

  saveSettings: async () => {
    try {
      saveToStorage(get());
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  },
}));
