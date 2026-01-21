# Streaming Agent

> 스트리머를 위한 실시간 오버레이 관리 플랫폼
>
> SOOP, Chzzk, YouTube, Twitch 지원

---

## Quick Start

### 요구사항

- Node.js 20+
- npm 9+

### 설치 및 실행

```bash
# 의존성 설치
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..

# 개발 서버 실행 (client + server)
npm run dev
```

- **클라이언트**: http://localhost:5173
- **서버**: http://localhost:3001

### 빌드 및 배포

```bash
# 클라이언트 빌드 후 서버에 복사 (필수!)
cd client && npm run build && cp -r dist/* ../server/public/
```

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| **Frontend** | React 19, Vite 7, React Router DOM 7, Lucide React, Recharts |
| **Backend** | Express 5, Socket.io 4, SQLite3 |
| **인증** | JWT, bcrypt |
| **스타일** | CSS Custom Properties, Glass-morphism |

---

## 주요 기능

### 오버레이 (10종)

| 오버레이 | 설명 |
|----------|------|
| **Chat** | 실시간 채팅창 (26+ 테마) |
| **Alert** | 후원 알림 + TTS |
| **Subtitle** | 후원 자막 |
| **Goal** | 목표치 그래프 (바/원형) |
| **Ticker** | 전광판 |
| **Roulette** | 룰렛 게임 |
| **Emoji** | 이모지 반응 |
| **Voting** | 실시간 투표 |
| **Credits** | 엔딩 크레딧 |
| **Ad** | 광고 표시 |

### 추가 기능

- **광고 관리**: 스트리머 광고 슬롯, 광고주 캠페인
- **마켓플레이스**: 오버레이 디자인 공유
- **분석 대시보드**: 시청자, 콘텐츠, 수익 분석
- **챗봇**: 커스텀 명령어, 자동 메시지
- **Admin**: 실시간 모니터링, 플랫폼 통계

---

## 문서

| 문서 | 설명 |
|------|------|
| [FEATURES.md](docs/FEATURES.md) | 기능 명세서 |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | 기술 아키텍처 |
| [API.md](docs/API.md) | API 명세 |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | 배포 가이드 |

---

## 프로젝트 구조

```
streaming_agent/
├── client/                  # React 프론트엔드 (Vite)
│   └── src/
│       ├── components/      # UI 컴포넌트
│       │   ├── settings/    # 설정 패널 (16개)
│       │   ├── admin/       # 관리자 대시보드
│       │   ├── analytics/   # 분석 대시보드
│       │   └── *Overlay.jsx # 오버레이 (10개)
│       └── contexts/        # React Context
│
├── server/                  # Express 백엔드
│   ├── routes/              # API 라우트
│   ├── services/            # 비즈니스 로직
│   ├── adapters/            # 플랫폼 어댑터 (SOOP, Chzzk)
│   └── db/                  # 데이터베이스
│
└── docs/                    # 문서
```

---

## 환경 변수

### 서버 (`server/.env`)

```bash
PORT=3001
CLIENT_URL=http://localhost:5173
JWT_SECRET=your-secret-key

# OAuth (선택)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
SOOP_CLIENT_ID=
SOOP_CLIENT_SECRET=
```

---

## 개발 명령어

```bash
# 전체 실행
npm run dev

# 클라이언트만
npm run client

# 서버만
npm run server
```

---

## 라이선스

Private - All Rights Reserved
