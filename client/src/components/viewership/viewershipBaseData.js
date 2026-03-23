export const PLATFORM_META = {
  soop: { key: 'soop', label: 'SOOP', color: '#3b82f6', pageId: 'platform-soop' },
  chzzk: { key: 'chzzk', label: '치지직', color: '#10b981', pageId: 'platform-chzzk' },
  twitch: { key: 'twitch', label: '트위치', color: '#9146ff', pageId: 'platform-twitch' },
  cimi: { key: 'cimi', label: '씨미', color: '#fb7185', pageId: 'platform-cimi' },
};

export const VIEWERSHIP_PLATFORM_KEYS = Object.keys(PLATFORM_META);

export const VIEWERSHIP_PLATFORM_OPTIONS = VIEWERSHIP_PLATFORM_KEYS.map((key) => ({
  key,
  label: PLATFORM_META[key].label,
  color: PLATFORM_META[key].color,
  pageId: PLATFORM_META[key].pageId,
}));

export const STREAMERS = [
  { personId: 's101', name: '우왁굳', platform: 'chzzk', mainCategory: '종합게임', gameId: 2, liveViewers: 79790, avgViewers: 68420, followers: 1870000, marketScore: 98.4, growth: 12.2, chatDensity: 93, group: '종합게임 연합', isVirtual: false },
  { personId: 's102', name: '이세계아이돌', platform: 'cimi', mainCategory: '버추얼 아이돌', gameId: 7, liveViewers: 75540, avgViewers: 65520, followers: 2250000, marketScore: 97.8, growth: 8.1, chatDensity: 96, group: '버추얼 클러스터', isVirtual: true },
  { personId: 's103', name: '감스트', platform: 'soop', mainCategory: 'FC 온라인', gameId: 4, liveViewers: 62100, avgViewers: 54880, followers: 1450000, marketScore: 95.6, growth: 6.4, chatDensity: 88, group: '토크 프라임', isVirtual: false },
  { personId: 's104', name: '풍월량', platform: 'chzzk', mainCategory: '리그 오브 레전드', gameId: 1, liveViewers: 59320, avgViewers: 52140, followers: 1280000, marketScore: 94.9, growth: 4.8, chatDensity: 84, group: '종합게임 연합', isVirtual: false },
  { personId: 's105', name: '김도', platform: 'soop', mainCategory: '저스트 채팅', gameId: 3, liveViewers: 48700, avgViewers: 40120, followers: 930000, marketScore: 92.4, growth: 3.5, chatDensity: 82, group: '토크 프라임', isVirtual: false },
  { personId: 's106', name: '랄로', platform: 'twitch', mainCategory: '발로란트', gameId: 5, liveViewers: 45880, avgViewers: 39220, followers: 870000, marketScore: 91.8, growth: 5.4, chatDensity: 86, group: 'FPS 스쿼드', isVirtual: false },
  { personId: 's107', name: '따효니', platform: 'chzzk', mainCategory: '배틀그라운드', gameId: 8, liveViewers: 43320, avgViewers: 35140, followers: 710000, marketScore: 90.5, growth: 7.9, chatDensity: 81, group: 'FPS 스쿼드', isVirtual: false },
  { personId: 's108', name: '침착맨', platform: 'soop', mainCategory: '저스트 채팅', gameId: 3, liveViewers: 41280, avgViewers: 36510, followers: 2010000, marketScore: 93.7, growth: 2.8, chatDensity: 79, group: '토크 프라임', isVirtual: false },
  { personId: 's109', name: '릴파', platform: 'cimi', mainCategory: '버추얼', gameId: 7, liveViewers: 40210, avgViewers: 33870, followers: 980000, marketScore: 94.1, growth: 11.6, chatDensity: 95, group: '버추얼 클러스터', isVirtual: true },
  { personId: 's110', name: '강지', platform: 'cimi', mainCategory: '버추얼', gameId: 7, liveViewers: 36520, avgViewers: 30110, followers: 760000, marketScore: 92.6, growth: 10.9, chatDensity: 92, group: '버추얼 클러스터', isVirtual: true },
  { personId: 's111', name: '쫀득', platform: 'chzzk', mainCategory: 'FC 온라인', gameId: 4, liveViewers: 34880, avgViewers: 28400, followers: 640000, marketScore: 89.5, growth: 6.1, chatDensity: 78, group: 'FPS 스쿼드', isVirtual: false },
  { personId: 's112', name: '악어', platform: 'soop', mainCategory: '메이플스토리', gameId: 6, liveViewers: 33210, avgViewers: 26420, followers: 520000, marketScore: 88.8, growth: 9.7, chatDensity: 75, group: 'MMO 길드', isVirtual: false },
];

export const NEW_STREAMERS = [
  { personId: 's201', name: '루나하루', platform: 'chzzk', mainCategory: '리그 오브 레전드', gameId: 1, avgViewers: 12400, liveViewers: 16100, followers: 98000, marketScore: 86.4, growth: 48.2, chatDensity: 88, group: '신규 성장', isVirtual: false },
  { personId: 's202', name: '다온아이', platform: 'cimi', mainCategory: '버추얼', gameId: 7, avgViewers: 11800, liveViewers: 15220, followers: 143000, marketScore: 89.2, growth: 55.1, chatDensity: 95, group: '신규 성장', isVirtual: true },
  { personId: 's203', name: '재어스', platform: 'twitch', mainCategory: '발로란트', gameId: 5, avgViewers: 9300, liveViewers: 11800, followers: 71000, marketScore: 84.8, growth: 39.4, chatDensity: 83, group: '신규 성장', isVirtual: false },
  { personId: 's204', name: '메아리', platform: 'soop', mainCategory: '저스트 채팅', gameId: 3, avgViewers: 8600, liveViewers: 10940, followers: 65000, marketScore: 82.7, growth: 33.1, chatDensity: 81, group: '신규 성장', isVirtual: false },
];

export const CATEGORY_DEFS = [
  { gameId: 1, name: '리그 오브 레전드', platformStats: { chzzk: { viewers: 145000, liveChannels: 20, score: 97.4, growth: 18.6, chatDensity: 91 }, soop: { viewers: 89000, liveChannels: 14, score: 95.1, growth: 14.2, chatDensity: 87 }, twitch: { viewers: 45000, liveChannels: 8, score: 88.4, growth: 6.1, chatDensity: 90 } } },
  { gameId: 2, name: '종합게임', platformStats: { chzzk: { viewers: 128000, liveChannels: 24, score: 95.8, growth: 11.2, chatDensity: 88 }, soop: { viewers: 76000, liveChannels: 18, score: 92.7, growth: 8.3, chatDensity: 84 }, cimi: { viewers: 37000, liveChannels: 16, score: 93.2, growth: 15.4, chatDensity: 90 } } },
  { gameId: 3, name: '저스트 채팅', platformStats: { soop: { viewers: 102000, liveChannels: 62, score: 91.7, growth: 5.4, chatDensity: 83 }, chzzk: { viewers: 64000, liveChannels: 43, score: 89.2, growth: 4.1, chatDensity: 80 }, twitch: { viewers: 32000, liveChannels: 21, score: 86.4, growth: 2.7, chatDensity: 82 } } },
  { gameId: 4, name: 'FC 온라인', platformStats: { soop: { viewers: 102000, liveChannels: 18, score: 92.8, growth: 13.3, chatDensity: 86 }, chzzk: { viewers: 65000, liveChannels: 13, score: 90.8, growth: 11.0, chatDensity: 84 } } },
  { gameId: 5, name: '발로란트', platformStats: { twitch: { viewers: 82000, liveChannels: 15, score: 90.9, growth: 9.8, chatDensity: 89 }, chzzk: { viewers: 70000, liveChannels: 14, score: 89.8, growth: 8.7, chatDensity: 86 } } },
  { gameId: 6, name: '메이플스토리', platformStats: { soop: { viewers: 74000, liveChannels: 21, score: 89.6, growth: 15.9, chatDensity: 78 }, chzzk: { viewers: 60000, liveChannels: 16, score: 87.9, growth: 13.4, chatDensity: 76 } } },
  { gameId: 7, name: '버추얼', platformStats: { cimi: { viewers: 132000, liveChannels: 16, score: 96.8, growth: 21.4, chatDensity: 97 }, chzzk: { viewers: 57000, liveChannels: 8, score: 92.3, growth: 16.9, chatDensity: 92 } } },
  { gameId: 8, name: '배틀그라운드', platformStats: { chzzk: { viewers: 73000, liveChannels: 14, score: 87.9, growth: 7.1, chatDensity: 80 }, twitch: { viewers: 45000, liveChannels: 9, score: 84.1, growth: 4.8, chatDensity: 78 } } },
];

export const BROADCAST_GROUP_DEFS = [
  { id: 'virtual-cluster', name: '버추얼 클러스터', lead: '이세계아이돌', pageId: 'streamer-virtual', platformStats: { cimi: { viewers: 182300, liveChannels: 24, score: 97.2, growth: 14.2, chatDensity: 96 }, chzzk: { viewers: 82400, liveChannels: 11, score: 92.1, growth: 10.8, chatDensity: 91 } } },
  { id: 'talk-prime', name: '토크 프라임', lead: '침착맨', pageId: 'streamer-chat', platformStats: { soop: { viewers: 154800, liveChannels: 42, score: 91.4, growth: 6.7, chatDensity: 81 }, chzzk: { viewers: 68200, liveChannels: 19, score: 88.9, growth: 4.8, chatDensity: 79 }, twitch: { viewers: 21400, liveChannels: 9, score: 85.1, growth: 2.2, chatDensity: 76 } } },
  { id: 'fps-squad', name: 'FPS 스쿼드', lead: '랄로', pageId: 'category-chat', platformStats: { chzzk: { viewers: 69400, liveChannels: 17, score: 89.8, growth: 8.4, chatDensity: 84 }, twitch: { viewers: 54000, liveChannels: 14, score: 87.2, growth: 5.6, chatDensity: 86 } } },
  { id: 'mmo-guild', name: 'MMO 길드', lead: '악어', pageId: 'category-growth', platformStats: { soop: { viewers: 76400, liveChannels: 18, score: 86.9, growth: 10.5, chatDensity: 77 }, chzzk: { viewers: 44200, liveChannels: 12, score: 84.4, growth: 8.2, chatDensity: 73 } } },
];

export const AUDIENCE_SEGMENT_DEFS = [
  { id: 'core', name: '핵심 시청층', subtitle: '재방문 · 채팅 주도', platformStats: { soop: { score: 94, members: 11, delta: 3.4 }, chzzk: { score: 95, members: 14, delta: 4.1 }, twitch: { score: 86, members: 5, delta: 1.8 }, cimi: { score: 97, members: 8, delta: 5.2 } } },
  { id: 'expand', name: '확장 시청층', subtitle: '알고리즘 · 재유입', platformStats: { soop: { score: 89, members: 20, delta: 2.7 }, chzzk: { score: 91, members: 22, delta: 3.3 }, twitch: { score: 82, members: 8, delta: 1.2 }, cimi: { score: 90, members: 11, delta: 4.6 } } },
  { id: 'new-interest', name: '신규 관심군', subtitle: '클립 · 이벤트 유입', platformStats: { soop: { score: 82, members: 31, delta: 3.5 }, chzzk: { score: 84, members: 33, delta: 4.0 }, twitch: { score: 79, members: 14, delta: 2.1 }, cimi: { score: 87, members: 18, delta: 6.2 } } },
  { id: 'returning', name: '복귀 시청층', subtitle: '휴면 시청자 재활성', platformStats: { soop: { score: 74, members: 42, delta: 1.5 }, chzzk: { score: 76, members: 39, delta: 1.9 }, twitch: { score: 70, members: 16, delta: 0.8 }, cimi: { score: 79, members: 21, delta: 2.8 } } },
];

export const PLATFORM_SNAPSHOT = {
  soop: { platform: 'soop', viewers: 305410, peakViewers: 376479, liveChannels: 4556, marketScore: 94.2, delta: 2.6, chatDensity: 82, avgStayMinutes: 41 },
  chzzk: { platform: 'chzzk', viewers: 246847, peakViewers: 272995, liveChannels: 5256, marketScore: 95.8, delta: 4.1, chatDensity: 89, avgStayMinutes: 35 },
  twitch: { platform: 'twitch', viewers: 68430, peakViewers: 82100, liveChannels: 1210, marketScore: 82.4, delta: -1.3, chatDensity: 74, avgStayMinutes: 28 },
  cimi: { platform: 'cimi', viewers: 132860, peakViewers: 155400, liveChannels: 980, marketScore: 88.9, delta: 5.9, chatDensity: 93, avgStayMinutes: 48 },
};

export const DAILY_PLATFORM_METRICS = [
  { label: '03/11', soop: { viewers: 282000, score: 92.8, growth: 4.5, channels: 4210, chats: 78 }, chzzk: { viewers: 224000, score: 93.5, growth: 6.4, channels: 4820, chats: 84 }, twitch: { viewers: 61200, score: 83.6, growth: -0.2, channels: 1080, chats: 70 }, cimi: { viewers: 108000, score: 84.9, growth: 3.1, channels: 820, chats: 86 } },
  { label: '03/12', soop: { viewers: 288400, score: 93.1, growth: 4.8, channels: 4290, chats: 79 }, chzzk: { viewers: 228900, score: 93.9, growth: 6.8, channels: 4890, chats: 85 }, twitch: { viewers: 62300, score: 83.2, growth: -0.4, channels: 1105, chats: 70 }, cimi: { viewers: 114200, score: 85.5, growth: 3.9, channels: 845, chats: 87 } },
  { label: '03/13', soop: { viewers: 291800, score: 93.4, growth: 5.2, channels: 4340, chats: 79 }, chzzk: { viewers: 235200, score: 94.4, growth: 7.1, channels: 4960, chats: 86 }, twitch: { viewers: 64100, score: 83.0, growth: -0.7, channels: 1130, chats: 71 }, cimi: { viewers: 119400, score: 86.2, growth: 4.8, channels: 872, chats: 88 } },
  { label: '03/14', soop: { viewers: 297300, score: 93.8, growth: 5.6, channels: 4400, chats: 80 }, chzzk: { viewers: 241500, score: 94.9, growth: 7.6, channels: 5040, chats: 87 }, twitch: { viewers: 65800, score: 82.8, growth: -0.9, channels: 1160, chats: 72 }, cimi: { viewers: 123800, score: 87.1, growth: 5.5, channels: 900, chats: 90 } },
  { label: '03/15', soop: { viewers: 301900, score: 94.0, growth: 5.8, channels: 4470, chats: 81 }, chzzk: { viewers: 244100, score: 95.2, growth: 8.0, channels: 5110, chats: 88 }, twitch: { viewers: 67200, score: 82.5, growth: -1.1, channels: 1185, chats: 73 }, cimi: { viewers: 128400, score: 87.8, growth: 6.1, channels: 936, chats: 91 } },
  { label: '03/16', soop: { viewers: 303700, score: 94.1, growth: 6.0, channels: 4510, chats: 81 }, chzzk: { viewers: 245200, score: 95.5, growth: 8.4, channels: 5190, chats: 89 }, twitch: { viewers: 67800, score: 82.4, growth: -1.2, channels: 1200, chats: 73 }, cimi: { viewers: 130900, score: 88.4, growth: 6.8, channels: 958, chats: 92 } },
  { label: '03/17', soop: { viewers: 305410, score: 94.2, growth: 6.2, channels: 4556, chats: 82 }, chzzk: { viewers: 246847, score: 95.8, growth: 8.9, channels: 5256, chats: 89 }, twitch: { viewers: 68430, score: 82.4, growth: -1.3, channels: 1210, chats: 74 }, cimi: { viewers: 132860, score: 88.9, growth: 7.4, channels: 980, chats: 93 } },
];

export const PRIME_TIME_TREND = [
  { label: '10:00', soop: { viewers: 171000, channels: 3120, chats: 74 }, chzzk: { viewers: 136000, channels: 3440, chats: 80 }, twitch: { viewers: 41200, channels: 720, chats: 69 }, cimi: { viewers: 68400, channels: 540, chats: 85 } },
  { label: '12:00', soop: { viewers: 194000, channels: 3520, chats: 76 }, chzzk: { viewers: 151000, channels: 3910, chats: 82 }, twitch: { viewers: 45800, channels: 810, chats: 70 }, cimi: { viewers: 75200, channels: 610, chats: 87 } },
  { label: '14:00', soop: { viewers: 226000, channels: 3870, chats: 77 }, chzzk: { viewers: 183000, channels: 4280, chats: 84 }, twitch: { viewers: 52100, channels: 900, chats: 71 }, cimi: { viewers: 93100, channels: 730, chats: 89 } },
  { label: '16:00', soop: { viewers: 252000, channels: 4180, chats: 79 }, chzzk: { viewers: 206000, channels: 4650, chats: 86 }, twitch: { viewers: 58300, channels: 1010, chats: 72 }, cimi: { viewers: 108400, channels: 820, chats: 90 } },
  { label: '18:00', soop: { viewers: 285000, channels: 4410, chats: 81 }, chzzk: { viewers: 229000, channels: 4980, chats: 88 }, twitch: { viewers: 64200, channels: 1090, chats: 73 }, cimi: { viewers: 122500, channels: 900, chats: 92 } },
  { label: '20:00', soop: { viewers: 305410, channels: 4556, chats: 82 }, chzzk: { viewers: 246847, channels: 5256, chats: 89 }, twitch: { viewers: 68430, channels: 1210, chats: 74 }, cimi: { viewers: 132860, channels: 980, chats: 93 } },
  { label: '22:00', soop: { viewers: 291000, channels: 4390, chats: 80 }, chzzk: { viewers: 234000, channels: 5030, chats: 87 }, twitch: { viewers: 65100, channels: 1160, chats: 73 }, cimi: { viewers: 128400, channels: 930, chats: 91 } },
];

export const FIRST_STAND_MATCHES = [
  { time: '03.17 (화) 22:00', name: 'GEN vs JDG', stage: 'Swiss Day 1', expectedViewers: 797900, score: 98.4, badge: 'LIVE' },
  { time: '03.18 (수) 03:00', name: 'LOUD vs LYON', stage: 'Swiss Day 1', expectedViewers: 612300, score: 91.8, badge: 'UP' },
  { time: '03.18 (수) 19:00', name: 'T1A vs TL.C', stage: 'Showmatch', expectedViewers: 455000, score: 87.2, badge: 'NEW' },
];

export const FIRST_STAND_WATCH_PARTIES = [
  { platform: 'chzzk', personId: 's101', name: '우왁굳', expectedViewers: 210000, watchScore: 96.4 },
  { platform: 'soop', personId: 's103', name: '감스트', expectedViewers: 175000, watchScore: 93.1 },
  { platform: 'twitch', personId: 's106', name: '랄로', expectedViewers: 64000, watchScore: 87.8 },
  { platform: 'cimi', personId: 's102', name: '이세계아이돌', expectedViewers: 121000, watchScore: 94.2 },
];
