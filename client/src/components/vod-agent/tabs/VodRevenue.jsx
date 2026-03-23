import { useState } from 'react';
import {
  DollarSign, TrendingUp, Link2, CreditCard, Download,
  Calendar, ChevronRight, Copy, ExternalLink, Clock, Check
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  revenueData, revenueHistory, linkRevenueData, settlementHistory
} from '../data/mockData';
import SensitiveValue from '../../shared/SensitiveValue';

const VodRevenue = () => {
  const [timeRange, setTimeRange] = useState('6m');

  // 숫자 포맷팅
  const formatCurrency = (num) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // 링크 복사
  const copyLink = (link) => {
    navigator.clipboard.writeText(link);
  };

  // 정산 상태 배지
  const getSettlementStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="vod-status-badge published">완료</span>;
      case 'pending':
        return <span className="vod-status-badge processing">대기중</span>;
      case 'failed':
        return <span className="vod-status-badge error">실패</span>;
      default:
        return null;
    }
  };

  return (
    <div className="animate-fade">
      <header className="vod-page-header">
        <div className="vod-page-title">
          <h1>수익 관리</h1>
          <p>링크 수익 및 정산 현황을 확인하세요</p>
        </div>
      </header>

      {/* 수익 요약 카드 */}
      <div className="vod-stats-grid">
        <div className="vod-stat-card">
          <div className="vod-stat-header">
            <span>총 수익</span>
            <div className="vod-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
              <DollarSign size={20} style={{ color: '#10b981' }} />
            </div>
          </div>
          <div className="vod-stat-content">
            <SensitiveValue className="vod-stat-value" style={{ color: '#10b981' }}>
              {formatCurrency(revenueData.total)}
            </SensitiveValue>
            <div className="vod-stat-change positive">
              <TrendingUp size={14} />
              <span>+{revenueData.growthRate}%</span>
            </div>
          </div>
        </div>

        <div className="vod-stat-card">
          <div className="vod-stat-header">
            <span>이번 달 수익</span>
            <div className="vod-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
              <Calendar size={20} style={{ color: '#3b82f6' }} />
            </div>
          </div>
          <div className="vod-stat-content">
            <SensitiveValue className="vod-stat-value">{formatCurrency(revenueData.thisMonth)}</SensitiveValue>
            <div className="vod-stat-change" style={{ color: 'var(--text-muted)' }}>
              <span>진행중</span>
            </div>
          </div>
        </div>

        <div className="vod-stat-card">
          <div className="vod-stat-header">
            <span>정산 대기</span>
            <div className="vod-stat-icon" style={{ background: 'rgba(251, 191, 36, 0.1)' }}>
              <Clock size={20} style={{ color: '#f59e0b' }} />
            </div>
          </div>
          <div className="vod-stat-content">
            <SensitiveValue className="vod-stat-value">{formatCurrency(revenueData.pending)}</SensitiveValue>
            <div className="vod-stat-change" style={{ color: 'var(--text-muted)' }}>
              <span>다음 정산일: 3월 1일</span>
            </div>
          </div>
        </div>

        <div className="vod-stat-card">
          <div className="vod-stat-header">
            <span>출금 가능</span>
            <div className="vod-stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
              <CreditCard size={20} style={{ color: '#8b5cf6' }} />
            </div>
          </div>
          <div className="vod-stat-content">
            <SensitiveValue className="vod-stat-value">{formatCurrency(revenueData.available)}</SensitiveValue>
            <button className="btn btn-primary btn-sm" style={{ marginTop: '8px' }}>
              출금 요청
            </button>
          </div>
        </div>
      </div>

      {/* 수익 추이 차트 */}
      <div className="vod-section">
        <div className="vod-section-header">
          <div className="vod-section-title">
            <TrendingUp size={18} style={{ color: 'var(--primary)' }} />
            <h2>수익 추이</h2>
          </div>
          <select
            className="vod-filter-select"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="3m">최근 3개월</option>
            <option value="6m">최근 6개월</option>
            <option value="1y">최근 1년</option>
          </select>
        </div>

        <div className="vod-chart-container" style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                tickFormatter={(v) => v.split('-')[1] + '월'}
              />
              <YAxis
                tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                tickFormatter={(v) => formatNumber(v)}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value) => [formatCurrency(value), '수익']}
                labelFormatter={(label) => label.replace('-', '년 ') + '월'}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#revenueGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 링크별 수익 통계 */}
      <div className="vod-section">
        <div className="vod-section-header">
          <div className="vod-section-title">
            <Link2 size={18} style={{ color: 'var(--primary)' }} />
            <h2>링크별 수익</h2>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="vod-table">
            <thead>
              <tr>
                <th>영상</th>
                <th>추적 링크</th>
                <th>클릭</th>
                <th>전환</th>
                <th>CTR</th>
                <th>수익</th>
              </tr>
            </thead>
            <tbody>
              {linkRevenueData.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span style={{ fontWeight: 500, maxWidth: '200px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.videoTitle}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <SensitiveValue style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--primary)' }}>
                        {item.link}
                      </SensitiveValue>
                      <button
                        className="btn btn-icon btn-ghost btn-sm"
                        onClick={() => copyLink(item.link)}
                        title="복사"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </td>
                  <td><SensitiveValue>{formatNumber(item.clicks)}</SensitiveValue></td>
                  <td><SensitiveValue>{formatNumber(item.conversions)}</SensitiveValue></td>
                  <td>
                    <SensitiveValue style={{
                      padding: '4px 8px',
                      borderRadius: '20px',
                      background: item.ctr > 5.5 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                      color: item.ctr > 5.5 ? '#10b981' : '#f59e0b',
                      fontSize: '12px',
                      fontWeight: 500
                    }}>
                      {item.ctr}%
                    </SensitiveValue>
                  </td>
                  <td>
                    <SensitiveValue style={{ fontWeight: 600, color: '#10b981' }}>
                      {formatCurrency(item.revenue)}
                    </SensitiveValue>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 정산 내역 */}
      <div className="vod-section">
        <div className="vod-section-header">
          <div className="vod-section-title">
            <CreditCard size={18} style={{ color: 'var(--primary)' }} />
            <h2>정산 내역</h2>
          </div>
          <button className="btn btn-outline btn-sm">
            <Download size={14} /> 내역 다운로드
          </button>
        </div>

        <table className="vod-table">
          <thead>
            <tr>
              <th>정산일</th>
              <th>금액</th>
              <th>방법</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {settlementHistory.map((item) => (
              <tr key={item.id}>
                <td>{new Date(item.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                <td><SensitiveValue style={{ fontWeight: 600 }}>{formatCurrency(item.amount)}</SensitiveValue></td>
                <td>{item.method}</td>
                <td>{getSettlementStatusBadge(item.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 수익 안내 */}
      <div className="vod-section" style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DollarSign size={20} style={{ color: '#10b981' }} />
          수익 창출 안내
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          <div style={{ padding: '16px', background: 'var(--bg-card)', borderRadius: '12px' }}>
            <div style={{ fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Check size={16} style={{ color: '#10b981' }} />
              CPA 수익
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              추적 링크를 통해 유입된 사용자가 회원가입, 구매 등 전환 행동을 할 때 수익이 발생합니다.
            </p>
          </div>

          <div style={{ padding: '16px', background: 'var(--bg-card)', borderRadius: '12px' }}>
            <div style={{ fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Check size={16} style={{ color: '#10b981' }} />
              CPC 수익
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              일부 캠페인의 경우 클릭당 수익이 발생할 수 있습니다. 캠페인 조건을 확인하세요.
            </p>
          </div>

          <div style={{ padding: '16px', background: 'var(--bg-card)', borderRadius: '12px' }}>
            <div style={{ fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Check size={16} style={{ color: '#10b981' }} />
              정산 주기
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              매월 1일 전월 수익이 정산됩니다. 최소 출금 금액은 10,000원입니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VodRevenue;
