# 배포 가이드

이 문서는 Streaming Agent를 배포하는 방법을 설명합니다.

## 목차

1. [로컬 개발 환경](#로컬-개발-환경)
2. [Google Cloud Run 배포](#google-cloud-run-배포)
3. [환경 변수 설정](#환경-변수-설정)
4. [데이터베이스](#데이터베이스)
5. [배포 후 확인](#배포-후-확인)
6. [문제 해결](#문제-해결)

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

## Google Cloud Run 배포

### 사전 요구사항

- [Google Cloud 계정](https://console.cloud.google.com)
- [gcloud CLI](https://cloud.google.com/sdk/docs/install) 설치
- Docker (로컬 빌드 시)

### 1. gcloud CLI 설정

```bash
# 로그인
gcloud auth login

# 프로젝트 설정
gcloud config set project [PROJECT_ID]

# 필요한 API 활성화
gcloud services enable run.googleapis.com artifactregistry.googleapis.com
```

### 2. 배포

**방법 A: Cloud Build로 한 번에 배포 (권장)**

클라이언트 빌드 → Docker 이미지 빌드 → Cloud Run 배포를 한 번에 수행합니다.

```bash
# 프로젝트 설정
gcloud config set project [PROJECT_ID]

# API 활성화 (최초 1회)
gcloud services enable run.googleapis.com cloudbuild.googleapis.com containerregistry.googleapis.com

# 배포 (현재 디렉터리에서)
gcloud builds submit --config=cloudbuild.yaml .
```

배포가 끝난 뒤 **필수 환경 변수**를 설정합니다 (JWT 시크릿 없으면 서버가 시작되지 않습니다).

```bash
# 시크릿 생성 후 설정
gcloud run services update streaming-agent \
  --region asia-northeast3 \
  --set-env-vars "JWT_SECRET=$(openssl rand -base64 32),JWT_REFRESH_SECRET=$(openssl rand -base64 32)"
```

**방법 B: 소스에서 직접 배포 (--source)**

```bash
gcloud run deploy streaming-agent \
  --source . \
  --region asia-northeast3 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --set-env-vars "NODE_ENV=production,JWT_SECRET=$(openssl rand -base64 32),JWT_REFRESH_SECRET=$(openssl rand -base64 32)"
```

> `--source` 사용 시 Google Cloud가 Dockerfile을 찾아 빌드합니다. 클라이언트는 빌드 시점에 포함되려면 `server/public`에 이미 빌드 결과가 있거나, Cloud Build 단계에서 클라이언트 빌드를 포함해야 합니다. **방법 A(cloudbuild.yaml)** 를 쓰면 클라이언트가 매번 자동으로 빌드됩니다.

### 배포 옵션

| 옵션 | 설명 |
|------|------|
| `--region asia-northeast3` | 서울 리전 |
| `--memory 1Gi` | 메모리 1GB |
| `--allow-unauthenticated` | 공개 접근 허용 |
| `--port 8080` | 서버 포트 (Cloud Run 기본값) |

### 리전 선택

| 리전 | 코드 | 위치 |
|------|------|------|
| 서울 | `asia-northeast3` | 한국 |
| 도쿄 | `asia-northeast1` | 일본 |
| 싱가포르 | `asia-southeast1` | 싱가포르 |

---

## 환경 변수 설정

### 필수 변수

| 변수 | 설명 | 예시 |
|------|------|------|
| `NODE_ENV` | 환경 | `production` |
| `JWT_SECRET` | JWT 서명 키 | (자동 생성 권장) |
| `JWT_REFRESH_SECRET` | Refresh Token 키 | (자동 생성 권장) |

### 환경 변수 업데이트

```bash
gcloud run services update streaming-agent \
  --region asia-northeast3 \
  --set-env-vars "KEY=VALUE"
```

### 선택 변수

| 변수 | 설명 |
|------|------|
| `REDIS_URL` | Redis 캐시 URL (성능 향상) |
| `RIOT_API_KEY` | Riot Games API 키 |
| `ADMIN_ACCESS_CODE` | 관리자 대시보드 접근 코드 |
| `LOG_LEVEL` | 로그 레벨 (`info`, `debug`) |

---

## 배포 직후 필수 설정

Cloud Run 서비스는 배포만으로는 **JWT 시크릿이 없어** 요청 시 오류가 날 수 있습니다. 한 번만 설정하면 됩니다.

```bash
gcloud run services update streaming-agent \
  --region asia-northeast3 \
  --set-env-vars "JWT_SECRET=$(openssl rand -base64 32),JWT_REFRESH_SECRET=$(openssl rand -base64 32)"
```

Windows PowerShell에서는:

```powershell
$jwt = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
$refresh = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
gcloud run services update streaming-agent --region asia-northeast3 --set-env-vars "JWT_SECRET=$jwt,JWT_REFRESH_SECRET=$refresh"
```

---

## 데이터베이스

### 기본 설정 (SQLite)

기본적으로 SQLite3 (`unified.db`)를 사용합니다. 서버 시작 시 자동으로 테이블이 생성됩니다.

```bash
# 데이터베이스 파일 위치
server/unified.db
```

> **주의**: Cloud Run은 stateless이므로 컨테이너 재시작 시 SQLite 데이터가 초기화됩니다. 영구 저장이 필요하면 Cloud SQL 또는 외부 DB를 사용하세요.

### Cloud SQL 사용 (선택)

대규모 배포나 영구 저장이 필요한 경우:

1. [Cloud SQL 인스턴스 생성](https://console.cloud.google.com/sql)
2. Cloud Run 서비스에 Cloud SQL 연결
3. `DATABASE_URL` 환경 변수 설정

---

## 배포 후 확인

### 1. Health Check

```bash
curl https://[SERVICE_URL]/health
```

예상 응답:
```json
{
  "status": "ok",
  "timestamp": "2024-01-16T12:00:00.000Z",
  "uptime": 123
}
```

### 2. 서비스 URL 확인

```bash
gcloud run services describe streaming-agent \
  --region asia-northeast3 \
  --format "value(status.url)"
```

### 3. 로그 확인

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=streaming-agent" \
  --limit 50 \
  --format "value(textPayload)"
```

---

## 문제 해결

### 컨테이너 시작 실패

**증상**: `The user-provided container failed to start`

**해결**:
1. 환경 변수 확인 (JWT_SECRET, JWT_REFRESH_SECRET 필수)
2. 포트 설정 확인 (3001)
3. 로그 확인

```bash
gcloud logging read "resource.type=cloud_run_revision" --limit 30
```

### 느린 시작 시간

**원인**: 서버 초기화 시 카테고리 크롤링 대기

**해결**: 서버는 먼저 시작하고 크롤링은 백그라운드에서 실행되도록 이미 최적화됨

### 메모리 부족

**증상**: 서비스 재시작 반복

**해결**:
```bash
gcloud run services update streaming-agent \
  --region asia-northeast3 \
  --memory 2Gi
```

---

## 비용

### Cloud Run 무료 티어

- 월 200만 요청 무료
- 월 360,000 GB-초 메모리 무료
- 월 180,000 vCPU-초 무료

### 예상 비용 (소규모)

일반적인 사용 패턴에서 **무료 티어 내**에서 운영 가능

---

## 빠른 배포 (요약)

```bash
gcloud config set project [PROJECT_ID]
gcloud services enable run.googleapis.com cloudbuild.googleapis.com containerregistry.googleapis.com
npm run deploy   # 이미지 빌드 + 푸시 (Cloud Run 배포 단계는 제외됨)
```

이후 **한 번만** 아래 "Cloud Run 첫 배포"를 실행해 주세요 (DB·JWT 필요).

---

## Cloud Run 첫 배포 (이미지 푸시 후 1회)

`npm run deploy`는 이미지를 빌드·푸시만 합니다. 서비스가 **PostgreSQL(DATABASE_URL_SUPABASE)** 과 **JWT 시크릿** 없이는 기동하지 않으므로, 아래 중 한 가지 방법으로 환경 변수를 넣고 배포합니다.

### 방법 1: gcloud run deploy (한 줄)

Supabase 연결 문자열과 JWT 시크릿을 준비한 뒤:

```bash
gcloud run deploy streaming-agent \
  --image gcr.io/streaming-agent-484514/streaming-agent:latest \
  --region asia-northeast3 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --set-env-vars "NODE_ENV=production,DATABASE_URL_SUPABASE=postgresql://USER:PASSWORD@HOST:5432/postgres,JWT_SECRET=원하는32자이상시크릿,JWT_REFRESH_SECRET=원하는32자이상시크릿"
```

- `DATABASE_URL_SUPABASE`: Supabase 대시보드 → Settings → Database → Connection string (URI)
- JWT 시크릿: 각각 32자 이상, 예: `openssl rand -base64 32` 출력값 사용

### 방법 2: 먼저 배포 후 환경 변수만 업데이트

이미 서비스가 있다면(이미지는 이미 푸시된 상태):

```bash
gcloud run services update streaming-agent \
  --region asia-northeast3 \
  --set-env-vars "DATABASE_URL_SUPABASE=postgresql://...,JWT_SECRET=...,JWT_REFRESH_SECRET=..."
```

새 리비전이 생성되며, DB·JWT가 설정된 컨테이너가 기동합니다.

## 현재 배포 정보

- **URL**: https://streaming-agent-676247567847.asia-northeast3.run.app/
- **리전**: asia-northeast3 (서울)
- **프로젝트**: fortune2-463710
- **포트**: 8080 (Cloud Run 기본)
