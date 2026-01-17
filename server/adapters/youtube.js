/**
 * YouTubeAdapter - YouTube Live 채팅/후원 어댑터
 *
 * YouTube Live Stream의 채팅과 Super Chat 이벤트를 실시간으로 수신합니다.
 * YouTube Data API v3를 사용합니다.
 *
 * @see https://developers.google.com/youtube/v3/live/docs/liveChatMessages
 */

const BaseAdapter = require("./base");
const { v4: uuidv4 } = require("uuid");

class YouTubeAdapter extends BaseAdapter {
  constructor(options = {}) {
    super(options);

    this.platform = "youtube";
    this.apiKey = options.apiKey || process.env.YOUTUBE_API_KEY;
    this.liveChatId = null;
    this.nextPageToken = null;
    this.pollInterval = null;
    this.pollIntervalMs = options.pollIntervalMs || 5000; // 5초마다 폴링
    this.videoId = options.videoId || null; // 라이브 영상 ID (직접 지정 가능)

    // API 요청에 필요한 기본 헤더
    this.defaultHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };
  }

  /**
   * YouTube Live 채팅에 연결
   */
  async connect() {
    try {
      if (!this.apiKey) {
        throw new Error("YouTube API key is required");
      }

      // 1. 라이브 방송 정보 조회 (videoId 또는 channelId 사용)
      const liveInfo = await this.getLiveInfo();
      if (!liveInfo) {
        throw new Error("Live stream not found or channel is not live");
      }

      this.liveChatId = liveInfo.liveChatId;
      this.videoId = liveInfo.videoId;
      console.log(`[youtube] Live Chat ID: ${this.liveChatId}, Video ID: ${this.videoId}`);

      // 2. 채팅 폴링 시작
      this.startPolling();
      this.onConnected();
    } catch (error) {
      console.error(`[youtube] Connection error:`, error.message);
      this.emitError(error);
      throw error;
    }
  }

  /**
   * 라이브 방송 정보 조회
   */
  async getLiveInfo() {
    try {
      // videoId가 직접 제공된 경우
      if (this.videoId) {
        const videoInfo = await this.getVideoInfo(this.videoId);
        if (videoInfo && videoInfo.liveStreamingDetails?.activeLiveChatId) {
          return {
            videoId: this.videoId,
            liveChatId: videoInfo.liveStreamingDetails.activeLiveChatId,
            title: videoInfo.snippet?.title,
            channelTitle: videoInfo.snippet?.channelTitle,
          };
        }
      }

      // channelId로 현재 라이브 방송 검색
      if (this.channelId) {
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${this.channelId}&type=video&eventType=live&key=${this.apiKey}`;
        const response = await fetch(searchUrl, { headers: this.defaultHeaders });
        const data = await response.json();

        if (data.error) {
          console.error(`[youtube] API error:`, data.error.message);
          return null;
        }

        if (!data.items || data.items.length === 0) {
          console.log(`[youtube] No live stream found for channel: ${this.channelId}`);
          return null;
        }

        const liveVideo = data.items[0];
        const videoId = liveVideo.id.videoId;

        // 비디오 정보에서 liveChatId 가져오기
        const videoInfo = await this.getVideoInfo(videoId);
        if (videoInfo && videoInfo.liveStreamingDetails?.activeLiveChatId) {
          return {
            videoId: videoId,
            liveChatId: videoInfo.liveStreamingDetails.activeLiveChatId,
            title: liveVideo.snippet.title,
            channelTitle: liveVideo.snippet.channelTitle,
            thumbnail: liveVideo.snippet.thumbnails?.high?.url,
          };
        }
      }

      return null;
    } catch (error) {
      console.error(`[youtube] Failed to get live info:`, error.message);
      return null;
    }
  }

  /**
   * 비디오 정보 조회 (liveChatId 포함)
   */
  async getVideoInfo(videoId) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${videoId}&key=${this.apiKey}`;
      const response = await fetch(url, { headers: this.defaultHeaders });
      const data = await response.json();

      if (data.error) {
        console.error(`[youtube] Video info API error:`, data.error.message);
        return null;
      }

      return data.items?.[0] || null;
    } catch (error) {
      console.error(`[youtube] Failed to get video info:`, error.message);
      return null;
    }
  }

  /**
   * 채팅 메시지 폴링 시작
   */
  startPolling() {
    // 최초 폴링 실행
    this.pollChatMessages();

    this.pollInterval = setInterval(() => {
      this.pollChatMessages();
    }, this.pollIntervalMs);
  }

  /**
   * 채팅 메시지 폴링 중지
   */
  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * 채팅 메시지 폴링
   */
  async pollChatMessages() {
    if (!this.liveChatId) return;

    try {
      let url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${this.liveChatId}&part=snippet,authorDetails&key=${this.apiKey}`;

      if (this.nextPageToken) {
        url += `&pageToken=${this.nextPageToken}`;
      }

      const response = await fetch(url, { headers: this.defaultHeaders });
      const data = await response.json();

      if (data.error) {
        if (data.error.code === 403) {
          console.error(`[youtube] Chat ended or access denied`);
          this.disconnect();
          return;
        }
        console.error(`[youtube] API error:`, data.error.message);
        return;
      }

      // 다음 페이지 토큰 저장
      this.nextPageToken = data.nextPageToken;

      // 폴링 간격 조정 (YouTube API 권장값 사용)
      if (data.pollingIntervalMillis) {
        this.pollIntervalMs = data.pollingIntervalMillis;
      }

      // 메시지 처리
      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          this.processMessage(item);
        }
      }
    } catch (error) {
      console.error(`[youtube] Poll error:`, error.message);
    }
  }

  /**
   * 채팅 메시지 처리
   */
  processMessage(item) {
    try {
      const snippet = item.snippet;
      const authorDetails = item.authorDetails;

      // 메시지 유형 결정
      let type = "chat";
      let amount = null;
      let currency = null;
      let donationType = null;

      if (snippet.type === "superChatEvent") {
        type = "donation";
        donationType = "super_chat";
        amount = parseInt(snippet.superChatDetails.amountMicros) / 1000000;
        currency = snippet.superChatDetails.currency;
      } else if (snippet.type === "superStickerEvent") {
        type = "donation";
        donationType = "super_sticker";
        amount = parseInt(snippet.superStickerDetails.amountMicros) / 1000000;
        currency = snippet.superStickerDetails.currency;
      } else if (snippet.type === "newSponsorEvent") {
        type = "subscribe";
      } else if (snippet.type === "memberMilestoneChatEvent") {
        type = "subscribe";
      }

      // 금액을 원화로 환산
      const amountKRW = this.convertToKRW(amount, currency);

      const event = {
        id: item.id || uuidv4(),
        type,
        platform: "youtube",
        sender: {
          id: authorDetails.channelId,
          nickname: authorDetails.displayName,
          profileImage: authorDetails.profileImageUrl,
          role: this.mapRole(authorDetails),
          badges: this.extractBadges(authorDetails),
        },
        content: {
          message: snippet.displayMessage || snippet.textMessageDetails?.messageText || "",
          amount: amountKRW,
          originalAmount: amount,
          currency: currency,
          donationType: donationType,
          // Super Chat/Sticker 추가 정보
          tier: snippet.superChatDetails?.tier || snippet.superStickerDetails?.tier || null,
          stickerUrl: snippet.superStickerDetails?.superStickerMetadata?.stickerUrl || null,
        },
        metadata: {
          timestamp: snippet.publishedAt || new Date().toISOString(),
          channelId: this.channelId,
          videoId: this.videoId,
          liveChatId: this.liveChatId,
          messageId: item.id,
          rawData: item,
        },
      };

      this.emitEvent(event);

      // 로깅
      if (type === "donation") {
        console.log(`[youtube] 💰 Super Chat: ${authorDetails.displayName}님이 ${amount} ${currency} (${amountKRW?.toLocaleString()}원) - "${snippet.displayMessage || ""}"`);
      } else if (type === "subscribe") {
        console.log(`[youtube] ⭐ 멤버십: ${authorDetails.displayName}님이 멤버가 되었습니다`);
      }
    } catch (error) {
      console.error(`[youtube] Message processing error:`, error.message);
    }
  }

  /**
   * 역할 매핑
   */
  mapRole(authorDetails) {
    if (authorDetails.isChatOwner) return "streamer";
    if (authorDetails.isChatModerator) return "manager";
    if (authorDetails.isChatSponsor) return "subscriber";
    return "regular";
  }

  /**
   * 뱃지 추출
   */
  extractBadges(authorDetails) {
    const badges = [];

    if (authorDetails.isChatOwner) {
      badges.push({ type: "owner", badgeId: "owner", badgeName: "방송 주인" });
    }
    if (authorDetails.isChatModerator) {
      badges.push({ type: "moderator", badgeId: "moderator", badgeName: "관리자" });
    }
    if (authorDetails.isChatSponsor) {
      badges.push({ type: "member", badgeId: "member", badgeName: "채널 멤버" });
    }
    if (authorDetails.isVerified) {
      badges.push({ type: "verified", badgeId: "verified", badgeName: "인증됨" });
    }

    return badges;
  }

  /**
   * 통화 환산 (KRW)
   */
  convertToKRW(amount, currency) {
    if (!amount || !currency) return null;

    const exchangeRates = {
      USD: 1350,
      KRW: 1,
      JPY: 9,
      EUR: 1450,
      GBP: 1700,
      CAD: 1000,
      AUD: 900,
    };

    const rate = exchangeRates[currency] || 1;
    return Math.round(amount * rate);
  }

  /**
   * 연결 해제
   */
  disconnect() {
    this.stopPolling();
    this.isConnected = false;
    this.liveChatId = null;
    this.nextPageToken = null;
    this.onDisconnected();
    console.log(`[youtube] Disconnected`);
  }

  /**
   * 현재 방송 상태 조회 (외부 호출용)
   */
  async getBroadcastStatus() {
    if (!this.videoId) {
      return null;
    }

    const videoInfo = await this.getVideoInfo(this.videoId);
    if (!videoInfo) {
      return null;
    }

    return {
      videoId: this.videoId,
      title: videoInfo.snippet?.title,
      channelTitle: videoInfo.snippet?.channelTitle,
      channelId: videoInfo.snippet?.channelId,
      thumbnail: videoInfo.snippet?.thumbnails?.high?.url,
      isLive: !!videoInfo.liveStreamingDetails?.activeLiveChatId,
      viewerCount: parseInt(videoInfo.liveStreamingDetails?.concurrentViewers) || 0,
      startTime: videoInfo.liveStreamingDetails?.actualStartTime,
    };
  }

  /**
   * 채널의 현재 라이브 스트림 찾기 (Static method)
   */
  static async findLiveStream(channelId, apiKey) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&eventType=live&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        console.error(`[youtube] Search API error:`, data.error.message);
        return null;
      }

      if (!data.items || data.items.length === 0) {
        return null;
      }

      const liveVideo = data.items[0];
      return {
        videoId: liveVideo.id.videoId,
        title: liveVideo.snippet.title,
        channelTitle: liveVideo.snippet.channelTitle,
        thumbnail: liveVideo.snippet.thumbnails?.high?.url,
        publishedAt: liveVideo.snippet.publishedAt,
      };
    } catch (error) {
      console.error(`[youtube] Find live stream error:`, error.message);
      return null;
    }
  }
}

module.exports = YouTubeAdapter;
