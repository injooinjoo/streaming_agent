import { Calendar, DollarSign, FileText, Receipt, TrendingUp } from 'lucide-react';
import { formatCurrency, formatCurrencyCompact } from '../../utils/formatters';

const getStatementStatusLabel = (status) => {
  switch (status) {
    case 'paid':
      return '결제 완료';
    case 'scheduled':
      return '청구 예정';
    case 'processing':
      return '정산 처리 중';
    default:
      return '확인 필요';
  }
};

const getCampaignStatusLabel = (status) => {
  switch (status) {
    case 'active':
      return '집행 중';
    case 'paused':
      return '일시중지';
    case 'pending':
      return '대기 중';
    case 'completed':
      return '종료';
    default:
      return status || '미정';
  }
};

const AdvertiserBillingPanel = ({ billing, loading = false }) => {
  const summary = billing?.summary || {
    monthlySpent: 0,
    remainingBudget: 0,
    activeCampaigns: 0,
    pendingInvoice: 0,
  };
  const monthlyStatements = Array.isArray(billing?.monthlyStatements) ? billing.monthlyStatements : [];
  const campaignSpend = Array.isArray(billing?.campaignSpend) ? billing.campaignSpend : [];

  return (
    <div className="animate-fade">
      <header className="page-header">
        <div className="page-title">
          <span className="page-badge page-badge--orange">광고비</span>
          <h1>집행비 정산</h1>
          <p>이번 달 집행액과 청구 예정 금액, 캠페인별 사용 현황을 한눈에 확인할 수 있습니다.</p>
        </div>
      </header>

      <div className="billing-overview-grid">
        <div className="billing-overview-card">
          <div className="billing-overview-card__header">
            <span>이번 달 집행액</span>
            <div className="campaign-stat-icon orange">
              <DollarSign size={18} />
            </div>
          </div>
          <strong>{formatCurrencyCompact(summary.monthlySpent)}</strong>
          <span>전체 캠페인 누적 사용 금액</span>
        </div>

        <div className="billing-overview-card">
          <div className="billing-overview-card__header">
            <span>잔여 예산</span>
            <div className="campaign-stat-icon blue">
              <TrendingUp size={18} />
            </div>
          </div>
          <strong>{formatCurrencyCompact(summary.remainingBudget)}</strong>
          <span>현재 등록된 캠페인 총 잔액</span>
        </div>

        <div className="billing-overview-card">
          <div className="billing-overview-card__header">
            <span>집행 중 캠페인</span>
            <div className="campaign-stat-icon purple">
              <Receipt size={18} />
            </div>
          </div>
          <strong>{summary.activeCampaigns}</strong>
          <span>실시간으로 노출되는 캠페인 수</span>
        </div>

        <div className="billing-overview-card">
          <div className="billing-overview-card__header">
            <span>청구 예정 금액</span>
            <div className="campaign-stat-icon green">
              <FileText size={18} />
            </div>
          </div>
          <strong>{formatCurrencyCompact(summary.pendingInvoice)}</strong>
          <span>다음 정산 주기에 청구될 금액</span>
        </div>
      </div>

      <div className="billing-grid">
        <section className="billing-section">
          <div className="billing-section__header">
            <h2>월별 정산서</h2>
            <span>{monthlyStatements.length}건</span>
          </div>

          {loading ? (
            <div className="billing-empty">정산서를 불러오는 중입니다...</div>
          ) : monthlyStatements.length ? (
            <div className="billing-table">
              <div className="billing-table__header">
                <span>정산 월</span>
                <span>금액</span>
                <span>상태</span>
                <span>청구일</span>
              </div>

              {monthlyStatements.map((statement) => (
                <div key={`${statement.month}-${statement.status}`} className="billing-table__row">
                  <span>{statement.month}</span>
                  <span>{formatCurrency(statement.amount)}</span>
                  <span>
                    <span className={`billing-status-badge billing-status-badge--${statement.status}`}>
                      {getStatementStatusLabel(statement.status)}
                    </span>
                  </span>
                  <span>{statement.paidDate || statement.dueDate || '-'}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="billing-empty">정산서 데이터가 아직 없습니다.</div>
          )}
        </section>

        <section className="billing-section">
          <div className="billing-section__header">
            <h2>캠페인별 집행비</h2>
            <span>{campaignSpend.length}개 캠페인</span>
          </div>

          {loading ? (
            <div className="billing-empty">캠페인 집행비를 불러오는 중입니다...</div>
          ) : campaignSpend.length ? (
            <div className="billing-table">
              <div className="billing-table__header billing-table__header--campaign">
                <span>캠페인</span>
                <span>상태</span>
                <span>사용 금액</span>
                <span>전체 예산</span>
                <span>기간</span>
              </div>

              {campaignSpend.map((campaign) => (
                <div key={campaign.campaignId} className="billing-table__row billing-table__row--campaign">
                  <span className="billing-campaign-name">{campaign.name}</span>
                  <span>
                    <span className={`campaign-status-badge ${campaign.status}`}>
                      <span className="status-dot"></span>
                      {getCampaignStatusLabel(campaign.status)}
                    </span>
                  </span>
                  <span>{formatCurrency(campaign.spent)}</span>
                  <span>{formatCurrency(campaign.budgetTotal)}</span>
                  <span>
                    {campaign.startDate || '-'} {campaign.endDate ? `~ ${campaign.endDate}` : ''}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="billing-empty">집행비를 표시할 캠페인이 없습니다.</div>
          )}
        </section>
      </div>

      {!loading && campaignSpend.length ? (
        <section className="billing-summary-note">
          <div className="billing-summary-note__item">
            <Calendar size={16} />
            <span>정산서는 월 단위로 누적되며, 가장 최근 청구 예정 금액이 상단 카드에 반영됩니다.</span>
          </div>
          <div className="billing-summary-note__item">
            <TrendingUp size={16} />
            <span>
              총 예산 대비 집행 규모는 {formatCurrencyCompact(summary.monthlySpent)} /{' '}
              {formatCurrencyCompact(summary.monthlySpent + summary.remainingBudget)} 기준입니다.
            </span>
          </div>
        </section>
      ) : null}
    </div>
  );
};

export default AdvertiserBillingPanel;
