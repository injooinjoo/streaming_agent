/**
 * Platform Routes
 * Chzzk and SOOP platform connection management
 *
 * Snowflake-only data storage (no SQLite dependency)
 *
 * Collects:
 * - Events (chat, donation, subscribe, viewer-update)
 * - Broadcast info (title, category, viewer count) - continuously polled
 * - Streamer info (nickname, profile)
 * - Categories (from both platforms)
 */

const express = require("express");
const { getSnowflakeService } = require("../services/snowflakeService");
const { getDiscoveryService } = require("../services/liveDiscoveryService");

// Broadcast polling intervals (per connection)
const broadcastPollingIntervals = new Map();
// Broadcaster person IDs (per connection) for polling
const broadcasterPersonIds = new Map();

/**
 * Helper: Save broadcaster to Snowflake PERSONS table
 * Returns the person ID for use in BROADCASTS
 */
async function saveBroadcasterToSnowflake(platform, channelId, streamerInfo) {
  const snowflake = getSnowflakeService();

  // Ensure Snowflake is connected
  if (!snowflake.isConnected && snowflake.isConfigured()) {
    try {
      await snowflake.connect();
    } catch (err) {
      console.error(`[snowflake] Connect failed for broadcaster save:`, err.message);
      return null;
    }
  }

  const person = {
    platform,
    platformUserId: streamerInfo.streamerId || streamerInfo.bjId || channelId,
    nickname: streamerInfo.nickname || streamerInfo.bjNickname || null,
    profileImageUrl: streamerInfo.profileImageUrl || null,
    // Broadcaster-specific fields
    channelId: channelId,
    channelDescription: streamerInfo.description || null,
    followerCount: streamerInfo.followerCount || null,
    subscriberCount: streamerInfo.subscriberCount || null,
  };

  return await snowflake.upsertPerson(person);
}

/**
 * Helper: Save broadcast info to Snowflake
 */
async function saveBroadcastToSnowflake(platform, channelId, broadcastInfo, broadcasterPersonId = null) {
  const snowflake = getSnowflakeService();

  // Ensure Snowflake is connected
  if (!snowflake.isConnected && snowflake.isConfigured()) {
    try {
      await snowflake.connect();
    } catch (err) {
      console.error(`[snowflake] Connect failed for broadcast save:`, err.message);
      return;
    }
  }

  const broadcast = {
    platform,
    channelId,
    broadcastId: broadcastInfo.broadcastId || broadcastInfo.broadNo || null,
    broadcasterPersonId,
    title: broadcastInfo.title || null,
    categoryId: broadcastInfo.categoryId || broadcastInfo.category || null,
    categoryName: broadcastInfo.categoryName || broadcastInfo.categoryValue || null,
    thumbnailUrl: broadcastInfo.thumbnailUrl || broadcastInfo.thumbnail || null,
    viewerCount: broadcastInfo.viewerCount || broadcastInfo.viewers || 0,
    isLive: true,
    startedAt: broadcastInfo.startedAt || null,
  };

  await snowflake.addBroadcast(broadcast);
}

/**
 * Helper: Process event actor (chat user/donor)
 * Updates PERSONS and VIEWER_ENGAGEMENT tables
 */
async function processEventActor(platform, channelId, event, broadcasterPersonId = null) {
  const snowflake = getSnowflakeService();

  if (!event.sender?.id) return null;

  // Ensure Snowflake is connected
  if (!snowflake.isConnected && snowflake.isConfigured()) {
    try {
      await snowflake.connect();
    } catch (err) {
      console.error(`[snowflake] Connect failed for actor processing:`, err.message);
      return null;
    }
  }

  // 1. Upsert actor as PERSON (without channelId - not a broadcaster context)
  const actorPerson = {
    platform,
    platformUserId: event.sender.id,
    nickname: event.sender.nickname || null,
    profileImageUrl: event.sender.profileImage || null,
    // No channelId - this is viewer context
  };

  const actorPersonId = await snowflake.upsertPerson(actorPerson);

  // 2. Update actor's stats in PERSONS (total counts)
  const isDonation = event.type === "donation";
  const amount = isDonation ? (event.content?.amount || 0) : 0;

  await snowflake.updatePersonStats(actorPersonId, {
    chatIncrement: event.type === "chat" ? 1 : 0,
    donationIncrement: isDonation ? 1 : 0,
    amountIncrement: amount,
  });

  // 3. Update VIEWER_ENGAGEMENT (per-channel stats)
  await snowflake.upsertViewerEngagement({
    personId: actorPersonId,
    platform,
    channelId,
    broadcasterPersonId,
    chatIncrement: event.type === "chat" ? 1 : 0,
    donationIncrement: isDonation ? 1 : 0,
    amountIncrement: amount,
  });

  return actorPersonId;
}

/**
 * Create platforms router
 * @param {Server} io - Socket.io server instance
 * @param {Map} activeAdapters - Active platform adapters map
 * @param {Function} ChzzkAdapter - Chzzk adapter class
 * @param {Function} SoopAdapter - SOOP adapter class
 * @param {Object} normalizer - Event normalizer
 * @returns {express.Router}
 *
 * NOTE: SQLite dependency removed - all data goes to Snowflake only
 */
const createPlatformsRouter = (io, activeAdapters, ChzzkAdapter, SoopAdapter, normalizer) => {
  const router = express.Router();

  // Broadcast polling interval (60 seconds)
  const BROADCAST_POLL_INTERVAL = 60000;

  /**
   * Start continuous broadcast polling for a connection
   */
  function startBroadcastPolling(adapterKey, platform, channelId, adapter, broadcasterPersonId = null) {
    // Stop existing polling if any
    stopBroadcastPolling(adapterKey);

    // Store broadcaster person ID for this connection
    if (broadcasterPersonId) {
      broadcasterPersonIds.set(adapterKey, broadcasterPersonId);
    }

    const pollFn = async () => {
      try {
        if (!adapter.isConnected) {
          stopBroadcastPolling(adapterKey);
          return;
        }

        const personId = broadcasterPersonIds.get(adapterKey);

        if (platform === "chzzk") {
          const liveDetail = await adapter.getLiveDetail();
          if (liveDetail) {
            await saveBroadcastToSnowflake("chzzk", channelId, {
              broadcastId: liveDetail.liveId,
              title: liveDetail.liveTitle,
              categoryId: liveDetail.liveCategory,
              categoryName: liveDetail.liveCategoryValue,
              thumbnailUrl: liveDetail.liveImageUrl,
              viewerCount: liveDetail.concurrentUserCount,
              startedAt: liveDetail.openDate,
            }, personId);
          }
        } else if (platform === "soop") {
          const broadcastStatus = await adapter.getBroadcastStatus();
          if (broadcastStatus) {
            await saveBroadcastToSnowflake("soop", channelId, {
              broadcastId: broadcastStatus.broadNo,
              title: broadcastStatus.title,
              categoryId: broadcastStatus.category,
              categoryName: broadcastStatus.category,
              thumbnailUrl: broadcastStatus.thumbnail,
              viewerCount: broadcastStatus.viewers,
            }, personId);
          }
        }
      } catch (err) {
        console.error(`[${platform}] Broadcast polling error:`, err.message);
      }
    };

    // Start polling
    const intervalId = setInterval(pollFn, BROADCAST_POLL_INTERVAL);
    broadcastPollingIntervals.set(adapterKey, intervalId);
    console.log(`[${platform}] Started broadcast polling for ${channelId}`);
  }

  /**
   * Stop broadcast polling for a connection
   */
  function stopBroadcastPolling(adapterKey) {
    const intervalId = broadcastPollingIntervals.get(adapterKey);
    if (intervalId) {
      clearInterval(intervalId);
      broadcastPollingIntervals.delete(adapterKey);
    }
    // Clean up broadcaster person ID
    broadcasterPersonIds.delete(adapterKey);
  }

  // ===== Events API (Snowflake-only) =====

  /**
   * POST /api/events
   * Create new event (saves to Snowflake only)
   */
  router.post("/events", (req, res) => {
    const event = {
      id: require("uuid").v4(),
      type: req.body.type || "chat",
      platform: req.body.platform || "manual",
      sender: {
        id: "manual",
        nickname: req.body.sender || "Anonymous",
      },
      content: {
        message: req.body.message || "",
        amount: req.body.amount || 0,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        channelId: req.body.channelId || "manual",
      },
    };

    const overlayHash = req.body.overlayHash;

    // Save to Snowflake
    const snowflake = getSnowflakeService();
    snowflake.addEvent(event);

    // Emit to overlays
    const legacyEvent = normalizer.toEventsFormat(event);
    if (overlayHash) {
      io.to(`overlay:${overlayHash}`).emit("new-event", legacyEvent);
    } else {
      io.emit("new-event", legacyEvent);
    }

    res.json({ success: true, event: legacyEvent });
  });

  /**
   * GET /api/events
   * Get historical events from Snowflake
   */
  router.get("/events", async (req, res) => {
    try {
      const snowflake = getSnowflakeService();
      if (!snowflake.isConnected) {
        return res.json([]);
      }

      const sql = `
        SELECT id, event_type as type, platform, sender_nickname as sender,
               sender_id, message, amount, event_timestamp as timestamp
        FROM ${snowflake.config.database}.${snowflake.config.schema}.EVENTS
        ORDER BY event_timestamp DESC
        LIMIT 50
      `;

      const rows = await snowflake.executeWithRetry(sql);
      res.json(rows || []);
    } catch (err) {
      console.error("[events] Snowflake query error:", err.message);
      res.json([]);
    }
  });

  // ===== Chzzk API =====

  /**
   * POST /api/chzzk/connect
   * Connect to Chzzk chat
   */
  router.post("/chzzk/connect", async (req, res) => {
    const { channelId, userHash } = req.body;

    if (!channelId) {
      return res.status(400).json({ error: "channelId is required" });
    }

    const adapterKey = userHash ? `${channelId}:${userHash}` : channelId;
    if (activeAdapters.has(adapterKey)) {
      const existing = activeAdapters.get(adapterKey);
      if (existing.isConnected) {
        return res.json({
          success: true,
          message: "Already connected",
          info: existing.getInfo(),
        });
      }
    }

    try {
      const adapter = new ChzzkAdapter({ channelId });

      // Track broadcaster person ID for this connection
      let broadcasterPersonId = null;

      adapter.on("event", async (event) => {
        const legacyEvent = normalizer.toEventsFormat(event);

        // === Snowflake: Process actor and update PERSONS/VIEWER_ENGAGEMENT ===
        if (["chat", "donation"].includes(event.type) && event.sender?.id) {
          const actorPersonId = await processEventActor("chzzk", channelId, event, broadcasterPersonId);

          // Attach person IDs to event for Snowflake storage
          event._actorPersonId = actorPersonId;
          event._targetPersonId = broadcasterPersonId;
          event._targetChannelId = channelId;
        }

        // === Snowflake: Send all events ===
        const snowflake = getSnowflakeService();
        snowflake.addEvent(event);

        // Emit to overlays
        if (userHash) {
          io.to(`overlay:${userHash}`).emit("new-event", legacyEvent);
        } else {
          io.emit("new-event", legacyEvent);
        }

        console.log(`[chzzk] Event: ${event.type} from ${event.sender?.nickname || "system"}`);
      });

      adapter.on("connected", () => {
        console.log(`[chzzk] Adapter connected for channel: ${channelId}`);
      });

      adapter.on("disconnected", () => {
        console.log(`[chzzk] Adapter disconnected for channel: ${channelId}`);
      });

      adapter.on("error", (error) => {
        console.error(`[chzzk] Adapter error:`, error.message);
      });

      await adapter.connect();
      activeAdapters.set(adapterKey, adapter);

      // === Snowflake: Save broadcaster and broadcast info ===
      try {
        const channelInfo = await adapter.getChannelInfo();
        const liveDetail = await adapter.getLiveDetail();

        if (channelInfo) {
          // Save broadcaster to PERSONS table
          broadcasterPersonId = await saveBroadcasterToSnowflake("chzzk", channelId, {
            streamerId: channelInfo.channelId,
            nickname: channelInfo.channelName,
            profileImageUrl: channelInfo.channelImageUrl,
            followerCount: channelInfo.followerCount,
            description: channelInfo.channelDescription,
          });
        }

        if (liveDetail) {
          // Save initial broadcast info with broadcaster person ID
          await saveBroadcastToSnowflake("chzzk", channelId, {
            broadcastId: liveDetail.liveId,
            title: liveDetail.liveTitle,
            categoryId: liveDetail.liveCategory,
            categoryName: liveDetail.liveCategoryValue,
            thumbnailUrl: liveDetail.liveImageUrl,
            viewerCount: liveDetail.concurrentUserCount,
            startedAt: liveDetail.openDate,
          }, broadcasterPersonId);
        }

        // Start continuous broadcast polling with broadcaster person ID
        startBroadcastPolling(adapterKey, "chzzk", channelId, adapter, broadcasterPersonId);

        console.log(`[chzzk] Saved broadcaster (person_id=${broadcasterPersonId}) & broadcast info to Snowflake`);
      } catch (sfError) {
        console.error(`[chzzk] Snowflake info save error:`, sfError.message);
      }

      res.json({
        success: true,
        message: "Connected to Chzzk chat",
        info: adapter.getInfo(),
      });
    } catch (error) {
      console.error(`[chzzk] Connection failed:`, error.message);
      res.status(500).json({
        error: "Failed to connect",
        message: error.message,
      });
    }
  });

  /**
   * POST /api/chzzk/disconnect
   * Disconnect from Chzzk chat
   */
  router.post("/chzzk/disconnect", (req, res) => {
    const { channelId, userHash } = req.body;

    if (!channelId) {
      return res.status(400).json({ error: "channelId is required" });
    }

    const adapterKey = userHash ? `${channelId}:${userHash}` : channelId;
    const adapter = activeAdapters.get(adapterKey);

    if (!adapter) {
      return res.status(404).json({ error: "No active connection found" });
    }

    // Stop broadcast polling
    stopBroadcastPolling(adapterKey);

    adapter.disconnect();
    activeAdapters.delete(adapterKey);

    res.json({
      success: true,
      message: "Disconnected from Chzzk chat",
    });
  });

  /**
   * GET /api/chzzk/status
   * Get Chzzk connection status
   */
  router.get("/chzzk/status", (req, res) => {
    const connections = [];

    for (const [key, adapter] of activeAdapters.entries()) {
      if (adapter.platform === "chzzk") {
        connections.push({
          key,
          ...adapter.getInfo(),
        });
      }
    }

    res.json({
      activeConnections: connections.length,
      connections,
    });
  });

  /**
   * GET /api/chzzk/channel/:channelId
   * Get Chzzk channel info (including live status)
   */
  router.get("/chzzk/channel/:channelId", async (req, res) => {
    const { channelId } = req.params;

    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };

    try {
      const channelResponse = await fetch(`https://api.chzzk.naver.com/service/v1/channels/${channelId}`, { headers });
      const channelData = await channelResponse.json();

      if (channelData.code !== 200) {
        return res.status(404).json({ error: "Channel not found" });
      }

      const liveResponse = await fetch(
        `https://api.chzzk.naver.com/service/v3/channels/${channelId}/live-detail`,
        { headers }
      );
      const liveData = await liveResponse.json();

      res.json({
        channel: channelData.content,
        live: liveData.content,
        isLive: liveData.content?.status === "OPEN",
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== SOOP API =====

  /**
   * POST /api/soop/connect
   * Connect to SOOP chat
   */
  router.post("/soop/connect", async (req, res) => {
    const { bjId, userHash } = req.body;

    if (!bjId) {
      return res.status(400).json({ error: "bjId is required" });
    }

    const adapterKey = userHash ? `soop:${bjId}:${userHash}` : `soop:${bjId}`;
    if (activeAdapters.has(adapterKey)) {
      const existing = activeAdapters.get(adapterKey);
      return res.json({
        success: true,
        message: "Already connected",
        status: existing.getInfo(),
      });
    }

    try {
      const adapter = new SoopAdapter({ channelId: bjId });

      // Track broadcaster person ID for this connection
      let broadcasterPersonId = null;

      adapter.on("event", async (event) => {
        const legacyEvent = normalizer.toEventsFormat(event);

        // === Snowflake: Process actor and update PERSONS/VIEWER_ENGAGEMENT ===
        if (["chat", "donation"].includes(event.type) && event.sender?.id) {
          const actorPersonId = await processEventActor("soop", bjId, event, broadcasterPersonId);

          // Attach person IDs to event for Snowflake storage
          event._actorPersonId = actorPersonId;
          event._targetPersonId = broadcasterPersonId;
          event._targetChannelId = bjId;
        }

        // === Snowflake: Send all events ===
        const snowflake = getSnowflakeService();
        snowflake.addEvent(event);

        // Emit to overlays
        if (userHash) {
          io.to(`overlay:${userHash}`).emit("new-event", legacyEvent);
        } else {
          io.emit("new-event", legacyEvent);
        }

        console.log(`[soop] Event: ${event.type} from ${event.sender?.nickname || "system"}`);
      });

      adapter.on("connected", () => {
        console.log(`[soop] Adapter connected for ${bjId}`);
      });

      adapter.on("disconnected", () => {
        console.log(`[soop] Adapter disconnected for ${bjId}`);
        activeAdapters.delete(adapterKey);
      });

      adapter.on("error", (error) => {
        console.error(`[soop] Adapter error:`, error.message);
      });

      await adapter.connect();
      activeAdapters.set(adapterKey, adapter);

      // === Snowflake: Save broadcaster and broadcast info ===
      try {
        const broadcastStatus = await adapter.getBroadcastStatus();

        if (broadcastStatus) {
          // Save broadcaster to PERSONS table
          broadcasterPersonId = await saveBroadcasterToSnowflake("soop", bjId, {
            streamerId: broadcastStatus.bjId,
            nickname: broadcastStatus.bjNickname,
            profileImageUrl: `https://profile.img.sooplive.co.kr/LOGO/${bjId.substring(0, 2)}/${bjId}/${bjId}.jpg`,
          });

          // Save initial broadcast info with broadcaster person ID
          await saveBroadcastToSnowflake("soop", bjId, {
            broadcastId: broadcastStatus.broadNo,
            title: broadcastStatus.title,
            categoryId: broadcastStatus.category,
            categoryName: broadcastStatus.category,
            thumbnailUrl: broadcastStatus.thumbnail,
            viewerCount: broadcastStatus.viewers,
          }, broadcasterPersonId);
        }

        // Start continuous broadcast polling with broadcaster person ID
        startBroadcastPolling(adapterKey, "soop", bjId, adapter, broadcasterPersonId);

        console.log(`[soop] Saved broadcaster (person_id=${broadcasterPersonId}) & broadcast info to Snowflake`);
      } catch (sfError) {
        console.error(`[soop] Snowflake info save error:`, sfError.message);
      }

      res.json({
        success: true,
        message: "Connected to SOOP chat",
        status: adapter.getInfo(),
      });
    } catch (error) {
      console.error(`[soop] Connection failed:`, error.message);
      res.status(500).json({
        error: "Failed to connect to SOOP chat",
        message: error.message,
      });
    }
  });

  /**
   * POST /api/soop/disconnect
   * Disconnect from SOOP chat
   */
  router.post("/soop/disconnect", (req, res) => {
    const { bjId, userHash } = req.body;

    if (!bjId) {
      return res.status(400).json({ error: "bjId is required" });
    }

    const adapterKey = userHash ? `soop:${bjId}:${userHash}` : `soop:${bjId}`;
    const adapter = activeAdapters.get(adapterKey);

    if (!adapter) {
      return res.status(404).json({ error: "No active connection found" });
    }

    // Stop broadcast polling
    stopBroadcastPolling(adapterKey);

    adapter.disconnect();
    activeAdapters.delete(adapterKey);

    res.json({
      success: true,
      message: "Disconnected from SOOP chat",
    });
  });

  /**
   * GET /api/soop/status
   * Get SOOP connection status
   */
  router.get("/soop/status", (req, res) => {
    const connections = [];

    for (const [key, adapter] of activeAdapters.entries()) {
      if (adapter.platform === "soop") {
        connections.push({
          key,
          ...adapter.getInfo(),
        });
      }
    }

    res.json({
      success: true,
      connections,
    });
  });

  /**
   * GET /api/soop/broadcast/:bjId
   * Get SOOP broadcast info
   */
  router.get("/soop/broadcast/:bjId", async (req, res) => {
    const { bjId } = req.params;

    try {
      const adapter = new SoopAdapter({ channelId: bjId });
      const broadcastInfo = await adapter.getBroadcastStatus();

      if (!broadcastInfo) {
        return res.status(404).json({
          error: "Broadcast not found or BJ is not live",
        });
      }

      res.json({
        success: true,
        data: broadcastInfo,
      });
    } catch (error) {
      console.error(`[soop] Broadcast info error:`, error.message);
      res.status(500).json({
        error: "Failed to get broadcast info",
        message: error.message,
      });
    }
  });

  // ===== Categories API =====

  /**
   * GET /api/categories/soop
   * Get SOOP categories and save to Snowflake
   */
  router.get("/categories/soop", async (req, res) => {
    try {
      console.log(`[soop] Fetching categories...`);
      const categories = await SoopAdapter.getAllCategories();

      // Save to Snowflake
      const snowflake = getSnowflakeService();
      await snowflake.addCategories("soop", categories);

      res.json({
        success: true,
        count: categories.length,
        data: categories,
      });
    } catch (error) {
      console.error(`[soop] Categories fetch error:`, error.message);
      res.status(500).json({
        error: "Failed to fetch categories",
        message: error.message,
      });
    }
  });

  /**
   * GET /api/categories/chzzk
   * Get Chzzk categories and save to Snowflake
   */
  router.get("/categories/chzzk", async (req, res) => {
    try {
      console.log(`[chzzk] Fetching categories...`);
      const categories = await ChzzkAdapter.getAllCategories();

      // Save to Snowflake
      const snowflake = getSnowflakeService();
      await snowflake.addCategories("chzzk", categories);

      res.json({
        success: true,
        count: categories.length,
        data: categories,
      });
    } catch (error) {
      console.error(`[chzzk] Categories fetch error:`, error.message);
      res.status(500).json({
        error: "Failed to fetch categories",
        message: error.message,
      });
    }
  });

  /**
   * POST /api/categories/sync
   * Sync all categories from all platforms to Snowflake
   */
  router.post("/categories/sync", async (req, res) => {
    try {
      console.log(`[categories] Starting full category sync...`);

      // Fetch from both platforms in parallel
      const [soopCategories, chzzkCategories] = await Promise.all([
        SoopAdapter.getAllCategories(),
        ChzzkAdapter.getAllCategories(),
      ]);

      // Save to Snowflake
      const snowflake = getSnowflakeService();
      await Promise.all([
        snowflake.addCategories("soop", soopCategories),
        snowflake.addCategories("chzzk", chzzkCategories),
      ]);

      console.log(`[categories] Sync complete: SOOP=${soopCategories.length}, Chzzk=${chzzkCategories.length}`);

      res.json({
        success: true,
        soop: { count: soopCategories.length },
        chzzk: { count: chzzkCategories.length },
        total: soopCategories.length + chzzkCategories.length,
      });
    } catch (error) {
      console.error(`[categories] Sync error:`, error.message);
      res.status(500).json({
        error: "Failed to sync categories",
        message: error.message,
      });
    }
  });

  // ===== Discovery API (자동 방송 발견 및 연결) =====

  /**
   * POST /api/discovery/start
   * Start the live discovery service
   * Query params:
   * - maxConnectionsPerPlatform: 플랫폼별 최대 연결 수 (기본: 500, SOOP 500 + Chzzk 500 = 1000)
   * - discoveryInterval: 발견 주기 (ms, 기본: 300000 = 5분)
   */
  router.post("/discovery/start", async (req, res) => {
    try {
      // Debug: Check dependencies
      console.log(`[discovery] Dependencies check: io=${!!io}, SoopAdapter=${!!SoopAdapter}, ChzzkAdapter=${!!ChzzkAdapter}, normalizer=${!!normalizer}`);

      const discovery = getDiscoveryService();

      // 설정 업데이트 (플랫폼별 연결 수)
      const body = req.body || {};
      const maxConnectionsPerPlatform = parseInt(body.maxConnectionsPerPlatform || body.maxConnections, 10) || 500;
      const discoveryInterval = parseInt(body.discoveryInterval, 10) || 5 * 60 * 1000;

      discovery.updateConfig({ maxConnectionsPerPlatform, discoveryInterval });

      // 의존성 주입
      discovery.setDependencies({
        io,
        SoopAdapter,
        ChzzkAdapter,
        normalizer,
      });

      // 서비스 시작
      const status = await discovery.start();

      console.log(`[discovery] Service started with ${maxConnectionsPerPlatform} connections per platform (total: ${maxConnectionsPerPlatform * 2})`);

      res.json({
        success: true,
        message: "Discovery service started",
        status,
      });
    } catch (error) {
      console.error(`[discovery] Start error:`, error.message);
      console.error(`[discovery] Stack:`, error.stack);
      res.status(500).json({
        error: "Failed to start discovery service",
        message: error.message,
      });
    }
  });

  /**
   * POST /api/discovery/stop
   * Stop the live discovery service
   */
  router.post("/discovery/stop", async (req, res) => {
    try {
      const discovery = getDiscoveryService();
      const status = await discovery.stop();

      console.log(`[discovery] Service stopped`);

      res.json({
        success: true,
        message: "Discovery service stopped",
        status,
      });
    } catch (error) {
      console.error(`[discovery] Stop error:`, error.message);
      res.status(500).json({
        error: "Failed to stop discovery service",
        message: error.message,
      });
    }
  });

  /**
   * GET /api/discovery/status
   * Get discovery service status
   */
  router.get("/discovery/status", (req, res) => {
    try {
      const discovery = getDiscoveryService();
      const status = discovery.getStatus();

      res.json(status);
    } catch (error) {
      console.error(`[discovery] Status error:`, error.message);
      res.status(500).json({
        error: "Failed to get discovery status",
        message: error.message,
      });
    }
  });

  /**
   * PATCH /api/discovery/config
   * Update discovery service configuration
   * Body params:
   * - maxConnectionsPerPlatform: 플랫폼별 최대 연결 수
   * - discoveryInterval: 발견 주기 (ms)
   */
  router.patch("/discovery/config", async (req, res) => {
    try {
      const discovery = getDiscoveryService();
      const { maxConnectionsPerPlatform, maxConnections, discoveryInterval } = req.body;

      const config = {};
      // 새 파라미터 우선, 하위호환을 위해 maxConnections도 지원
      if (maxConnectionsPerPlatform !== undefined) {
        config.maxConnectionsPerPlatform = parseInt(maxConnectionsPerPlatform, 10);
      } else if (maxConnections !== undefined) {
        config.maxConnectionsPerPlatform = parseInt(maxConnections, 10);
      }
      if (discoveryInterval !== undefined) {
        config.discoveryInterval = parseInt(discoveryInterval, 10);
      }

      const status = discovery.updateConfig(config);

      res.json({
        success: true,
        message: "Configuration updated",
        status,
      });
    } catch (error) {
      console.error(`[discovery] Config update error:`, error.message);
      res.status(500).json({
        error: "Failed to update config",
        message: error.message,
      });
    }
  });

  /**
   * POST /api/discovery/discover
   * Manually trigger a discovery cycle
   */
  router.post("/discovery/discover", async (req, res) => {
    try {
      const discovery = getDiscoveryService();

      if (!discovery.isRunning) {
        return res.status(400).json({
          error: "Discovery service not running",
          message: "Start the service first with POST /api/discovery/start",
        });
      }

      await discovery.discover();

      res.json({
        success: true,
        message: "Discovery cycle completed",
        status: discovery.getStatus(),
      });
    } catch (error) {
      console.error(`[discovery] Manual discover error:`, error.message);
      res.status(500).json({
        error: "Failed to run discovery",
        message: error.message,
      });
    }
  });

  /**
   * GET /api/broadcasts/live
   * Get all live broadcasts from both platforms (without connecting)
   */
  router.get("/broadcasts/live", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit, 10) || 100;
      const platform = req.query.platform; // soop, chzzk, or all

      let soopBroadcasts = [];
      let chzzkBroadcasts = [];

      if (!platform || platform === "all" || platform === "soop") {
        soopBroadcasts = await SoopAdapter.getAllLiveBroadcasts(limit);
      }
      if (!platform || platform === "all" || platform === "chzzk") {
        chzzkBroadcasts = await ChzzkAdapter.getAllLiveBroadcasts(limit);
      }

      // 통합 및 정렬
      const allBroadcasts = [...soopBroadcasts, ...chzzkBroadcasts];
      allBroadcasts.sort((a, b) => b.viewerCount - a.viewerCount);

      res.json({
        success: true,
        count: {
          soop: soopBroadcasts.length,
          chzzk: chzzkBroadcasts.length,
          total: allBroadcasts.length,
        },
        data: allBroadcasts.slice(0, limit),
      });
    } catch (error) {
      console.error(`[broadcasts] Live fetch error:`, error.message);
      res.status(500).json({
        error: "Failed to fetch live broadcasts",
        message: error.message,
      });
    }
  });

  return router;
};

module.exports = createPlatformsRouter;
