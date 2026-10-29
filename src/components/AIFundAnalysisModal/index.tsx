import React, { useEffect, useState, useCallback } from 'react';
import {
  Modal,
  Button,
  Spin,
  Space,
  Tag,
  Typography,
  Card,
  Row,
  Col,
  Statistic,
  Alert,
  Collapse,
} from 'antd';
import {
  RobotOutlined,
  ReloadOutlined,
  RiseOutlined,
  FallOutlined,
  GlobalOutlined,
  StarOutlined,
  StarFilled,
  CalendarOutlined,
  StockOutlined,
  CheckCircleOutlined,
  CompassOutlined,
} from '@ant-design/icons';
import { AIService } from '../../services/ai';
import { FundDataService } from '../../services/fundData';
import { isFundInMyFunds, addFundToMyFunds, removeFundFromMyFunds } from '../../utils/myFunds';
import { darkThemeTokens } from '../../styles/theme';

const { Title, Text, Paragraph } = Typography;
const aiService = AIService.getInstance();
const fundDataService = FundDataService.getInstance();

export interface FundBasicItem {
  code: string;
  name: string;
  type?: string;
  nav?: number;
  net_value?: number;
  dayGrowth?: number;
  monthGrowth?: number;
  yearGrowth?: number;
  scale?: string;
  manager?: string;
  company?: string;
}

interface AIFundAnalysisModalProps {
  open: boolean;
  fund: FundBasicItem | null;
  onClose: () => void;
  onMyFundsChanged?: () => void;
}

const AIFundAnalysisModal: React.FC<AIFundAnalysisModalProps> = ({
  open,
  fund,
  onClose,
  onMyFundsChanged,
}) => {
  const [loading, setLoading] = useState(false);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsList, setNewsList] = useState<{ time: string; title: string; content: string }[]>([]);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [inMyFunds, setInMyFunds] = useState(false);

  // 执行联网检索与分析流程
  const runAnalysis = useCallback(async (currentFund: FundBasicItem) => {
    setLoading(true);
    setNewsLoading(true);
    setAnalysisResult(null);

    try {
      // 1. 并发获取：全网最新 7x24 财经要闻 + 基金前十大重仓持股 + 基金详细信息
      const [fetchedNews, holdings, fullInfo] = await Promise.all([
        fundDataService.getLatestFinancialNews(6).catch(() => []),
        fundDataService.getFundHoldings(currentFund.code).catch(() => []),
        fundDataService.getFundInfo(currentFund.code).catch(() => null),
      ]);

      setNewsList(fetchedNews);
      setNewsLoading(false);

      // 合并基金指标
      const combinedFund = {
        ...currentFund,
        net_value: currentFund.net_value || currentFund.nav || fullInfo?.nav || 0,
        dayGrowth: currentFund.dayGrowth ?? fullInfo?.dayGrowth ?? 0,
        monthGrowth: currentFund.monthGrowth ?? 0,
        yearGrowth: currentFund.yearGrowth ?? 0,
        manager: fullInfo?.manager || currentFund.manager || '未知',
        company: fullInfo?.company || currentFund.company || '未知',
        type: currentFund.type || fullInfo?.type || '混合型',
        scale: fullInfo?.scale || '未知',
      };

      // 2. 调度 AI 服务进行深度走势预测
      const result = await aiService.analyzeFundFutureTrends(
        combinedFund,
        holdings,
        fetchedNews
      );

      setAnalysisResult(result);
    } catch (error) {
      console.error('AI分析失败:', error);
    } finally {
      setLoading(false);
      setNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && fund) {
      setInMyFunds(isFundInMyFunds(fund.code));
      runAnalysis(fund);
    }
  }, [open, fund, runAnalysis]);

  if (!fund) return null;

  const handleToggleMyFund = () => {
    if (inMyFunds) {
      removeFundFromMyFunds(fund.code);
      setInMyFunds(false);
    } else {
      addFundToMyFunds(fund.code);
      setInMyFunds(true);
    }
    if (onMyFundsChanged) onMyFundsChanged();
  };

  const is1MUp = analysisResult?.oneMonthTrend?.direction === 'up';
  const is1MDown = analysisResult?.oneMonthTrend?.direction === 'down';
  const is3MUp = analysisResult?.threeMonthTrend?.direction === 'up';

  const adviceColorMap: Record<string, string> = {
    '积极买入': darkThemeTokens.up,
    '分批定投': darkThemeTokens.primaryHover,
    '持有观望': darkThemeTokens.gold,
    '逢高减持': darkThemeTokens.down,
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={780}
      style={{ top: 24 }}
      footer={[
        <Button key="refresh" icon={<ReloadOutlined />} onClick={() => runAnalysis(fund)} loading={loading}>
          重新分析
        </Button>,
        <Button
          key="fav"
          icon={inMyFunds ? <StarFilled style={{ color: darkThemeTokens.gold }} /> : <StarOutlined />}
          onClick={handleToggleMyFund}
          style={inMyFunds ? { borderColor: darkThemeTokens.goldBorder, color: darkThemeTokens.gold, background: darkThemeTokens.goldBg } : undefined}
        >
          {inMyFunds ? '已在我的基金' : '+ 添加到我的基金'}
        </Button>,
        <Button key="close" type="primary" onClick={onClose}>
          完成
        </Button>,
      ]}
      title={
        <Space align="center" style={{ width: '100%', justifyContent: 'space-between', paddingRight: 32 }}>
          <Space>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: darkThemeTokens.aiBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: darkThemeTokens.ai,
              fontSize: 18,
            }}>
              <RobotOutlined />
            </div>
            <div>
              <Space>
                <Text strong style={{ fontSize: 16, color: darkThemeTokens.textHeading }}>{fund.name}</Text>
                <Tag style={{ background: 'rgba(255, 255, 255, 0.05)', borderColor: darkThemeTokens.border, color: darkThemeTokens.textSecondary }}>{fund.code}</Tag>
                {fund.type && <Tag style={{ background: 'rgba(255, 255, 255, 0.05)', borderColor: darkThemeTokens.border, color: darkThemeTokens.textSecondary }}>{fund.type}</Tag>}
              </Space>
            </div>
          </Space>
          <Tag icon={<GlobalOutlined />} style={{ borderRadius: 12, padding: '2px 10px', background: darkThemeTokens.primaryBg, borderColor: 'rgba(77, 122, 176, 0.3)', color: darkThemeTokens.primaryHover }}>
            {loading ? (newsLoading ? '联网抓取新闻中...' : 'AI趋势分析中...') : '联网研判完成'}
          </Tag>
        </Space>
      }
    >
      <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 4 }}>
        {loading && !analysisResult ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" tip="正在联网搜索最新财经新闻，结合持仓数据进行AI模型推演..." />
            <div style={{ marginTop: 16, color: darkThemeTokens.textSecondary, fontSize: 13 }}>
              已连接新浪7x24实时财经资讯源，正在综合测算未来1个月与3个月行情趋势...
            </div>
          </div>
        ) : analysisResult ? (
          <div>
            {/* 核心趋势结论看板 */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card size="small" style={{ background: darkThemeTokens.bgInput, borderColor: darkThemeTokens.border }}>
                  <Statistic
                    title={
                      <Space size={4}>
                        <CalendarOutlined style={{ color: darkThemeTokens.primaryHover }} />
                        <span style={{ color: darkThemeTokens.textSecondary }}>未来 1 个月短期趋势</span>
                      </Space>
                    }
                    value={analysisResult.oneMonthTrend.expectedRange}
                    valueStyle={{
                      color: is1MUp ? darkThemeTokens.up : is1MDown ? darkThemeTokens.down : darkThemeTokens.gold,
                      fontWeight: 'bold',
                      fontSize: 18,
                    }}
                    prefix={is1MUp ? <RiseOutlined /> : is1MDown ? <FallOutlined /> : undefined}
                  />
                  <div style={{ marginTop: 4 }}>
                    <Tag style={{
                      background: is1MUp ? darkThemeTokens.upBg : is1MDown ? darkThemeTokens.downBg : darkThemeTokens.goldBg,
                      borderColor: is1MUp ? darkThemeTokens.upBorder : is1MDown ? darkThemeTokens.downBorder : darkThemeTokens.goldBorder,
                      color: is1MUp ? darkThemeTokens.up : is1MDown ? darkThemeTokens.down : darkThemeTokens.gold,
                    }}>
                      {is1MUp ? '震荡看多' : is1MDown ? '承压调整' : '区间整理'}
                    </Tag>
                    <span style={{ fontSize: 11, color: darkThemeTokens.textTertiary }}>
                      置信度: {analysisResult.oneMonthTrend.confidence}%
                    </span>
                  </div>
                </Card>
              </Col>

              <Col span={8}>
                <Card size="small" style={{ background: darkThemeTokens.bgInput, borderColor: darkThemeTokens.border }}>
                  <Statistic
                    title={
                      <Space size={4}>
                        <StockOutlined style={{ color: darkThemeTokens.primaryHover }} />
                        <span style={{ color: darkThemeTokens.textSecondary }}>未来 3 个月中期研判</span>
                      </Space>
                    }
                    value={analysisResult.threeMonthTrend.expectedRange}
                    valueStyle={{
                      color: is3MUp ? darkThemeTokens.up : darkThemeTokens.gold,
                      fontWeight: 'bold',
                      fontSize: 18,
                    }}
                    prefix={is3MUp ? <RiseOutlined /> : undefined}
                  />
                  <div style={{ marginTop: 4 }}>
                    <Tag style={{
                      background: is3MUp ? darkThemeTokens.upBg : darkThemeTokens.primaryBg,
                      borderColor: is3MUp ? darkThemeTokens.upBorder : 'rgba(77, 122, 176, 0.3)',
                      color: is3MUp ? darkThemeTokens.up : darkThemeTokens.primaryHover,
                    }}>
                      {is3MUp ? '结构性慢牛' : '中枢稳步抬升'}
                    </Tag>
                    <span style={{ fontSize: 11, color: darkThemeTokens.textTertiary }}>
                      置信度: {analysisResult.threeMonthTrend.confidence}%
                    </span>
                  </div>
                </Card>
              </Col>

              <Col span={8}>
                <Card size="small" style={{ background: darkThemeTokens.bgInput, borderColor: darkThemeTokens.border }}>
                  <Statistic
                    title={
                      <Space size={4}>
                        <CompassOutlined style={{ color: darkThemeTokens.gold }} />
                        <span style={{ color: darkThemeTokens.textSecondary }}>AI 操作建议评级</span>
                      </Space>
                    }
                    value={analysisResult.actionAdvice}
                    valueStyle={{
                      color: adviceColorMap[analysisResult.actionAdvice] || darkThemeTokens.primaryHover,
                      fontWeight: 'bold',
                      fontSize: 18,
                    }}
                  />
                  <div style={{ marginTop: 4 }}>
                    <span style={{ fontSize: 12, color: darkThemeTokens.textTertiary }}>
                      风格匹配: 稳健与成长均衡
                    </span>
                  </div>
                </Card>
              </Col>
            </Row>

            {/* 联网抓取的实时新闻展示 */}
            {newsList.length > 0 && (
              <Collapse
                size="small"
                style={{ marginBottom: 16, background: darkThemeTokens.bgInput, borderColor: darkThemeTokens.border }}
                defaultActiveKey={['news']}
                items={[
                  {
                    key: 'news',
                    label: (
                      <Space>
                        <CheckCircleOutlined style={{ color: darkThemeTokens.down }} />
                        <Text strong style={{ color: darkThemeTokens.textHeading }}>
                          实时联网参考要闻 ({newsList.length}条最新宏观与行业资讯)
                        </Text>
                      </Space>
                    ),
                    children: (
                      <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                        {newsList.map((item, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: '6px 0',
                              borderBottom: idx < newsList.length - 1 ? `1px dashed ${darkThemeTokens.border}` : 'none',
                              fontSize: 12,
                            }}
                          >
                            <Space align="start">
                              <Tag style={{ fontSize: 10, lineHeight: '18px', padding: '0 4px', background: darkThemeTokens.downBg, borderColor: darkThemeTokens.downBorder, color: darkThemeTokens.down }}>
                                {item.time ? item.time.split(' ')[1] || item.time : '实时'}
                              </Tag>
                              <div>
                                <Text strong style={{ color: darkThemeTokens.textHeading }}>{item.title}</Text>
                                <div style={{ color: darkThemeTokens.textSecondary, marginTop: 2, lineHeight: '18px' }}>
                                  {item.content}
                                </div>
                              </div>
                            </Space>
                          </div>
                        ))}
                      </div>
                    ),
                  },
                ]}
              />
            )}

            {/* AI 深度分析全文报告 */}
            <Card
              size="small"
              title={
                <Space>
                  <RobotOutlined style={{ color: darkThemeTokens.ai }} />
                  <span style={{ color: darkThemeTokens.textHeading }}>AI 宏观与持仓综合深度分析报告</span>
                </Space>
              }
              style={{ background: darkThemeTokens.bgInput, borderColor: darkThemeTokens.border, borderRadius: 8 }}
            >
              <div style={{ padding: '8px 4px', fontSize: 13, lineHeight: '24px', color: darkThemeTokens.textPrimary }}>
                {analysisResult.fullAnalysis.split('\n').map((line: string, i: number) => {
                  const trimmed = line.trim();
                  if (trimmed.startsWith('### ')) {
                    return (
                      <Title key={i} level={5} style={{ marginTop: 14, marginBottom: 8, color: darkThemeTokens.primaryHover }}>
                        {trimmed.replace('### ', '')}
                      </Title>
                    );
                  }
                  if (trimmed.startsWith('- **') || trimmed.startsWith('**')) {
                    return (
                      <Paragraph key={i} style={{ marginBottom: 6 }}>
                        <Text strong style={{ color: darkThemeTokens.textHeading }}>{trimmed.replace(/^[-\s*]+/, '')}</Text>
                      </Paragraph>
                    );
                  }
                  if (trimmed.length === 0) return null;
                  return (
                    <Paragraph key={i} style={{ marginBottom: 8, textIndent: trimmed.startsWith('-') ? 0 : '1em', color: darkThemeTokens.textPrimary }}>
                      {trimmed}
                    </Paragraph>
                  );
                })}
              </div>
            </Card>

            {/* 提示栏 */}
            <Alert
              style={{ marginTop: 14 }}
              type="info"
              showIcon
              message="趋势预测免责提示"
              description="本预测基于实时抓取的全网宏观新闻、前十大重仓股票基本面及基金量化动量因子综合推演，不作为实质性确定收益承诺，投资有风险，入市需谨慎。"
            />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }}>
            暂无分析结果，请点击“重新分析”按钮
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AIFundAnalysisModal;
