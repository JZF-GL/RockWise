import { useEffect, useState, useCallback } from 'react';
import {
  Card, Typography, Button, Space, Tag, Input, Table, Tabs,
  Row, Col, Statistic, Radio, InputNumber, message, Empty, Divider,
} from 'antd';
import {
  WalletOutlined, FundOutlined, RiseOutlined, FallOutlined,
  TransactionOutlined, SearchOutlined,
} from '@ant-design/icons';
import { useTradingStore } from '../../stores/tradingStore';
import { useAuthStore } from '../../stores/authStore';
import { FundDataService } from '../../services/fundData';

const { Text, Title } = Typography;
const fundDataService = FundDataService.getInstance();

const Trading = () => {
  const { isLoggedIn } = useAuthStore();
  const {
    account, positions, orders, loading,
    fetchAccount, buy, sell, fetchOrders, refreshPositions,
  } = useTradingStore();

  // 交易表单状态
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [fundCode, setFundCode] = useState('');
  const [fundName, setFundName] = useState('');
  const [tradeAmount, setTradeAmount] = useState<number>(0);
  const [tradeShares, setTradeShares] = useState<number>(0);
  const [searchResults, setSearchResults] = useState<{ code: string; name: string; type: string }[]>([]);
  const [searching, setSearching] = useState(false);
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
    setSearching(true);
    try {
      const results = await fundDataService.searchFund(value);
      setSearchResults(results.slice(0, 10));
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // 选择基金
  const handleSelectFund = (code: string, name: string) => {
    setSelectedFund({ code, name });
    setFundCode(code);
    setFundName(name);
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
    setFundName('');
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
      render: (code: string) => <Text strong style={{ color: '#1677ff' }}>{code}</Text>,
    },
    {
      title: '基金名称',
      dataIndex: 'fund_name',
      width: 160,
      ellipsis: true,
      render: (name: string) => <Text strong style={{ fontSize: 13 }}>{name}</Text>,
    },
    {
      title: '持有份额',
      dataIndex: 'shares',
      width: 90,
      align: 'right' as const,
      render: (v: number) => <Text style={{ fontVariantNumeric: 'tabular-nums' }}>{v.toFixed(2)}</Text>,
    },
    {
      title: '成本价',
      dataIndex: 'avg_cost',
      width: 80,
      align: 'right' as const,
      render: (v: number) => <Text type="secondary">{v.toFixed(4)}</Text>,
    },
    {
      title: '现价',
      dataIndex: 'currentNav',
      width: 80,
      align: 'right' as const,
      render: (v: number) => <Text style={{ fontVariantNumeric: 'tabular-nums' }}>{v.toFixed(4)}</Text>,
    },
    {
      title: '持仓市值',
      dataIndex: 'currentValue',
      width: 100,
      align: 'right' as const,
      render: (v: number) => (
        <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>
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
          <Text style={{ color: v >= 0 ? '#cf1322' : '#3f8600', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
            {v >= 0 ? '+' : ''}{v.toFixed(2)}
          </Text>
          <Text style={{ color: record.profitLossPercent >= 0 ? '#cf1322' : '#3f8600', fontSize: 12 }}>
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
          danger
          onClick={() => {
            setSelectedFund({ code: record.fund_code, name: record.fund_name });
            setFundCode(record.fund_code);
            setFundName(record.fund_name);
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
      render: (v: string) => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: '基金代码',
      dataIndex: 'fund_code',
      width: 88,
      render: (code: string) => <Text style={{ color: '#1677ff' }}>{code}</Text>,
    },
    {
      title: '基金名称',
      dataIndex: 'fund_name',
      width: 150,
      ellipsis: true,
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 70,
      render: (type: string) => (
        <Tag color={type === 'buy' ? 'red' : 'green'} style={{ borderRadius: 4, margin: 0 }}>
          {type === 'buy' ? '买入' : '卖出'}
        </Tag>
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 100,
      align: 'right' as const,
      render: (v: number) => <Text style={{ fontVariantNumeric: 'tabular-nums' }}>¥{v.toFixed(2)}</Text>,
    },
    {
      title: '净值',
      dataIndex: 'nav',
      width: 80,
      align: 'right' as const,
      render: (v: number) => <Text>{v.toFixed(4)}</Text>,
    },
    {
      title: '份额',
      dataIndex: 'shares',
      width: 80,
      align: 'right' as const,
      render: (v: number) => <Text>{v.toFixed(2)}</Text>,
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
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {[
          {
            title: '总资产',
            value: totalAssets,
            icon: <WalletOutlined style={{ fontSize: 20 }} />,
            color: '#1677ff',
            bg: 'linear-gradient(135deg, #e6f4ff, #bae0ff)',
            prefix: '¥',
          },
          {
            title: '可用余额',
            value: account?.balance || 0,
            icon: <FundOutlined style={{ fontSize: 20 }} />,
            color: '#52c41a',
            bg: 'linear-gradient(135deg, #f6ffed, #d9f7be)',
            prefix: '¥',
          },
          {
            title: '持仓市值',
            value: totalPositionValue,
            icon: <TransactionOutlined style={{ fontSize: 20 }} />,
            color: '#722ed1',
            bg: 'linear-gradient(135deg, #f9f0ff, #efdbff)',
            prefix: '¥',
          },
          {
            title: '总盈亏',
            value: totalProfitLoss,
            icon: totalProfitLoss >= 0 ? <RiseOutlined style={{ fontSize: 20 }} /> : <FallOutlined style={{ fontSize: 20 }} />,
            color: totalProfitLoss >= 0 ? '#cf1322' : '#3f8600',
            bg: totalProfitLoss >= 0 ? 'linear-gradient(135deg, #fff2f0, #ffccc7)' : 'linear-gradient(135deg, #f6ffed, #d9f7be)',
            prefix: totalProfitLoss >= 0 ? '+¥' : '-¥',
            valueAbsolute: Math.abs(totalProfitLoss),
          },
        ].map((card) => (
          <Col xs={24} sm={12} lg={6} key={card.title}>
            <Card bodyStyle={{ padding: '18px 20px' }} style={{ borderRadius: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 10,
                  background: card.bg, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  color: card.color, flexShrink: 0,
                }}>
                  {card.icon}
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>{card.title}</Text>
                  <div style={{ fontSize: 20, fontWeight: 600, color: card.color, fontVariantNumeric: 'tabular-nums' }}>
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
                        border: '1px solid #f0f0f0',
                        borderRadius: 8,
                        marginTop: 4,
                        maxHeight: 200,
                        overflow: 'auto',
                        background: '#fff',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      }}>
                        {searchResults.map((item) => (
                          <div
                            key={item.code}
                            onClick={() => handleSelectFund(item.code, item.name)}
                            style={{
                              padding: '8px 12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f5f5f5',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <Text strong style={{ fontSize: 13 }}>{item.name}</Text>
                            <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>{item.code}</Text>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedFund && (
                    <div style={{
                      padding: '10px 14px',
                      background: '#f6f8fa',
                      borderRadius: 8,
                      marginBottom: 16,
                    }}>
                      <Text strong>{selectedFund.name}</Text>
                      <Text type="secondary" style={{ marginLeft: 8 }}>{selectedFund.code}</Text>
                    </div>
                  )}

                  {/* 交易类型 */}
                  <div style={{ marginBottom: 16 }}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>交易类型</Text>
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
                      <Text strong style={{ display: 'block', marginBottom: 8 }}>买入金额（元）</Text>
                      <InputNumber
                        min={1}
                        max={account?.balance || 1000000}
                        value={tradeAmount}
                        onChange={(v) => setTradeAmount(v || 0)}
                        style={{ width: '100%' }}
                        placeholder="请输入买入金额"
                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(value) => value!.replace(/,/g, '') as unknown as number}
                      />
                      {estimatedShares && (
                        <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                          预估获得份额：{estimatedShares} 份
                        </Text>
                      )}
                      {account && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          可用余额：¥{account.balance.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                        </Text>
                      )}
                    </div>
                  ) : (
                    <div style={{ marginBottom: 16 }}>
                      <Text strong style={{ display: 'block', marginBottom: 8 }}>卖出份额</Text>
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
                        <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                          预估收入：¥{estimatedProceeds}
                        </Text>
                      )}
                      {selectedFund && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          持有份额：{positions.find(p => p.fund_code === selectedFund.code)?.shares.toFixed(2) || 0} 份
                        </Text>
                      )}
                    </div>
                  )}

                  <Divider style={{ margin: '16px 0' }} />

                  <Button
                    type="primary"
                    block
                    size="large"
                    loading={loading}
                    disabled={!selectedFund}
                    onClick={handleSubmit}
                    style={{
                      height: 44,
                      borderRadius: 8,
                      fontWeight: 600,
                      background: tradeType === 'buy' ? '#1677ff' : '#52c41a',
                      borderColor: tradeType === 'buy' ? '#1677ff' : '#52c41a',
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
