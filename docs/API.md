# API 명세

> Streaming Agent REST API 문서

---

## 목차

1. [인증 API](#1-인증-api)
2. [설정 API](#2-설정-api)
3. [광고 API](#3-광고-api)
4. [관리자 API](#4-관리자-api)
5. [유틸리티 API](#5-유틸리티-api)

---

## 기본 정보

- **Base URL**: `http://localhost:3001` (개발) / `https://your-domain.com` (프로덕션)
- **인증**: `Authorization: Bearer <JWT_TOKEN>`
- **Content-Type**: `application/json`

---

## 1. 인증 API

### 회원가입

```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "displayName": "닉네임"
}
```

**Response:**
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "displayName": "닉네임",
    "role": "user",
    "overlayHash": "abc123def456"
  }
}
```

### 로그인

```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** 회원가입과 동일

### 현재 사용자 정보

```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "displayName": "닉네임",
  "role": "user",
  "overlayHash": "abc123def456"
}
```

### 프로필 업데이트

```http
PUT /api/auth/profile
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "displayName": "새 닉네임",
  "avatarUrl": "https://..."
}
```

### OAuth 로그인

```http
GET /api/auth/:provider
```

- **provider**: `google`, `naver`, `twitch`, `soop`
- 리다이렉트 기반 OAuth 플로우

---

## 2. 설정 API

### 글로벌 설정 조회

```http
GET /api/settings/:key
```

**Parameters:**
- `key`: `chat`, `alert`, `goal`, `subtitle`, `ticker`, `roulette`, `emoji`, `voting`, `credits`

**Response:**
```json
{
  "key": "chat",
  "value": "{\"theme\":\"default\",\"fontSize\":28,...}"
}
```

### 글로벌 설정 저장

```http
POST /api/settings
```

**Request Body:**
```json
{
  "key": "chat",
  "value": {
    "theme": "default",
    "fontSize": 28,
    "alignment": "left"
  }
}
```

> 저장 시 Socket.io로 `settings-updated` 이벤트 브로드캐스트

### 사용자별 설정 조회

```http
GET /api/user-settings/:key
Authorization: Bearer <token>
```

### 사용자별 설정 저장

```http
POST /api/user-settings
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "key": "chat",
  "value": { ... }
}
```

### 오버레이 URL (해시 기반, 공개)

```http
GET /api/overlay/:hash/settings/:key
```

- 인증 불필요 (OBS 브라우저 소스용)
- `hash`: 사용자 고유 overlay_hash

### 오버레이 해시 재생성

```http
POST /api/overlay/regenerate-hash
Authorization: Bearer <token>
```

**Response:**
```json
{
  "overlayHash": "new123hash456"
}
```

---

## 3. 광고 API

### 스트리머 - 광고 슬롯

#### 슬롯 목록 조회

```http
GET /api/ads/slots
Authorization: Bearer <token>
```

**Response:**
```json
{
  "slots": [
    {
      "id": 1,
      "type": "banner",
      "position": "bottom",
      "width": 728,
      "height": 90,
      "isActive": true,
      "impressions": 1234,
      "clicks": 56
    }
  ]
}
```

#### 슬롯 생성

```http
POST /api/ads/slots
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "type": "banner",
  "position": "bottom",
  "width": 728,
  "height": 90
}
```

#### 슬롯 수정/삭제

```http
PUT /api/ads/slots/:id
DELETE /api/ads/slots/:id
Authorization: Bearer <token>
```

### 스트리머 - 수익

```http
GET /api/ads/revenue
GET /api/ads/settlements
Authorization: Bearer <token>
```

### 광고주 - 캠페인

#### 캠페인 목록

```http
GET /api/ads/campaigns
Authorization: Bearer <token>
```

#### 캠페인 생성

```http
POST /api/ads/campaigns
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "캠페인 이름",
  "contentType": "image",
  "contentUrl": "https://...",
  "clickUrl": "https://...",
  "budgetDaily": 10000,
  "budgetTotal": 100000,
  "cpm": 1000,
  "startDate": "2026-01-01",
  "endDate": "2026-01-31",
  "targetStreamers": ["streamer1", "streamer2"]
}
```

#### 캠페인 상태 변경

```http
PUT /api/ads/campaigns/:id/status
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "status": "active"
}
```

- **status**: `pending`, `active`, `paused`, `completed`, `rejected`

### 공개 - 광고 전달

```http
GET /api/overlay/:hash/ads/slots
GET /api/overlay/:hash/ads/active
```

- 인증 불필요

#### 노출/클릭 기록

```http
POST /api/ads/impression
POST /api/ads/click
```

**Request Body:**
```json
{
  "campaignId": 1,
  "slotId": 1
}
```

---

## 4. 관리자 API

> 모든 관리자 API는 `role: admin` 권한 필요

### 통계 조회

```http
GET /admin/stats
Authorization: Bearer <token>
```

### 스트리머 목록

```http
GET /admin/streamers
Authorization: Bearer <token>
```

### 플랫폼 통계

```http
GET /api/platforms/live
GET /api/platforms/:platform/stats
```

### 모니터링

```http
GET /api/monitor/nexon
GET /api/monitor/games
```

---

## 5. 유틸리티 API

### 헬스 체크

```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-21T12:00:00.000Z",
  "uptime": 123
}
```

### 상세 헬스 체크

```http
GET /health/detailed
```

### 테스트 이벤트

```http
POST /api/simulate-event
```

**Request Body:**
```json
{
  "type": "donation",
  "sender": "테스트유저",
  "amount": 1000,
  "message": "테스트 후원입니다",
  "platform": "soop"
}
```

### 최근 이벤트 조회

```http
GET /api/events
```

**Query Parameters:**
- `limit`: 조회 개수 (기본 50)

---

## 에러 응답

### 형식

```json
{
  "error": "에러 메시지",
  "code": "ERROR_CODE"
}
```

### 상태 코드

| 코드 | 설명 |
|------|------|
| 400 | Bad Request - 잘못된 요청 |
| 401 | Unauthorized - 인증 필요 |
| 403 | Forbidden - 권한 없음 |
| 404 | Not Found - 리소스 없음 |
| 500 | Internal Server Error |

---

*문서 최종 업데이트: 2026-01-21*
