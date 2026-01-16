/**
 * Socket.io Event Handlers
 * Centralized WebSocket event management for overlays
 */

/**
 * Setup Socket.io event handlers
 * @param {Server} io - Socket.io server instance
 */
const setupSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // ===== Overlay Room Management =====

    /**
     * Join overlay room (hash-based)
     */
    socket.on("join-overlay", (hash) => {
      if (hash) {
        socket.join(`overlay:${hash}`);
        console.log(`Socket ${socket.id} joined room overlay:${hash}`);
      }
    });

    /**
     * Leave overlay room
     */
    socket.on("leave-overlay", (hash) => {
      if (hash) {
        socket.leave(`overlay:${hash}`);
        console.log(`Socket ${socket.id} left room overlay:${hash}`);
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
