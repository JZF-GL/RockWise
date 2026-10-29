import { useEffect, useState, useCallback } from 'react';
import {
  List, Typography, Button, Space, Tag, Input, Empty, Card,
  Row, Col, Statistic, message, Modal,
} from 'antd';
import {
  ReloadOutlined, SearchOutlined,
  RiseOutlined, FallOutlined, StarFilled, PlusOutlined, RobotOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useFundStore } from '../../stores/fundStore';
import { useAuthStore } from '../../stores/authStore';
import { FundDataService } from '../../services/fundData';
import { getMyFunds, saveMyFunds } from '../../utils/myFunds';
import AIFundAnalysisModal from '../../components/AIFundAnalysisModal';
import { darkThemeTokens } from '../../styles/theme';

const { Text } = Typography;
const fundDataService = FundDataService.getInstance();

const MyFunds = () => {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuthStore();
  const { funds, loading, lastUpdate, fetchFunds } = useFundStore();
  const [myCodes, setMyCodes] = useState<string[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<{ code: string; name: string; type: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [selectedFundForAI, setSelectedFundForAI] = useState<any>(null);

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
      icon: <StarFilled style={{ fontSize: 18 }} />,
      color: darkThemeTokens.gold,
      bg: darkThemeTokens.goldBg,
    },
    {
      title: '今日上涨',
      value: riseCount,
      suffix: `/ ${myCodes.length}`,
      icon: <RiseOutlined style={{ fontSize: 18 }} />,
      color: darkThemeTokens.up,
      bg: darkThemeTokens.upBg,
    },
    {
      title: '今日下跌',
      value: fallCount,
      suffix: `/ ${myCodes.length}`,
      icon: <FallOutlined style={{ fontSize: 18 }} />,
      color: darkThemeTokens.down,
      bg: darkThemeTokens.downBg,
    },
  ];

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        {statCards.map((card) => (
          <Col xs={24} sm={8} key={card.title}>
            <Card
              bodyStyle={{ padding: '14px 18px' }}
              style={{
                borderRadius: 8,
                background: darkThemeTokens.bgCard,
                border: `1px solid ${darkThemeTokens.border}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 6,
                  background: card.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: card.color,
                  flexShrink: 0,
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                }}>
                  {card.icon}
                </div>
                <div>
                  <Text style={{ fontSize: 12, color: darkThemeTokens.textSecondary }}>{card.title}</Text>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <Statistic
                      value={card.value}
                      valueStyle={{ color: card.color, fontSize: 20, fontWeight: 600, lineHeight: '28px' }}
                    />
                    {card.suffix && (
                      <Text style={{ fontSize: 12, color: darkThemeTokens.textTertiary }}>{card.suffix}</Text>
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
          <Text style={{ fontSize: 12, color: darkThemeTokens.textTertiary }}>
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
          const growthCol = isFlat ? darkThemeTokens.flat : isRise ? darkThemeTokens.up : darkThemeTokens.down;
          return (
            <List.Item
              key={fund.id}
              style={{
                padding: '12px 16px',
                marginBottom: 8,
                borderRadius: 8,
                background: darkThemeTokens.bgCard,
                border: `1px solid ${darkThemeTokens.border}`,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onClick={() => navigate(`/fund/${fund.code}`, { state: { from: '/my-funds' } })}
              actions={[
                <Button
                  type="text"
                  icon={<RobotOutlined style={{ color: darkThemeTokens.ai }} />}
                  style={{ color: darkThemeTokens.ai, borderRadius: 4, fontSize: 12 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFundForAI(fund);
                    setAiModalOpen(true);
                  }}
                >
                  AI分析
                </Button>,
                <Button
                  type="text"
                  icon={<StarFilled style={{ color: darkThemeTokens.gold, fontSize: 13 }} />}
                  onClick={(e) => { e.stopPropagation(); handleRemoveFund(fund.code); }}
                  style={{ borderRadius: 4, color: darkThemeTokens.textSecondary, fontSize: 12 }}
                >
                  移除
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space size={8}>
                    <Text strong style={{ fontSize: 13, color: darkThemeTokens.textHeading }}>{fund.name || fund.code}</Text>
                    <Tag
                      style={{
                        margin: 0,
                        borderRadius: 4,
                        fontSize: 11,
                        lineHeight: '18px',
                        padding: '1px 6px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        borderColor: darkThemeTokens.border,
                        color: darkThemeTokens.textSecondary,
                      }}
                    >
                      {fund.code}
                    </Tag>
                  </Space>
                }
                description={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4 }}>
                    <Space size={6}>
                      <Text style={{ fontSize: 12, color: darkThemeTokens.textSecondary }}>净值</Text>
                      <Text
                        strong
                        style={{
                          color: growthCol,
                          fontSize: 13,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {fund.net_value?.toFixed(4) || '--'}
                      </Text>
                    </Space>
                    {!isFlat && (
                      <Text
                        style={{
                          color: growthCol,
                          fontWeight: 500,
                          fontSize: 12,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {isRise ? '+' : ''}{fund.dayGrowth?.toFixed(2)}%
                      </Text>
                    )}
                    {fund.company && (
                      <Text style={{ fontSize: 11, color: darkThemeTokens.textTertiary }}>{fund.company}</Text>
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
          prefix={<SearchOutlined style={{ color: darkThemeTokens.textTertiary }} />}
          value={searchKeyword}
          onChange={(e) => { setSearchKeyword(e.target.value); handleSearch(e.target.value); }}
          allowClear
          style={{ marginBottom: 16, borderRadius: 6 }}
        />
        <List
          loading={searching}
          dataSource={searchResults}
          locale={{ emptyText: <span style={{ color: darkThemeTokens.textTertiary }}>输入关键词搜索基金</span> }}
          renderItem={(item) => (
            <List.Item
              actions={[
                myCodes.includes(item.code) ? (
                  <Tag style={{ background: darkThemeTokens.downBg, borderColor: darkThemeTokens.downBorder, color: darkThemeTokens.down, borderRadius: 4 }}>已添加</Tag>
                ) : (
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => handleAddFund(item.code, item.name)}
                    style={{ borderRadius: 4 }}
                  >
                    添加
                  </Button>
                ),
              ]}
            >
              <List.Item.Meta
                title={<Text style={{ fontSize: 13, color: darkThemeTokens.textHeading }}>{item.name}</Text>}
                description={
                  <Space size={6}>
                    <Tag style={{ margin: 0, borderRadius: 4, fontSize: 11, background: 'rgba(255, 255, 255, 0.04)', borderColor: darkThemeTokens.border, color: darkThemeTokens.textSecondary }}>{item.code}</Tag>
                    <Text style={{ fontSize: 12, color: darkThemeTokens.textSecondary }}>{item.type}</Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Modal>

      <AIFundAnalysisModal
        open={aiModalOpen}
        fund={selectedFundForAI}
        onClose={() => setAiModalOpen(false)}
        onMyFundsChanged={() => {
          const codes = getMyFunds();
          setMyCodes(codes);
          fetchFunds(codes);
        }}
      />
    </div>
  );
};

export default MyFunds;
