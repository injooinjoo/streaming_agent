/**
 * Platform Routes
 * Chzzk and SOOP platform connection management
 */

const express = require("express");

/**
 * Create platforms router
 * @param {sqlite3.Database} db - Database instance
 * @param {Server} io - Socket.io server instance
 * @param {Map} activeAdapters - Active platform adapters map
 * @param {Function} ChzzkAdapter - Chzzk adapter class
 * @param {Function} SoopAdapter - SOOP adapter class
 * @param {Object} normalizer - Event normalizer
 * @returns {express.Router}
 */
const createPlatformsRouter = (db, io, activeAdapters, ChzzkAdapter, SoopAdapter, normalizer) => {
  const router = express.Router();

  // ===== Events API =====

  /**
   * POST /api/events
   * Create new event
   */
  router.post("/events", (req, res) => {
    const event = {
      type: req.body.type || "chat",
      sender: req.body.sender || "Anonymous",
      amount: req.body.amount || 0,
      message: req.body.message || "",
      platform: req.body.platform || "manual",
      timestamp: new Date().toISOString(),
    };

    const overlayHash = req.body.overlayHash;

    db.run(
      `INSERT INTO events (type, sender, amount, message, platform) VALUES (?, ?, ?, ?, ?)`,
      [event.type, event.sender, event.amount, event.message, event.platform],
      function (err) {
        if (err) {
          console.error("Error saving event:", err.message);
          return res.status(500).json({ error: "Failed to save event" });
        }

        if (overlayHash) {
          io.to(`overlay:${overlayHash}`).emit("new-event", { ...event, id: this.lastID });
        } else {
          io.emit("new-event", { ...event, id: this.lastID });
        }
        res.json({ success: true, event: { ...event, id: this.lastID } });
      }
    );
  });

  /**
   * GET /api/events
   * Get historical events
   */
  router.get("/events", (req, res) => {
    db.all(`SELECT * FROM events ORDER BY timestamp DESC LIMIT 50`, [], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    });
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

      adapter.on("event", (event) => {
        const legacyEvent = normalizer.toEventsFormat(event);

        // Save user events (chat, donation, subscribe) to events table
        if (["chat", "donation", "subscribe"].includes(event.type)) {
          db.run(
            `INSERT INTO events (type, sender, sender_id, amount, message, platform, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              legacyEvent.type,
              legacyEvent.sender,
              legacyEvent.sender_id,
              legacyEvent.amount,
              legacyEvent.message,
              legacyEvent.platform,
              legacyEvent.timestamp,
            ],
            (err) => {
              if (err) {
                console.error(`[chzzk] DB insert error for ${event.type}:`, err.message);
              }
            }
          );
        }

        // Save viewer-update events to viewer_stats table
        if (event.type === "viewer-update" && event.content?.viewerCount !== undefined) {
          db.run(
            `INSERT INTO viewer_stats (platform, channel_id, viewer_count, timestamp) VALUES (?, ?, ?, ?)`,
            ["chzzk", channelId, event.content.viewerCount, new Date().toISOString()],
            (err) => {
              if (err) {
                console.error(`[chzzk] DB insert error for viewer_stats:`, err.message);
              }
            }
          );
        }

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

      adapter.on("event", (event) => {
        const legacyEvent = normalizer.toEventsFormat(event);

        // Save user events (chat, donation, subscribe) to events table
        if (["chat", "donation", "subscribe"].includes(event.type)) {
          db.run(
            `INSERT INTO events (type, sender, sender_id, amount, message, platform, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              legacyEvent.type,
              legacyEvent.sender,
              legacyEvent.sender_id,
              legacyEvent.amount,
              legacyEvent.message,
              legacyEvent.platform,
              legacyEvent.timestamp,
            ],
            (err) => {
              if (err) {
                console.error(`[soop] DB insert error for ${event.type}:`, err.message);
              }
            }
          );
        }

        // Save viewer-update events to viewer_stats table
        if (event.type === "viewer-update" && event.content?.viewerCount !== undefined) {
          db.run(
            `INSERT INTO viewer_stats (platform, channel_id, viewer_count, timestamp) VALUES (?, ?, ?, ?)`,
            ["soop", bjId, event.content.viewerCount, new Date().toISOString()],
            (err) => {
              if (err) {
                console.error(`[soop] DB insert error for viewer_stats:`, err.message);
              }
            }
          );
        }

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

  return router;
};

module.exports = createPlatformsRouter;
