/**
 * TwitchAdapter - Twitch EventSub 채팅/후원 어댑터
 *
 * Twitch 라이브 스트림의 채팅, Bits, 구독 이벤트를 실시간으로 수신합니다.
 * EventSub WebSocket을 사용합니다.
 *
 * @see https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types
 */

const WebSocket = require("ws");
const BaseAdapter = require("./base");
const { v4: uuidv4 } = require("uuid");

// Twitch EventSub 메시지 타입
const MESSAGE_TYPES = {
  SESSION_WELCOME: "session_welcome",
  SESSION_KEEPALIVE: "session_keepalive",
  SESSION_RECONNECT: "session_reconnect",
  NOTIFICATION: "notification",
  REVOCATION: "revocation",
};

// 구독할 이벤트 타입
const SUBSCRIPTION_TYPES = {
  CHAT: "channel.chat.message",
  CHEER: "channel.cheer",
  SUBSCRIBE: "channel.subscribe",
  SUBSCRIPTION_GIFT: "channel.subscription.gift",
  SUBSCRIPTION_MESSAGE: "channel.subscription.message",
  FOLLOW: "channel.follow",
  RAID: "channel.raid",
  CHANNEL_UPDATE: "channel.update",
};

class TwitchAdapter extends BaseAdapter {
  constructor(options = {}) {
    super(options);

    this.platform = "twitch";
    this.ws = null;
    this.sessionId = null;
    this.clientId = options.clientId || process.env.TWITCH_CLIENT_ID;
    this.clientSecret = options.clientSecret || process.env.TWITCH_CLIENT_SECRET;
    this.accessToken = options.accessToken || null;
    this.broadcasterId = options.broadcasterId || null; // 채널 ID (숫자)
    this.userId = options.userId || null; // 봇 사용자 ID (채팅 수신용)
    this.keepaliveTimeout = null;
    this.keepaliveIntervalMs = 10000; // 10초 (Twitch keepalive 주기)
    this.subscriptions = new Set();

    // EventSub WebSocket URL
    this.wsUrl = "wss://eventsub.wss.twitch.tv/ws";
  }

  /**
   * Twitch EventSub에 연결
   */
  async connect() {
    try {
      if (!this.clientId) {
        throw new Error("Twitch Client ID is required");
      }

      // 1. 액세스 토큰 가져오기 (없는 경우)
      if (!this.accessToken) {
        this.accessToken = await this.getAppAccessToken();
      }

      // 2. 채널 ID 조회 (channelId가 username인 경우)
      if (this.channelId && !this.broadcasterId) {
        const userInfo = await this.getUserByLogin(this.channelId);
        if (userInfo) {
          this.broadcasterId = userInfo.id;
          console.log(`[twitch] Broadcaster ID: ${this.broadcasterId}`);
        } else {
          throw new Error(`User not found: ${this.channelId}`);
        }
      }

      // 3. WebSocket 연결
      await this.connectWebSocket();
    } catch (error) {
      console.error(`[twitch] Connection error:`, error.message);
      this.emitError(error);
      throw error;
    }
  }

  /**
   * App Access Token 가져오기 (Client Credentials Flow)
   */
  async getAppAccessToken() {
    try {
      const url = "https://id.twitch.tv/oauth2/token";
      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: "client_credentials",
      });

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      const data = await response.json();

      if (data.access_token) {
        console.log(`[twitch] Got access token`);
        return data.access_token;
      } else {
        throw new Error("Failed to get access token");
      }
    } catch (error) {
      console.error(`[twitch] Token error:`, error.message);
      throw error;
    }
  }

  /**
   * 사용자 정보 조회 (login → user_id)
   */
  async getUserByLogin(login) {
    try {
      const url = `https://api.twitch.tv/helix/users?login=${login}`;
      const response = await fetch(url, {
        headers: {
          "Client-ID": this.clientId,
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      const data = await response.json();
      return data.data?.[0] || null;
    } catch (error) {
      console.error(`[twitch] Get user error:`, error.message);
      return null;
    }
  }

  /**
   * WebSocket 연결
   */
  connectWebSocket() {
    return new Promise((resolve, reject) => {
      console.log(`[twitch] Connecting to EventSub WebSocket`);

      this.ws = new WebSocket(this.wsUrl);

      this.ws.on("open", () => {
        console.log(`[twitch] WebSocket connected`);
      });

      this.ws.on("message", async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(message);

          // Welcome 메시지 수신 시 연결 완료
          if (message.metadata?.message_type === MESSAGE_TYPES.SESSION_WELCOME) {
            this.onConnected();
            resolve();
          }
        } catch (error) {
          console.error(`[twitch] Message parse error:`, error.message);
        }
      });

      this.ws.on("close", (code, reason) => {
        console.log(`[twitch] WebSocket closed: ${code} ${reason}`);
        this.clearKeepalive();
        this.onDisconnected();

        // 자동 재연결
        if (this.isConnected) {
          this.attemptReconnect();
        }
      });

      this.ws.on("error", (error) => {
        console.error(`[twitch] WebSocket error:`, error.message);
        this.emitError(error);
        reject(error);
      });

      // 타임아웃
      setTimeout(() => {
        if (!this.isConnected) {
          reject(new Error("Connection timeout"));
        }
      }, 15000);
    });
  }

  /**
   * 메시지 처리
   */
  async handleMessage(message) {
    const messageType = message.metadata?.message_type;

    switch (messageType) {
      case MESSAGE_TYPES.SESSION_WELCOME:
        this.sessionId = message.payload.session.id;
        console.log(`[twitch] Session ID: ${this.sessionId}`);
        // 이벤트 구독 시작
        await this.subscribeToEvents();
        this.resetKeepalive();
        break;

      case MESSAGE_TYPES.SESSION_KEEPALIVE:
        this.resetKeepalive();
        break;

      case MESSAGE_TYPES.SESSION_RECONNECT:
        console.log(`[twitch] Reconnect requested`);
        const reconnectUrl = message.payload.session.reconnect_url;
        await this.handleReconnect(reconnectUrl);
        break;

      case MESSAGE_TYPES.NOTIFICATION:
        this.processEvent(message.payload);
        this.resetKeepalive();
        break;

      case MESSAGE_TYPES.REVOCATION:
        console.log(`[twitch] Subscription revoked:`, message.payload.subscription.type);
        this.subscriptions.delete(message.payload.subscription.id);
        break;
    }
  }

  /**
   * Keepalive 타이머 리셋
   */
  resetKeepalive() {
    this.clearKeepalive();
    this.keepaliveTimeout = setTimeout(() => {
      console.log(`[twitch] Keepalive timeout - reconnecting`);
      this.disconnect();
      this.attemptReconnect();
    }, this.keepaliveIntervalMs * 3); // keepalive 주기의 3배
  }

  /**
   * Keepalive 타이머 제거
   */
  clearKeepalive() {
    if (this.keepaliveTimeout) {
      clearTimeout(this.keepaliveTimeout);
      this.keepaliveTimeout = null;
    }
  }

  /**
   * 이벤트 구독
   */
  async subscribeToEvents() {
    if (!this.broadcasterId) {
      console.error(`[twitch] No broadcaster ID - cannot subscribe to events`);
      return;
    }

    // 구독할 이벤트 목록
    const eventsToSubscribe = [
      // 채팅 메시지 (user_id 필요)
      // { type: SUBSCRIPTION_TYPES.CHAT, condition: { broadcaster_user_id: this.broadcasterId, user_id: this.userId } },
      // Bits (Cheer)
      { type: SUBSCRIPTION_TYPES.CHEER, condition: { broadcaster_user_id: this.broadcasterId } },
      // 구독
      { type: SUBSCRIPTION_TYPES.SUBSCRIBE, condition: { broadcaster_user_id: this.broadcasterId } },
      // 구독 선물
      { type: SUBSCRIPTION_TYPES.SUBSCRIPTION_GIFT, condition: { broadcaster_user_id: this.broadcasterId } },
      // 구독 메시지 (재구독 포함)
      { type: SUBSCRIPTION_TYPES.SUBSCRIPTION_MESSAGE, condition: { broadcaster_user_id: this.broadcasterId } },
      // 팔로우 (moderator_user_id 필요)
      // { type: SUBSCRIPTION_TYPES.FOLLOW, condition: { broadcaster_user_id: this.broadcasterId, moderator_user_id: this.userId } },
      // 레이드
      { type: SUBSCRIPTION_TYPES.RAID, condition: { to_broadcaster_user_id: this.broadcasterId } },
    ];

    for (const event of eventsToSubscribe) {
      try {
        await this.createSubscription(event.type, event.condition);
        console.log(`[twitch] Subscribed to: ${event.type}`);
      } catch (error) {
        console.error(`[twitch] Failed to subscribe to ${event.type}:`, error.message);
      }
    }
  }

  /**
   * EventSub 구독 생성
   */
  async createSubscription(type, condition) {
    const url = "https://api.twitch.tv/helix/eventsub/subscriptions";

    const body = {
      type,
      version: "1",
      condition,
      transport: {
        method: "websocket",
        session_id: this.sessionId,
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Client-ID": this.clientId,
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.message || data.error);
    }

    if (data.data?.[0]) {
      this.subscriptions.add(data.data[0].id);
    }

    return data;
  }

  /**
   * 이벤트 처리
   */
  processEvent(payload) {
    const subscription = payload.subscription;
    const eventData = payload.event;

    switch (subscription.type) {
      case SUBSCRIPTION_TYPES.CHAT:
        this.processChatMessage(eventData);
        break;
      case SUBSCRIPTION_TYPES.CHEER:
        this.processCheer(eventData);
        break;
      case SUBSCRIPTION_TYPES.SUBSCRIBE:
        this.processSubscribe(eventData);
        break;
      case SUBSCRIPTION_TYPES.SUBSCRIPTION_GIFT:
        this.processSubscriptionGift(eventData);
        break;
      case SUBSCRIPTION_TYPES.SUBSCRIPTION_MESSAGE:
        this.processSubscriptionMessage(eventData);
        break;
      case SUBSCRIPTION_TYPES.FOLLOW:
        this.processFollow(eventData);
        break;
      case SUBSCRIPTION_TYPES.RAID:
        this.processRaid(eventData);
        break;
      default:
        console.log(`[twitch] Unknown event type: ${subscription.type}`);
    }
  }

  /**
   * 채팅 메시지 처리
   */
  processChatMessage(event) {
    try {
      const twitchEvent = {
        id: event.message_id || uuidv4(),
        type: "chat",
        platform: "twitch",
        sender: {
          id: event.chatter_user_id,
          nickname: event.chatter_user_name,
          profileImage: null,
          role: this.mapBadges(event.badges),
          badges: event.badges || [],
        },
        content: {
          message: event.message?.text || "",
        },
        metadata: {
          timestamp: new Date().toISOString(),
          channelId: this.channelId,
          broadcasterId: event.broadcaster_user_id,
          color: event.color,
          rawData: event,
        },
      };

      this.emitEvent(twitchEvent);
    } catch (error) {
      console.error(`[twitch] Chat processing error:`, error.message);
    }
  }

  /**
   * Bits (Cheer) 처리
   */
  processCheer(event) {
    try {
      // 1 bit ≈ 14 KRW (대략)
      const amountKRW = event.bits * 14;

      const twitchEvent = {
        id: uuidv4(),
        type: "donation",
        platform: "twitch",
        sender: {
          id: event.user_id,
          nickname: event.user_name,
          profileImage: null,
          role: "regular",
        },
        content: {
          message: event.message || "",
          amount: amountKRW,
          originalAmount: event.bits,
          currency: "bits",
          donationType: "bits",
        },
        metadata: {
          timestamp: new Date().toISOString(),
          channelId: this.channelId,
          broadcasterId: event.broadcaster_user_id,
          isAnonymous: event.is_anonymous || false,
          rawData: event,
        },
      };

      this.emitEvent(twitchEvent);
      console.log(`[twitch] 💎 Bits: ${event.user_name || "Anonymous"}님이 ${event.bits} bits - "${event.message || ""}"`);
    } catch (error) {
      console.error(`[twitch] Cheer processing error:`, error.message);
    }
  }

  /**
   * 구독 처리
   */
  processSubscribe(event) {
    try {
      const twitchEvent = {
        id: uuidv4(),
        type: "subscribe",
        platform: "twitch",
        sender: {
          id: event.user_id,
          nickname: event.user_name,
          profileImage: null,
        },
        content: {
          message: `${event.user_name}님이 구독`,
          tier: this.mapTier(event.tier),
          tierLevel: event.tier,
          isGift: event.is_gift || false,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          channelId: this.channelId,
          broadcasterId: event.broadcaster_user_id,
          rawData: event,
        },
      };

      this.emitEvent(twitchEvent);
      console.log(`[twitch] ⭐ 구독: ${event.user_name}님이 ${this.mapTier(event.tier)} 구독`);
    } catch (error) {
      console.error(`[twitch] Subscribe processing error:`, error.message);
    }
  }

  /**
   * 구독 선물 처리
   */
  processSubscriptionGift(event) {
    try {
      const twitchEvent = {
        id: uuidv4(),
        type: "subscribe",
        platform: "twitch",
        sender: {
          id: event.user_id,
          nickname: event.user_name,
          profileImage: null,
        },
        content: {
          message: `${event.user_name}님이 ${event.total} 구독 선물`,
          tier: this.mapTier(event.tier),
          tierLevel: event.tier,
          isGift: true,
          giftCount: event.total,
          cumulativeTotal: event.cumulative_total,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          channelId: this.channelId,
          broadcasterId: event.broadcaster_user_id,
          isAnonymous: event.is_anonymous || false,
          rawData: event,
        },
      };

      this.emitEvent(twitchEvent);
      console.log(`[twitch] 🎁 구독 선물: ${event.user_name || "Anonymous"}님이 ${event.total}개 선물 (${this.mapTier(event.tier)})`);
    } catch (error) {
      console.error(`[twitch] Subscription gift processing error:`, error.message);
    }
  }

  /**
   * 구독 메시지 (재구독) 처리
   */
  processSubscriptionMessage(event) {
    try {
      const twitchEvent = {
        id: uuidv4(),
        type: "subscribe",
        platform: "twitch",
        sender: {
          id: event.user_id,
          nickname: event.user_name,
          profileImage: null,
        },
        content: {
          message: event.message?.text || "",
          tier: this.mapTier(event.tier),
          tierLevel: event.tier,
          months: event.cumulative_months,
          streakMonths: event.streak_months,
          durationMonths: event.duration_months,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          channelId: this.channelId,
          broadcasterId: event.broadcaster_user_id,
          rawData: event,
        },
      };

      this.emitEvent(twitchEvent);
      console.log(`[twitch] ⭐ 재구독: ${event.user_name}님이 ${event.cumulative_months}개월 (${this.mapTier(event.tier)}) - "${event.message?.text || ""}"`);
    } catch (error) {
      console.error(`[twitch] Subscription message processing error:`, error.message);
    }
  }

  /**
   * 팔로우 처리
   */
  processFollow(event) {
    try {
      const twitchEvent = {
        id: uuidv4(),
        type: "follow",
        platform: "twitch",
        sender: {
          id: event.user_id,
          nickname: event.user_name,
          profileImage: null,
        },
        content: {
          message: `${event.user_name}님이 팔로우`,
        },
        metadata: {
          timestamp: event.followed_at || new Date().toISOString(),
          channelId: this.channelId,
          broadcasterId: event.broadcaster_user_id,
          rawData: event,
        },
      };

      this.emitEvent(twitchEvent);
      console.log(`[twitch] 👋 팔로우: ${event.user_name}님`);
    } catch (error) {
      console.error(`[twitch] Follow processing error:`, error.message);
    }
  }

  /**
   * 레이드 처리
   */
  processRaid(event) {
    try {
      const twitchEvent = {
        id: uuidv4(),
        type: "raid",
        platform: "twitch",
        sender: {
          id: event.from_broadcaster_user_id,
          nickname: event.from_broadcaster_user_name,
          profileImage: null,
        },
        content: {
          message: `${event.from_broadcaster_user_name}님이 ${event.viewers}명과 함께 레이드`,
          viewers: event.viewers,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          channelId: this.channelId,
          broadcasterId: event.to_broadcaster_user_id,
          rawData: event,
        },
      };

      this.emitEvent(twitchEvent);
      console.log(`[twitch] 🎉 레이드: ${event.from_broadcaster_user_name}님이 ${event.viewers}명과 함께!`);
    } catch (error) {
      console.error(`[twitch] Raid processing error:`, error.message);
    }
  }

  /**
   * 뱃지 → 역할 매핑
   */
  mapBadges(badges) {
    if (!badges || !Array.isArray(badges)) return "regular";
    if (badges.some((b) => b.set_id === "broadcaster")) return "streamer";
    if (badges.some((b) => b.set_id === "moderator")) return "manager";
    if (badges.some((b) => b.set_id === "vip")) return "vip";
    if (badges.some((b) => b.set_id === "subscriber")) return "subscriber";
    return "regular";
  }

  /**
   * 구독 티어 매핑
   */
  mapTier(tier) {
    const tiers = {
      "1000": "Tier 1",
      "2000": "Tier 2",
      "3000": "Tier 3",
    };
    return tiers[tier] || "Tier 1";
  }

  /**
   * 재연결 처리
   */
  async handleReconnect(reconnectUrl) {
    try {
      // 기존 연결 유지하면서 새 연결 생성
      const oldWs = this.ws;

      this.ws = new WebSocket(reconnectUrl);

      this.ws.on("open", () => {
        console.log(`[twitch] Reconnected to new session`);
        // 기존 연결 종료
        if (oldWs) {
          oldWs.close();
        }
      });

      this.ws.on("message", async (data) => {
        const message = JSON.parse(data.toString());
        await this.handleMessage(message);
      });

      this.ws.on("error", (error) => {
        console.error(`[twitch] Reconnect error:`, error.message);
      });
    } catch (error) {
      console.error(`[twitch] Reconnect failed:`, error.message);
    }
  }

  /**
   * 연결 해제
   */
  disconnect() {
    this.clearKeepalive();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    this.sessionId = null;
    this.subscriptions.clear();
    console.log(`[twitch] Disconnected`);
  }

  /**
   * 채널 정보 조회 (외부 호출용)
   */
  async getChannelInfo() {
    if (!this.broadcasterId) return null;

    try {
      const url = `https://api.twitch.tv/helix/channels?broadcaster_id=${this.broadcasterId}`;
      const response = await fetch(url, {
        headers: {
          "Client-ID": this.clientId,
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      const data = await response.json();
      return data.data?.[0] || null;
    } catch (error) {
      console.error(`[twitch] Get channel info error:`, error.message);
      return null;
    }
  }

  /**
   * 스트림 정보 조회 (라이브 상태 확인)
   */
  async getStreamInfo() {
    if (!this.broadcasterId) return null;

    try {
      const url = `https://api.twitch.tv/helix/streams?user_id=${this.broadcasterId}`;
      const response = await fetch(url, {
        headers: {
          "Client-ID": this.clientId,
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      const data = await response.json();
      const stream = data.data?.[0];

      if (!stream) return null;

      return {
        id: stream.id,
        userId: stream.user_id,
        userName: stream.user_name,
        gameId: stream.game_id,
        gameName: stream.game_name,
        title: stream.title,
        viewerCount: stream.viewer_count,
        startedAt: stream.started_at,
        language: stream.language,
        thumbnail: stream.thumbnail_url,
        isLive: stream.type === "live",
      };
    } catch (error) {
      console.error(`[twitch] Get stream info error:`, error.message);
      return null;
    }
  }
}

module.exports = TwitchAdapter;
