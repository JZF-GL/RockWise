import { useEffect, useState, useCallback } from 'react';
import {
  List, Typography, Button, Space, Tag, Input, Empty, Card,
  Row, Col, Statistic, message, Spin, AutoComplete,
} from 'antd';
import {
  ReloadOutlined, SearchOutlined, FundOutlined,
  RiseOutlined, FallOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useFundStore } from '../../stores/fundStore';

const { Title, Text } = Typography;

const FundList = () => {
  const {
    funds, loading, lastUpdate, fetchFunds, searchFund,
  } = useFundStore();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchOptions, setSearchOptions] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFunds();
  }, [fetchFunds]);

  const handleRefresh = async () => {
    await fetchFunds();
    message.success('数据刷新成功');
  };

  const handleSearch = useCallback(
    async (value: string) => {
      if (!value || value.length < 1) {
        setSearchOptions([]);
        return;
      }
      setSearching(true);
      try {
        const results = await searchFund(value);
        setSearchOptions(
          results.map((item) => ({
            value: item.code,
            label: (
              <Space>
                <Text strong>{item.name}</Text>
                <Tag color="blue">{item.code}</Tag>
                <Text type="secondary">{item.type}</Text>
              </Space>
            ),
          }))
        );
      } catch {
        setSearchOptions([]);
      } finally {
        setSearching(false);
      }
    },
    [searchFund]
  );

  const handleSelect = (value: string) => {
    navigate(`/fund/${value}`);
  };

  const filteredFunds = funds.filter(
    (fund) =>
      fund.name?.includes(searchKeyword) ||
      fund.code?.includes(searchKeyword)
  );

  // 统计数据
  const riseCount = funds.filter((f) => f.dayGrowth > 0).length;
  const fallCount = funds.filter((f) => f.dayGrowth < 0).length;
  const flatCount = funds.length - riseCount - fallCount;

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card hoverable>
            <Statistic
              title="持有基金数"
              value={funds.length}
              prefix={<FundOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card hoverable>
            <Statistic
              title="今日上涨"
              value={riseCount}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#3f8600' }}
              suffix={
                <Text type="secondary" style={{ fontSize: 14 }}>
                  / {funds.length}
                </Text>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card hoverable>
            <Statistic
              title="今日下跌"
              value={fallCount}
              prefix={<FallOutlined />}
              valueStyle={{ color: '#cf1322' }}
              suffix={
                <Text type="secondary" style={{ fontSize: 14 }}>
                  / {funds.length}
                </Text>
              }
            />
          </Card>
        </Col>
      </Row>

      {/* 搜索和操作栏 */}
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
        <AutoComplete
          style={{ width: 400 }}
          options={searchOptions}
          onSearch={handleSearch}
          onSelect={handleSelect}
          placeholder="输入基金名称或代码搜索..."
        >
          <Input
            prefix={<SearchOutlined />}
            suffix={searching ? <Spin size="small" /> : null}
          />
        </AutoComplete>
        <Space>
          <Text type="secondary" style={{ fontSize: 12 }}>
            上次更新: {lastUpdate || '未更新'}
          </Text>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={loading}
          >
            刷新
          </Button>
        </Space>
      </Space>

      {/* 基金列表 */}
      <List
        loading={loading}
        dataSource={filteredFunds}
        locale={{ emptyText: <Empty description="暂无基金数据，点击刷新获取" /> }}
        renderItem={(fund) => {
          const isRise = fund.dayGrowth > 0;
          const isFlat = fund.dayGrowth === 0;
          return (
            <List.Item
              key={fund.id}
              style={{
                padding: '16px',
                marginBottom: 8,
                border: '1px solid #f0f0f0',
                borderRadius: 8,
                background: '#fff',
                cursor: 'pointer',
                transition: 'all 0.3s',
              }}
              onClick={() => navigate(`/fund/${fund.code}`)}
              actions={[
                <Button
                  type="link"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/fund/${fund.code}`);
                  }}
                >
                  查看详情
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <Text strong style={{ fontSize: 16 }}>{fund.name || fund.code}</Text>
                    <Tag color="blue">{fund.code}</Tag>
                    {fund.type && <Tag>{fund.type}</Tag>}
                  </Space>
                }
                description={
                  <Row gutter={24}>
                    <Col>
                      <Space>
                        <Text type="secondary">最新净值:</Text>
                        <Text
                          strong
                          style={{
                            color: isFlat ? '#666' : isRise ? '#3f8600' : '#cf1322',
                            fontSize: 16,
                          }}
                        >
                          {fund.net_value?.toFixed(4) || '--'}
                        </Text>
                        {!isFlat && (
                          <Text
                            style={{
                              color: isRise ? '#3f8600' : '#cf1322',
                              fontSize: 13,
                            }}
                          >
                            {isRise ? '+' : ''}{fund.dayGrowth?.toFixed(2)}%
                          </Text>
                        )}
                      </Space>
                    </Col>
                    {fund.company && (
                      <Col>
                        <Text type="secondary">{fund.company}</Text>
                      </Col>
                    )}
                    {fund.manager && (
                      <Col>
                        <Text type="secondary">基金经理: {fund.manager}</Text>
                      </Col>
                    )}
                    {fund.update_time && (
                      <Col>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          更新: {fund.update_time}
                        </Text>
                      </Col>
                    )}
                  </Row>
                }
              />
            </List.Item>
          );
        }}
      />
    </div>
  );
};

export default FundList;