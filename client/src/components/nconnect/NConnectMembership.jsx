import { CheckCircle2, Gift, LogIn, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../shared/LoadingSpinner';
import { EmptyState, PageHero, SectionCard, StatusBadge } from '../shared/studio';
import { fetchNConnectMembershipStatus } from './api';
import {
  nconnectMembershipFlow,
  nconnectMembershipTargets,
  nconnectSeasonSchedule,
  nconnectWelcomeGoods,
} from './nconnectContent';

const NConnectMembership = ({ onNavigate, onOpenAccountSettings }) => {
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
          title="멤버십 상태는 로그인 후 확인할 수 있습니다."
          description="계정 연동이 완료되면 별도 신청 없이 자동으로 N-CONNECT 멤버십 상태가 활성화됩니다."
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
        <LoadingSpinner text="멤버십 상태를 확인하는 중입니다..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="nconnect-page animate-fade">
        <EmptyState
          className="studio-accent--amber"
          icon={<ShieldCheck size={24} />}
          title="멤버십 상태를 불러오지 못했습니다."
          description={error}
        />
      </div>
    );
  }

  const membershipReady = Boolean(status?.membershipJoined);

  return (
    <div className="nconnect-page animate-fade">
      <PageHero
        accent="amber"
        eyebrow={<StatusBadge className="studio-accent--amber">멤버십 설명</StatusBadge>}
        title="N-CONNECT는 넥슨 게임 방송을 수익, 성장, 명예 보상으로 연결하는 크리에이터 멤버십입니다."
        description="계정 연동이 완료되면 자동 가입 상태로 전환되며, 프리시즌 학습 이후 정규 시즌에서 월급과 인센티브 체계가 본격적으로 적용됩니다."
        actions={
          <>
            {!membershipReady ? (
              <button type="button" className="btn btn-primary" onClick={() => onNavigate('nconnect-link')}>
                <CheckCircle2 size={16} />
                연동 상태 마무리
              </button>
            ) : null}
            <button type="button" className="btn btn-outline" onClick={() => onNavigate('nconnect-rewards')}>
              <Gift size={16} />
              보상 구조 보기
            </button>
          </>
        }
        aside={
          <div className="nconnect-hero-stats">
            <div className="nconnect-summary-card">
              <span className="nconnect-summary-card__label">가입 상태</span>
              <strong className="nconnect-summary-card__value">
                {membershipReady ? '가입 완료' : '자동 가입 대기'}
              </strong>
              <p>
                {membershipReady
                  ? '플랫폼 채널과 넥슨 계정이 모두 연결되어 현재 멤버십 상태입니다.'
                  : '플랫폼 채널과 넥슨 계정을 모두 연결하면 자동으로 가입 완료 처리됩니다.'}
              </p>
            </div>
            <div className="nconnect-summary-card">
              <span className="nconnect-summary-card__label">웰컴 굿즈 기준</span>
              <strong className="nconnect-summary-card__value">10시간 방송</strong>
              <p>{nconnectWelcomeGoods.description}</p>
            </div>
          </div>
        }
      />

      <SectionCard
        accent="amber"
        title="가입 대상"
        description="SOOP과 치지직 모두 파트너, 주력, 포텐셜 그룹을 나눠 단계적으로 온보딩합니다."
      >
        <div className="nconnect-membership-targets">
          {nconnectMembershipTargets.map((target) => (
            <article key={target.group} className="nconnect-tier-card">
              <span className="nconnect-section-kicker">GROUP {target.group}</span>
              <h3>{target.title}</h3>
              <p>{target.description}</p>
              <ul className="nconnect-status-list">
                <li>SOOP: {target.soop}</li>
                <li>치지직: {target.chzzk}</li>
              </ul>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        accent="amber"
        title="멤버십 참여 흐름"
        description="별도 신청서를 작성하지 않아도, 연동과 활동이 완료되면 포인트 집계와 랭킹 반영이 자동으로 진행됩니다."
      >
        <div className="nconnect-steps-grid">
          {nconnectMembershipFlow.map((step) => (
            <article key={step.step} className="nconnect-step-card">
              <div className="nconnect-step-card__number">{step.step}</div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </SectionCard>

      <div className="nconnect-two-column">
        <SectionCard
          accent="amber"
          title="시즌 운영 일정"
          description="프리시즌과 시즌1의 데이터 집계 범위와 지급 시점을 구분해 운영합니다."
        >
          <div className="nconnect-table-wrapper">
            <table className="nconnect-table">
              <thead>
                <tr>
                  <th>시즌</th>
                  <th>데이터 기간</th>
                  <th>월급 지급</th>
                  <th>인센티브 지급</th>
                </tr>
              </thead>
              <tbody>
                {nconnectSeasonSchedule.map((row) => (
                  <tr key={row.season}>
                    <td>{row.season}</td>
                    <td>{row.dataRange}</td>
                    <td>{row.salaryPayout}</td>
                    <td>{row.incentivePayout}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard
          accent="amber"
          title={nconnectWelcomeGoods.title}
          description="멤버십 소속감을 높이고 방송 중 노출 가능한 굿즈를 단계적으로 제공합니다."
        >
          <ul className="nconnect-goods-list">
            {nconnectWelcomeGoods.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="nconnect-inline-actions">
            {!membershipReady ? (
              <button type="button" className="btn btn-outline" onClick={() => onOpenAccountSettings('connection')}>
                연동부터 시작하기
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => onNavigate('nconnect-rewards')}>
                보상 안내 보기
              </button>
            )}
          </div>
          <p className="nconnect-table-note">{nconnectWelcomeGoods.delivery}</p>
        </SectionCard>
      </div>
    </div>
  );
};

export default NConnectMembership;
