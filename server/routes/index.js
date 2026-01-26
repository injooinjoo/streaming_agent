/**
 * Routes Index
 * Central export point for all route modules
 */

const { createAuthRouter } = require("./auth");
const { createSettingsRouter } = require("./settings");
const { createOverlayRouter } = require("./overlay");
const { createAdsRouter } = require("./ads");
const createAdminRouter = require("./admin");
const { createStatsRouter } = require("./stats");
const createPlatformsRouter = require("./platforms");
const createGameStatsRouter = require("./game-stats");
const createCategoriesRouter = require("./categories");
const { createMonitorRouter } = require("./monitor");
const { createDesignsRouter } = require("./designs");
const { createMarketplaceRouter } = require("./marketplace");

module.exports = {
  createAuthRouter,
  createSettingsRouter,
  createOverlayRouter,
  createAdsRouter,
  createAdminRouter,
  createStatsRouter,
  createPlatformsRouter,
  createGameStatsRouter,
  createCategoriesRouter,
  createMonitorRouter,
  createDesignsRouter,
  createMarketplaceRouter,
};
