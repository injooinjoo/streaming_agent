import { Award, Coins, Gift, Trophy } from 'lucide-react';
import { PageHero, SectionCard, StatusBadge } from '../shared/studio';
import {
  nconnectHonorRewards,
  nconnectIncentiveBands,
  nconnectPolicyNotes,
  nconnectRewardHighlights,
  nconnectSalaryBands,
  nconnectWelcomeGoods,
} from './nconnectContent';

const NConnectRewards = () => {
  return (
    <div className="nconnect-page animate-fade">
      <PageHero
        accent="amber"
        eyebrow={<StatusBadge className="studio-accent--amber">보상 안내</StatusBadge>}
        title="월급, 인센티브, 명예 보상까지 시즌 운영 구조에 맞춰 설계했습니다."
        description="N-CONNECT는 시즌 누적 기여도 순위에 따른 월급과 월간 성장 순위에 따른 인센티브를 분리 운영합니다. 여기에 트로피, 브랜딩, 굿즈 등 명예 보상이 함께 제공됩니다."
        aside={
          <div className="nconnect-hero-stats">
            {nconnectRewardHighlights.map((item) => (
              <div key={item.title} className="nconnect-summary-card">
                <span className="nconnect-summary-card__label">{item.title}</span>
                <strong className="nconnect-summary-card__value">{item.value}</strong>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        }
      />

      <section className="nconnect-reward-grid" aria-label="보상 요약">
        <article className="nconnect-panel-card">
          <span className="nconnect-section-kicker">월급</span>
          <strong>월 5억원 규모</strong>
          <p>직전 시즌 누적 기여도 순위를 기준으로 시즌 기간 내 매월 10일 지급합니다.</p>
        </article>
        <article className="nconnect-panel-card">
          <span className="nconnect-section-kicker">인센티브</span>
          <strong>월 1.8억원 규모</strong>
          <p>월별 성장 지표 중심으로 계산하며, 당월 데이터를 기준으로 익월 10일 지급합니다.</p>
        </article>
        <article className="nconnect-panel-card">
          <span className="nconnect-section-kicker">명예</span>
          <strong>브랜딩 + 선행 체험</strong>
          <p>트로피, 공식 채널 노출, 선행 체험, 개발자 인터뷰 등 상징적 보상을 설계합니다.</p>
        </article>
        <article className="nconnect-panel-card">
          <span className="nconnect-section-kicker">굿즈</span>
          <strong>{nconnectWelcomeGoods.delivery}</strong>
          <p>가입 후 넥슨 카테고리 방송 10시간 달성 시 웰컴 굿즈 대상자로 선정됩니다.</p>
        </article>
      </section>

      <div className="nconnect-two-column">
        <SectionCard
          accent="amber"
          title="월급 구간표"
          description="프리시즌에는 학습 단계인 만큼 순위 간 보상 차등폭을 최소화해 안정적으로 운영합니다."
        >
          <div className="nconnect-table-wrapper">
            <table className="nconnect-table">
              <thead>
                <tr>
                  <th>구간</th>
                  <th>순위</th>
                  <th>인원</th>
                  <th>월 평균 기본급</th>
                  <th>월 소계</th>
                </tr>
              </thead>
              <tbody>
                {nconnectSalaryBands.map((row) => (
                  <tr key={row.tier}>
                    <td>{row.tier}</td>
                    <td>{row.rankRange}</td>
                    <td>{row.headcount}</td>
                    <td>{row.average}</td>
                    <td>{row.subtotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard
          accent="amber"
          title="인센티브 구간표"
          description="콘텐츠 신청/참여, 뷰어십 성장, 유입 유저 등 월간 성장 지표 중심으로 지급합니다."
        >
          <div className="nconnect-table-wrapper">
            <table className="nconnect-table">
              <thead>
                <tr>
                  <th>구간</th>
                  <th>순위</th>
                  <th>인원</th>
                  <th>월 평균 인센티브</th>
                  <th>월 소계</th>
                </tr>
              </thead>
              <tbody>
                {nconnectIncentiveBands.map((row) => (
                  <tr key={row.tier}>
                    <td>{row.tier}</td>
                    <td>{row.rankRange}</td>
                    <td>{row.headcount}</td>
                    <td>{row.average}</td>
                    <td>{row.subtotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        accent="amber"
        title="명예 보상 단계"
        description="시즌 종료 시점 월급 순위를 기준으로 즉시 실행 영역, 시즌2 개발 영역, 향후 고도화 안건을 구분해 운영합니다."
      >
        <div className="nconnect-status-grid">
          {nconnectHonorRewards.map((phase) => (
            <article key={phase.phase} className="nconnect-phase-card">
              <span className="nconnect-section-kicker">{phase.phase}</span>
              <ul className="nconnect-phase-list">
                {phase.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        accent="amber"
        title="운영 정책"
        description="보상 대상 조건, 해지 처리, 별도 지원금 병행 여부 등 운영 원칙을 정리했습니다."
      >
        <div className="nconnect-status-grid">
          <article className="nconnect-panel-card">
            <div className="nconnect-status-card__icon">
              <Coins size={18} />
            </div>
            <strong>지급 방식</strong>
            <p>월급과 인센티브 모두 현금 기준으로 정산합니다.</p>
          </article>
          <article className="nconnect-panel-card">
            <div className="nconnect-status-card__icon">
              <Award size={18} />
            </div>
            <strong>최소 조건</strong>
            <p>월급은 전월 넥슨 방송 3시간 이상, 인센티브는 콘텐츠 신청/참여 1회 이상이 기본입니다.</p>
          </article>
          <article className="nconnect-panel-card">
            <div className="nconnect-status-card__icon">
              <Gift size={18} />
            </div>
            <strong>지원금 병행</strong>
            <p>콘텐츠 지원금은 N-CONNECT 보상과 별도로 운영하며 더 큰 규모의 콘텐츠 기획을 지원합니다.</p>
          </article>
          <article className="nconnect-panel-card">
            <div className="nconnect-status-card__icon">
              <Trophy size={18} />
            </div>
            <strong>해지 정책</strong>
            <p>멤버십 해지 시에는 익월 정산부터 보상 대상에서 제외됩니다.</p>
          </article>
        </div>
        <ul className="nconnect-status-list">
          {nconnectPolicyNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
};

export default NConnectRewards;
