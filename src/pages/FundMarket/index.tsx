import { useEffect, useState, useCallback } from 'react';
import {
  Table, Typography, Button, Space, Tag, Input, Select, message,
} from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { FundDataService } from '../../services/fundData';

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
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [fundType, setFundType] = useState('all');
  const [sortField, setSortField] = useState('1nzf');
  const [keyword, setKeyword] = useState('');

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
    fetchRanking();
  }, [fetchRanking]);

  const handleSearch = async () => {
    if (!keyword.trim()) {
      fetchRanking();
      return;
    }
    setLoading(true);
    try {
      const results = await fundDataService.searchFund(keyword);
      const list = results.map((item) => ({
        code: item.code,
        name: item.name,
        type: item.type,
        nav: 0,
        dayGrowth: 0,
        weekGrowth: 0,
        monthGrowth: 0,
        yearGrowth: 0,
        threeYearGrowth: 0,
        totalGrowth: 0,
      }));
      setFundList(list);
      setTotal(list.length);
    } catch {
      message.error('搜索失败');
    } finally {
      setLoading(false);
    }
  };

  const growthColor = (v: number) => {
    if (v > 0) return '#cf1322';
    if (v < 0) return '#3f8600';
    return '#8c8c8c';
  };

  const growthText = (v: number) => (
    <Text style={{ color: growthColor(v), fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
      {v > 0 ? '+' : ''}{v?.toFixed(2) || '0.00'}%
    </Text>
  );

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
            color: '#1677ff',
            cursor: 'pointer',
            fontVariantNumeric: 'tabular-nums',
          }}
          onClick={(e) => { e.stopPropagation(); navigate(`/fund/${code}`); }}
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
        <Text strong style={{ fontSize: 13 }}>{name}</Text>
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
        <Text style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
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
      width: 64,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Button
          type="link"
          size="small"
          style={{ padding: 0, fontWeight: 500 }}
          onClick={(e) => { e.stopPropagation(); navigate(`/fund/${record.code}`); }}
        >
          详情
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 筛选栏 */}
      <div style={{
        marginBottom: 12,
        flexShrink: 0,
        background: '#fff',
        borderRadius: 8,
        padding: '12px 16px',
        border: '1px solid rgba(0, 0, 0, 0.06)',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
      }}>
        <Space wrap size={10}>
          <Input
            placeholder="搜索基金名称或代码"
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 240 }}
            allowClear
          />
          <Button type="primary" onClick={handleSearch} size="middle">
            搜索
          </Button>
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
          <Button icon={<ReloadOutlined />} onClick={fetchRanking} loading={loading}>
            刷新
          </Button>
        </Space>
      </div>

      {/* 基金表格 */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
        background: '#fff',
        borderRadius: 8,
        border: '1px solid rgba(0, 0, 0, 0.06)',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
      }}>
        <Table
          columns={columns}
          dataSource={fundList}
          rowKey="code"
          loading={loading}
          scroll={{ x: 1000, y: 'calc(100vh - 186px)' }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => (
              <Text type="secondary" style={{ fontSize: 13 }}>
                共 <Text strong style={{ color: '#262626' }}>{t}</Text> 只基金
              </Text>
            ),
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
            pageSizeOptions: ['20', '50', '100'],
            size: 'small',
          }}
          onRow={(record) => ({
            style: { cursor: 'pointer' },
            onClick: () => navigate(`/fund/${record.code}`),
          })}
          size="small"
          style={{ height: '100%' }}
          rowClassName={() => 'fund-table-row'}
        />
      </div>
    </div>
  );
};

export default FundMarket;
