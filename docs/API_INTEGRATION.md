# 외부 API 연동 가이드 (External API Integration Guide)

이 문서는 스트리밍 에이전트에서 사용하는 외부 API의 연동 방법, 데이터 구조, 구현 가이드를 정리한 기술 문서입니다.

---

## 목차

1. [개요](#1-개요)
2. [스트리밍 플랫폼 API](#2-스트리밍-플랫폼-api)
   - [치지직 (Chzzk)](#21-치지직-chzzk)
   - [SOOP (아프리카TV)](#22-soop-아프리카tv)
   - [YouTube Live](#23-youtube-live)
   - [Twitch](#24-twitch)
3. [제3자 통합 서비스](#3-제3자-통합-서비스)
4. [게임 API](#4-게임-api)
5. [통합 데이터 스키마](#5-통합-데이터-스키마)
6. [구현 로드맵](#6-구현-로드맵)
7. [카테고리 크롤링 시스템](#7-카테고리-크롤링-시스템)
   - [아키텍처](#71-아키텍처)
   - [데이터베이스 스키마](#72-데이터베이스-스키마)
   - [API 엔드포인트](#73-api-엔드포인트)
   - [서비스 구현](#74-서비스-구현)

---

## 1. 개요

### 1.1 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Platform Adapter Layer                           │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐               │
│  │ Chzzk   │  │  SOOP   │  │ YouTube │  │ Twitch  │               │
│  │ Adapter │  │ Adapter │  │ Adapter │  │ Adapter │               │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘               │
│       │            │            │            │                     │
│       └────────────┴────────────┴────────────┘                     │
│                          │                                          │
│                    ┌─────┴─────┐                                    │
│                    │ Normalizer│  ← 통합 스키마로 정규화            │
│                    │  Service  │                                    │
│                    └─────┬─────┘                                    │
│                          │                                          │
│              ┌───────────┴───────────┐                              │
│              │                       │                              │
│        ┌─────┴─────┐          ┌─────┴─────┐                        │
│        │  Socket.io│          │  SQLite   │                        │
│        │ Broadcast │          │  Storage  │                        │
│        └───────────┘          └───────────┘                        │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 연동 대상 플랫폼 요약

| 카테고리 | 플랫폼 | 연결 방식 | 인증 | 우선순위 | 난이도 |
|---------|--------|----------|------|---------|--------|
| 스트리밍 | 치지직 (Chzzk) | WebSocket | OAuth 2.0 / API Key | P0 | 중 |
| 스트리밍 | SOOP (아프리카TV) | REST + WebSocket | OAuth 2.0 (제휴) | P0 | 상 |
| 스트리밍 | YouTube Live | REST (Polling) | OAuth 2.0 | P1 | 중 |
| 스트리밍 | Twitch | EventSub WebSocket | OAuth 2.0 | P1 | 중 |
| 게임 | Riot Games | REST | API Key | P2 | 하 |
| 게임 | Nexon (메이플, FC, 카트) | REST | API Key | P2 | 하 |
| 게임 | 기타 | REST | 다양함 | P3 | 하 |

---

## 2. 스트리밍 플랫폼 API

### 2.1 치지직 (Chzzk)

#### 개요

| 항목 | 내용 |
|------|------|
| 공식 문서 | https://chzzk.gitbook.io/chzzk |
| 비공식 라이브러리 | https://github.com/kimcore/chzzk (TypeScript) |
| 연결 방식 | WebSocket (채팅), REST API (채널 정보) |
| 인증 | OAuth 2.0 (일부), API Key (일부) |

#### API 엔드포인트

##### 채널 정보 조회 (인증 불필요)

```http
GET https://api.chzzk.naver.com/service/v1/channels/{channelId}
```

**응답 예시:**
```json
{
  "code": 200,
  "message": null,
  "content": {
    "channelId": "abc123def456...",
    "channelName": "스트리머닉네임",
    "channelImageUrl": "https://nng-phinf.pstatic.net/...",
    "followerCount": 150000,
    "openLive": true
  }
}
```

##### 방송 정보 조회

```http
GET https://api.chzzk.naver.com/service/v3/channels/{channelId}/live-detail
```

**응답 예시:**
```json
{
  "content": {
    "liveId": 12345,
    "liveTitle": "방송 제목",
    "status": "OPEN",
    "concurrentUserCount": 5000,
    "chatChannelId": "chat_channel_id_here"
  }
}
```

#### WebSocket 채팅 연결

##### 연결 흐름

```javascript
// server/adapters/chzzk.js

const WebSocket = require('ws');

class ChzzkAdapter {
  constructor(channelId) {
    this.channelId = channelId;
    this.ws = null;
    this.chatChannelId = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  async connect() {
    // 1. chatChannelId 조회
    this.chatChannelId = await this.getChatChannelId();

    // 2. WebSocket 연결
    this.ws = new WebSocket('wss://kr-ss3.chat.naver.com/chat');

    this.ws.on('open', () => {
      console.log('Chzzk WebSocket connected');
      this.sendConnect();
      this.reconnectAttempts = 0;
    });

    this.ws.on('message', (data) => {
      this.handleMessage(JSON.parse(data));
    });

    this.ws.on('close', () => {
      this.handleDisconnect();
    });

    this.ws.on('error', (error) => {
      console.error('Chzzk WebSocket error:', error);
    });
  }

  async getChatChannelId() {
    const response = await fetch(
      `https://api.chzzk.naver.com/service/v3/channels/${this.channelId}/live-detail`
    );
    const data = await response.json();
    return data.content?.chatChannelId;
  }

  sendConnect() {
    // 연결 메시지 전송
    const connectMessage = {
      ver: '3',
      cmd: 100,
      svcid: 'game',
      cid: this.chatChannelId,
      bdy: {
        uid: null,  // 비로그인
        devType: 2001,
        accTkn: null,
        auth: 'READ'
      },
      tid: 1
    };
    this.ws.send(JSON.stringify(connectMessage));
  }

  handleMessage(data) {
    const cmd = data.cmd;

    switch (cmd) {
      case 0:  // PING
        this.sendPong();
        break;
      case 93100:  // 채팅 메시지
        this.processChat(data.bdy);
        break;
      case 93101:  // 후원 메시지
        this.processDonation(data.bdy);
        break;
    }
  }

  sendPong() {
    this.ws.send(JSON.stringify({ ver: '3', cmd: 10000 }));
  }

  processChat(messages) {
    for (const msg of messages) {
      const event = {
        type: 'chat',
        platform: 'chzzk',
        sender: {
          id: msg.profile?.userIdHash,
          nickname: msg.profile?.nickname,
          profileImage: msg.profile?.profileImageUrl,
          role: this.mapRole(msg.profile?.userRoleCode),
          badges: msg.profile?.activityBadges || []
        },
        content: {
          message: msg.msg
        },
        metadata: {
          timestamp: new Date(msg.msgTime).toISOString(),
          channelId: this.channelId
        }
      };

      this.emit('event', event);
    }
  }

  processDonation(messages) {
    for (const msg of messages) {
      const extras = JSON.parse(msg.extras || '{}');

      const event = {
        type: 'donation',
        platform: 'chzzk',
        sender: {
          id: msg.profile?.userIdHash,
          nickname: extras.nickname || msg.profile?.nickname,
          profileImage: msg.profile?.profileImageUrl
        },
        content: {
          message: extras.msg || msg.msg,
          amount: extras.payAmount,
          donationType: 'cheese'
        },
        metadata: {
          timestamp: new Date(msg.msgTime).toISOString(),
          channelId: this.channelId
        }
      };

      this.emit('event', event);
    }
  }

  mapRole(roleCode) {
    const roles = {
      'streamer': 'streamer',
      'streaming_chat_manager': 'manager',
      'common_user': 'regular'
    };
    return roles[roleCode] || 'regular';
  }

  handleDisconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
      setTimeout(() => this.connect(), delay);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

module.exports = ChzzkAdapter;
```

#### 메시지 타입 코드

| 코드 | 타입 | 설명 |
|------|------|------|
| 0 | PING | 서버 핑 |
| 10000 | PONG | 클라이언트 퐁 |
| 100 | CONNECT | 연결 요청 |
| 93100 | CHAT | 일반 채팅 |
| 93101 | DONATION | 후원 (치즈) |
| 93102 | SUBSCRIPTION | 구독 |

#### 주의사항

- **비공식 API 리스크**: 네이버에서 비공식 API 사용을 규제할 수 있음
- **Rate Limit**: 명확하지 않음 (보수적 접근 권장)
- **chatChannelId**: 방송마다 동적으로 변경됨

---

### 2.2 SOOP (아프리카TV)

#### 개요

| 항목 | 내용 |
|------|------|
| 공식 개발자 센터 | https://developers.afreecatv.com |
| 채팅 SDK 문서 | https://developers.afreecatv.com/?szWork=chat_sdk |
| 연결 방식 | REST API + 채팅 SDK |
| 인증 | OAuth 2.0 (API KEY 제휴 필요) |
| 현재 상태 | OAuth 설정 완료 ([server/index.js:25-31](../server/index.js#L25-L31)) |

#### 현재 구현된 OAuth 설정

```javascript
// server/index.js
const OAUTH_CONFIG = {
  soop: {
    clientId: process.env.SOOP_CLIENT_ID || "",
    clientSecret: process.env.SOOP_CLIENT_SECRET || "",
    authUrl: "https://www.sooplive.co.kr/oauth/authorize",
    tokenUrl: "https://www.sooplive.co.kr/oauth/token",
    userInfoUrl: "https://api.sooplive.co.kr/user/me",
    scope: "user:read",
  }
};
```

#### API KEY 발급 절차

1. https://developers.afreecatv.com 접속
2. 우측 상단 '내 계정' → 개발자 등록
3. Support → 제휴 신청 메뉴에서 신청
4. 내부 검토 (업무일 기준 최대 10일)
5. 승인 후 '내 API KEY' 메뉴에서 Client ID/Secret 확인

#### 채팅 SDK 연동

```javascript
// server/adapters/soop.js

class SoopAdapter {
  constructor(channelId, apiKey) {
    this.channelId = channelId;
    this.apiKey = apiKey;
    this.broadNo = null;
    this.chatNo = null;
  }

  async connect() {
    // 1. 방송 정보 조회
    const broadcastInfo = await this.getBroadcastInfo();
    this.broadNo = broadcastInfo.broad_no;
    this.chatNo = broadcastInfo.chat_no;

    // 2. 채팅 SDK 초기화 (브라우저 환경 필요)
    // SDK는 웹 브라우저에서 동작하므로 Puppeteer 또는 별도 처리 필요
    await this.initChatSDK();
  }

  async getBroadcastInfo() {
    // 방송 번호 조회 (broad_no, chat_no)
    const response = await fetch(
      `https://live.afreecatv.com/afreeca/player_live_api.php?bjid=${this.channelId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'type=live'
      }
    );
    const data = await response.json();
    return data.CHANNEL;
  }

  // SDK 이벤트 핸들러
  handleChatEvent(action, data) {
    switch (action) {
      case 'MESSAGE':
        this.processChat(data);
        break;
      case 'BALLOON':
      case 'BALLOON_GIFTED':
        this.processDonation(data, 'star_balloon');
        break;
      case 'ADBALLOON':
        this.processDonation(data, 'ad_balloon');
        break;
      case 'VIDEO_BALLOON':
        this.processDonation(data, 'video_balloon');
        break;
      case 'MISSION':
        this.processDonation(data, 'mission');
        break;
    }
  }

  processChat(data) {
    const event = {
      type: 'chat',
      platform: 'soop',
      sender: {
        id: data.userId,
        nickname: data.nickname,
        role: this.mapGrade(data.grade)
      },
      content: {
        message: data.message
      },
      metadata: {
        timestamp: new Date().toISOString(),
        channelId: this.channelId
      }
    };

    this.emit('event', event);
  }

  processDonation(data, donationType) {
    const event = {
      type: 'donation',
      platform: 'soop',
      sender: {
        id: data.userId,
        nickname: data.nickname
      },
      content: {
        message: data.message,
        amount: data.count * 100,  // 별풍선 1개 = 100원
        originalAmount: data.count,
        currency: 'balloon',
        donationType: donationType
      },
      metadata: {
        timestamp: new Date().toISOString(),
        channelId: this.channelId
      }
    };

    this.emit('event', event);
  }

  mapGrade(grade) {
    const grades = {
      'bj': 'streamer',
      'manager': 'manager',
      'fan': 'fan',
      'vip': 'vip',
      'regular': 'regular'
    };
    return grades[grade] || 'regular';
  }
}

module.exports = SoopAdapter;
```

#### 후원 종류

| 종류 | 설명 | 단가 |
|------|------|------|
| 별풍선 | 기본 후원 | 100원/개 |
| 애드벌룬 | 프리미엄 후원 | 100원/개 |
| 영상풍선 | 영상 후원 | 100원/개 |
| 미션 | 미션 후원 | 가변 |
| 스티커 | 스티커 후원 | 가변 |

#### 주의사항

- **API KEY 제휴 필수**: 사업 협의 프로세스 필요
- **SDK 브라우저 환경**: 채팅 SDK는 웹 브라우저에서만 동작
- **broad_no/chat_no 동적 변경**: 시청자 수에 따라 업데이트됨

---

### 2.3 YouTube Live

#### 개요

| 항목 | 내용 |
|------|------|
| 공식 문서 | https://developers.google.com/youtube/v3/live |
| 연결 방식 | REST API (Polling) |
| 인증 | OAuth 2.0 |
| 현재 상태 | Google OAuth 설정 완료 ([server/index.js:37-44](../server/index.js#L37-L44)) |

#### 필요 스코프 (확장)

```javascript
// 기존 스코프
"profile email"

// YouTube API 추가 스코프
"https://www.googleapis.com/auth/youtube.readonly"
"https://www.googleapis.com/auth/youtube.force-ssl"
```

#### API 엔드포인트

##### 라이브 방송 목록 조회

```http
GET https://www.googleapis.com/youtube/v3/liveBroadcasts
?part=snippet,contentDetails,status
&mine=true
&broadcastStatus=active
Authorization: Bearer {access_token}
```

##### 실시간 채팅 메시지 조회

```http
GET https://www.googleapis.com/youtube/v3/liveChat/messages
?liveChatId={liveChatId}
&part=snippet,authorDetails
&pageToken={nextPageToken}
Authorization: Bearer {access_token}
```

**응답 예시:**
```json
{
  "kind": "youtube#liveChatMessageListResponse",
  "pollingIntervalMillis": 4000,
  "nextPageToken": "QURTSl...",
  "items": [
    {
      "kind": "youtube#liveChatMessage",
      "id": "LCC.xxx",
      "snippet": {
        "type": "textMessageEvent",
        "liveChatId": "xxx",
        "authorChannelId": "UCxxx",
        "publishedAt": "2024-01-01T12:00:00Z",
        "hasDisplayContent": true,
        "displayMessage": "채팅 메시지"
      },
      "authorDetails": {
        "channelId": "UCxxx",
        "channelUrl": "https://youtube.com/channel/UCxxx",
        "displayName": "시청자닉네임",
        "profileImageUrl": "https://yt3.ggpht.com/...",
        "isVerified": false,
        "isChatOwner": false,
        "isChatSponsor": false,
        "isChatModerator": false
      }
    }
  ]
}
```

##### Super Chat 이벤트 조회

```http
GET https://www.googleapis.com/youtube/v3/superChatEvents
?part=snippet
&hl=ko
Authorization: Bearer {access_token}
```

**응답 예시:**
```json
{
  "items": [
    {
      "snippet": {
        "channelId": "UCxxx",
        "supporterDetails": {
          "channelId": "UCyyy",
          "displayName": "후원자닉네임",
          "profileImageUrl": "https://..."
        },
        "commentText": "후원 메시지",
        "createdAt": "2024-01-01T12:00:00Z",
        "amountMicros": "10000000000",
        "currency": "KRW",
        "displayString": "₩10,000",
        "messageType": "superChatEvent"
      }
    }
  ]
}
```

#### 구현 예시

```javascript
// server/adapters/youtube.js

class YouTubeAdapter {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.liveChatId = null;
    this.nextPageToken = null;
    this.pollingInterval = 4000;  // 기본 4초
    this.pollTimer = null;
  }

  async connect() {
    // 1. 활성 방송 조회
    const broadcast = await this.getActiveBroadcast();
    if (!broadcast) {
      throw new Error('No active broadcast found');
    }

    this.liveChatId = broadcast.snippet.liveChatId;

    // 2. Polling 시작
    this.startPolling();
  }

  async getActiveBroadcast() {
    const response = await fetch(
      'https://www.googleapis.com/youtube/v3/liveBroadcasts?' +
      'part=snippet,contentDetails,status&mine=true&broadcastStatus=active',
      {
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      }
    );
    const data = await response.json();
    return data.items?.[0];
  }

  startPolling() {
    this.poll();
  }

  async poll() {
    try {
      const messages = await this.fetchMessages();

      for (const msg of messages) {
        this.processMessage(msg);
      }
    } catch (error) {
      console.error('YouTube polling error:', error);
    }

    // 다음 폴링 예약
    this.pollTimer = setTimeout(() => this.poll(), this.pollingInterval);
  }

  async fetchMessages() {
    let url = 'https://www.googleapis.com/youtube/v3/liveChat/messages?' +
      `liveChatId=${this.liveChatId}&part=snippet,authorDetails`;

    if (this.nextPageToken) {
      url += `&pageToken=${this.nextPageToken}`;
    }

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${this.accessToken}` }
    });
    const data = await response.json();

    // 다음 폴링 간격 업데이트
    if (data.pollingIntervalMillis) {
      this.pollingInterval = data.pollingIntervalMillis;
    }

    this.nextPageToken = data.nextPageToken;

    return data.items || [];
  }

  processMessage(msg) {
    const type = msg.snippet.type;

    if (type === 'textMessageEvent') {
      this.processChat(msg);
    } else if (type === 'superChatEvent' || type === 'superStickerEvent') {
      this.processDonation(msg);
    }
  }

  processChat(msg) {
    const event = {
      type: 'chat',
      platform: 'youtube',
      sender: {
        id: msg.authorDetails.channelId,
        nickname: msg.authorDetails.displayName,
        profileImage: msg.authorDetails.profileImageUrl,
        role: this.mapRole(msg.authorDetails)
      },
      content: {
        message: msg.snippet.displayMessage
      },
      metadata: {
        timestamp: msg.snippet.publishedAt,
        channelId: this.liveChatId
      }
    };

    this.emit('event', event);
  }

  processDonation(msg) {
    const amountKRW = msg.snippet.currency === 'KRW'
      ? parseInt(msg.snippet.amountMicros) / 1000000
      : this.convertToKRW(msg.snippet.amountMicros, msg.snippet.currency);

    const event = {
      type: 'donation',
      platform: 'youtube',
      sender: {
        id: msg.snippet.supporterDetails.channelId,
        nickname: msg.snippet.supporterDetails.displayName,
        profileImage: msg.snippet.supporterDetails.profileImageUrl
      },
      content: {
        message: msg.snippet.commentText,
        amount: amountKRW,
        originalAmount: parseInt(msg.snippet.amountMicros) / 1000000,
        currency: msg.snippet.currency,
        donationType: msg.snippet.messageType === 'superStickerEvent'
          ? 'super_sticker'
          : 'super_chat'
      },
      metadata: {
        timestamp: msg.snippet.createdAt,
        channelId: this.liveChatId
      }
    };

    this.emit('event', event);
  }

  mapRole(authorDetails) {
    if (authorDetails.isChatOwner) return 'streamer';
    if (authorDetails.isChatModerator) return 'manager';
    if (authorDetails.isChatSponsor) return 'subscriber';
    return 'regular';
  }

  disconnect() {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
    }
  }
}

module.exports = YouTubeAdapter;
```

#### 할당량 관리

| 작업 | 비용 (units) |
|------|-------------|
| liveChat.messages.list | 5 |
| liveBroadcasts.list | 50 |
| superChatEvents.list | 1 |

**일일 기본 할당량**: 10,000 units
**4초 간격 폴링 시**: 5 × 15 × 60 × 24 = 108,000 units (초과!)
**권장 간격**: 10초 이상 또는 할당량 증가 신청

#### 주의사항

- **Polling 기반**: 실시간성 제한 (4초 이상 지연)
- **할당량 제한**: 기본 10,000 units/day
- **OAuth 갱신**: Refresh Token 관리 필요

---

### 2.4 Twitch

#### 개요

| 항목 | 내용 |
|------|------|
| 공식 문서 | https://dev.twitch.tv/docs/eventsub |
| WebSocket 문서 | https://dev.twitch.tv/docs/eventsub/handling-websocket-events |
| 연결 방식 | EventSub WebSocket |
| 인증 | OAuth 2.0 |
| 현재 상태 | OAuth 설정 완료 ([server/index.js:45-52](../server/index.js#L45-L52)) |
| 중요 변경 | PubSub 종료됨 (2025.04), EventSub 필수 |

#### 현재 구현된 OAuth 설정

```javascript
// server/index.js
twitch: {
  clientId: process.env.TWITCH_CLIENT_ID || "",
  clientSecret: process.env.TWITCH_CLIENT_SECRET || "",
  authUrl: "https://id.twitch.tv/oauth2/authorize",
  tokenUrl: "https://id.twitch.tv/oauth2/token",
  userInfoUrl: "https://api.twitch.tv/helix/users",
  scope: "user:read:email",
}
```

#### 필요 스코프 (확장)

```javascript
// 채팅 읽기
"chat:read"
// 채팅 쓰기
"chat:edit"
// 구독/후원 이벤트
"channel:read:subscriptions"
"bits:read"
```

#### EventSub WebSocket 연결

```javascript
// server/adapters/twitch.js

const WebSocket = require('ws');

class TwitchAdapter {
  constructor(accessToken, clientId, broadcasterId) {
    this.accessToken = accessToken;
    this.clientId = clientId;
    this.broadcasterId = broadcasterId;
    this.ws = null;
    this.sessionId = null;
    this.keepaliveTimeout = null;
    this.subscriptions = [];
  }

  async connect() {
    this.ws = new WebSocket('wss://eventsub.wss.twitch.tv/ws');

    this.ws.on('open', () => {
      console.log('Twitch EventSub WebSocket connected');
    });

    this.ws.on('message', async (data) => {
      const message = JSON.parse(data);
      await this.handleMessage(message);
    });

    this.ws.on('close', () => {
      console.log('Twitch WebSocket closed');
      this.handleDisconnect();
    });

    this.ws.on('error', (error) => {
      console.error('Twitch WebSocket error:', error);
    });
  }

  async handleMessage(message) {
    const messageType = message.metadata.message_type;

    switch (messageType) {
      case 'session_welcome':
        this.sessionId = message.payload.session.id;
        this.startKeepalive(message.payload.session.keepalive_timeout_seconds);
        await this.subscribeToEvents();
        break;

      case 'session_keepalive':
        this.resetKeepalive();
        break;

      case 'notification':
        this.handleNotification(message);
        break;

      case 'session_reconnect':
        await this.handleReconnect(message.payload.session.reconnect_url);
        break;
    }
  }

  startKeepalive(timeoutSeconds) {
    this.resetKeepalive(timeoutSeconds);
  }

  resetKeepalive(timeoutSeconds = 10) {
    if (this.keepaliveTimeout) {
      clearTimeout(this.keepaliveTimeout);
    }

    // 타임아웃 + 버퍼
    this.keepaliveTimeout = setTimeout(() => {
      console.log('Keepalive timeout, reconnecting...');
      this.connect();
    }, (timeoutSeconds + 5) * 1000);
  }

  async subscribeToEvents() {
    const eventTypes = [
      { type: 'channel.chat.message', version: '1' },
      { type: 'channel.subscribe', version: '1' },
      { type: 'channel.subscription.gift', version: '1' },
      { type: 'channel.cheer', version: '1' },
      { type: 'channel.follow', version: '2' }
    ];

    for (const event of eventTypes) {
      await this.createSubscription(event.type, event.version);
    }
  }

  async createSubscription(type, version) {
    const condition = {
      broadcaster_user_id: this.broadcasterId,
      user_id: this.broadcasterId  // 채팅 이벤트에 필요
    };

    const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Client-Id': this.clientId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type,
        version,
        condition,
        transport: {
          method: 'websocket',
          session_id: this.sessionId
        }
      })
    });

    const data = await response.json();

    if (data.data?.[0]) {
      this.subscriptions.push(data.data[0].id);
      console.log(`Subscribed to ${type}`);
    }
  }

  handleNotification(message) {
    const eventType = message.metadata.subscription_type;
    const event = message.payload.event;

    switch (eventType) {
      case 'channel.chat.message':
        this.processChat(event);
        break;
      case 'channel.cheer':
        this.processCheer(event);
        break;
      case 'channel.subscribe':
      case 'channel.subscription.gift':
        this.processSubscription(event, eventType);
        break;
      case 'channel.follow':
        this.processFollow(event);
        break;
    }
  }

  processChat(event) {
    const normalizedEvent = {
      type: 'chat',
      platform: 'twitch',
      sender: {
        id: event.chatter_user_id,
        nickname: event.chatter_user_name,
        role: this.mapBadges(event.badges)
      },
      content: {
        message: event.message.text
      },
      metadata: {
        timestamp: new Date().toISOString(),
        channelId: event.broadcaster_user_id
      }
    };

    this.emit('event', normalizedEvent);
  }

  processCheer(event) {
    // 1 bit ≈ 14원 (환율에 따라 변동)
    const amountKRW = event.bits * 14;

    const normalizedEvent = {
      type: 'donation',
      platform: 'twitch',
      sender: {
        id: event.user_id,
        nickname: event.user_name
      },
      content: {
        message: event.message,
        amount: amountKRW,
        originalAmount: event.bits,
        currency: 'bits',
        donationType: 'bits'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        channelId: event.broadcaster_user_id
      }
    };

    this.emit('event', normalizedEvent);
  }

  processSubscription(event, eventType) {
    const normalizedEvent = {
      type: 'subscribe',
      platform: 'twitch',
      sender: {
        id: event.user_id,
        nickname: event.user_name
      },
      content: {
        message: event.message?.text,
        tier: event.tier,  // '1000', '2000', '3000'
        isGift: eventType === 'channel.subscription.gift'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        channelId: event.broadcaster_user_id
      }
    };

    this.emit('event', normalizedEvent);
  }

  mapBadges(badges) {
    if (badges?.some(b => b.set_id === 'broadcaster')) return 'streamer';
    if (badges?.some(b => b.set_id === 'moderator')) return 'manager';
    if (badges?.some(b => b.set_id === 'vip')) return 'vip';
    if (badges?.some(b => b.set_id === 'subscriber')) return 'subscriber';
    return 'regular';
  }

  async handleReconnect(reconnectUrl) {
    // 새 연결로 전환
    const newWs = new WebSocket(reconnectUrl);
    // ... 연결 전환 로직
  }

  handleDisconnect() {
    // 재연결 로직
    setTimeout(() => this.connect(), 5000);
  }

  disconnect() {
    if (this.keepaliveTimeout) {
      clearTimeout(this.keepaliveTimeout);
    }
    if (this.ws) {
      this.ws.close();
    }
  }
}

module.exports = TwitchAdapter;
```

#### 이벤트 타입

| 이벤트 | 설명 | 버전 |
|--------|------|------|
| `channel.chat.message` | 채팅 메시지 | v1 |
| `channel.subscribe` | 구독 | v1 |
| `channel.subscription.gift` | 선물 구독 | v1 |
| `channel.cheer` | Bits 후원 | v1 |
| `channel.follow` | 팔로우 | v2 |
| `channel.raid` | 레이드 | v1 |

#### 주의사항

- **PubSub 종료**: 2025년 4월 14일부로 완전 종료, EventSub 필수
- **10초 Keepalive**: 타임아웃 내 keepalive 수신 필요
- **구독별 개별 등록**: 각 이벤트 타입마다 API 호출 필요
- **재연결 시 재구독**: WebSocket 끊어지면 모든 구독 재등록 필요

---

## 3. 제3자 통합 서비스

### 3.1 SSAPI

| 항목 | 내용 |
|------|------|
| 공식 사이트 | https://ssapi.kr |
| 지원 플랫폼 | SOOP (아프리카TV), 치지직 (Chzzk) |
| 연결 방식 | Socket.IO |
| 장점 | API KEY 제휴 불필요, 즉시 사용 가능 |
| 단점 | 제3자 의존성, 비용 발생 가능 |

#### 사용 시나리오

1. **빠른 프로토타이핑**: 공식 API 제휴 대기 중 개발 진행
2. **소규모 프로젝트**: 제휴 과정 생략 필요시
3. **통합 테스트**: 여러 플랫폼 동시 테스트

#### 연동 예시

```javascript
// SSAPI 연동 예시 (Socket.IO 기반)
const io = require('socket.io-client');

const socket = io('https://ssapi.kr', {
  query: {
    apiKey: 'YOUR_SSAPI_KEY',
    channels: JSON.stringify([
      { platform: 'soop', channelId: 'streamer_id' },
      { platform: 'chzzk', channelId: 'channel_id' }
    ])
  }
});

socket.on('chat', (data) => {
  // 통합된 형식으로 채팅 수신
  console.log(data);
});

socket.on('donation', (data) => {
  // 통합된 형식으로 후원 수신
  console.log(data);
});
```

### 3.2 뷰어십/랭킹 데이터 서비스

#### 소프트콘 (SOFTC.ONE Viewership)

| 항목 | 내용 |
|------|------|
| 공식 사이트 | https://viewership.softc.one |
| 지원 플랫폼 | SOOP, 치지직, 트위치, 유튜브 |
| 데이터 종류 | 시청자 수, 랭킹, 시청 시간 통계 |
| 갱신 주기 | 6분 |
| API | ❌ 공개 API 없음 (크롤링 필요) |
| 라이센스 | CC BY-ND 4.0 (베이직 요금제) |

**제공 데이터:**
- 실시간 방송 랭킹
- 스트리머별 뷰어십 추이
- 상위 3,000명 스트리머 데이터

**주의사항:**
- 공개 API가 없어 웹 크롤링 필요
- 상업적 이용 시 라이센스 확인 필요 (플러스 이상 요금제)

#### 풍투데이 (poong.today)

| 항목 | 내용 |
|------|------|
| 공식 사이트 | https://poong.today |
| 지원 플랫폼 | SOOP (아프리카TV) |
| 데이터 종류 | 별풍선 랭킹, 후원 통계 |
| API | ❌ 공개 API 없음 (크롤링 필요) |

**제공 데이터:**
- BJ 별풍선 실시간 랭킹
- 일/주/월간 후원 통계

**주의사항:**
- 공개 API가 없어 웹 크롤링 필요
- ToS 위반 가능성 있음

### 3.3 참고: 위플랩 (WEFLAB)

| 항목 | 내용 |
|------|------|
| 공식 사이트 | https://weflab.com |
| 서비스 유형 | 오버레이 플랫폼 (경쟁 서비스) |
| 지원 플랫폼 | SOOP, 치지직, 유튜브, 트위치 |
| 시장 점유율 | 국내 1위 (스트리머 80% 사용) |

**특징:**
- SOOP 정식 API 공급 계약 체결
- 통합 채팅, 후원 알림, 목표치 그래프 등 제공
- 웹 기반 경량 서비스 (프로그램 설치 불필요)

**참고 사항:**
- 연동 대상이 아닌 경쟁 서비스
- 기능 벤치마킹 및 UX 참고용

### 3.4 종료된 서비스

#### afreehp-api (DOCHIS)

| 항목 | 내용 |
|------|------|
| GitHub | https://github.com/DOCHIS/afreehp-api |
| 상태 | ❌ **종료됨 (2024년 4월 30일)** |
| 대안 | SSAPI 사용 권장 |

**종료 사유:**
- 인프라 비용 문제
- 트래픽 확장성 한계
- 아프리카TV 업데이트로 인한 잦은 장애

### 3.5 비공식 라이브러리 목록

| 라이브러리 | 플랫폼 | GitHub | 언어 |
|-----------|--------|--------|------|
| chzzk | 치지직 | [kimcore/chzzk](https://github.com/kimcore/chzzk) | TypeScript |
| chzzkpy | 치지직 | PyPI | Python |
| tmi.js | Twitch | [tmijs/tmi.js](https://github.com/tmijs/tmi.js) | JavaScript |

---

## 4. 게임 API

### 4.1 Riot Games API (LoL, Valorant, TFT)

#### 개요

| 항목 | 내용 |
|------|------|
| 공식 문서 | https://developer.riotgames.com |
| 지원 게임 | League of Legends, VALORANT, Teamfight Tactics |
| 인증 | API Key (개인/프로덕션) |

#### API Key 발급

1. https://developer.riotgames.com 접속
2. Riot 계정으로 로그인
3. Dashboard에서 API Key 발급
4. 개인 키: 24시간 유효, Rate Limit 낮음
5. 프로덕션 키: 앱 등록 후 승인 필요

#### 주요 엔드포인트

##### 계정 정보 (Riot ID)

```http
GET https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}
X-Riot-Token: {api_key}
```

##### LoL 소환사 정보

```http
GET https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/{puuid}
X-Riot-Token: {api_key}
```

##### LoL 랭크 정보

```http
GET https://kr.api.riotgames.com/lol/league/v4/entries/by-summoner/{summonerId}
X-Riot-Token: {api_key}
```

**응답 예시:**
```json
[
  {
    "queueType": "RANKED_SOLO_5x5",
    "tier": "CHALLENGER",
    "rank": "I",
    "leaguePoints": 1247,
    "wins": 150,
    "losses": 75
  }
]
```

##### VALORANT 매치 정보

```http
GET https://kr.api.riotgames.com/val/match/v1/matchlists/by-puuid/{puuid}
X-Riot-Token: {api_key}
```

#### 구현 예시

```javascript
// server/adapters/riot.js

class RiotAdapter {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = {
      account: 'https://asia.api.riotgames.com',
      lol: 'https://kr.api.riotgames.com',
      val: 'https://kr.api.riotgames.com'
    };
  }

  async getAccountByRiotId(gameName, tagLine) {
    const response = await this.fetch(
      `${this.baseUrl.account}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
    );
    return response;
  }

  async getLolSummonerByPuuid(puuid) {
    return await this.fetch(
      `${this.baseUrl.lol}/lol/summoner/v4/summoners/by-puuid/${puuid}`
    );
  }

  async getLolRankBySummonerId(summonerId) {
    return await this.fetch(
      `${this.baseUrl.lol}/lol/league/v4/entries/by-summoner/${summonerId}`
    );
  }

  async getLolMatchHistory(puuid, count = 5) {
    const matchIds = await this.fetch(
      `${this.baseUrl.account}/lol/match/v5/matches/by-puuid/${puuid}/ids?count=${count}`
    );

    const matches = await Promise.all(
      matchIds.map(id => this.fetch(
        `${this.baseUrl.account}/lol/match/v5/matches/${id}`
      ))
    );

    return matches;
  }

  async getPlayerStats(gameName, tagLine, game = 'lol') {
    try {
      // 1. PUUID 조회
      const account = await this.getAccountByRiotId(gameName, tagLine);

      if (game === 'lol') {
        // 2. 소환사 정보
        const summoner = await this.getLolSummonerByPuuid(account.puuid);

        // 3. 랭크 정보
        const ranks = await this.getLolRankBySummonerId(summoner.id);
        const soloRank = ranks.find(r => r.queueType === 'RANKED_SOLO_5x5');

        // 4. 최근 매치
        const matches = await this.getLolMatchHistory(account.puuid, 5);

        return {
          nickname: `${gameName}#${tagLine}`,
          tier: soloRank?.tier || 'UNRANKED',
          rank: soloRank?.rank || '',
          lp: soloRank?.leaguePoints || 0,
          wins: soloRank?.wins || 0,
          losses: soloRank?.losses || 0,
          winRate: soloRank ? Math.round(soloRank.wins / (soloRank.wins + soloRank.losses) * 100) : 0,
          recentGames: matches.map(m => {
            const participant = m.info.participants.find(
              p => p.puuid === account.puuid
            );
            return { win: participant?.win || false };
          })
        };
      }

      // VALORANT, TFT 구현...
    } catch (error) {
      console.error('Riot API error:', error);
      throw error;
    }
  }

  async fetch(url) {
    const response = await fetch(url, {
      headers: { 'X-Riot-Token': this.apiKey }
    });

    if (response.status === 429) {
      // Rate Limit 처리
      const retryAfter = response.headers.get('Retry-After') || 1;
      await new Promise(r => setTimeout(r, retryAfter * 1000));
      return this.fetch(url);
    }

    if (!response.ok) {
      throw new Error(`Riot API error: ${response.status}`);
    }

    return response.json();
  }
}

module.exports = RiotAdapter;
```

#### Rate Limit

| 키 타입 | 제한 |
|--------|------|
| 개인 (Development) | 20 requests / 1 second, 100 requests / 2 minutes |
| 프로덕션 | 앱별 협의 |

---

### 4.2 Nexon Open API

#### 지원 게임

| 게임 | API 문서 |
|------|---------|
| 메이플스토리 | https://openapi.nexon.com/game/maplestory |
| FC Online | https://openapi.nexon.com/game/fconline |
| 카트라이더: 드리프트 | https://openapi.nexon.com/game/kartrider |

#### API Key 발급

1. https://openapi.nexon.com 접속
2. 넥슨 계정 로그인
3. 애플리케이션 등록
4. API Key 발급

#### 메이플스토리 API

```http
# 캐릭터 OCID 조회
GET https://open.api.nexon.com/maplestory/v1/id?character_name={characterName}
x-nxopen-api-key: {api_key}

# 캐릭터 기본 정보
GET https://open.api.nexon.com/maplestory/v1/character/basic?ocid={ocid}
x-nxopen-api-key: {api_key}
```

#### FC Online API

```http
# 유저 정보 조회
GET https://open.api.nexon.com/fconline/v1/id?nickname={nickname}
x-nxopen-api-key: {api_key}

# 매치 기록
GET https://open.api.nexon.com/fconline/v1/user/match?accessid={accessid}&matchtype=50
x-nxopen-api-key: {api_key}
```

---

### 4.3 기타 게임 API

#### 던전앤파이터 (Neople Open API)

| 항목 | 내용 |
|------|------|
| 공식 문서 | https://developers.neople.co.kr |
| 인증 | API Key |

```http
GET https://api.neople.co.kr/df/servers/{serverId}/characters?characterName={name}&apikey={api_key}
```

#### 로스트아크 (Smilegate Open API)

| 항목 | 내용 |
|------|------|
| 공식 문서 | https://developer-lostark.game.onstove.com |
| 인증 | Bearer Token |

```http
GET https://developer-lostark.game.onstove.com/characters/{characterName}/siblings
Authorization: Bearer {token}
```

#### PUBG API

| 항목 | 내용 |
|------|------|
| 공식 문서 | https://developer.pubg.com |
| 인증 | API Key |

```http
GET https://api.pubg.com/shards/steam/players?filter[playerNames]={playerName}
Authorization: Bearer {api_key}
Accept: application/vnd.api+json
```

#### 오버워치 2 (비공식)

| 항목 | 내용 |
|------|------|
| 비공식 API | https://overfast-api.tekrop.fr |
| 주의 | 공식 API 없음, 크롤링 기반 |

```http
GET https://overfast-api.tekrop.fr/players/{battletag}/summary
```

#### 마인크래프트 서버 상태

| 서비스 | URL |
|--------|-----|
| MCApi.us | https://mcapi.us |
| api.mcsrvstat.us | https://api.mcsrvstat.us |

```http
GET https://api.mcsrvstat.us/2/{serverAddress}
```

**응답 예시:**
```json
{
  "online": true,
  "ip": "play.example.com",
  "port": 25565,
  "players": {
    "online": 50,
    "max": 100,
    "list": ["Player1", "Player2"]
  },
  "version": "1.20.4",
  "motd": {
    "clean": ["Welcome to Example Server"]
  }
}
```

#### 서든어택

- **공식 API 없음**
- **대안**: 웹 크롤링 (전적 검색 사이트)
- **주의**: ToS 위반 가능성

---

### 4.4 게임 API 전체 커버리지 (12개)

| 게임 | API 소스 | 인증 | 상태 |
|------|---------|------|------|
| League of Legends | Riot Games API | API Key | 공식 |
| VALORANT | Riot Games API | API Key | 공식 |
| TFT | Riot Games API | API Key | 공식 |
| 메이플스토리 | Nexon Open API | API Key | 공식 |
| 던전앤파이터 | Neople Open API | API Key | 공식 |
| FC Online | Nexon Open API | API Key | 공식 |
| 로스트아크 | Smilegate Open API | Bearer Token | 공식 |
| PUBG | PUBG API | API Key | 공식 |
| 오버워치2 | overfast-api.tekrop.fr | 없음 | 비공식 |
| 마인크래프트 | MCApi.us, mcsrvstat.us | 없음 | 서버 상태만 |
| 서든어택 | 없음 | - | 크롤링 필요 |
| 카트라이더: 드리프트 | Nexon Open API | API Key | 공식 |

---

## 5. 통합 데이터 스키마

### 5.1 통합 이벤트 인터페이스

```typescript
// types/unified-event.ts

interface UnifiedEvent {
  // 기본 식별
  id: string;                    // UUID v4
  type: EventType;               // 이벤트 타입
  platform: Platform;            // 원본 플랫폼

  // 발신자 정보
  sender: {
    id: string;                  // 플랫폼별 고유 ID (해시)
    nickname: string;            // 표시 닉네임
    profileImage?: string;       // 프로필 이미지 URL
    role: UserRole;              // 사용자 역할
    badges?: Badge[];            // 배지 목록
  };

  // 이벤트 내용
  content: {
    message?: string;            // 메시지 내용
    amount?: number;             // 금액 (원화 환산)
    originalAmount?: number;     // 원본 금액/수량
    currency?: string;           // 원본 통화/단위
    donationType?: DonationType; // 후원 종류
  };

  // 메타데이터
  metadata: {
    timestamp: string;           // ISO 8601 형식
    rawData?: object;            // 원본 데이터 (디버그용)
    channelId: string;           // 방송 채널 ID
    broadcastId?: string;        // 방송 세션 ID
  };
}

type EventType = 'chat' | 'donation' | 'follow' | 'subscribe' | 'raid' | 'host';

type Platform = 'chzzk' | 'soop' | 'youtube' | 'twitch';

type UserRole =
  | 'streamer'    // 스트리머
  | 'manager'     // 매니저/모더레이터
  | 'vvip'        // VVIP
  | 'vip'         // VIP
  | 'fan'         // 팬클럽
  | 'subscriber'  // 구독자
  | 'supporter'   // 서포터
  | 'regular';    // 일반 시청자

type DonationType =
  | 'cheese'           // 치지직 치즈
  | 'star_balloon'     // SOOP 별풍선
  | 'ad_balloon'       // SOOP 애드벌룬
  | 'video_balloon'    // SOOP 영상풍선
  | 'mission'          // SOOP 미션
  | 'sticker'          // SOOP 스티커
  | 'super_chat'       // YouTube Super Chat
  | 'super_sticker'    // YouTube Super Sticker
  | 'bits'             // Twitch Bits
  | 'subscription';    // 구독

interface Badge {
  type: string;        // 배지 종류
  name: string;        // 배지 이름
  imageUrl?: string;   // 배지 이미지
}
```

### 5.2 데이터베이스 스키마 확장

```sql
-- 통합 이벤트 테이블 (기존 events 테이블 확장)
CREATE TABLE unified_events (
  id TEXT PRIMARY KEY,                    -- UUID
  event_type TEXT NOT NULL,               -- chat, donation, follow, subscribe
  platform TEXT NOT NULL,                 -- chzzk, soop, youtube, twitch

  -- 발신자 정보
  sender_id TEXT,
  sender_nickname TEXT NOT NULL,
  sender_profile_image TEXT,
  sender_role TEXT DEFAULT 'regular',
  sender_badges TEXT,                     -- JSON

  -- 이벤트 내용
  message TEXT,
  amount_krw INTEGER,                     -- 원화 환산 금액
  original_amount REAL,
  original_currency TEXT,
  donation_type TEXT,

  -- 메타데이터
  channel_id TEXT NOT NULL,
  broadcast_id TEXT,
  raw_data TEXT,                          -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- 사용자 연결
  user_id INTEGER REFERENCES users(id)
);

-- 인덱스
CREATE INDEX idx_unified_events_platform ON unified_events(platform);
CREATE INDEX idx_unified_events_channel ON unified_events(channel_id);
CREATE INDEX idx_unified_events_type ON unified_events(event_type);
CREATE INDEX idx_unified_events_created ON unified_events(created_at);
CREATE INDEX idx_unified_events_user ON unified_events(user_id);
```

### 5.3 정규화 서비스

```javascript
// server/services/normalizer.js

const { v4: uuidv4 } = require('uuid');

class EventNormalizer {
  /**
   * 플랫폼별 이벤트를 통합 스키마로 변환
   */
  normalize(platform, rawEvent) {
    switch (platform) {
      case 'chzzk':
        return this.normalizeChzzk(rawEvent);
      case 'soop':
        return this.normalizeSoop(rawEvent);
      case 'youtube':
        return this.normalizeYouTube(rawEvent);
      case 'twitch':
        return this.normalizeTwitch(rawEvent);
      default:
        throw new Error(`Unknown platform: ${platform}`);
    }
  }

  normalizeChzzk(raw) {
    const isChat = raw.msg?.msgTypeCode === 1;
    const isDonation = raw.msg?.msgTypeCode === 10;
    const extras = raw.msg?.extras ? JSON.parse(raw.msg.extras) : {};

    return {
      id: uuidv4(),
      type: isChat ? 'chat' : isDonation ? 'donation' : 'unknown',
      platform: 'chzzk',
      sender: {
        id: raw.msg?.profile?.userIdHash,
        nickname: extras.nickname || raw.msg?.profile?.nickname,
        profileImage: raw.msg?.profile?.profileImageUrl,
        role: this.mapChzzkRole(raw.msg?.profile?.userRoleCode),
        badges: raw.msg?.profile?.activityBadges || []
      },
      content: {
        message: raw.msg?.content,
        amount: isDonation ? extras.payAmount : undefined,
        donationType: isDonation ? 'cheese' : undefined
      },
      metadata: {
        timestamp: new Date(raw.msg?.msgTime || Date.now()).toISOString(),
        rawData: raw,
        channelId: raw.cid
      }
    };
  }

  normalizeSoop(raw) {
    const donationTypes = {
      'BALLOON': 'star_balloon',
      'ADBALLOON': 'ad_balloon',
      'VIDEO_BALLOON': 'video_balloon',
      'MISSION': 'mission',
      'STICKER': 'sticker'
    };

    const isDonation = Object.keys(donationTypes).includes(raw.action);

    return {
      id: uuidv4(),
      type: isDonation ? 'donation' : 'chat',
      platform: 'soop',
      sender: {
        id: raw.userId,
        nickname: raw.nickname,
        role: this.mapSoopGrade(raw.grade)
      },
      content: {
        message: raw.message,
        amount: isDonation ? raw.count * 100 : undefined,
        originalAmount: isDonation ? raw.count : undefined,
        currency: isDonation ? 'balloon' : undefined,
        donationType: donationTypes[raw.action]
      },
      metadata: {
        timestamp: new Date().toISOString(),
        rawData: raw,
        channelId: raw.channelId
      }
    };
  }

  normalizeYouTube(raw) {
    const isSuperChat = raw.snippet?.type === 'superChatEvent';
    const isSuperSticker = raw.snippet?.type === 'superStickerEvent';
    const isDonation = isSuperChat || isSuperSticker;

    const amountKRW = isDonation
      ? this.convertToKRW(
          parseInt(raw.snippet.amountMicros) / 1000000,
          raw.snippet.currency
        )
      : undefined;

    return {
      id: uuidv4(),
      type: isDonation ? 'donation' : 'chat',
      platform: 'youtube',
      sender: {
        id: raw.authorDetails?.channelId || raw.snippet?.supporterDetails?.channelId,
        nickname: raw.authorDetails?.displayName || raw.snippet?.supporterDetails?.displayName,
        profileImage: raw.authorDetails?.profileImageUrl || raw.snippet?.supporterDetails?.profileImageUrl,
        role: this.mapYouTubeRole(raw.authorDetails)
      },
      content: {
        message: raw.snippet?.displayMessage || raw.snippet?.commentText,
        amount: amountKRW,
        originalAmount: isDonation ? parseInt(raw.snippet.amountMicros) / 1000000 : undefined,
        currency: raw.snippet?.currency,
        donationType: isSuperSticker ? 'super_sticker' : isSuperChat ? 'super_chat' : undefined
      },
      metadata: {
        timestamp: raw.snippet?.publishedAt || raw.snippet?.createdAt,
        rawData: raw,
        channelId: raw.snippet?.liveChatId
      }
    };
  }

  normalizeTwitch(raw) {
    const eventType = raw.subscription?.type;
    const event = raw.event;

    let type = 'chat';
    let donationType;
    let amount;

    if (eventType === 'channel.cheer') {
      type = 'donation';
      donationType = 'bits';
      amount = event.bits * 14;  // 1 bit ≈ 14 KRW
    } else if (eventType?.includes('subscription')) {
      type = 'subscribe';
      donationType = 'subscription';
    }

    return {
      id: uuidv4(),
      type,
      platform: 'twitch',
      sender: {
        id: event.chatter_user_id || event.user_id,
        nickname: event.chatter_user_name || event.user_name,
        role: this.mapTwitchBadges(event.badges)
      },
      content: {
        message: event.message?.text || event.message,
        amount,
        originalAmount: event.bits,
        currency: 'bits',
        donationType
      },
      metadata: {
        timestamp: new Date().toISOString(),
        rawData: raw,
        channelId: event.broadcaster_user_id
      }
    };
  }

  // 역할 매핑 헬퍼
  mapChzzkRole(roleCode) {
    const roles = {
      'streamer': 'streamer',
      'streaming_chat_manager': 'manager',
      'common_user': 'regular'
    };
    return roles[roleCode] || 'regular';
  }

  mapSoopGrade(grade) {
    const grades = {
      'bj': 'streamer',
      'manager': 'manager',
      'fan': 'fan',
      'vip': 'vip'
    };
    return grades[grade] || 'regular';
  }

  mapYouTubeRole(authorDetails) {
    if (!authorDetails) return 'regular';
    if (authorDetails.isChatOwner) return 'streamer';
    if (authorDetails.isChatModerator) return 'manager';
    if (authorDetails.isChatSponsor) return 'subscriber';
    return 'regular';
  }

  mapTwitchBadges(badges) {
    if (!badges) return 'regular';
    if (badges.some(b => b.set_id === 'broadcaster')) return 'streamer';
    if (badges.some(b => b.set_id === 'moderator')) return 'manager';
    if (badges.some(b => b.set_id === 'vip')) return 'vip';
    if (badges.some(b => b.set_id === 'subscriber')) return 'subscriber';
    return 'regular';
  }

  // 환율 변환 (간단 버전)
  convertToKRW(amount, currency) {
    const rates = {
      'USD': 1350,
      'KRW': 1,
      'JPY': 9,
      'EUR': 1450
    };
    return Math.round(amount * (rates[currency] || 1));
  }
}

module.exports = new EventNormalizer();
```

---

## 6. 구현 로드맵

### 6.1 Phase 1: 기반 구축 (2주)

| 작업 | 설명 | 파일 |
|------|------|------|
| Adapter 인터페이스 정의 | 공통 인터페이스 설계 | `server/adapters/base.js` |
| Normalizer 서비스 구현 | 정규화 로직 | `server/services/normalizer.js` |
| unified_events 테이블 | DB 스키마 확장 | `server/index.js` |
| 테스트 프레임워크 | Mock 데이터, 단위 테스트 | `tests/` |

### 6.2 Phase 2: 치지직 연동 (2주)

| 작업 | 설명 | 파일 |
|------|------|------|
| ChzzkAdapter 구현 | WebSocket 클라이언트 | `server/adapters/chzzk.js` |
| 채팅 이벤트 처리 | 실시간 채팅 수집 | - |
| 후원 이벤트 처리 | 치즈 후원 감지 | - |
| 통합 테스트 | E2E 테스트 | `tests/chzzk.test.js` |

### 6.3 Phase 3: SOOP 연동 (3주)

| 작업 | 설명 | 비고 |
|------|------|------|
| API KEY 제휴 신청 | 사업 협의 | 1-2주 소요 |
| SoopAdapter 구현 | SDK 연동 | `server/adapters/soop.js` |
| 다양한 후원 처리 | 별풍선, 애드벌룬 등 | - |
| 통합 테스트 | E2E 테스트 | `tests/soop.test.js` |

### 6.4 Phase 4: YouTube/Twitch 연동 (2주)

| 작업 | 설명 | 파일 |
|------|------|------|
| YouTubeAdapter 구현 | Polling 기반 | `server/adapters/youtube.js` |
| TwitchAdapter 구현 | EventSub WebSocket | `server/adapters/twitch.js` |
| 통합 테스트 | 크로스 플랫폼 테스트 | `tests/` |

### 6.5 Phase 5: 게임 API 연동 (2주)

| 작업 | 설명 | 파일 |
|------|------|------|
| RiotAdapter 구현 | LoL, VALORANT | `server/adapters/riot.js` |
| NexonAdapter 구현 | 메이플, FC Online | `server/adapters/nexon.js` |
| 기타 게임 API | 던파, 로아, PUBG 등 | `server/adapters/games.js` |
| 대시보드 통합 | 게임별 분석 UI | `client/src/components/` |

### 6.6 의존성 관계도

```
┌─────────────────────────────────────────────────────────────┐
│                     Implementation Order                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Phase 1: 기반 구축 ────────────────────────────────────────│
│       │                                                      │
│       ├──────────────────────────────────────────────────── │
│       │                                                      │
│       ▼                                                      │
│  Phase 2: Chzzk ─────┬─── Phase 3: SOOP ─────────────────── │
│       │              │          │                            │
│       │              │          │                            │
│       ▼              ▼          ▼                            │
│  Phase 4: YouTube/Twitch ────────────────────────────────── │
│       │                                                      │
│       ▼                                                      │
│  Phase 5: Game APIs ─────────────────────────────────────── │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 6.7 예상 총 기간

| Phase | 기간 | 비고 |
|-------|------|------|
| Phase 1 | 2주 | 병렬 진행 가능 |
| Phase 2 | 2주 | Phase 1 완료 후 |
| Phase 3 | 3주 | API 제휴 대기 시간 포함 |
| Phase 4 | 2주 | Phase 2와 병렬 가능 |
| Phase 5 | 2주 | Phase 4 완료 후 |
| **총합** | **11-12주** | |

---

## 7. 카테고리 크롤링 시스템

SOOP과 Chzzk 플랫폼에서 게임/카테고리 목록을 크롤링하여 통합 게임 카탈로그를 제공합니다.

### 7.1 아키텍처

```
┌─────────────────────────────────────────────────────────────────────┐
│                   Category Crawling System                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                    CategoryService (Orchestrator)                ││
│  │  - 스케줄링 관리                                                  ││
│  │  - API 제공                                                       ││
│  │  - 캐시 관리                                                       ││
│  └───────────────────────────┬─────────────────────────────────────┘│
│                              │                                       │
│              ┌───────────────┴───────────────┐                      │
│              │                               │                       │
│  ┌───────────▼───────────┐    ┌─────────────▼─────────────┐        │
│  │   CategoryCrawler     │    │    CategoryMapper         │        │
│  │  - fetchSoopCategories│    │  - autoMapCategory        │        │
│  │  - fetchChzzkCategories│   │  - fuzzyMatch (Levenshtein)│        │
│  │  - updateViewerCounts │    │  - manualMapping          │        │
│  └───────────┬───────────┘    └───────────────────────────┘        │
│              │                                                       │
│  ┌───────────┴───────────────────────────────────────────┐         │
│  │                  Platform Adapters                     │         │
│  │  ┌─────────────────┐      ┌─────────────────┐         │         │
│  │  │  SOOP Adapter   │      │  Chzzk Adapter  │         │         │
│  │  │  getCategoryList│      │  discoverCategories│      │         │
│  │  └─────────────────┘      └─────────────────┘         │         │
│  └───────────────────────────────────────────────────────┘         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### 스케줄링 구조

| 작업 | 주기 | 설명 |
|------|------|------|
| 전체 크롤링 (Full Crawl) | 6시간 | 모든 플랫폼 카테고리 수집 |
| 시청자 수 업데이트 | 5분 | 활성 카테고리 시청자/스트리머 수 갱신 |
| 통계 기록 | 15분 | 시계열 통계 저장 |
| 매핑 갱신 | 24시간 | 미매핑 카테고리 자동 매핑 |

#### Rate Limiting

| 플랫폼 | 제한 |
|--------|------|
| SOOP | 2 requests/second |
| Chzzk | 5 requests/second |

---

### 7.2 데이터베이스 스키마

#### platform_categories (플랫폼별 카테고리)

```sql
CREATE TABLE platform_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,              -- 'soop', 'chzzk'
  platform_category_id TEXT NOT NULL,  -- 플랫폼 고유 ID
  platform_category_name TEXT NOT NULL,-- 카테고리명
  category_type TEXT,                  -- 카테고리 타입
  thumbnail_url TEXT,                  -- 썸네일 이미지
  viewer_count INTEGER DEFAULT 0,      -- 현재 시청자 수
  streamer_count INTEGER DEFAULT 0,    -- 활성 스트리머 수
  is_active INTEGER DEFAULT 1,         -- 활성 상태
  first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(platform, platform_category_id)
);

CREATE INDEX idx_platform_categories_platform ON platform_categories(platform);
CREATE INDEX idx_platform_categories_viewers ON platform_categories(viewer_count DESC);
CREATE INDEX idx_platform_categories_active ON platform_categories(is_active);
```

#### unified_games (통합 게임 카탈로그)

```sql
CREATE TABLE unified_games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,                  -- 영문 이름
  name_kr TEXT,                        -- 한글 이름
  genre TEXT,                          -- 장르 (영문)
  genre_kr TEXT,                       -- 장르 (한글)
  developer TEXT,                      -- 개발사
  release_date TEXT,                   -- 출시일
  description TEXT,                    -- 설명
  image_url TEXT,                      -- 대표 이미지
  is_verified INTEGER DEFAULT 0,       -- 검증 여부
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_unified_games_name ON unified_games(name);
CREATE INDEX idx_unified_games_verified ON unified_games(is_verified);
```

#### category_game_mappings (카테고리-게임 매핑)

```sql
CREATE TABLE category_game_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unified_game_id INTEGER REFERENCES unified_games(id),
  platform TEXT NOT NULL,
  platform_category_id TEXT NOT NULL,
  confidence REAL DEFAULT 1.0,         -- 매핑 신뢰도 (0.0-1.0)
  is_manual INTEGER DEFAULT 0,         -- 수동 매핑 여부
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(platform, platform_category_id)
);

CREATE INDEX idx_category_mappings_game ON category_game_mappings(unified_game_id);
CREATE INDEX idx_category_mappings_confidence ON category_game_mappings(confidence);
```

#### category_stats (카테고리 통계 시계열)

```sql
CREATE TABLE category_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  platform_category_id TEXT NOT NULL,
  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  viewer_count INTEGER DEFAULT 0,
  streamer_count INTEGER DEFAULT 0
);

CREATE INDEX idx_category_stats_time ON category_stats(recorded_at);
CREATE INDEX idx_category_stats_lookup ON category_stats(platform, platform_category_id, recorded_at);
```

---

### 7.3 API 엔드포인트

#### 플랫폼 카테고리 API

##### SOOP 카테고리 목록

```http
GET https://sch.sooplive.co.kr/api.php?m=categoryList&nPageNo=1&nListCnt=100
```

**응답 예시:**
```json
{
  "result": 1,
  "data": [
    {
      "category_no": "00130000",
      "category_name": "리그 오브 레전드",
      "category_type": "game",
      "broad_cnt": 150,
      "total_view_cnt": 50000
    }
  ],
  "total_cnt": 500,
  "page_no": 1
}
```

##### Chzzk 카테고리 발견 (라이브 스트림 기반)

```http
GET https://api.chzzk.naver.com/service/v1/home/lives?size=100&offset=0
```

**응답 예시:**
```json
{
  "content": {
    "data": [
      {
        "liveId": 12345,
        "liveTitle": "방송 제목",
        "liveCategoryValue": "League_of_Legends",
        "concurrentUserCount": 5000
      }
    ]
  }
}
```

---

#### 내부 REST API

##### 통합 게임 카탈로그 조회

```http
GET /api/categories
```

**Query Parameters:**
| 파라미터 | 설명 | 기본값 |
|---------|------|--------|
| sort | 정렬 기준 (viewers, streamers, name) | viewers |
| order | 정렬 순서 (asc, desc) | desc |
| limit | 결과 수 제한 | 100 |
| genre | 장르 필터 | - |
| search | 검색어 | - |

**응답 예시:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "League of Legends",
      "nameKr": "리그 오브 레전드",
      "genre": "MOBA",
      "developer": "Riot Games",
      "imageUrl": "https://...",
      "isVerified": true,
      "totalViewers": 150000,
      "totalStreamers": 500,
      "platforms": ["soop", "chzzk"]
    }
  ],
  "count": 50
}
```

##### 카탈로그 통계 조회

```http
GET /api/categories/stats
```

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "total_games": 200,
    "verified_games": 50,
    "total_categories": 300,
    "soop_categories": 150,
    "chzzk_categories": 150,
    "total_viewers": 500000,
    "total_streamers": 2000
  }
}
```

##### 플랫폼별 카테고리 조회

```http
GET /api/categories/platform/:platform
```

**지원 플랫폼:** soop, chzzk, twitch, youtube

**응답 예시:**
```json
{
  "success": true,
  "data": [
    {
      "platform": "soop",
      "platform_category_id": "00130000",
      "platform_category_name": "리그 오브 레전드",
      "viewer_count": 50000,
      "streamer_count": 150,
      "unified_name": "League of Legends",
      "unified_name_kr": "리그 오브 레전드"
    }
  ],
  "count": 100
}
```

##### 게임 상세 조회

```http
GET /api/categories/:id
```

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "League of Legends",
    "nameKr": "리그 오브 레전드",
    "genre": "MOBA",
    "developer": "Riot Games",
    "description": "5v5 팀 기반 전략 게임",
    "imageUrl": "https://...",
    "isVerified": true,
    "totalViewers": 150000,
    "totalStreamers": 500,
    "platforms": [
      {
        "platform": "soop",
        "categoryId": "00130000",
        "categoryName": "리그 오브 레전드",
        "viewerCount": 80000,
        "streamerCount": 300,
        "confidence": 1.0,
        "isManual": false
      },
      {
        "platform": "chzzk",
        "categoryId": "League_of_Legends",
        "categoryName": "리그 오브 레전드",
        "viewerCount": 70000,
        "streamerCount": 200,
        "confidence": 1.0,
        "isManual": false
      }
    ]
  }
}
```

##### 게임 통계 조회 (시계열)

```http
GET /api/categories/:id/stats?period=24h
```

**Query Parameters:**
| 파라미터 | 설명 | 기본값 |
|---------|------|--------|
| period | 기간 (1h, 24h, 7d, 30d) | 24h |

**응답 예시:**
```json
{
  "success": true,
  "data": [
    {
      "recorded_at": "2024-01-01T12:00:00Z",
      "total_viewers": 150000,
      "total_streamers": 500
    },
    {
      "recorded_at": "2024-01-01T12:15:00Z",
      "total_viewers": 155000,
      "total_streamers": 510
    }
  ],
  "period": "24h"
}
```

##### 강제 새로고침 (관리자 전용)

```http
POST /api/categories/refresh
Authorization: Bearer {JWT_TOKEN}
```

**응답 예시:**
```json
{
  "success": true,
  "message": "Categories refreshed successfully",
  "data": { "success": true }
}
```

##### 수동 매핑 설정 (관리자 전용)

```http
POST /api/categories/map
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "platform": "soop",
  "platformCategoryId": "00130000",
  "unifiedGameId": 1
}
```

**응답 예시:**
```json
{
  "success": true,
  "message": "Mapping updated successfully"
}
```

##### 매핑 문제 목록 (관리자 전용)

```http
GET /api/categories/issues
Authorization: Bearer {JWT_TOKEN}
```

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "unmapped": [
      {
        "platform": "soop",
        "platform_category_id": "00999999",
        "platform_category_name": "새로운 게임",
        "viewer_count": 1000
      }
    ],
    "lowConfidence": [
      {
        "platform": "chzzk",
        "platform_category_id": "some_game",
        "platform_category_name": "어떤 게임",
        "confidence": 0.75,
        "unified_name": "Some Game"
      }
    ]
  }
}
```

---

### 7.4 서비스 구현

#### 파일 구조

| 파일 | 설명 |
|------|------|
| `server/services/categoryService.js` | 메인 오케스트레이터 (스케줄링, API 제공) |
| `server/services/categoryCrawler.js` | 플랫폼별 카테고리 크롤링 |
| `server/services/categoryMapper.js` | 크로스 플랫폼 카테고리 매핑 |
| `server/routes/categories.js` | REST API 라우트 |
| `server/adapters/soop.js` | SOOP 어댑터 (getCategoryList) |
| `server/adapters/chzzk.js` | Chzzk 어댑터 (discoverCategories) |

#### CategoryCrawler 주요 메서드

```javascript
class CategoryCrawler {
  // SOOP 카테고리 목록 조회 (페이지네이션)
  async fetchSoopCategories();

  // Chzzk 라이브에서 카테고리 발견
  async fetchChzzkCategories();

  // 모든 플랫폼 크롤링
  async crawlAllPlatforms();

  // 시청자 수 업데이트 (빠른 갱신)
  async updateViewerCounts();

  // 카테고리 upsert
  async upsertCategory(platform, data);

  // 통계 기록
  async recordStats(platform, categoryId, viewers, streamers);

  // 오래된 카테고리 비활성화
  async deactivateStaleCategories();
}
```

#### CategoryMapper 주요 메서드

```javascript
class CategoryMapper {
  // 문자열 유사도 계산 (Levenshtein)
  calculateSimilarity(a, b);

  // 알려진 매핑에서 게임 찾기
  findKnownMapping(categoryName);

  // 자동 매핑
  async autoMapCategory(category);

  // 수동 매핑 설정
  async setManualMapping(platform, categoryId, gameId);

  // 매핑되지 않은 카테고리 조회
  async getUnmappedCategories();

  // 낮은 신뢰도 매핑 조회
  async getLowConfidenceMappings(threshold);

  // 모든 미매핑 카테고리 자동 매핑
  async mapAllUnmapped();
}
```

#### 알려진 매핑 (시드 데이터)

자동 매핑을 위한 20개 주요 게임 초기 데이터:

| 게임 | 별칭 | 장르 | 개발사 |
|------|------|------|--------|
| 리그 오브 레전드 | LoL, 롤 | MOBA | Riot Games |
| 발로란트 | VALORANT | FPS | Riot Games |
| 메이플스토리 | 메이플 | MMORPG | Nexon |
| 던전앤파이터 | 던파, DNF | Action RPG | Neople |
| FC 온라인 | FIFA Online | Sports | Nexon |
| 로스트아크 | 로아 | MMORPG | Smilegate RPG |
| 배틀그라운드 | PUBG, 배그 | Battle Royale | PUBG Corporation |
| 오버워치 2 | 오버워치 | FPS | Blizzard Entertainment |
| 마인크래프트 | Minecraft | Sandbox | Mojang Studios |
| 전략적 팀 전투 | TFT, 롤토체스 | Auto Battler | Riot Games |

#### 매핑 신뢰도 임계값

| 신뢰도 | 처리 |
|--------|------|
| 1.0 | 알려진 매핑 (정확 일치) |
| 0.85 이상 | 자동 매핑 적용 |
| 0.85 미만 | 수동 검토 필요 |

#### 사용 예시

```javascript
// 서버 초기화 시 CategoryService 시작
const CategoryService = require('./services/categoryService');
const categoryService = new CategoryService(db, io);
await categoryService.initialize();

// 게임 카탈로그 조회
const games = await categoryService.getGameCatalog({
  sort: 'viewers',
  order: 'desc',
  limit: 50,
  search: '리그'
});

// 게임 상세 조회
const game = await categoryService.getGameDetail(1);

// 게임 통계 조회 (시계열)
const stats = await categoryService.getGameStats(1, '24h');

// 강제 새로고침
await categoryService.forceRefresh();

// 수동 매핑
await categoryService.setManualMapping('soop', '00130000', 1);
```

---

## 참고 문서

### 스트리밍 플랫폼

- [치지직 공식 API 문서](https://chzzk.gitbook.io/chzzk)
- [kimcore/chzzk (비공식 라이브러리)](https://github.com/kimcore/chzzk)
- [SOOP 개발자 센터](https://developers.afreecatv.com)
- [YouTube Live Streaming API](https://developers.google.com/youtube/v3/live)
- [Twitch EventSub](https://dev.twitch.tv/docs/eventsub)

### 게임 API

- [Riot Games Developer Portal](https://developer.riotgames.com)
- [Nexon Open API](https://openapi.nexon.com)
- [Neople Developers (던파)](https://developers.neople.co.kr)
- [Lost Ark API](https://developer-lostark.game.onstove.com)
- [PUBG Developer Portal](https://developer.pubg.com)

### 제3자 서비스

- [SSAPI](https://ssapi.kr)
- [MCApi.us](https://mcapi.us)
- [api.mcsrvstat.us](https://api.mcsrvstat.us)
