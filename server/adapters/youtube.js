/**
 * YouTubeAdapter - YouTube 라이브 스트림 어댑터
 *
 * YouTube Data API v3를 사용하여 라이브 방송 검색, 카테고리 조회,
 * 채팅 메시지 수집을 수행합니다.
 *
 * 할당량 관리가 핵심입니다 (기본 10,000 units/day).
 *
 * @requires YOUTUBE_API_KEY - YouTube Data API v3 key
 */

const BaseAdapter = require("./base");
const { v4: uuidv4 } = require("uuid");

const YT_API_BASE = "https://www.googleapis.com/youtube/v3";

// ============================================
// 할당량 관리 싱글턴
// ============================================
const YouTubeQuota = {
  daily: parseInt(process.env.YOUTUBE_DAILY_QUOTA || "10000", 10),
  used: 0,
  resetTime: null,

  init() {
    this.resetTime = this.getNextReset();
    this.used = 0;
  },

  getNextReset() {
    // YouTube 할당량은 태평양 시간 자정에 리셋
    const now = new Date();
    const pacific = new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
    const tomorrow = new Date(pacific);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    // 대략적 UTC 변환
    return tomorrow.getTime() + 8 * 3600000;
  },

  canUse(cost) {
    this.checkReset();
    return this.used + cost <= this.daily;
  },

  use(cost) {
    this.checkReset();
    this.used += cost;
  },

  checkReset() {
    if (Date.now() > this.resetTime) {
      this.used = 0;
      this.resetTime = this.getNextReset();
      console.log("[youtube] Quota reset - new day");
    }
  },

  getStatus() {
    this.checkReset();
    return {
      daily: this.daily,
      used: this.used,
      remaining: this.daily - this.used,
      percentUsed: ((this.used / this.daily) * 100).toFixed(1),
    };
  },
};

// 초기화
YouTubeQuota.init();

class YouTubeAdapter extends BaseAdapter {
  constructor(options = {}) {
    super(options);

    this.platform = "youtube";
    this.apiKey = options.apiKey || process.env.YOUTUBE_API_KEY;
    this.videoId = null;
    this.liveChatId = null;
    this.nextPageToken = null;
    this.pollingIntervalMs = 10000;
    this.chatPollInterval = null;
    this.viewerPollInterval = null;
    this.viewerPollIntervalMs = 30000;
    this.chatEnabled = (process.env.YOUTUBE_CHAT_ENABLED || "false") === "true";
  }

  // ============================================
  // API 요청
  // ============================================

  /**
   * YouTube API 요청 헬퍼
   */
  async ytFetch(path, quotaCost = 1) {
    if (!YouTubeQuota.canUse(quotaCost)) {
      throw new Error(`YouTube quota exhausted (${YouTubeQuota.used}/${YouTubeQuota.daily})`);
    }

    const separator = path.includes("?") ? "&" : "?";
    const url = `${YT_API_BASE}${path}${separator}key=${this.apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`YouTube API ${response.status}: ${err.error?.message || "Unknown"}`);
    }

    YouTubeQuota.use(quotaCost);
    return response.json();
  }

  // ============================================
  // 연결
  // ============================================

  async connect() {
    try {
      if (!this.apiKey) {
        throw new Error("YOUTUBE_API_KEY required");
      }

      // 1. 채널의 라이브 영상 찾기
      const video = await this.findLiveVideo();
      if (!video) {
        throw new Error(`No live stream found for channel ${this.channelId}`);
      }

      this.videoId = video.id;

      // 2. 라이브 스트림 상세 정보 조회
      const details = await this.getLiveStreamDetails();
      if (!details || !details.liveStreamingDetails) {
        throw new Error("Live stream details not available");
      }

      this.liveChatId = details.liveStreamingDetails.activeLiveChatId;

      // 3. 시청자 수 폴링 시작
      this.startViewerPolling();

      // 4. 채팅 폴링 시작 (할당량 허용 시)
      if (this.chatEnabled && this.liveChatId) {
        this.startChatPolling();
      }

      this.onConnected();

      // 초기 시청자 수
      const viewers = parseInt(details.liveStreamingDetails.concurrentViewers || "0", 10);
      this.emitEvent({
        id: uuidv4(),
        type: "viewer-update",
        platform: "youtube",
        sender: {
          id: this.channelId,
          nickname: details.snippet?.channelTitle || this.channelId,
        },
        content: { viewerCount: viewers },
        metadata: {
          timestamp: new Date().toISOString(),
          channelId: this.channelId,
          videoId: this.videoId,
        },
      });
    } catch (error) {
      this.emitError(error);
      throw error;
    }
  }

  /**
   * 채널의 라이브 방송 검색
   * 비용: 100 units
   */
  async findLiveVideo() {
    const data = await this.ytFetch(
      `/search?part=id&channelId=${this.channelId}&type=video&eventType=live&maxResults=1`,
      100
    );

    if (!data.items || data.items.length === 0) {
      return null;
    }

    return { id: data.items[0].id.videoId };
  }

  /**
   * 라이브 스트림 상세 정보
   * 비용: 1 unit
   */
  async getLiveStreamDetails() {
    const data = await this.ytFetch(
      `/videos?part=snippet,liveStreamingDetails&id=${this.videoId}`,
      1
    );

    return data.items?.[0] || null;
  }

  /**
   * 시청자 수 폴링
   */
  startViewerPolling() {
    this.viewerPollInterval = setInterval(async () => {
      try {
        const details = await this.getLiveStreamDetails();
        if (details?.liveStreamingDetails) {
          const viewers = parseInt(details.liveStreamingDetails.concurrentViewers || "0", 10);

          if (details.liveStreamingDetails.actualEndTime) {
            // 방송 종료됨
            console.log(`[youtube] Stream ended: ${this.videoId}`);
            this.disconnect();
            return;
          }

          this.emitEvent({
            id: uuidv4(),
            type: "viewer-update",
            platform: "youtube",
            sender: {
              id: this.channelId,
              nickname: details.snippet?.channelTitle || this.channelId,
            },
            content: { viewerCount: viewers },
            metadata: {
              timestamp: new Date().toISOString(),
              channelId: this.channelId,
              videoId: this.videoId,
            },
          });
        }
      } catch (err) {
        console.error(`[youtube] Viewer poll error:`, err.message);
      }
    }, this.viewerPollIntervalMs);
  }

  /**
   * 채팅 메시지 폴링
   * 비용: 5 units per call
   */
  startChatPolling() {
    const poll = async () => {
      try {
        if (!YouTubeQuota.canUse(5)) {
          console.warn("[youtube] Chat polling paused - quota low");
          return;
        }

        let url = `/liveChat/messages?liveChatId=${encodeURIComponent(this.liveChatId)}&part=snippet,authorDetails&maxResults=200`;
        if (this.nextPageToken) {
          url += `&pageToken=${this.nextPageToken}`;
        }

        const data = await this.ytFetch(url, 5);

        this.nextPageToken = data.nextPageToken;

        // API가 추천하는 폴링 간격 사용
        if (data.pollingIntervalMillis) {
          this.pollingIntervalMs = Math.max(data.pollingIntervalMillis, 5000);
        }

        // 메시지 처리
        if (data.items) {
          this.processMessages(data.items);
        }
      } catch (err) {
        console.error(`[youtube] Chat poll error:`, err.message);
      }

      // 다음 폴링 스케줄
      if (this.chatPollInterval !== null) {
        this.chatPollInterval = setTimeout(poll, this.pollingIntervalMs);
      }
    };

    this.chatPollInterval = setTimeout(poll, this.pollingIntervalMs);
  }

  /**
   * 채팅 메시지 처리
   */
  processMessages(items) {
    for (const item of items) {
      const snippet = item.snippet;
      const author = item.authorDetails;

      if (snippet.type === "textMessageEvent") {
        this.emitEvent({
          id: uuidv4(),
          type: "chat",
          platform: "youtube",
          sender: {
            id: author.channelId,
            nickname: author.displayName,
            profileImage: author.profileImageUrl,
            role: this.mapRole(author),
          },
          content: {
            message: snippet.textMessageDetails?.messageText || "",
          },
          metadata: {
            timestamp: snippet.publishedAt,
            channelId: this.channelId,
            videoId: this.videoId,
          },
        });
      } else if (snippet.type === "superChatEvent") {
        const sc = snippet.superChatDetails;
        this.emitEvent({
          id: uuidv4(),
          type: "donation",
          platform: "youtube",
          sender: {
            id: author.channelId,
            nickname: author.displayName,
            profileImage: author.profileImageUrl,
          },
          content: {
            message: sc.userComment || "",
            amount: sc.amountMicros ? sc.amountMicros / 1000000 : 0,
            originalAmount: sc.amountMicros ? sc.amountMicros / 1000000 : 0,
            currency: sc.currency || "KRW",
            donationType: "superchat",
            tier: sc.tier,
          },
          metadata: {
            timestamp: snippet.publishedAt,
            channelId: this.channelId,
            videoId: this.videoId,
          },
        });
      } else if (snippet.type === "superStickerEvent") {
        const ss = snippet.superStickerDetails;
        this.emitEvent({
          id: uuidv4(),
          type: "donation",
          platform: "youtube",
          sender: {
            id: author.channelId,
            nickname: author.displayName,
          },
          content: {
            message: "",
            amount: ss.amountMicros ? ss.amountMicros / 1000000 : 0,
            originalAmount: ss.amountMicros ? ss.amountMicros / 1000000 : 0,
            currency: ss.currency || "KRW",
            donationType: "supersticker",
          },
          metadata: {
            timestamp: snippet.publishedAt,
            channelId: this.channelId,
            videoId: this.videoId,
          },
        });
      } else if (snippet.type === "newSponsorEvent") {
        this.emitEvent({
          id: uuidv4(),
          type: "subscribe",
          platform: "youtube",
          sender: {
            id: author.channelId,
            nickname: author.displayName,
          },
          content: {
            tier: snippet.membershipGiftingDetails?.giftMembershipsLevelName || "member",
          },
          metadata: {
            timestamp: snippet.publishedAt,
            channelId: this.channelId,
            videoId: this.videoId,
          },
        });
      }
    }
  }

  /**
   * 역할 매핑
   */
  mapRole(author) {
    if (author.isChatOwner) return "streamer";
    if (author.isChatModerator) return "manager";
    if (author.isChatSponsor) return "subscriber";
    return "regular";
  }

  /**
   * 연결 해제
   */
  disconnect() {
    if (this.chatPollInterval) {
      clearTimeout(this.chatPollInterval);
      this.chatPollInterval = null;
    }
    if (this.viewerPollInterval) {
      clearInterval(this.viewerPollInterval);
      this.viewerPollInterval = null;
    }
    this.videoId = null;
    this.liveChatId = null;
    this.nextPageToken = null;
    this.resetConnection();
    this.onDisconnected();
  }

  // ============================================
  // 정적 메서드: 크롤러용
  // ============================================

  /**
   * 한국 라이브 방송 검색
   * 비용: 100 units per page
   * @param {string} apiKey
   * @param {string|null} pageToken
   * @returns {Promise<{broadcasts: Array, nextPageToken: string|null}>}
   */
  static async searchLiveBroadcasts(apiKey, pageToken = null) {
    if (!YouTubeQuota.canUse(100)) {
      console.warn("[youtube] Skipping broadcast search - quota low");
      return { broadcasts: [], nextPageToken: null };
    }

    const params = new URLSearchParams({
      part: "id,snippet",
      type: "video",
      eventType: "live",
      regionCode: "KR",
      relevanceLanguage: "ko",
      maxResults: "50",
      order: "viewCount",
      key: apiKey,
    });
    if (pageToken) params.set("pageToken", pageToken);

    const response = await fetch(`${YT_API_BASE}/search?${params}`);
    if (!response.ok) {
      throw new Error(`YouTube search API: ${response.status}`);
    }

    YouTubeQuota.use(100);
    const data = await response.json();

    // 비디오 ID 모아서 한 번에 상세정보 조회 (1 unit)
    const videoIds = (data.items || []).map((item) => item.id.videoId).filter(Boolean);
    let videoDetails = {};

    if (videoIds.length > 0 && YouTubeQuota.canUse(1)) {
      const detailResponse = await fetch(
        `${YT_API_BASE}/videos?part=liveStreamingDetails,snippet&id=${videoIds.join(",")}&key=${apiKey}`
      );
      if (detailResponse.ok) {
        YouTubeQuota.use(1);
        const detailData = await detailResponse.json();
        for (const v of detailData.items || []) {
          videoDetails[v.id] = v;
        }
      }
    }

    const broadcasts = (data.items || []).map((item) => {
      const videoId = item.id.videoId;
      const detail = videoDetails[videoId];
      const viewers = detail?.liveStreamingDetails?.concurrentViewers
        ? parseInt(detail.liveStreamingDetails.concurrentViewers, 10)
        : 0;

      return {
        platform: "youtube",
        channelId: item.snippet.channelId,
        broadcastId: videoId,
        streamerId: item.snippet.channelId,
        nickname: item.snippet.channelTitle || "Unknown",
        title: item.snippet.title || "",
        categoryId: detail?.snippet?.categoryId || null,
        categoryName: null, // YouTube는 카테고리 ID만 제공
        viewerCount: viewers,
        thumbnailUrl: item.snippet.thumbnails?.medium?.url || null,
        profileImageUrl: null,
        startedAt: detail?.liveStreamingDetails?.actualStartTime || null,
        isLive: true,
      };
    });

    return {
      broadcasts,
      nextPageToken: data.nextPageToken || null,
    };
  }

  /**
   * 모든 라이브 방송 조회
   * @param {string} apiKey
   * @param {number} maxPages - 최대 페이지 수 (기본: 3, 비용 ~303 units)
   * @returns {Promise<Array>}
   */
  static async getAllLiveBroadcasts(apiKey, maxPages = 3) {
    const all = [];
    let pageToken = null;

    for (let page = 0; page < maxPages; page++) {
      const result = await YouTubeAdapter.searchLiveBroadcasts(apiKey, pageToken);

      if (result.broadcasts.length === 0) break;
      all.push(...result.broadcasts);

      if (!result.nextPageToken) break;
      pageToken = result.nextPageToken;

      // Rate limiting
      await new Promise((r) => setTimeout(r, 500));
    }

    all.sort((a, b) => b.viewerCount - a.viewerCount);
    return all;
  }

  /**
   * YouTube 비디오 카테고리 조회
   * 비용: 1 unit
   * @param {string} apiKey
   * @returns {Promise<Array>}
   */
  static async getVideoCategories(apiKey) {
    if (!YouTubeQuota.canUse(1)) {
      return [];
    }

    const response = await fetch(
      `${YT_API_BASE}/videoCategories?part=snippet&regionCode=KR&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`YouTube categories API: ${response.status}`);
    }

    YouTubeQuota.use(1);
    const data = await response.json();

    return (data.items || [])
      .filter((cat) => cat.snippet.assignable)
      .map((cat) => ({
        platform: "youtube",
        platformCategoryId: cat.id,
        platformCategoryName: cat.snippet.title,
        categoryType: cat.id === "20" ? "GAME" : "ETC",
        thumbnailUrl: null,
      }));
  }

  /**
   * 할당량 상태 조회
   */
  static getQuotaStatus() {
    return YouTubeQuota.getStatus();
  }
}

module.exports = YouTubeAdapter;
