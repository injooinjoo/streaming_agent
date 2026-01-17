/**
 * WebSocket Manager
 *
 * 다중 SOOP 채팅방 WebSocket 연결 관리
 * - 확장 가능한 연결 풀
 * - 시청자 목록 수집
 * - 후원 이벤트 수집
 */

const EventEmitter = require("events");
const WebSocket = require("ws");

// SOOP 채팅 액션 코드
const CHAT_ACTIONS = {
  PING: "0000",
  CONNECT: "0001",
  ENTER_CHAT_ROOM: "0002",
  USER_LIST: "0004",
  CHAT: "0005",
  USER_JOIN: "0012",
  TEXT_DONATION: "0018",
  AD_BALLOON: "0087",
  SUBSCRIBE: "0093",
  VIDEO_DONATION: "0105",
  VIEWER: "0127",
};

class WebSocketManager extends EventEmitter {
  /**
   * @param {sqlite3.Database} db
   * @param {Object} options
   */
  constructor(db, options = {}) {
    super();

    this.db = db;
    this.options = {
      maxConnections: 100,
      reconnectDelay: 5000,
      pingInterval: 60000,
      ...options,
    };

    // 연결 풀: broadcastId -> SoopConnection
    this.connections = new Map();

    // 연결 대상 큐
    this.targetQueue = [];

    this.defaultHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Referer: "https://play.sooplive.co.kr/",
    };
  }

  /**
   * 연결 대상 업데이트
   * @param {Array} targets - 연결할 방송 목록
   */
  async updateTargets(targets) {
    const targetIds = new Set(targets.map((t) => t.broadcastId));

    // 1. 더 이상 대상이 아닌 연결 종료
    for (const [broadcastId, connection] of this.connections) {
      if (!targetIds.has(broadcastId)) {
        console.log(`[WSManager] Disconnecting: ${broadcastId}`);
        connection.close();
        this.connections.delete(broadcastId);
      }
    }

    // 2. 새로운 대상 연결
    for (const target of targets) {
      if (!this.connections.has(target.broadcastId)) {
        if (this.connections.size < this.options.maxConnections) {
          await this.connect(target);
        } else {
          // 큐에 추가 (나중에 슬롯 생기면 연결)
          this.targetQueue.push(target);
        }
      }
    }

    console.log(`[WSManager] Active connections: ${this.connections.size}/${this.options.maxConnections}`);
  }

  /**
   * 방송에 WebSocket 연결
   * @param {Object} target
   */
  async connect(target) {
    try {
      // 채팅 서버 정보 조회
      const chatInfo = await this.fetchChatServerInfo(target.streamerId);

      if (!chatInfo) {
        console.warn(`[WSManager] No chat info for ${target.streamerId}`);
        return;
      }

      const connection = new SoopConnection({
        broadcastId: target.broadcastId,
        streamerId: target.streamerId,
        streamerNick: target.streamerNick,
        chatNo: chatInfo.chatNo,
        chatDomain: chatInfo.chatDomain,
        chatPort: chatInfo.chatPort,
        headers: this.defaultHeaders,
        pingInterval: this.options.pingInterval,
      });

      // 이벤트 연결
      connection.on("viewer-list", (data) => {
        this.emit("viewer-list", {
          broadcastId: target.broadcastId,
          streamerId: target.streamerId,
          viewers: data.viewers,
        });
      });

      connection.on("donation", (data) => {
        this.emit("donation", {
          ...data,
          broadcastId: target.broadcastId,
          receiverUserId: target.streamerId,
        });
      });

      connection.on("close", () => {
        this.connections.delete(target.broadcastId);
        this.processQueue();
      });

      connection.on("error", (err) => {
        console.warn(`[WSManager] Connection error ${target.broadcastId}:`, err.message);
      });

      // 연결 시작
      await connection.connect();

      this.connections.set(target.broadcastId, connection);

      console.log(`[WSManager] Connected: ${target.streamerId} (${target.broadcastId})`);
    } catch (err) {
      console.error(`[WSManager] Connect error ${target.broadcastId}:`, err.message);
    }
  }

  /**
   * 채팅 서버 정보 조회
   * @param {string} streamerId
   * @returns {Promise<Object|null>}
   */
  async fetchChatServerInfo(streamerId) {
    try {
      const response = await fetch(
        `https://live.sooplive.co.kr/afreeca/player_live_api.php?bjid=${streamerId}`,
        {
          method: "POST",
          headers: {
            ...this.defaultHeaders,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: `bid=${streamerId}&type=live&player_type=html5&stream_type=common&quality=original&mode=landing`,
        }
      );

      const data = await response.json();

      if (data.CHANNEL?.RESULT !== 1) {
        return null;
      }

      return {
        chatNo: data.CHANNEL.CHATNO,
        chatDomain: data.CHANNEL.CHDOMAIN,
        chatPort: parseInt(data.CHANNEL.CHPT, 10) || 8584,
      };
    } catch (err) {
      console.error(`[WSManager] Fetch chat info error:`, err.message);
      return null;
    }
  }

  /**
   * 대기 큐 처리
   */
  processQueue() {
    while (
      this.targetQueue.length > 0 &&
      this.connections.size < this.options.maxConnections
    ) {
      const target = this.targetQueue.shift();
      this.connect(target);
    }
  }

  /**
   * 모든 연결에서 시청자 목록 수집
   * @returns {Promise<Array>}
   */
  async collectAllViewerLists() {
    const results = [];

    for (const [broadcastId, connection] of this.connections) {
      try {
        const viewers = connection.getViewerList();
        results.push({
          broadcastId,
          streamerId: connection.streamerId,
          viewers,
        });
      } catch (err) {
        console.warn(`[WSManager] Get viewer list error ${broadcastId}:`, err.message);
      }
    }

    return results;
  }

  /**
   * 모든 연결 종료
   */
  async disconnectAll() {
    for (const [broadcastId, connection] of this.connections) {
      connection.close();
    }
    this.connections.clear();
    this.targetQueue = [];
    console.log("[WSManager] All connections closed");
  }

  /**
   * 연결 수 조회
   * @returns {number}
   */
  getConnectionCount() {
    return this.connections.size;
  }

  /**
   * 연결 상태 조회
   * @returns {Array}
   */
  getConnectionStatus() {
    const status = [];
    for (const [broadcastId, connection] of this.connections) {
      status.push({
        broadcastId,
        streamerId: connection.streamerId,
        streamerNick: connection.streamerNick,
        viewerCount: connection.getViewerList().length,
        connected: connection.isConnected(),
      });
    }
    return status;
  }

  /**
   * 모든 연결에서 채팅 통계 수집 및 리셋
   * @returns {Array} [{ broadcastId, streamerId, messageCount, uniqueChatters }]
   */
  collectAllChatStats() {
    const results = [];

    for (const [broadcastId, connection] of this.connections) {
      try {
        const chatStats = connection.getChatStatsAndReset();
        results.push({
          broadcastId,
          streamerId: connection.streamerId,
          ...chatStats,
        });
      } catch (err) {
        console.warn(`[WSManager] Get chat stats error ${broadcastId}:`, err.message);
      }
    }

    return results;
  }
}

/**
 * 개별 SOOP WebSocket 연결
 */
class SoopConnection extends EventEmitter {
  constructor(options) {
    super();

    this.broadcastId = options.broadcastId;
    this.streamerId = options.streamerId;
    this.streamerNick = options.streamerNick;
    this.chatNo = options.chatNo;
    this.chatDomain = options.chatDomain;
    this.chatPort = options.chatPort;
    this.headers = options.headers;
    this.pingInterval = options.pingInterval || 60000;

    this.ws = null;
    this.pingTimer = null;
    this.viewers = new Map(); // userId -> { nickname, isFan, isSub }

    // 채팅 통계 (5분 단위 리셋)
    this.chatStats = {
      messageCount: 0,
      chatters: new Set(),
      lastReset: Date.now(),
    };
  }

  /**
   * WebSocket 연결
   */
  connect() {
    return new Promise((resolve, reject) => {
      const wsUrl = `wss://${this.chatDomain}:${this.chatPort + 1}/Websocket/${this.streamerId}`;

      this.ws = new WebSocket(wsUrl, ["chat"], {
        headers: this.headers,
      });

      this.ws.on("open", () => {
        this.sendConnect();
        this.startPing();
        resolve();
      });

      this.ws.on("message", (data) => {
        this.handleMessage(data);
      });

      this.ws.on("close", () => {
        this.stopPing();
        this.emit("close");
      });

      this.ws.on("error", (err) => {
        this.emit("error", err);
        reject(err);
      });

      // 타임아웃
      setTimeout(() => {
        if (this.ws.readyState !== WebSocket.OPEN) {
          reject(new Error("Connection timeout"));
        }
      }, 10000);
    });
  }

  /**
   * 연결 패킷 전송
   */
  sendConnect() {
    const SEPARATOR = "\x0c";
    const PREFIX = "\x1b\t";
    const packet = `${PREFIX}000100000600${SEPARATOR}${SEPARATOR}${SEPARATOR}16${SEPARATOR}`;

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(packet);
      setTimeout(() => this.sendJoin(), 500);
    }
  }

  /**
   * 채팅방 입장 패킷 전송
   */
  sendJoin() {
    const SEPARATOR = "\x0c";
    const PREFIX = "\x1b\t";
    const chatNo = this.chatNo.toString();
    const byteSize = (Buffer.byteLength(chatNo, "utf-8") + 6).toString().padStart(6, "0");

    const packet = `${PREFIX}0002${byteSize}00${SEPARATOR}${chatNo}${SEPARATOR}${SEPARATOR}${SEPARATOR}${SEPARATOR}${SEPARATOR}`;

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(packet);
    }
  }

  /**
   * Ping 전송
   */
  sendPong() {
    const SEPARATOR = "\x0c";
    const PREFIX = "\x1b\t";
    const packet = `${PREFIX}000000000100${SEPARATOR}`;

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(packet);
    }
  }

  /**
   * Ping 타이머 시작
   */
  startPing() {
    this.pingTimer = setInterval(() => this.sendPong(), this.pingInterval);
  }

  /**
   * Ping 타이머 정지
   */
  stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  /**
   * 메시지 처리
   * @param {Buffer} rawData
   */
  handleMessage(rawData) {
    const SEPARATOR = "\x0c";
    const data = rawData.toString();
    const parts = data.split(SEPARATOR);

    if (parts.length < 2) return;

    const header = parts[0];
    let actionCode = null;
    const codeStart = header.indexOf("\x1b\t");

    if (codeStart !== -1 && header.length >= codeStart + 6) {
      actionCode = header.substring(codeStart + 2, codeStart + 6);
    }

    // 유저 목록 (0004)
    if (actionCode === CHAT_ACTIONS.USER_LIST) {
      this.processUserList(parts);
      return;
    }

    // 유저 입장 (0012)
    if (actionCode === CHAT_ACTIONS.USER_JOIN) {
      this.processUserJoin(parts);
      return;
    }

    // 채팅 메시지 (0005)
    if (actionCode === CHAT_ACTIONS.CHAT) {
      this.processChat(parts);
      return;
    }

    // 별풍선 (0018)
    if (actionCode === CHAT_ACTIONS.TEXT_DONATION) {
      this.processDonation(parts, "balloon");
      return;
    }

    // 애드벌룬 (0087)
    if (actionCode === CHAT_ACTIONS.AD_BALLOON) {
      this.processAdBalloon(parts);
      return;
    }

    // 영상풍선 (0105)
    if (actionCode === CHAT_ACTIONS.VIDEO_DONATION) {
      this.processDonation(parts, "video_balloon");
      return;
    }

    // 구독 (0093)
    if (actionCode === CHAT_ACTIONS.SUBSCRIBE) {
      this.processSubscribe(parts);
      return;
    }
  }

  /**
   * 유저 목록 처리
   * @param {Array} parts
   */
  processUserList(parts) {
    for (let i = 2; i < parts.length - 2; i += 3) {
      const rawId = parts[i] || "";
      const nickname = parts[i + 1] || "";
      const flags = parts[i + 2] || "";
      const userId = rawId.replace(/\(\d+\)$/, "");

      if (userId && nickname) {
        const flag1 = parseInt(flags.split("|")[0], 10) || 0;
        const flag2 = parseInt(flags.split("|")[1], 10) || 0;
        const isSub = (flag1 & 0x10000000) > 0;
        const isFan = (flag1 & 0x20000000) > 0 || (flag2 & 0x40000) > 0;

        this.viewers.set(userId, { nickname, isFan, isSub });
      }
    }

    this.emit("viewer-list", { viewers: this.getViewerList() });
  }

  /**
   * 유저 입장 처리
   * @param {Array} parts
   */
  processUserJoin(parts) {
    const rawId = parts[2] || "";
    const nickname = parts[3] || "";
    const flags = parts[4] || "";
    const userId = rawId.replace(/\(\d+\)$/, "");

    if (userId && nickname) {
      const flag1 = parseInt(flags.split("|")[0], 10) || 0;
      const flag2 = parseInt(flags.split("|")[1], 10) || 0;
      const isSub = (flag1 & 0x10000000) > 0;
      const isFan = (flag1 & 0x20000000) > 0 || (flag2 & 0x40000) > 0;

      this.viewers.set(userId, { nickname, isFan, isSub });
    }
  }

  /**
   * 채팅 메시지 처리 (0005)
   * @param {Array} parts
   */
  processChat(parts) {
    const userId = parts[2] || "";
    const nickname = parts[3] || "";
    const message = parts[1] || "";

    if (userId) {
      // 채팅 통계 업데이트
      this.chatStats.messageCount++;
      this.chatStats.chatters.add(userId);

      // 채팅 이벤트 emit
      this.emit("chat", {
        userId,
        nickname,
        messageLength: message.length,
      });
    }
  }

  /**
   * 채팅 통계 조회 및 리셋
   * @returns {Object} { messageCount, uniqueChatters }
   */
  getChatStatsAndReset() {
    const stats = {
      messageCount: this.chatStats.messageCount,
      uniqueChatters: this.chatStats.chatters.size,
    };

    // 리셋
    this.chatStats.messageCount = 0;
    this.chatStats.chatters.clear();
    this.chatStats.lastReset = Date.now();

    return stats;
  }

  /**
   * 후원 처리
   * @param {Array} parts
   * @param {string} type
   */
  processDonation(parts, type) {
    const message = parts[1] || "";
    const userId = parts[2] || "";
    const nickname = parts[3] || "";
    const count = parseInt(parts[4], 10) || 0;

    // 별풍선 1개 = 100원
    const amountKrw = type === "balloon" ? count * 100 : count * 100;

    this.emit("donation", {
      donationType: type,
      senderUserId: userId,
      senderNickname: nickname,
      count,
      amountKrw,
      message,
    });
  }

  /**
   * 애드벌룬 처리 (0087)
   * @param {Array} parts
   */
  processAdBalloon(parts) {
    // 애드벌룬은 parts 구조가 다를 수 있음
    // console.log("[DEBUG] AD_BALLOON parts:", parts.slice(0, 15));

    const message = parts[1] || "";
    const userId = parts[2] || "";
    const nickname = parts[3] || "";
    // parts[4]가 count가 아닐 수 있음 - 여러 위치 확인
    let count = parseInt(parts[4], 10) || 0;

    // parts[4]가 0이면 다른 위치 확인
    if (count === 0) {
      for (let i = 5; i < Math.min(parts.length, 10); i++) {
        const num = parseInt(parts[i], 10);
        if (num > 0 && num < 100000) {
          count = num;
          break;
        }
      }
    }

    const amountKrw = count * 100;

    this.emit("donation", {
      donationType: "ad_balloon",
      senderUserId: userId,
      senderNickname: nickname,
      count,
      amountKrw,
      message,
    });
  }

  /**
   * 구독 처리
   * @param {Array} parts
   */
  processSubscribe(parts) {
    const userId = parts[1] || "";
    const nickname = parts[2] || "";
    const months = parseInt(parts[3], 10) || 1;

    this.emit("donation", {
      donationType: "subscribe",
      senderUserId: userId,
      senderNickname: nickname,
      count: 1,
      amountKrw: 0, // 구독 금액은 별도
      subscriptionMonths: months,
      message: null,
    });
  }

  /**
   * 시청자 목록 조회
   * @returns {Array}
   */
  getViewerList() {
    const list = [];
    for (const [userId, data] of this.viewers) {
      list.push({
        userId,
        nickname: data.nickname,
        isFan: data.isFan,
        isSub: data.isSub,
      });
    }
    return list;
  }

  /**
   * 연결 상태 확인
   * @returns {boolean}
   */
  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * 연결 종료
   */
  close() {
    this.stopPing();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.viewers.clear();
  }
}

module.exports = WebSocketManager;
