// 게임 카탈로그 목업 데이터

export const GAME_CATALOG = [
  {
    id: 1,
    name: 'League of Legends',
    nameKr: '리그 오브 레전드',
    genre: 'MOBA',
    genreKr: '멀티플레이어 온라인 배틀 아레나',
    developer: 'Riot Games',
    releaseDate: '2009-10-27',
    description: '5v5 팀 기반 전략 게임으로, 160명 이상의 챔피언 중 선택하여 적의 넥서스를 파괴하는 것이 목표입니다. 전 세계적으로 가장 인기 있는 e스포츠 게임 중 하나입니다.',
    image: 'https://static-cdn.jtvnw.net/ttv-boxart/21779-285x380.jpg',
    currentViewers: 185420,
    liveStreamers: 2840,
    avgViewers: 142000,
    peakViewers: 320000,
    growth: 8.5,
    platforms: ['soop', 'chzzk', 'twitch'],
    tags: ['e스포츠', 'PvP', '팀전', '전략']
  },
  {
    id: 2,
    name: 'VALORANT',
    nameKr: '발로란트',
    genre: 'FPS',
    genreKr: '택티컬 슈터',
    developer: 'Riot Games',
    releaseDate: '2020-06-02',
    description: '5v5 택티컬 슈터 게임으로, 독특한 능력을 가진 에이전트를 선택하여 공격과 수비를 번갈아 진행합니다. 정확한 에임과 팀워크가 중요합니다.',
    image: 'https://static-cdn.jtvnw.net/ttv-boxart/516575-285x380.jpg',
    currentViewers: 98500,
    liveStreamers: 1560,
    avgViewers: 78000,
    peakViewers: 185000,
    growth: 12.3,
    platforms: ['soop', 'chzzk', 'twitch'],
    tags: ['e스포츠', 'FPS', 'PvP', '택티컬']
  },
  {
    id: 3,
    name: 'MapleStory',
    nameKr: '메이플스토리',
    genre: 'MMORPG',
    genreKr: '2D 횡스크롤 MMORPG',
    developer: 'Nexon',
    releaseDate: '2003-04-29',
    description: '2D 횡스크롤 MMORPG의 대명사. 귀여운 그래픽과 다양한 직업, 방대한 콘텐츠로 20년 넘게 사랑받고 있습니다.',
    image: 'https://static-cdn.jtvnw.net/ttv-boxart/19976-285x380.jpg',
    currentViewers: 152000,
    liveStreamers: 520,
    avgViewers: 125000,
    peakViewers: 280000,
    growth: 15.8,
    platforms: ['soop', 'chzzk'],
    tags: ['MMORPG', '2D', '육성', '커뮤니티']
  },
  {
    id: 4,
    name: 'Dungeon & Fighter',
    nameKr: '던전앤파이터',
    genre: 'Action RPG',
    genreKr: '벨트스크롤 액션 RPG',
    developer: 'Neople',
    releaseDate: '2005-08-12',
    description: '벨트스크롤 액션 RPG의 걸작. 다양한 직업과 화려한 스킬, 끊임없는 성장 콘텐츠로 긴 시간 동안 인기를 유지하고 있습니다.',
    image: 'https://static-cdn.jtvnw.net/ttv-boxart/30042_IGDB-285x380.jpg',
    currentViewers: 85000,
    liveStreamers: 380,
    avgViewers: 68000,
    peakViewers: 150000,
    growth: 5.2,
    platforms: ['soop', 'chzzk'],
    tags: ['액션', 'RPG', '아케이드', '격투']
  },
  {
    id: 5,
    name: 'FC Online',
    nameKr: 'FC 온라인',
    genre: 'Sports',
    genreKr: '스포츠 시뮬레이션',
    developer: 'EA Sports / Nexon',
    releaseDate: '2006-05-16',
    description: '전 세계에서 가장 인기 있는 축구 게임 시리즈의 온라인 버전. 실제 선수들과 팀으로 경기를 즐길 수 있습니다.',
    image: 'https://static-cdn.jtvnw.net/ttv-boxart/2748630797-285x380.jpg',
    currentViewers: 72000,
    liveStreamers: 450,
    avgViewers: 58000,
    peakViewers: 120000,
    growth: -2.1,
    platforms: ['soop', 'chzzk'],
    tags: ['스포츠', '축구', 'PvP', '시뮬레이션']
  },
  {
    id: 6,
    name: 'Lost Ark',
    nameKr: '로스트아크',
    genre: 'MMORPG',
    genreKr: '핵앤슬래시 MMORPG',
    developer: 'Smilegate RPG',
    releaseDate: '2018-12-04',
    description: '쿼터뷰 시점의 핵앤슬래시 MMORPG. 화려한 전투와 방대한 콘텐츠, 뛰어난 그래픽으로 국내외에서 인기를 얻고 있습니다.',
    image: 'https://static-cdn.jtvnw.net/ttv-boxart/490100-285x380.jpg',
    currentViewers: 65000,
    liveStreamers: 290,
    avgViewers: 52000,
    peakViewers: 180000,
    growth: -5.8,
    platforms: ['soop', 'chzzk', 'twitch'],
    tags: ['MMORPG', '액션', '레이드', 'PvE']
  },
  {
    id: 7,
    name: 'PUBG: Battlegrounds',
    nameKr: '배틀그라운드',
    genre: 'Battle Royale',
    genreKr: '배틀로얄',
    developer: 'KRAFTON',
    releaseDate: '2017-12-20',
    description: '100명의 플레이어가 섬에 낙하하여 최후의 1인(또는 1팀)이 될 때까지 싸우는 배틀로얄 게임의 원조격 타이틀입니다.',
    image: 'https://static-cdn.jtvnw.net/ttv-boxart/493057-285x380.jpg',
    currentViewers: 45000,
    liveStreamers: 680,
    avgViewers: 38000,
    peakViewers: 95000,
    growth: 3.2,
    platforms: ['soop', 'chzzk', 'twitch'],
    tags: ['배틀로얄', 'FPS', 'PvP', '서바이벌']
  },
  {
    id: 8,
    name: 'Overwatch 2',
    nameKr: '오버워치 2',
    genre: 'FPS',
    genreKr: '히어로 슈터',
    developer: 'Blizzard Entertainment',
    releaseDate: '2022-10-04',
    description: '팀 기반 히어로 슈터. 다양한 역할과 능력을 가진 영웅들을 선택하여 팀과 협력해 목표를 달성합니다.',
    image: 'https://static-cdn.jtvnw.net/ttv-boxart/515025-285x380.jpg',
    currentViewers: 42000,
    liveStreamers: 520,
    avgViewers: 35000,
    peakViewers: 110000,
    growth: -8.5,
    platforms: ['soop', 'chzzk', 'twitch'],
    tags: ['FPS', 'e스포츠', 'PvP', '히어로']
  },
  {
    id: 9,
    name: 'Minecraft',
    nameKr: '마인크래프트',
    genre: 'Sandbox',
    genreKr: '샌드박스',
    developer: 'Mojang Studios',
    releaseDate: '2011-11-18',
    description: '블록으로 이루어진 세계에서 자유롭게 건축하고 탐험하고 생존하는 샌드박스 게임. 무한한 창의성을 발휘할 수 있습니다.',
    image: 'https://static-cdn.jtvnw.net/ttv-boxart/27471_IGDB-285x380.jpg',
    currentViewers: 58000,
    liveStreamers: 890,
    avgViewers: 48000,
    peakViewers: 150000,
    growth: 6.7,
    platforms: ['soop', 'chzzk', 'twitch', 'youtube'],
    tags: ['샌드박스', '서바이벌', '건축', '멀티플레이']
  },
  {
    id: 10,
    name: 'Sudden Attack',
    nameKr: '서든어택',
    genre: 'FPS',
    genreKr: '온라인 FPS',
    developer: 'Nexon',
    releaseDate: '2005-05-04',
    description: '국내 대표 온라인 FPS 게임. 빠른 템포의 총격전과 다양한 모드를 즐길 수 있습니다.',
    image: 'https://static-cdn.jtvnw.net/ttv-boxart/29452_IGDB-285x380.jpg',
    currentViewers: 28000,
    liveStreamers: 180,
    avgViewers: 22000,
    peakViewers: 65000,
    growth: -12.3,
    platforms: ['soop', 'chzzk'],
    tags: ['FPS', 'PvP', '클래식', '택티컬']
  },
  {
    id: 11,
    name: 'Teamfight Tactics',
    nameKr: '전략적 팀 전투',
    genre: 'Auto Battler',
    genreKr: '오토 배틀러',
    developer: 'Riot Games',
    releaseDate: '2019-06-26',
    description: '리그 오브 레전드의 챔피언들을 활용한 오토 배틀러 게임. 전략적 조합과 배치로 승리를 쟁취하세요.',
    image: 'https://static-cdn.jtvnw.net/ttv-boxart/513143-285x380.jpg',
    currentViewers: 38000,
    liveStreamers: 320,
    avgViewers: 30000,
    peakViewers: 85000,
    growth: 18.5,
    platforms: ['soop', 'chzzk', 'twitch'],
    tags: ['전략', '오토배틀러', 'PvP', '캐주얼']
  },
  {
    id: 12,
    name: 'Kartrider: Drift',
    nameKr: '카트라이더: 드리프트',
    genre: 'Racing',
    genreKr: '레이싱',
    developer: 'Nexon',
    releaseDate: '2023-01-11',
    description: '카트라이더 시리즈의 최신작. 드리프트 기반의 레이싱 게임으로 친구들과 함께 즐길 수 있습니다.',
    image: 'https://static-cdn.jtvnw.net/ttv-boxart/1917498796-285x380.jpg',
    currentViewers: 22000,
    liveStreamers: 150,
    avgViewers: 18000,
    peakViewers: 55000,
    growth: 25.2,
    platforms: ['soop', 'chzzk'],
    tags: ['레이싱', '캐주얼', '멀티플레이', '드리프트']
  }
];

// 게임별 탑 스트리머
export const TOP_STREAMERS_BY_GAME = {
  1: [ // League of Legends
    { id: 1, rank: 1, name: 'Faker', platform: 'chzzk', viewers: 45000, avgViewers: 38000, followers: 4500000, influence: 98 },
    { id: 2, rank: 2, name: '도파', platform: 'soop', viewers: 32000, avgViewers: 28000, followers: 2800000, influence: 94 },
    { id: 3, rank: 3, name: '케인', platform: 'chzzk', viewers: 28000, avgViewers: 24000, followers: 1900000, influence: 88 },
    { id: 4, rank: 4, name: '아갈', platform: 'soop', viewers: 18000, avgViewers: 15000, followers: 1200000, influence: 78 },
    { id: 5, rank: 5, name: '빡재', platform: 'chzzk', viewers: 15000, avgViewers: 12000, followers: 980000, influence: 72 }
  ],
  2: [ // VALORANT
    { id: 11, rank: 1, name: '제트킹', platform: 'chzzk', viewers: 25000, avgViewers: 20000, followers: 1800000, influence: 92 },
    { id: 12, rank: 2, name: '발로란트고수', platform: 'soop', viewers: 18000, avgViewers: 15000, followers: 1200000, influence: 85 },
    { id: 13, rank: 3, name: 'VCT선수', platform: 'chzzk', viewers: 15000, avgViewers: 12000, followers: 950000, influence: 80 },
    { id: 14, rank: 4, name: '에임신', platform: 'soop', viewers: 12000, avgViewers: 9500, followers: 720000, influence: 74 },
    { id: 15, rank: 5, name: '택티컬', platform: 'chzzk', viewers: 9500, avgViewers: 7800, followers: 580000, influence: 68 }
  ],
  3: [ // MapleStory
    { id: 21, rank: 1, name: '떡호떡', platform: 'soop', viewers: 42000, avgViewers: 35000, followers: 3200000, influence: 96 },
    { id: 22, rank: 2, name: '메이플킹', platform: 'chzzk', viewers: 28000, avgViewers: 22000, followers: 1800000, influence: 88 },
    { id: 23, rank: 3, name: '보스레이더', platform: 'soop', viewers: 18000, avgViewers: 14000, followers: 1100000, influence: 78 },
    { id: 24, rank: 4, name: '육성장인', platform: 'chzzk', viewers: 12000, avgViewers: 9000, followers: 720000, influence: 68 },
    { id: 25, rank: 5, name: '메린이', platform: 'soop', viewers: 8500, avgViewers: 6800, followers: 450000, influence: 58 }
  ],
  4: [ // Dungeon & Fighter
    { id: 31, rank: 1, name: '던파BJ', platform: 'soop', viewers: 22000, avgViewers: 18000, followers: 1500000, influence: 90 },
    { id: 32, rank: 2, name: '레이드마스터', platform: 'chzzk', viewers: 15000, avgViewers: 12000, followers: 980000, influence: 82 },
    { id: 33, rank: 3, name: '던파사랑', platform: 'soop', viewers: 11000, avgViewers: 8500, followers: 650000, influence: 72 },
    { id: 34, rank: 4, name: '액션킹', platform: 'chzzk', viewers: 8000, avgViewers: 6200, followers: 420000, influence: 64 },
    { id: 35, rank: 5, name: '던린이', platform: 'soop', viewers: 5500, avgViewers: 4200, followers: 280000, influence: 55 }
  ],
  5: [ // FC Online
    { id: 41, rank: 1, name: '피파왕', platform: 'soop', viewers: 18000, avgViewers: 14000, followers: 1200000, influence: 88 },
    { id: 42, rank: 2, name: 'FC프로', platform: 'chzzk', viewers: 12000, avgViewers: 9500, followers: 780000, influence: 78 },
    { id: 43, rank: 3, name: '축구매니아', platform: 'soop', viewers: 8500, avgViewers: 6800, followers: 520000, influence: 68 },
    { id: 44, rank: 4, name: '골키퍼', platform: 'chzzk', viewers: 6000, avgViewers: 4800, followers: 350000, influence: 58 },
    { id: 45, rank: 5, name: 'FC뉴비', platform: 'soop', viewers: 4200, avgViewers: 3500, followers: 220000, influence: 48 }
  ],
  6: [ // Lost Ark
    { id: 51, rank: 1, name: '로아킹', platform: 'chzzk', viewers: 20000, avgViewers: 16000, followers: 1400000, influence: 92 },
    { id: 52, rank: 2, name: '레이드장인', platform: 'soop', viewers: 14000, avgViewers: 11000, followers: 920000, influence: 84 },
    { id: 53, rank: 3, name: '모코코', platform: 'chzzk', viewers: 10000, avgViewers: 8000, followers: 680000, influence: 74 },
    { id: 54, rank: 4, name: '각성러', platform: 'soop', viewers: 7200, avgViewers: 5800, followers: 450000, influence: 65 },
    { id: 55, rank: 5, name: '뉴비가이드', platform: 'chzzk', viewers: 5000, avgViewers: 4000, followers: 280000, influence: 55 }
  ],
  7: [ // PUBG
    { id: 61, rank: 1, name: '치킨왕', platform: 'soop', viewers: 12000, avgViewers: 9500, followers: 850000, influence: 85 },
    { id: 62, rank: 2, name: '배그신', platform: 'chzzk', viewers: 8500, avgViewers: 6800, followers: 580000, influence: 76 },
    { id: 63, rank: 3, name: '스나이퍼', platform: 'soop', viewers: 6200, avgViewers: 5000, followers: 420000, influence: 68 },
    { id: 64, rank: 4, name: '서바이벌', platform: 'chzzk', viewers: 4500, avgViewers: 3600, followers: 280000, influence: 58 },
    { id: 65, rank: 5, name: '뉴비생존러', platform: 'soop', viewers: 3200, avgViewers: 2500, followers: 180000, influence: 48 }
  ],
  8: [ // Overwatch 2
    { id: 71, rank: 1, name: '오버워치프로', platform: 'chzzk', viewers: 11000, avgViewers: 8800, followers: 720000, influence: 82 },
    { id: 72, rank: 2, name: '겐지신', platform: 'soop', viewers: 7500, avgViewers: 6000, followers: 480000, influence: 74 },
    { id: 73, rank: 3, name: '힐러장인', platform: 'chzzk', viewers: 5500, avgViewers: 4400, followers: 320000, influence: 65 },
    { id: 74, rank: 4, name: '탱커왕', platform: 'soop', viewers: 4000, avgViewers: 3200, followers: 220000, influence: 56 },
    { id: 75, rank: 5, name: '오버워치뉴비', platform: 'chzzk', viewers: 2800, avgViewers: 2200, followers: 150000, influence: 46 }
  ],
  9: [ // Minecraft
    { id: 81, rank: 1, name: '우왁굳', platform: 'soop', viewers: 25000, avgViewers: 20000, followers: 2200000, influence: 95 },
    { id: 82, rank: 2, name: '건축왕', platform: 'chzzk', viewers: 12000, avgViewers: 9500, followers: 850000, influence: 80 },
    { id: 83, rank: 3, name: '서바이버', platform: 'soop', viewers: 8000, avgViewers: 6400, followers: 520000, influence: 70 },
    { id: 84, rank: 4, name: '레드스톤', platform: 'chzzk', viewers: 5500, avgViewers: 4400, followers: 350000, influence: 60 },
    { id: 85, rank: 5, name: '마크뉴비', platform: 'soop', viewers: 3800, avgViewers: 3000, followers: 220000, influence: 50 }
  ],
  10: [ // Sudden Attack
    { id: 91, rank: 1, name: '서든레전드', platform: 'soop', viewers: 8000, avgViewers: 6400, followers: 520000, influence: 78 },
    { id: 92, rank: 2, name: '헤드샷왕', platform: 'chzzk', viewers: 5500, avgViewers: 4400, followers: 350000, influence: 68 },
    { id: 93, rank: 3, name: 'FPS고수', platform: 'soop', viewers: 3800, avgViewers: 3000, followers: 220000, influence: 58 },
    { id: 94, rank: 4, name: '서든마니아', platform: 'chzzk', viewers: 2500, avgViewers: 2000, followers: 140000, influence: 48 },
    { id: 95, rank: 5, name: '뉴비슈터', platform: 'soop', viewers: 1800, avgViewers: 1400, followers: 85000, influence: 38 }
  ],
  11: [ // TFT
    { id: 101, rank: 1, name: 'TFT챌린저', platform: 'chzzk', viewers: 12000, avgViewers: 9500, followers: 780000, influence: 86 },
    { id: 102, rank: 2, name: '조합장인', platform: 'soop', viewers: 8000, avgViewers: 6400, followers: 520000, influence: 76 },
    { id: 103, rank: 3, name: '전략가', platform: 'chzzk', viewers: 5500, avgViewers: 4400, followers: 350000, influence: 66 },
    { id: 104, rank: 4, name: 'TFT프로', platform: 'soop', viewers: 3800, avgViewers: 3000, followers: 220000, influence: 56 },
    { id: 105, rank: 5, name: 'TFT뉴비', platform: 'chzzk', viewers: 2500, avgViewers: 2000, followers: 140000, influence: 46 }
  ],
  12: [ // Kartrider: Drift
    { id: 111, rank: 1, name: '드리프트왕', platform: 'soop', viewers: 7500, avgViewers: 6000, followers: 450000, influence: 82 },
    { id: 112, rank: 2, name: '카트프로', platform: 'chzzk', viewers: 5000, avgViewers: 4000, followers: 300000, influence: 72 },
    { id: 113, rank: 3, name: '레이서', platform: 'soop', viewers: 3500, avgViewers: 2800, followers: 200000, influence: 62 },
    { id: 114, rank: 4, name: '카트매니아', platform: 'chzzk', viewers: 2200, avgViewers: 1800, followers: 120000, influence: 52 },
    { id: 115, rank: 5, name: '뉴비레이서', platform: 'soop', viewers: 1500, avgViewers: 1200, followers: 75000, influence: 42 }
  ]
};

// 유틸리티 함수
export const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
};

export const formatFullNumber = (num) => {
  return num.toLocaleString();
};

// 전체 통계 계산
export const getCatalogStats = () => {
  const totalViewers = GAME_CATALOG.reduce((sum, game) => sum + game.currentViewers, 0);
  const totalStreamers = GAME_CATALOG.reduce((sum, game) => sum + game.liveStreamers, 0);
  const topGame = GAME_CATALOG.reduce((max, game) =>
    game.currentViewers > max.currentViewers ? game : max
  );
  const avgGrowth = GAME_CATALOG.reduce((sum, game) => sum + game.growth, 0) / GAME_CATALOG.length;

  return {
    totalViewers,
    totalStreamers,
    topGame,
    avgGrowth
  };
};
