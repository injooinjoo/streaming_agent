/**
 * Live Discovery Service
 *
 * SOOP과 Chzzk의 모든 라이브 방송을 주기적으로 발견하고,
 * 상위 N개 채널에 자동으로 WebSocket 연결하여 채팅/후원 데이터를 수집합니다.
 *
 * SQLite-only 버전 (Snowflake 제거)
 */

const { logger } = require("./logger");

class LiveDiscoveryService {
  constructor(options = {}) {
    // Configuration
    this.maxConnectionsPerPlatform = options.maxConnectionsPerPlatform || 500;
    this.discoveryInterval = options.discoveryInterval || 5 * 60 * 1000; // 5분
    this.connectionBatchSize = options.connectionBatchSize || 50;
    this.connectionDelay = options.connectionDelay || 500;

    // State
    this.isRunning = false;
    this.discoveryTimer = null;
    this.activeConnections = new Map();
    this.pendingConnections = new Set();
    this.lastDiscovery = null;
    this.stats = {
      totalDiscovered: { soop: 0, chzzk: 0 },
      activeConnections: { soop: 0, chzzk: 0 },
      totalEvents: { soop: 0, chzzk: 0 },
      lastError: null,
    };

    // Dependencies
    this.io = null;
    this.SoopAdapter = null;
    this.ChzzkAdapter = null;
    this.normalizer = null;
    this.db = null;
  }

  setDependencies({ io, SoopAdapter, ChzzkAdapter, normalizer, db }) {
    this.io = io;
    this.SoopAdapter = SoopAdapter;
    this.ChzzkAdapter = ChzzkAdapter;
    this.normalizer = normalizer;
    this.db = db;
  }

  async start() {
    if (this.isRunning) {
      logger.warn("[discovery] Service already running");
      return;
    }

    if (!this.SoopAdapter || !this.ChzzkAdapter) {
      throw new Error("Dependencies not set. Call setDependencies first.");
    }

    this.isRunning = true;
    logger.info("[discovery] Starting Live Discovery Service", {
      maxConnectionsPerPlatform: this.maxConnectionsPerPlatform,
      totalMaxConnections: this.maxConnectionsPerPlatform * 2,
      discoveryInterval: this.discoveryInterval / 1000 + "s",
    });

    try {
      await this.discover();
    } catch (err) {
      logger.error("[discovery] First discover failed:", { error: err.message });
      throw err;
    }

    this.discoveryTimer = setInterval(() => {
      this.discover().catch((err) => {
        logger.error("[discovery] Discovery error:", err.message);
        this.stats.lastError = err.message;
      });
    }, this.discoveryInterval);

    return this.getStatus();
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    logger.info("[discovery] Stopping Live Discovery Service");

    if (this.discoveryTimer) {
      clearInterval(this.discoveryTimer);
      this.discoveryTimer = null;
    }

    for (const [key, conn] of this.activeConnections) {
      try {
        conn.adapter.disconnect();
      } catch (err) {
        logger.warn(`[discovery] Error disconnecting ${key}:`, err.message);
      }
    }
    this.activeConnections.clear();
    this.pendingConnections.clear();

    this.isRunning = false;
    this.stats.activeConnections = { soop: 0, chzzk: 0 };

    logger.info("[discovery] Service stopped");
    return this.getStatus();
  }

  async discover() {
    const startTime = Date.now();
    logger.info("[discovery] Starting broadcast discovery...");

    try {
      const [soopBroadcasts, chzzkBroadcasts] = await Promise.all([
        this.SoopAdapter.getAllLiveBroadcasts(1000),
        this.ChzzkAdapter.getAllLiveBroadcasts(1000),
      ]);

      this.stats.totalDiscovered.soop = soopBroadcasts.length;
      this.stats.totalDiscovered.chzzk = chzzkBroadcasts.length;

      logger.info("[discovery] Discovered broadcasts", {
        soop: soopBroadcasts.length,
        chzzk: chzzkBroadcasts.length,
      });

      const deduplicateAndSelectTop = (broadcasts, limit) => {
        const seenChannels = new Set();
        const unique = broadcasts.filter((b) => {
          if (seenChannels.has(b.channelId)) {
            return false;
          }
          seenChannels.add(b.channelId);
          return true;
        });
        unique.sort((a, b) => b.viewerCount - a.viewerCount);
        return unique.slice(0, limit);
      };

      const topSoop = deduplicateAndSelectTop(soopBroadcasts, this.maxConnectionsPerPlatform);
      const topChzzk = deduplicateAndSelectTop(chzzkBroadcasts, this.maxConnectionsPerPlatform);

      logger.info(`[discovery] Top channels selected`, {
        soop: `${topSoop.length}/${soopBroadcasts.length}`,
        chzzk: `${topChzzk.length}/${chzzkBroadcasts.length}`,
        total: topSoop.length + topChzzk.length,
      });

      const topChannels = [...topSoop, ...topChzzk];
      await this.manageConnections(topChannels);

      this.lastDiscovery = new Date().toISOString();
      const duration = Date.now() - startTime;
      logger.info("[discovery] Discovery completed", {
        duration: duration + "ms",
        activeConnections: this.activeConnections.size,
      });

    } catch (error) {
      logger.error("[discovery] Discovery failed:", error.message);
      this.stats.lastError = error.message;
      throw error;
    }
  }

  async manageConnections(topChannels) {
    const topChannelKeys = new Set(
      topChannels.map((ch) => `${ch.platform}:${ch.channelId}`)
    );

    for (const [key, conn] of this.activeConnections) {
      if (!topChannelKeys.has(key)) {
        logger.info(`[discovery] Disconnecting ${key} (no longer in top channels)`);
        try {
          conn.adapter.disconnect();
        } catch (err) {
          // ignore
        }
        this.activeConnections.delete(key);
        this.updateConnectionStats();
      }
    }

    const channelsToConnect = topChannels.filter((ch) => {
      const key = `${ch.platform}:${ch.channelId}`;
      return !this.activeConnections.has(key) && !this.pendingConnections.has(key);
    });

    logger.info(`[discovery] Channels to connect: ${channelsToConnect.length}`);

    for (let i = 0; i < channelsToConnect.length; i += this.connectionBatchSize) {
      const batch = channelsToConnect.slice(i, i + this.connectionBatchSize);

      try {
        await Promise.all(
          batch.map((channel) => this.connectToChannel(channel))
        );
      } catch (batchError) {
        logger.error(`[discovery] Batch failed:`, batchError.message);
      }

      if (i + this.connectionBatchSize < channelsToConnect.length) {
        await new Promise((resolve) => setTimeout(resolve, this.connectionDelay));
      }
    }
  }

  async connectToChannel(channel) {
    const key = `${channel.platform}:${channel.channelId}`;

    if (this.activeConnections.has(key) || this.pendingConnections.has(key)) {
      return;
    }

    this.pendingConnections.add(key);

    try {
      let adapter;

      const adapterOptions = {
        channelId: channel.channelId,
        maxReconnectAttempts: 0,
      };

      if (channel.platform === "soop") {
        adapter = new this.SoopAdapter(adapterOptions);
      } else if (channel.platform === "chzzk") {
        adapter = new this.ChzzkAdapter(adapterOptions);
      } else {
        throw new Error(`Unknown platform: ${channel.platform}`);
      }

      adapter.on("event", (event) => this.handleEvent(channel.platform, channel.channelId, event));
      adapter.on("error", (error) => this.handleError(key, error));
      adapter.on("disconnect", () => this.handleDisconnect(key));

      await adapter.connect();

      this.activeConnections.set(key, {
        adapter,
        platform: channel.platform,
        channelId: channel.channelId,
        viewerCount: channel.viewerCount,
        nickname: channel.nickname,
        connectedAt: new Date().toISOString(),
      });

      this.updateConnectionStats();
      logger.info(`[discovery] Connected to ${channel.platform}:${channel.channelId} (${channel.nickname}, ${channel.viewerCount} viewers)`);

    } catch (error) {
      logger.warn(`[discovery] Failed to connect to ${key}:`, error.message);
    } finally {
      this.pendingConnections.delete(key);
    }
  }

  handleEvent(platform, channelId, event) {
    // Save to SQLite (canonical schema)
    if (this.db && event.type) {
      this.db.run(
        `INSERT INTO events (id, event_type, platform, actor_nickname, actor_person_id, target_channel_id, message, amount, event_timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          event.id || require("uuid").v4(),
          event.type,
          platform,
          event.sender?.nickname || "unknown",
          null, // actor_person_id
          channelId,
          event.content?.message || "",
          event.content?.amount || 0,
          event.metadata?.timestamp || new Date().toISOString(),
        ]
      );
    }

    // Stats
    if (this.stats.totalEvents[platform] !== undefined) {
      this.stats.totalEvents[platform]++;
    }

    // Broadcast to Socket.io
    if (this.io && this.normalizer) {
      const legacyEvent = this.normalizer.toEventsFormat(event);
      this.io.emit("discovery-event", legacyEvent);
    }
  }

  handleError(key, error) {
    logger.warn(`[discovery] Connection error for ${key}:`, error.message);
  }

  handleDisconnect(key) {
    logger.info(`[discovery] Disconnected: ${key}`);
    this.activeConnections.delete(key);
    this.updateConnectionStats();
  }

  updateConnectionStats() {
    let soop = 0;
    let chzzk = 0;

    for (const conn of this.activeConnections.values()) {
      if (conn.platform === "soop") soop++;
      else if (conn.platform === "chzzk") chzzk++;
    }

    this.stats.activeConnections = { soop, chzzk };
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      maxConnectionsPerPlatform: this.maxConnectionsPerPlatform,
      totalMaxConnections: this.maxConnectionsPerPlatform * 2,
      discoveryInterval: this.discoveryInterval,
      lastDiscovery: this.lastDiscovery,
      stats: {
        ...this.stats,
        totalActiveConnections: this.activeConnections.size,
        pendingConnections: this.pendingConnections.size,
      },
      topConnections: Array.from(this.activeConnections.values())
        .sort((a, b) => b.viewerCount - a.viewerCount)
        .slice(0, 20)
        .map((c) => ({
          platform: c.platform,
          channelId: c.channelId,
          nickname: c.nickname,
          viewerCount: c.viewerCount,
          connectedAt: c.connectedAt,
        })),
    };
  }

  updateConfig(config) {
    if (config.maxConnectionsPerPlatform !== undefined) {
      this.maxConnectionsPerPlatform = config.maxConnectionsPerPlatform;
    }
    if (config.maxConnections !== undefined) {
      this.maxConnectionsPerPlatform = config.maxConnections;
    }
    if (config.discoveryInterval !== undefined) {
      this.discoveryInterval = config.discoveryInterval;

      if (this.isRunning && this.discoveryTimer) {
        clearInterval(this.discoveryTimer);
        this.discoveryTimer = setInterval(() => {
          this.discover().catch((err) => {
            logger.error("[discovery] Discovery error:", err.message);
          });
        }, this.discoveryInterval);
      }
    }

    return this.getStatus();
  }
}

let discoveryInstance = null;

const getDiscoveryService = () => {
  if (!discoveryInstance) {
    discoveryInstance = new LiveDiscoveryService();
  }
  return discoveryInstance;
};

const initDiscoveryService = (options = {}) => {
  discoveryInstance = new LiveDiscoveryService(options);
  return discoveryInstance;
};

module.exports = {
  LiveDiscoveryService,
  getDiscoveryService,
  initDiscoveryService,
};
