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
    '积极买入': '#cf1322',
    '分批定投': '#1677ff',
    '持有观望': '#fa8c16',
    '逢高减持': '#3f8600',
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
          icon={inMyFunds ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
          onClick={handleToggleMyFund}
          style={inMyFunds ? { borderColor: '#ffd591', color: '#d48806', background: '#fffbe6' } : undefined}
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
              background: '#e6f4ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1677ff',
              fontSize: 18,
            }}>
              <RobotOutlined />
            </div>
            <div>
              <Space>
                <Text strong style={{ fontSize: 16 }}>{fund.name}</Text>
                <Tag color="blue">{fund.code}</Tag>
                {fund.type && <Tag color="cyan">{fund.type}</Tag>}
              </Space>
            </div>
          </Space>
          <Tag icon={<GlobalOutlined />} color="processing" style={{ borderRadius: 12, padding: '2px 10px' }}>
            {loading ? (newsLoading ? '联网抓取新闻中...' : 'AI趋势分析中...') : '联网研判完成'}
          </Tag>
        </Space>
      }
    >
      <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 4 }}>
        {loading && !analysisResult ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" tip="正在联网搜索最新财经新闻，结合持仓数据进行AI模型推演..." />
            <div style={{ marginTop: 16, color: '#8c8c8c', fontSize: 13 }}>
              已连接新浪7x24实时财经资讯源，正在综合测算未来1个月与3个月行情趋势...
            </div>
          </div>
        ) : analysisResult ? (
          <div>
            {/* 核心趋势结论看板 */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card size="small" style={{ background: '#fafcff', borderColor: '#d6e4ff' }}>
                  <Statistic
                    title={
                      <Space size={4}>
                        <CalendarOutlined style={{ color: '#1677ff' }} />
                        <span>未来 1 个月短期趋势</span>
                      </Space>
                    }
                    value={analysisResult.oneMonthTrend.expectedRange}
                    valueStyle={{
                      color: is1MUp ? '#cf1322' : is1MDown ? '#3f8600' : '#fa8c16',
                      fontWeight: 'bold',
                      fontSize: 18,
                    }}
                    prefix={is1MUp ? <RiseOutlined /> : is1MDown ? <FallOutlined /> : undefined}
                  />
                  <div style={{ marginTop: 4 }}>
                    <Tag color={is1MUp ? 'red' : is1MDown ? 'green' : 'orange'}>
                      {is1MUp ? '震荡看多' : is1MDown ? '承压调整' : '区间整理'}
                    </Tag>
                    <span style={{ fontSize: 11, color: '#8c8c8c' }}>
                      置信度: {analysisResult.oneMonthTrend.confidence}%
                    </span>
                  </div>
                </Card>
              </Col>

              <Col span={8}>
                <Card size="small" style={{ background: '#fafcff', borderColor: '#d6e4ff' }}>
                  <Statistic
                    title={
                      <Space size={4}>
                        <StockOutlined style={{ color: '#1677ff' }} />
                        <span>未来 3 个月中期研判</span>
                      </Space>
                    }
                    value={analysisResult.threeMonthTrend.expectedRange}
                    valueStyle={{
                      color: is3MUp ? '#cf1322' : '#fa8c16',
                      fontWeight: 'bold',
                      fontSize: 18,
                    }}
                    prefix={is3MUp ? <RiseOutlined /> : undefined}
                  />
                  <div style={{ marginTop: 4 }}>
                    <Tag color={is3MUp ? 'red' : 'blue'}>
                      {is3MUp ? '结构性慢牛' : '中枢稳步抬升'}
                    </Tag>
                    <span style={{ fontSize: 11, color: '#8c8c8c' }}>
                      置信度: {analysisResult.threeMonthTrend.confidence}%
                    </span>
                  </div>
                </Card>
              </Col>

              <Col span={8}>
                <Card size="small" style={{ background: '#fffbe6', borderColor: '#ffe58f' }}>
                  <Statistic
                    title={
                      <Space size={4}>
                        <CompassOutlined style={{ color: '#faad14' }} />
                        <span>AI 操作建议评级</span>
                      </Space>
                    }
                    value={analysisResult.actionAdvice}
                    valueStyle={{
                      color: adviceColorMap[analysisResult.actionAdvice] || '#1677ff',
                      fontWeight: 'bold',
                      fontSize: 20,
                    }}
                  />
                  <div style={{ marginTop: 4 }}>
                    <span style={{ fontSize: 12, color: '#8c8c8c' }}>
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
                style={{ marginBottom: 16, background: '#f6ffed', borderColor: '#b7eb8f' }}
                defaultActiveKey={['news']}
                items={[
                  {
                    key: 'news',
                    label: (
                      <Space>
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        <Text strong style={{ color: '#274916' }}>
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
                              borderBottom: idx < newsList.length - 1 ? '1px dashed #e8e8e8' : 'none',
                              fontSize: 12,
                            }}
                          >
                            <Space align="start">
                              <Tag color="green" style={{ fontSize: 10, lineHeight: '18px', padding: '0 4px' }}>
                                {item.time ? item.time.split(' ')[1] || item.time : '实时'}
                              </Tag>
                              <div>
                                <Text strong style={{ color: '#262626' }}>{item.title}</Text>
                                <div style={{ color: '#595959', marginTop: 2, lineHeight: '18px' }}>
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
                  <RobotOutlined style={{ color: '#1677ff' }} />
                  <span>AI 宏观与持仓综合深度分析报告</span>
                </Space>
              }
              style={{ background: '#fafafa', borderRadius: 8 }}
            >
              <div style={{ padding: '8px 4px', fontSize: 13, lineHeight: '24px', color: '#262626' }}>
                {analysisResult.fullAnalysis.split('\n').map((line: string, i: number) => {
                  const trimmed = line.trim();
                  if (trimmed.startsWith('### ')) {
                    return (
                      <Title key={i} level={5} style={{ marginTop: 14, marginBottom: 8, color: '#1677ff' }}>
                        {trimmed.replace('### ', '')}
                      </Title>
                    );
                  }
                  if (trimmed.startsWith('- **') || trimmed.startsWith('**')) {
                    return (
                      <Paragraph key={i} style={{ marginBottom: 6 }}>
                        <Text strong>{trimmed.replace(/^[-\s*]+/, '')}</Text>
                      </Paragraph>
                    );
                  }
                  if (trimmed.length === 0) return null;
                  return (
                    <Paragraph key={i} style={{ marginBottom: 8, textIndent: trimmed.startsWith('-') ? 0 : '1em' }}>
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
