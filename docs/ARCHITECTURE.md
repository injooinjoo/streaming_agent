# 기술 아키텍처

> Streaming Agent 시스템 구조 및 기술 문서

---

## 목차

1. [기술 스택](#1-기술-스택)
2. [시스템 아키텍처](#2-시스템-아키텍처)
3. [프로젝트 구조](#3-프로젝트-구조)
4. [라우팅 구조](#4-라우팅-구조)
5. [데이터베이스 스키마](#5-데이터베이스-스키마)
6. [Socket.io 이벤트](#6-socketio-이벤트)
7. [코딩 컨벤션](#7-코딩-컨벤션)

---

## 1. 기술 스택

| 영역 | 기술 |
|------|------|
| **Frontend** | React 19, Vite 7, React Router DOM 7, Lucide React, Recharts |
| **Backend** | Express 5, Socket.io 4, SQLite3 |
| **인증** | JWT (jsonwebtoken), bcrypt |
| **OAuth** | SOOP, Naver, Google, Twitch |
| **스타일** | CSS Custom Properties, Glass-morphism |
| **로깅** | Pino |
| **캐싱** | Redis (선택) |
| **백업** | Google Cloud Storage (선택) |

---

## 2. 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         시스템 아키텍처                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [Streamer Client]                                                      │
│       │                                                                 │
│       ▼                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │               Overlay / Widget Layer                         │       │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐          │       │
│  │  │Chat │ │Alert│ │Goal │ │Tick │ │Vote │ │Emoji│  ...      │       │
│  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘          │       │
│  └─────────────────────────────────────────────────────────────┘       │
│       │                                                                 │
│       ▼                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │            Event Ingestion Layer                             │       │
│  │         WebSocket / REST, Platform Adapter                   │       │
│  │              (Socket.io + Express)                           │       │
│  └─────────────────────────────────────────────────────────────┘       │
│       │                                                                 │
│       ▼                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │              Data Storage                                    │       │
│  │                (SQLite3 - unified.db)                        │       │
│  └─────────────────────────────────────────────────────────────┘       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 프로젝트 구조

```
streaming_agent/
├── client/                              # React 프론트엔드 (Vite)
│   ├── src/
│   │   ├── App.jsx                     # 메인 라우터
│   │   ├── main.jsx                    # 엔트리 포인트
│   │   │
│   │   ├── components/
│   │   │   ├── Dashboard.jsx           # 메인 대시보드
│   │   │   ├── ChannelPage.jsx         # 채널 정보
│   │   │   │
│   │   │   ├── *Overlay.jsx (10개)     # 오버레이 렌더러
│   │   │   │   ├── ChatOverlay.jsx
│   │   │   │   ├── AlertOverlay.jsx
│   │   │   │   ├── SubtitleOverlay.jsx
│   │   │   │   ├── GoalOverlay.jsx
│   │   │   │   ├── TickerOverlay.jsx
│   │   │   │   ├── RouletteOverlay.jsx
│   │   │   │   ├── EmojiOverlay.jsx
│   │   │   │   ├── VotingOverlay.jsx
│   │   │   │   ├── CreditsOverlay.jsx
│   │   │   │   └── AdOverlay.jsx
│   │   │   │
│   │   │   ├── settings/ (16개)        # 설정 패널
│   │   │   │   ├── ChatSettings.jsx
│   │   │   │   ├── AlertSettings.jsx
│   │   │   │   ├── GoalSettings.jsx
│   │   │   │   ├── SubtitleSettings.jsx
│   │   │   │   ├── TickerSettings.jsx
│   │   │   │   ├── RouletteSettings.jsx
│   │   │   │   ├── EmojiSettings.jsx
│   │   │   │   ├── VotingSettings.jsx
│   │   │   │   ├── CreditsSettings.jsx
│   │   │   │   ├── BotSettings.jsx
│   │   │   │   ├── AdSettings.jsx
│   │   │   │   ├── AccountSettings.jsx
│   │   │   │   ├── GameSettings.jsx
│   │   │   │   └── *.css
│   │   │   │
│   │   │   ├── auth/                   # 인증
│   │   │   │   ├── LoginPage.jsx
│   │   │   │   ├── RegisterPage.jsx
│   │   │   │   └── ProtectedRoute.jsx
│   │   │   │
│   │   │   ├── admin/                  # 관리자
│   │   │   │   ├── AdminDashboard.jsx
│   │   │   │   ├── AdminMonitor.jsx
│   │   │   │   ├── AdminPlatforms.jsx
│   │   │   │   ├── AdminStreamers.jsx
│   │   │   │   └── ...
│   │   │   │
│   │   │   ├── advertiser/             # 광고주
│   │   │   │   ├── AdvertiserDashboard.jsx
│   │   │   │   ├── CampaignCreate.jsx
│   │   │   │   └── CampaignDetail.jsx
│   │   │   │
│   │   │   ├── analytics/              # 분석
│   │   │   │   ├── ViewershipDashboard.jsx
│   │   │   │   ├── RevenueAnalytics.jsx
│   │   │   │   └── shared/
│   │   │   │
│   │   │   ├── marketplace/            # 마켓플레이스
│   │   │   ├── catalog/                # 게임 카탈로그
│   │   │   └── channel/                # 채널
│   │   │
│   │   └── contexts/
│   │       ├── AuthContext.jsx
│   │       ├── ThemeContext.jsx
│   │       └── StreamingModeContext.jsx
│   │
│   └── public/assets/                  # 로고, 이미지
│
├── server/
│   ├── index.js                        # Express + Socket.io 서버
│   │
│   ├── routes/                         # API 라우트 (12개)
│   │   ├── auth.js
│   │   ├── settings.js
│   │   ├── overlay.js
│   │   ├── ads.js
│   │   ├── admin.js
│   │   ├── stats.js
│   │   ├── platforms.js
│   │   ├── monitor.js
│   │   └── health.js
│   │
│   ├── middleware/                     # 미들웨어
│   │   ├── auth.js
│   │   ├── adminAuth.js
│   │   └── rateLimiter.js
│   │
│   ├── services/                       # 비즈니스 로직 (25개)
│   │   ├── userService.js
│   │   ├── authService.js
│   │   ├── settingsService.js
│   │   ├── eventService.js
│   │   ├── statsService.js
│   │   └── ...
│   │
│   ├── adapters/                       # 플랫폼 어댑터
│   │   ├── soop.js
│   │   ├── chzzk.js
│   │   └── riot.js
│   │
│   ├── db/                             # 데이터베이스
│   │   ├── unified-init.js             # 테이블 초기화
│   │   └── knexfile.js
│   │
│   └── public/                         # 클라이언트 빌드
│
└── docs/                               # 문서
    ├── FEATURES.md
    ├── ARCHITECTURE.md
    ├── API.md
    └── DEPLOYMENT.md
```

---

## 4. 라우팅 구조

### 프론트엔드 라우트

```
Routes:
├── /                           → Dashboard (메인)
├── /login                      → LoginPage
├── /register                   → RegisterPage
├── /advertiser                 → AdvertiserDashboard
├── /admin/*                    → Admin 대시보드
│
└── /overlay/:userHash/*        → 오버레이 (OBS용)
    ├── /chat                   → ChatOverlay
    ├── /alerts                 → AlertOverlay
    ├── /subtitles              → SubtitleOverlay
    ├── /goals                  → GoalOverlay
    ├── /ticker                 → TickerOverlay
    ├── /roulette               → RouletteOverlay
    ├── /emoji                  → EmojiOverlay
    ├── /voting                 → VotingOverlay
    ├── /credits                → CreditsOverlay
    └── /ads                    → AdOverlay
```

---

## 5. 데이터베이스 스키마

### 데이터베이스 파일
- **파일명**: `unified.db` (SQLite3)
- **위치**: `server/unified.db`

### 테이블 그룹

```
┌─────────────────────────────────────────────────────────────┐
│                    데이터베이스 스키마                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [사용자 관리]                                               │
│  ├── users              - 사용자 계정                        │
│  └── user_settings      - 사용자별 설정 (JSON)               │
│                                                             │
│  [이벤트 & 스트리밍]                                         │
│  ├── events             - 채팅/후원 이벤트 기록               │
│  └── settings           - 글로벌 설정 (레거시)               │
│                                                             │
│  [오버레이 기능]                                              │
│  ├── roulette_wheels    - 룰렛 설정                         │
│  ├── signature_sounds   - 시그니처 알림음                    │
│  ├── emoji_settings     - 이모지 반응                       │
│  ├── voting_polls       - 투표                              │
│  ├── poll_votes         - 투표 기록                         │
│  └── ending_credits     - 엔딩 크레딧                       │
│                                                             │
│  [챗봇]                                                      │
│  ├── chat_bots          - 봇 설정                           │
│  ├── bot_commands       - 명령어                            │
│  └── bot_auto_messages  - 자동 메시지                       │
│                                                             │
│  [광고 시스템]                                               │
│  ├── ad_slots           - 스트리머 광고 슬롯                 │
│  ├── ad_campaigns       - 광고주 캠페인                      │
│  ├── ad_impressions     - 노출/클릭 추적                    │
│  └── ad_settlements     - 정산                              │
│                                                             │
│  [마켓플레이스]                                              │
│  ├── creators           - 크리에이터 프로필                  │
│  ├── designs            - 디자인 템플릿                      │
│  └── design_reviews     - 리뷰                              │
│                                                             │
│  [라이브 통계]                                               │
│  ├── persons            - 스트리머 정보                      │
│  ├── broadcasts         - 라이브 방송                        │
│  ├── categories         - 카테고리                           │
│  └── viewer_stats       - 시청자 통계                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 주요 테이블 상세

#### users

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',           -- 'user' | 'creator' | 'advertiser' | 'admin'
  oauth_provider TEXT,
  oauth_id TEXT,
  overlay_hash TEXT UNIQUE,            -- 16자 hex (공개 URL용)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### settings

```sql
CREATE TABLE settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,            -- 'chat' | 'alert' | 'goal' | ...
  value TEXT                           -- JSON 문자열
);
```

---

## 6. Socket.io 이벤트

### 룸 관리

| 이벤트 | 방향 | 데이터 | 설명 |
|--------|------|--------|------|
| `join-overlay` | Client → Server | `hash` | 오버레이 룸 참가 |
| `leave-overlay` | Client → Server | `hash` | 오버레이 룸 퇴장 |

### 설정 & 업데이트

| 이벤트 | 방향 | 데이터 | 설명 |
|--------|------|--------|------|
| `settings-update` | Client → Server | `{ key, value, hash }` | 설정 변경 요청 |
| `settings-updated` | Server → Client | `{ key }` | 설정 변경 알림 |
| `new-event` | Server → Client | `{ type, sender, amount, message, platform, timestamp, id }` | 새 이벤트 |

### 기능별 이벤트

| 이벤트 | 설명 |
|--------|------|
| `roulette-spin` | 룰렛 스핀 |
| `emoji-reaction` | 단일 이모지 |
| `emoji-burst` | 다중 이모지 |
| `poll-start` / `poll-vote` / `poll-end` | 투표 |
| `credits-start` / `credits-stop` | 엔딩 크레딧 |
| `ad-slots-updated` / `ads-refresh` | 광고 |

---

## 7. 코딩 컨벤션

### Settings 컴포넌트 패턴

```jsx
const defaultSettings = {
  // 기본 설정값
};

const ComponentSettings = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const overlayHash = user?.userHash || null;

  const fetchSettings = async () => {
    const res = await fetch(`${API_URL}/api/settings/${key}`);
    const data = await res.json();
    if (data.value) setSettings(JSON.parse(data.value));
    setLoading(false);
  };

  const saveSettings = async () => {
    await fetch(`${API_URL}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: settings })
    });
  };

  useEffect(() => { fetchSettings(); }, []);
};
```

### Overlay 컴포넌트 패턴

```jsx
const socket = io(API_URL);

const OverlayComponent = () => {
  const { userHash } = useParams();
  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    // Socket.io 룸 참가
    if (userHash) socket.emit("join-overlay", userHash);

    // 이벤트 리스너
    socket.on('new-event', handleEvent);
    socket.on('settings-updated', handleSettingsUpdate);

    return () => {
      if (userHash) socket.emit("leave-overlay", userHash);
    };
  }, [userHash]);
};
```

### CSS 스타일링

- CSS Custom Properties 사용 (`index.css`에 정의)
- `glass-premium` 클래스: 프리미엄 글래스 효과
- BEM 스타일 네이밍: `.component-name__element`
- 반응형 브레이크포인트: 1200px, 1024px, 768px

---

*문서 최종 업데이트: 2026-01-21*
