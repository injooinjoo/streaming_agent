import React, { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw, Search, Users, MessageSquare, Target, TrendingUp,
  ChevronRight, Zap, Activity, AlertTriangle
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../shared/LoadingSpinner';
import { API_URL } from '../../config/api';

const AdminNexonDiscovery = ({ onStreamerSelect }) => {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [streamersData, setStreamersData] = useState([]);
  const [ipIntelligence, setIpIntelligence] = useState([]);
  const [interestKeywords, setInterestKeywords] = useState([]);
  const [error, setError] = useState(null);

  const { accessToken } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    const headers = {
      'Content-Type': 'application/json',
      ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
    };

    try {
      // Fetch broadcasters (actual streamers who have broadcast)
      const [broadcastersRes] = await Promise.all([
        fetch(`${API_URL}/api/broadcasters?limit=20`, { headers })
      ]);

      if (broadcastersRes.ok) {
        const broadcastersResult = await broadcastersRes.json();
        // Transform to expected format
        const transformed = (broadcastersResult.broadcasters || []).map((b, i) => ({
          id: b.id || i + 1,
          name: b.broadcaster_name || b.channel_id || '익명 스트리머',
          channelId: b.channel_id,
          platform: b.platform || 'chzzk',
          avgViewers: b.unique_viewers || 0,
          chatVelocity: b.chat_velocity || 0,
          donationConversion: b.donation_conversion || 0,
          nexonAffinity: 0, // To be implemented with game category analysis
          sentiment: 0,
          trend: 'stable',
          mainNexonIP: '-',
          totalDonations: b.total_donations || 0,
          totalEvents: b.total_events || 0,
          chatCount: b.chat_count || 0,
          donationCount: b.donation_count || 0,
          uniqueViewers: b.unique_viewers || 0
        }));
        setStreamersData(transformed);
      } else {
        setStreamersData([]);
      }

      // These would come from separate API endpoints when implemented
      setIpIntelligence([]);
      setInterestKeywords([]);

    } catch (err) {
      console.error('Failed to fetch discovery data:', err);
      setError('불러오기 실패');
      setStreamersData([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredStreamers = useMemo(() => {
    if (!searchQuery) return streamersData;
    return streamersData.filter(s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, streamersData]);

  const formatNumber = (num) => {
    if (num >= 10000) return `${(num / 10000).toFixed(1)}만`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}천`;
    return num.toLocaleString();
  };

  const getAffinityClass = (score) => {
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  };

  const getSentimentClass = (score) => {
    if (score >= 75) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  };

  const handleStreamerClick = (streamerId) => {
    if (onStreamerSelect) {
      onStreamerSelect(streamerId);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="admin-nexon-discovery">
      {/* Header */}
      <div className="admin-toolbar">
        <div className="toolbar-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="넥슨 IP 또는 스트리머 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <button className="admin-refresh-btn" disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {/* Nexon IP Intelligence Cards */}
      <div className="nexon-ip-grid">
        {ipIntelligence.length > 0 ? ipIntelligence.map((ip) => (
          <div key={ip.id} className={`nexon-ip-card ${ip.id}`}>
            <div className="nexon-ip-header">
              <span className="nexon-ip-name">{ip.name}</span>
              <span className={`nexon-ip-trend ${ip.trendType}`}>
                {ip.trend > 0 ? '▲' : ip.trend < 0 ? '▼' : '─'} {Math.abs(ip.trend)}%
              </span>
            </div>
            <div className="nexon-ip-stats">
              <div className="nexon-ip-stat">
                <span className="label">총 언급량</span>
                <span className="value">{formatNumber(ip.mentionCount)}</span>
              </div>
              <div className="nexon-ip-stat">
                <span className="label">감성 지수</span>
                <span className="value">{ip.sentiment}%</span>
                <div className="sentiment-gauge">
                  <div
                    className={`sentiment-fill ${getSentimentClass(ip.sentiment)}`}
                    style={{ width: `${ip.sentiment}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="nexon-ip-insight">
              "{ip.insight}"
            </div>
          </div>
        )) : (
          <div className="empty-state-card" style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            <AlertTriangle size={32} style={{ opacity: 0.5, marginBottom: '12px' }} />
            <p style={{ margin: 0 }}>IP 인텔리전스 데이터가 없습니다</p>
            <p style={{ margin: '8px 0 0', fontSize: '12px' }}>채팅 데이터 수집 후 자동 생성됩니다</p>
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="admin-charts-grid">
        {/* Streamer Ranking Table */}
        <div className="admin-chart-card large">
          <div className="chart-header">
            <h3>
              <Users size={20} style={{ marginRight: 8 }} />
              상호작용 밀도 기반 스트리머 랭킹
            </h3>
          </div>
          <div className="admin-table-container">
            <table className="admin-table discovery-table">
              <thead>
                <tr>
                  <th>스트리머 (방송자)</th>
                  <th>플랫폼</th>
                  <th>고유 시청자</th>
                  <th>채팅 밀도</th>
                  <th>후원 전환율</th>
                  <th>넥슨 친화도</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredStreamers.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                      <AlertTriangle size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
                      <div>방송 기록이 있는 스트리머가 없습니다</div>
                      <div style={{ fontSize: '12px', marginTop: '4px' }}>채팅/후원 이벤트가 수집되면 자동으로 표시됩니다</div>
                    </td>
                  </tr>
                ) : filteredStreamers.map((streamer) => (
                  <tr
                    key={streamer.id}
                    className="clickable"
                    onClick={() => handleStreamerClick(streamer.channelId || streamer.id)}
                  >
                    <td>
                      <div className="streamer-info">
                        <div className="streamer-avatar">
                          {streamer.name.charAt(0)}
                        </div>
                        <div className="streamer-details">
                          <span className="streamer-name">{streamer.name}</span>
                          <span className="streamer-ip" title={streamer.channelId}>
                            {streamer.channelId ? `채널: ${streamer.channelId.slice(0, 12)}...` : streamer.mainNexonIP}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="platform-badge">{streamer.platform.toUpperCase()}</span>
                    </td>
                    <td>{formatNumber(streamer.avgViewers)}</td>
                    <td>
                      <div className="chat-velocity-cell">
                        <span className="chat-velocity-value">{streamer.chatVelocity} msg/m</span>
                        <div className="chat-velocity-bar">
                          <div
                            className="chat-velocity-fill"
                            style={{ width: `${Math.min((streamer.chatVelocity / 250) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{streamer.donationConversion}%</span>
                    </td>
                    <td>
                      <span className={`affinity-badge ${getAffinityClass(streamer.nexonAffinity)}`}>
                        <Target size={14} />
                        {streamer.nexonAffinity}%
                      </span>
                    </td>
                    <td>
                      <button className="view-detail-btn">
                        <ChevronRight size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Interest Radar Chart */}
        <div className="interest-radar-container">
          <div className="interest-radar-header">
            <Activity size={20} />
            <h3>시청자 코어 관심 키워드</h3>
          </div>
          <div style={{ height: 280 }}>
            {interestKeywords.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={interestKeywords}>
                  <PolarGrid stroke="#475569" />
                  <PolarAngleAxis
                    dataKey="keyword"
                    tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={{ fill: '#64748b', fontSize: 10 }}
                  />
                  <Radar
                    name="관심도"
                    dataKey="value"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.4}
                    strokeWidth={3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94a3b8' }}>
                <Activity size={32} style={{ opacity: 0.5, marginBottom: '12px' }} />
                <p style={{ margin: 0 }}>키워드 데이터 없음</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default AdminNexonDiscovery;
