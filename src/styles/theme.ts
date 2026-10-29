/**
 * 全局暗色调低调风格配色定义
 * 针对桌面端设计：低饱和度、低视觉刺激度，字体色调柔和淡雅，不显眼
 */

export const darkThemeTokens = {
  // 基础背景体系
  bgApp: '#121417',
  bgSider: '#15181d',
  bgTitleBar: '#15181d',
  bgCard: '#191c22',
  bgCardHover: '#1e222a',
  bgInput: '#15171e',
  bgSubtle: '#1e2229',
  bgModal: '#1a1d24',
  bgTooltip: '#222630',

  // 边框体系
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.04)',
  borderMuted: '#242933',

  // 字体颜色体系 (柔和偏淡，避免刺眼的高对比度)
  textPrimary: '#aeb5c2',   // 正文柔和浅灰
  textHeading: '#c8ceda',   // 标题淡灰
  textSecondary: '#6e7787', // 辅助说明/标签/指标名，淡雅不抢眼
  textTertiary: '#4e5666',  // 次要占位符/无效文本
  textMuted: '#586170',     // 弱化文本
  textLink: '#6790ca',      // 链接色

  // 涨跌配色体系 (淡雅低饱和金融色，红涨绿跌，但不刺眼不突兀)
  up: '#c85e68',             // 柔和暗玫瑰红
  upBg: 'rgba(200, 94, 104, 0.1)',
  upBorder: 'rgba(200, 94, 104, 0.22)',

  down: '#4e9a74',           // 柔和鼠尾草绿
  downBg: 'rgba(78, 154, 116, 0.1)',
  downBorder: 'rgba(78, 154, 116, 0.22)',

  flat: '#727a88',           // 平盘中性灰
  flatBg: 'rgba(114, 122, 136, 0.1)',

  // 功能性点缀色 (低饱和，不鲜艳)
  primary: '#4d7ab0',        // 沉稳钢蓝
  primaryBg: 'rgba(77, 122, 176, 0.12)',
  primaryHover: '#5b89c0',

  ai: '#826bb0',             // 雅致淡紫
  aiBg: 'rgba(130, 107, 176, 0.12)',

  gold: '#b8944d',           // 暗金自选
  goldBg: 'rgba(184, 148, 77, 0.12)',
  goldBorder: 'rgba(184, 148, 77, 0.25)',

  danger: '#b34d56',
  warning: '#b88942',
  success: '#4e9a74',
};

/**
 * 涨跌颜色计算辅助函数
 */
export const getGrowthColor = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val) || val === 0) {
    return darkThemeTokens.flat;
  }
  return val > 0 ? darkThemeTokens.up : darkThemeTokens.down;
};

export const getGrowthBg = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val) || val === 0) {
    return darkThemeTokens.flatBg;
  }
  return val > 0 ? darkThemeTokens.upBg : darkThemeTokens.downBg;
};
