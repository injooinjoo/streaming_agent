import React, { useState, useEffect, useRef } from 'react';
import {
  Monitor, RefreshCw, Users, DollarSign, BarChart3, MessageSquare,
  Clock, Database, Activity, TrendingUp, Radio, ChevronDown, X,
  Eye, Gift, Heart, UserPlus
} from 'lucide-react';
import Chart from 'chart.js/auto';
import './AdminMonitor.css';
import { formatFullNumber, formatCurrency } from '../../utils/formatters';

const API_BASE = '/api/monitor';
const PAGE_SIZE = 30;

// 날짜 포맷 (KST)
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 플랫폼 뱃지
const PlatformBadge = ({ platform }) => (
  <span className={`monitor-platform-badge ${platform}`}>{platform}</span>
);

// 상태 뱃지
const StatusBadge = ({ isLive }) => (
  <span className={`monitor-status-badge ${isLive ? 'live' : 'offline'}`}>
    {isLive ? 'LIVE' : '종료'}
  </span>
);

// 타입 뱃지
const TypeBadge = ({ type }) => (
  <span className={`monitor-type-badge ${type}`}>
    {type === 'broadcaster' ? '방송자' : type === 'viewer' ? '시청자' : type}
  </span>
);

const AdminMonitor = () => {
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('broadcasts');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // 데이터 상태
  const [broadcasts, setBroadcasts] = useState({ data: [], pagination: {} });
  const [persons, setPersons] = useState({ data: [], pagination: {} });
  const [events, setEvents] = useState({ data: [], pagination: {} });
  const [segments, setSegments] = useState({ data: [], pagination: {} });
  const [categories, setCategories] = useState({ data: [], pagination: {} });
  const [engagement, setEngagement] = useState({ data: [], pagination: {} });

  // 필터 상태
  const [broadcastFilter, setBroadcastFilter] = useState('all');
  const [personFilter, setPersonFilter] = useState('all');
  const [eventFilter, setEventFilter] = useState('all');
  const [includeChat, setIncludeChat] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');

  // 페이지 상태
  const [currentPages, setCurrentPages] = useState({
    broadcasts: 1, persons: 1, events: 1, segments: 1, categories: 1, engagement: 1
  });

  // 차트 refs
  const viewersChartRef = useRef(null);
  const eventsChartRef = useRef(null);
  const viewersChartInstance = useRef(null);
  const eventsChartInstance = useRef(null);

  // 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPerson, setModalPerson] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // 통계 로드
  const loadStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/stats`);
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  // 시계열 차트 로드
  const loadTimeseries = async () => {
    try {
      const res = await fetch(`${API_BASE}/stats/timeseries?hours=24`);
      const data = await res.json();

      // 시청자 차트 데이터 처리
      const hourLabels = [...new Set(data.viewers.map(v => v.hour))].sort();
      const shortLabels = hourLabels.map(h => {
        const date = new Date(h);
        return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
      });

      const soopViewers = hourLabels.map(hour => {
        const match = data.viewers.find(v => v.hour === hour && v.platform === 'soop');
        return match ? match.total_viewers : 0;
      });
      const chzzkViewers = hourLabels.map(hour => {
        const match = data.viewers.find(v => v.hour === hour && v.platform === 'chzzk');
        return match ? match.total_viewers : 0;
      });

      // 기존 차트 제거
      if (viewersChartInstance.current) viewersChartInstance.current.destroy();

      // 시청자 차트 생성
      if (viewersChartRef.current) {
        viewersChartInstance.current = new Chart(viewersChartRef.current, {
          type: 'line',
          data: {
            labels: shortLabels,
            datasets: [
              {
                label: 'SOOP',
                data: soopViewers,
                borderColor: 'rgba(26, 75, 204, 1)',
                backgroundColor: 'rgba(26, 75, 204, 0.1)',
                fill: true,
                tension: 0.3,
                pointRadius: 2
              },
              {
                label: 'Chzzk',
                data: chzzkViewers,
                borderColor: 'rgba(0, 214, 126, 1)',
                backgroundColor: 'rgba(0, 214, 126, 0.1)',
                fill: true,
                tension: 0.3,
                pointRadius: 2
              }
            ]
          },
          options: chartOptions
        });
      }

      // 이벤트 차트 데이터
      const eventHours = [...new Set(data.events.map(e => e.hour))].sort();
      const eventLabels = eventHours.map(h => {
        const date = new Date(h);
        return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
      });

      const chatCounts = eventHours.map(hour => {
        const match = data.events.find(e => e.hour === hour && e.event_type === 'chat');
        return match ? match.count : 0;
      });
      const donationCounts = eventHours.map(hour => {
        const match = data.events.find(e => e.hour === hour && e.event_type === 'donation');
        return match ? match.count : 0;
      });

      // 기존 차트 제거
      if (eventsChartInstance.current) eventsChartInstance.current.destroy();

      // 이벤트 차트 생성
      if (eventsChartRef.current) {
        eventsChartInstance.current = new Chart(eventsChartRef.current, {
          type: 'bar',
          data: {
            labels: eventLabels,
            datasets: [
              {
                label: '채팅',
                data: chatCounts,
                backgroundColor: 'rgba(59, 130, 246, 0.7)',
                borderRadius: 4
              },
              {
                label: '후원',
                data: donationCounts,
                backgroundColor: 'rgba(255, 165, 2, 0.7)',
                borderRadius: 4
              }
            ]
          },
          options: chartOptions
        });
      }
    } catch (error) {
      console.error('Failed to load timeseries:', error);
    }
  };

  // 차트 기본 옵션
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: 'var(--text-muted)',
          font: { size: 11 },
          padding: 10,
          usePointStyle: true
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: 'var(--text-muted)', font: { size: 10 } }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: 'var(--text-muted)', font: { size: 10 } }
      }
    }
  };

  // 방송 목록 로드
  const loadBroadcasts = async (page = 1) => {
    try {
      const liveOnly = broadcastFilter === 'live' ? 'true' : 'false';
      const res = await fetch(`${API_BASE}/broadcasts?page=${page}&limit=${PAGE_SIZE}&live_only=${liveOnly}`);
      const data = await res.json();
      setBroadcasts(data);
      setCurrentPages(prev => ({ ...prev, broadcasts: page }));
    } catch (error) {
      console.error('Failed to load broadcasts:', error);
    }
  };

  // 인원 목록 로드
  const loadPersons = async (page = 1) => {
    try {
      const res = await fetch(`${API_BASE}/persons?page=${page}&limit=${PAGE_SIZE}&type=${personFilter}`);
      const data = await res.json();
      setPersons(data);
      setCurrentPages(prev => ({ ...prev, persons: page }));
    } catch (error) {
      console.error('Failed to load persons:', error);
    }
  };

  // 이벤트 로드
  const loadEvents = async (page = 1) => {
    try {
      let typeParam = eventFilter;
      if (eventFilter === 'all' && !includeChat) {
        typeParam = 'no_chat';
      }
      const res = await fetch(`${API_BASE}/events?page=${page}&limit=${PAGE_SIZE}&type=${typeParam}`);
      const data = await res.json();
      setEvents(data);
      setCurrentPages(prev => ({ ...prev, events: page }));
    } catch (error) {
      console.error('Failed to load events:', error);
    }
  };

  // 세그먼트 로드
  const loadSegments = async (page = 1) => {
    try {
      const res = await fetch(`${API_BASE}/segments?page=${page}&limit=${PAGE_SIZE}`);
      const data = await res.json();
      setSegments(data);
      setCurrentPages(prev => ({ ...prev, segments: page }));
    } catch (error) {
      console.error('Failed to load segments:', error);
    }
  };

  // 카테고리 로드
  const loadCategories = async (page = 1) => {
    try {
      const res = await fetch(`${API_BASE}/categories?page=${page}&limit=${PAGE_SIZE}&platform=${categoryFilter}`);
      const data = await res.json();
      setCategories(data);
      setCurrentPages(prev => ({ ...prev, categories: page }));
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  // 참여 기록 로드
  const loadEngagement = async (page = 1) => {
    try {
      const res = await fetch(`${API_BASE}/engagement?page=${page}&limit=${PAGE_SIZE}`);
      const data = await res.json();
      setEngagement(data);
      setCurrentPages(prev => ({ ...prev, engagement: page }));
    } catch (error) {
      console.error('Failed to load engagement:', error);
    }
  };

  // Person 모달 열기
  const openPersonModal = async (personId) => {
    setModalOpen(true);
    setModalLoading(true);
    try {
      const res = await fetch(`${API_BASE}/persons/${personId}`);
      const data = await res.json();
      setModalPerson(data);
    } catch (error) {
      console.error('Failed to load person:', error);
    }
    setModalLoading(false);
  };

  // 전체 새로고침
  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([
      loadStats(),
      loadTimeseries(),
      loadBroadcasts(1),
      loadPersons(1),
      loadEvents(1),
      loadSegments(1),
      loadCategories(1),
      loadEngagement(1)
    ]);
    setLastUpdated(new Date());
    setLoading(false);
  };

  // 초기 로드
  useEffect(() => {
    refreshAll();

    // 5분마다 자동 새로고침
    const interval = setInterval(refreshAll, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // 필터 변경 시 재로드
  useEffect(() => {
    loadBroadcasts(1);
  }, [broadcastFilter]);

  useEffect(() => {
    loadPersons(1);
  }, [personFilter]);

  useEffect(() => {
    loadEvents(1);
  }, [eventFilter, includeChat]);

  useEffect(() => {
    loadCategories(1);
  }, [categoryFilter]);

  // 페이지네이션 컴포넌트
  const Pagination = ({ type, pagination, onPageChange }) => {
    if (!pagination.total) return null;
    const start = (pagination.page - 1) * pagination.limit + 1;
    const end = Math.min(pagination.page * pagination.limit, pagination.total);

    return (
      <div className="monitor-pagination">
        <span className="monitor-pagination-info">
          {formatFullNumber(start)} - {formatFullNumber(end)} / {formatFullNumber(pagination.total)}
        </span>
        <div className="monitor-pagination-buttons">
          <button
            className="monitor-page-btn"
            disabled={pagination.page <= 1}
            onClick={() => onPageChange(currentPages[type] - 1)}
          >
            이전
          </button>
          <button
            className="monitor-page-btn"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => onPageChange(currentPages[type] + 1)}
          >
            다음
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-monitor">
      {/* 헤더 */}
      <div className="monitor-header">
        <div className="monitor-header-left">
          <Monitor size={24} />
          <h2>스트리밍 데이터 모니터</h2>
        </div>
        <div className="monitor-header-right">
          {lastUpdated && (
            <span className="monitor-last-updated">
              마지막 업데이트: {lastUpdated.toLocaleTimeString('ko-KR')}
            </span>
          )}
          <button className="monitor-refresh-btn" onClick={refreshAll} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
            새로고침
          </button>
        </div>
      </div>

      {/* 통계 카드 - 상단 */}
      <div className="monitor-stats-grid">
        <div className="monitor-stat-card" title="시청자 50명 이상 라이브 방송 수">
          <div className="monitor-stat-icon red">
            <Radio size={24} />
          </div>
          <div className="monitor-stat-content">
            <h3>50명+ 라이브</h3>
            <div className="value">{stats ? `${formatFullNumber(stats.liveBroadcasts)}개` : '-'}</div>
            <div className="stat-sub">👥 {stats ? `${formatFullNumber(stats.totalViewers)}명` : '-'}</div>
          </div>
        </div>

        <div className="monitor-stat-card soop" title="SOOP 플랫폼">
          <div className="monitor-stat-icon" style={{ background: 'rgba(26, 75, 204, 0.2)' }}>
            <img src="/assets/logos/soop.png" alt="SOOP" width={28} height={28} />
          </div>
          <div className="monitor-stat-content">
            <h3>SOOP</h3>
            <div className="value">{stats?.platforms?.soop?.broadcasts || 0}개</div>
            <div className="stat-sub">👥 {formatFullNumber(stats?.platforms?.soop?.viewers || 0)}명</div>
          </div>
        </div>

        <div className="monitor-stat-card chzzk" title="Chzzk 플랫폼">
          <div className="monitor-stat-icon" style={{ background: 'rgba(0, 214, 126, 0.2)' }}>
            <img src="/assets/logos/chzzk.png" alt="Chzzk" width={28} height={28} />
          </div>
          <div className="monitor-stat-content">
            <h3>Chzzk</h3>
            <div className="value">{stats?.platforms?.chzzk?.broadcasts || 0}개</div>
            <div className="stat-sub">👥 {formatFullNumber(stats?.platforms?.chzzk?.viewers || 0)}명</div>
          </div>
        </div>

        <div className="monitor-stat-card" title="넥슨 게임 SOOP 방송">
          <div className="monitor-stat-icon" style={{ background: 'rgba(255, 165, 2, 0.2)' }}>
            <img src="/assets/logos/soop.png" alt="SOOP" width={20} height={20} />
          </div>
          <div className="monitor-stat-content">
            <h3>넥슨(숲)</h3>
            <div className="value">{stats?.nexon?.soop?.broadcasts || 0}개</div>
            <div className="stat-sub">👥 {formatFullNumber(stats?.nexon?.soop?.viewers || 0)}명</div>
          </div>
        </div>

        <div className="monitor-stat-card" title="넥슨 게임 Chzzk 방송">
          <div className="monitor-stat-icon" style={{ background: 'rgba(255, 165, 2, 0.2)' }}>
            <img src="/assets/logos/chzzk.png" alt="Chzzk" width={20} height={20} />
          </div>
          <div className="monitor-stat-content">
            <h3>넥슨(치지직)</h3>
            <div className="value">{stats?.nexon?.chzzk?.broadcasts || 0}개</div>
            <div className="stat-sub">👥 {formatFullNumber(stats?.nexon?.chzzk?.viewers || 0)}명</div>
          </div>
        </div>
      </div>

      {/* 통계 카드 - 하단 */}
      <div className="monitor-stats-grid secondary">
        <div className="monitor-stat-card" title="DB에 등록된 스트리머 + 시청자 수">
          <div className="monitor-stat-icon green">
            <Users size={20} />
          </div>
          <div className="monitor-stat-content">
            <h3>등록 인원</h3>
            <div className="value">{formatFullNumber(stats?.totalPersons)}</div>
          </div>
        </div>

        <div className="monitor-stat-card" title="수집된 후원 이벤트의 총 금액">
          <div className="monitor-stat-icon yellow">
            <DollarSign size={20} />
          </div>
          <div className="monitor-stat-content">
            <h3>총 후원액</h3>
            <div className="value">{formatCurrency(stats?.totalDonations)}</div>
          </div>
        </div>

        <div className="monitor-stat-card" title="채팅/후원/구독/팔로우 등 수집된 이벤트 수">
          <div className="monitor-stat-icon purple">
            <BarChart3 size={20} />
          </div>
          <div className="monitor-stat-content">
            <h3>이벤트</h3>
            <div className="value">{formatFullNumber(stats?.eventCount)}</div>
          </div>
        </div>

        <div className="monitor-stat-card" title="방송 중 카테고리 변경 구간 기록 수">
          <div className="monitor-stat-icon cyan">
            <Activity size={20} />
          </div>
          <div className="monitor-stat-content">
            <h3>세그먼트</h3>
            <div className="value">{formatFullNumber(stats?.segmentCount)}</div>
          </div>
        </div>

        <div className="monitor-stat-card" title="5분마다 기록하는 시청자 수 스냅샷">
          <div className="monitor-stat-icon purple">
            <TrendingUp size={20} />
          </div>
          <div className="monitor-stat-content">
            <h3>스냅샷</h3>
            <div className="value">{formatFullNumber(stats?.snapshotCount)}</div>
          </div>
        </div>

        <div className="monitor-stat-card" title="시청자-채널 참여 통계 수">
          <div className="monitor-stat-icon cyan">
            <MessageSquare size={20} />
          </div>
          <div className="monitor-stat-content">
            <h3>참여 기록</h3>
            <div className="value">{formatFullNumber(stats?.engagementCount)}</div>
          </div>
        </div>
      </div>

      {/* 차트 섹션 */}
      <div className="monitor-charts-section">
        <div className="monitor-chart-card">
          <h3><TrendingUp size={16} /> 시청자 추이 (24시간)</h3>
          <div className="monitor-chart-container">
            <canvas ref={viewersChartRef}></canvas>
          </div>
        </div>

        <div className="monitor-chart-card">
          <h3><MessageSquare size={16} /> 이벤트 추이 (24시간)</h3>
          <div className="monitor-chart-container">
            <canvas ref={eventsChartRef}></canvas>
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="monitor-tabs">
        {[
          { id: 'broadcasts', label: '방송 목록' },
          { id: 'persons', label: '인원 목록' },
          { id: 'engagement', label: '참여 기록' },
          { id: 'events', label: '이벤트' },
          { id: 'segments', label: '세그먼트' },
          { id: 'categories', label: '카테고리' }
        ].map(tab => (
          <button
            key={tab.id}
            className={`monitor-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="monitor-table-container">
        {/* 방송 목록 */}
        {activeTab === 'broadcasts' && (
          <>
            <div className="monitor-table-header">
              <span className="monitor-table-title">방송 목록</span>
              <select
                className="monitor-filter"
                value={broadcastFilter}
                onChange={(e) => setBroadcastFilter(e.target.value)}
              >
                <option value="all">전체</option>
                <option value="live">라이브만</option>
              </select>
            </div>
            <div className="monitor-table-wrapper">
              <table className="monitor-table">
                <thead>
                  <tr>
                    <th>플랫폼</th>
                    <th>닉네임</th>
                    <th>제목</th>
                    <th>카테고리</th>
                    <th>시청자</th>
                    <th>최고</th>
                    <th>후원액</th>
                    <th>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {broadcasts.data?.length === 0 ? (
                    <tr><td colSpan="8" className="monitor-empty">데이터가 없습니다</td></tr>
                  ) : broadcasts.data?.map((b, i) => (
                    <tr key={i}>
                      <td><PlatformBadge platform={b.platform} /></td>
                      <td
                        className={b.broadcaster_person_id ? 'monitor-clickable' : ''}
                        onClick={() => b.broadcaster_person_id && openPersonModal(b.broadcaster_person_id)}
                      >
                        {b.broadcaster_nickname || '-'}
                      </td>
                      <td className="monitor-truncate" title={b.title}>{b.title || '-'}</td>
                      <td>{b.category_name || '-'}</td>
                      <td className="monitor-number">{formatFullNumber(b.current_viewer_count)}</td>
                      <td className="monitor-number">{formatFullNumber(b.peak_viewer_count)}</td>
                      <td className="monitor-number">{formatCurrency(b.total_donation_amount)}</td>
                      <td><StatusBadge isLive={b.is_live} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination type="broadcasts" pagination={broadcasts.pagination || {}} onPageChange={loadBroadcasts} />
          </>
        )}

        {/* 인원 목록 */}
        {activeTab === 'persons' && (
          <>
            <div className="monitor-table-header">
              <span className="monitor-table-title">인원 목록</span>
              <select
                className="monitor-filter"
                value={personFilter}
                onChange={(e) => setPersonFilter(e.target.value)}
              >
                <option value="all">전체</option>
                <option value="broadcaster">방송자</option>
                <option value="viewer">시청자</option>
              </select>
            </div>
            <div className="monitor-table-wrapper">
              <table className="monitor-table">
                <thead>
                  <tr>
                    <th>플랫폼</th>
                    <th>닉네임</th>
                    <th>타입</th>
                    <th>팔로워</th>
                    <th>채팅수</th>
                    <th>후원횟수</th>
                    <th>후원액</th>
                    <th>마지막 활동</th>
                  </tr>
                </thead>
                <tbody>
                  {persons.data?.length === 0 ? (
                    <tr><td colSpan="8" className="monitor-empty">데이터가 없습니다</td></tr>
                  ) : persons.data?.map((p, i) => (
                    <tr key={i}>
                      <td><PlatformBadge platform={p.platform} /></td>
                      <td className="monitor-clickable" onClick={() => openPersonModal(p.id)}>
                        {p.nickname || '-'}
                      </td>
                      <td><TypeBadge type={p.person_type} /></td>
                      <td className="monitor-number">{formatFullNumber(p.follower_count)}</td>
                      <td className="monitor-number">{formatFullNumber(p.total_chat_count)}</td>
                      <td className="monitor-number">{formatFullNumber(p.total_donation_count)}</td>
                      <td className="monitor-number">{formatCurrency(p.total_donation_amount)}</td>
                      <td>{formatDate(p.last_seen_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination type="persons" pagination={persons.pagination || {}} onPageChange={loadPersons} />
          </>
        )}

        {/* 참여 기록 */}
        {activeTab === 'engagement' && (
          <>
            <div className="monitor-table-header">
              <span className="monitor-table-title">참여 기록</span>
            </div>
            <div className="monitor-table-wrapper">
              <table className="monitor-table">
                <thead>
                  <tr>
                    <th>플랫폼</th>
                    <th>시청자</th>
                    <th>방송자</th>
                    <th>채팅수</th>
                    <th>후원횟수</th>
                    <th>후원액</th>
                    <th>카테고리</th>
                    <th>마지막 참여</th>
                  </tr>
                </thead>
                <tbody>
                  {engagement.data?.length === 0 ? (
                    <tr><td colSpan="8" className="monitor-empty">데이터가 없습니다</td></tr>
                  ) : engagement.data?.map((e, i) => (
                    <tr key={i}>
                      <td><PlatformBadge platform={e.platform} /></td>
                      <td className="monitor-clickable" onClick={() => openPersonModal(e.viewer_person_id)}>
                        {e.viewer_nickname || '-'}
                      </td>
                      <td className="monitor-clickable" onClick={() => openPersonModal(e.broadcaster_person_id)}>
                        {e.broadcaster_nickname || '-'}
                      </td>
                      <td className="monitor-number">{formatFullNumber(e.chat_count)}</td>
                      <td className="monitor-number">{formatFullNumber(e.donation_count)}</td>
                      <td className="monitor-number">{formatCurrency(e.donation_amount)}</td>
                      <td title={e.categories}>{e.category_count > 0 ? `${e.category_count}개` : '-'}</td>
                      <td>{formatDate(e.last_seen_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination type="engagement" pagination={engagement.pagination || {}} onPageChange={loadEngagement} />
          </>
        )}

        {/* 이벤트 */}
        {activeTab === 'events' && (
          <>
            <div className="monitor-table-header">
              <span className="monitor-table-title">이벤트 목록</span>
              <div className="monitor-filter-group">
                <label className="monitor-checkbox-label">
                  <input
                    type="checkbox"
                    checked={includeChat}
                    onChange={(e) => setIncludeChat(e.target.checked)}
                  />
                  채팅 포함
                </label>
                <select
                  className="monitor-filter"
                  value={eventFilter}
                  onChange={(e) => setEventFilter(e.target.value)}
                >
                  <option value="all">전체</option>
                  <option value="donation">후원</option>
                  <option value="subscribe">구독</option>
                  <option value="follow">팔로우</option>
                  <option value="chat">채팅만</option>
                </select>
              </div>
            </div>
            <div className="monitor-table-wrapper">
              <table className="monitor-table">
                <thead>
                  <tr>
                    <th>플랫폼</th>
                    <th>타입</th>
                    <th>닉네임</th>
                    <th>메시지</th>
                    <th>금액</th>
                    <th>채널</th>
                    <th>시간</th>
                  </tr>
                </thead>
                <tbody>
                  {events.data?.length === 0 ? (
                    <tr><td colSpan="7" className="monitor-empty">데이터가 없습니다</td></tr>
                  ) : events.data?.map((e, i) => (
                    <tr key={i}>
                      <td><PlatformBadge platform={e.platform} /></td>
                      <td><TypeBadge type={e.event_type} /></td>
                      <td>{e.actor_nickname || '-'}</td>
                      <td className="monitor-truncate" title={e.message}>{e.message || '-'}</td>
                      <td className="monitor-number">{e.amount ? formatCurrency(e.amount) : '-'}</td>
                      <td>{e.target_channel_id || '-'}</td>
                      <td>{formatDate(e.event_timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination type="events" pagination={events.pagination || {}} onPageChange={loadEvents} />
          </>
        )}

        {/* 세그먼트 */}
        {activeTab === 'segments' && (
          <>
            <div className="monitor-table-header">
              <span className="monitor-table-title">방송 세그먼트</span>
            </div>
            <div className="monitor-table-wrapper">
              <table className="monitor-table">
                <thead>
                  <tr>
                    <th>플랫폼</th>
                    <th>방송자</th>
                    <th>카테고리</th>
                    <th>최고 시청자</th>
                    <th>평균 시청자</th>
                    <th>시작</th>
                    <th>종료</th>
                  </tr>
                </thead>
                <tbody>
                  {segments.data?.length === 0 ? (
                    <tr><td colSpan="7" className="monitor-empty">데이터가 없습니다</td></tr>
                  ) : segments.data?.map((s, i) => (
                    <tr key={i}>
                      <td><PlatformBadge platform={s.platform} /></td>
                      <td>{s.broadcaster_nickname || '-'}</td>
                      <td>{s.category_name || '-'}</td>
                      <td className="monitor-number">{formatFullNumber(s.peak_viewer_count)}</td>
                      <td className="monitor-number">{formatFullNumber(s.avg_viewer_count)}</td>
                      <td>{formatDate(s.segment_started_at)}</td>
                      <td>{formatDate(s.segment_ended_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination type="segments" pagination={segments.pagination || {}} onPageChange={loadSegments} />
          </>
        )}

        {/* 카테고리 */}
        {activeTab === 'categories' && (
          <>
            <div className="monitor-table-header">
              <span className="monitor-table-title">카테고리 목록</span>
              <select
                className="monitor-filter"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">전체</option>
                <option value="soop">SOOP</option>
                <option value="chzzk">Chzzk</option>
              </select>
            </div>
            <div className="monitor-table-wrapper">
              <table className="monitor-table">
                <thead>
                  <tr>
                    <th>썸네일</th>
                    <th>플랫폼</th>
                    <th>카테고리명</th>
                    <th>어제 누적시청자</th>
                    <th>어제 방송 수</th>
                    <th>수집일</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.data?.length === 0 ? (
                    <tr><td colSpan="6" className="monitor-empty">데이터가 없습니다</td></tr>
                  ) : categories.data?.map((c, i) => (
                    <tr key={i}>
                      <td>
                        {c.thumbnail_url && c.thumbnail_url.includes('category_img') ? (
                          <img src={c.thumbnail_url} alt={c.category_name} className="monitor-category-thumb" />
                        ) : (
                          <span className="monitor-category-initial">
                            {(c.category_name || '?')[0].toUpperCase()}
                          </span>
                        )}
                      </td>
                      <td><PlatformBadge platform={c.platform} /></td>
                      <td>{c.category_name || '-'}</td>
                      <td className="monitor-number">{formatFullNumber(c.viewer_count)}</td>
                      <td className="monitor-number">{formatFullNumber(c.streamer_count)}</td>
                      <td>{formatDate(c.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination type="categories" pagination={categories.pagination || {}} onPageChange={loadCategories} />
          </>
        )}
      </div>

      {/* Person 모달 */}
      {modalOpen && (
        <div className="monitor-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="monitor-modal" onClick={(e) => e.stopPropagation()}>
            <div className="monitor-modal-header">
              {modalPerson && (
                <div className="monitor-modal-profile">
                  <div className="monitor-modal-avatar">
                    {modalPerson.profile_image ? (
                      <img src={modalPerson.profile_image} alt={modalPerson.nickname} />
                    ) : (
                      <span>{(modalPerson.nickname || '?')[0].toUpperCase()}</span>
                    )}
                  </div>
                  <div className="monitor-modal-info">
                    <h2>{modalPerson.nickname}</h2>
                    <div className="monitor-modal-meta">
                      <PlatformBadge platform={modalPerson.platform} />
                      <TypeBadge type={modalPerson.person_type} />
                    </div>
                  </div>
                </div>
              )}
              <button className="monitor-modal-close" onClick={() => setModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {modalLoading ? (
              <div className="monitor-modal-loading">
                <RefreshCw size={24} className="spinning" />
                로딩 중...
              </div>
            ) : modalPerson && (
              <div className="monitor-modal-body">
                <div className="monitor-modal-stats">
                  <div className="monitor-modal-stat">
                    <h4>팔로워</h4>
                    <div className="value">{formatFullNumber(modalPerson.follower_count)}</div>
                  </div>
                  <div className="monitor-modal-stat">
                    <h4>채팅 수</h4>
                    <div className="value">{formatFullNumber(modalPerson.total_chat_count)}</div>
                  </div>
                  <div className="monitor-modal-stat">
                    <h4>후원 횟수</h4>
                    <div className="value">{formatFullNumber(modalPerson.total_donation_count)}</div>
                  </div>
                  <div className="monitor-modal-stat">
                    <h4>후원 금액</h4>
                    <div className="value">{formatCurrency(modalPerson.total_donation_amount)}</div>
                  </div>
                </div>

                <div className="monitor-modal-section">
                  <h3>최근 활동</h3>
                  <p>마지막 활동: {formatDate(modalPerson.last_seen_at)}</p>
                  {modalPerson.channel_id && (
                    <p>채널 ID: {modalPerson.channel_id}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMonitor;
