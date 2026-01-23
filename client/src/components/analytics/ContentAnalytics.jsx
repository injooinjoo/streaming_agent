import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Play, Clock, Trophy, Zap, Download, RefreshCw } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import AnalyticsCard from './shared/AnalyticsCard';
import TimeRangeSelector from './shared/TimeRangeSelector';
import ChartContainer from './shared/ChartContainer';
import './AnalyticsPage.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const ContentAnalytics = () => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // 차트 다크모드 색상
  const chartColors = {
    grid: isDark ? '#475569' : '#f0f0f0',
    border: isDark ? '#475569' : '#e2e8f0',
    tooltipBg: isDark ? '#1e293b' : '#ffffff',
    textMuted: isDark ? '#94a3b8' : '#94a3b8',
    progressBg: isDark ? '#475569' : '#e2e8f0',
  };

  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [platformStats, setPlatformStats] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [summary, setSummary] = useState({
    totalEvents: 0,
    totalDonations: 0,
    topPlatform: 'N/A',
    peakHour: 'N/A'
  });

  const periodDays = { day: 1, week: 7, month: 30, year: 365 };

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    const days = periodDays[period] || 30;

    try {
      const [platformRes, hourlyRes, revenueRes] = await Promise.all([
        fetch(`${API_BASE}/api/stats/platforms`),
        fetch(`${API_BASE}/api/stats/chat/hourly?days=${days}`),
        fetch(`${API_BASE}/api/stats/revenue/by-platform`)
      ]);

      const [platformData, hourly, revenueByPlatform] = await Promise.all([
        platformRes.ok ? platformRes.json() : { platforms: [] },
        hourlyRes.ok ? hourlyRes.json() : [],
        revenueByPlatform.ok ? revenueByPlatform.json() : []
      ]);

      // Transform platform data
      const platforms = platformData.platforms || [];
      const revenueMap = {};
      (revenueByPlatform || []).forEach(r => {
        const name = r.name?.toLowerCase() || '';
        revenueMap[name] = r.value || 0;
      });

      const transformedPlatforms = platforms.map(p => {
        const name = p.platform === 'soop' ? 'SOOP' : p.platform === 'chzzk' ? 'Chzzk' : p.platform;
        const revenue = revenueMap[p.platform?.toLowerCase()] || p.donation_amount || 0;
        const efficiency = p.total_events > 0
          ? Math.min(100, Math.round((p.donations / p.total_events) * 1000) || 50)
          : 50;
        return {
          platform: name,
          events: p.total_events || 0,
          chats: p.chats || 0,
          donations: p.donations || 0,
          revenue: revenue,
          efficiency: efficiency
        };
      });

      setPlatformStats(transformedPlatforms);

      // Transform hourly data for time slot analysis
      const timeSlots = [
        { range: '14-16시', start: 14, end: 16 },
        { range: '16-18시', start: 16, end: 18 },
        { range: '18-20시', start: 18, end: 20 },
        { range: '20-22시', start: 20, end: 22 },
        { range: '22-24시', start: 22, end: 24 },
        { range: '24-02시', start: 0, end: 2 }
      ];

      const hourlyArray = Array.isArray(hourly) ? hourly : [];
      const slotData = timeSlots.map(slot => {
        let totalChats = 0;
        let totalUsers = 0;
        for (let h = slot.start; h < slot.end; h++) {
          const hourStr = h.toString().padStart(2, '0') + ':00';
          const found = hourlyArray.find(d => d.hour === hourStr);
          if (found) {
            totalChats += found.chats || 0;
            totalUsers += found.users || 0;
          }
        }
        const efficiency = totalUsers > 0 ? Math.min(100, Math.round((totalChats / totalUsers) * 10)) : 0;
        return {
          slot: slot.range,
          chats: totalChats,
          users: totalUsers,
          efficiency: efficiency || Math.round(Math.random() * 30 + 40) // fallback for empty data
        };
      });

      setHourlyData(slotData);

      // Calculate summary
      const totalEvents = transformedPlatforms.reduce((sum, p) => sum + p.events, 0);
      const totalDonations = transformedPlatforms.reduce((sum, p) => sum + p.revenue, 0);
      const topPlatform = transformedPlatforms.length > 0
        ? transformedPlatforms.reduce((max, p) => p.events > max.events ? p : max, transformedPlatforms[0])
        : { platform: 'N/A' };

      // Find peak hour
      const peakHourData = hourlyArray.reduce((max, h) =>
        (h.chats || 0) > (max.chats || 0) ? h : max, { hour: 'N/A', chats: 0 });

      setSummary({
        totalEvents,
        totalDonations,
        topPlatform: topPlatform.platform,
        peakHour: peakHourData.hour?.replace(':00', '시') || 'N/A'
      });

    } catch (err) {
      console.error('Failed to fetch content data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => `₩${(value || 0).toLocaleString()}`;

  // Prepare radar data from platform stats
  const radarData = platformStats.map(p => ({
    platform: p.platform,
    이벤트: Math.min(100, Math.round((p.events / (summary.totalEvents || 1)) * 100)),
    채팅: Math.min(100, Math.round((p.chats / (platformStats.reduce((s, x) => s + x.chats, 0) || 1)) * 100)),
    후원: Math.min(100, Math.round((p.donations / (platformStats.reduce((s, x) => s + x.donations, 0) || 1)) * 100)),
    효율: p.efficiency
  }));

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="loading-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <RefreshCw className="animate-spin" size={32} />
          <span style={{ marginLeft: '12px' }}>데이터를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <header className="page-header">
        <div className="page-title">
          <h1>콘텐츠 분석</h1>
          <p>플랫폼별 성과와 최적 방송 시간대를 확인하세요.</p>
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
          title="총 이벤트"
          value={summary.totalEvents.toLocaleString()}
          change=""
          trend="neutral"
          icon={<Clock size={18} />}
          subtitle={`${periodDays[period]}일 기준`}
        />
        <AnalyticsCard
          title="총 후원 수익"
          value={formatCurrency(summary.totalDonations)}
          change=""
          trend="neutral"
          icon={<Play size={18} />}
          subtitle="누적 수익"
        />
        <AnalyticsCard
          title="인기 플랫폼"
          value={summary.topPlatform}
          change=""
          trend="neutral"
          icon={<Trophy size={18} />}
          subtitle="이벤트 수 기준"
        />
        <AnalyticsCard
          title="피크 시간"
          value={summary.peakHour}
          change=""
          trend="neutral"
          icon={<Zap size={18} />}
          subtitle="최다 채팅 시간"
        />
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <ChartContainer
          title="플랫폼별 성과"
          subtitle="이벤트 및 후원 수 기준"
          className="chart-full-width"
        >
          {platformStats.length > 0 ? (
            <BarChart data={platformStats} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis type="number" stroke={chartColors.textMuted} fontSize={12} />
              <YAxis dataKey="platform" type="category" stroke={chartColors.textMuted} fontSize={12} width={80} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: `1px solid ${chartColors.border}`, background: chartColors.tooltipBg }} />
              <Legend />
              <Bar dataKey="chats" name="채팅" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              <Bar dataKey="donations" name="후원" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#94a3b8' }}>
              플랫폼 데이터가 없습니다
            </div>
          )}
        </ChartContainer>

        <ChartContainer
          title="플랫폼 종합 비교"
          subtitle="레이더 차트"
        >
          {radarData.length > 0 ? (
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke={chartColors.border} />
              <PolarAngleAxis dataKey="platform" fontSize={11} />
              <PolarRadiusAxis fontSize={10} domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: `1px solid ${chartColors.border}`, background: chartColors.tooltipBg }} />
              <Radar name="이벤트" dataKey="이벤트" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
              <Radar name="채팅" dataKey="채팅" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
              <Legend />
            </RadarChart>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#94a3b8' }}>
              비교 데이터가 없습니다
            </div>
          )}
        </ChartContainer>

        <ChartContainer
          title="시간대별 활동"
          subtitle="채팅 활동 기준"
        >
          {hourlyData.length > 0 ? (
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="slot" stroke={chartColors.textMuted} fontSize={11} />
              <YAxis stroke={chartColors.textMuted} fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: `1px solid ${chartColors.border}`, background: chartColors.tooltipBg }} />
              <Bar dataKey="chats" name="채팅 수" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#94a3b8' }}>
              시간대별 데이터가 없습니다
            </div>
          )}
        </ChartContainer>
      </div>

      {/* Platform Performance Table */}
      <div className="analytics-table-container">
        <div className="analytics-table-header">
          <h3>플랫폼별 상세 분석</h3>
        </div>
        <table className="analytics-table">
          <thead>
            <tr>
              <th>플랫폼</th>
              <th>총 이벤트</th>
              <th>채팅 수</th>
              <th>후원 수</th>
              <th>수익</th>
              <th>효율 점수</th>
            </tr>
          </thead>
          <tbody>
            {platformStats.length > 0 ? platformStats.map((row) => (
              <tr key={row.platform}>
                <td style={{ fontWeight: 600 }}>{row.platform}</td>
                <td><span className="sensitive-blur">{row.events?.toLocaleString() || 0}</span></td>
                <td><span className="sensitive-blur">{row.chats?.toLocaleString() || 0}</span></td>
                <td><span className="sensitive-blur">{row.donations?.toLocaleString() || 0}</span></td>
                <td style={{ color: 'var(--primary)' }}><span className="sensitive-blur">{formatCurrency(row.revenue)}</span></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '60px',
                      height: '6px',
                      background: chartColors.progressBg,
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${row.efficiency}%`,
                        height: '100%',
                        background: row.efficiency >= 80 ? '#10b981' : row.efficiency >= 60 ? '#f59e0b' : '#ef4444',
                        borderRadius: '3px'
                      }} />
                    </div>
                    <span style={{ fontWeight: 600 }}>{row.efficiency}</span>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8' }}>
                  플랫폼 데이터가 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ContentAnalytics;
