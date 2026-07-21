import axios from 'axios';

// 支付宝开放平台配置
const ALIPAY_CONFIG = {
  appId: '', // 需要用户自行填写
  privateKey: '', // 需要用户自行填写
  publicKey: '', // 需要用户自行填写
  gateway: 'https://openapi.alipay.com/gateway.do',
  signType: 'RSA2',
};

// 支付宝API服务
export class AlipayService {
  private static instance: AlipayService;
  
  private constructor() {}
  
  public static getInstance(): AlipayService {
    if (!AlipayService.instance) {
      AlipayService.instance = new AlipayService();
    }
    return AlipayService.instance;
  }
  
  // 获取授权URL
  async getAuthUrl(): Promise<string> {
    // TODO: 实现OAuth2.0授权URL生成
    const params = {
      app_id: ALIPAY_CONFIG.appId,
      scope: 'auth_user',
      redirect_uri: encodeURIComponent('http://localhost:5173/callback'),
      state: 'fundhub',
    };
    
    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    
    return `https://openauth.alipay.com/oauth2/publicAppAuthorize.htm?${queryString}`;
  }
  
  // 获取访问令牌
  async getAccessToken(authCode: string): Promise<any> {
    // TODO: 实现获取访问令牌
    try {
      const response = await axios.post(ALIPAY_CONFIG.gateway, {
        method: 'alipay.system.oauth.token',
        app_id: ALIPAY_CONFIG.appId,
        grant_type: 'authorization_code',
        code: authCode,
        sign_type: ALIPAY_CONFIG.signType,
      });
      
      return response.data;
    } catch (error) {
      console.error('获取访问令牌失败:', error);
      throw error;
    }
  }
  
  // 获取用户基金持仓数据
  async getUserFundData(accessToken: string): Promise<any> {
    // TODO: 实现获取用户基金持仓数据
    try {
      const response = await axios.post(ALIPAY_CONFIG.gateway, {
        method: 'alipay.fund.user.fund.query',
        app_id: ALIPAY_CONFIG.appId,
        access_token: accessToken,
        sign_type: ALIPAY_CONFIG.signType,
      });
      
      return response.data;
    } catch (error) {
      console.error('获取用户基金数据失败:', error);
      throw error;
    }
  }
}

export default AlipayService;