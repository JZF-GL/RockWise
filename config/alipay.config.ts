// 支付宝开放平台配置
export const alipayConfig = {
  // 应用ID（需要用户在支付宝开放平台创建应用后获取）
  appId: process.env.ALIPAY_APP_ID || '',
  
  // 应用私钥（用于签名）
  privateKey: process.env.ALIPAY_PRIVATE_KEY || '',
  
  // 支付宝公钥（用于验证签名）
  publicKey: process.env.ALIPAY_PUBLIC_KEY || '',
  
  // 网关地址
  gateway: 'https://openapi.alipay.com/gateway.do',
  
  // 签名类型
  signType: 'RSA2',
  
  // 回调地址
  redirectUri: 'http://localhost:5173/callback',
  
  // 授权范围
  scope: 'auth_user',
};