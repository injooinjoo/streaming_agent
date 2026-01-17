/**
 * Chzzk WebSocket Manager
 *
 * 다중 치지직 채팅방 WebSocket 연결 관리
 * - 확장 가능한 연결 풀
 * - 후원 이벤트 수집
 * - 채팅 통계 수집
 */

const EventEmitter = require("events");
const WebSocket = require("ws");

// 치지직 메시지 타입 코드
const MESSAGE_TYPES = {
  PING: 0,
  PONG: 10000,
  CONNECT: 100,
  CONNECTED: 10100,
  RECENT_CHAT: 15101,
  CHAT: 93101,
  DONATION: 93102,
  SUBSCRIPTION: 93103,
};

class ChzzkWebSocketManager extends EventEmitter {
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
      pingInterval: 20000,
      ...options,
    };

    // 연결 풀: channelId -> ChzzkConnection
    this.connections = new Map();

    // 연결 대상 큐
    this.targetQueue = [];

    this.defaultHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    };
  }

  /**
   * 연결 대상 업데이트
   * @param {Array} targets - 연결할 방송 목록
   */
  async updateTargets(targets) {
    const targetIds = new Set(targets.map((t) => t.channelId));

    // 1. 더 이상 대상이 아닌 연결 종료
    for (const [channelId, connection] of this.connections) {
      if (!targetIds.has(channelId)) {
        console.log(`[ChzzkWSManager] Disconnecting: ${channelId}`);
        connection.close();
        this.connections.delete(channelId);
      }
    }

    // 2. 새로운 대상 연결
    for (const target of targets) {
      if (!this.connections.has(target.channelId)) {
        if (this.connections.size < this.options.maxConnections) {
          await this.connect(target);
        } else {
          // 큐에 추가
          this.targetQueue.push(target);
        }
      }
    }

    console.log(`[ChzzkWSManager] Active connections: ${this.connections.size}/${this.options.maxConnections}`);
  }

  /**
   * 방송에 WebSocket 연결
   * @param {Object} target
   */
  async connect(target) {
    try {
      // 채팅 서버 정보 조회
      const liveDetail = await this.fetchLiveDetail(target.channelId);

      if (!liveDetail || !liveDetail.chatChannelId) {
        console.warn(`[ChzzkWSManager] No chat info for ${target.channelId}`);
        return;
      }

      const connection = new ChzzkConnection({
        channelId: target.channelId,
        channelName: target.channelName,
        chatChannelId: liveDetail.chatChannelId,
        headers: this.defaultHeaders,
        pingInterval: this.options.pingInterval,
      });

      // 이벤트 연결
      connection.on("donation", (data) => {
        this.emit("donation", {
          ...data,
          channelId: target.channelId,
          receiverChannelId: target.channelId,
        });
      });

      connection.on("chat-stats", (data) => {
        this.emit("chat-stats", {
          channelId: target.channelId,
          ...data,
        });
      });

      connection.on("close", () => {
        this.connections.delete(target.channelId);
        this.processQueue();
      });

      connection.on("error", (err) => {
        console.warn(`[ChzzkWSManager] Connection error ${target.channelId}:`, err.message);
      });

      // 연결 시작
      await connection.connect();

      this.connections.set(target.channelId, connection);

      console.log(`[ChzzkWSManager] Connected: ${target.channelName} (${target.channelId})`);
    } catch (err) {
      console.error(`[ChzzkWSManager] Connect error ${target.channelId}:`, err.message);
    }
  }

  /**
   * 라이브 상세 정보 조회
   * @param {string} channelId
   * @returns {Promise<Object|null>}
   */
  async fetchLiveDetail(channelId) {
    try {
      const response = await fetch(
        `https://api.chzzk.naver.com/service/v3/channels/${channelId}/live-detail`,
        { headers: this.defaultHeaders }
      );

      const data = await response.json();

      if (data.code !== 200 || !data.content) {
        return null;
      }

      return data.content;
    } catch (err) {
      console.error(`[ChzzkWSManager] Fetch live detail error:`, err.message);
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
   * 모든 연결에서 채팅 통계 수집 및 리셋
   * @returns {Array}
   */
  collectAllChatStats() {
    const results = [];

    for (const [channelId, connection] of this.connections) {
      try {
        const chatStats = connection.getChatStatsAndReset();
        results.push({
          channelId,
          channelName: connection.channelName,
          ...chatStats,
        });
      } catch (err) {
        console.warn(`[ChzzkWSManager] Get chat stats error ${channelId}:`, err.message);
      }
    }

    return results;
  }

  /**
   * 모든 연결 종료
   */
  async disconnectAll() {
    for (const [channelId, connection] of this.connections) {
      connection.close();
    }
    this.connections.clear();
    this.targetQueue = [];
    console.log("[ChzzkWSManager] All connections closed");
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
    for (const [channelId, connection] of this.connections) {
      status.push({
        channelId,
        channelName: connection.channelName,
        connected: connection.isConnected(),
      });
    }
    return status;
  }
}

/**
 * 개별 Chzzk WebSocket 연결
 */
class ChzzkConnection extends EventEmitter {
  constructor(options) {
    super();

    this.channelId = options.channelId;
    this.channelName = options.channelName;
    this.chatChannelId = options.chatChannelId;
    this.headers = options.headers;
    this.pingInterval = options.pingInterval || 20000;

    this.ws = null;
    this.pingTimer = null;

    // 채팅 통계
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
      // 서버 선택 (랜덤)
      const serverNumber = Math.floor(Math.random() * 5) + 1;
      const wsUrl = `wss://kr-ss${serverNumber}.chat.naver.com/chat`;

      this.ws = new WebSocket(wsUrl);

      this.ws.on("open", () => {
        this.sendConnect();
        this.startPing();
      });

      this.ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);

          // 연결 완료 시 resolve
          if (message.cmd === MESSAGE_TYPES.CONNECTED) {
            resolve();
          }
        } catch (error) {
          // 파싱 에러 무시
        }
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
   * 연결 메시지 전송
   */
  sendConnect() {
    const connectMessage = {
      ver: "3",
      cmd: MESSAGE_TYPES.CONNECT,
      svcid: "game",
      cid: this.chatChannelId,
      bdy: {
        uid: null,
        devType: 2001,
        accTkn: null,
        auth: "READ",
      },
      tid: 1,
    };

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(connectMessage));
    }
  }

  /**
   * 메시지 처리
   * @param {Object} message
   */
  handleMessage(message) {
    const cmd = message.cmd;

    switch (cmd) {
      case MESSAGE_TYPES.PING:
        this.sendPong();
        break;

      case MESSAGE_TYPES.CHAT:
      case MESSAGE_TYPES.RECENT_CHAT:
        this.processChat(message.bdy);
        break;

      case MESSAGE_TYPES.DONATION:
        this.processDonation(message.bdy);
        break;

      case MESSAGE_TYPES.SUBSCRIPTION:
        this.processSubscription(message.bdy);
        break;
    }
  }

  /**
   * PONG 전송
   */
  sendPong() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ ver: "3", cmd: MESSAGE_TYPES.PONG }));
    }
  }

  /**
   * Ping 타이머 시작
   */
  startPing() {
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ ver: "3", cmd: MESSAGE_TYPES.PONG }));
      }
    }, this.pingInterval);
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
   * 채팅 메시지 처리
   * @param {Array|Object} messages
   */
  processChat(messages) {
    if (!Array.isArray(messages)) {
      messages = [messages];
    }

    for (const msg of messages) {
      try {
        const profile = msg.profile ? JSON.parse(msg.profile) : {};
        const userId = profile.userIdHash || "unknown";

        // 채팅 통계 업데이트
        this.chatStats.messageCount++;
        this.chatStats.chatters.add(userId);
      } catch (error) {
        // 파싱 에러 무시
      }
    }
  }

  /**
   * 후원 처리
   * @param {Array|Object} messages
   */
  processDonation(messages) {
    if (!Array.isArray(messages)) {
      messages = [messages];
    }

    for (const msg of messages) {
      try {
        const profile = msg.profile ? JSON.parse(msg.profile) : {};
        const extras = msg.extras ? JSON.parse(msg.extras) : {};

        const donation = {
          donationType: "cheese",
          senderUserId: profile.userIdHash || extras.donorId || "unknown",
          senderNickname: extras.nickname || profile.nickname || "익명",
          amountKrw: extras.payAmount || 0,
          message: extras.msg || msg.msg || "",
        };

        this.emit("donation", donation);
      } catch (error) {
        console.error(`[ChzzkConnection] Donation processing error:`, error.message);
      }
    }
  }

  /**
   * 구독 처리
   * @param {Array|Object} messages
   */
  processSubscription(messages) {
    if (!Array.isArray(messages)) {
      messages = [messages];
    }

    for (const msg of messages) {
      try {
        const profile = msg.profile ? JSON.parse(msg.profile) : {};
        const extras = msg.extras ? JSON.parse(msg.extras) : {};

        const subscription = {
          donationType: "subscribe",
          senderUserId: profile.userIdHash || "unknown",
          senderNickname: profile.nickname || "익명",
          amountKrw: 0,
          subscriptionMonths: extras.month || 1,
          message: extras.msg || msg.msg || "",
        };

        this.emit("donation", subscription);
      } catch (error) {
        console.error(`[ChzzkConnection] Subscription processing error:`, error.message);
      }
    }
  }

  /**
   * 채팅 통계 조회 및 리셋
   * @returns {Object}
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
  }
}

module.exports = ChzzkWebSocketManager;
