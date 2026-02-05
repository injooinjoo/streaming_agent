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
import { API_URL, mockFetch } from '../../config/api';
import { formatCompactKo } from '../../utils/formatters';

// 넥슨 IP 인텔리전스 목업 데이터
const MOCK_IP_INTELLIGENCE = [
  {
    id: 'maplestory',
    name: '메이플스토리',
    mentionCount: 125000,
    sentiment: 78,
    trend: 12,
    trendType: 'up',
    insight: '신규 업데이트 이후 복귀 유저 증가세, 보스 레이드 컨텐츠 호평'
  },
  {
    id: 'fc-online',
    name: 'FC 온라인',
    mentionCount: 98000,
    sentiment: 65,
    trend: -3,
    trendType: 'down',
    insight: '시즌 말기 피로감 언급 증가, 신규 이벤트 기대감 존재'
  },
  {
    id: 'kartrider',
    name: '카트라이더: 드리프트',
    mentionCount: 67000,
    sentiment: 82,
    trend: 8,
    trendType: 'up',
    insight: '신규 캐릭터 업데이트 호응, 경쟁전 시스템 개선 요청'
  },
  {
    id: 'dnf',
    name: '던전앤파이터',
    mentionCount: 89000,
    sentiment: 71,
    trend: 0,
    trendType: 'stable',
    insight: '꾸준한 팬층 유지, 레이드 컨텐츠 난이도 조정 요청'
  }
];

// 시청자 관심 키워드 목업 데이터
const MOCK_INTEREST_KEYWORDS = [
  { keyword: '보스레이드', value: 85 },
  { keyword: 'PvP', value: 72 },
  { keyword: '캐릭터육성', value: 90 },
  { keyword: '이벤트', value: 68 },
  { keyword: '신규컨텐츠', value: 78 },
  { keyword: '커스터마이징', value: 55 },
  { keyword: '길드활동', value: 62 },
  { keyword: '랭킹경쟁', value: 75 }
];

// 넥슨 스트리머 목업 데이터
const MOCK_NEXON_STREAMERS = [
  {
    id: 1,
    name: '메이플의전설',
    channelId: 'maple_legend_kr',
    platform: 'chzzk',
    avgViewers: 8500,
    chatVelocity: 180,
    donationConversion: 4.2,
    nexonAffinity: 95,
    sentiment: 82,
    trend: 'up',
    mainNexonIP: '메이플스토리'
  },
  {
    id: 2,
    name: 'FC마스터',
    channelId: 'fc_master_2024',
    platform: 'chzzk',
    avgViewers: 12000,
    chatVelocity: 220,
    donationConversion: 3.8,
    nexonAffinity: 88,
    sentiment: 75,
    trend: 'stable',
    mainNexonIP: 'FC 온라인'
  },
  {
    id: 3,
    name: '카트신',
    channelId: 'kart_god_kr',
    platform: 'twitch',
    avgViewers: 5200,
    chatVelocity: 95,
    donationConversion: 5.1,
    nexonAffinity: 92,
    sentiment: 88,
    trend: 'up',
    mainNexonIP: '카트라이더'
  },
  {
    id: 4,
    name: '던파장인',
    channelId: 'dnf_master_kr',
    platform: 'chzzk',
    avgViewers: 6800,
    chatVelocity: 145,
    donationConversion: 4.5,
    nexonAffinity: 90,
    sentiment: 79,
    trend: 'stable',
    mainNexonIP: '던전앤파이터'
  },
  {
    id: 5,
    name: '바람의나라BJ',
    channelId: 'baram_bj',
    platform: 'afreeca',
    avgViewers: 3200,
    chatVelocity: 78,
    donationConversion: 6.2,
    nexonAffinity: 85,
    sentiment: 72,
    trend: 'down',
    mainNexonIP: '바람의나라'
  }
];

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
        mockFetch(`${API_URL}/api/broadcasters?limit=20&nexonOnly=true`, { headers })
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
          nexonAffinity: b.nexon_affinity || 0,
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

      // IP 인텔리전스 & 키워드 데이터 (목업 사용)
      setIpIntelligence(MOCK_IP_INTELLIGENCE);
      setInterestKeywords(MOCK_INTEREST_KEYWORDS);

    } catch (err) {
      console.error('Failed to fetch discovery data:', err);
      setError('불러오기 실패');
      // API 실패 시 목업 데이터 사용
      setStreamersData(MOCK_NEXON_STREAMERS);
      setIpIntelligence(MOCK_IP_INTELLIGENCE);
      setInterestKeywords(MOCK_INTEREST_KEYWORDS);
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
                <span className="value">{formatCompactKo(ip.mentionCount)}</span>
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
                      <div>넥슨 게임을 방송한 스트리머가 없습니다</div>
                      <div style={{ fontSize: '12px', marginTop: '4px' }}>넥슨 게임 카테고리로 방송한 이력이 수집되면 자동으로 표시됩니다</div>
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
                    <td>{formatCompactKo(streamer.avgViewers)}</td>
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
