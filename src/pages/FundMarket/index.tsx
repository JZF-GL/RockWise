import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Table, Typography, Button, Space, Tag, Input, Select, message, Tooltip,
} from 'antd';
import {
  ReloadOutlined, SearchOutlined, StarOutlined, StarFilled, RobotOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { FundDataService } from '../../services/fundData';
import { getMyFunds, addFundToMyFunds, removeFundFromMyFunds } from '../../utils/myFunds';
import AIFundAnalysisModal from '../../components/AIFundAnalysisModal';
import { darkThemeTokens, getGrowthColor } from '../../styles/theme';

const { Text } = Typography;

const fundDataService = FundDataService.getInstance();

const typeOptions = [
  { value: 'all', label: '全部类型' },
  { value: 'gp', label: '股票型' },
  { value: 'hh', label: '混合型' },
  { value: 'zq', label: '债券型' },
  { value: 'zs', label: '指数型' },
  { value: 'qdii', label: 'QDII' },
  { value: 'fof', label: 'FOF' },
];

const sortOptions = [
  { value: '1nzf', label: '近1年涨幅' },
  { value: 'zzf', label: '今年以来' },
  { value: '6yzf', label: '近6月' },
  { value: '3yzf', label: '近3月' },
  { value: '1yzf', label: '近1月' },
  { value: '1zzf', label: '近1周' },
];

const FundMarket = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fundList, setFundList] = useState<any[]>([]);
  const [searchList, setSearchList] = useState<any[]>([]);
  const [searchMode, setSearchMode] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [fundType, setFundType] = useState('all');
  const [sortField, setSortField] = useState('1nzf');
  const [keyword, setKeyword] = useState('');
  const [myFundCodes, setMyFundCodes] = useState<string[]>([]);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [selectedFundForAI, setSelectedFundForAI] = useState<any>(null);

  const handleOpenAI = (e: React.MouseEvent, record: any) => {
    e.stopPropagation();
    setSelectedFundForAI(record);
    setAiModalOpen(true);
  };

  useEffect(() => {
    setMyFundCodes(getMyFunds());
  }, []);

  const handleToggleMyFund = (e: React.MouseEvent, record: { code: string; name: string }) => {
    e.stopPropagation();
    const isAdded = myFundCodes.includes(record.code);
    if (isAdded) {
      removeFundFromMyFunds(record.code);
      const updated = myFundCodes.filter((c) => c !== record.code);
      setMyFundCodes(updated);
      message.info(`已将 ${record.name} 从我的基金中移除`);
    } else {
      addFundToMyFunds(record.code);
      const updated = [...myFundCodes, record.code];
      setMyFundCodes(updated);
      message.success(`已添加 ${record.name} 到我的基金`);
    }
  };

  const fetchRanking = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fundDataService.getFundRanking({
        ft: fundType,
        sc: sortField,
        pi: page,
        pn: pageSize,
      });
      setFundList(result.list);
      setTotal(result.total);
    } catch (error) {
      message.error('获取基金排行失败');
    } finally {
      setLoading(false);
    }
  }, [fundType, sortField, page, pageSize]);

  useEffect(() => {
    if (!searchMode) {
      fetchRanking();
    }
  }, [fetchRanking, searchMode]);

  const handleSearch = async () => {
    const kw = keyword.trim();
    if (!kw) {
      handleClearSearch();
      return;
    }
    setLoading(true);
    setSearchMode(true);
    setPage(1);
    try {
      const results = await fundDataService.searchFundWithMarketData(kw);
      setSearchList(results);
    } catch {
      message.error('搜索失败');
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    setKeyword('');
    setSearchMode(false);
    setSearchList([]);
    setPage(1);
  };

  const growthText = (v: number) => {
    if (v === undefined || v === null || isNaN(v)) {
      return <Text style={{ color: darkThemeTokens.textTertiary }}>--</Text>;
    }
    if (v === 0) {
      return <Text style={{ color: darkThemeTokens.flat, fontVariantNumeric: 'tabular-nums' }}>0.00%</Text>;
    }
    return (
      <Text style={{ color: getGrowthColor(v), fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
        {v > 0 ? '+' : ''}{v.toFixed(2)}%
      </Text>
    );
  };

  // 当前表格渲染数据：搜索模式下由前端切片，全量模式下由后端分页
  const currentTableData = useMemo(() => {
    if (searchMode) {
      const start = (page - 1) * pageSize;
      return searchList.slice(start, start + pageSize);
    }
    return fundList;
  }, [searchMode, searchList, fundList, page, pageSize]);

  const currentTotal = searchMode ? searchList.length : total;

  const columns = [
    {
      title: '序号',
      width: 56,
      fixed: 'left' as const,
      render: (_: any, __: any, index: number) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {(page - 1) * pageSize + index + 1}
        </Text>
      ),
    },
    {
      title: '基金代码',
      dataIndex: 'code',
      width: 88,
      fixed: 'left' as const,
      render: (code: string) => (
        <Text
          strong
          style={{
            color: darkThemeTokens.textLink,
            cursor: 'pointer',
            fontVariantNumeric: 'tabular-nums',
          }}
          onClick={(e) => { e.stopPropagation(); navigate(`/fund/${code}`, { state: { from: '/' } }); }}
        >
          {code}
        </Text>
      ),
    },
    {
      title: '基金名称',
      dataIndex: 'name',
      width: 200,
      fixed: 'left' as const,
      ellipsis: true,
      render: (name: string) => (
        <Text strong style={{ fontSize: 13, color: darkThemeTokens.textHeading }}>{name}</Text>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 76,
      render: (type: string) => (
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
          {type}
        </Tag>
      ),
    },
    {
      title: '最新净值',
      dataIndex: 'nav',
      width: 88,
      align: 'right' as const,
      render: (nav: number) => (
        <Text style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500, color: darkThemeTokens.textPrimary }}>
          {nav ? nav.toFixed(4) : '--'}
        </Text>
      ),
    },
    {
      title: '日涨幅',
      dataIndex: 'dayGrowth',
      width: 76,
      align: 'right' as const,
      render: growthText,
    },
    {
      title: '近1周',
      dataIndex: 'weekGrowth',
      width: 76,
      align: 'right' as const,
      render: growthText,
    },
    {
      title: '近1月',
      dataIndex: 'monthGrowth',
      width: 76,
      align: 'right' as const,
      render: growthText,
    },
    {
      title: '近1年',
      dataIndex: 'yearGrowth',
      width: 76,
      align: 'right' as const,
      render: growthText,
    },
    {
      title: '操作',
      width: 215,
      fixed: 'right' as const,
      render: (_: any, record: any) => {
        const isAdded = myFundCodes.includes(record.code);
        return (
          <Space size={6} onClick={(e) => e.stopPropagation()}>
            <Tooltip title={isAdded ? '点击从我的基金中移除' : '快速添加进我的基金'}>
              <Button
                type={isAdded ? 'default' : 'primary'}
                ghost={!isAdded}
                size="small"
                icon={isAdded ? <StarFilled style={{ color: darkThemeTokens.gold }} /> : <StarOutlined />}
                style={
                  isAdded
                    ? {
                        borderColor: darkThemeTokens.goldBorder,
                        color: darkThemeTokens.gold,
                        background: darkThemeTokens.goldBg,
                        fontSize: 12,
                        padding: '0 8px',
                      }
                    : { fontSize: 12, padding: '0 8px' }
                }
                onClick={(e) => handleToggleMyFund(e, record)}
              >
                {isAdded ? '已自选' : '+ 自选'}
              </Button>
            </Tooltip>
            <Button
              type="link"
              size="small"
              icon={<RobotOutlined />}
              style={{ color: darkThemeTokens.ai, padding: '0 4px', fontWeight: 500 }}
              onClick={(e) => handleOpenAI(e, record)}
            >
              AI分析
            </Button>
            <Button
              type="link"
              size="small"
              style={{ color: darkThemeTokens.textLink, padding: '0 4px', fontWeight: 500 }}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/fund/${record.code}`, { state: { from: '/' } });
              }}
            >
              详情
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 筛选栏 */}
      <div style={{
        marginBottom: 12,
        flexShrink: 0,
        background: darkThemeTokens.bgCard,
        borderRadius: 8,
        padding: '12px 16px',
        border: `1px solid ${darkThemeTokens.border}`,
      }}>
        <Space wrap size={10}>
          <Input
            placeholder="搜索基金名称、代码或拼音缩写"
            prefix={<SearchOutlined style={{ color: darkThemeTokens.textTertiary }} />}
            value={keyword}
            onChange={(e) => {
              const val = e.target.value;
              setKeyword(val);
              if (!val.trim()) {
                handleClearSearch();
              }
            }}
            onPressEnter={handleSearch}
            style={{ width: 260 }}
            allowClear
          />
          <Button type="primary" onClick={handleSearch} size="middle" loading={loading && searchMode}>
            搜索
          </Button>
          {searchMode && (
            <Button onClick={handleClearSearch} size="middle">
              清除搜索
            </Button>
          )}
          {!searchMode && (
            <>
              <Select
                value={fundType}
                onChange={(v) => { setFundType(v); setPage(1); }}
                options={typeOptions}
                style={{ width: 110 }}
              />
              <Select
                value={sortField}
                onChange={(v) => { setSortField(v); setPage(1); }}
                options={sortOptions}
                style={{ width: 120 }}
              />
            </>
          )}
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              if (searchMode) {
                handleSearch();
              } else {
                fetchRanking();
              }
            }}
            loading={loading}
          >
            刷新
          </Button>
        </Space>
      </div>

      {/* 基金表格 */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
        background: darkThemeTokens.bgCard,
        borderRadius: 8,
        border: `1px solid ${darkThemeTokens.border}`,
      }}>
        <Table
          columns={columns}
          dataSource={currentTableData}
          rowKey="code"
          loading={loading}
          scroll={{ x: 1000, y: 'calc(100vh - 186px)' }}
          pagination={{
            current: page,
            pageSize,
            total: currentTotal,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => (
              <Text style={{ fontSize: 12, color: darkThemeTokens.textSecondary }}>
                {searchMode ? (
                  <>搜索结果: 共 <Text strong style={{ color: darkThemeTokens.textLink }}>{t}</Text> 只匹配基金</>
                ) : (
                  <>共 <Text strong style={{ color: darkThemeTokens.textPrimary }}>{t}</Text> 只基金</>
                )}
              </Text>
            ),
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
            pageSizeOptions: ['20', '50', '100'],
            size: 'small',
          }}
          onRow={(record) => ({
            style: { cursor: 'pointer' },
            onClick: () => navigate(`/fund/${record.code}`, { state: { from: '/' } }),
          })}
          size="small"
          style={{ height: '100%' }}
          rowClassName={() => 'fund-table-row'}
        />
      </div>

      <AIFundAnalysisModal
        open={aiModalOpen}
        fund={selectedFundForAI}
        onClose={() => setAiModalOpen(false)}
        onMyFundsChanged={() => setMyFundCodes(getMyFunds())}
      />
    </div>
  );
};

export default FundMarket;
