import React, { useState, useEffect } from 'react';
import { RefreshCw, MessageSquare, DollarSign, Users, Activity, Wifi, WifiOff, TrendingUp, Eye, Gamepad2, Monitor, Filter } from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import LoadingSpinner from '../shared/LoadingSpinner';
import { API_URL } from '../../config/api';

const PLATFORM_COLORS = {
  soop: '#0066ff',
  chzzk: '#00dc64',
  youtube: '#ff0000',
  twitch: '#9146ff'
};

const PLATFORM_NAMES = {
  soop: 'SOOP',
  chzzk: 'Chzzk',
  youtube: 'YouTube',
  twitch: 'Twitch'
};

const AdminPlatforms = () => {
  const [loading, setLoading] = useState(true);
  const [platforms, setPlatforms] = useState([]);
  const [connections, setConnections] = useState({ soop: {}, chzzk: {} });
  const [eventsByPlatform, setEventsByPlatform] = useState([]);
  const [donations, setDonations] = useState([]);
  const [peakStreamers, setPeakStreamers] = useState([]);
  const [cumulativeStreamers, setCumulativeStreamers] = useState([]);
  const [nexonFilter, setNexonFilter] = useState(false);
  const [monitorStats, setMonitorStats] = useState(null);
  const [nexonDetail, setNexonDetail] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      const [eventsRes, donationsRes, connectionsRes, peakRes, cumulativeRes, monitorRes, nexonRes] = await Promise.all([
        fetch(`${API_URL}/api/stats/events/by-platform`, { headers }),
        fetch(`${API_URL}/api/stats/donations`, { headers }),
        fetch(`${API_URL}/api/connections/status`),
        fetch(`${API_URL}/api/stats/top-streamers-by-viewers?sortBy=peak&limit=10`),
        fetch(`${API_URL}/api/stats/top-streamers-by-viewers?sortBy=cumulative&limit=10`),
        fetch(`${API_URL}/api/monitor/stats`),
        fetch(`${API_URL}/api/monitor/stats/nexon`)
      ]);

      const events = eventsRes.ok ? await eventsRes.json() : [];
      const donationsData = donationsRes.ok ? await donationsRes.json() : [];
      const connectionsData = connectionsRes.ok ? await connectionsRes.json() : {};
      const peakData = peakRes.ok ? await peakRes.json() : [];
      const cumulativeData = cumulativeRes.ok ? await cumulativeRes.json() : [];
      const monitorData = monitorRes.ok ? await monitorRes.json() : null;
      const nexonData = nexonRes.ok ? await nexonRes.json() : null;

      const eventsArr = Array.isArray(events) ? events : [];
      const donationsArr = Array.isArray(donationsData) ? donationsData : [];

      setEventsByPlatform(eventsArr);
      setDonations(donationsArr);
      setConnections(connectionsData);
      setPeakStreamers(peakData);
      setCumulativeStreamers(cumulativeData);
      setMonitorStats(monitorData);
      setNexonDetail(nexonData);

      // 플랫폼 데이터 생성
      const platformData = ['soop', 'chzzk'].map(id => {
        const eventData = eventsArr.find(e => e.platform === id);
        const donationData = donationsArr.find(d => d.platform === id);
        const connected = connectionsData[id]?.connected || false;

        return {
          id,
          name: PLATFORM_NAMES[id],
          connected,
          totalEvents: eventData?.count || 0,
          donations: donationData?.total || 0,
          donationCount: donationData?.count || 0,
          avgDonation: donationData?.average || 0,
          liveBroadcasts: monitorData?.platforms?.[id]?.broadcasts || 0,
          liveViewers: monitorData?.platforms?.[id]?.viewers || 0,
          nexonBroadcasts: monitorData?.nexon?.[id]?.broadcasts || 0,
          nexonViewers: monitorData?.nexon?.[id]?.viewers || 0,
        };
      });

      setPlatforms(platformData);
    } catch (error) {
      console.error('Failed to fetch platform data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toLocaleString() || '0';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // 넥슨 게임 데이터를 통합 테이블용으로 변환
  const getNexonGameTable = () => {
    if (!nexonDetail?.platforms) return [];
    const soopGames = nexonDetail.platforms.soop?.games || [];
    const chzzkGames = nexonDetail.platforms.chzzk?.games || [];

    // 모든 게임명 수집 (category_name 기준)
    const gameMap = new Map();
    soopGames.forEach(g => {
      const name = g.category_name || g.category_id;
      gameMap.set(name, {
        name,
        soopBroadcasts: g.broadcast_count || 0,
        soopViewers: g.total_viewers || 0,
        chzzkBroadcasts: 0,
        chzzkViewers: 0,
      });
    });
    chzzkGames.forEach(g => {
      const name = g.category_name || g.category_id;
      if (gameMap.has(name)) {
        const existing = gameMap.get(name);
        existing.chzzkBroadcasts = g.broadcast_count || 0;
        existing.chzzkViewers = g.total_viewers || 0;
      } else {
        gameMap.set(name, {
          name,
          soopBroadcasts: 0,
          soopViewers: 0,
          chzzkBroadcasts: g.broadcast_count || 0,
          chzzkViewers: g.total_viewers || 0,
        });
      }
    });

    return Array.from(gameMap.values())
      .sort((a, b) => (b.soopViewers + b.chzzkViewers) - (a.soopViewers + a.chzzkViewers));
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  // 차트 데이터 생성
  const radarData = [
    {
      metric: '이벤트',
      soop: platforms.find(p => p.id === 'soop')?.totalEvents || 0,
      chzzk: platforms.find(p => p.id === 'chzzk')?.totalEvents || 0
    },
    {
      metric: '후원금',
      soop: platforms.find(p => p.id === 'soop')?.donations || 0,
      chzzk: platforms.find(p => p.id === 'chzzk')?.donations || 0
    },
    {
      metric: '후원건수',
      soop: platforms.find(p => p.id === 'soop')?.donationCount || 0,
      chzzk: platforms.find(p => p.id === 'chzzk')?.donationCount || 0
    },
    {
      metric: '시청자',
      soop: platforms.find(p => p.id === 'soop')?.liveViewers || 0,
      chzzk: platforms.find(p => p.id === 'chzzk')?.liveViewers || 0
    },
    {
      metric: '방송',
      soop: platforms.find(p => p.id === 'soop')?.liveBroadcasts || 0,
      chzzk: platforms.find(p => p.id === 'chzzk')?.liveBroadcasts || 0
    }
  ];

  // 바 차트용 데이터
  const barChartData = [
    {
      type: '후원',
      soop: platforms.find(p => p.id === 'soop')?.donationCount || 0,
      chzzk: platforms.find(p => p.id === 'chzzk')?.donationCount || 0
    },
    {
      type: '이벤트',
      soop: platforms.find(p => p.id === 'soop')?.totalEvents || 0,
      chzzk: platforms.find(p => p.id === 'chzzk')?.totalEvents || 0
    },
    {
      type: '실시간 시청자',
      soop: platforms.find(p => p.id === 'soop')?.liveViewers || 0,
      chzzk: platforms.find(p => p.id === 'chzzk')?.liveViewers || 0
    },
    {
      type: '넥슨 시청자',
      soop: platforms.find(p => p.id === 'soop')?.nexonViewers || 0,
      chzzk: platforms.find(p => p.id === 'chzzk')?.nexonViewers || 0
    }
  ];

  const nexonGames = getNexonGameTable();

  return (
    <div className="admin-platforms">
      {/* Filter Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        padding: '12px 16px',
        background: 'var(--color-surface, #1e293b)',
        borderRadius: '10px',
        border: '1px solid var(--color-border, #334155)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
          <Filter size={16} />
          <span style={{ fontSize: '14px' }}>필터</span>
        </div>
        <button
          onClick={() => setNexonFilter(!nexonFilter)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: nexonFilter ? '#10b981' : 'var(--color-surface-hover, #334155)',
            border: nexonFilter ? '1px solid #10b981' : '1px solid var(--color-border, #475569)',
            borderRadius: '8px',
            color: nexonFilter ? '#fff' : '#94a3b8',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            transition: 'all 0.2s'
          }}
        >
          <Gamepad2 size={16} />
          넥슨게임만 보기
        </button>
      </div>

      {/* Platform Cards */}
      <div className="platform-cards-grid">
        {platforms.map((platform) => (
          <div
            key={platform.id}
            className="platform-card"
            style={{ borderColor: PLATFORM_COLORS[platform.id] }}
          >
            <div className="platform-card-header">
              <img
                src={`/assets/logos/${platform.id}.png`}
                alt={PLATFORM_NAMES[platform.id]}
                className="platform-logo"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <h3>{PLATFORM_NAMES[platform.id]}</h3>
              {platform.connected ? (
                <Wifi size={16} style={{ color: '#10b981' }} />
              ) : (
                <WifiOff size={16} style={{ color: '#ef4444' }} />
              )}
            </div>
            <div className="platform-card-stats">
              {nexonFilter ? (
                <>
                  <div className="platform-stat">
                    <Gamepad2 size={16} />
                    <span className="stat-label">넥슨 방송</span>
                    <span className="stat-value">{formatNumber(platform.nexonBroadcasts)}</span>
                  </div>
                  <div className="platform-stat">
                    <Eye size={16} />
                    <span className="stat-label">넥슨 시청자</span>
                    <span className="stat-value">{formatNumber(platform.nexonViewers)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="platform-stat">
                    <Monitor size={16} />
                    <span className="stat-label">라이브 방송</span>
                    <span className="stat-value">{formatNumber(platform.liveBroadcasts)}</span>
                  </div>
                  <div className="platform-stat">
                    <Eye size={16} />
                    <span className="stat-label">실시간 시청자</span>
                    <span className="stat-value">{formatNumber(platform.liveViewers)}</span>
                  </div>
                  <div className="platform-stat">
                    <Activity size={16} />
                    <span className="stat-label">이벤트</span>
                    <span className="stat-value">{formatNumber(platform.totalEvents)}</span>
                  </div>
                  <div className="platform-stat">
                    <MessageSquare size={16} />
                    <span className="stat-label">후원 건수</span>
                    <span className="stat-value">{formatNumber(platform.donationCount)}</span>
                  </div>
                  <div className="platform-stat">
                    <DollarSign size={16} />
                    <span className="stat-label">총 후원금</span>
                    <span className="stat-value">{formatCurrency(platform.donations)}</span>
                  </div>
                  <div className="platform-stat">
                    <Users size={16} />
                    <span className="stat-label">평균 후원</span>
                    <span className="stat-value">{formatCurrency(Math.round(platform.avgDonation))}</span>
                  </div>
                </>
              )}
            </div>
            <div className="platform-card-growth">
              <span className={`growth-badge ${platform.connected ? 'positive' : 'negative'}`}>
                {platform.connected ? '연결됨' : '미연결'}
              </span>
              <span className="growth-label">현재 상태</span>
            </div>
          </div>
        ))}
      </div>

      {/* Nexon Game Detail Table (visible when filter ON) */}
      {nexonFilter && nexonGames.length > 0 && (
        <div className="admin-table-card" style={{ marginTop: '24px' }}>
          <div className="table-header">
            <h3>
              <Gamepad2 size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
              넥슨 게임별 상세
            </h3>
            {nexonDetail?.total && (
              <span style={{ color: '#94a3b8', fontSize: '13px' }}>
                총 {formatNumber(nexonDetail.total.broadcasts)}개 방송 / {formatNumber(nexonDetail.total.viewers)}명 시청
              </span>
            )}
          </div>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>게임</th>
                  <th style={{ color: PLATFORM_COLORS.soop }}>SOOP 방송</th>
                  <th style={{ color: PLATFORM_COLORS.soop }}>SOOP 시청자</th>
                  <th style={{ color: PLATFORM_COLORS.chzzk }}>Chzzk 방송</th>
                  <th style={{ color: PLATFORM_COLORS.chzzk }}>Chzzk 시청자</th>
                  <th>합계 시청자</th>
                </tr>
              </thead>
              <tbody>
                {nexonGames.map((game) => (
                  <tr key={game.name}>
                    <td style={{ fontWeight: 500 }}>{game.name}</td>
                    <td>{formatNumber(game.soopBroadcasts)}</td>
                    <td>{formatNumber(game.soopViewers)}</td>
                    <td>{formatNumber(game.chzzkBroadcasts)}</td>
                    <td>{formatNumber(game.chzzkViewers)}</td>
                    <td style={{ fontWeight: 600 }}>{formatNumber(game.soopViewers + game.chzzkViewers)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {nexonFilter && nexonGames.length === 0 && (
        <div className="admin-table-card" style={{ marginTop: '24px' }}>
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
            <Gamepad2 size={32} style={{ opacity: 0.5, marginBottom: '12px' }} />
            <p>현재 라이브 중인 넥슨 게임 방송이 없습니다</p>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="admin-charts-grid" style={{ marginTop: '24px' }}>
        {/* Radar Chart - Platform Comparison */}
        <div className="admin-chart-card">
          <div className="chart-header">
            <h3>플랫폼 종합 비교</h3>
          </div>
          <div className="chart-body">
            {platforms.some(p => p.totalEvents > 0 || p.donations > 0 || p.liveViewers > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="metric" stroke="#94a3b8" fontSize={12} />
                  <PolarRadiusAxis stroke="#334155" />
                  <Radar
                    name="SOOP"
                    dataKey="soop"
                    stroke={PLATFORM_COLORS.soop}
                    fill={PLATFORM_COLORS.soop}
                    fillOpacity={0.2}
                  />
                  <Radar
                    name="Chzzk"
                    dataKey="chzzk"
                    stroke={PLATFORM_COLORS.chzzk}
                    fill={PLATFORM_COLORS.chzzk}
                    fillOpacity={0.2}
                  />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data-message" style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                <Activity size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
                <p>플랫폼 연결 후 데이터가 표시됩니다</p>
              </div>
            )}
          </div>
        </div>

        {/* Bar Chart - Event Distribution */}
        <div className="admin-chart-card">
          <div className="chart-header">
            <h3>플랫폼별 데이터 분포</h3>
          </div>
          <div className="chart-body">
            {platforms.some(p => p.totalEvents > 0 || p.donationCount > 0 || p.liveViewers > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="type" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="soop" name="SOOP" fill={PLATFORM_COLORS.soop} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="chzzk" name="Chzzk" fill={PLATFORM_COLORS.chzzk} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data-message" style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                <DollarSign size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
                <p>후원 데이터가 없습니다</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Platform Comparison Table */}
      <div className="admin-table-card">
        <div className="table-header">
          <h3>상세 비교표</h3>
        </div>
        <div className="admin-table-container">
          <table className="admin-table comparison-table">
            <thead>
              <tr>
                <th>지표</th>
                {platforms.map((platform) => (
                  <th key={platform.id} style={{ color: PLATFORM_COLORS[platform.id] }}>
                    {PLATFORM_NAMES[platform.id]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>연결 상태</td>
                {platforms.map((platform) => (
                  <td key={platform.id} className={platform.connected ? 'positive' : 'negative'}>
                    {platform.connected ? '연결됨' : '미연결'}
                  </td>
                ))}
              </tr>
              <tr>
                <td>라이브 방송</td>
                {platforms.map((platform) => (
                  <td key={platform.id}>{formatNumber(platform.liveBroadcasts)}</td>
                ))}
              </tr>
              <tr>
                <td>실시간 시청자</td>
                {platforms.map((platform) => (
                  <td key={platform.id} style={{ fontWeight: 600 }}>{formatNumber(platform.liveViewers)}</td>
                ))}
              </tr>
              <tr>
                <td>총 이벤트</td>
                {platforms.map((platform) => (
                  <td key={platform.id}>{formatNumber(platform.totalEvents)}</td>
                ))}
              </tr>
              <tr>
                <td>후원 건수</td>
                {platforms.map((platform) => (
                  <td key={platform.id}>{formatNumber(platform.donationCount)}</td>
                ))}
              </tr>
              <tr>
                <td>총 후원금</td>
                {platforms.map((platform) => (
                  <td key={platform.id}>{formatCurrency(platform.donations)}</td>
                ))}
              </tr>
              <tr>
                <td>평균 후원금</td>
                {platforms.map((platform) => (
                  <td key={platform.id}>{formatCurrency(Math.round(platform.avgDonation))}</td>
                ))}
              </tr>
              <tr style={{ borderTop: '2px solid #475569' }}>
                <td style={{ color: '#10b981', fontWeight: 500 }}>넥슨 방송</td>
                {platforms.map((platform) => (
                  <td key={platform.id}>{formatNumber(platform.nexonBroadcasts)}</td>
                ))}
              </tr>
              <tr>
                <td style={{ color: '#10b981', fontWeight: 500 }}>넥슨 시청자</td>
                {platforms.map((platform) => (
                  <td key={platform.id} style={{ fontWeight: 600 }}>{formatNumber(platform.nexonViewers)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Streamer Rankings Grid */}
      <div className="admin-charts-grid" style={{ marginTop: '24px' }}>
        {/* Peak Viewers Ranking */}
        <div className="admin-table-card">
          <div className="table-header">
            <h3>
              <TrendingUp size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
              최고 시청자수 순위
            </h3>
          </div>
          <div className="admin-table-container">
            {peakStreamers.length > 0 ? (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>순위</th>
                    <th>스트리머</th>
                    <th>플랫폼</th>
                    <th>최고 시청자</th>
                    <th>방송 횟수</th>
                  </tr>
                </thead>
                <tbody>
                  {peakStreamers.map((streamer) => (
                    <tr key={`${streamer.platform}-${streamer.channel_id}`}>
                      <td>{streamer.rank}</td>
                      <td>{streamer.broadcaster_name}</td>
                      <td>
                        <span
                          className="platform-badge"
                          style={{
                            background: PLATFORM_COLORS[streamer.platform] + '20',
                            color: PLATFORM_COLORS[streamer.platform],
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                        >
                          {PLATFORM_NAMES[streamer.platform] || streamer.platform}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{formatNumber(streamer.max_peak_viewers)}</td>
                      <td>{streamer.broadcast_count}회</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="no-data-message" style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                <TrendingUp size={32} style={{ opacity: 0.5, marginBottom: '12px' }} />
                <p>방송 데이터가 없습니다</p>
              </div>
            )}
          </div>
        </div>

        {/* Cumulative Viewers Ranking */}
        <div className="admin-table-card">
          <div className="table-header">
            <h3>
              <Eye size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
              누적 시청자수 순위
            </h3>
          </div>
          <div className="admin-table-container">
            {cumulativeStreamers.length > 0 ? (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>순위</th>
                    <th>스트리머</th>
                    <th>플랫폼</th>
                    <th>누적 시청자</th>
                    <th>방송 횟수</th>
                  </tr>
                </thead>
                <tbody>
                  {cumulativeStreamers.map((streamer) => (
                    <tr key={`${streamer.platform}-${streamer.channel_id}`}>
                      <td>{streamer.rank}</td>
                      <td>{streamer.broadcaster_name}</td>
                      <td>
                        <span
                          className="platform-badge"
                          style={{
                            background: PLATFORM_COLORS[streamer.platform] + '20',
                            color: PLATFORM_COLORS[streamer.platform],
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                        >
                          {PLATFORM_NAMES[streamer.platform] || streamer.platform}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{formatNumber(streamer.total_cumulative_viewers)}</td>
                      <td>{streamer.broadcast_count}회</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="no-data-message" style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                <Eye size={32} style={{ opacity: 0.5, marginBottom: '12px' }} />
                <p>방송 데이터가 없습니다</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Refresh Button */}
      <button
        onClick={fetchData}
        style={{
          marginTop: '16px',
          padding: '12px 24px',
          background: 'var(--color-primary)',
          border: 'none',
          borderRadius: '8px',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <RefreshCw size={16} />
        데이터 새로고침
      </button>
    </div>
  );
};

export default AdminPlatforms;
