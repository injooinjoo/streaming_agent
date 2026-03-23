export const nconnectHighlights = [
  {
    label: '랭킹 보상 대상',
    value: 'TOP 100',
    description: '플랫폼별 상위 100명을 시즌 보상 대상으로 운영합니다.',
  },
  {
    label: '월 최대 월급',
    value: '3,250만원',
    description: '1위~5위 핵심 파트너 구간에 월 차등 지급됩니다.',
  },
  {
    label: '월 최대 인센티브',
    value: '1,400만원',
    description: '전월 대비 성장 중심 월간 인센티브를 별도로 지급합니다.',
  },
  {
    label: '프리시즌',
    value: '2026.04~09',
    description: '학습과 검증을 위한 프리시즌을 먼저 운영합니다.',
  },
];

export const nconnectPointPillars = [
  {
    title: '활동 포인트',
    description: '콘텐츠 주최, 참여, 공식 콘텐츠 섭외까지 넥슨 방송 활동 전반을 점수화합니다.',
    bullets: [
      '주최자: (총 지원금 x 3) + 기본 보장 100p',
      '참여자: 기본 40p + 누적 3·6·9회차 보너스 80p',
      '공식 콘텐츠: 100~1,000p 차등 지급',
    ],
  },
  {
    title: '뷰어십 포인트',
    description: '평균 시청자 수, 방송 시간, 유튜브 영상 등 방송 영향력과 성장 지표를 반영합니다.',
    bullets: [
      '평균 시청자 수와 전월 대비 성장률 반영',
      '방송 시간, 영상 발행 수 등 월간 활동량 반영',
      '랭킹용 누적 기여도와 인센티브용 성장 지표를 분리 운영',
    ],
  },
  {
    title: '인게임 포인트',
    description: '신규 유저 유입과 카테고리 활성화 등 넥슨 게임 생태계에 미친 효과를 반영합니다.',
    bullets: [
      '유입 유저 수 기반 가점',
      '카테고리 활성화 기여도 별도 평가',
      '정규 시즌에서 지표 정교화 예정',
    ],
  },
];

export const nconnectTimeline = [
  {
    date: '2026.04.09',
    title: 'SOOP 프리시즌 시작',
    description: '계정 연동 프로모션 오픈과 N-CONNECT 소개 방송이 함께 시작됩니다.',
  },
  {
    date: '2026.04.09 ~ 04.23',
    title: '치지직 사전예약',
    description: '치지직 스트리머 대상 사전예약과 굿즈 선배송 혜택을 운영합니다.',
  },
  {
    date: '2026.04.23',
    title: '치지직 프리시즌 합류',
    description: 'SOOP과 동일한 구조로 멤버십 참여와 랭킹 집계를 시작합니다.',
  },
  {
    date: '2026.10',
    title: '정규 시즌 1 시작',
    description: '프리시즌 검증 결과를 반영해 월급과 인센티브 체계를 본격 운영합니다.',
  },
];

export const nconnectPromotionRewards = [
  {
    title: '기본 보상',
    value: '문화상품권 5,000원',
    description: 'SOOP과 넥슨에서만 사용 가능한 전용 문화상품권으로 1차 10만 명 한정 운영합니다.',
  },
  {
    title: '추천 코드 보상',
    value: '1건당 1,000원',
    description: '넥슨캐시로 지급되며, 1인당 최대 100만 원까지 누적 가능합니다.',
  },
  {
    title: '지급 방식',
    value: '월 1회 정산',
    description: '기준 시점에 연동이 유지된 계정만 보상하며, 실시간 지급 리스크를 방지합니다.',
  },
];

export const nconnectMembershipTargets = [
  {
    group: 'A',
    title: '플랫폼 파트너 스트리머',
    soop: '80명',
    chzzk: '151명',
    description: '넥슨 방송 비중과 무관하게 100% 가입을 목표로 하는 핵심 파트너 그룹입니다.',
  },
  {
    group: 'B',
    title: '넥슨 주력 스트리머',
    soop: '181명',
    chzzk: '89명',
    description: '플랫폼 상위 2,000명 중 넥슨 게임 방송 비중 50% 이상인 크리에이터입니다.',
  },
  {
    group: 'C',
    title: '포텐셜 스트리머',
    soop: '1,326명',
    chzzk: '805명',
    description: '최근 넥슨 게임 방송을 진행했고 평균 시청자 10명 이상을 기록한 성장 그룹입니다.',
  },
];

export const nconnectMembershipFlow = [
  {
    step: '01',
    title: '플랫폼 + 넥슨 계정 연동',
    description: 'SOOP 또는 치지직 채널과 넥슨 계정을 모두 연결하면 멤버십 진입 준비가 완료됩니다.',
  },
  {
    step: '02',
    title: '넥슨 게임 방송 및 콘텐츠 참여',
    description: '개인 방송, 대회 주최/참여, 공식 콘텐츠 섭외 등 모든 활동이 포인트로 환산됩니다.',
  },
  {
    step: '03',
    title: '월간 집계와 랭킹 반영',
    description: '활동, 뷰어십, 인게임 포인트를 합산해 월간 랭킹과 시즌 누적 순위를 계산합니다.',
  },
  {
    step: '04',
    title: '월급 · 인센티브 · 명예 보상',
    description: '시즌 순위 기반 월급과 월간 성장 기반 인센티브, 시즌 종료 명예 보상이 제공됩니다.',
  },
];

export const nconnectSeasonSchedule = [
  { season: '프리시즌', dataRange: '2026.04 ~ 09', salaryPayout: '10, 11, 12월 매월 10일', incentivePayout: '당월 데이터 → 익월 10일' },
  { season: '시즌 1', dataRange: '2026.10 ~ 12', salaryPayout: '2027.01, 02, 03월 매월 10일', incentivePayout: '당월 데이터 → 익월 10일' },
  { season: '시즌 2~', dataRange: '분기 반복', salaryPayout: '직전 시즌 순위 기준 지급', incentivePayout: '당월 데이터 → 익월 10일' },
];

export const nconnectRewardHighlights = [
  {
    title: '월급',
    value: '월 5억원 규모',
    description: '직전 시즌 누적 기여도 순위를 기준으로 시즌 기간 내 매월 지급합니다.',
  },
  {
    title: '인센티브',
    value: '월 1.8억원 규모',
    description: '전월 대비 성장 지표 중심의 월간 순위를 기준으로 익월 10일 지급합니다.',
  },
  {
    title: '명예 보상',
    value: '브랜딩 + 굿즈',
    description: '트로피, 선행 체험, 브랜딩 노출, 시즌 종료 굿즈를 단계적으로 제공합니다.',
  },
  {
    title: '웰컴 굿즈',
    value: '10시간 방송 달성',
    description: '베스트/프로 이상, 가입 후 넥슨 카테고리 방송 10시간 달성 시 지급합니다.',
  },
];

export const nconnectSalaryBands = [
  { tier: '핵심 파트너', rankRange: '1~5위', headcount: '5명', average: '3,250만원', subtotal: '1.6억원' },
  { tier: '핵심 성장 파트너', rankRange: '6~15위', headcount: '10명', average: '1,550만원', subtotal: '1.6억원' },
  { tier: '안정적 기여 파트너', rankRange: '16~35위', headcount: '20명', average: '650만원', subtotal: '1.3억원' },
  { tier: '참여 유지', rankRange: '36~65위', headcount: '30명', average: '140만원', subtotal: '0.4억원' },
  { tier: '동기부여', rankRange: '66~100위', headcount: '35명', average: '30만원', subtotal: '0.1억원' },
];

export const nconnectIncentiveBands = [
  { tier: '핵심 파트너', rankRange: '1~5위', headcount: '5명', average: '1,400만원', subtotal: '0.7억원' },
  { tier: '핵심 성장 파트너', rankRange: '6~15위', headcount: '10명', average: '600만원', subtotal: '0.6억원' },
  { tier: '안정적 기여 파트너', rankRange: '16~35위', headcount: '20명', average: '150만원', subtotal: '0.3억원' },
  { tier: '참여 유지', rankRange: '36~65위', headcount: '30명', average: '55만원', subtotal: '0.17억원' },
  { tier: '동기부여', rankRange: '66~100위', headcount: '35명', average: '10만원', subtotal: '0.035억원' },
];

export const nconnectHonorRewards = [
  {
    phase: '즉시 실행',
    items: [
      '1~5위 브랜딩/홍보 지원',
      '1~100위 업데이트 선행 체험 및 개발자 인터뷰 기회',
      '1~100위 시즌 개인화 트로피/상패',
    ],
  },
  {
    phase: '시즌 2~ 개발 필요',
    items: [
      '1위 콜라보 아이템 패키지',
      '1위 인게임 전용 NPC',
      '1위 전용 이펙트 및 치장 아이템',
    ],
  },
  {
    phase: '향후 고도화',
    items: [
      '시즌별 누적 스택형 명예 보상',
      '옥외 광고 및 오프라인 브랜딩',
      '외부 브랜드 콜라보와 개인 굿즈 제작 지원',
    ],
  },
];

export const nconnectPolicyNotes = [
  '월급 최소 방송 조건은 전월 넥슨 방송 3시간 이상입니다.',
  '월급에는 최소 콘텐츠 참여 조건을 두지 않되, 인센티브는 콘텐츠 신청/참여 1회 이상이 기본 조건입니다.',
  '해지 시에는 익월 정산부터 보상 대상에서 제외됩니다.',
  '콘텐츠 지원금은 N-CONNECT 보상 체계와 별도로 병행 운영됩니다.',
];

export const nconnectWelcomeGoods = {
  title: '웰컴 굿즈 지급 기준',
  description: 'N-CONNECT 가입 후 넥슨 게임 카테고리 방송 10시간을 달성한 베스트/프로 이상 스트리머에게 지급합니다.',
  items: ['사원증', 'NFC 명함', '앞접시 그릇', '한글 수저 세트'],
  delivery: '매월 말일 기준 선정 후 익월 18일 발송',
};
