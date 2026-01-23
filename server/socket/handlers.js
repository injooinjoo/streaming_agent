/**
 * Socket.io Event Handlers
 * Centralized WebSocket event management for overlays
 */

// 활성 오버레이 어댑터 관리 (userHash → adapter)
const overlayAdapters = new Map();

/**
 * Setup Socket.io event handlers
 * @param {Server} io - Socket.io server instance
 * @param {Object} options - Dependencies
 * @param {Object} options.db - Database instance
 * @param {Function} options.ChzzkAdapter - Chzzk adapter class
 * @param {Function} options.SoopAdapter - Soop adapter class
 */
const setupSocketHandlers = (io, options = {}) => {
  const { db, ChzzkAdapter, SoopAdapter } = options;

  // Helper: Find user by overlay hash
  const findUserByOverlayHash = (hash) => {
    return new Promise((resolve, reject) => {
      if (!db) return resolve(null);
      db.get(
        "SELECT id, platform, channel_id FROM users WHERE overlay_hash = ?",
        [hash],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  };

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // ===== Overlay Room Management =====

    /**
     * Join overlay room (hash-based) with auto platform connection
     */
    socket.on("join-overlay", async (hash) => {
      if (!hash) return;

      socket.join(`overlay:${hash}`);
      console.log(`Socket ${socket.id} joined room overlay:${hash}`);

      // Skip auto-connect if adapters not configured
      if (!db || !ChzzkAdapter || !SoopAdapter) {
        return;
      }

      // Check if adapter already exists for this hash
      if (overlayAdapters.has(hash)) {
        const existingAdapter = overlayAdapters.get(hash);
        if (existingAdapter.isConnected) {
          socket.emit("overlay-status", { status: "connected", platform: existingAdapter.platform });
        }
        return;
      }

      try {
        // Find user by overlay hash
        const user = await findUserByOverlayHash(hash);
        if (!user || !user.platform || !user.channel_id) {
          socket.emit("overlay-status", { status: "no_channel", message: "채널이 설정되지 않았습니다" });
          return;
        }

        // Create adapter based on platform
        const AdapterClass = user.platform === "chzzk" ? ChzzkAdapter : SoopAdapter;
        const adapter = new AdapterClass({ channelId: user.channel_id });

        // Forward events to overlay room
        adapter.on("event", (event) => {
          io.to(`overlay:${hash}`).emit("new-event", event);
        });

        adapter.on("connected", () => {
          console.log(`[Overlay] Adapter connected for ${hash} (${user.platform}:${user.channel_id})`);
          io.to(`overlay:${hash}`).emit("overlay-status", { status: "connected", platform: user.platform });
        });

        adapter.on("disconnected", () => {
          console.log(`[Overlay] Adapter disconnected for ${hash}`);
          io.to(`overlay:${hash}`).emit("overlay-status", { status: "disconnected" });
        });

        adapter.on("error", (err) => {
          console.error(`[Overlay] Adapter error for ${hash}:`, err.message);
        });

        // Connect to platform
        await adapter.connect();
        overlayAdapters.set(hash, adapter);
        console.log(`[Overlay] Auto-connected adapter for ${hash} (${user.platform}:${user.channel_id})`);

      } catch (error) {
        console.error(`[Overlay] Auto-connect failed for ${hash}:`, error.message);
        socket.emit("overlay-status", { status: "error", message: error.message });
      }
    });

    /**
     * Leave overlay room
     */
    socket.on("leave-overlay", (hash) => {
      if (!hash) return;

      socket.leave(`overlay:${hash}`);
      console.log(`Socket ${socket.id} left room overlay:${hash}`);

      // Clean up adapter if no clients remain in the room
      const room = io.sockets.adapter.rooms.get(`overlay:${hash}`);
      if (!room || room.size === 0) {
        const adapter = overlayAdapters.get(hash);
        if (adapter) {
          console.log(`[Overlay] Cleaning up adapter for ${hash}`);
          adapter.disconnect();
          overlayAdapters.delete(hash);
        }
      }
    });

    // ===== Ad Overlay =====

    socket.on("join-ad-overlay", (hash) => {
      if (hash) {
        socket.join(`overlay:${hash}`);
        console.log(`Socket ${socket.id} joined ad overlay room overlay:${hash}`);
      }
    });

    socket.on("leave-ad-overlay", (hash) => {
      if (hash) {
        socket.leave(`overlay:${hash}`);
        console.log(`Socket ${socket.id} left ad overlay room overlay:${hash}`);
      }
    });

    // ===== Settings Update =====

    /**
     * Settings update event (Dashboard → Overlay)
     */
    socket.on("settings-update", (data) => {
      if (data.userHash) {
        io.to(`overlay:${data.userHash}`).emit("settings-updated", { key: data.key });
        console.log(`Settings updated for ${data.key} in room overlay:${data.userHash}`);
      }
    });

    // ===== Roulette =====

    socket.on("roulette-spin", (data) => {
      if (data.userHash) {
        io.to(`overlay:${data.userHash}`).emit("roulette-spin", {
          resultIndex: data.resultIndex,
          segments: data.segments,
        });
        console.log(`Roulette spin triggered for overlay:${data.userHash}, result: ${data.resultIndex}`);
      }
    });

    // ===== Emoji Reactions =====

    socket.on("emoji-reaction", (data) => {
      if (data.userHash) {
        io.to(`overlay:${data.userHash}`).emit("emoji-reaction", {
          emoji: data.emoji,
          position: data.position,
        });
      }
    });

    socket.on("emoji-burst", (data) => {
      if (data.userHash) {
        io.to(`overlay:${data.userHash}`).emit("emoji-burst", {
          emojis: data.emojis,
        });
      }
    });

    // ===== Voting/Polls =====

    socket.on("poll-start", (data) => {
      if (data.userHash) {
        io.to(`overlay:${data.userHash}`).emit("poll-started", data.poll);
      }
    });

    socket.on("poll-vote", (data) => {
      if (data.userHash) {
        io.to(`overlay:${data.userHash}`).emit("poll-update", {
          pollId: data.pollId,
          optionId: data.optionId,
          newCount: data.newCount,
        });
      }
    });

    socket.on("poll-end", (data) => {
      if (data.userHash) {
        io.to(`overlay:${data.userHash}`).emit("poll-ended", {
          pollId: data.pollId,
          results: data.results,
        });
      }
    });

    // ===== Ending Credits =====

    socket.on("credits-start", (data) => {
      if (data.userHash) {
        io.to(`overlay:${data.userHash}`).emit("credits-start", data.credits);
      }
    });

    socket.on("credits-stop", (data) => {
      if (data.userHash) {
        io.to(`overlay:${data.userHash}`).emit("credits-stop");
      }
    });

    // ===== Chat Bot =====

    socket.on("bot-toggle", (data) => {
      if (data.userHash) {
        io.to(`overlay:${data.userHash}`).emit("bot-toggle", {
          isActive: data.isActive,
        });
      }
    });

    socket.on("bot-message", (data) => {
      if (data.userHash) {
        io.to(`overlay:${data.userHash}`).emit("bot-message", {
          botName: data.botName,
          message: data.message,
        });
      }
    });

    // ===== Disconnect =====

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
};

module.exports = { setupSocketHandlers };
