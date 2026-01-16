/**
 * Game Statistics Routes
 * Riot Games API integration (LoL, VALORANT, TFT)
 */

const express = require("express");

/**
 * Create game stats router
 * @param {Object} riotApi - Riot API client instance
 * @returns {express.Router}
 */
const createGameStatsRouter = (riotApi) => {
  const router = express.Router();

  /**
   * GET /api/game-stats/lol
   * Get LoL player stats
   */
  router.get("/game-stats/lol", async (req, res) => {
    const { name, tag } = req.query;

    if (!name || !tag) {
      return res.status(400).json({ error: "name and tag are required" });
    }

    if (!process.env.RIOT_API_KEY) {
      return res.status(500).json({ error: "RIOT_API_KEY not configured" });
    }

    try {
      const stats = await riotApi.getLolPlayerStats(name, tag);
      res.json({
        success: true,
        game: "lol",
        data: stats,
      });
    } catch (error) {
      console.error(`[game-stats] LoL error:`, error.message);
      res.status(500).json({
        error: "Failed to fetch LoL stats",
        message: error.message,
      });
    }
  });

  /**
   * GET /api/game-stats/valorant
   * Get VALORANT player stats
   */
  router.get("/game-stats/valorant", async (req, res) => {
    const { name, tag } = req.query;

    if (!name || !tag) {
      return res.status(400).json({ error: "name and tag are required" });
    }

    if (!process.env.RIOT_API_KEY) {
      return res.status(500).json({ error: "RIOT_API_KEY not configured" });
    }

    try {
      const stats = await riotApi.getValPlayerStats(name, tag);
      res.json({
        success: true,
        game: "valorant",
        data: stats,
      });
    } catch (error) {
      console.error(`[game-stats] VALORANT error:`, error.message);
      res.status(500).json({
        error: "Failed to fetch VALORANT stats",
        message: error.message,
      });
    }
  });

  /**
   * GET /api/game-stats/tft
   * Get TFT player stats
   */
  router.get("/game-stats/tft", async (req, res) => {
    const { name, tag } = req.query;

    if (!name || !tag) {
      return res.status(400).json({ error: "name and tag are required" });
    }

    if (!process.env.RIOT_API_KEY) {
      return res.status(500).json({ error: "RIOT_API_KEY not configured" });
    }

    try {
      const stats = await riotApi.getTftPlayerStats(name, tag);
      res.json({
        success: true,
        game: "tft",
        data: stats,
      });
    } catch (error) {
      console.error(`[game-stats] TFT error:`, error.message);
      res.status(500).json({
        error: "Failed to fetch TFT stats",
        message: error.message,
      });
    }
  });

  /**
   * GET /api/game-stats/riot/account
   * Search Riot Games account (for autocomplete)
   */
  router.get("/game-stats/riot/account", async (req, res) => {
    const { name, tag } = req.query;

    if (!name || !tag) {
      return res.status(400).json({ error: "name and tag are required" });
    }

    if (!process.env.RIOT_API_KEY) {
      return res.status(500).json({ error: "RIOT_API_KEY not configured" });
    }

    try {
      const account = await riotApi.getAccountByRiotId(name, tag);
      res.json({
        success: true,
        data: {
          gameName: account.gameName,
          tagLine: account.tagLine,
          puuid: account.puuid,
        },
      });
    } catch (error) {
      console.error(`[game-stats] Account search error:`, error.message);
      res.status(404).json({
        error: "Account not found",
        message: error.message,
      });
    }
  });

  return router;
};

module.exports = createGameStatsRouter;
