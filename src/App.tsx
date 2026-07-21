import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import MainLayout from './components/MainLayout';
import FundMarket from './pages/FundMarket';
import MyFunds from './pages/MyFunds';
import Login from './pages/Login';
import FundDetail from './pages/FundDetail';
import Settings from './pages/Settings';
import Trading from './pages/Trading';
import MarketAnalysis from './pages/MarketAnalysis';

function App() {
  return (
    <ConfigProvider locale={zhCN}>
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