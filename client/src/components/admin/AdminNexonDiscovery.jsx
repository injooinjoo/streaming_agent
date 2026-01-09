import React, { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw, Search, Users, MessageSquare, Target, TrendingUp,
  ChevronRight, Zap, Activity
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer
} from 'recharts';

// Nexon IP Intelligence Mock Data
const NEXON_IP_INTELLIGENCE = [
  {
    id: 'blue-archive',
    name: '블루아카이브',
    mentionCount: 12500,
    sentiment: 87,
    trend: 23,
    trendType: 'rising',
    insight: '최근 신규 캐릭터 출시로 채팅 언급량 급증. 굿즈 관련 키워드 비중 24% 상승.',
    keyStreamer: '스트리머A'
  },
  {
    id: 'fc-online',
    name: 'FC온라인',
    mentionCount: 28400,
    sentiment: 72,
    trend: 5,
    trendType: 'stable',
    insight: '강화 이벤트 시점 후원 데이터 활발. 경기 분석 채팅 밀도 높음.',
    keyStreamer: '스트리머B'
  },
  {
    id: 'maplestory',
    name: '메이플스토리',
    mentionCount: 45200,
    sentiment: 68,
    trend: -2,
    trendType: 'stable',
    insight: '코어 유저 구독 개월 수 타 게임 대비 1.8배. 장기 캠페인 적합.',
    keyStreamer: '스트리머C'
  },
  {
    id: 'the-first-descendant',
    name: '더퍼스트디센던트',
    mentionCount: 8900,
    sentiment: 91,
    trend: 156,
    trendType: 'rising',
    insight: '글로벌 채팅 로그에서 고사양 하드웨어 언급 다수. 프리미엄 타겟 적합.',
    keyStreamer: '스트리머K'
  }
];

// Streamer Discovery Mock Data
const STREAMS_DATA = [
  {
    id: 1,
    name: '감스트',
    platform: 'soop',
    avgViewers: 45000,
    chatVelocity: 142,
    donationConversion: 3.8,
    nexonAffinity: 92,
    sentiment: 85,
    trend: 'up',
    mainNexonIP: 'FC온라인'
  },
  {
    id: 2,
    name: '풍월량',
    platform: 'chzzk',
    avgViewers: 38000,
    chatVelocity: 98,
    donationConversion: 5.2,
    nexonAffinity: 88,
    sentiment: 78,
    trend: 'up',
    mainNexonIP: '메이플스토리'
  },
  {
    id: 3,
    name: '우왁굳',
    platform: 'soop',
    avgViewers: 32000,
    chatVelocity: 185,
    donationConversion: 4.1,
    nexonAffinity: 75,
    sentiment: 82,
    trend: 'stable',
    mainNexonIP: '블루아카이브'
  },
  {
    id: 4,
    name: '침착맨',
    platform: 'chzzk',
    avgViewers: 28000,
    chatVelocity: 156,
    donationConversion: 2.5,
    nexonAffinity: 68,
    sentiment: 88,
    trend: 'up',
    mainNexonIP: '더퍼스트디센던트'
  },
  {
    id: 5,
    name: '주르르',
    platform: 'chzzk',
    avgViewers: 25000,
    chatVelocity: 210,
    donationConversion: 6.8,
    nexonAffinity: 94,
    sentiment: 91,
    trend: 'up',
    mainNexonIP: '블루아카이브'
  },
  {
    id: 6,
    name: '아이리칸나',
    platform: 'soop',
    avgViewers: 22000,
    chatVelocity: 134,
    donationConversion: 4.5,
    nexonAffinity: 82,
    sentiment: 79,
    trend: 'stable',
    mainNexonIP: '메이플스토리'
  },
  {
    id: 7,
    name: '섭이',
    platform: 'chzzk',
    avgViewers: 19000,
    chatVelocity: 88,
    donationConversion: 3.2,
    nexonAffinity: 71,
    sentiment: 75,
    trend: 'down',
    mainNexonIP: 'FC온라인'
  },
  {
    id: 8,
    name: '따효니',
    platform: 'soop',
    avgViewers: 16000,
    chatVelocity: 76,
    donationConversion: 2.9,
    nexonAffinity: 65,
    sentiment: 72,
    trend: 'stable',
    mainNexonIP: '메이플스토리'
  }
];

// Viewer Interest Keywords
const VIEWER_INTEREST_KEYWORDS = [
  { keyword: 'e스포츠', value: 85 },
  { keyword: '캐주얼게임', value: 72 },
  { keyword: 'RPG', value: 68 },
  { keyword: '스포츠게임', value: 90 },
  { keyword: 'FPS/TPS', value: 45 },
  { keyword: '서브컬처', value: 88 }
];

const AdminNexonDiscovery = ({ onStreamerSelect }) => {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const filteredStreamers = useMemo(() => {
    if (!searchQuery) return STREAMS_DATA;
    return STREAMS_DATA.filter(s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.mainNexonIP.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

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
    return (
      <div className="admin-loading-section">
        <RefreshCw size={24} className="spin" />
        <p>데이터 로딩 중...</p>
      </div>
    );
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
        {NEXON_IP_INTELLIGENCE.map((ip) => (
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
        ))}
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
                  <th>스트리머</th>
                  <th>플랫폼</th>
                  <th>평균 시청자</th>
                  <th>채팅 밀도</th>
                  <th>후원 전환율</th>
                  <th>넥슨 친화도</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredStreamers.map((streamer) => (
                  <tr
                    key={streamer.id}
                    className="clickable"
                    onClick={() => handleStreamerClick(streamer.id)}
                  >
                    <td>
                      <div className="streamer-info">
                        <div className="streamer-avatar">
                          {streamer.name.charAt(0)}
                        </div>
                        <div className="streamer-details">
                          <span className="streamer-name">{streamer.name}</span>
                          <span className="streamer-ip">{streamer.mainNexonIP}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="platform-badge">{streamer.platform}</span>
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
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={VIEWER_INTEREST_KEYWORDS}>
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
          </div>
        </div>
      </div>

    </div>
  );
};

export default AdminNexonDiscovery;
