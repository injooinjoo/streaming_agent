# Streaming Agent - 위플랩 스타일 오버레이 시스템

스트리머를 위한 실시간 오버레이 관리 플랫폼. SOOP, Chzzk, YouTube, Twitch 지원.

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | React 19, Vite 7, React Router DOM 7, Lucide React |
| Backend | Express 5, Socket.io 4, SQLite3 |
| 인증 | JWT (jsonwebtoken), bcrypt |
| 스타일 | CSS Custom Properties, glass-morphism |

---

## 프로젝트 구조

```
streaming_agent/
├── client/                     # React 프론트엔드
│   ├── src/
│   │   ├── components/
│   │   │   ├── settings/       # 설정 패널 (Chat, Alert, Goal 등)
│   │   │   ├── marketplace/    # 디자인 마켓플레이스
│   │   │   ├── ads/            # 광고 관리
│   │   │   ├── auth/           # 로그인/회원가입
│   │   │   └── *Overlay.jsx    # 오버레이 렌더러
│   │   ├── contexts/           # React Context (Auth 등)
│   │   └── App.jsx             # 라우터 설정
│   └── public/assets/          # 로고, 이미지
├── server/
│   ├── index.js                # Express + Socket.io 서버
│   ├── routes/                 # API 라우트 모듈
│   └── middleware/             # 인증 미들웨어
└── docs/spec.md                # 기능 명세서
```

---

## 코딩 컨벤션

### React 컴포넌트 패턴

Settings 컴포넌트는 다음 패턴을 따름:

```jsx
const defaultSettings = {
  // 기본 설정값
};

const ComponentSettings = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    const res = await fetch('http://localhost:3001/api/settings/key');
    const data = await res.json();
    if (data.value) setSettings(JSON.parse(data.value));
    setLoading(false);
  };

  const saveSettings = async () => {
    await fetch('http://localhost:3001/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'key', value: settings })
    });
  };

  useEffect(() => { fetchSettings(); }, []);

  // 렌더링...
};
```

### CSS 스타일링

- CSS Custom Properties 사용 (index.css에 정의)
- `glass-premium` 클래스: 프리미엄 유리 효과
- BEM 스타일 네이밍: `.component-name`, `.component-name__element`
- 반응형 브레이크포인트: 1200px, 1024px, 768px

### API 패턴

```javascript
// 설정 조회
GET /api/settings/:key

// 설정 저장 (Socket.io로 실시간 브로드캐스트)
POST /api/settings
{ key: 'chat', value: { ... } }

// 인증이 필요한 API
// Authorization: Bearer <JWT_TOKEN>
```

---

## 데이터베이스

SQLite3 사용. 테이블 구조:

### 기존 테이블
- `events`: 채팅/후원 이벤트 기록
- `settings`: 오버레이 설정 (JSON)

### 신규 테이블
- `users`: 사용자 계정
- `sessions`: JWT 세션
- `ad_slots`: 광고 슬롯
- `ad_impressions`: 광고 노출 기록
- `designs`: 마켓플레이스 디자인
- `design_reviews`: 디자인 리뷰
- `creators`: 크리에이터 프로필

---

## 핵심 기능

### 오버레이 (5종)
1. **Chat** - 채팅창 (26+ 테마)
2. **Alert** - 후원 알림 (TTS)
3. **Goal** - 목표치 그래프
4. **Ticker** - 전광판
5. **Subtitle** - 후원 자막

### 추가 기능
- **광고 관리** - 직접 광고주 연결, 슬롯 관리
- **마켓플레이스** - 무료 디자인 공유/다운로드
- **인증** - 이메일/비밀번호 로그인

---

## 개발 명령어

```bash
# 전체 실행 (client + server)
npm run dev

# 클라이언트만
npm run client

# 서버만
npm run server
```

---

## 중요 규칙

1. **한국어 UI**: 모든 사용자 인터페이스는 한국어로 작성
2. **실시간 동기화**: 설정 변경 시 Socket.io로 오버레이에 즉시 반영
3. **로딩 상태**: RefreshCw 아이콘으로 로딩 표시
4. **URL 복사**: 각 오버레이는 복사 가능한 URL 제공
5. **미리보기**: 설정 변경 시 실시간 미리보기 제공

---

## 플랫폼 아이콘

| 플랫폼 | 파일 |
|--------|------|
| SOOP | `/assets/logos/soop.png` |
| Chzzk | `/assets/logos/chzzk.png` |
| YouTube | `/assets/logos/youtube.png` |
