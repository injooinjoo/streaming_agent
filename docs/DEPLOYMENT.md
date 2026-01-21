# 배포 가이드

이 문서는 Streaming Agent를 배포하는 방법을 설명합니다.

## 목차

1. [로컬 개발 환경](#로컬-개발-환경)
2. [Render 배포](#render-배포)
3. [환경 변수 설정](#환경-변수-설정)
4. [데이터베이스](#데이터베이스)
5. [Redis 설정 (선택사항)](#redis-설정-선택사항)
6. [배포 후 확인](#배포-후-확인)
7. [문제 해결](#문제-해결)

---

## 로컬 개발 환경

### 데이터베이스

로컬 환경에서는 **SQLite3** (`unified.db`)를 사용합니다.

```bash
# 데이터베이스 파일 위치
server/unified.db
```

서버 시작 시 자동으로 테이블이 생성됩니다.

### 빌드 및 실행

```bash
# 의존성 설치
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
cd client && npm run build && cp -r dist/* ../server/public/
```

---

## Render 배포

### 사전 요구사항

- [Render 계정](https://render.com)
- GitHub 저장소 연결
- OAuth 제공자 클라이언트 ID/Secret (Google, Naver, Twitch, SOOP) - 선택

### Blueprint 배포 (권장)

Render Blueprint를 사용하면 한 번에 모든 서비스를 배포할 수 있습니다.

1. [Render Dashboard](https://dashboard.render.com) 접속
2. **New** → **Blueprint** 클릭
3. GitHub 저장소 선택
4. `render.yaml` 파일 감지 확인
5. **Apply** 클릭

### 수동 설정 필요 항목

Blueprint 배포 후 다음 환경 변수를 수동으로 설정해야 합니다:

1. Render Dashboard → streaming-agent 서비스
2. **Environment** 탭
3. 각 변수 추가:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `NAVER_CLIENT_ID`
   - `NAVER_CLIENT_SECRET`
   - `TWITCH_CLIENT_ID`
   - `TWITCH_CLIENT_SECRET`
   - `SOOP_CLIENT_ID`
   - `SOOP_CLIENT_SECRET`
   - `RIOT_API_KEY` (게임 통계 사용 시)

---

## 수동 배포

Blueprint 없이 수동으로 배포하는 방법입니다.

### Web Service 생성

1. Render Dashboard → **New** → **Web Service**
2. GitHub 저장소 연결
3. 설정:
   - Name: `streaming-agent`
   - Region: `Singapore`
   - Branch: `main`
   - Runtime: `Node`
   - Build Command: `npm install && cd client && npm install && npm run build`
   - Start Command: `cd server && npm start`
   - Plan: `Starter` (Free는 15분 후 슬립)
4. **Advanced** → **Health Check Path**: `/health`

### 환경 변수 설정

**Environment** 탭에서 추가:

```
NODE_ENV=production
PORT=3001
JWT_SECRET=[Generate: openssl rand -base64 32]
JWT_REFRESH_SECRET=[Generate: openssl rand -base64 32]
ADMIN_ACCESS_CODE=[원하는 코드]
```

> **참고**: 기본적으로 SQLite (`unified.db`)를 사용합니다. PostgreSQL을 사용하려면 `DATABASE_URL` 환경 변수를 설정하세요.

---

## 환경 변수 설정

### 필수 변수

| 변수 | 설명 | 예시 |
|------|------|------|
| `NODE_ENV` | 환경 | `production` |
| `PORT` | 포트 | `3001` |
| `JWT_SECRET` | JWT 서명 키 | (자동 생성 권장) |
| `JWT_REFRESH_SECRET` | Refresh Token 키 | (자동 생성 권장) |
| `DATABASE_URL` | PostgreSQL URL (선택) | `postgres://...` |

### OAuth 변수 (각 제공자별)

| 제공자 | Client ID | Client Secret |
|--------|-----------|---------------|
| Google | `GOOGLE_CLIENT_ID` | `GOOGLE_CLIENT_SECRET` |
| Naver | `NAVER_CLIENT_ID` | `NAVER_CLIENT_SECRET` |
| Twitch | `TWITCH_CLIENT_ID` | `TWITCH_CLIENT_SECRET` |
| SOOP | `SOOP_CLIENT_ID` | `SOOP_CLIENT_SECRET` |

### OAuth Callback URL 설정

각 OAuth 제공자 개발자 콘솔에서 콜백 URL 등록:

```
https://[your-app].onrender.com/api/auth/google/callback
https://[your-app].onrender.com/api/auth/naver/callback
https://[your-app].onrender.com/api/auth/twitch/callback
https://[your-app].onrender.com/api/auth/soop/callback
```

### 선택 변수

| 변수 | 설명 |
|------|------|
| `REDIS_URL` | Redis 캐시 URL (성능 향상) |
| `RIOT_API_KEY` | Riot Games API 키 |
| `ADMIN_ACCESS_CODE` | 관리자 대시보드 접근 코드 |
| `LOG_LEVEL` | 로그 레벨 (`info`, `debug`) |

---

## 데이터베이스

### 기본 설정 (SQLite)

기본적으로 SQLite3 (`unified.db`)를 사용합니다. 서버 시작 시 자동으로 테이블이 생성됩니다.

```bash
# 데이터베이스 파일 위치
server/unified.db
```

### PostgreSQL 사용 (선택)

대규모 배포나 다중 인스턴스가 필요한 경우 PostgreSQL을 사용할 수 있습니다.

1. Render에서 PostgreSQL 생성
2. `DATABASE_URL` 환경 변수 설정
3. 마이그레이션 실행:
   ```bash
   cd server
   npm run db:migrate
   ```

### SQLite에서 PostgreSQL로 데이터 이전

```bash
cd server
DATABASE_URL=[Production URL] npm run db:migrate-to-postgres
```

---

## Redis 설정 (선택사항)

Redis를 사용하면 다음 기능이 향상됩니다:
- JWT 토큰 블랙리스트
- Rate limiting
- 카테고리 캐싱
- OAuth state 저장

### Upstash Redis (무료 티어 권장)

1. [Upstash](https://upstash.com) 계정 생성
2. 새 데이터베이스 생성 (Region: Singapore 권장)
3. **REST URL** 대신 **Redis URL** 복사
4. Render 환경 변수에 `REDIS_URL` 추가

### Render Redis (유료)

1. Render Dashboard → **New** → **Redis**
2. Plan: `Starter` ($10/월)
3. **Internal Redis URL**을 `REDIS_URL`에 설정

---

## 배포 후 확인

### 1. Health Check

```bash
curl https://[your-app].onrender.com/health
```

예상 응답:
```json
{
  "status": "ok",
  "timestamp": "2024-01-16T12:00:00.000Z",
  "uptime": 123
}
```

### 2. Readiness Check

```bash
curl https://[your-app].onrender.com/ready
```

### 3. 상세 Health Check

```bash
curl https://[your-app].onrender.com/health/detailed
```

### 4. 프론트엔드 확인

브라우저에서 `https://[your-app].onrender.com` 접속

---

## GitHub Actions CI/CD

### Deploy Hook 설정

1. Render Dashboard → Web Service → **Settings**
2. **Deploy Hook** URL 복사
3. GitHub Repository → **Settings** → **Secrets**
4. `RENDER_DEPLOY_HOOK_URL` 추가

이제 `main` 브랜치에 푸시하면 자동 배포됩니다.

---

## 문제 해결

### 빌드 실패

**증상**: `npm install` 또는 `npm run build` 실패

**해결**:
1. 로컬에서 `npm ci && cd client && npm ci && npm run build` 테스트
2. Node.js 버전 확인 (20 권장)
3. `package-lock.json` 커밋 확인

### 데이터베이스 연결 실패

**증상**: `ECONNREFUSED` 또는 `connection refused`

**해결**:
1. `DATABASE_URL`이 **Internal Database URL**인지 확인
2. PostgreSQL이 같은 Region인지 확인
3. Render Dashboard에서 PostgreSQL 상태 확인

### 서버 슬립 (Free Plan)

**증상**: 첫 요청이 느림 (15-30초)

**원인**: Free Plan은 15분 비활성 후 슬립

**해결**:
1. Starter Plan으로 업그레이드 ($7/월)
2. 또는 외부 모니터링 서비스로 ping (UptimeRobot 등)

### OAuth 로그인 실패

**증상**: OAuth 콜백에서 에러

**해결**:
1. OAuth 제공자 콘솔에서 콜백 URL 확인
2. 환경 변수 `CLIENT_ID`, `CLIENT_SECRET` 확인
3. 프로덕션 URL이 OAuth 앱에 등록되어 있는지 확인

### Redis 연결 실패

**증상**: Redis 관련 경고 로그

**영향**: 서비스는 계속 작동 (인메모리 폴백)

**해결**:
1. `REDIS_URL` 형식 확인: `redis://user:password@host:port`
2. Redis 서비스 상태 확인
3. 무시해도 됨 (성능만 약간 저하)

---

## 모니터링

### Render 내장 메트릭

- Render Dashboard → Web Service → **Metrics**
- CPU, 메모리, 응답 시간 확인

### 로그 확인

- Render Dashboard → Web Service → **Logs**
- 실시간 로그 스트리밍

### 외부 모니터링 (선택)

- [UptimeRobot](https://uptimerobot.com) - 무료 uptime 모니터링
- [Sentry](https://sentry.io) - 에러 트래킹

---

## 비용 계획

### 무료 티어

| 서비스 | 제한 |
|--------|------|
| Web Service (Free) | 15분 후 슬립, 750시간/월 |
| PostgreSQL (Free) | 256MB, 90일 후 만료 |
| Redis (Upstash Free) | 10,000 요청/일, 256MB |

### 프로덕션 권장

| 서비스 | 가격 |
|--------|------|
| Web Service (Starter) | $7/월 |
| PostgreSQL (Starter) | $7/월 |
| Redis (Upstash Pro) | $10/월 |
| **합계** | **$24/월** |

---

## 다음 단계

1. ✅ 기본 배포 완료
2. 📧 이메일 알림 설정 (선택)
3. 🔒 커스텀 도메인 연결 (선택)
4. 📊 모니터링 설정 (선택)
5. 🔄 백업 정책 수립 (선택)
