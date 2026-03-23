import { CheckCircle2, Gamepad2, Link2, LogIn } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../shared/LoadingSpinner';
import { EmptyState, PageHero, SectionCard, StatusBadge } from '../shared/studio';
import { fetchNConnectMembershipStatus } from './api';
import { nconnectPromotionRewards } from './nconnectContent';

const NConnectLink = ({ onNavigate, onOpenAccountSettings }) => {
  const navigate = useNavigate();
  const { accessToken, isAuthenticated } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const nextStatus = await fetchNConnectMembershipStatus(accessToken);
        if (!cancelled) {
          setStatus(nextStatus);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [accessToken, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="nconnect-page animate-fade">
        <EmptyState
          className="studio-accent--amber"
          icon={<LogIn size={28} />}
          title="로그인 후 계정 연동을 이어갈 수 있습니다."
          description="N-CONNECT는 플랫폼 채널 연결과 넥슨 계정 연동이 모두 완료되어야 멤버십 가입 상태로 전환됩니다."
          action={
            <button type="button" className="btn btn-primary" onClick={() => navigate('/login')}>
              <LogIn size={16} />
              로그인하기
            </button>
          }
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="nconnect-loading">
        <LoadingSpinner text="계정 연동 상태를 확인하는 중입니다..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="nconnect-page animate-fade">
        <EmptyState
          className="studio-accent--amber"
          icon={<Link2 size={24} />}
          title="연동 상태를 불러오지 못했습니다."
          description={error}
        />
      </div>
    );
  }

  return (
    <div className="nconnect-page animate-fade">
      <PageHero
        accent="amber"
        eyebrow={<StatusBadge className="studio-accent--amber">계정 연동</StatusBadge>}
        title="플랫폼 채널과 넥슨 계정을 모두 연결하면 N-CONNECT 가입 준비가 완료됩니다."
        description="N-CONNECT 멤버십은 플랫폼 채널 연결과 넥슨 계정 연동을 모두 완료한 계정을 기준으로 랭킹과 보상 산정을 시작합니다."
        actions={
          <>
            <button type="button" className="btn btn-primary" onClick={() => onOpenAccountSettings('connection')}>
              <Link2 size={16} />
              채널 연결 관리
            </button>
            <button type="button" className="btn btn-outline" onClick={() => onOpenAccountSettings('game')}>
              <Gamepad2 size={16} />
              넥슨 계정 연동 관리
            </button>
            {status?.membershipJoined ? (
              <button type="button" className="btn btn-outline" onClick={() => onNavigate('nconnect-membership')}>
                <CheckCircle2 size={16} />
                멤버십 상태 보기
              </button>
            ) : null}
          </>
        }
        aside={
          <div className="nconnect-hero-stats">
            <div className={`nconnect-summary-card ${status?.platformConnected ? 'is-complete' : ''}`}>
              <span className="nconnect-summary-card__label">플랫폼 채널</span>
              <strong className="nconnect-summary-card__value">
                {status?.platformConnected ? '연결 완료' : '연결 필요'}
              </strong>
              <p>{status?.channelId ? `${status.platform?.toUpperCase()} / ${status.channelId}` : 'SOOP 또는 치지직 채널 연결이 필요합니다.'}</p>
            </div>
            <div className={`nconnect-summary-card ${status?.nexonConnected ? 'is-complete' : ''}`}>
              <span className="nconnect-summary-card__label">넥슨 계정</span>
              <strong className="nconnect-summary-card__value">
                {status?.nexonConnected ? '연동 완료' : '연동 필요'}
              </strong>
              <p>{status?.nexonAccountId || '넥슨 계정 ID를 연결하면 가입이 자동 활성화됩니다.'}</p>
            </div>
          </div>
        }
      />

      <SectionCard
        accent="amber"
        title="2단계 연동 체크리스트"
        description="현재 상태를 기준으로 어떤 단계가 남아 있는지 바로 확인할 수 있습니다."
      >
        <div className="nconnect-status-grid">
          <article className={`nconnect-status-card ${status?.platformConnected ? 'nconnect-status-card--complete' : 'nconnect-status-card--pending'}`}>
            <div className="nconnect-status-card__header">
              <div className="nconnect-status-card__icon">
                <Link2 size={18} />
              </div>
              <StatusBadge>{status?.platformConnected ? '완료' : '대기'}</StatusBadge>
            </div>
            <span className="nconnect-status-card__label">1단계</span>
            <div className="nconnect-status-card__value">플랫폼 채널 연결</div>
            <p>SOOP 또는 치지직 채널이 연결되어야 N-CONNECT 참여 대상을 식별할 수 있습니다.</p>
            <div className="nconnect-link-actions">
              <button type="button" className="btn btn-outline" onClick={() => onOpenAccountSettings('connection')}>
                채널 연결로 이동
              </button>
            </div>
          </article>

          <article className={`nconnect-status-card ${status?.nexonConnected ? 'nconnect-status-card--complete' : 'nconnect-status-card--pending'}`}>
            <div className="nconnect-status-card__header">
              <div className="nconnect-status-card__icon">
                <Gamepad2 size={18} />
              </div>
              <StatusBadge>{status?.nexonConnected ? '완료' : '대기'}</StatusBadge>
            </div>
            <span className="nconnect-status-card__label">2단계</span>
            <div className="nconnect-status-card__value">넥슨 계정 연동</div>
            <p>넥슨 게임 활동을 포인트로 연결하려면 넥슨 계정 ID와 방송 대상 게임 연결이 필요합니다.</p>
            <div className="nconnect-link-actions">
              <button type="button" className="btn btn-outline" onClick={() => onOpenAccountSettings('game')}>
                넥슨 연동으로 이동
              </button>
            </div>
          </article>

          <article className={`nconnect-status-card ${status?.membershipJoined ? 'nconnect-status-card--complete' : 'nconnect-status-card--pending'}`}>
            <div className="nconnect-status-card__header">
              <div className="nconnect-status-card__icon">
                <CheckCircle2 size={18} />
              </div>
              <StatusBadge>{status?.membershipJoined ? '가입 완료' : '자동 가입 대기'}</StatusBadge>
            </div>
            <span className="nconnect-status-card__label">결과</span>
            <div className="nconnect-status-card__value">멤버십 상태</div>
            <p>두 연동이 모두 완료되면 별도 신청 없이 N-CONNECT 멤버십 상태로 전환됩니다.</p>
            <div className="nconnect-link-actions">
              <button type="button" className="btn btn-primary" onClick={() => onNavigate('nconnect-membership')}>
                멤버십 설명 보기
              </button>
            </div>
          </article>
        </div>
      </SectionCard>

      <div className="nconnect-link-layout">
        <SectionCard
          accent="amber"
          title="계정 연동 프로모션"
          description="연동 완료를 유도하기 위한 기본 보상과 추천 코드 보상을 함께 설계했습니다."
        >
          <div className="nconnect-panel-list">
            {nconnectPromotionRewards.map((item) => (
              <article key={item.title} className="nconnect-panel-card">
                <span className="nconnect-section-kicker">{item.title}</span>
                <strong>{item.value}</strong>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          accent="amber"
          title="지급 정책 요약"
          description="보상 지급 시점과 리스크 방지 정책을 미리 확인할 수 있습니다."
        >
          <ul className="nconnect-status-list">
            <li>기본 보상은 기준 시점에 연동이 유지된 계정에게 월 1회 지급합니다.</li>
            <li>추천 코드 보상은 같은 주기로 넥슨 계정에 적립되며 최대 100만 원까지 누적됩니다.</li>
            <li>실시간 지급 대신 월간 일괄 지급을 적용해 보상 수령 후 즉시 해제하는 리스크를 줄입니다.</li>
            <li>전용 문화상품권은 넥슨과 SOOP에서만 사용 가능하도록 설계해 비용 누수를 막습니다.</li>
          </ul>
        </SectionCard>
      </div>
    </div>
  );
};

export default NConnectLink;
