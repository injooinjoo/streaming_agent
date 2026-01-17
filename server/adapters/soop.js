/**
 * SoopAdapter - SOOP (아프리카TV) 채팅/후원 어댑터
 *
 * SOOP 라이브 스트림의 채팅과 후원 이벤트를 실시간으로 수신합니다.
 *
 * @see https://developers.afreecatv.com
 */

const WebSocket = require("ws");
const BaseAdapter = require("./base");
const { v4: uuidv4 } = require("uuid");

// SOOP 채팅 액션 코드 (4자리 문자열)
const CHAT_ACTIONS = {
  PING: "0000",             // 핑/퐁
  CONNECT: "0001",          // 연결
  ENTER_CHAT_ROOM: "0002",  // 채팅방 입장
  EXIT: "0004",             // 퇴장
  CHAT: "0005",             // 일반 채팅
  DISCONNECT: "0007",       // 연결 해제
  ENTER_INFO: "0012",       // 입장 정보
  TEXT_DONATION: "0018",    // 별풍선 (텍스트 후원)
  AD_BALLOON: "0087",       // 애드벌룬
  SUBSCRIBE: "0093",        // 구독
  NOTIFICATION: "0104",     // 시스템 알림
  VIDEO_DONATION: "0105",   // 영상풍선
  EMOTICON: "0109",         // 이모티콘
  VIEWER: "0127",           // 시청자 수
};

// 등급 코드
const GRADE_CODES = {
  0: "regular",
  1: "fan",
  2: "supporter",
  3: "vip",
  4: "vvip",
  5: "manager",
  6: "streamer",
};

class SoopAdapter extends BaseAdapter {
  constructor(options = {}) {
    super(options);

    this.platform = "soop";
    this.ws = null;
    this.broadNo = null;      // 방송 번호 (BNO)
    this.chatNo = null;       // 채팅방 번호 (CHATNO) - JOIN 패킷에 사용
    this.chatDomain = null;   // 채팅 서버 도메인 (CHDOMAIN)
    this.chatPort = null;     // 채팅 서버 포트 (CHPT)
    this.ftk = null;          // 채팅 토큰
    this.bjId = options.channelId;  // BJ 아이디
    this.pingInterval = null;
    this.pingIntervalMs = 60000; // 60초마다 핑

    // API 요청에 필요한 기본 헤더
    this.defaultHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://play.sooplive.co.kr/",
    };
  }

  /**
   * SOOP 채팅에 연결
   */
  async connect() {
    try {
      // 1. 방송 정보 조회
      const broadcastInfo = await this.getBroadcastInfo();
      if (!broadcastInfo) {
        throw new Error("Broadcast not found or BJ is not live");
      }

      this.broadNo = broadcastInfo.BNO;
      this.chatNo = broadcastInfo.CHATNO;  // 채팅방 번호 (JOIN 패킷에 사용)
      this.chatDomain = broadcastInfo.CHDOMAIN;  // 예: "chat1.sooplive.co.kr"
      this.chatPort = parseInt(broadcastInfo.CHPT, 10) || 8584;  // 포트
      this.ftk = broadcastInfo.FTK || "";

      console.log(`[soop] Broadcast No: ${this.broadNo}, ChatNo: ${this.chatNo}, Chat: ${this.chatDomain}:${this.chatPort + 1}`);

      // 2. WebSocket 연결
      await this.connectWebSocket();
    } catch (error) {
      console.error(`[soop] Connection error:`, error.message);
      this.emitError(error);
      throw error;
    }
  }

  /**
   * 방송 정보 조회
   */
  async getBroadcastInfo() {
    try {
      const response = await fetch(
        `https://live.sooplive.co.kr/afreeca/player_live_api.php?bjid=${this.bjId}`,
        {
          method: "POST",
          headers: {
            ...this.defaultHeaders,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: "bid=" + this.bjId + "&type=live&player_type=html5&stream_type=common&quality=original&mode=landing",
        }
      );

      const data = await response.json();

      if (data.CHANNEL?.RESULT !== 1) {
        console.error(`[soop] Broadcast info error:`, data.CHANNEL?.RESULT);
        return null;
      }

      return data.CHANNEL;
    } catch (error) {
      console.error(`[soop] Failed to get broadcast info:`, error.message);
      return null;
    }
  }

  /**
   * 채팅 서버 정보 조회
   */
  async getChatServerInfo() {
    try {
      const response = await fetch(
        `https://live.sooplive.co.kr/afreeca/player_live_api.php?bjid=${this.bjId}`,
        {
          method: "POST",
          headers: {
            ...this.defaultHeaders,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: `bid=${this.bjId}&bno=${this.broadNo}&type=live&player_type=html5&stream_type=common`,
        }
      );

      const data = await response.json();
      return data.CHANNEL;
    } catch (error) {
      console.error(`[soop] Failed to get chat server info:`, error.message);
      return null;
    }
  }

  /**
   * WebSocket 연결
   */
  connectWebSocket() {
    return new Promise((resolve, reject) => {
      // SOOP 채팅 WebSocket 서버 (포트 +1)
      const wsUrl = `wss://${this.chatDomain}:${this.chatPort + 1}/Websocket/${this.bjId}`;

      console.log(`[soop] Connecting to ${wsUrl}`);

      this.ws = new WebSocket(wsUrl, ["chat"], {
        headers: this.defaultHeaders,
      });

      this.ws.on("open", () => {
        console.log(`[soop] WebSocket connected`);
        this.sendConnect();
        this.startPingInterval();
      });

      this.ws.on("message", (data) => {
        try {
          this.handleMessage(data);

          // 연결 완료 판단
          if (!this.isConnected) {
            this.onConnected();
            resolve();
          }
        } catch (error) {
          console.error(`[soop] Message parse error:`, error.message);
        }
      });

      this.ws.on("close", (code, reason) => {
        console.log(`[soop] WebSocket closed: ${code} ${reason}`);
        this.stopPingInterval();
        this.onDisconnected();

        // 자동 재연결
        if (this.isConnected) {
          this.attemptReconnect();
        }
      });

      this.ws.on("error", (error) => {
        console.error(`[soop] WebSocket error:`, error.message);
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
   * 바이트 크기 계산 (6자리 패딩)
   */
  calculateByteSize(str) {
    const byteLength = Buffer.byteLength(str, "utf-8") + 6;
    return byteLength.toString().padStart(6, "0");
  }

  /**
   * 연결 메시지 전송
   */
  sendConnect() {
    // SOOP 채팅 연결 프로토콜 (cha2hyun/afreecatv-chat-crawler 참조)
    // CONNECT_PACKET: \x1b\t000100000600\x0c\x0c\x0c16\x0c
    const SEPARATOR = "\x0c";
    const PREFIX = "\x1b\t";
    const CONNECT_PACKET = `${PREFIX}000100000600${SEPARATOR}${SEPARATOR}${SEPARATOR}16${SEPARATOR}`;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log(`[soop] Sending CONNECT packet`);
      this.ws.send(CONNECT_PACKET);

      // 연결 후 채팅방 JOIN 패킷 전송
      setTimeout(() => this.sendJoin(), 500);
    }
  }

  /**
   * 채팅방 참여 메시지 전송
   */
  sendJoin() {
    // JOIN_PACKET: \x1b\t0002{byte_size}00\x0c{CHATNO}\x0c\x0c\x0c\x0c\x0c
    const SEPARATOR = "\x0c";
    const PREFIX = "\x1b\t";
    const chatNo = this.chatNo.toString();  // CHATNO 사용 (BNO가 아닌)
    const byteSize = this.calculateByteSize(chatNo);

    const JOIN_PACKET = `${PREFIX}0002${byteSize}00${SEPARATOR}${chatNo}${SEPARATOR}${SEPARATOR}${SEPARATOR}${SEPARATOR}${SEPARATOR}`;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log(`[soop] Sending JOIN packet for chat room ${chatNo}`);
      this.ws.send(JOIN_PACKET);
    }
  }

  /**
   * 메시지 빌드 (SOOP 프로토콜)
   */
  buildMessage(header, cmd, flag, params = []) {
    const SEPARATOR = "\x0c";
    const body = params.join(SEPARATOR);
    return `${header}${cmd}${flag}${body}${SEPARATOR}`;
  }

  /**
   * 메시지 처리
   */
  handleMessage(rawData) {
    const SEPARATOR = "\x0c";
    const data = rawData.toString();

    // 디버그: 0005 채팅 메시지만 로깅 (다른 메시지는 너무 많음)
    // if (data.includes("\x1b\t0005")) {
    //   console.log(`[soop] Raw chat (${data.length} bytes):`, data.substring(0, 200).replace(/\x0c/g, '|').replace(/\x1b/g, '[ESC]'));
    // }

    // SOOP 프로토콜 파싱 (구분자: \x0c)
    const parts = data.split(SEPARATOR);
    if (parts.length < 2) return;

    // 메시지 타입 추출 (패킷 헤더에서 명령 코드 추출)
    const header = parts[0];

    // 액션 코드 추출 (헤더에서 처음 4자리 숫자가 액션 코드)
    // 형식: \x1b\t{4자리코드}{8자리길이} → 예: \x1b\t000500012900
    let actionCode = null;
    const codeStart = header.indexOf("\x1b\t");
    if (codeStart !== -1 && header.length >= codeStart + 6) {
      actionCode = header.substring(codeStart + 2, codeStart + 6);
    }

    // 채팅 메시지 처리 (액션 코드 0005)
    // 형식: message|userId|?|?|grade|nickname|...
    if (actionCode === CHAT_ACTIONS.CHAT && parts.length >= 7) {
      const message = parts[1] || "";
      const userId = parts[2] || "";
      const nickname = parts[6] || "";

      if (message) {
        this.processChatMessage(userId, nickname, message, parts);
      }
      return;
    }

    // 별풍선 후원 처리 (액션 코드 0018)
    if (actionCode === CHAT_ACTIONS.TEXT_DONATION && parts.length >= 4) {
      this.processTextDonation(parts);
      return;
    }

    // 애드벌룬 후원 처리 (액션 코드 0087)
    if (actionCode === CHAT_ACTIONS.AD_BALLOON && parts.length >= 4) {
      this.processAdBalloonDonation(parts);
      return;
    }

    // 영상풍선 후원 처리 (액션 코드 0105)
    if (actionCode === CHAT_ACTIONS.VIDEO_DONATION && parts.length >= 4) {
      this.processVideoDonation(parts);
      return;
    }

    // 구독 처리 (액션 코드 0093)
    if (actionCode === CHAT_ACTIONS.SUBSCRIBE && parts.length >= 3) {
      this.processSubscribe(parts);
      return;
    }

    // 시스템 알림 처리 (액션 코드 0104)
    if (actionCode === CHAT_ACTIONS.NOTIFICATION && parts.length >= 2) {
      const notificationMsg = parts[1] || "";
      if (notificationMsg) {
        console.log(`[soop] Notification: ${notificationMsg}`);
      }
      return;
    }

    // 사용자 입장/퇴장 처리 (액션 코드 0004)
    if (actionCode === CHAT_ACTIONS.EXIT) {
      // 입장/퇴장 이벤트는 무시
      return;
    }

    // 연결 성공 응답 (액션 코드 0001)
    if (actionCode === CHAT_ACTIONS.CONNECT) {
      console.log(`[soop] Received CONNECT response`);
      return;
    }

    // 채팅방 입장 응답 (액션 코드 0002)
    if (actionCode === CHAT_ACTIONS.ENTER_CHAT_ROOM) {
      console.log(`[soop] Received JOIN response - connected to chat room`);
      if (!this.isConnected) {
        this.onConnected();
      }
      return;
    }

    // 핑 응답 처리 (액션 코드 0000)
    if (actionCode === CHAT_ACTIONS.PING) {
      // 서버 핑에 대한 퐁 응답
      return;
    }

    // 시청자 수 업데이트 (액션 코드 0127)
    if (actionCode === CHAT_ACTIONS.VIEWER && parts.length >= 2) {
      this.processViewerUpdate(parts);
      return;
    }

    // 이모티콘 (액션 코드 0109)
    if (actionCode === CHAT_ACTIONS.EMOTICON && parts.length >= 3) {
      this.processEmoticon(parts);
      return;
    }

    // 입장 정보 (액션 코드 0012)
    if (actionCode === CHAT_ACTIONS.ENTER_INFO && parts.length >= 3) {
      this.processEntryInfo(parts);
      return;
    }

    // 연결 해제 (액션 코드 0007)
    if (actionCode === CHAT_ACTIONS.DISCONNECT) {
      return;
    }

    // 알 수 없는 액션 코드 디버깅 (후원 메시지 형식 확인용)
    if (actionCode && actionCode !== "") {
      // 중요 액션 코드만 로깅 (0018, 0087, 0093, 0105 등 후원 관련)
      const importantCodes = ["0018", "0087", "0093", "0105"];
      if (importantCodes.includes(actionCode)) {
        console.log(`[soop] DEBUG ${actionCode}: parts=`, parts.slice(0, 10).map(p => p.substring(0, 50)));
      }
    }
  }

  /**
   * 채팅 메시지 처리 (새 형식)
   */
  processChatMessage(userId, nickname, message, parts) {
    try {
      const event = {
        id: uuidv4(),
        type: "chat",
        platform: "soop",
        sender: {
          id: userId,
          nickname: nickname || userId,
          profileImage: userId ? `https://profile.img.sooplive.co.kr/LOGO/${userId.substring(0, 2)}/${userId}/${userId}.jpg` : null,
          role: "regular",
          badges: [],
        },
        content: {
          message: message,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          channelId: this.bjId,
          broadNo: this.broadNo,
          chatNo: this.chatNo,
          rawData: parts,
        },
      };

      this.emitEvent(event);
      console.log(`[soop] Chat: ${nickname}: ${message}`);
    } catch (error) {
      console.error(`[soop] Chat processing error:`, error.message);
    }
  }

  /**
   * 별풍선 후원 처리 (TEXT_DONATION - 0018)
   * 형식: message|userId|nickname|count|...
   */
  processTextDonation(parts) {
    try {
      // 파싱 (정확한 인덱스는 실제 데이터 확인 후 조정 필요)
      const message = parts[1] || "";
      const userId = parts[2] || "";
      const nickname = parts[3] || "";
      const count = parseInt(parts[4], 10) || 0;

      // 별풍선 1개 = 100원
      const amountKRW = count * 100;

      const event = {
        id: uuidv4(),
        type: "donation",
        platform: "soop",
        sender: {
          id: userId,
          nickname: nickname || userId,
          profileImage: userId ? `https://profile.img.sooplive.co.kr/LOGO/${userId.substring(0, 2)}/${userId}/${userId}.jpg` : null,
          role: "regular",
        },
        content: {
          message: message,
          amount: amountKRW,
          originalAmount: count,
          currency: "balloon",
          donationType: "star_balloon",
        },
        metadata: {
          timestamp: new Date().toISOString(),
          channelId: this.bjId,
          broadNo: this.broadNo,
          chatNo: this.chatNo,
          rawData: parts,
        },
      };

      this.emitEvent(event);
      console.log(`[soop] 🎈 별풍선: ${nickname}님이 ${count}개 (${amountKRW.toLocaleString()}원) - "${message}"`);
    } catch (error) {
      console.error(`[soop] Text donation processing error:`, error.message);
    }
  }

  /**
   * 애드벌룬 후원 처리 (AD_BALLOON - 0087)
   */
  processAdBalloonDonation(parts) {
    try {
      const message = parts[1] || "";
      const userId = parts[2] || "";
      const nickname = parts[3] || "";
      const count = parseInt(parts[4], 10) || 0;

      // 애드벌룬 가치 (별풍선과 동일하게 계산)
      const amountKRW = count * 100;

      const event = {
        id: uuidv4(),
        type: "donation",
        platform: "soop",
        sender: {
          id: userId,
          nickname: nickname || userId,
          profileImage: userId ? `https://profile.img.sooplive.co.kr/LOGO/${userId.substring(0, 2)}/${userId}/${userId}.jpg` : null,
          role: "regular",
        },
        content: {
          message: message,
          amount: amountKRW,
          originalAmount: count,
          currency: "ad_balloon",
          donationType: "ad_balloon",
        },
        metadata: {
          timestamp: new Date().toISOString(),
          channelId: this.bjId,
          broadNo: this.broadNo,
          chatNo: this.chatNo,
          rawData: parts,
        },
      };

      this.emitEvent(event);
      console.log(`[soop] 🎪 애드벌룬: ${nickname}님이 ${count}개 (${amountKRW.toLocaleString()}원) - "${message}"`);
    } catch (error) {
      console.error(`[soop] Ad balloon donation processing error:`, error.message);
    }
  }

  /**
   * 영상풍선 후원 처리 (VIDEO_DONATION - 0105)
   */
  processVideoDonation(parts) {
    try {
      const message = parts[1] || "";
      const userId = parts[2] || "";
      const nickname = parts[3] || "";
      const count = parseInt(parts[4], 10) || 0;
      const videoUrl = parts[5] || "";

      // 영상풍선 가치
      const amountKRW = count * 100;

      const event = {
        id: uuidv4(),
        type: "donation",
        platform: "soop",
        sender: {
          id: userId,
          nickname: nickname || userId,
          profileImage: userId ? `https://profile.img.sooplive.co.kr/LOGO/${userId.substring(0, 2)}/${userId}/${userId}.jpg` : null,
          role: "regular",
        },
        content: {
          message: message,
          amount: amountKRW,
          originalAmount: count,
          currency: "video_balloon",
          donationType: "video_balloon",
          videoUrl: videoUrl,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          channelId: this.bjId,
          broadNo: this.broadNo,
          chatNo: this.chatNo,
          rawData: parts,
        },
      };

      this.emitEvent(event);
      console.log(`[soop] 🎬 영상풍선: ${nickname}님이 ${count}개 (${amountKRW.toLocaleString()}원) - "${message}"`);
    } catch (error) {
      console.error(`[soop] Video donation processing error:`, error.message);
    }
  }

  /**
   * 구독 처리 (SUBSCRIBE - 0093)
   */
  processSubscribe(parts) {
    try {
      const userId = parts[1] || "";
      const nickname = parts[2] || "";
      const months = parseInt(parts[3], 10) || 1;
      const tier = parts[4] || "기본";

      const event = {
        id: uuidv4(),
        type: "subscribe",
        platform: "soop",
        sender: {
          id: userId,
          nickname: nickname || userId,
          profileImage: userId ? `https://profile.img.sooplive.co.kr/LOGO/${userId.substring(0, 2)}/${userId}/${userId}.jpg` : null,
        },
        content: {
          message: `${nickname}님이 ${months}개월 구독`,
          tier: tier,
          months: months,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          channelId: this.bjId,
          broadNo: this.broadNo,
          chatNo: this.chatNo,
          rawData: parts,
        },
      };

      this.emitEvent(event);
      console.log(`[soop] ⭐ 구독: ${nickname}님이 ${months}개월 구독 (${tier})`);
    } catch (error) {
      console.error(`[soop] Subscribe processing error:`, error.message);
    }
  }

  /**
   * 이모티콘 처리 (EMOTICON - 0109)
   */
  processEmoticon(parts) {
    try {
      // 형식: message|userId|nickname|emoticonId|...
      const userId = parts[1] || "";
      const nickname = parts[2] || "";
      const emoticonId = parts[3] || "";
      const emoticonUrl = parts[4] || "";

      const event = {
        id: uuidv4(),
        type: "emoticon",
        platform: "soop",
        sender: {
          id: userId,
          nickname: nickname || userId,
          profileImage: userId ? `https://profile.img.sooplive.co.kr/LOGO/${userId.substring(0, 2)}/${userId}/${userId}.jpg` : null,
          role: "regular",
        },
        content: {
          emoticonId: emoticonId,
          emoticonUrl: emoticonUrl,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          channelId: this.bjId,
          broadNo: this.broadNo,
          chatNo: this.chatNo,
          rawData: parts,
        },
      };

      this.emitEvent(event);
      console.log(`[soop] 😀 이모티콘: ${nickname}님이 이모티콘 전송 (${emoticonId})`);
    } catch (error) {
      console.error(`[soop] Emoticon processing error:`, error.message);
    }
  }

  /**
   * 입장 정보 처리 (ENTER_INFO - 0012)
   */
  processEntryInfo(parts) {
    try {
      // 형식: userId|nickname|grade|...
      const userId = parts[1] || "";
      const nickname = parts[2] || "";
      const gradeCode = parseInt(parts[3], 10) || 0;

      // 빈 userId 또는 시스템 메시지는 무시
      if (!userId || userId === "system") {
        return;
      }

      const event = {
        id: uuidv4(),
        type: "entry",
        platform: "soop",
        sender: {
          id: userId,
          nickname: nickname || userId,
          profileImage: userId ? `https://profile.img.sooplive.co.kr/LOGO/${userId.substring(0, 2)}/${userId}/${userId}.jpg` : null,
          role: GRADE_CODES[gradeCode] || "regular",
        },
        content: {
          message: `${nickname || userId}님이 입장했습니다.`,
          grade: GRADE_CODES[gradeCode] || "regular",
        },
        metadata: {
          timestamp: new Date().toISOString(),
          channelId: this.bjId,
          broadNo: this.broadNo,
          chatNo: this.chatNo,
          rawData: parts,
        },
      };

      this.emitEvent(event);
      console.log(`[soop] 🚪 입장: ${nickname}님 (${GRADE_CODES[gradeCode] || "regular"})`);
    } catch (error) {
      console.error(`[soop] Entry info processing error:`, error.message);
    }
  }

  /**
   * 시청자 수 업데이트 처리 (VIEWER - 0127)
   */
  processViewerUpdate(parts) {
    try {
      // parts[1]에 시청자 수가 포함됨
      const viewerCount = parseInt(parts[1], 10) || 0;

      const event = {
        id: uuidv4(),
        type: "viewer-update",
        platform: "soop",
        sender: {
          id: "system",
          nickname: "SOOP",
        },
        content: {
          viewerCount: viewerCount,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          channelId: this.bjId,
          broadNo: this.broadNo,
        },
      };

      this.emitEvent(event);
      console.log(`[soop] 👥 시청자 수: ${viewerCount.toLocaleString()}명`);
    } catch (error) {
      console.error(`[soop] Viewer update processing error:`, error.message);
    }
  }

  /**
   * 후원 타입 매핑
   */
  getDonationType(actionCode) {
    const types = {
      [CHAT_ACTIONS.TEXT_DONATION]: "star_balloon",
      [CHAT_ACTIONS.AD_BALLOON]: "ad_balloon",
      [CHAT_ACTIONS.VIDEO_DONATION]: "video_balloon",
    };
    return types[actionCode] || "balloon";
  }

  /**
   * PONG 전송 (PING_PACKET)
   */
  sendPong() {
    // PING_PACKET: \x1b\t000000000100\x0c
    const SEPARATOR = "\x0c";
    const PREFIX = "\x1b\t";
    const PING_PACKET = `${PREFIX}000000000100${SEPARATOR}`;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(PING_PACKET);
    }
  }

  /**
   * 핑 인터벌 시작
   */
  startPingInterval() {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendPong(); // PING 패킷 전송
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
   * 채팅 메시지 처리
   */
  processChat(parts) {
    try {
      // SOOP 채팅 메시지 파싱
      // 형식: header\f닉네임\f메시지\f유저ID\f등급\f기타...
      const nickname = parts[1] || "익명";
      const message = parts[2] || "";
      const userId = parts[3] || "";
      const gradeCode = parseInt(parts[4], 10) || 0;

      const event = {
        id: uuidv4(),
        type: "chat",
        platform: "soop",
        sender: {
          id: userId,
          nickname: nickname,
          profileImage: userId ? `https://profile.img.sooplive.co.kr/LOGO/${userId.substring(0, 2)}/${userId}/${userId}.jpg` : null,
          role: GRADE_CODES[gradeCode] || "regular",
          badges: [],
        },
        content: {
          message: message,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          channelId: this.bjId,
          broadNo: this.broadNo,
          rawData: parts,
        },
      };

      this.emitEvent(event);
    } catch (error) {
      console.error(`[soop] Chat processing error:`, error.message);
    }
  }

  /**
   * 후원 메시지 처리
   */
  processDonation(parts, donationType) {
    try {
      // SOOP 후원 메시지 파싱
      // 형식: header\f닉네임\f개수\f메시지\f유저ID\f기타...
      const nickname = parts[1] || "익명";
      const count = parseInt(parts[2], 10) || 0;
      const message = parts[3] || "";
      const userId = parts[4] || "";

      // 별풍선 1개 = 100원
      const amountKRW = count * 100;

      const event = {
        id: uuidv4(),
        type: "donation",
        platform: "soop",
        sender: {
          id: userId,
          nickname: nickname,
          profileImage: userId ? `https://profile.img.sooplive.co.kr/LOGO/${userId.substring(0, 2)}/${userId}/${userId}.jpg` : null,
          role: "regular",
        },
        content: {
          message: message,
          amount: amountKRW,
          originalAmount: count,
          currency: "balloon",
          donationType: donationType,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          channelId: this.bjId,
          broadNo: this.broadNo,
          rawData: parts,
        },
      };

      this.emitEvent(event);
    } catch (error) {
      console.error(`[soop] Donation processing error:`, error.message);
    }
  }

  /**
   * 구독 메시지 처리
   */
  processSubscription(parts) {
    try {
      const nickname = parts[1] || "익명";
      const userId = parts[2] || "";
      const months = parseInt(parts[3], 10) || 1;

      const event = {
        id: uuidv4(),
        type: "subscribe",
        platform: "soop",
        sender: {
          id: userId,
          nickname: nickname,
          profileImage: userId ? `https://profile.img.sooplive.co.kr/LOGO/${userId.substring(0, 2)}/${userId}/${userId}.jpg` : null,
        },
        content: {
          message: `${nickname}님이 ${months}개월 구독`,
          tier: "기본",
          months: months,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          channelId: this.bjId,
          broadNo: this.broadNo,
          rawData: parts,
        },
      };

      this.emitEvent(event);
    } catch (error) {
      console.error(`[soop] Subscription processing error:`, error.message);
    }
  }

  /**
   * 연결 해제
   */
  disconnect() {
    this.stopPingInterval();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    this.broadNo = null;
    this.chatNo = null;
    this.chatDomain = null;
    this.chatPort = null;
    console.log(`[soop] Disconnected`);
  }

  /**
   * 현재 방송 정보 조회 (외부 호출용)
   */
  async getBroadcastStatus() {
    const info = await this.getBroadcastInfo();
    if (!info) {
      return null;
    }

    return {
      bjId: this.bjId,
      bjNickname: info.BJNICK,
      title: info.TITLE,
      viewers: parseInt(info.TOTAL_VIEW_CNT, 10) || 0,
      isLive: info.RESULT === 1,
      broadNo: info.BNO,
      category: info.CATE,
      thumbnail: info.THUMB,
    };
  }

  /**
   * SOOP 카테고리 목록 조회 (Static method)
   * @param {number} pageNo - 페이지 번호 (기본: 1)
   * @param {number} listCnt - 페이지당 결과 수 (기본: 100)
   * @returns {Promise<Array>} 카테고리 목록
   */
  static async getCategoryList(pageNo = 1, listCnt = 100) {
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Origin": "https://play.sooplive.co.kr",
      "Referer": "https://play.sooplive.co.kr/",
    };

    try {
      const response = await fetch(
        `https://sch.sooplive.co.kr/api.php?m=categoryList&nPageNo=${pageNo}&nListCnt=${listCnt}`,
        { headers }
      );
      const data = await response.json();

      if (!data || !Array.isArray(data.data)) {
        return [];
      }

      return data.data.map((item) => ({
        categoryId: String(item.cate_no || item.id),
        categoryName: item.cate_name || item.name,
        categoryType: item.cate_type || "GAME",
        thumbnailUrl: item.cate_img || item.thumbnail || null,
        viewerCount: parseInt(item.total_view_cnt, 10) || 0,
        streamerCount: parseInt(item.total_broad_cnt, 10) || 0,
      }));
    } catch (error) {
      console.error("[soop] getCategoryList error:", error.message);
      return [];
    }
  }

  /**
   * 모든 SOOP 카테고리 조회 (페이지네이션 자동 처리)
   * @returns {Promise<Array>} 전체 카테고리 목록
   */
  static async getAllCategories() {
    const allCategories = [];
    let pageNo = 1;
    const listCnt = 100;
    let hasMore = true;

    while (hasMore) {
      const categories = await SoopAdapter.getCategoryList(pageNo, listCnt);

      if (categories.length === 0) {
        hasMore = false;
      } else {
        allCategories.push(...categories);
        if (categories.length < listCnt) {
          hasMore = false;
        } else {
          pageNo++;
          // Rate limiting: 500ms delay between requests
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }

    return allCategories;
  }
}

module.exports = SoopAdapter;
