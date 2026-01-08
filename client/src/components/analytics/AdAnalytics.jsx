import React, { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { DollarSign, Eye, MousePointerClick, Percent, Download } from 'lucide-react';
import AnalyticsCard from './shared/AnalyticsCard';
import TimeRangeSelector from './shared/TimeRangeSelector';
import ChartContainer from './shared/ChartContainer';
import TrendIndicator from './shared/TrendIndicator';
import './AnalyticsPage.css';

const AdAnalytics = () => {
  const [period, setPeriod] = useState('week');

  // Mock data
  const revenueTimeline = [
    { date: '1/1', impressions: 4500, clicks: 120, revenue: 18000 },
    { date: '1/2', impressions: 5200, clicks: 145, revenue: 22000 },
    { date: '1/3', impressions: 4800, clicks: 128, revenue: 19500 },
    { date: '1/4', impressions: 6100, clicks: 178, revenue: 28000 },
    { date: '1/5', impressions: 5500, clicks: 156, revenue: 24000 },
    { date: '1/6', impressions: 7200, clicks: 210, revenue: 35000 },
    { date: '1/7', impressions: 6800, clicks: 195, revenue: 32000 },
  ];

  const slotPerformance = [
    { slot: '메인 배너', impressions: 12540, clicks: 342, ctr: 2.73, cpm: 3589, revenue: 45000, status: 'active' },
    { slot: '사이드 배너', impressions: 8920, clicks: 198, ctr: 2.22, cpm: 2890, revenue: 25800, status: 'active' },
    { slot: '프리롤 광고', impressions: 4560, clicks: 156, ctr: 3.42, cpm: 5200, revenue: 23700, status: 'active' },
    { slot: '오버레이 팝업', impressions: 6780, clicks: 234, ctr: 3.45, cpm: 4120, revenue: 27950, status: 'active' },
    { slot: '후원 감사 배너', impressions: 3200, clicks: 86, ctr: 2.69, cpm: 3100, revenue: 9920, status: 'paused' },
  ];

  const performanceByType = [
    { type: '배너', impressions: 21460, clicks: 540, revenue: 70800, fill: '#3b82f6' },
    { type: '프리롤', impressions: 4560, clicks: 156, revenue: 23700, fill: '#10b981' },
    { type: '오버레이', impressions: 6780, clicks: 234, revenue: 27950, fill: '#f59e0b' },
    { type: '후원연동', impressions: 3200, clicks: 86, revenue: 9920, fill: '#8b5cf6' },
  ];

  const totalImpressions = 45678;
  const totalClicks = 1234;
  const totalRevenue = 156000;
  const avgCTR = ((totalClicks / totalImpressions) * 100).toFixed(2);
  const avgCPM = Math.round((totalRevenue / totalImpressions) * 1000);
  const avgCPC = Math.round(totalRevenue / totalClicks);

  const formatCurrency = (value) => `₩${value.toLocaleString()}`;

  return (
    <div className="analytics-page">
      <header className="page-header">
        <div className="page-title">
          <h1>광고 분석</h1>
          <p>광고 노출, 클릭률, 수익을 분석합니다.</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '12px' }}>
          <TimeRangeSelector value={period} onChange={setPeriod} />
          <button className="btn-outline">
            <Download size={16} /> 내보내기
          </button>
        </div>
      </header>

      {/* Key Metrics */}
      <div className="analytics-metrics-grid">
        <AnalyticsCard
          title="총 광고 수익"
          value={formatCurrency(totalRevenue)}
          change="+18%"
          trend="up"
          icon={<DollarSign size={18} />}
          subtitle="이번 주"
        />
        <AnalyticsCard
          title="총 노출수"
          value={totalImpressions.toLocaleString()}
          change="+12%"
          trend="up"
          icon={<Eye size={18} />}
          subtitle="Impressions"
        />
        <AnalyticsCard
          title="CTR (클릭률)"
          value={`${avgCTR}%`}
          change="+0.3%"
          trend="up"
          icon={<MousePointerClick size={18} />}
          subtitle="Click Through Rate"
        />
        <AnalyticsCard
          title="CPM"
          value={formatCurrency(avgCPM)}
          change="+5%"
          trend="up"
          icon={<Percent size={18} />}
          subtitle="1,000 노출당 수익"
        />
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <ChartContainer
          title="광고 수익 트렌드"
          subtitle="일별 노출/클릭/수익 추이"
          className="chart-full-width"
        >
          <ComposedChart data={revenueTimeline}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
            <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} />
            <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `₩${(v/1000)}K`} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
            <Legend />
            <Bar yAxisId="left" dataKey="impressions" name="노출수" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="revenue" name="수익" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
            <Line yAxisId="left" type="monotone" dataKey="clicks" name="클릭수" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
          </ComposedChart>
        </ChartContainer>

        <ChartContainer
          title="광고 타입별 수익"
          subtitle="타입별 비교"
        >
          <BarChart data={performanceByType}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="type" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `₩${(v/1000)}K`} />
            <Tooltip
              formatter={(value, name) => {
                if (name === '수익') return formatCurrency(value);
                return value.toLocaleString();
              }}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
            />
            <Bar dataKey="revenue" name="수익" radius={[4, 4, 0, 0]}>
              {performanceByType.map((entry, index) => (
                <rect key={`rect-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>

        <ChartContainer
          title="타입별 클릭 성과"
          subtitle="노출 대비 클릭"
        >
          <BarChart data={performanceByType}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="type" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
            <Legend />
            <Bar dataKey="impressions" name="노출" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
            <Bar dataKey="clicks" name="클릭" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </div>

      {/* Slot Performance Table */}
      <div className="analytics-table-container">
        <div className="analytics-table-header">
          <h3>슬롯별 성과</h3>
        </div>
        <table className="analytics-table">
          <thead>
            <tr>
              <th>슬롯명</th>
              <th>상태</th>
              <th>노출수</th>
              <th>클릭수</th>
              <th>CTR</th>
              <th>CPM</th>
              <th>수익</th>
            </tr>
          </thead>
          <tbody>
            {slotPerformance.map((row) => (
              <tr key={row.slot}>
                <td style={{ fontWeight: 600 }}>{row.slot}</td>
                <td>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 500,
                    background: row.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                    color: row.status === 'active' ? '#10b981' : '#64748b'
                  }}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: row.status === 'active' ? '#10b981' : '#64748b'
                    }} />
                    {row.status === 'active' ? '활성' : '일시중지'}
                  </span>
                </td>
                <td>{row.impressions.toLocaleString()}</td>
                <td>{row.clicks.toLocaleString()}</td>
                <td style={{ color: row.ctr >= 3 ? '#10b981' : 'inherit', fontWeight: row.ctr >= 3 ? 600 : 400 }}>
                  {row.ctr}%
                </td>
                <td>{formatCurrency(row.cpm)}</td>
                <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{formatCurrency(row.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Card */}
      <div className="chart-container" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>이번 주 광고 성과 요약</h3>
            <p style={{ opacity: 0.9, fontSize: '14px' }}>
              총 {totalImpressions.toLocaleString()}회 노출, {totalClicks.toLocaleString()}회 클릭으로
              <strong> {formatCurrency(totalRevenue)}</strong>의 수익을 달성했습니다.
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>평균 CPC</div>
            <div style={{ fontSize: '24px', fontWeight: 700 }}>{formatCurrency(avgCPC)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdAnalytics;
