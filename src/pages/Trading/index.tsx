import { useEffect, useState, useCallback } from 'react';
import {
  Card, Typography, Button, Space, Tag, Input, Table, Tabs,
  Row, Col, Radio, InputNumber, message, Empty, Divider,
} from 'antd';
import {
  WalletOutlined, FundOutlined, RiseOutlined, FallOutlined,
  TransactionOutlined, SearchOutlined,
} from '@ant-design/icons';
import { useTradingStore } from '../../stores/tradingStore';
import { FundDataService } from '../../services/fundData';
import { darkThemeTokens } from '../../styles/theme';

const { Text } = Typography;
const fundDataService = FundDataService.getInstance();

const Trading = () => {
  const {
    account, positions, orders, loading,
    fetchAccount, buy, sell, fetchOrders, refreshPositions,
  } = useTradingStore();

  // 交易表单状态
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [fundCode, setFundCode] = useState('');
  const [tradeAmount, setTradeAmount] = useState<number>(0);
  const [tradeShares, setTradeShares] = useState<number>(0);
  const [searchResults, setSearchResults] = useState<{ code: string; name: string; type: string }[]>([]);
  const [selectedFund, setSelectedFund] = useState<{ code: string; name: string } | null>(null);

  useEffect(() => {
    fetchAccount();
    fetchOrders();
    refreshPositions();
  }, []);

  // 搜索基金
  const handleSearch = useCallback(async (value: string) => {
    if (!value || value.length < 1) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await fundDataService.searchFund(value);
      setSearchResults(results.slice(0, 10));
    } catch {
      setSearchResults([]);
    }
  }, []);

  // 选择基金
  const handleSelectFund = (code: string, name: string) => {
    setSelectedFund({ code, name });
    setFundCode(code);
    setSearchResults([]);
  };

  // 提交交易
  const handleSubmit = async () => {
    if (!selectedFund) {
      message.warning('请先选择基金');
      return;
    }

    if (tradeType === 'buy') {
      if (!tradeAmount || tradeAmount <= 0) {
        message.warning('请输入买入金额');
        return;
      }
      if (account && tradeAmount > account.balance) {
        message.warning('余额不足');
        return;
      }
      const result = await buy(selectedFund.code, selectedFund.name, tradeAmount);
      if (result.success) {
        message.success(`买入成功：${selectedFund.name} ${tradeAmount}元`);
        resetForm();
      } else {
        message.error(result.error || '买入失败');
      }
    } else {
      if (!tradeShares || tradeShares <= 0) {
        message.warning('请输入卖出份额');
        return;
      }
      const pos = positions.find(p => p.fund_code === selectedFund.code);
      if (!pos) {
        message.warning('无持仓');
        return;
      }
      if (tradeShares > pos.shares) {
        message.warning('持仓份额不足');
        return;
      }
      const result = await sell(selectedFund.code, selectedFund.name, tradeShares);
      if (result.success) {
        message.success(`卖出成功：${selectedFund.name} ${tradeShares}份`);
        resetForm();
      } else {
        message.error(result.error || '卖出失败');
      }
    }
  };

  const resetForm = () => {
    setSelectedFund(null);
    setFundCode('');
    setTradeAmount(0);
    setTradeShares(0);
  };

  // 计算汇总数据
  const totalPositionValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
  const totalCost = positions.reduce((sum, p) => sum + p.total_cost, 0);
  const totalProfitLoss = totalPositionValue - totalCost;
  const totalAssets = (account?.balance || 0) + totalPositionValue;

  // 持仓表格列
  const positionColumns = [
    {
      title: '基金代码',
      dataIndex: 'fund_code',
      width: 90,
      render: (code: string) => <Text strong style={{ color: darkThemeTokens.textLink }}>{code}</Text>,
    },
    {
      title: '基金名称',
      dataIndex: 'fund_name',
      width: 160,
      ellipsis: true,
      render: (name: string) => <Text strong style={{ fontSize: 13, color: darkThemeTokens.textHeading }}>{name}</Text>,
    },
    {
      title: '持有份额',
      dataIndex: 'shares',
      width: 90,
      align: 'right' as const,
      render: (v: number) => <Text style={{ fontVariantNumeric: 'tabular-nums', color: darkThemeTokens.textPrimary }}>{v.toFixed(2)}</Text>,
    },
    {
      title: '成本价',
      dataIndex: 'avg_cost',
      width: 80,
      align: 'right' as const,
      render: (v: number) => <Text style={{ color: darkThemeTokens.textSecondary }}>{v.toFixed(4)}</Text>,
    },
    {
      title: '现价',
      dataIndex: 'currentNav',
      width: 80,
      align: 'right' as const,
      render: (v: number) => <Text style={{ fontVariantNumeric: 'tabular-nums', color: darkThemeTokens.textPrimary }}>{v.toFixed(4)}</Text>,
    },
    {
      title: '持仓市值',
      dataIndex: 'currentValue',
      width: 100,
      align: 'right' as const,
      render: (v: number) => (
        <Text strong style={{ fontVariantNumeric: 'tabular-nums', color: darkThemeTokens.textPrimary }}>
          ¥{v.toFixed(2)}
        </Text>
      ),
    },
    {
      title: '盈亏',
      dataIndex: 'profitLoss',
      width: 100,
      align: 'right' as const,
      render: (v: number, record: any) => (
        <Space size={4}>
          <Text style={{ color: v >= 0 ? darkThemeTokens.up : darkThemeTokens.down, fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
            {v >= 0 ? '+' : ''}{v.toFixed(2)}
          </Text>
          <Text style={{ color: record.profitLossPercent >= 0 ? darkThemeTokens.up : darkThemeTokens.down, fontSize: 12 }}>
            ({record.profitLossPercent >= 0 ? '+' : ''}{record.profitLossPercent.toFixed(2)}%)
          </Text>
        </Space>
      ),
    },
    {
      title: '操作',
      width: 70,
      render: (_: any, record: any) => (
        <Button
          type="link"
          size="small"
          style={{ color: darkThemeTokens.down }}
          onClick={() => {
            setSelectedFund({ code: record.fund_code, name: record.fund_name });
            setFundCode(record.fund_code);
            setTradeType('sell');
          }}
        >
          卖出
        </Button>
      ),
    },
  ];

  // 订单表格列
  const orderColumns = [
    {
      title: '时间',
      dataIndex: 'created_at',
      width: 160,
      render: (v: string) => <Text style={{ fontSize: 12, color: darkThemeTokens.textTertiary }}>{v}</Text>,
    },
    {
      title: '基金代码',
      dataIndex: 'fund_code',
      width: 88,
      render: (code: string) => <Text style={{ color: darkThemeTokens.textLink }}>{code}</Text>,
    },
    {
      title: '基金名称',
      dataIndex: 'fund_name',
      width: 150,
      ellipsis: true,
      render: (name: string) => <Text style={{ color: darkThemeTokens.textHeading }}>{name}</Text>,
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 70,
      render: (type: string) => (
        <Tag style={{
          background: type === 'buy' ? darkThemeTokens.upBg : darkThemeTokens.downBg,
          borderColor: type === 'buy' ? darkThemeTokens.upBorder : darkThemeTokens.downBorder,
          color: type === 'buy' ? darkThemeTokens.up : darkThemeTokens.down,
          borderRadius: 4,
          margin: 0,
        }}>
          {type === 'buy' ? '买入' : '卖出'}
        </Tag>
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 100,
      align: 'right' as const,
      render: (v: number) => <Text style={{ fontVariantNumeric: 'tabular-nums', color: darkThemeTokens.textPrimary }}>¥{v.toFixed(2)}</Text>,
    },
    {
      title: '净值',
      dataIndex: 'nav',
      width: 80,
      align: 'right' as const,
      render: (v: number) => <Text style={{ color: darkThemeTokens.textSecondary }}>{v.toFixed(4)}</Text>,
    },
    {
      title: '份额',
      dataIndex: 'shares',
      width: 80,
      align: 'right' as const,
      render: (v: number) => <Text style={{ color: darkThemeTokens.textSecondary }}>{v.toFixed(2)}</Text>,
    },
  ];

  // 计算预估份额/金额
  const estimatedShares = tradeType === 'buy' && tradeAmount > 0 && selectedFund
    ? (tradeAmount / (positions.find(p => p.fund_code === selectedFund.code)?.currentNav || 1)).toFixed(2)
    : null;
  const estimatedProceeds = tradeType === 'sell' && tradeShares > 0 && selectedFund
    ? (tradeShares * (positions.find(p => p.fund_code === selectedFund.code)?.currentNav || 1)).toFixed(2)
    : null;

  return (
    <div>
      {/* 账户概览卡片 */}
      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        {[
          {
            title: '总资产',
            value: totalAssets,
            icon: <WalletOutlined style={{ fontSize: 18 }} />,
            color: darkThemeTokens.primaryHover,
            bg: darkThemeTokens.primaryBg,
            prefix: '¥',
          },
          {
            title: '可用余额',
            value: account?.balance || 0,
            icon: <FundOutlined style={{ fontSize: 18 }} />,
            color: darkThemeTokens.textPrimary,
            bg: 'rgba(255, 255, 255, 0.04)',
            prefix: '¥',
          },
          {
            title: '持仓市值',
            value: totalPositionValue,
            icon: <TransactionOutlined style={{ fontSize: 18 }} />,
            color: darkThemeTokens.ai,
            bg: darkThemeTokens.aiBg,
            prefix: '¥',
          },
          {
            title: '总盈亏',
            value: totalProfitLoss,
            icon: totalProfitLoss >= 0 ? <RiseOutlined style={{ fontSize: 18 }} /> : <FallOutlined style={{ fontSize: 18 }} />,
            color: totalProfitLoss >= 0 ? darkThemeTokens.up : darkThemeTokens.down,
            bg: totalProfitLoss >= 0 ? darkThemeTokens.upBg : darkThemeTokens.downBg,
            prefix: totalProfitLoss >= 0 ? '+¥' : '-¥',
            valueAbsolute: Math.abs(totalProfitLoss),
          },
        ].map((card) => (
          <Col xs={24} sm={12} lg={6} key={card.title}>
            <Card bodyStyle={{ padding: '14px 16px' }} style={{ borderRadius: 8, background: darkThemeTokens.bgCard, border: `1px solid ${darkThemeTokens.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 6,
                  background: card.bg, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  color: card.color, flexShrink: 0,
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                }}>
                  {card.icon}
                </div>
                <div>
                  <Text style={{ fontSize: 12, color: darkThemeTokens.textSecondary }}>{card.title}</Text>
                  <div style={{ fontSize: 17, fontWeight: 600, color: card.color, fontVariantNumeric: 'tabular-nums' }}>
                    {card.prefix}{(card as any).valueAbsolute !== undefined
                      ? (card as any).valueAbsolute.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : (card.value as number).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 主要内容区域 */}
      <Tabs
        defaultActiveKey="positions"
        items={[
          {
            key: 'positions',
            label: `持仓 (${positions.length})`,
            children: (
              <Card bodyStyle={{ padding: 0 }}>
                <Table
                  columns={positionColumns}
                  dataSource={positions}
                  rowKey="fund_code"
                  loading={loading}
                  pagination={false}
                  locale={{ emptyText: <Empty description="暂无持仓" /> }}
                  size="small"
                  scroll={{ x: 800 }}
                  style={{ borderRadius: 8 }}
                />
              </Card>
            ),
          },
          {
            key: 'trade',
            label: '交易',
            children: (
              <Card>
                <div style={{ maxWidth: 480 }}>
                  {/* 基金搜索 */}
                  <div style={{ marginBottom: 16 }}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>搜索基金</Text>
                    <Input
                      placeholder="输入基金名称或代码"
                      prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                      value={fundCode}
                      onChange={(e) => {
                        setFundCode(e.target.value);
                        setSelectedFund(null);
                        handleSearch(e.target.value);
                      }}
                      allowClear
                    />
                    {searchResults.length > 0 && (
                      <div style={{
                        border: `1px solid ${darkThemeTokens.border}`,
                        borderRadius: 6,
                        marginTop: 4,
                        maxHeight: 200,
                        overflow: 'auto',
                        background: darkThemeTokens.bgModal,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                      }}>
                        {searchResults.map((item) => (
                          <div
                            key={item.code}
                            onClick={() => handleSelectFund(item.code, item.name)}
                            style={{
                              padding: '8px 12px',
                              cursor: 'pointer',
                              borderBottom: `1px solid ${darkThemeTokens.border}`,
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <Text strong style={{ fontSize: 13, color: darkThemeTokens.textHeading }}>{item.name}</Text>
                            <Text style={{ marginLeft: 8, fontSize: 12, color: darkThemeTokens.textTertiary }}>{item.code}</Text>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedFund && (
                    <div style={{
                      padding: '8px 12px',
                      background: darkThemeTokens.bgInput,
                      border: `1px solid ${darkThemeTokens.border}`,
                      borderRadius: 6,
                      marginBottom: 16,
                    }}>
                      <Text strong style={{ color: darkThemeTokens.textHeading }}>{selectedFund.name}</Text>
                      <Text style={{ marginLeft: 8, color: darkThemeTokens.textSecondary }}>{selectedFund.code}</Text>
                    </div>
                  )}

                  {/* 交易类型 */}
                  <div style={{ marginBottom: 16 }}>
                    <Text strong style={{ display: 'block', marginBottom: 8, color: darkThemeTokens.textHeading }}>交易类型</Text>
                    <Radio.Group
                      value={tradeType}
                      onChange={(e) => { setTradeType(e.target.value); setTradeAmount(0); setTradeShares(0); }}
                      optionType="button"
                      buttonStyle="solid"
                    >
                      <Radio.Button value="buy" style={{ width: 100, textAlign: 'center' }}>买入</Radio.Button>
                      <Radio.Button value="sell" style={{ width: 100, textAlign: 'center' }}>卖出</Radio.Button>
                    </Radio.Group>
                  </div>

                  {/* 交易输入 */}
                  {tradeType === 'buy' ? (
                    <div style={{ marginBottom: 16 }}>
                      <Text strong style={{ display: 'block', marginBottom: 8, color: darkThemeTokens.textHeading }}>买入金额（元）</Text>
                      <InputNumber
                        min={1}
                        max={account?.balance || 1000000}
                        value={tradeAmount}
                        onChange={(v) => setTradeAmount(v || 0)}
                        style={{ width: '100%' }}
                        placeholder="请输入买入金额"
                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(value) => (value ? Number(value.replace(/,/g, '')) : 0)}
                      />
                      {estimatedShares && (
                        <Text style={{ fontSize: 12, marginTop: 4, display: 'block', color: darkThemeTokens.textSecondary }}>
                          预估获得份额：{estimatedShares} 份
                        </Text>
                      )}
                      {account && (
                        <Text style={{ fontSize: 12, color: darkThemeTokens.textTertiary }}>
                          可用余额：¥{account.balance.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                        </Text>
                      )}
                    </div>
                  ) : (
                    <div style={{ marginBottom: 16 }}>
                      <Text strong style={{ display: 'block', marginBottom: 8, color: darkThemeTokens.textHeading }}>卖出份额</Text>
                      <InputNumber
                        min={0.01}
                        max={positions.find(p => p.fund_code === selectedFund?.code)?.shares || 0}
                        step={0.01}
                        value={tradeShares}
                        onChange={(v) => setTradeShares(v || 0)}
                        style={{ width: '100%' }}
                        placeholder="请输入卖出份额"
                      />
                      {estimatedProceeds && (
                        <Text style={{ fontSize: 12, marginTop: 4, display: 'block', color: darkThemeTokens.textSecondary }}>
                          预估收入：¥{estimatedProceeds}
                        </Text>
                      )}
                      {selectedFund && (
                        <Text style={{ fontSize: 12, color: darkThemeTokens.textTertiary }}>
                          持有份额：{positions.find(p => p.fund_code === selectedFund.code)?.shares.toFixed(2) || 0} 份
                        </Text>
                      )}
                    </div>
                  )}

                  <Divider style={{ margin: '16px 0', borderColor: darkThemeTokens.border }} />

                  <Button
                    type="primary"
                    block
                    size="large"
                    loading={loading}
                    disabled={!selectedFund}
                    onClick={handleSubmit}
                    style={{
                      height: 38,
                      borderRadius: 6,
                      fontWeight: 500,
                      background: tradeType === 'buy' ? darkThemeTokens.primary : darkThemeTokens.down,
                      borderColor: tradeType === 'buy' ? darkThemeTokens.primary : darkThemeTokens.down,
                      color: '#ffffff',
                    }}
                  >
                    {tradeType === 'buy' ? '确认买入' : '确认卖出'}
                  </Button>
                </div>
              </Card>
            ),
          },
          {
            key: 'orders',
            label: `订单记录 (${orders.length})`,
            children: (
              <Card bodyStyle={{ padding: 0 }}>
                <Table
                  columns={orderColumns}
                  dataSource={orders}
                  rowKey="id"
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (t) => <Text type="secondary">共 {t} 条记录</Text>,
                    size: 'small',
                  }}
                  locale={{ emptyText: <Empty description="暂无交易记录" /> }}
                  size="small"
                  scroll={{ x: 700 }}
                  style={{ borderRadius: 8 }}
                />
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
};

export default Trading;
