/**
 * CategoryService - 카테고리 크롤링 메인 서비스
 *
 * CategoryCrawler와 CategoryMapper를 조율하고,
 * 스케줄링과 API를 제공합니다.
 * Uses Redis for caching when available, falls back to in-memory.
 *
 * Supports both SQLite (development) and PostgreSQL (production/Supabase)
 * Uses cross-database compatible helpers from connections.js
 */

const CategoryCrawler = require("./categoryCrawler");
const CategoryMapper = require("./categoryMapper");
const { category: categoryLogger } = require("./logger");
const { getRedisService } = require("./redisService");
const { getOne, getAll, isPostgres } = require("../db/connections");

/**
 * Get placeholder for parameterized queries
 */
const p = (index) => isPostgres() ? `$${index}` : '?';

// 스케줄 간격 (밀리초)
const SCHEDULE = {
  FULL_CRAWL: 24 * 60 * 60 * 1000,     // 24시간마다 전체 크롤링 (새 카테고리 확인)
  VIEWER_UPDATE: 5 * 60 * 1000,         // 5분마다 시청자 수 업데이트
  STATS_RECORD: 15 * 60 * 1000,         // 15분마다 통계 기록
  MAPPING_REFRESH: 24 * 60 * 60 * 1000, // 24시간마다 매핑 갱신
};

class CategoryService {
  constructor(db, io = null) {
    this.db = db;
    this.io = io;
    this.crawler = new CategoryCrawler(db);
    this.mapper = new CategoryMapper(db);
    this.redis = getRedisService();

    // 스케줄러 인터벌 저장
    this.intervals = {
      fullCrawl: null,
      viewerUpdate: null,
      statsRecord: null,
      mappingRefresh: null,
    };

    // 메모리 캐시 (fallback when Redis unavailable)
    this.memoryCache = {
      games: null,
      gamesUpdatedAt: null,
      categories: null,
      categoriesUpdatedAt: null,
    };

    // 캐시 TTL (5분)
    this.cacheTTL = 5 * 60 * 1000;
    this.cacheTTLSec = 5 * 60; // For Redis (seconds)
  }

  /**
   * Check if Redis is available
   * @returns {boolean}
   */
  isRedisAvailable() {
    return this.redis.getIsConnected();
  }

  /**
   * Get cached data from Redis or memory
   * @param {string} key - Cache key
   * @returns {Promise<any>}
   */
  async getCached(key) {
    if (this.isRedisAvailable()) {
      const data = await this.redis.getCategoryCache(key);
      if (data) {
        categoryLogger.debug("Cache hit (Redis)", { key });
        return data;
      }
    }

    // Memory fallback
    const memKey = key === "games" ? "games" : "categories";
    const updatedKey = key === "games" ? "gamesUpdatedAt" : "categoriesUpdatedAt";

    if (
      this.memoryCache[memKey] &&
      this.memoryCache[updatedKey] &&
      Date.now() - this.memoryCache[updatedKey] < this.cacheTTL
    ) {
      categoryLogger.debug("Cache hit (memory)", { key });
      return this.memoryCache[memKey];
    }

    return null;
  }

  /**
   * Set cached data to Redis and memory
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   */
  async setCached(key, data) {
    const memKey = key === "games" ? "games" : "categories";
    const updatedKey = key === "games" ? "gamesUpdatedAt" : "categoriesUpdatedAt";

    // Always update memory cache
    this.memoryCache[memKey] = data;
    this.memoryCache[updatedKey] = Date.now();

    // Try Redis
    if (this.isRedisAvailable()) {
      const success = await this.redis.setCategoryCache(key, data, this.cacheTTLSec);
      if (success) {
        categoryLogger.debug("Cached to Redis", { key });
      }
    }
  }

  /**
   * 서비스 초기화 및 스케줄러 시작
   */
  async initialize() {
    categoryLogger.info("Initializing...");

    try {
      // 초기 크롤링 실행
      await this.crawler.crawlAllPlatforms();

      // 자동 매핑 실행
      await this.mapper.mapAllUnmapped();

      // 스케줄러 시작
      this.startSchedulers();

      categoryLogger.info("Initialization complete");
    } catch (error) {
      categoryLogger.error("Initialization error", { error: error.message });
    }
  }

  /**
   * 스케줄러 시작
   */
  startSchedulers() {
    // 전체 크롤링 (6시간마다)
    this.intervals.fullCrawl = setInterval(async () => {
      categoryLogger.info("Running scheduled full crawl...");
      try {
        await this.crawler.crawlAllPlatforms();
        await this.crawler.deactivateStaleCategories();
        await this.invalidateCache();
      } catch (error) {
        categoryLogger.error("Full crawl error", { error: error.message });
      }
    }, SCHEDULE.FULL_CRAWL);

    // 시청자 수 업데이트 (5분마다)
    this.intervals.viewerUpdate = setInterval(async () => {
      try {
        await this.crawler.updateViewerCounts();
        await this.invalidateCache();

        // Socket.io로 실시간 알림
        if (this.io) {
          this.io.emit("categories-updated", { type: "viewers" });
        }
      } catch (error) {
        categoryLogger.error("Viewer update error", { error: error.message });
      }
    }, SCHEDULE.VIEWER_UPDATE);

    // 통계 기록 (15분마다)
    this.intervals.statsRecord = setInterval(async () => {
      try {
        await this.crawler.recordAllStats();
      } catch (error) {
        categoryLogger.error("Stats record error", { error: error.message });
      }
    }, SCHEDULE.STATS_RECORD);

    // 매핑 갱신 (24시간마다)
    this.intervals.mappingRefresh = setInterval(async () => {
      categoryLogger.info("Running scheduled mapping refresh...");
      try {
        await this.mapper.mapAllUnmapped();
        await this.invalidateCache();
      } catch (error) {
        categoryLogger.error("Mapping refresh error", { error: error.message });
      }
    }, SCHEDULE.MAPPING_REFRESH);

    categoryLogger.info("Schedulers started");
  }

  /**
   * 서비스 종료
   */
  shutdown() {
    categoryLogger.info("Shutting down...");

    Object.values(this.intervals).forEach((interval) => {
      if (interval) clearInterval(interval);
    });

    this.intervals = {
      fullCrawl: null,
      viewerUpdate: null,
      statsRecord: null,
      mappingRefresh: null,
    };
  }

  /**
   * 캐시 무효화
   */
  async invalidateCache() {
    // Clear memory cache
    this.memoryCache.games = null;
    this.memoryCache.gamesUpdatedAt = null;
    this.memoryCache.categories = null;
    this.memoryCache.categoriesUpdatedAt = null;

    // Clear Redis cache
    if (this.isRedisAvailable()) {
      try {
        await this.redis.invalidateCategoryCache();
        categoryLogger.debug("Cache invalidated (Redis)");
      } catch (error) {
        categoryLogger.warn("Failed to invalidate Redis cache", { error: error.message });
      }
    }
  }

  /**
   * 강제 새로고침
   */
  async forceRefresh() {
    categoryLogger.info("Force refreshing...");
    await this.crawler.crawlAllPlatforms();
    await this.mapper.mapAllUnmapped();
    await this.invalidateCache();
    return { success: true };
  }

  /**
   * 통합 게임 카탈로그 조회
   * @param {Object} options
   * @returns {Promise<Array>}
   */
  async getGameCatalog(options = {}) {
    const { sort = "viewers", order = "desc", limit = 100, genre = null, search = null } = options;

    // 캐시 확인 (Redis or memory)
    const cached = await this.getCached("games");
    if (cached) {
      return this.filterAndSortGames(cached, { sort, order, limit, genre, search });
    }

    // Cross-database string aggregation
    const concatPlatforms = isPostgres()
      ? `STRING_AGG(DISTINCT pc.platform, ',')`
      : `GROUP_CONCAT(DISTINCT pc.platform)`;

    // Cross-database boolean comparison
    const isActiveCheck = isPostgres() ? `pc.is_active = TRUE` : `pc.is_active = 1`;

    // 이미지 우선순위: SOOP 카테고리 이미지 > Chzzk 포스터 이미지 > unified_games 이미지
    const sql = `
      SELECT
        ug.id,
        ug.name,
        ug.name_kr,
        ug.genre,
        ug.genre_kr,
        ug.developer,
        ug.release_date,
        ug.description,
        ug.image_url,
        ug.is_verified,
        ug.created_at,
        COALESCE(SUM(pc.viewer_count), 0) as total_viewers,
        COALESCE(SUM(pc.streamer_count), 0) as total_streamers,
        ${concatPlatforms} as platforms,
        MAX(CASE WHEN pc.platform = 'soop' THEN pc.thumbnail_url END) as soop_thumbnail,
        MAX(CASE WHEN pc.platform = 'chzzk' THEN pc.thumbnail_url END) as chzzk_thumbnail
      FROM unified_games ug
      LEFT JOIN category_game_mappings cgm ON ug.id = cgm.unified_game_id
      LEFT JOIN platform_categories pc ON cgm.platform = pc.platform
        AND cgm.platform_category_id = pc.platform_category_id
        AND ${isActiveCheck}
      GROUP BY ug.id
      ORDER BY total_viewers DESC
    `;

    const rows = await getAll(sql, []);

    const games = (rows || []).map((row) => ({
      id: row.id,
      name: row.name,
      nameKr: row.name_kr,
      genre: row.genre,
      genreKr: row.genre_kr,
      developer: row.developer,
      releaseDate: row.release_date,
      description: row.description,
      imageUrl: row.soop_thumbnail || row.chzzk_thumbnail || row.image_url || null,
      isVerified: row.is_verified === 1,
      totalViewers: row.total_viewers,
      totalStreamers: row.total_streamers,
      platforms: row.platforms ? row.platforms.split(",") : [],
      createdAt: row.created_at,
      // 자동 fetch를 위한 플랫폼 정보 (내부용)
      _soopThumbnail: row.soop_thumbnail,
      _chzzkThumbnail: row.chzzk_thumbnail,
    }));

    // 캐시 업데이트 (Redis and memory)
    await this.setCached("games", games);

    // 이미지가 없는 게임들 백그라운드에서 자동 fetch (응답 차단 안함)
    const gamesWithoutImages = games.filter(g => !g.imageUrl && g.platforms.length > 0);
    if (gamesWithoutImages.length > 0) {
      categoryLogger.debug("이미지 없는 게임 발견, 백그라운드 fetch 시작", {
        count: gamesWithoutImages.length,
        games: gamesWithoutImages.slice(0, 5).map(g => g.nameKr || g.name)
      });

      // 비동기로 이미지 fetch (응답 기다리지 않음)
      this.fetchMissingImagesBackground(gamesWithoutImages).catch(err => {
        categoryLogger.error("백그라운드 이미지 fetch 실패", { error: err.message });
      });
    }

    return this.filterAndSortGames(games, { sort, order, limit, genre, search });
  }

  /**
   * 이미지가 없는 게임들의 포스터 이미지를 백그라운드에서 가져오기
   * @param {Array} gamesWithoutImages - 이미지가 없는 게임 목록
   */
  async fetchMissingImagesBackground(gamesWithoutImages) {
    const maxConcurrent = 5; // 동시 요청 제한
    let fetched = 0;

    for (let i = 0; i < gamesWithoutImages.length; i += maxConcurrent) {
      const batch = gamesWithoutImages.slice(i, i + maxConcurrent);

      await Promise.all(
        batch.map(async (game) => {
          // 게임의 플랫폼 카테고리 정보 조회
          const platformInfo = await this.getGamePlatformInfo(game.id);

          for (const platform of platformInfo) {
            if (platform.thumbnail_url) continue; // 이미 이미지 있음

            const fetchedUrl = await this.crawler.fetchAndSavePosterImage(
              platform.platform,
              platform.platform_category_id,
              platform.category_type || "GAME"
            );

            if (fetchedUrl) {
              fetched++;
              break; // 하나만 가져오면 됨
            }
          }
        })
      );
    }

    if (fetched > 0) {
      categoryLogger.info("백그라운드 이미지 fetch 완료", { fetched });
      await this.invalidateCache(); // 캐시 무효화
    }
  }

  /**
   * 게임의 플랫폼 카테고리 정보 조회 (내부용)
   * @param {number} gameId
   * @returns {Promise<Array>}
   */
  async getGamePlatformInfo(gameId) {
    // Cross-database boolean comparison
    const isActiveValue = isPostgres() ? 'TRUE' : '1';

    const sql = `
      SELECT pc.platform, pc.platform_category_id, pc.category_type, pc.thumbnail_url
      FROM platform_categories pc
      JOIN category_game_mappings cgm
        ON pc.platform = cgm.platform AND pc.platform_category_id = cgm.platform_category_id
      WHERE cgm.unified_game_id = ${p(1)} AND pc.is_active = ${isActiveValue}
    `;

    return await getAll(sql, [gameId]);
  }

  /**
   * 게임 목록 필터링 및 정렬
   */
  filterAndSortGames(games, { sort, order, limit, genre, search }) {
    let result = [...games];

    // 장르 필터
    if (genre) {
      result = result.filter(
        (g) =>
          g.genre?.toLowerCase() === genre.toLowerCase() ||
          g.genreKr === genre
      );
    }

    // 검색 필터
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (g) =>
          g.name?.toLowerCase().includes(searchLower) ||
          g.nameKr?.includes(search)
      );
    }

    // 정렬
    const sortKey = sort === "viewers" ? "totalViewers" : sort === "streamers" ? "totalStreamers" : "name";
    result.sort((a, b) => {
      const aVal = a[sortKey] || 0;
      const bVal = b[sortKey] || 0;
      return order === "desc" ? bVal - aVal : aVal - bVal;
    });

    // 제한
    if (limit) {
      result = result.slice(0, limit);
    }

    return result;
  }

  /**
   * 단일 게임 상세 조회
   * @param {number} gameId
   * @returns {Promise<Object|null>}
   */
  async getGameDetail(gameId) {
    // 게임 기본 정보
    const game = await getOne(`SELECT * FROM unified_games WHERE id = ${p(1)}`, [gameId]);

    if (!game) {
      return null;
    }

    // Cross-database boolean comparison
    const isActiveValue = isPostgres() ? 'TRUE' : '1';

    // 플랫폼별 카테고리 정보
    const platformsSql = `
      SELECT pc.*, cgm.confidence, cgm.is_manual
      FROM platform_categories pc
      JOIN category_game_mappings cgm
        ON pc.platform = cgm.platform AND pc.platform_category_id = cgm.platform_category_id
      WHERE cgm.unified_game_id = ${p(1)} AND pc.is_active = ${isActiveValue}
    `;

    const platforms = await getAll(platformsSql, [gameId]);

    // 이미지 우선순위: SOOP 썸네일 > Chzzk 썸네일 > 기본 이미지
    const soopPlatform = (platforms || []).find(pl => pl.platform === 'soop');
    const chzzkPlatform = (platforms || []).find(pl => pl.platform === 'chzzk');
    let imageUrl = soopPlatform?.thumbnail_url || chzzkPlatform?.thumbnail_url || game.image_url || null;

    // 이미지가 없으면 자동으로 가져오기 시도
    if (!imageUrl && platforms && platforms.length > 0) {
      categoryLogger.debug("이미지 없음, 자동 fetch 시도", { gameId, gameName: game.name });

      for (const platform of platforms) {
        try {
          const fetchedUrl = await this.crawler.fetchAndSavePosterImage(
            platform.platform,
            platform.platform_category_id,
            platform.category_type || "GAME"
          );
          if (fetchedUrl) {
            imageUrl = fetchedUrl;
            // 캐시 무효화 (다음 조회 시 새 이미지 반영)
            await this.invalidateCache();
            break;
          }
        } catch (fetchError) {
          categoryLogger.debug("자동 이미지 fetch 실패", {
            platform: platform.platform,
            error: fetchError.message
          });
        }
      }
    }

    return {
      id: game.id,
      name: game.name,
      nameKr: game.name_kr,
      genre: game.genre,
      genreKr: game.genre_kr,
      developer: game.developer,
      releaseDate: game.release_date,
      description: game.description,
      imageUrl: imageUrl,
      isVerified: game.is_verified === 1,
      createdAt: game.created_at,
      updatedAt: game.updated_at,
      platforms: (platforms || []).map((pl) => ({
        platform: pl.platform,
        categoryId: pl.platform_category_id,
        categoryName: pl.platform_category_name,
        categoryType: pl.category_type,
        thumbnailUrl: pl.thumbnail_url,
        viewerCount: pl.viewer_count,
        streamerCount: pl.streamer_count,
        confidence: pl.confidence,
        isManual: pl.is_manual === 1,
      })),
      totalViewers: (platforms || []).reduce((sum, pl) => sum + (pl.viewer_count || 0), 0),
      totalStreamers: (platforms || []).reduce((sum, pl) => sum + (pl.streamer_count || 0), 0),
    };
  }

  /**
   * 게임 통계 조회 (시계열)
   * @param {number} gameId
   * @param {string} period - '1h', '24h', '7d', '30d'
   * @returns {Promise<Array>}
   */
  async getGameStats(gameId, period = "24h") {
    // Cross-database interval calculation
    const periodMapSQLite = {
      "1h": "-1 hours",
      "24h": "-24 hours",
      "7d": "-7 days",
      "30d": "-30 days",
    };
    const periodMapPostgres = {
      "1h": "1 hour",
      "24h": "24 hours",
      "7d": "7 days",
      "30d": "30 days",
    };

    const timeFilter = isPostgres()
      ? `NOW() - INTERVAL '${periodMapPostgres[period] || "24 hours"}'`
      : `datetime('now', '${periodMapSQLite[period] || "-24 hours"}')`;

    const sql = `
      SELECT
        cs.recorded_at,
        SUM(cs.viewer_count) as total_viewers,
        SUM(cs.streamer_count) as total_streamers
      FROM category_stats cs
      JOIN category_game_mappings cgm
        ON cs.platform = cgm.platform AND cs.platform_category_id = cgm.platform_category_id
      WHERE cgm.unified_game_id = ${p(1)}
        AND cs.recorded_at >= ${timeFilter}
      GROUP BY cs.recorded_at
      ORDER BY cs.recorded_at ASC
    `;

    return await getAll(sql, [gameId]);
  }

  /**
   * 플랫폼별 카테고리 목록 조회
   * @param {string} platform
   * @returns {Promise<Array>}
   */
  async getPlatformCategories(platform) {
    // Cross-database boolean comparison
    const isActiveValue = isPostgres() ? 'TRUE' : '1';

    const sql = `
      SELECT pc.*, ug.name as unified_name, ug.name_kr as unified_name_kr
      FROM platform_categories pc
      LEFT JOIN category_game_mappings cgm
        ON pc.platform = cgm.platform AND pc.platform_category_id = cgm.platform_category_id
      LEFT JOIN unified_games ug ON cgm.unified_game_id = ug.id
      WHERE pc.platform = ${p(1)} AND pc.is_active = ${isActiveValue}
      ORDER BY pc.viewer_count DESC
    `;

    return await getAll(sql, [platform]);
  }

  /**
   * 카탈로그 통계 조회
   * @returns {Promise<Object>}
   */
  async getCatalogStats() {
    // Cross-database boolean comparison
    const isActiveValue = isPostgres() ? 'TRUE' : '1';
    const isVerifiedValue = isPostgres() ? 'TRUE' : '1';

    // 활성 방송이 있는 카테고리만 카운트 (viewer_count > 0 OR streamer_count > 0)
    // 각 플랫폼별로 독립적으로 카운트 (중복 게임은 양쪽에 모두 카운트됨)
    const sql = `
      SELECT
        (SELECT COUNT(*) FROM unified_games) as total_games,
        (SELECT COUNT(*) FROM unified_games WHERE is_verified = ${isVerifiedValue}) as verified_games,
        (SELECT COUNT(*) FROM platform_categories WHERE is_active = ${isActiveValue} AND (viewer_count > 0 OR streamer_count > 0)) as total_categories,
        (SELECT COUNT(*) FROM platform_categories WHERE platform = 'soop' AND is_active = ${isActiveValue} AND (viewer_count > 0 OR streamer_count > 0)) as soop_categories,
        (SELECT COUNT(*) FROM platform_categories WHERE platform = 'chzzk' AND is_active = ${isActiveValue} AND (viewer_count > 0 OR streamer_count > 0)) as chzzk_categories,
        (SELECT COALESCE(SUM(viewer_count), 0) FROM platform_categories WHERE is_active = ${isActiveValue}) as total_viewers,
        (SELECT COALESCE(SUM(streamer_count), 0) FROM platform_categories WHERE is_active = ${isActiveValue}) as total_streamers,
        (SELECT COUNT(DISTINCT cgm1.unified_game_id)
         FROM category_game_mappings cgm1
         JOIN category_game_mappings cgm2 ON cgm1.unified_game_id = cgm2.unified_game_id
         JOIN platform_categories pc1 ON cgm1.platform = pc1.platform AND cgm1.platform_category_id = pc1.platform_category_id
         JOIN platform_categories pc2 ON cgm2.platform = pc2.platform AND cgm2.platform_category_id = pc2.platform_category_id
         WHERE cgm1.platform = 'soop' AND cgm2.platform = 'chzzk'
           AND pc1.is_active = ${isActiveValue} AND pc2.is_active = ${isActiveValue}
           AND (pc1.viewer_count > 0 OR pc1.streamer_count > 0)
           AND (pc2.viewer_count > 0 OR pc2.streamer_count > 0)
        ) as shared_categories
    `;

    const row = await getOne(sql, []);
    return row || {};
  }

  /**
   * 수동 매핑 설정
   * @param {string} platform
   * @param {string} platformCategoryId
   * @param {number} unifiedGameId
   */
  async setManualMapping(platform, platformCategoryId, unifiedGameId) {
    await this.mapper.setManualMapping(platform, platformCategoryId, unifiedGameId);
    await this.invalidateCache();
  }

  /**
   * 매핑 문제 목록 (관리자용)
   * @returns {Promise<Object>}
   */
  async getMappingIssues() {
    const unmapped = await this.mapper.getUnmappedCategories();
    const lowConfidence = await this.mapper.getLowConfidenceMappings(0.9);

    return {
      unmapped,
      lowConfidence,
    };
  }

  /**
   * 상위 카테고리 일별 시청자 추이 조회
   * @param {number} limit - 상위 몇 개 카테고리 (기본: 20)
   * @param {number} days - 며칠간의 데이터 (기본: 7)
   * @returns {Promise<Object>} - { categories: [...], dailyData: [...] }
   */
  async getTopCategoriesDailyTrend(limit = 20, days = 7) {
    // 1. 상위 카테고리 목록 가져오기 (현재 총 시청자 기준)
    const isActiveValue = isPostgres() ? 'TRUE' : '1';
    const concatPlatforms = isPostgres()
      ? `STRING_AGG(DISTINCT pc.platform, ',')`
      : `GROUP_CONCAT(DISTINCT pc.platform)`;

    const topCategoriesSql = `
      SELECT
        ug.id,
        ug.name,
        ug.name_kr,
        COALESCE(SUM(pc.viewer_count), 0) as total_viewers,
        ${concatPlatforms} as platforms
      FROM unified_games ug
      LEFT JOIN category_game_mappings cgm ON ug.id = cgm.unified_game_id
      LEFT JOIN platform_categories pc ON cgm.platform = pc.platform
        AND cgm.platform_category_id = pc.platform_category_id
        AND pc.is_active = ${isActiveValue}
      GROUP BY ug.id
      HAVING COALESCE(SUM(pc.viewer_count), 0) > 0
      ORDER BY total_viewers DESC
      LIMIT ${p(1)}
    `;

    const topCategories = await getAll(topCategoriesSql, [limit]);

    if (!topCategories || topCategories.length === 0) {
      return { categories: [], dailyData: [] };
    }

    // 카테고리 ID 목록
    const categoryIds = topCategories.map(c => c.id);

    // 2. 일별 시청자 데이터 가져오기
    // PostgreSQL vs SQLite 날짜 포맷 차이 처리
    const dateFormat = isPostgres()
      ? `TO_CHAR(cs.recorded_at, 'YYYY-MM-DD')`
      : `DATE(cs.recorded_at)`;

    const timeFilter = isPostgres()
      ? `NOW() - INTERVAL '${days} days'`
      : `datetime('now', '-${days} days')`;

    // 카테고리별 일별 최대 시청자 수 집계
    const placeholders = categoryIds.map((_, i) => p(i + 1)).join(',');

    const dailyStatsSql = `
      SELECT
        ${dateFormat} as date,
        cgm.unified_game_id as game_id,
        MAX(cs.viewer_count) as max_viewers
      FROM category_stats cs
      JOIN category_game_mappings cgm
        ON cs.platform = cgm.platform AND cs.platform_category_id = cgm.platform_category_id
      WHERE cgm.unified_game_id IN (${placeholders})
        AND cs.recorded_at >= ${timeFilter}
      GROUP BY ${dateFormat}, cgm.unified_game_id
      ORDER BY date ASC
    `;

    const dailyStats = await getAll(dailyStatsSql, categoryIds);

    // 3. 데이터 변환: 날짜별로 각 카테고리의 시청자 수를 포함한 객체 배열로 변환
    const dateMap = new Map();

    for (const stat of dailyStats) {
      const date = stat.date;
      if (!dateMap.has(date)) {
        dateMap.set(date, { date });
      }
      dateMap.get(date)[`cat_${stat.game_id}`] = stat.max_viewers || 0;
    }

    // 날짜 정렬
    const dailyData = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // 카테고리 정보 포맷
    const categories = topCategories.map(c => ({
      id: c.id,
      name: c.name_kr || c.name,
      key: `cat_${c.id}`,
      totalViewers: c.total_viewers,
    }));

    return {
      categories,
      dailyData,
    };
  }
}

module.exports = CategoryService;
