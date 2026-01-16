/**
 * EventNormalizer - 플랫폼별 이벤트를 통합 스키마로 정규화
 *
 * 모든 플랫폼의 이벤트를 동일한 형식으로 변환하여
 * 오버레이에서 일관된 방식으로 처리할 수 있게 합니다.
 */

const { v4: uuidv4 } = require("uuid");

/**
 * 통합 이벤트 스키마
 *
 * @typedef {Object} UnifiedEvent
 * @property {string} id - UUID
 * @property {'chat'|'donation'|'follow'|'subscribe'} type - 이벤트 타입
 * @property {'chzzk'|'soop'|'youtube'|'twitch'} platform - 플랫폼
 * @property {Object} sender - 발신자 정보
 * @property {string} sender.id - 플랫폼별 고유 ID
 * @property {string} sender.nickname - 닉네임
 * @property {string} [sender.profileImage] - 프로필 이미지 URL
 * @property {string} sender.role - 역할 (streamer, manager, vip, fan, subscriber, regular)
 * @property {Object[]} [sender.badges] - 배지 목록
 * @property {Object} content - 이벤트 내용
 * @property {string} [content.message] - 메시지
 * @property {number} [content.amount] - 금액 (원화 환산)
 * @property {number} [content.originalAmount] - 원본 금액/수량
 * @property {string} [content.currency] - 원본 통화/단위
 * @property {string} [content.donationType] - 후원 종류
 * @property {Object} metadata - 메타데이터
 * @property {string} metadata.timestamp - ISO 8601 형식
 * @property {string} metadata.channelId - 채널 ID
 * @property {Object} [metadata.rawData] - 원본 데이터
 */

class EventNormalizer {
  constructor() {
    // 환율 (대략적인 값, 실시간 조회 필요시 외부 API 사용)
    this.exchangeRates = {
      USD: 1350,
      KRW: 1,
      JPY: 9,
      EUR: 1450,
    };
  }

  /**
   * 플랫폼별 이벤트를 통합 스키마로 변환
   * @param {string} platform - 플랫폼 이름
   * @param {Object} rawEvent - 원본 이벤트
   * @returns {UnifiedEvent} 정규화된 이벤트
   */
  normalize(platform, rawEvent) {
    switch (platform) {
      case "chzzk":
        return this.normalizeChzzk(rawEvent);
      case "soop":
        return this.normalizeSoop(rawEvent);
      case "youtube":
        return this.normalizeYouTube(rawEvent);
      case "twitch":
        return this.normalizeTwitch(rawEvent);
      default:
        throw new Error(`Unknown platform: ${platform}`);
    }
  }

  /**
   * 치지직 이벤트 정규화
   */
  normalizeChzzk(raw) {
    // 이미 정규화된 형식인 경우 그대로 반환
    if (raw.id && raw.platform === "chzzk") {
      return raw;
    }

    const profile = typeof raw.profile === "string" ? JSON.parse(raw.profile) : raw.profile || {};
    const extras = typeof raw.extras === "string" ? JSON.parse(raw.extras) : raw.extras || {};

    const msgTypeCode = raw.msgTypeCode || raw.cmd;
    const isChat = msgTypeCode === 1 || msgTypeCode === 93101;
    const isDonation = msgTypeCode === 10 || msgTypeCode === 93102;
    const isSubscription = msgTypeCode === 93103;

    let type = "chat";
    if (isDonation) type = "donation";
    if (isSubscription) type = "subscribe";

    return {
      id: uuidv4(),
      type,
      platform: "chzzk",
      sender: {
        id: profile.userIdHash || "unknown",
        nickname: extras.nickname || profile.nickname || "익명",
        profileImage: profile.profileImageUrl || null,
        role: this.mapChzzkRole(profile.userRoleCode),
        badges: profile.activityBadges || [],
      },
      content: {
        message: raw.msg || extras.msg || "",
        amount: isDonation ? extras.payAmount : undefined,
        originalAmount: isDonation ? extras.payAmount : undefined,
        currency: isDonation ? "KRW" : undefined,
        donationType: isDonation ? "cheese" : undefined,
      },
      metadata: {
        timestamp: new Date(raw.msgTime || Date.now()).toISOString(),
        channelId: raw.cid || raw.channelId,
        rawData: raw,
      },
    };
  }

  /**
   * SOOP (아프리카TV) 이벤트 정규화
   */
  normalizeSoop(raw) {
    const donationTypes = {
      BALLOON: "star_balloon",
      BALLOON_GIFTED: "star_balloon",
      ADBALLOON: "ad_balloon",
      VIDEO_BALLOON: "video_balloon",
      MISSION: "mission",
      STICKER: "sticker",
    };

    const isDonation = Object.keys(donationTypes).includes(raw.action);
    const type = isDonation ? "donation" : "chat";

    return {
      id: uuidv4(),
      type,
      platform: "soop",
      sender: {
        id: raw.userId || "unknown",
        nickname: raw.nickname || "익명",
        profileImage: raw.profileImage || null,
        role: this.mapSoopGrade(raw.grade),
        badges: [],
      },
      content: {
        message: raw.message || "",
        amount: isDonation ? raw.count * 100 : undefined, // 1개 = 100원
        originalAmount: isDonation ? raw.count : undefined,
        currency: isDonation ? "balloon" : undefined,
        donationType: donationTypes[raw.action] || undefined,
      },
      metadata: {
        timestamp: new Date(raw.timestamp || Date.now()).toISOString(),
        channelId: raw.channelId,
        rawData: raw,
      },
    };
  }

  /**
   * YouTube 이벤트 정규화
   */
  normalizeYouTube(raw) {
    const snippet = raw.snippet || {};
    const authorDetails = raw.authorDetails || {};
    const supporterDetails = snippet.supporterDetails || {};

    const isSuperChat = snippet.type === "superChatEvent";
    const isSuperSticker = snippet.type === "superStickerEvent";
    const isDonation = isSuperChat || isSuperSticker;

    const amountKRW = isDonation
      ? this.convertToKRW(
          parseInt(snippet.amountMicros) / 1000000,
          snippet.currency
        )
      : undefined;

    return {
      id: uuidv4(),
      type: isDonation ? "donation" : "chat",
      platform: "youtube",
      sender: {
        id: authorDetails.channelId || supporterDetails.channelId || "unknown",
        nickname: authorDetails.displayName || supporterDetails.displayName || "익명",
        profileImage: authorDetails.profileImageUrl || supporterDetails.profileImageUrl || null,
        role: this.mapYouTubeRole(authorDetails),
        badges: [],
      },
      content: {
        message: snippet.displayMessage || snippet.commentText || "",
        amount: amountKRW,
        originalAmount: isDonation ? parseInt(snippet.amountMicros) / 1000000 : undefined,
        currency: snippet.currency || undefined,
        donationType: isSuperSticker ? "super_sticker" : isSuperChat ? "super_chat" : undefined,
      },
      metadata: {
        timestamp: snippet.publishedAt || snippet.createdAt || new Date().toISOString(),
        channelId: snippet.liveChatId,
        rawData: raw,
      },
    };
  }

  /**
   * Twitch 이벤트 정규화
   */
  normalizeTwitch(raw) {
    const eventType = raw.subscription?.type || raw.eventType;
    const event = raw.event || raw;

    let type = "chat";
    let donationType;
    let amount;
    let originalAmount;

    if (eventType === "channel.cheer") {
      type = "donation";
      donationType = "bits";
      originalAmount = event.bits;
      amount = event.bits * 14; // 1 bit ≈ 14 KRW
    } else if (eventType?.includes("subscription")) {
      type = "subscribe";
      donationType = "subscription";
    } else if (eventType === "channel.follow") {
      type = "follow";
    }

    return {
      id: uuidv4(),
      type,
      platform: "twitch",
      sender: {
        id: event.chatter_user_id || event.user_id || "unknown",
        nickname: event.chatter_user_name || event.user_name || "익명",
        profileImage: null,
        role: this.mapTwitchBadges(event.badges),
        badges: event.badges || [],
      },
      content: {
        message: event.message?.text || event.message || "",
        amount,
        originalAmount,
        currency: type === "donation" ? "bits" : undefined,
        donationType,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        channelId: event.broadcaster_user_id,
        rawData: raw,
      },
    };
  }

  // ========== 헬퍼 메서드 ==========

  /**
   * 치지직 역할 매핑
   */
  mapChzzkRole(roleCode) {
    const roles = {
      streamer: "streamer",
      streaming_chat_manager: "manager",
      streaming_channel_manager: "manager",
      common_user: "regular",
    };
    return roles[roleCode] || "regular";
  }

  /**
   * SOOP 등급 매핑
   */
  mapSoopGrade(grade) {
    const grades = {
      bj: "streamer",
      manager: "manager",
      fan: "fan",
      vip: "vip",
      vvip: "vvip",
    };
    return grades[grade] || "regular";
  }

  /**
   * YouTube 역할 매핑
   */
  mapYouTubeRole(authorDetails) {
    if (!authorDetails) return "regular";
    if (authorDetails.isChatOwner) return "streamer";
    if (authorDetails.isChatModerator) return "manager";
    if (authorDetails.isChatSponsor) return "subscriber";
    return "regular";
  }

  /**
   * Twitch 배지 매핑
   */
  mapTwitchBadges(badges) {
    if (!badges || !Array.isArray(badges)) return "regular";
    if (badges.some((b) => b.set_id === "broadcaster")) return "streamer";
    if (badges.some((b) => b.set_id === "moderator")) return "manager";
    if (badges.some((b) => b.set_id === "vip")) return "vip";
    if (badges.some((b) => b.set_id === "subscriber")) return "subscriber";
    return "regular";
  }

  /**
   * 통화 환산 (KRW)
   */
  convertToKRW(amount, currency) {
    const rate = this.exchangeRates[currency] || 1;
    return Math.round(amount * rate);
  }

  /**
   * 기존 events 테이블 형식으로 변환 (하위 호환)
   */
  toEventsFormat(unifiedEvent) {
    return {
      type: unifiedEvent.type,
      sender: unifiedEvent.sender.nickname,
      amount: unifiedEvent.content.amount || 0,
      message: unifiedEvent.content.message || "",
      platform: unifiedEvent.platform,
      timestamp: unifiedEvent.metadata.timestamp,
    };
  }
}

module.exports = new EventNormalizer();
