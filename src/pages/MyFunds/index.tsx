import { useEffect, useState, useCallback } from 'react';
import {
  List, Typography, Button, Space, Tag, Input, Empty, Card,
  Row, Col, Statistic, message, Modal,
} from 'antd';
import {
  ReloadOutlined, SearchOutlined,
  RiseOutlined, FallOutlined, StarFilled, PlusOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useFundStore } from '../../stores/fundStore';
import { useAuthStore } from '../../stores/authStore';
import { FundDataService } from '../../services/fundData';

const { Text } = Typography;
const fundDataService = FundDataService.getInstance();

const STORAGE_KEY = 'my_funds';
const getMyFunds = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '["000001","110011","163406","000961","270002"]');
  } catch {
    return ['000001', '110011', '163406', '000961', '270002'];
  }
};
const saveMyFunds = (codes: string[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
};

const MyFunds = () => {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuthStore();
  const { funds, loading, lastUpdate, fetchFunds } = useFundStore();
  const [myCodes, setMyCodes] = useState<string[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<{ code: string; name: string; type: string }[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      message.warning('请先登录后再查看我的基金');
      navigate('/login');
      return;
    }
    const codes = getMyFunds();
    setMyCodes(codes);
    fetchFunds(codes);
  }, [isLoggedIn, navigate, fetchFunds]);

  const handleRefresh = async () => {
    await fetchFunds(myCodes);
    message.success('数据刷新成功');
  };

  const handleRemoveFund = (code: string) => {
    const newCodes = myCodes.filter((c) => c !== code);
    setMyCodes(newCodes);
    saveMyFunds(newCodes);
    fetchFunds(newCodes);
    message.success('已移除');
  };

  const handleAddFund = (code: string, name: string) => {
    if (myCodes.includes(code)) {
      message.info('已在自选列表中');
      return;
    }
    const newCodes = [...myCodes, code];
    setMyCodes(newCodes);
    saveMyFunds(newCodes);
    fetchFunds(newCodes);
    setAddModalOpen(false);
    setSearchKeyword('');
    message.success(`已添加 ${name}`);
  };

  const handleSearch = useCallback(async (value: string) => {
    if (!value || value.length < 1) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await fundDataService.searchFund(value);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const filteredFunds = funds;
  const riseCount = filteredFunds.filter((f) => f.dayGrowth > 0).length;
  const fallCount = filteredFunds.filter((f) => f.dayGrowth < 0).length;

  if (!isLoggedIn) return null;

  const statCards = [
    {
      title: '自选基金',
      value: myCodes.length,
      icon: <StarFilled style={{ fontSize: 20 }} />,
      color: '#faad14',
      bg: 'linear-gradient(135deg, #fff7e6, #fff1b8)',
    },
    {
      title: '今日上涨',
      value: riseCount,
      suffix: `/ ${myCodes.length}`,
      icon: <RiseOutlined style={{ fontSize: 20 }} />,
      color: '#3f8600',
      bg: 'linear-gradient(135deg, #f6ffed, #d9f7be)',
    },
    {
      title: '今日下跌',
      value: fallCount,
      suffix: `/ ${myCodes.length}`,
      icon: <FallOutlined style={{ fontSize: 20 }} />,
      color: '#cf1322',
      bg: 'linear-gradient(135deg, #fff2f0, #ffccc7)',
    },
  ];

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {statCards.map((card) => (
          <Col xs={24} sm={8} key={card.title}>
            <Card
              bodyStyle={{ padding: '20px 24px' }}
              style={{ borderRadius: 10, overflow: 'hidden' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: card.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: card.color,
                  flexShrink: 0,
                }}>
                  {card.icon}
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 13 }}>{card.title}</Text>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <Statistic
                      value={card.value}
                      valueStyle={{ color: card.color, fontSize: 24, fontWeight: 600, lineHeight: '32px' }}
                    />
                    {card.suffix && (
                      <Text type="secondary" style={{ fontSize: 13 }}>{card.suffix}</Text>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 操作栏 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
      }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setAddModalOpen(true)}
        >
          添加基金
        </Button>
        <Space size={12}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            上次更新: {lastUpdate || '未更新'}
          </Text>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
            刷新
          </Button>
        </Space>
      </div>

      {/* 基金列表 */}
      <List
        loading={loading}
        dataSource={filteredFunds}
        locale={{ emptyText: <Empty description="暂无自选基金，点击上方添加" /> }}
        renderItem={(fund) => {
          const isRise = fund.dayGrowth > 0;
          const isFlat = fund.dayGrowth === 0;
          return (
            <List.Item
              key={fund.id}
              style={{
                padding: '14px 18px',
                marginBottom: 8,
                borderRadius: 8,
                background: '#fff',
                border: '1px solid rgba(0, 0, 0, 0.06)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
              }}
              onClick={() => navigate(`/fund/${fund.code}`)}
              actions={[
                <Button
                  type="text"
                  danger
                  icon={<StarFilled style={{ color: '#faad14', fontSize: 14 }} />}
                  onClick={(e) => { e.stopPropagation(); handleRemoveFund(fund.code); }}
                  style={{ borderRadius: 6 }}
                >
                  移除
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space size={8}>
                    <Text strong style={{ fontSize: 14 }}>{fund.name || fund.code}</Text>
                    <Tag
                      color="blue"
                      style={{
                        margin: 0,
                        borderRadius: 4,
                        fontSize: 11,
                        lineHeight: '18px',
                        padding: '1px 6px',
                      }}
                    >
                      {fund.code}
                    </Tag>
                  </Space>
                }
                description={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4 }}>
                    <Space size={6}>
                      <Text type="secondary" style={{ fontSize: 13 }}>净值</Text>
                      <Text
                        strong
                        style={{
                          color: isFlat ? '#595959' : isRise ? '#3f8600' : '#cf1322',
                          fontSize: 14,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {fund.net_value?.toFixed(4) || '--'}
                      </Text>
                    </Space>
                    {!isFlat && (
                      <Text
                        style={{
                          color: isRise ? '#3f8600' : '#cf1322',
                          fontWeight: 500,
                          fontSize: 13,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {isRise ? '+' : ''}{fund.dayGrowth?.toFixed(2)}%
                      </Text>
                    )}
                    {fund.company && (
                      <Text type="secondary" style={{ fontSize: 12 }}>{fund.company}</Text>
                    )}
                  </div>
                }
              />
            </List.Item>
          );
        }}
      />

      {/* 添加基金弹窗 */}
      <Modal
        title="添加基金到自选"
        open={addModalOpen}
        onCancel={() => { setAddModalOpen(false); setSearchKeyword(''); setSearchResults([]); }}
        footer={null}
        width={480}
        centered
      >
        <Input
          placeholder="输入基金名称或代码搜索"
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          value={searchKeyword}
          onChange={(e) => { setSearchKeyword(e.target.value); handleSearch(e.target.value); }}
          allowClear
          style={{ marginBottom: 16, borderRadius: 8 }}
          size="large"
        />
        <List
          loading={searching}
          dataSource={searchResults}
          locale={{ emptyText: '输入关键词搜索基金' }}
          renderItem={(item) => (
            <List.Item
              actions={[
                myCodes.includes(item.code) ? (
                  <Tag color="green" style={{ borderRadius: 4 }}>已添加</Tag>
                ) : (
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => handleAddFund(item.code, item.name)}
                    style={{ borderRadius: 6 }}
                  >
                    添加
                  </Button>
                ),
              ]}
            >
              <List.Item.Meta
                title={<Text style={{ fontSize: 14 }}>{item.name}</Text>}
                description={
                  <Space size={6}>
                    <Tag color="blue" style={{ margin: 0, borderRadius: 4, fontSize: 11 }}>{item.code}</Tag>
                    <Text type="secondary" style={{ fontSize: 12 }}>{item.type}</Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
};

export default MyFunds;
