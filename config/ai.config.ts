// AI模型配置
export const aiConfig = {
  // 本地模型配置（Ollama）
  local: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'tinyllama',
  },
  
  // 云API配置
  cloud: {
    provider: process.env.AI_PROVIDER || 'openai', // 'openai' 或 'zhipu'
    
    // OpenAI配置
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-3.5-turbo',
    },
    
    // 智谱GLM配置
    zhipu: {
      apiKey: process.env.ZHIPU_API_KEY || '',
      baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
      model: 'glm-4',
    },
  },
  
  // 分析设置
  analysis: {
    maxTokens: 1000,
    temperature: 0.7,
    useLocalFirst: true, // 优先使用本地模型
  },
};