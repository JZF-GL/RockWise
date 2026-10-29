import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import MainLayout from './components/MainLayout';
import FundMarket from './pages/FundMarket';
import MyFunds from './pages/MyFunds';
import Login from './pages/Login';
import FundDetail from './pages/FundDetail';
import Settings from './pages/Settings';
import Trading from './pages/Trading';
import MarketAnalysis from './pages/MarketAnalysis';
import { darkThemeTokens } from './styles/theme';

function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: darkThemeTokens.primary,
          colorBgBase: darkThemeTokens.bgApp,
          colorBgContainer: darkThemeTokens.bgCard,
          colorBgElevated: darkThemeTokens.bgModal,
          colorBgLayout: darkThemeTokens.bgApp,
          colorText: darkThemeTokens.textPrimary,
          colorTextHeading: darkThemeTokens.textHeading,
          colorTextSecondary: darkThemeTokens.textSecondary,
          colorTextTertiary: darkThemeTokens.textTertiary,
          colorTextQuaternary: darkThemeTokens.textMuted,
          colorBorder: darkThemeTokens.border,
          colorBorderSecondary: darkThemeTokens.borderLight,
          borderRadius: 6,
          fontSize: 13,
          fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif`,
        },
        components: {
          Card: {
            colorBgContainer: darkThemeTokens.bgCard,
            colorBorderSecondary: darkThemeTokens.border,
          },
          Table: {
            colorBgContainer: darkThemeTokens.bgCard,
            headerBg: '#15171e',
            headerColor: darkThemeTokens.textSecondary,
            headerSplitColor: 'transparent',
            rowHoverBg: 'rgba(255, 255, 255, 0.03)',
            borderColor: 'rgba(255, 255, 255, 0.06)',
          },
          Menu: {
            darkItemBg: 'transparent',
            darkItemSelectedBg: 'rgba(77, 122, 176, 0.16)',
            darkItemColor: darkThemeTokens.textSecondary,
            darkItemSelectedColor: '#a6c2e6',
          },
          Button: {
            defaultBg: '#1b1e25',
            defaultColor: darkThemeTokens.textPrimary,
            defaultBorderColor: 'rgba(255, 255, 255, 0.1)',
          },
          Input: {
            colorBgContainer: darkThemeTokens.bgInput,
            colorBorder: 'rgba(255, 255, 255, 0.1)',
            activeBorderColor: darkThemeTokens.primary,
          },
          Select: {
            colorBgContainer: darkThemeTokens.bgInput,
            colorBorder: 'rgba(255, 255, 255, 0.1)',
          },
          Tabs: {
            itemColor: darkThemeTokens.textSecondary,
            itemSelectedColor: '#96b8e3',
            itemHoverColor: '#b0cbee',
            inkBarColor: darkThemeTokens.primary,
          },
          Modal: {
            contentBg: darkThemeTokens.bgModal,
            headerBg: darkThemeTokens.bgModal,
          },
          Statistic: {
            contentFontSize: 20,
            titleFontSize: 12,
          },
        },
      }}
    >
      <Router>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<FundMarket />} />
            <Route path="/my-funds" element={<MyFunds />} />
            <Route path="/login" element={<Login />} />
            <Route path="/fund/:code" element={<FundDetail />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/trading" element={<Trading />} />
            <Route path="/analysis" element={<MarketAnalysis />} />
          </Route>
        </Routes>
      </Router>
    </ConfigProvider>
  );
}

export default App;