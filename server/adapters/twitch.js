/**
 * TwitchAdapter - Twitch 채팅/이벤트 어댑터
 *
 * Twitch Helix API + EventSub WebSocket을 사용하여
 * 라이브 스트림의 채팅, 구독, Bits 이벤트를 실시간으로 수신합니다.
 *
 * @requires TWITCH_CLIENT_ID - Twitch Developer App Client ID
 * @requires TWITCH_CLIENT_SECRET - Twitch Developer App Client Secret
 */

const WebSocket = require("ws");
const BaseAdapter = require("./base");
const { v4: uuidv4 } = require("uuid");

// Twitch Helix API 기본 URL
const HELIX_BASE = "https://api.twitch.tv/helix";
const AUTH_BASE = "https://id.twitch.tv/oauth2";
const EVENTSUB_WS_URL = "wss://eventsub.wss.twitch.tv/ws";

// App Access Token 캐시 (모든 인스턴스 공유)
let cachedToken = null;
let tokenExpiresAt = 0;

class TwitchAdapter extends BaseAdapter {
  constructor(options = {}) {
    super(options);

    this.platform = "twitch";
    this.clientId = options.clientId || process.env.TWITCH_CLIENT_ID;
    this.clientSecret = options.clientSecret || process.env.TWITCH_CLIENT_SECRET;
    this.ws = null;
    this.sessionId = null;
    this.broadcasterId = null;
    this.broadcasterLogin = null;
    this.broadcasterName = null;
    this.pingInterval = null;
    this.viewerPollInterval = null;
    this.viewerPollIntervalMs = 30000;
    this.subscriptionIds = [];
  }

  // ============================================
  // 인증
  // ============================================

  /**
   * App Access Token 발급 (Client Credentials)
   * 모든 인스턴스가 공유하며, 만료 1시간 전에 갱신
   */
  async getAppAccessToken() {
    const now = Date.now();
    if (cachedToken && tokenExpiresAt > now + 3600000) {
      return cachedToken;
    }

    const response = await fetch(`${AUTH_BASE}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: "client_credentials",
      }),
    });

    if (!response.ok) {
      throw new Error(`Twitch token error: ${response.status}`);
    }

    const data = await response.json();
    cachedToken = data.access_token;
    tokenExpiresAt = now + data.expires_in * 1000;

    console.log(`[twitch] App access token obtained (expires in ${data.expires_in}s)`);
    return cachedToken;
  }

  /**
   * Helix API 요청 헬퍼
   */
  async helixFetch(path, options = {}) {
    const token = await this.getAppAccessToken();
    const response = await fetch(`${HELIX_BASE}${path}`, {
      ...options,
      headers: {
        "Client-ID": this.clientId,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (response.status === 401) {
      // Token expired, refresh
      cachedToken = null;
      tokenExpiresAt = 0;
      const newToken = await this.getAppAccessToken();
      const retry = await fetch(`${HELIX_BASE}${path}`, {
        ...options,
        headers: {
          "Client-ID": this.clientId,
          Authorization: `Bearer ${newToken}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });
      return retry;
    }

    return response;
  }

  // ============================================
  // 채널/방송 정보
  // ============================================

  /**
   * 채널 ID를 login 이름으로 해석
   */
  async resolveUser() {
    // channelId가 숫자면 ID, 아니면 login
    const isNumeric = /^\d+$/.test(this.channelId);
    const param = isNumeric ? `id=${this.channelId}` : `login=${this.channelId}`;

    const response = await this.helixFetch(`/users?${param}`);
    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      throw new Error(`Twitch user not found: ${this.channelId}`);
    }

    const user = data.data[0];
    this.broadcasterId = user.id;
    this.broadcasterLogin = user.login;
    this.broadcasterName = user.display_name;
    return user;
  }

  /**
   * 현재 방송 정보 조회
   */
  async getStreamInfo() {
    const response = await this.helixFetch(`/streams?user_id=${this.broadcasterId}`);
    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      return null; // Not live
    }

    return data.data[0];
  }

  // ============================================
  // 연결
  // ============================================

  async connect() {
    try {
      if (!this.clientId || !this.clientSecret) {
        throw new Error("TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET required");
      }

      // 1. 사용자 정보 해석
      await this.resolveUser();

      // 2. 라이브 상태 확인
      const streamInfo = await this.getStreamInfo();
      if (!streamInfo) {
        throw new Error(`${this.broadcasterLogin} is not live`);
      }

      // 3. EventSub WebSocket 연결
      await this.connectEventSub();

      // 4. 시청자 수 폴링 시작
      this.startViewerPolling();

      // 초기 시청자 수 전송
      this.emitEvent({
        id: uuidv4(),
        type: "viewer-update",
        platform: "twitch",
        sender: { id: this.broadcasterId, nickname: this.broadcasterName },
        content: { viewerCount: streamInfo.viewer_count },
        metadata: {
          timestamp: new Date().toISOString(),
          channelId: this.channelId,
        },
      });
    } catch (error) {
      this.emitError(error);
      throw error;
    }
  }

  /**
   * EventSub WebSocket 연결
   */
  async connectEventSub() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(EVENTSUB_WS_URL);

      const timeout = setTimeout(() => {
        reject(new Error("EventSub WebSocket connection timeout"));
      }, 15000);

      this.ws.on("open", () => {
        console.log(`[twitch] EventSub WebSocket connected for ${this.broadcasterLogin}`);
      });

      this.ws.on("message", async (raw) => {
        try {
          const msg = JSON.parse(raw.toString());

          switch (msg.metadata?.message_type) {
            case "session_welcome":
              clearTimeout(timeout);
              this.sessionId = msg.payload.session.id;
              console.log(`[twitch] Session ID: ${this.sessionId}`);
              await this.subscribeToEvents();
              this.onConnected();
              resolve();
              break;

            case "session_keepalive":
              // Twitch sends keepalive, no response needed
              break;

            case "session_reconnect":
              console.log(`[twitch] Reconnect requested`);
              const reconnectUrl = msg.payload.session.reconnect_url;
              this.handleReconnect(reconnectUrl);
              break;

            case "notification":
              this.processNotification(msg);
              break;

            case "revocation":
              console.warn(`[twitch] Subscription revoked:`, msg.payload.subscription.type);
              break;
          }
        } catch (err) {
          console.error(`[twitch] Message parse error:`, err.message);
        }
      });

      this.ws.on("close", (code, reason) => {
        console.log(`[twitch] WebSocket closed: ${code} ${reason}`);
        this.resetConnection();
        if (this.isConnected) {
          this.onDisconnected();
          this.attemptReconnect();
        }
      });

      this.ws.on("error", (error) => {
        console.error(`[twitch] WebSocket error:`, error.message);
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * EventSub 이벤트 구독
   */
  async subscribeToEvents() {
    const token = await this.getAppAccessToken();

    const subscriptions = [
      {
        type: "channel.chat.message",
        version: "1",
        condition: { broadcaster_user_id: this.broadcasterId, user_id: this.broadcasterId },
      },
      {
        type: "channel.subscribe",
        version: "1",
        condition: { broadcaster_user_id: this.broadcasterId },
      },
      {
        type: "channel.cheer",
        version: "1",
        condition: { broadcaster_user_id: this.broadcasterId },
      },
    ];

    for (const sub of subscriptions) {
      try {
        const response = await fetch(`${HELIX_BASE}/eventsub/subscriptions`, {
          method: "POST",
          headers: {
            "Client-ID": this.clientId,
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: sub.type,
            version: sub.version,
            condition: sub.condition,
            transport: {
              method: "websocket",
              session_id: this.sessionId,
            },
          }),
        });

        const data = await response.json();
        if (data.data && data.data[0]) {
          this.subscriptionIds.push(data.data[0].id);
          console.log(`[twitch] Subscribed to ${sub.type}`);
        } else if (data.error) {
          console.warn(`[twitch] Subscribe failed for ${sub.type}: ${data.message}`);
        }
      } catch (err) {
        console.error(`[twitch] Subscribe error for ${sub.type}:`, err.message);
      }
    }
  }

  /**
   * EventSub 알림 처리
   */
  processNotification(msg) {
    const type = msg.payload.subscription.type;
    const event = msg.payload.event;

    switch (type) {
      case "channel.chat.message":
        this.processChat(event);
        break;
      case "channel.subscribe":
        this.processSubscription(event);
        break;
      case "channel.cheer":
        this.processDonation(event);
        break;
    }
  }

  /**
   * 채팅 메시지 처리
   */
  processChat(event) {
    this.emitEvent({
      id: uuidv4(),
      type: "chat",
      platform: "twitch",
      sender: {
        id: event.chatter_user_id,
        nickname: event.chatter_user_name,
        role: this.mapRole(event.badges || []),
        badges: (event.badges || []).map((b) => b.set_id),
      },
      content: {
        message: event.message?.text || "",
      },
      metadata: {
        timestamp: new Date().toISOString(),
        channelId: this.channelId,
        messageId: event.message_id,
        color: event.color,
      },
    });
  }

  /**
   * Bits (치어) 처리
   */
  processDonation(event) {
    this.emitEvent({
      id: uuidv4(),
      type: "donation",
      platform: "twitch",
      sender: {
        id: event.user_id,
        nickname: event.user_name,
      },
      content: {
        message: event.message || "",
        amount: event.bits,
        originalAmount: event.bits,
        currency: "bits",
        donationType: "bits",
      },
      metadata: {
        timestamp: new Date().toISOString(),
        channelId: this.channelId,
        isAnonymous: event.is_anonymous,
      },
    });
  }

  /**
   * 구독 처리
   */
  processSubscription(event) {
    this.emitEvent({
      id: uuidv4(),
      type: "subscribe",
      platform: "twitch",
      sender: {
        id: event.user_id,
        nickname: event.user_name,
      },
      content: {
        tier: event.tier,
        isGift: event.is_gift,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        channelId: this.channelId,
      },
    });
  }

  /**
   * 역할 매핑
   */
  mapRole(badges) {
    const badgeIds = badges.map((b) => b.set_id);
    if (badgeIds.includes("broadcaster")) return "streamer";
    if (badgeIds.includes("moderator")) return "manager";
    if (badgeIds.includes("vip")) return "vip";
    if (badgeIds.includes("subscriber")) return "subscriber";
    return "regular";
  }

  /**
   * 시청자 수 폴링
   */
  startViewerPolling() {
    this.viewerPollInterval = setInterval(async () => {
      try {
        const stream = await this.getStreamInfo();
        if (stream) {
          this.emitEvent({
            id: uuidv4(),
            type: "viewer-update",
            platform: "twitch",
            sender: { id: this.broadcasterId, nickname: this.broadcasterName },
            content: { viewerCount: stream.viewer_count },
            metadata: {
              timestamp: new Date().toISOString(),
              channelId: this.channelId,
            },
          });
        } else {
          // 방송 종료됨
          console.log(`[twitch] ${this.broadcasterLogin} went offline`);
          this.disconnect();
        }
      } catch (err) {
        console.error(`[twitch] Viewer poll error:`, err.message);
      }
    }, this.viewerPollIntervalMs);
  }

  /**
   * 재연결 처리
   */
  handleReconnect(reconnectUrl) {
    const oldWs = this.ws;

    this.ws = new WebSocket(reconnectUrl);
    this.ws.on("open", () => {
      console.log(`[twitch] Reconnected to new EventSub session`);
      if (oldWs) oldWs.close();
    });

    this.ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.metadata?.message_type === "session_welcome") {
          this.sessionId = msg.payload.session.id;
        } else if (msg.metadata?.message_type === "notification") {
          this.processNotification(msg);
        }
      } catch (err) {
        console.error(`[twitch] Reconnect message error:`, err.message);
      }
    });
  }

  /**
   * 연결 해제
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.viewerPollInterval) {
      clearInterval(this.viewerPollInterval);
      this.viewerPollInterval = null;
    }
    this.sessionId = null;
    this.subscriptionIds = [];
    this.resetConnection();
    this.onDisconnected();
  }

  // ============================================
  // 정적 메서드: 크롤러용
  // ============================================

  /**
   * 한국 라이브 방송 목록 조회 (Helix API)
   * @param {string} token - App Access Token
   * @param {string} clientId - Client ID
   * @param {string|null} cursor - 페이지네이션 커서
   * @param {string} language - 언어 필터 (기본: ko)
   * @returns {Promise<{broadcasts: Array, cursor: string|null}>}
   */
  static async getLiveBroadcasts(token, clientId, cursor = null, language = "ko") {
    const params = new URLSearchParams({
      first: "100",
      language: language,
    });
    if (cursor) params.set("after", cursor);

    const response = await fetch(`${HELIX_BASE}/streams?${params}`, {
      headers: {
        "Client-ID": clientId,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Twitch streams API: ${response.status}`);
    }

    const data = await response.json();

    const broadcasts = (data.data || []).map((stream) => ({
      platform: "twitch",
      channelId: stream.user_login,
      broadcastId: stream.id,
      streamerId: stream.user_id,
      nickname: stream.user_name,
      title: stream.title,
      categoryId: stream.game_id || null,
      categoryName: stream.game_name || null,
      viewerCount: stream.viewer_count || 0,
      thumbnailUrl: stream.thumbnail_url
        ? stream.thumbnail_url.replace("{width}", "440").replace("{height}", "248")
        : null,
      profileImageUrl: null,
      startedAt: stream.started_at,
      isLive: true,
    }));

    return {
      broadcasts,
      cursor: data.pagination?.cursor || null,
    };
  }

  /**
   * 모든 한국 라이브 방송 조회
   * @param {string} token
   * @param {string} clientId
   * @param {number} maxBroadcasts
   * @returns {Promise<Array>}
   */
  static async getAllLiveBroadcasts(token, clientId, maxBroadcasts = 1000) {
    const all = [];
    let cursor = null;
    const maxPages = Math.ceil(maxBroadcasts / 100);

    for (let page = 0; page < maxPages; page++) {
      const result = await TwitchAdapter.getLiveBroadcasts(token, clientId, cursor);

      if (result.broadcasts.length === 0) break;
      all.push(...result.broadcasts);

      if (!result.cursor || all.length >= maxBroadcasts) break;
      cursor = result.cursor;

      // Rate limiting
      await new Promise((r) => setTimeout(r, 100));
    }

    all.sort((a, b) => b.viewerCount - a.viewerCount);
    return all.slice(0, maxBroadcasts);
  }

  /**
   * 상위 카테고리(게임) 목록 조회
   * @param {string} token
   * @param {string} clientId
   * @param {string|null} cursor
   * @returns {Promise<{categories: Array, cursor: string|null}>}
   */
  static async getTopCategories(token, clientId, cursor = null) {
    const params = new URLSearchParams({ first: "100" });
    if (cursor) params.set("after", cursor);

    const response = await fetch(`${HELIX_BASE}/games/top?${params}`, {
      headers: {
        "Client-ID": clientId,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Twitch games API: ${response.status}`);
    }

    const data = await response.json();

    const categories = (data.data || []).map((game) => ({
      platform: "twitch",
      platformCategoryId: game.id,
      platformCategoryName: game.name,
      categoryType: "GAME",
      thumbnailUrl: game.box_art_url
        ? game.box_art_url.replace("{width}", "285").replace("{height}", "380")
        : null,
    }));

    return {
      categories,
      cursor: data.pagination?.cursor || null,
    };
  }

  /**
   * 모든 상위 카테고리 조회
   * @param {string} token
   * @param {string} clientId
   * @param {number} maxCategories
   * @returns {Promise<Array>}
   */
  static async getAllCategories(token, clientId, maxCategories = 500) {
    const all = [];
    let cursor = null;
    const maxPages = Math.ceil(maxCategories / 100);

    for (let page = 0; page < maxPages; page++) {
      const result = await TwitchAdapter.getTopCategories(token, clientId, cursor);

      if (result.categories.length === 0) break;
      all.push(...result.categories);

      if (!result.cursor || all.length >= maxCategories) break;
      cursor = result.cursor;

      await new Promise((r) => setTimeout(r, 100));
    }

    return all.slice(0, maxCategories);
  }
}

module.exports = TwitchAdapter;
