import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { DollarSign, Eye, MousePointerClick, Percent, Download, RefreshCw } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import AnalyticsCard from './shared/AnalyticsCard';
import LoadingSpinner from '../shared/LoadingSpinner';
import TimeRangeSelector from './shared/TimeRangeSelector';
import ChartContainer from './shared/ChartContainer';
import './AnalyticsPage.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const AdAnalytics = () => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // 차트 다크모드 색상
  const chartColors = {
    grid: isDark ? '#475569' : '#f0f0f0',
    border: isDark ? '#475569' : '#e2e8f0',
    tooltipBg: isDark ? '#1e293b' : '#ffffff',
    textMuted: isDark ? '#94a3b8' : '#94a3b8',
    barLight: isDark ? '#64748b' : '#e2e8f0',
  };

  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);
  const [revenueTimeline, setRevenueTimeline] = useState([]);
  const [slotPerformance, setSlotPerformance] = useState([]);
  const [summary, setSummary] = useState({
    totalImpressions: 0,
    totalClicks: 0,
    totalRevenue: 0,
    ctr: 0,
    avgRevenuePerClick: 0,
    pendingSettlement: 0
  });

  const periodDays = { day: 1, week: 7, month: 30, year: 365 };

  useEffect(() => {
    fetchData();
  }, [period]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  const fetchData = async () => {
    setLoading(true);
    const days = periodDays[period] || 7;

    try {
      const [trendRes, slotsRes, revenueRes] = await Promise.all([
        fetch(`${API_BASE}/api/ads/trend?days=${days}`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/ads/slots`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/ads/revenue`, { headers: getAuthHeaders() })
      ]);

      // Handle unauthorized
      if (trendRes.status === 401 || slotsRes.status === 401 || revenueRes.status === 401) {
        console.log('Ad analytics requires authentication');
        setLoading(false);
        return;
      }

      const [trend, slots, revenue] = await Promise.all([
        trendRes.ok ? trendRes.json() : [],
        slotsRes.ok ? slotsRes.json() : { slots: [] },
        revenueRes.ok ? revenueRes.json() : {}
      ]);

      // Transform trend data for charts
      setRevenueTimeline(Array.isArray(trend) ? trend.map(d => ({
        date: d.date?.split('-').slice(1).join('/') || d.date,
        impressions: d.impressions || 0,
        clicks: d.clicks || 0,
        revenue: Math.round(d.revenue || 0)
      })) : []);

      // Transform slot data
      const slotsData = slots.slots || slots || [];
      setSlotPerformance(slotsData.map(s => ({
        slot: s.name,
        impressions: s.impressions || 0,
        clicks: s.clicks || 0,
        ctr: s.impressions > 0 ? ((s.clicks / s.impressions) * 100).toFixed(2) : 0,
        cpm: s.impressions > 0 ? Math.round((s.revenue / s.impressions) * 1000) : 0,
        revenue: Math.round(s.revenue || 0),
        status: s.enabled ? 'active' : 'paused'
      })));

      setSummary({
        totalImpressions: revenue.totalImpressions || 0,
        totalClicks: revenue.totalClicks || 0,
        totalRevenue: revenue.totalRevenue || 0,
        ctr: revenue.ctr || 0,
        avgRevenuePerClick: revenue.avgRevenuePerClick || 0,
        pendingSettlement: revenue.pendingSettlement || 0
      });

    } catch (err) {
      console.error('Failed to fetch ad data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate performance by type from slots
  const performanceByType = slotPerformance.reduce((acc, slot) => {
    const type = slot.slot?.includes('배너') ? '배너' :
                 slot.slot?.includes('프리롤') ? '프리롤' :
                 slot.slot?.includes('오버레이') ? '오버레이' : '기타';
    const existing = acc.find(a => a.type === type);
    if (existing) {
      existing.impressions += slot.impressions;
      existing.clicks += slot.clicks;
      existing.revenue += slot.revenue;
    } else {
      acc.push({
        type,
        impressions: slot.impressions,
        clicks: slot.clicks,
        revenue: slot.revenue,
        fill: type === '배너' ? '#3b82f6' : type === '프리롤' ? '#10b981' : type === '오버레이' ? '#f59e0b' : '#8b5cf6'
      });
    }
    return acc;
  }, []);

  const totalImpressions = summary.totalImpressions;
  const totalClicks = summary.totalClicks;
  const totalRevenue = summary.totalRevenue;
  const avgCTR = summary.ctr;
  const avgCPM = totalImpressions > 0 ? Math.round((totalRevenue / totalImpressions) * 1000) : 0;
  const avgCPC = totalClicks > 0 ? Math.round(totalRevenue / totalClicks) : 0;

  const formatCurrency = (value) => `₩${(value || 0).toLocaleString()}`;

  if (loading) {
    return (
      <div className="analytics-page">
        <LoadingSpinner fullHeight />
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <header className="page-header">
        <div className="page-title">
          <h1>광고 분석</h1>
          <p>광고 노출, 클릭률, 수익을 분석합니다.</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '12px' }}>
          <TimeRangeSelector value={period} onChange={setPeriod} />
          <button className="btn-outline" onClick={fetchData}>
            <RefreshCw size={16} /> 새로고침
          </button>
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
          change=""
          trend="neutral"
          icon={<DollarSign size={18} />}
          subtitle={`${periodDays[period]}일 기준`}
        />
        <AnalyticsCard
          title="총 노출수"
          value={totalImpressions.toLocaleString()}
          change=""
          trend="neutral"
          icon={<Eye size={18} />}
          subtitle="Impressions"
        />
        <AnalyticsCard
          title="CTR (클릭률)"
          value={`${avgCTR}%`}
          change=""
          trend="neutral"
          icon={<MousePointerClick size={18} />}
          subtitle="Click Through Rate"
        />
        <AnalyticsCard
          title="CPM"
          value={formatCurrency(avgCPM)}
          change=""
          trend="neutral"
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
          {revenueTimeline.length > 0 ? (
            <ComposedChart data={revenueTimeline}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="date" stroke={chartColors.textMuted} fontSize={12} />
              <YAxis yAxisId="left" stroke={chartColors.textMuted} fontSize={12} />
              <YAxis yAxisId="right" orientation="right" stroke={chartColors.textMuted} fontSize={12} tickFormatter={(v) => `₩${(v/1000)}K`} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: `1px solid ${chartColors.border}`, background: chartColors.tooltipBg }} />
              <Legend />
              <Bar yAxisId="left" dataKey="impressions" name="노출수" fill={chartColors.barLight} radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="revenue" name="수익" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              <Line yAxisId="left" type="monotone" dataKey="clicks" name="클릭수" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
            </ComposedChart>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#94a3b8' }}>
              광고 트렌드 데이터가 없습니다
            </div>
          )}
        </ChartContainer>

        <ChartContainer
          title="광고 타입별 수익"
          subtitle="타입별 비교"
        >
          {performanceByType.length > 0 ? (
            <BarChart data={performanceByType}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="type" stroke={chartColors.textMuted} fontSize={12} />
              <YAxis stroke={chartColors.textMuted} fontSize={12} tickFormatter={(v) => `₩${(v/1000)}K`} />
              <Tooltip
                formatter={(value, name) => {
                  if (name === '수익') return formatCurrency(value);
                  return value.toLocaleString();
                }}
                contentStyle={{ borderRadius: '8px', border: `1px solid ${chartColors.border}`, background: chartColors.tooltipBg }}
              />
              <Bar dataKey="revenue" name="수익" radius={[4, 4, 0, 0]}>
                {performanceByType.map((entry, index) => (
                  <rect key={`rect-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#94a3b8' }}>
              광고 타입별 데이터가 없습니다
            </div>
          )}
        </ChartContainer>

        <ChartContainer
          title="타입별 클릭 성과"
          subtitle="노출 대비 클릭"
        >
          {performanceByType.length > 0 ? (
            <BarChart data={performanceByType}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="type" stroke={chartColors.textMuted} fontSize={12} />
              <YAxis stroke={chartColors.textMuted} fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: `1px solid ${chartColors.border}`, background: chartColors.tooltipBg }} />
              <Legend />
              <Bar dataKey="impressions" name="노출" fill={chartColors.barLight} radius={[4, 4, 0, 0]} />
              <Bar dataKey="clicks" name="클릭" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#94a3b8' }}>
              클릭 성과 데이터가 없습니다
            </div>
          )}
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
            {slotPerformance.length > 0 ? slotPerformance.map((row) => (
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
                <td><span className="sensitive-blur">{row.impressions.toLocaleString()}</span></td>
                <td><span className="sensitive-blur">{row.clicks.toLocaleString()}</span></td>
                <td style={{ color: parseFloat(row.ctr) >= 3 ? '#10b981' : 'inherit', fontWeight: parseFloat(row.ctr) >= 3 ? 600 : 400 }}>
                  <span className="sensitive-blur">{row.ctr}%</span>
                </td>
                <td><span className="sensitive-blur">{formatCurrency(row.cpm)}</span></td>
                <td style={{ fontWeight: 600, color: 'var(--primary)' }}><span className="sensitive-blur">{formatCurrency(row.revenue)}</span></td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8' }}>
                  등록된 광고 슬롯이 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Card */}
      <div className="chart-container" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
              {periodDays[period]}일간 광고 성과 요약
            </h3>
            <p style={{ opacity: 0.9, fontSize: '14px' }}>
              {totalImpressions > 0 ? (
                <>
                  총 <span className="sensitive-blur">{totalImpressions.toLocaleString()}</span>회 노출, <span className="sensitive-blur">{totalClicks.toLocaleString()}</span>회 클릭으로
                  <strong className="sensitive-blur"> {formatCurrency(totalRevenue)}</strong>의 수익을 달성했습니다.
                </>
              ) : (
                '아직 광고 데이터가 없습니다. 광고 슬롯을 설정하고 캠페인을 시작하세요.'
              )}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>평균 CPC</div>
            <div style={{ fontSize: '24px', fontWeight: 700 }} className="sensitive-blur">{formatCurrency(avgCPC)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdAnalytics;
