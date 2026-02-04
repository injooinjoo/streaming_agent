# 배포 가이드

이 문서는 Streaming Agent를 배포하는 방법을 설명합니다.

## 목차

1. [로컬 개발 환경](#로컬-개발-환경)
2. [Fly.io 배포](#flyio-배포)
3. [환경 변수 설정](#환경-변수-설정)
4. [데이터베이스](#데이터베이스)
5. [배포 후 확인](#배포-후-확인)
6. [문제 해결](#문제-해결)
7. [Cloud Run 배포 (레거시)](#cloud-run-배포-레거시)

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

## Fly.io 배포

### 사전 요구사항

- [Fly.io 계정](https://fly.io) (무료)
- [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/) 설치

### 1. Fly CLI 설치

**Windows (PowerShell)**:
```powershell
pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

**macOS/Linux**:
```bash
curl -L https://fly.io/install.sh | sh
```

### 2. 로그인 및 앱 생성

```bash
# 로그인
fly auth login

# 앱 생성 (fly.toml 기반, 최초 1회)
fly launch --no-deploy
```

> `fly launch`는 `fly.toml`을 읽어 앱을 생성합니다. 앱 이름은 고유해야 하므로 이미 사용 중이면 다른 이름을 입력하세요.

### 3. 환경 변수 설정 (Secrets)

```bash
fly secrets set \
  JWT_SECRET="your-jwt-secret-min-32-chars" \
  JWT_REFRESH_SECRET="your-refresh-secret-min-32-chars" \
  DATABASE_URL_SUPABASE="postgresql://user:password@host:5432/postgres" \
  DB_MODE="supabase" \
  ADMIN_ACCESS_CODE="your-admin-code"
```

**Windows PowerShell**:
```powershell
fly secrets set JWT_SECRET="your-jwt-secret-min-32-chars"
fly secrets set JWT_REFRESH_SECRET="your-refresh-secret-min-32-chars"
fly secrets set DATABASE_URL_SUPABASE="postgresql://user:password@host:5432/postgres"
fly secrets set DB_MODE="supabase"
fly secrets set ADMIN_ACCESS_CODE="your-admin-code"
```

### 4. 배포

```bash
npm run deploy
# 또는
fly deploy
```

### 배포 옵션 (fly.toml)

| 옵션 | 설명 |
|------|------|
| `primary_region = "nrt"` | 도쿄 리전 (한국과 가장 가까움) |
| `internal_port = 8080` | 서버 포트 |
| `auto_stop_machines = true` | 트래픽 없을 때 자동 중지 (비용 절감) |
| `min_machines_running = 0` | 최소 실행 인스턴스 |

### 리전 선택

| 리전 | 코드 | 위치 |
|------|------|------|
| 도쿄 | `nrt` | 일본 (한국과 가장 가까움) |
| 싱가포르 | `sin` | 싱가포르 |
| 홍콩 | `hkg` | 홍콩 |

리전 변경:
```bash
fly regions set nrt
```

---

## 환경 변수 설정

### 필수 변수

| 변수 | 설명 | 예시 |
|------|------|------|
| `NODE_ENV` | 환경 | `production` (fly.toml에 설정됨) |
| `JWT_SECRET` | JWT 서명 키 (32자 이상) | `openssl rand -base64 32` |
| `JWT_REFRESH_SECRET` | Refresh Token 키 (32자 이상) | `openssl rand -base64 32` |
| `DATABASE_URL_SUPABASE` | Supabase DB 연결 문자열 | `postgresql://...` |
| `DB_MODE` | 데이터베이스 모드 | `supabase` |

### 선택 변수

| 변수 | 설명 |
|------|------|
| `REDIS_URL` | Redis 캐시 URL (성능 향상) |
| `RIOT_API_KEY` | Riot Games API 키 |
| `ADMIN_ACCESS_CODE` | 관리자 대시보드 접근 코드 |
| `LOG_LEVEL` | 로그 레벨 (`info`, `debug`) |
| `ENABLE_CRAWLER` | 크롤러 활성화 (`true`/`false`) |

### Secrets 관리

```bash
# 모든 secrets 확인
fly secrets list

# secret 추가/수정
fly secrets set KEY=VALUE

# secret 삭제
fly secrets unset KEY
```

---

## 데이터베이스

### Supabase (권장)

Fly.io 배포 시 Supabase PostgreSQL을 사용합니다.

1. [Supabase](https://supabase.com) 프로젝트 생성
2. Settings → Database → Connection string (URI) 복사
3. `DATABASE_URL_SUPABASE` secret으로 설정

```bash
fly secrets set DATABASE_URL_SUPABASE="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"
fly secrets set DB_MODE="supabase"
```

### 외부 PostgreSQL

자체 PostgreSQL 서버 사용 시:

```bash
fly secrets set DATABASE_URL_LOCAL="postgresql://user:password@host:5432/dbname"
fly secrets set DB_MODE="local"
fly secrets set DATABASE_SSL="false"
```

---

## 배포 후 확인

### 1. 앱 상태 확인

```bash
fly status
```

### 2. Health Check

```bash
curl https://[APP_NAME].fly.dev/health
```

예상 응답:
```json
{
  "status": "ok",
  "timestamp": "2024-01-16T12:00:00.000Z",
  "uptime": 123
}
```

### 3. 로그 확인

```bash
# 실시간 로그
fly logs

# 최근 로그
fly logs --no-tail
```

### 4. 앱 URL 확인

```bash
fly info
```

---

## 문제 해결

### 컨테이너 시작 실패

**증상**: `failed to start`

**해결**:
1. secrets 확인: `fly secrets list`
2. 필수 환경 변수 설정 (JWT_SECRET, JWT_REFRESH_SECRET, DATABASE_URL_SUPABASE)
3. 로그 확인: `fly logs`

### Cold Start (느린 첫 요청)

**원인**: `auto_stop_machines = true` 설정으로 인해 트래픽 없을 때 VM 중지

**해결**: 항상 실행 유지하려면 `fly.toml` 수정
```toml
min_machines_running = 1
```

### 메모리 부족

**증상**: OOM으로 인한 재시작

**해결**: VM 스케일 업
```bash
fly scale memory 512
```

### 데이터베이스 연결 실패

**확인사항**:
1. `DATABASE_URL_SUPABASE` 형식 확인
2. Supabase 프로젝트가 활성 상태인지 확인
3. IP 제한이 있다면 Fly.io IP 허용

---

## 비용

### Fly.io 무료 티어

- **3개의 공유 CPU VM** (256MB RAM 각각)
- 월 160GB 아웃바운드 트래픽
- 무료 SSL 인증서

### 예상 비용

| 사용량 | 비용 |
|--------|------|
| 무료 티어 내 | $0 |
| 1GB RAM 업그레이드 | ~$5/월 |
| 전용 CPU | ~$30/월 |

---

## 빠른 배포 (요약)

```bash
# 1. Fly CLI 설치 및 로그인
fly auth login

# 2. 앱 생성 (최초 1회)
fly launch --no-deploy

# 3. Secrets 설정
fly secrets set JWT_SECRET="..." JWT_REFRESH_SECRET="..." DATABASE_URL_SUPABASE="..." DB_MODE="supabase"

# 4. 배포
npm run deploy
```

---

## Cloud Run 배포 (레거시)

> **참고**: 이 섹션은 이전 Cloud Run 배포 방식에 대한 참조용입니다.

### Cloud Build로 배포

```bash
gcloud config set project [PROJECT_ID]
gcloud services enable run.googleapis.com cloudbuild.googleapis.com containerregistry.googleapis.com
npm run deploy:gcloud
```

### 환경 변수 설정

```bash
gcloud run services update streaming-agent \
  --region asia-northeast3 \
  --set-env-vars "DATABASE_URL_SUPABASE=...,JWT_SECRET=...,JWT_REFRESH_SECRET=..."
```

### 이전 배포 정보

- **URL**: https://streaming-agent-676247567847.asia-northeast3.run.app/
- **리전**: asia-northeast3 (서울)
- **프로젝트**: fortune2-463710
