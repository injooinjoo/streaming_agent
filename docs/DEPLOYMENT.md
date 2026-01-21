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

```bash
gcloud run deploy streaming-agent \
  --source . \
  --region asia-northeast3 \
  --platform managed \
  --allow-unauthenticated \
  --port 3001 \
  --memory 1Gi \
  --set-env-vars "NODE_ENV=production,JWT_SECRET=$(openssl rand -base64 32),JWT_REFRESH_SECRET=$(openssl rand -base64 32)"
```

### 배포 옵션

| 옵션 | 설명 |
|------|------|
| `--region asia-northeast3` | 서울 리전 |
| `--memory 1Gi` | 메모리 1GB |
| `--allow-unauthenticated` | 공개 접근 허용 |
| `--port 3001` | 서버 포트 |

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

## 현재 배포 정보

- **URL**: https://streaming-agent-676247567847.asia-northeast3.run.app/
- **리전**: asia-northeast3 (서울)
- **프로젝트**: fortune2-463710
