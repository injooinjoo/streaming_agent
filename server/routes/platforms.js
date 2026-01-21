/**
 * Platform Routes
 * Chzzk and SOOP platform connection management
 *
 * SQLite-only data storage (Snowflake removed)
 *
 * Collects:
 * - Events (chat, donation, subscribe, viewer-update)
 * - Broadcast info (title, category, viewer count)
 * - Streamer info (nickname, profile)
 */

const express = require("express");
const { getDiscoveryService } = require("../services/liveDiscoveryService");
const PersonService = require("../services/personService");
const ViewerEngagementService = require("../services/viewerEngagementService");

/**
 * Create platforms router
 * @param {Server} io - Socket.io server instance
 * @param {Map} activeAdapters - Active platform adapters map
 * @param {Function} ChzzkAdapter - Chzzk adapter class
 * @param {Function} SoopAdapter - SOOP adapter class
 * @param {Object} normalizer - Event normalizer
 * @param {Object} db - SQLite database instance
 * @returns {express.Router}
 */
const createPlatformsRouter = (io, activeAdapters, ChzzkAdapter, SoopAdapter, normalizer, db) => {
  const router = express.Router();
  const personService = db ? new PersonService(db) : null;
  const viewerEngagementService = db ? new ViewerEngagementService(db) : null;

  /**
   * Handle person tracking and engagement for events
   * @param {Object} event - Event data
   * @param {string} broadcasterChannelId - Channel ID of the broadcaster
   * @param {Object} [broadcastInfo] - Optional broadcast info (category, title)
   */
  const trackPersonAndEngagement = async (event, broadcasterChannelId, broadcastInfo = {}) => {
    if (!personService || !event.sender?.id || event.sender.id === "system") return;

    try {
      // 1. Upsert person (viewer)
      const personId = await personService.upsertPerson({
        platform: event.platform,
        platformUserId: event.sender.id,
        nickname: event.sender.nickname,
        profileImageUrl: event.sender.profileImage || event.sender.profileImageUrl,
      });

      // 2. Update person statistics (what this person SPENT)
      if (event.type === "chat") {
        await personService.incrementChatCount(personId);
      } else if (event.type === "donation" && event.content?.amount) {
        await personService.incrementDonation(personId, event.content.amount);
      }

      // 3. Record viewer engagement (viewer-broadcaster relationship)
      if (viewerEngagementService && broadcasterChannelId) {
        await viewerEngagementService.recordEngagement({
          viewerPersonId: personId,
          broadcasterChannelId,
          platform: event.platform,
          categoryId: broadcastInfo.categoryId || null,
          categoryName: broadcastInfo.categoryName || null,
          eventType: event.type,
          donationAmount: event.content?.amount || 0,
        });
      }
    } catch (error) {
      console.error(`[persons] Track error:`, error.message);
    }
  };

  // Legacy function for backward compatibility
  const trackPerson = async (event) => {
    const channelId = event.metadata?.channelId || null;
    await trackPersonAndEngagement(event, channelId);
  };

  // ===== Events API (SQLite) =====

  /**
   * POST /api/events
   * Create new event (saves to SQLite)
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

    // Save to SQLite (using canonical schema)
    const legacyEvent = normalizer.toEventsFormat(event);
    if (db) {
      db.run(
        `INSERT INTO events (id, event_type, platform, actor_nickname, target_channel_id, message, amount, event_timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [event.id, event.type, event.platform, event.sender.nickname, event.metadata.channelId || 'manual', event.content.message, event.content.amount, event.metadata.timestamp]
      );
    }

    // Emit to overlays
    if (overlayHash) {
      io.to(`overlay:${overlayHash}`).emit("new-event", legacyEvent);
    } else {
      io.emit("new-event", legacyEvent);
    }

    res.json({ success: true, event: legacyEvent });
  });

  /**
   * GET /api/events
   * Get historical events from SQLite
   * Query params:
   *   - channelId: Filter events by target channel (e.g., 'devil0108')
   *   - limit: Number of events to return (default: 50)
   */
  router.get("/events", async (req, res) => {
    try {
      if (!db) {
        return res.json([]);
      }

      const channelId = req.query.channelId || null;
      const limit = parseInt(req.query.limit, 10) || 50;

      // Build query with optional channelId filter
      let query = `
        SELECT
          id,
          event_type as type,
          platform,
          actor_nickname as sender,
          message,
          amount,
          event_timestamp as timestamp
        FROM events
      `;
      const params = [];

      if (channelId) {
        query += ` WHERE target_channel_id = ?`;
        params.push(channelId);
      }

      query += ` ORDER BY event_timestamp DESC LIMIT ?`;
      params.push(limit);

      db.all(query, params, (err, rows) => {
        if (err) {
          console.error("[events] SQLite query error:", err.message);
          return res.json([]);
        }
        res.json(rows || []);
      });
    } catch (err) {
      console.error("[events] Query error:", err.message);
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

      adapter.on("event", async (event) => {
        const legacyEvent = normalizer.toEventsFormat(event);

        // Track person and engagement (viewer-broadcaster relationship)
        const broadcastInfo = adapter.getInfo ? adapter.getInfo() : {};
        await trackPersonAndEngagement(event, channelId, {
          categoryId: broadcastInfo.categoryId || event.metadata?.categoryId,
          categoryName: broadcastInfo.categoryName || event.metadata?.categoryName,
        });

        // Save to SQLite (using canonical schema)
        if (db && event.type) {
          db.run(
            `INSERT INTO events (id, event_type, platform, actor_nickname, actor_person_id, target_channel_id, message, amount, event_timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              event.id || require("uuid").v4(),
              event.type,
              "chzzk",
              event.sender?.nickname || "unknown",
              null, // actor_person_id - resolved via PersonService
              channelId,
              event.content?.message || "",
              event.content?.amount || 0,
              event.metadata?.timestamp || new Date().toISOString(),
            ]
          );
        }

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

      adapter.on("event", async (event) => {
        const legacyEvent = normalizer.toEventsFormat(event);

        // Track person and engagement (viewer-broadcaster relationship)
        const broadcastInfo = adapter.getInfo ? adapter.getInfo() : {};
        await trackPersonAndEngagement(event, bjId, {
          categoryId: broadcastInfo.categoryId || event.metadata?.categoryId,
          categoryName: broadcastInfo.categoryName || event.metadata?.categoryName,
        });

        // Save to SQLite (using canonical schema)
        if (db && event.type) {
          db.run(
            `INSERT INTO events (id, event_type, platform, actor_nickname, actor_person_id, target_channel_id, message, amount, event_timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              event.id || require("uuid").v4(),
              event.type,
              "soop",
              event.sender?.nickname || "unknown",
              null, // actor_person_id - resolved via PersonService
              bjId,
              event.content?.message || "",
              event.content?.amount || 0,
              event.metadata?.timestamp || new Date().toISOString(),
            ]
          );
        }

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
   * Get SOOP categories
   */
  router.get("/categories/soop", async (req, res) => {
    try {
      console.log(`[soop] Fetching categories...`);
      const categories = await SoopAdapter.getAllCategories();

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
   * Get Chzzk categories
   */
  router.get("/categories/chzzk", async (req, res) => {
    try {
      console.log(`[chzzk] Fetching categories...`);
      const categories = await ChzzkAdapter.getAllCategories();

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

  // ===== Discovery API =====

  /**
   * POST /api/discovery/start
   * Start the live discovery service
   */
  router.post("/discovery/start", async (req, res) => {
    try {
      const discovery = getDiscoveryService();

      const body = req.body || {};
      const maxConnectionsPerPlatform = parseInt(body.maxConnectionsPerPlatform || body.maxConnections, 10) || 500;
      const discoveryInterval = parseInt(body.discoveryInterval, 10) || 5 * 60 * 1000;

      discovery.updateConfig({ maxConnectionsPerPlatform, discoveryInterval });

      discovery.setDependencies({
        io,
        SoopAdapter,
        ChzzkAdapter,
        normalizer,
        db,
      });

      const status = await discovery.start();

      console.log(`[discovery] Service started with ${maxConnectionsPerPlatform} connections per platform`);

      res.json({
        success: true,
        message: "Discovery service started",
        status,
      });
    } catch (error) {
      console.error(`[discovery] Start error:`, error.message);
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
   * GET /api/broadcasts/live
   * Get all live broadcasts from both platforms
   */
  router.get("/broadcasts/live", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit, 10) || 100;
      const platform = req.query.platform;

      let soopBroadcasts = [];
      let chzzkBroadcasts = [];

      if (!platform || platform === "all" || platform === "soop") {
        soopBroadcasts = await SoopAdapter.getAllLiveBroadcasts(limit);
      }
      if (!platform || platform === "all" || platform === "chzzk") {
        chzzkBroadcasts = await ChzzkAdapter.getAllLiveBroadcasts(limit);
      }

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
