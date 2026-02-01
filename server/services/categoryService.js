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
const IgdbService = require("./igdbService");
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
  IGDB_ENRICHMENT: 6 * 60 * 60 * 1000,  // 6시간마다 IGDB enrichment
};

class CategoryService {
  constructor(db, io = null) {
    this.db = db;
    this.io = io;
    this.crawler = new CategoryCrawler(db);
    this.mapper = new CategoryMapper(db);
    this.igdb = new IgdbService();
    this.redis = getRedisService();

    // 스케줄러 인터벌 저장
    this.intervals = {
      fullCrawl: null,
      viewerUpdate: null,
      statsRecord: null,
      mappingRefresh: null,
      igdbEnrichment: null,
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

      // IGDB enrichment (비동기, 서버 시작 차단 안함)
      if (this.igdb.isConfigured()) {
        this.igdb.enrichAllUnmatched().catch(err => {
          categoryLogger.error("Initial IGDB enrichment error", { error: err.message });
        });
      }

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

    // IGDB enrichment (6시간마다)
    if (this.igdb.isConfigured()) {
      this.intervals.igdbEnrichment = setInterval(async () => {
        categoryLogger.info("Running scheduled IGDB enrichment...");
        try {
          await this.igdb.enrichAllUnmatched();
          await this.igdb.refreshStaleData();
          await this.invalidateCache();
        } catch (error) {
          categoryLogger.error("IGDB enrichment error", { error: error.message });
        }
      }, SCHEDULE.IGDB_ENRICHMENT);
    }

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
      igdbEnrichment: null,
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

    // 이미지 우선순위: IGDB 커버 > SOOP 카테고리 이미지 > Chzzk 포스터 이미지 > unified_games 이미지
    const sql = `
      SELECT
        ug.id,
        ug.name,
        ug.name_kr,
        ug.genre,
        ug.genre_kr,
        ug.developer,
        ug.publisher,
        ug.release_date,
        ug.description,
        ug.summary,
        ug.image_url,
        ug.cover_url,
        ug.igdb_url,
        ug.igdb_rating,
        ug.igdb_followers,
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
      publisher: row.publisher,
      releaseDate: row.release_date,
      description: row.summary || row.description,
      imageUrl: row.cover_url || row.soop_thumbnail || row.chzzk_thumbnail || row.image_url || null,
      coverUrl: row.cover_url || null,
      igdbUrl: row.igdb_url || null,
      igdbRating: row.igdb_rating || null,
      igdbFollowers: row.igdb_followers || null,
      isVerified: row.is_verified === 1,
      totalViewers: row.total_viewers,
      totalStreamers: row.total_streamers,
      platforms: row.platforms ? row.platforms.split(",") : [],
      createdAt: row.created_at,
      // 자동 fetch를 위한 플랫폼 정보 (내부용)
      _soopThumbnail: row.soop_thumbnail,
      _chzzkThumbnail: row.chzzk_thumbnail,
    }));

    // 장르 정보 일괄 조회 (N+1 방지)
    const allGenres = await getAll(
      "SELECT unified_game_id, genre_type, name, name_kr FROM game_genres ORDER BY unified_game_id, genre_type, name",
      []
    );
    const genreMap = new Map();
    for (const g of (allGenres || [])) {
      if (!genreMap.has(g.unified_game_id)) {
        genreMap.set(g.unified_game_id, { genres: [], themes: [] });
      }
      const entry = genreMap.get(g.unified_game_id);
      if (g.genre_type === 'genre') {
        entry.genres.push({ name: g.name, nameKr: g.name_kr });
      } else if (g.genre_type === 'theme') {
        entry.themes.push({ name: g.name, nameKr: g.name_kr });
      }
    }

    // 장르 정보를 게임에 추가
    for (const game of games) {
      const gInfo = genreMap.get(game.id);
      game.genres = gInfo?.genres || [];
      game.themes = gInfo?.themes || [];
    }

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

    // 이미지 우선순위: IGDB 커버 > SOOP 썸네일 > Chzzk 썸네일 > 기본 이미지
    const soopPlatform = (platforms || []).find(pl => pl.platform === 'soop');
    const chzzkPlatform = (platforms || []).find(pl => pl.platform === 'chzzk');
    let imageUrl = game.cover_url || soopPlatform?.thumbnail_url || chzzkPlatform?.thumbnail_url || game.image_url || null;

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

    // IGDB 장르/태그, 회사 정보 조회
    let genres = [];
    let companies = [];
    if (game.igdb_id) {
      [genres, companies] = await Promise.all([
        this.igdb.getGameGenres(gameId),
        this.igdb.getGameCompanies(gameId),
      ]);
    }

    return {
      id: game.id,
      name: game.name,
      nameKr: game.name_kr,
      genre: game.genre,
      genreKr: game.genre_kr,
      developer: game.developer,
      publisher: game.publisher,
      releaseDate: game.release_date,
      description: game.summary || game.description,
      summary: game.summary,
      imageUrl: imageUrl,
      coverUrl: game.cover_url || null,
      igdbUrl: game.igdb_url || null,
      igdbRating: game.igdb_rating || null,
      igdbRatingCount: game.igdb_rating_count || null,
      igdbFollowers: game.igdb_followers || null,
      genres: genres.filter(g => g.genre_type === 'genre').map(g => ({
        name: g.name,
        nameKr: g.name_kr,
      })),
      themes: genres.filter(g => g.genre_type === 'theme').map(g => ({
        name: g.name,
        nameKr: g.name_kr,
      })),
      companies: companies.map(c => ({
        name: c.name,
        role: c.role,
      })),
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

    // 7d/30d: 시간 단위로 집계하여 데이터 포인트 수 줄임 (620→168 for 7d)
    // 1h/24h: 원본 15분 간격 유지
    const needsHourlyBucket = period === '7d' || period === '30d';
    const timeBucket = needsHourlyBucket
      ? (isPostgres()
        ? `DATE_TRUNC('hour', cs.recorded_at)`
        : `strftime('%Y-%m-%d %H:00:00', cs.recorded_at)`)
      : 'cs.recorded_at';

    const sql = `
      SELECT
        ${timeBucket} as recorded_at,
        SUM(cs.viewer_count) / COUNT(DISTINCT cs.recorded_at) as total_viewers,
        SUM(cs.streamer_count) / COUNT(DISTINCT cs.recorded_at) as total_streamers
      FROM category_stats cs
      JOIN category_game_mappings cgm
        ON cs.platform = cgm.platform AND cs.platform_category_id = cgm.platform_category_id
      WHERE cgm.unified_game_id = ${p(1)}
        AND cs.recorded_at >= ${timeFilter}
      GROUP BY ${timeBucket}
      ORDER BY ${timeBucket} ASC
    `;

    return await getAll(sql, [gameId]);
  }

  /**
   * 카테고리 요약 통계 (현재 기간 + 이전 기간 비교)
   * 소프트콘 스타일 요약 데이터
   */
  async getGameSummaryStats(gameId, period = "24h") {
    const periodHours = { "24h": 24, "7d": 168, "30d": 720 };
    const hours = periodHours[period] || 24;

    const currentStart = isPostgres()
      ? `NOW() - INTERVAL '${hours} hours'`
      : `datetime('now', '-${hours} hours')`;
    const prevStart = isPostgres()
      ? `NOW() - INTERVAL '${hours * 2} hours'`
      : `datetime('now', '-${hours * 2} hours')`;
    const prevEnd = isPostgres()
      ? `NOW() - INTERVAL '${hours} hours'`
      : `datetime('now', '-${hours} hours')`;

    // 현재 기간 집계
    const currentSql = `
      SELECT
        MAX(sub.total_viewers) as peak_viewers,
        ROUND(AVG(sub.total_viewers)) as avg_viewers,
        MAX(sub.total_streamers) as peak_streamers,
        ROUND(AVG(sub.total_streamers)) as avg_streamers,
        COUNT(*) as data_points
      FROM (
        SELECT cs.recorded_at,
          SUM(cs.viewer_count) as total_viewers,
          SUM(cs.streamer_count) as total_streamers
        FROM category_stats cs
        JOIN category_game_mappings cgm
          ON cs.platform = cgm.platform AND cs.platform_category_id = cgm.platform_category_id
        WHERE cgm.unified_game_id = ${p(1)}
          AND cs.recorded_at >= ${currentStart}
        GROUP BY cs.recorded_at
      ) sub
    `;

    // 이전 기간 집계
    const prevSql = `
      SELECT
        MAX(sub.total_viewers) as peak_viewers,
        ROUND(AVG(sub.total_viewers)) as avg_viewers,
        MAX(sub.total_streamers) as peak_streamers,
        ROUND(AVG(sub.total_streamers)) as avg_streamers,
        COUNT(*) as data_points
      FROM (
        SELECT cs.recorded_at,
          SUM(cs.viewer_count) as total_viewers,
          SUM(cs.streamer_count) as total_streamers
        FROM category_stats cs
        JOIN category_game_mappings cgm
          ON cs.platform = cgm.platform AND cs.platform_category_id = cgm.platform_category_id
        WHERE cgm.unified_game_id = ${p(1)}
          AND cs.recorded_at >= ${prevStart}
          AND cs.recorded_at < ${prevEnd}
        GROUP BY cs.recorded_at
      ) sub
    `;

    // 어제 동시간 비교 (LIVE 카드용)
    const yesterdayStart = isPostgres()
      ? `NOW() - INTERVAL '24 hours' - INTERVAL '15 minutes'`
      : `datetime('now', '-24 hours', '-15 minutes')`;
    const yesterdayEnd = isPostgres()
      ? `NOW() - INTERVAL '24 hours' + INTERVAL '15 minutes'`
      : `datetime('now', '-24 hours', '+15 minutes')`;

    const liveSql = `
      SELECT
        SUM(cs.viewer_count) as yesterday_viewers,
        SUM(cs.streamer_count) as yesterday_streamers
      FROM category_stats cs
      JOIN category_game_mappings cgm
        ON cs.platform = cgm.platform AND cs.platform_category_id = cgm.platform_category_id
      WHERE cgm.unified_game_id = ${p(1)}
        AND cs.recorded_at = (
          SELECT cs2.recorded_at FROM category_stats cs2
          JOIN category_game_mappings cgm2
            ON cs2.platform = cgm2.platform AND cs2.platform_category_id = cgm2.platform_category_id
          WHERE cgm2.unified_game_id = ${p(1)}
            AND cs2.recorded_at >= ${yesterdayStart}
            AND cs2.recorded_at <= ${yesterdayEnd}
          ORDER BY cs2.recorded_at DESC
          LIMIT 1
        )
    `;

    const [current, previous, liveYesterday] = await Promise.all([
      getOne(currentSql, [gameId]),
      getOne(prevSql, [gameId]),
      getOne(liveSql, [gameId])
    ]);

    const calc = (cur, prev) => {
      const diff = (cur || 0) - (prev || 0);
      const percent = prev ? (diff / prev) * 100 : 0;
      return { diff: Math.round(diff * 10) / 10, percent: Math.round(percent * 10) / 10 };
    };

    const curViewership = Math.round((current?.avg_viewers || 0) * (current?.data_points || 0) * 15 / 60);
    const prevViewership = Math.round((previous?.avg_viewers || 0) * (previous?.data_points || 0) * 15 / 60);

    return {
      current: {
        peakViewers: Number(current?.peak_viewers || 0),
        avgViewers: Number(current?.avg_viewers || 0),
        viewership: curViewership,
        peakStreamers: Number(current?.peak_streamers || 0),
        avgStreamers: Number(current?.avg_streamers || 0),
      },
      previous: {
        peakViewers: Number(previous?.peak_viewers || 0),
        avgViewers: Number(previous?.avg_viewers || 0),
        viewership: prevViewership,
        peakStreamers: Number(previous?.peak_streamers || 0),
        avgStreamers: Number(previous?.avg_streamers || 0),
      },
      changes: {
        peakViewers: calc(current?.peak_viewers, previous?.peak_viewers),
        avgViewers: calc(current?.avg_viewers, previous?.avg_viewers),
        viewership: calc(curViewership, prevViewership),
        peakStreamers: calc(current?.peak_streamers, previous?.peak_streamers),
        avgStreamers: calc(current?.avg_streamers, previous?.avg_streamers),
      },
      liveComparison: {
        viewers: {
          yesterday: Number(liveYesterday?.yesterday_viewers || 0),
          ...calc(0, liveYesterday?.yesterday_viewers) // 현재 live 값은 프론트에서 주입
        },
        streamers: {
          yesterday: Number(liveYesterday?.yesterday_streamers || 0),
          ...calc(0, liveYesterday?.yesterday_streamers)
        }
      }
    };
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
   * 일별 통계 (통계 탭용)
   * @param {number} gameId
   * @param {string} period - '7d', '30d'
   * @returns {Promise<Array>}
   */
  async getGameDailyStats(gameId, period = '7d') {
    const days = period === '30d' ? 30 : 7;
    const timeFilter = isPostgres()
      ? `NOW() - INTERVAL '${days} days'`
      : `datetime('now', '-${days} days')`;
    const dateFormat = isPostgres()
      ? `TO_CHAR(cs.recorded_at, 'YYYY-MM-DD')`
      : `DATE(cs.recorded_at)`;

    const sql = `
      SELECT
        ${dateFormat} as date,
        MAX(sub.total_viewers) as peak_viewers,
        ROUND(AVG(sub.total_viewers)) as avg_viewers,
        MAX(sub.total_streamers) as peak_streamers,
        ROUND(AVG(sub.total_streamers)) as avg_streamers
      FROM (
        SELECT cs.recorded_at,
          SUM(cs.viewer_count) as total_viewers,
          SUM(cs.streamer_count) as total_streamers
        FROM category_stats cs
        JOIN category_game_mappings cgm
          ON cs.platform = cgm.platform AND cs.platform_category_id = cgm.platform_category_id
        WHERE cgm.unified_game_id = ${p(1)}
          AND cs.recorded_at >= ${timeFilter}
        GROUP BY cs.recorded_at
      ) sub
      GROUP BY ${dateFormat}
      ORDER BY date ASC
    `;

    return await getAll(sql, [gameId]);
  }

  /**
   * 플랫폼별 통계 (플랫폼별 통계 탭용)
   * @param {number} gameId
   * @param {string} period - '7d', '30d'
   * @returns {Promise<Object>} { timeSeries, summary }
   */
  async getGamePlatformStats(gameId, period = '7d') {
    const days = period === '30d' ? 30 : 7;
    const timeFilter = isPostgres()
      ? `NOW() - INTERVAL '${days} days'`
      : `datetime('now', '-${days} days')`;
    const dateFormat = isPostgres()
      ? `TO_CHAR(cs.recorded_at, 'YYYY-MM-DD')`
      : `DATE(cs.recorded_at)`;

    // 일별 + 플랫폼별 시계열
    const timeSeriesSql = `
      SELECT
        ${dateFormat} as date,
        cs.platform,
        MAX(cs.viewer_count) as peak_viewers,
        ROUND(AVG(cs.viewer_count)) as avg_viewers,
        MAX(cs.streamer_count) as peak_streamers,
        ROUND(AVG(cs.streamer_count)) as avg_streamers
      FROM category_stats cs
      JOIN category_game_mappings cgm
        ON cs.platform = cgm.platform AND cs.platform_category_id = cgm.platform_category_id
      WHERE cgm.unified_game_id = ${p(1)}
        AND cs.recorded_at >= ${timeFilter}
      GROUP BY ${dateFormat}, cs.platform
      ORDER BY date ASC, cs.platform
    `;

    // 플랫폼별 요약
    const summarySql = `
      SELECT
        cs.platform,
        MAX(cs.viewer_count) as peak_viewers,
        ROUND(AVG(cs.viewer_count)) as avg_viewers,
        MAX(cs.streamer_count) as peak_streamers,
        ROUND(AVG(cs.streamer_count)) as avg_streamers
      FROM category_stats cs
      JOIN category_game_mappings cgm
        ON cs.platform = cgm.platform AND cs.platform_category_id = cgm.platform_category_id
      WHERE cgm.unified_game_id = ${p(1)}
        AND cs.recorded_at >= ${timeFilter}
      GROUP BY cs.platform
      ORDER BY peak_viewers DESC
    `;

    const [timeSeries, summary] = await Promise.all([
      getAll(timeSeriesSql, [gameId]),
      getAll(summarySql, [gameId])
    ]);

    return { timeSeries, summary };
  }

  /**
   * 스트리머 랭킹 (스트리머 랭킹 탭용)
   * @param {number} gameId
   * @param {string} period - '7d', '30d'
   * @param {string} sortBy - 'peak', 'avg', 'count'
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async getGameStreamerRanking(gameId, period = '7d', sortBy = 'peak', limit = 50) {
    const days = period === '30d' ? 30 : 7;
    const timeFilter = isPostgres()
      ? `NOW() - INTERVAL '${days} days'`
      : `datetime('now', '-${days} days')`;

    const durationCalc = isPostgres()
      ? `ROUND(SUM(EXTRACT(EPOCH FROM (COALESCE(bs.segment_ended_at, NOW()) - bs.segment_started_at)) / 60))`
      : `ROUND(SUM((JULIANDAY(COALESCE(bs.segment_ended_at, datetime('now'))) - JULIANDAY(bs.segment_started_at)) * 1440))`;

    const orderBy = sortBy === 'avg' ? 'avg_viewers' : sortBy === 'count' ? 'broadcast_count' : 'peak_viewers';

    const sql = `
      SELECT
        p.id as person_id,
        COALESCE(p.nickname, p.platform_user_id) as nickname,
        p.profile_image_url,
        bs.platform,
        MAX(bs.peak_viewer_count) as peak_viewers,
        ROUND(AVG(bs.avg_viewer_count)) as avg_viewers,
        COUNT(DISTINCT b.id) as broadcast_count,
        ${durationCalc} as total_minutes
      FROM broadcast_segments bs
      JOIN broadcasts b ON bs.broadcast_id = b.id
      JOIN persons p ON b.broadcaster_person_id = p.id
      JOIN category_game_mappings cgm
        ON bs.platform = cgm.platform AND bs.category_id = cgm.platform_category_id
      WHERE cgm.unified_game_id = ${p(1)}
        AND bs.segment_started_at >= ${timeFilter}
      GROUP BY p.id, p.nickname, p.platform_user_id, p.profile_image_url, bs.platform
      ORDER BY ${orderBy} DESC
      LIMIT ${p(2)}
    `;

    return await getAll(sql, [gameId, limit]);
  }

  /**
   * 성장 랭킹 (성장 랭킹 탭용)
   * @param {number} gameId
   * @param {string} period - '7d', '30d'
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async getGameGrowthRanking(gameId, period = '7d', limit = 50) {
    const days = period === '30d' ? 30 : 7;
    const currentStart = isPostgres()
      ? `NOW() - INTERVAL '${days} days'`
      : `datetime('now', '-${days} days')`;
    const prevStart = isPostgres()
      ? `NOW() - INTERVAL '${days * 2} days'`
      : `datetime('now', '-${days * 2} days')`;
    const prevEnd = isPostgres()
      ? `NOW() - INTERVAL '${days} days'`
      : `datetime('now', '-${days} days')`;

    // 현재 기간 스트리머별 평균
    const currentSql = `
      SELECT
        p.id as person_id, COALESCE(p.nickname, p.platform_user_id) as nickname, p.profile_image_url, bs.platform,
        ROUND(AVG(bs.avg_viewer_count)) as avg_viewers,
        COUNT(DISTINCT b.id) as broadcast_count
      FROM broadcast_segments bs
      JOIN broadcasts b ON bs.broadcast_id = b.id
      JOIN persons p ON b.broadcaster_person_id = p.id
      JOIN category_game_mappings cgm
        ON bs.platform = cgm.platform AND bs.category_id = cgm.platform_category_id
      WHERE cgm.unified_game_id = ${p(1)}
        AND bs.segment_started_at >= ${currentStart}
      GROUP BY p.id, p.nickname, p.platform_user_id, p.profile_image_url, bs.platform
    `;

    // 이전 기간 스트리머별 평균
    const prevSql = `
      SELECT
        p.id as person_id,
        ROUND(AVG(bs.avg_viewer_count)) as avg_viewers
      FROM broadcast_segments bs
      JOIN broadcasts b ON bs.broadcast_id = b.id
      JOIN persons p ON b.broadcaster_person_id = p.id
      JOIN category_game_mappings cgm
        ON bs.platform = cgm.platform AND bs.category_id = cgm.platform_category_id
      WHERE cgm.unified_game_id = ${p(1)}
        AND bs.segment_started_at >= ${prevStart}
        AND bs.segment_started_at < ${prevEnd}
      GROUP BY p.id
    `;

    const [currentData, prevData] = await Promise.all([
      getAll(currentSql, [gameId]),
      getAll(prevSql, [gameId])
    ]);

    const prevMap = new Map((prevData || []).map(r => [r.person_id, r.avg_viewers]));

    const results = (currentData || []).map(cur => {
      const prev = prevMap.get(cur.person_id) || 0;
      const growth = prev > 0 ? ((cur.avg_viewers - prev) / prev) * 100 : (cur.avg_viewers > 0 ? 100 : 0);
      return {
        ...cur,
        prev_avg_viewers: Number(prev),
        growth: Math.round(growth * 10) / 10
      };
    });

    results.sort((a, b) => b.growth - a.growth);
    return results.slice(0, limit);
  }

  /**
   * 랭킹 히스토리 (특정 날짜 스냅샷)
   * @param {number} gameId
   * @param {string} date - 'YYYY-MM-DD'
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async getGameRankingHistory(gameId, date, limit = 50) {
    // date가 없으면 어제 날짜 사용
    if (!date) {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      date = d.toISOString().split('T')[0];
    }

    const dateStart = isPostgres()
      ? `'${date}'::date`
      : `'${date}'`;
    const dateEnd = isPostgres()
      ? `'${date}'::date + INTERVAL '1 day'`
      : `datetime('${date}', '+1 day')`;

    const sql = `
      SELECT
        p.id as person_id,
        p.nickname,
        p.profile_image_url,
        b.platform,
        b.title,
        MAX(bs.peak_viewer_count) as peak_viewers,
        ROUND(AVG(bs.avg_viewer_count)) as avg_viewers,
        MIN(b.started_at) as started_at
      FROM broadcast_segments bs
      JOIN broadcasts b ON bs.broadcast_id = b.id
      JOIN persons p ON b.broadcaster_person_id = p.id
      JOIN category_game_mappings cgm
        ON bs.platform = cgm.platform AND bs.category_id = cgm.platform_category_id
      WHERE cgm.unified_game_id = ${p(1)}
        AND bs.segment_started_at >= ${dateStart}
        AND bs.segment_started_at < ${dateEnd}
      GROUP BY p.id, p.nickname, p.profile_image_url, b.platform, b.title
      ORDER BY peak_viewers DESC
      LIMIT ${p(2)}
    `;

    return await getAll(sql, [gameId, limit]);
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
