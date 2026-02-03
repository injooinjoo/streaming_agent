/**
 * 넥슨 게임 오버레이 템플릿 데이터
 * 6가지 유형 × 5개 넥슨 게임 = 30개 템플릿
 */

export const TEMPLATE_TYPES = [
  { id: 'all', label: '전체' },
  { id: 'qr-install', label: 'QR 설치' },
  { id: 'event-promo', label: '이벤트' },
  { id: 'coupon', label: '쿠폰' },
  { id: 'download-cta', label: '다운로드' },
  { id: 'friend-invite', label: '친구 초대' },
  { id: 'new-update', label: '업데이트' },
];

export const GAME_FILTERS = [
  { id: 'all', label: '전체', icon: '🎮' },
  { id: 'maplestory', label: '메이플스토리', icon: '🍁' },
  { id: 'fconline', label: 'FC온라인', icon: '⚽' },
  { id: 'suddenattack', label: '서든어택', icon: '🔫' },
  { id: 'dnf', label: '던파', icon: '⚔️' },
  { id: 'kart', label: '카트라이더', icon: '🏎️' },
];

const GAME_COLORS = {
  maplestory: ['#ff9800', '#ff6d00'],
  fconline: ['#1a73e8', '#0d47a1'],
  suddenattack: ['#e53935', '#b71c1c'],
  dnf: ['#7c4dff', '#6200ea'],
  kart: ['#00bcd4', '#006064'],
};

export const NEXON_TEMPLATES = [
  // ===== QR 설치 유도 =====
  {
    id: 'maple-qr',
    type: 'qr-install',
    game: 'maplestory',
    gameIcon: '🍁',
    title: '메이플스토리 설치하기',
    description: 'QR 스캔으로 바로 설치',
    color: GAME_COLORS.maplestory,
    previewData: {
      qrUrl: 'https://maplestory.nexon.com/Download',
      ctaText: '지금 시작하기',
      subtitle: '스트리머가 플레이 중',
      tagline: '함께 모험을 떠나요!',
    }
  },
  {
    id: 'fc-qr',
    type: 'qr-install',
    game: 'fconline',
    gameIcon: '⚽',
    title: 'FC온라인 설치하기',
    description: 'QR 스캔으로 바로 설치',
    color: GAME_COLORS.fconline,
    previewData: {
      qrUrl: 'https://fconline.nexon.com/Download',
      ctaText: '무료 다운로드',
      subtitle: '실시간 축구 대전',
      tagline: '나만의 팀을 만들어보세요',
    }
  },
  {
    id: 'sa-qr',
    type: 'qr-install',
    game: 'suddenattack',
    gameIcon: '🔫',
    title: '서든어택 설치하기',
    description: 'QR 스캔으로 바로 설치',
    color: GAME_COLORS.suddenattack,
    previewData: {
      qrUrl: 'https://sa.nexon.com/Download',
      ctaText: '지금 참전하기',
      subtitle: '국민 FPS 게임',
      tagline: '전장에서 만나요!',
    }
  },
  {
    id: 'dnf-qr',
    type: 'qr-install',
    game: 'dnf',
    gameIcon: '⚔️',
    title: '던전앤파이터 설치하기',
    description: 'QR 스캔으로 바로 설치',
    color: GAME_COLORS.dnf,
    previewData: {
      qrUrl: 'https://df.nexon.com/Download',
      ctaText: '모험 시작하기',
      subtitle: '액션 RPG의 전설',
      tagline: '아라드 대륙이 기다립니다',
    }
  },
  {
    id: 'kart-qr',
    type: 'qr-install',
    game: 'kart',
    gameIcon: '🏎️',
    title: '카트라이더 설치하기',
    description: 'QR 스캔으로 바로 설치',
    color: GAME_COLORS.kart,
    previewData: {
      qrUrl: 'https://kart.nexon.com/Download',
      ctaText: '레이싱 시작',
      subtitle: '스피드의 한계를 넘어',
      tagline: '누구나 즐기는 레이싱',
    }
  },

  // ===== 이벤트 프로모션 =====
  {
    id: 'maple-event',
    type: 'event-promo',
    game: 'maplestory',
    gameIcon: '🍁',
    title: '하이퍼 버닝 이벤트',
    description: '신규/복귀 유저 성장 지원',
    color: GAME_COLORS.maplestory,
    previewData: {
      eventTitle: '하이퍼 버닝 PLUS',
      eventSubtitle: 'Lv.250까지 초고속 성장!',
      period: '2026.02.05 ~ 03.05',
      reward: '극한 성장의 비약 100개',
      ctaText: '이벤트 참여하기',
    }
  },
  {
    id: 'fc-event',
    type: 'event-promo',
    game: 'fconline',
    gameIcon: '⚽',
    title: '시즌 오프닝 페스타',
    description: '신규 시즌 기념 대규모 이벤트',
    color: GAME_COLORS.fconline,
    previewData: {
      eventTitle: '26 TOTY 시즌 오픈',
      eventSubtitle: '역대급 선수카드 등장!',
      period: '2026.02.01 ~ 02.28',
      reward: 'TOTY 선수팩 1개',
      ctaText: '선수팩 받으러 가기',
    }
  },
  {
    id: 'sa-event',
    type: 'event-promo',
    game: 'suddenattack',
    gameIcon: '🔫',
    title: '신규 맵 오픈 이벤트',
    description: '신규 맵 플레이 보상',
    color: GAME_COLORS.suddenattack,
    previewData: {
      eventTitle: '네온시티 맵 오픈!',
      eventSubtitle: '야간 시가전의 긴장감',
      period: '2026.02.10 ~ 03.10',
      reward: '영구 무기 선택권',
      ctaText: '전투 참여하기',
    }
  },
  {
    id: 'dnf-event',
    type: 'event-promo',
    game: 'dnf',
    gameIcon: '⚔️',
    title: '네오 각성 업데이트',
    description: '전직업 네오 각성 이벤트',
    color: GAME_COLORS.dnf,
    previewData: {
      eventTitle: '네오 각성 페스티벌',
      eventSubtitle: '새로운 각성의 힘을 경험하세요',
      period: '2026.02.15 ~ 03.15',
      reward: '각성 지원 패키지',
      ctaText: '각성하러 가기',
    }
  },
  {
    id: 'kart-event',
    type: 'event-promo',
    game: 'kart',
    gameIcon: '🏎️',
    title: '그랑프리 시즌 오픈',
    description: '시즌 그랑프리 대회',
    color: GAME_COLORS.kart,
    previewData: {
      eventTitle: '2026 그랑프리 시즌 3',
      eventSubtitle: '최강 레이서를 가려라!',
      period: '2026.02.01 ~ 04.30',
      reward: '전설 카트 선택권',
      ctaText: '그랑프리 참가',
    }
  },

  // ===== 쿠폰 코드 =====
  {
    id: 'maple-coupon',
    type: 'coupon',
    game: 'maplestory',
    gameIcon: '🍁',
    title: '메이플 방송 전용 쿠폰',
    description: '시청자 전용 아이템 쿠폰',
    color: GAME_COLORS.maplestory,
    previewData: {
      couponCode: 'MAPLE-STREAM-2026',
      reward: '경험치 2배 쿠폰 (1시간) × 3',
      expiry: '2026년 2월 말까지',
      ctaText: '쿠폰 입력하기',
    }
  },
  {
    id: 'fc-coupon',
    type: 'coupon',
    game: 'fconline',
    gameIcon: '⚽',
    title: 'FC온라인 시청 보상',
    description: '방송 시청자 전용 코드',
    color: GAME_COLORS.fconline,
    previewData: {
      couponCode: 'FCLIVE-FEB-2026',
      reward: '강화 보호권 × 2',
      expiry: '선착순 1,000명',
      ctaText: '쿠폰 등록하기',
    }
  },
  {
    id: 'sa-coupon',
    type: 'coupon',
    game: 'suddenattack',
    gameIcon: '🔫',
    title: '서든 스트리밍 코드',
    description: '시청자 전용 무기 스킨',
    color: GAME_COLORS.suddenattack,
    previewData: {
      couponCode: 'SA-LIVE-GIFT',
      reward: '스페셜 무기 스킨 박스',
      expiry: '이번 방송 한정',
      ctaText: '코드 입력하기',
    }
  },
  {
    id: 'dnf-coupon',
    type: 'coupon',
    game: 'dnf',
    gameIcon: '⚔️',
    title: '던파 생방송 쿠폰',
    description: '아라드 모험가 전용 보상',
    color: GAME_COLORS.dnf,
    previewData: {
      couponCode: 'DNF-ARAD-2026',
      reward: '세리아의 풀 패키지',
      expiry: '2026년 3월 1일까지',
      ctaText: '보상 받기',
    }
  },
  {
    id: 'kart-coupon',
    type: 'coupon',
    game: 'kart',
    gameIcon: '🏎️',
    title: '카트 라이브 보상 코드',
    description: '시청자 전용 카트 코드',
    color: GAME_COLORS.kart,
    previewData: {
      couponCode: 'KART-RACE-2026',
      reward: '레어 카트 7일 이용권',
      expiry: '이번 주 일요일까지',
      ctaText: '쿠폰 사용하기',
    }
  },

  // ===== 다운로드 CTA =====
  {
    id: 'maple-cta',
    type: 'download-cta',
    game: 'maplestory',
    gameIcon: '🍁',
    title: '메이플스토리 다운로드',
    description: '20주년 기념 역대급 혜택',
    color: GAME_COLORS.maplestory,
    previewData: {
      headline: '메이플스토리',
      tagline: '20년간 사랑받는 MMORPG',
      stats: { players: '200만+', rating: '4.7', years: '20주년' },
      ctaText: '무료 다운로드',
    }
  },
  {
    id: 'fc-cta',
    type: 'download-cta',
    game: 'fconline',
    gameIcon: '⚽',
    title: 'FC온라인 다운로드',
    description: '리얼 축구 시뮬레이션',
    color: GAME_COLORS.fconline,
    previewData: {
      headline: 'FC온라인',
      tagline: '세계 최대 축구 게임',
      stats: { players: '500만+', rating: '4.5', matches: '1억 경기' },
      ctaText: '지금 시작하기',
    }
  },
  {
    id: 'sa-cta',
    type: 'download-cta',
    game: 'suddenattack',
    gameIcon: '🔫',
    title: '서든어택 다운로드',
    description: '국민 FPS의 귀환',
    color: GAME_COLORS.suddenattack,
    previewData: {
      headline: '서든어택',
      tagline: '대한민국 No.1 FPS',
      stats: { players: '300만+', rating: '4.3', maps: '50+ 맵' },
      ctaText: '참전하기',
    }
  },
  {
    id: 'dnf-cta',
    type: 'download-cta',
    game: 'dnf',
    gameIcon: '⚔️',
    title: '던전앤파이터 다운로드',
    description: '벨트스크롤 액션의 정점',
    color: GAME_COLORS.dnf,
    previewData: {
      headline: '던전앤파이터',
      tagline: '최고의 2D 액션 RPG',
      stats: { players: '800만+', rating: '4.6', classes: '60+ 직업' },
      ctaText: '모험 시작',
    }
  },
  {
    id: 'kart-cta',
    type: 'download-cta',
    game: 'kart',
    gameIcon: '🏎️',
    title: '카트라이더 다운로드',
    description: '누구나 즐기는 레이싱',
    color: GAME_COLORS.kart,
    previewData: {
      headline: '카트라이더',
      tagline: '국민 레이싱 게임',
      stats: { players: '150만+', rating: '4.4', tracks: '200+ 트랙' },
      ctaText: '레이싱 시작',
    }
  },

  // ===== 친구 초대 =====
  {
    id: 'maple-invite',
    type: 'friend-invite',
    game: 'maplestory',
    gameIcon: '🍁',
    title: '메이플 친구 초대',
    description: '초대하고 함께 성장하기',
    color: GAME_COLORS.maplestory,
    previewData: {
      inviteCode: 'MAPLE-FRIEND-2026',
      qrUrl: 'https://maplestory.nexon.com/Invite',
      reward: '초대자: 메소 1억 / 피초대자: Lv.200 즉시 달성',
      ctaText: '초대 코드 복사',
      count: '127명이 참여 중',
    }
  },
  {
    id: 'fc-invite',
    type: 'friend-invite',
    game: 'fconline',
    gameIcon: '⚽',
    title: 'FC온라인 친구 초대',
    description: '함께하면 더 즐거운 축구',
    color: GAME_COLORS.fconline,
    previewData: {
      inviteCode: 'FCINVITE-2026',
      qrUrl: 'https://fconline.nexon.com/Invite',
      reward: '초대자: 선수팩 / 피초대자: 스타터 패키지',
      ctaText: '친구 초대하기',
      count: '89명이 참여 중',
    }
  },
  {
    id: 'sa-invite',
    type: 'friend-invite',
    game: 'suddenattack',
    gameIcon: '🔫',
    title: '서든 전우 초대',
    description: '전우와 함께 전장으로',
    color: GAME_COLORS.suddenattack,
    previewData: {
      inviteCode: 'SA-SQUAD-2026',
      qrUrl: 'https://sa.nexon.com/Invite',
      reward: '초대자: 레어 무기 / 피초대자: 입문 세트',
      ctaText: '전우 초대하기',
      count: '56명이 참여 중',
    }
  },
  {
    id: 'dnf-invite',
    type: 'friend-invite',
    game: 'dnf',
    gameIcon: '⚔️',
    title: '던파 모험가 초대',
    description: '아라드에 동료를 불러오세요',
    color: GAME_COLORS.dnf,
    previewData: {
      inviteCode: 'DNF-PARTY-2026',
      qrUrl: 'https://df.nexon.com/Invite',
      reward: '초대자: 에픽 무기 / 피초대자: 성장 지원 패키지',
      ctaText: '동료 초대',
      count: '203명이 참여 중',
    }
  },
  {
    id: 'kart-invite',
    type: 'friend-invite',
    game: 'kart',
    gameIcon: '🏎️',
    title: '카트 라이벌 초대',
    description: '친구와 레이싱 대결',
    color: GAME_COLORS.kart,
    previewData: {
      inviteCode: 'KART-RIVAL-2026',
      qrUrl: 'https://kart.nexon.com/Invite',
      reward: '초대자: 레어 카트 / 피초대자: 스타터 카트 세트',
      ctaText: '라이벌 초대',
      count: '74명이 참여 중',
    }
  },

  // ===== 신규 업데이트 =====
  {
    id: 'maple-update',
    type: 'new-update',
    game: 'maplestory',
    gameIcon: '🍁',
    title: 'NEW AGE 업데이트',
    description: '신규 대륙 & 6차 전직',
    color: GAME_COLORS.maplestory,
    previewData: {
      version: 'v2.50',
      updateTitle: 'NEW AGE: 탈리스만',
      highlights: ['신규 대륙 탈리스만', '6차 전직 스킬 추가', '유니온 시스템 개편'],
      ctaText: '업데이트 확인',
    }
  },
  {
    id: 'fc-update',
    type: 'new-update',
    game: 'fconline',
    gameIcon: '⚽',
    title: 'TOTY 시즌 업데이트',
    description: '올해의 팀 선수 등장',
    color: GAME_COLORS.fconline,
    previewData: {
      version: 'Season 26',
      updateTitle: 'Team of the Year 2026',
      highlights: ['TOTY 선수카드 12종', '신규 전술 시스템', 'AI 매칭 개선'],
      ctaText: '시즌 확인',
    }
  },
  {
    id: 'sa-update',
    type: 'new-update',
    game: 'suddenattack',
    gameIcon: '🔫',
    title: '서든 대규모 패치',
    description: '신규 모드 & 무기 추가',
    color: GAME_COLORS.suddenattack,
    previewData: {
      version: 'v3.80',
      updateTitle: '배틀로얄 모드 추가',
      highlights: ['100인 배틀로얄', '신규 무기 5종', '랭크 시스템 개편'],
      ctaText: '패치노트 보기',
    }
  },
  {
    id: 'dnf-update',
    type: 'new-update',
    game: 'dnf',
    gameIcon: '⚔️',
    title: '던파 대규모 업데이트',
    description: '신규 레이드 & 직업 밸런스',
    color: GAME_COLORS.dnf,
    previewData: {
      version: 'v1.85',
      updateTitle: '오즈마 레이드 시즌 2',
      highlights: ['오즈마 레이드 신규 페이즈', '전직업 밸런스 패치', '에픽 개편'],
      ctaText: '업데이트 보기',
    }
  },
  {
    id: 'kart-update',
    type: 'new-update',
    game: 'kart',
    gameIcon: '🏎️',
    title: '카트라이더 신규 시즌',
    description: '신규 카트 & 트랙 추가',
    color: GAME_COLORS.kart,
    previewData: {
      version: 'Season 8',
      updateTitle: '네온 드리프트 시즌',
      highlights: ['신규 트랙 10개', '레전드 카트 3종', '커스터마이징 확장'],
      ctaText: '시즌 시작',
    }
  },
];
