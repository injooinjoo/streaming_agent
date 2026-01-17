/**
 * ChzzkAdapter - 치지직 채팅/후원 WebSocket 어댑터
 *
 * 치지직 라이브 스트림의 채팅과 후원 이벤트를 실시간으로 수신합니다.
 * 비공식 API를 사용하므로 변경될 수 있습니다.
 *
 * @see https://github.com/kimcore/chzzk
 */

const WebSocket = require("ws");
const BaseAdapter = require("./base");
const { v4: uuidv4 } = require("uuid");

// 치지직 메시지 타입 코드
const MESSAGE_TYPES = {
  PING: 0,
  PONG: 10000,
  CONNECT: 100,
  CONNECTED: 10100,
  REQUEST_RECENT_CHAT: 5101,
  RECENT_CHAT: 15101,
  CHAT: 93101,
  DONATION: 93102,
  SUBSCRIPTION: 93103,
  SYSTEM_MESSAGE: 93104,
};

class ChzzkAdapter extends BaseAdapter {
  constructor(options = {}) {
    super(options);

    this.platform = "chzzk";
    this.ws = null;
    this.chatChannelId = null;
    this.accessToken = options.accessToken || null;
    this.pingInterval = null;
    this.pingIntervalMs = 20000; // 20초마다 핑
    this.viewerPollInterval = null;
    this.viewerPollIntervalMs = 30000; // 30초마다 시청자 수 조회

    // API 요청에 필요한 기본 헤더
    this.defaultHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };
  }

  /**
   * 치지직 채팅에 연결
   */
  async connect() {
    try {
      // 1. 채널 정보 조회
      const channelInfo = await this.getChannelInfo();
      if (!channelInfo) {
        throw new Error("Channel not found");
      }

      // 2. 라이브 상태 확인 및 chatChannelId 조회
      const liveDetail = await this.getLiveDetail();
      if (!liveDetail || !liveDetail.chatChannelId) {
        throw new Error("Channel is not live or chatChannelId not found");
      }

      this.chatChannelId = liveDetail.chatChannelId;
      console.log(`[chzzk] Chat channel ID: ${this.chatChannelId}`);

      // 3. WebSocket 연결
      await this.connectWebSocket();

      // 4. 시청자 수 폴링 시작
      this.startViewerPolling();
    } catch (error) {
      console.error(`[chzzk] Connection error:`, error.message);
      this.emitError(error);
      throw error;
    }
  }

  /**
   * 채널 정보 조회
   */
  async getChannelInfo() {
    try {
      const response = await fetch(
        `https://api.chzzk.naver.com/service/v1/channels/${this.channelId}`,
        { headers: this.defaultHeaders }
      );
      const data = await response.json();

      if (data.code !== 200) {
        console.error(`[chzzk] Channel info error:`, data.message);
        return null;
      }

      return data.content;
    } catch (error) {
      console.error(`[chzzk] Failed to get channel info:`, error.message);
      return null;
    }
  }

  /**
   * 라이브 상세 정보 조회 (chatChannelId 포함)
   */
  async getLiveDetail() {
    try {
      const response = await fetch(
        `https://api.chzzk.naver.com/service/v3/channels/${this.channelId}/live-detail`,
        { headers: this.defaultHeaders }
      );
      const data = await response.json();

      if (data.code !== 200 || !data.content) {
        console.error(`[chzzk] Live detail error:`, data.message);
        return null;
      }

      return data.content;
    } catch (error) {
      console.error(`[chzzk] Failed to get live detail:`, error.message);
      return null;
    }
  }

  /**
   * WebSocket 연결
   */
  connectWebSocket() {
    return new Promise((resolve, reject) => {
      // 서버 선택 (랜덤)
      const serverNumber = Math.floor(Math.random() * 5) + 1;
      const wsUrl = `wss://kr-ss${serverNumber}.chat.naver.com/chat`;

      console.log(`[chzzk] Connecting to ${wsUrl}`);

      this.ws = new WebSocket(wsUrl);

      this.ws.on("open", () => {
        console.log(`[chzzk] WebSocket connected`);
        this.sendConnect();
        this.startPingInterval();
      });

      this.ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());

          // 🔍 모든 WebSocket 메시지 로깅 (디버그)
          console.log(`[chzzk] 🔍 WS message received: cmd=${message.cmd}, keys=${Object.keys(message).join(",")}`);

          this.handleMessage(message);

          // 연결 완료 시 resolve
          if (message.cmd === MESSAGE_TYPES.CONNECTED) {
            this.onConnected();
            resolve();
          }
        } catch (error) {
          console.error(`[chzzk] Message parse error:`, error.message);
        }
      });

      this.ws.on("close", (code, reason) => {
        console.log(`[chzzk] WebSocket closed: ${code} ${reason}`);
        this.stopPingInterval();
        this.onDisconnected();

        // 자동 재연결
        if (this.isConnected) {
          this.attemptReconnect();
        }
      });

      this.ws.on("error", (error) => {
        console.error(`[chzzk] WebSocket error:`, error.message);
        this.emitError(error);
        reject(error);
      });

      // 타임아웃
      setTimeout(() => {
        if (!this.isConnected) {
          reject(new Error("Connection timeout"));
        }
      }, 10000);
    });
  }

  /**
   * 연결 메시지 전송
   */
  sendConnect() {
    const connectMessage = {
      ver: "3",
      cmd: MESSAGE_TYPES.CONNECT,
      svcid: "game",
      cid: this.chatChannelId,
      bdy: {
        uid: null, // 비로그인
        devType: 2001,
        accTkn: this.accessToken || null,
        auth: "READ",
      },
      tid: 1,
    };

    this.ws.send(JSON.stringify(connectMessage));
  }

  /**
   * 메시지 처리
   */
  handleMessage(message) {
    const cmd = message.cmd;

    // 디버그: 모든 메시지 타입 로깅
    if (cmd >= 90000) {
      console.log(`[chzzk] 📨 Received message cmd: ${cmd}, bdy length: ${message.bdy?.length || 0}`);
    }

    switch (cmd) {
      case MESSAGE_TYPES.PING:
        this.sendPong();
        break;

      case MESSAGE_TYPES.CONNECTED:
        console.log(`[chzzk] Successfully connected to chat`);
        break;

      case MESSAGE_TYPES.CHAT:
      case MESSAGE_TYPES.RECENT_CHAT:
        console.log(`[chzzk] 💬 Processing chat messages: ${message.bdy?.length || 1} messages`);
        this.processChat(message.bdy);
        break;

      case MESSAGE_TYPES.DONATION:
        this.processDonation(message.bdy);
        break;

      case MESSAGE_TYPES.SUBSCRIPTION:
        this.processSubscription(message.bdy);
        break;

      default:
        // 알 수 없는 메시지 타입은 로깅만
        if (cmd >= 90000) {
          console.log(`[chzzk] Unknown message type: ${cmd}`);
        }
    }
  }

  /**
   * PONG 전송
   */
  sendPong() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ ver: "3", cmd: MESSAGE_TYPES.PONG }));
    }
  }

  /**
   * 핑 인터벌 시작
   */
  startPingInterval() {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ ver: "3", cmd: MESSAGE_TYPES.PONG }));
      }
    }, this.pingIntervalMs);
  }

  /**
   * 핑 인터벌 중지
   */
  stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * 시청자 수 폴링 시작
   */
  startViewerPolling() {
    // 최초 실행
    this.fetchAndEmitViewerCount();

    this.viewerPollInterval = setInterval(() => {
      this.fetchAndEmitViewerCount();
    }, this.viewerPollIntervalMs);
  }

  /**
   * 시청자 수 폴링 중지
   */
  stopViewerPolling() {
    if (this.viewerPollInterval) {
      clearInterval(this.viewerPollInterval);
      this.viewerPollInterval = null;
    }
  }

  /**
   * 시청자 수 조회 및 이벤트 발송
   */
  async fetchAndEmitViewerCount() {
    try {
      const liveDetail = await this.getLiveDetail();
      if (liveDetail && liveDetail.concurrentUserCount !== undefined) {
        const event = {
          id: uuidv4(),
          type: "viewer-update",
          platform: "chzzk",
          sender: {
            id: "system",
            nickname: "Chzzk",
          },
          content: {
            viewerCount: liveDetail.concurrentUserCount,
          },
          metadata: {
            timestamp: new Date().toISOString(),
            channelId: this.channelId,
            chatChannelId: this.chatChannelId,
          },
        };

        this.emitEvent(event);
        console.log(`[chzzk] 👥 시청자 수: ${liveDetail.concurrentUserCount.toLocaleString()}명`);
      }
    } catch (error) {
      console.error(`[chzzk] Viewer count polling error:`, error.message);
    }
  }

  /**
   * 뱃지 정보 파싱 (활동 뱃지, 구독 뱃지 등)
   */
  parseBadges(profile) {
    const badges = [];

    // 활동 뱃지 파싱 (streamingProperty.activityBadges)
    if (profile.activityBadges && Array.isArray(profile.activityBadges)) {
      for (const badge of profile.activityBadges) {
        badges.push({
          type: "activity",
          badgeId: badge.badgeId || badge.imageUrl,
          badgeName: badge.badgeName || "활동 뱃지",
          imageUrl: badge.imageUrl || null,
          activated: badge.activated || true,
        });
      }
    }

    // 구독 뱃지 (streamingProperty.subscription)
    if (profile.streamingProperty?.subscription) {
      const sub = profile.streamingProperty.subscription;
      badges.push({
        type: "subscription",
        badgeId: `subscription_${sub.tier || "default"}`,
        badgeName: sub.tierName || "구독자",
        tier: sub.tier || 0,
        tierName: sub.tierName || "기본",
        months: sub.accumulativeMonth || 1,
        imageUrl: sub.badgeImageUrl || null,
      });
    }

    // 팬 뱃지 (streamingProperty.following)
    if (profile.streamingProperty?.following) {
      const following = profile.streamingProperty.following;
      if (following.followDate) {
        // 팔로우 기간 계산 (일수)
        const followDate = new Date(following.followDate);
        const now = new Date();
        const followDays = Math.floor((now - followDate) / (1000 * 60 * 60 * 24));

        badges.push({
          type: "fan",
          badgeId: `fan_${followDays}`,
          badgeName: `${followDays}일 팔로워`,
          followDays: followDays,
          followDate: following.followDate,
        });
      }
    }

    // 매니저 뱃지
    if (profile.userRoleCode === "streaming_chat_manager" || profile.userRoleCode === "streaming_channel_manager") {
      badges.push({
        type: "manager",
        badgeId: "manager",
        badgeName: "매니저",
      });
    }

    // 스트리머 뱃지
    if (profile.userRoleCode === "streamer") {
      badges.push({
        type: "streamer",
        badgeId: "streamer",
        badgeName: "스트리머",
      });
    }

    return badges;
  }

  /**
   * 사용자 티어 결정 (뱃지 기반)
   */
  determineUserTier(badges) {
    // 우선순위: streamer > manager > subscription > fan > regular
    const hasStreamer = badges.some(b => b.type === "streamer");
    const hasManager = badges.some(b => b.type === "manager");
    const subscription = badges.find(b => b.type === "subscription");
    const fan = badges.find(b => b.type === "fan");

    if (hasStreamer) return "streamer";
    if (hasManager) return "manager";
    if (subscription) return `subscriber_tier${subscription.tier || 1}`;
    if (fan && fan.followDays >= 365) return "vip"; // 1년 이상 팔로워
    if (fan && fan.followDays >= 90) return "fan"; // 3개월 이상 팔로워
    return "regular";
  }

  /**
   * 채팅 메시지 처리
   */
  processChat(messages) {
    if (!Array.isArray(messages)) {
      messages = [messages];
    }

    for (const msg of messages) {
      try {
        const profile = msg.profile ? JSON.parse(msg.profile) : {};
        const extras = msg.extras ? JSON.parse(msg.extras) : {};

        // 뱃지 정보 상세 파싱
        const badges = this.parseBadges(profile);
        const userTier = this.determineUserTier(badges);

        const event = {
          id: uuidv4(),
          type: "chat",
          platform: "chzzk",
          sender: {
            id: profile.userIdHash || "unknown",
            nickname: profile.nickname || "익명",
            profileImage: profile.profileImageUrl || null,
            role: this.mapRole(profile.userRoleCode),
            tier: userTier,
            badges: badges,
            // 구독 정보 추가
            subscription: profile.streamingProperty?.subscription || null,
          },
          content: {
            message: msg.msg || "",
          },
          metadata: {
            timestamp: new Date(msg.msgTime || Date.now()).toISOString(),
            channelId: this.channelId,
            chatChannelId: this.chatChannelId,
            rawData: msg,
          },
        };

        this.emitEvent(event);
        console.log(`[chzzk] 💬 Chat emitted: ${profile.nickname || "익명"} (${profile.userIdHash?.substring(0, 8) || "unknown"})`);
      } catch (error) {
        console.error(`[chzzk] Chat processing error:`, error.message);
      }
    }
  }

  /**
   * 후원 메시지 처리
   */
  processDonation(messages) {
    if (!Array.isArray(messages)) {
      messages = [messages];
    }

    for (const msg of messages) {
      try {
        const profile = msg.profile ? JSON.parse(msg.profile) : {};
        const extras = msg.extras ? JSON.parse(msg.extras) : {};

        // 뱃지 정보 상세 파싱
        const badges = this.parseBadges(profile);
        const userTier = this.determineUserTier(badges);

        const event = {
          id: uuidv4(),
          type: "donation",
          platform: "chzzk",
          sender: {
            id: profile.userIdHash || extras.donorId || "unknown",
            nickname: extras.nickname || profile.nickname || "익명",
            profileImage: profile.profileImageUrl || null,
            role: this.mapRole(profile.userRoleCode),
            tier: userTier,
            badges: badges,
            subscription: profile.streamingProperty?.subscription || null,
          },
          content: {
            message: extras.msg || msg.msg || "",
            amount: extras.payAmount || 0,
            originalAmount: extras.payAmount || 0,
            currency: "KRW",
            donationType: "cheese",
          },
          metadata: {
            timestamp: new Date(msg.msgTime || Date.now()).toISOString(),
            channelId: this.channelId,
            chatChannelId: this.chatChannelId,
            rawData: msg,
          },
        };

        this.emitEvent(event);
      } catch (error) {
        console.error(`[chzzk] Donation processing error:`, error.message);
      }
    }
  }

  /**
   * 구독 메시지 처리
   */
  processSubscription(messages) {
    if (!Array.isArray(messages)) {
      messages = [messages];
    }

    for (const msg of messages) {
      try {
        const profile = msg.profile ? JSON.parse(msg.profile) : {};
        const extras = msg.extras ? JSON.parse(msg.extras) : {};

        // 뱃지 정보 상세 파싱
        const badges = this.parseBadges(profile);

        // 구독 상세 정보
        const subscriptionInfo = {
          tier: extras.tier || 1,
          tierName: extras.tierName || "기본",
          months: extras.month || extras.accumulativeMonth || 1,
          isGift: extras.isGiftSubscription || false,
          giftCount: extras.giftCount || 0,
        };

        const event = {
          id: uuidv4(),
          type: "subscribe",
          platform: "chzzk",
          sender: {
            id: profile.userIdHash || "unknown",
            nickname: profile.nickname || "익명",
            profileImage: profile.profileImageUrl || null,
            role: this.mapRole(profile.userRoleCode),
            badges: badges,
          },
          content: {
            message: extras.msg || msg.msg || "",
            tier: subscriptionInfo.tierName,
            tierLevel: subscriptionInfo.tier,
            months: subscriptionInfo.months,
            isGift: subscriptionInfo.isGift,
            giftCount: subscriptionInfo.giftCount,
          },
          metadata: {
            timestamp: new Date(msg.msgTime || Date.now()).toISOString(),
            channelId: this.channelId,
            chatChannelId: this.chatChannelId,
            rawData: msg,
          },
        };

        this.emitEvent(event);
        console.log(`[chzzk] ⭐ 구독: ${profile.nickname}님이 ${subscriptionInfo.months}개월 구독 (${subscriptionInfo.tierName})`);
      } catch (error) {
        console.error(`[chzzk] Subscription processing error:`, error.message);
      }
    }
  }

  /**
   * 역할 매핑
   */
  mapRole(roleCode) {
    const roles = {
      streamer: "streamer",
      streaming_chat_manager: "manager",
      streaming_channel_manager: "manager",
      common_user: "regular",
    };
    return roles[roleCode] || "regular";
  }

  /**
   * 연결 해제
   */
  disconnect() {
    this.stopPingInterval();
    this.stopViewerPolling();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    this.chatChannelId = null;
    console.log(`[chzzk] Disconnected`);
  }

  /**
   * Chzzk 카테고리 목록 조회 (라이브 방송에서 discover)
   * @param {number} size - 조회할 방송 수 (기본: 100)
   * @param {number} offset - 시작 위치 (기본: 0)
   * @returns {Promise<Array>} 카테고리 목록
   */
  static async discoverCategories(size = 100, offset = 0) {
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    };

    try {
      const response = await fetch(
        `https://api.chzzk.naver.com/service/v1/home/lives?size=${size}&offset=${offset}`,
        { headers }
      );
      const data = await response.json();

      if (!data || !data.content || !data.content.data) {
        return [];
      }

      // 카테고리별로 그룹화
      const categoryMap = new Map();

      for (const live of data.content.data) {
        if (live.liveCategory && live.liveCategoryValue) {
          const categoryId = live.liveCategory;

          if (!categoryMap.has(categoryId)) {
            categoryMap.set(categoryId, {
              categoryId,
              categoryName: live.liveCategoryValue,
              categoryType: live.categoryType || "GAME",
              thumbnailUrl: null,
              viewerCount: 0,
              streamerCount: 0,
            });
          }

          const category = categoryMap.get(categoryId);
          category.viewerCount += live.concurrentUserCount || 0;
          category.streamerCount += 1;
        }
      }

      return Array.from(categoryMap.values());
    } catch (error) {
      console.error("[chzzk] discoverCategories error:", error.message);
      return [];
    }
  }

  /**
   * 모든 Chzzk 카테고리 조회 (여러 페이지)
   * @param {number} pages - 조회할 페이지 수 (기본: 10)
   * @returns {Promise<Array>} 전체 카테고리 목록
   */
  static async getAllCategories(pages = 10) {
    const categoryMap = new Map();
    const pageSize = 100;

    for (let page = 0; page < pages; page++) {
      const offset = page * pageSize;
      const categories = await ChzzkAdapter.discoverCategories(pageSize, offset);

      for (const category of categories) {
        if (!categoryMap.has(category.categoryId)) {
          categoryMap.set(category.categoryId, { ...category });
        } else {
          // 시청자/스트리머 수 합산
          const existing = categoryMap.get(category.categoryId);
          existing.viewerCount += category.viewerCount;
          existing.streamerCount += category.streamerCount;
        }
      }

      // Rate limiting: 200ms delay between requests
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return Array.from(categoryMap.values());
  }
}

module.exports = ChzzkAdapter;
