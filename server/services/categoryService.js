/**
 * CategoryService - 카테고리 크롤링 메인 서비스
 *
 * CategoryCrawler와 CategoryMapper를 조율하고,
 * 스케줄링과 API를 제공합니다.
 */

const CategoryCrawler = require("./categoryCrawler");
const CategoryMapper = require("./categoryMapper");

// 스케줄 간격 (밀리초)
const SCHEDULE = {
  FULL_CRAWL: 6 * 60 * 60 * 1000,      // 6시간마다 전체 크롤링
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

    // 스케줄러 인터벌 저장
    this.intervals = {
      fullCrawl: null,
      viewerUpdate: null,
      statsRecord: null,
      mappingRefresh: null,
    };

    // 메모리 캐시
    this.cache = {
      games: null,
      gamesUpdatedAt: null,
      categories: null,
      categoriesUpdatedAt: null,
    };

    // 캐시 TTL (5분)
    this.cacheTTL = 5 * 60 * 1000;
  }

  /**
   * 서비스 초기화 및 스케줄러 시작
   */
  async initialize() {
    console.log("[categoryService] Initializing...");

    try {
      // 초기 크롤링 실행
      await this.crawler.crawlAllPlatforms();

      // 자동 매핑 실행
      await this.mapper.mapAllUnmapped();

      // 스케줄러 시작
      this.startSchedulers();

      console.log("[categoryService] Initialization complete");
    } catch (error) {
      console.error("[categoryService] Initialization error:", error.message);
    }
  }

  /**
   * 스케줄러 시작
   */
  startSchedulers() {
    // 전체 크롤링 (6시간마다)
    this.intervals.fullCrawl = setInterval(async () => {
      console.log("[categoryService] Running scheduled full crawl...");
      try {
        await this.crawler.crawlAllPlatforms();
        await this.crawler.deactivateStaleCategories();
        this.invalidateCache();
      } catch (error) {
        console.error("[categoryService] Full crawl error:", error.message);
      }
    }, SCHEDULE.FULL_CRAWL);

    // 시청자 수 업데이트 (5분마다)
    this.intervals.viewerUpdate = setInterval(async () => {
      try {
        await this.crawler.updateViewerCounts();
        this.invalidateCache();

        // Socket.io로 실시간 알림
        if (this.io) {
          this.io.emit("categories-updated", { type: "viewers" });
        }
      } catch (error) {
        console.error("[categoryService] Viewer update error:", error.message);
      }
    }, SCHEDULE.VIEWER_UPDATE);

    // 통계 기록 (15분마다)
    this.intervals.statsRecord = setInterval(async () => {
      try {
        await this.crawler.recordAllStats();
      } catch (error) {
        console.error("[categoryService] Stats record error:", error.message);
      }
    }, SCHEDULE.STATS_RECORD);

    // 매핑 갱신 (24시간마다)
    this.intervals.mappingRefresh = setInterval(async () => {
      console.log("[categoryService] Running scheduled mapping refresh...");
      try {
        await this.mapper.mapAllUnmapped();
        this.invalidateCache();
      } catch (error) {
        console.error("[categoryService] Mapping refresh error:", error.message);
      }
    }, SCHEDULE.MAPPING_REFRESH);

    console.log("[categoryService] Schedulers started");
  }

  /**
   * 서비스 종료
   */
  shutdown() {
    console.log("[categoryService] Shutting down...");

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
  invalidateCache() {
    this.cache.games = null;
    this.cache.gamesUpdatedAt = null;
    this.cache.categories = null;
    this.cache.categoriesUpdatedAt = null;
  }

  /**
   * 강제 새로고침
   */
  async forceRefresh() {
    console.log("[categoryService] Force refreshing...");
    await this.crawler.crawlAllPlatforms();
    await this.mapper.mapAllUnmapped();
    this.invalidateCache();
    return { success: true };
  }

  /**
   * 통합 게임 카탈로그 조회
   * @param {Object} options
   * @returns {Promise<Array>}
   */
  async getGameCatalog(options = {}) {
    const { sort = "viewers", order = "desc", limit = 100, genre = null, search = null } = options;

    // 캐시 확인
    if (
      this.cache.games &&
      this.cache.gamesUpdatedAt &&
      Date.now() - this.cache.gamesUpdatedAt < this.cacheTTL
    ) {
      return this.filterAndSortGames(this.cache.games, { sort, order, limit, genre, search });
    }

    return new Promise((resolve, reject) => {
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
          GROUP_CONCAT(DISTINCT pc.platform) as platforms
        FROM unified_games ug
        LEFT JOIN category_game_mappings cgm ON ug.id = cgm.unified_game_id
        LEFT JOIN platform_categories pc ON cgm.platform = pc.platform
          AND cgm.platform_category_id = pc.platform_category_id
          AND pc.is_active = 1
        GROUP BY ug.id
        ORDER BY total_viewers DESC
      `;

      this.db.all(sql, [], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        const games = (rows || []).map((row) => ({
          id: row.id,
          name: row.name,
          nameKr: row.name_kr,
          genre: row.genre,
          genreKr: row.genre_kr,
          developer: row.developer,
          releaseDate: row.release_date,
          description: row.description,
          imageUrl: row.image_url,
          isVerified: row.is_verified === 1,
          totalViewers: row.total_viewers,
          totalStreamers: row.total_streamers,
          platforms: row.platforms ? row.platforms.split(",") : [],
          createdAt: row.created_at,
        }));

        // 캐시 업데이트
        this.cache.games = games;
        this.cache.gamesUpdatedAt = Date.now();

        resolve(this.filterAndSortGames(games, { sort, order, limit, genre, search }));
      });
    });
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
    return new Promise((resolve, reject) => {
      // 게임 기본 정보
      const gameSql = `SELECT * FROM unified_games WHERE id = ?`;

      this.db.get(gameSql, [gameId], async (err, game) => {
        if (err) {
          reject(err);
          return;
        }

        if (!game) {
          resolve(null);
          return;
        }

        // 플랫폼별 카테고리 정보
        const platformsSql = `
          SELECT pc.*, cgm.confidence, cgm.is_manual
          FROM platform_categories pc
          JOIN category_game_mappings cgm
            ON pc.platform = cgm.platform AND pc.platform_category_id = cgm.platform_category_id
          WHERE cgm.unified_game_id = ? AND pc.is_active = 1
        `;

        this.db.all(platformsSql, [gameId], (err2, platforms) => {
          if (err2) {
            reject(err2);
            return;
          }

          resolve({
            id: game.id,
            name: game.name,
            nameKr: game.name_kr,
            genre: game.genre,
            genreKr: game.genre_kr,
            developer: game.developer,
            releaseDate: game.release_date,
            description: game.description,
            imageUrl: game.image_url,
            isVerified: game.is_verified === 1,
            createdAt: game.created_at,
            updatedAt: game.updated_at,
            platforms: (platforms || []).map((p) => ({
              platform: p.platform,
              categoryId: p.platform_category_id,
              categoryName: p.platform_category_name,
              categoryType: p.category_type,
              thumbnailUrl: p.thumbnail_url,
              viewerCount: p.viewer_count,
              streamerCount: p.streamer_count,
              confidence: p.confidence,
              isManual: p.is_manual === 1,
            })),
            totalViewers: (platforms || []).reduce((sum, p) => sum + (p.viewer_count || 0), 0),
            totalStreamers: (platforms || []).reduce((sum, p) => sum + (p.streamer_count || 0), 0),
          });
        });
      });
    });
  }

  /**
   * 게임 통계 조회 (시계열)
   * @param {number} gameId
   * @param {string} period - '1h', '24h', '7d', '30d'
   * @returns {Promise<Array>}
   */
  async getGameStats(gameId, period = "24h") {
    const periodMap = {
      "1h": "-1 hours",
      "24h": "-24 hours",
      "7d": "-7 days",
      "30d": "-30 days",
    };

    const timeFilter = periodMap[period] || "-24 hours";

    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          cs.recorded_at,
          SUM(cs.viewer_count) as total_viewers,
          SUM(cs.streamer_count) as total_streamers
        FROM category_stats cs
        JOIN category_game_mappings cgm
          ON cs.platform = cgm.platform AND cs.platform_category_id = cgm.platform_category_id
        WHERE cgm.unified_game_id = ?
          AND cs.recorded_at >= datetime('now', ?)
        GROUP BY cs.recorded_at
        ORDER BY cs.recorded_at ASC
      `;

      this.db.all(sql, [gameId, timeFilter], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * 플랫폼별 카테고리 목록 조회
   * @param {string} platform
   * @returns {Promise<Array>}
   */
  async getPlatformCategories(platform) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT pc.*, ug.name as unified_name, ug.name_kr as unified_name_kr
        FROM platform_categories pc
        LEFT JOIN category_game_mappings cgm
          ON pc.platform = cgm.platform AND pc.platform_category_id = cgm.platform_category_id
        LEFT JOIN unified_games ug ON cgm.unified_game_id = ug.id
        WHERE pc.platform = ? AND pc.is_active = 1
        ORDER BY pc.viewer_count DESC
      `;

      this.db.all(sql, [platform], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * 카탈로그 통계 조회
   * @returns {Promise<Object>}
   */
  async getCatalogStats() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          (SELECT COUNT(*) FROM unified_games) as total_games,
          (SELECT COUNT(*) FROM unified_games WHERE is_verified = 1) as verified_games,
          (SELECT COUNT(*) FROM platform_categories WHERE is_active = 1) as total_categories,
          (SELECT COUNT(*) FROM platform_categories WHERE platform = 'soop' AND is_active = 1) as soop_categories,
          (SELECT COUNT(*) FROM platform_categories WHERE platform = 'chzzk' AND is_active = 1) as chzzk_categories,
          (SELECT COALESCE(SUM(viewer_count), 0) FROM platform_categories WHERE is_active = 1) as total_viewers,
          (SELECT COALESCE(SUM(streamer_count), 0) FROM platform_categories WHERE is_active = 1) as total_streamers
      `;

      this.db.get(sql, [], (err, row) => {
        if (err) reject(err);
        else resolve(row || {});
      });
    });
  }

  /**
   * 수동 매핑 설정
   * @param {string} platform
   * @param {string} platformCategoryId
   * @param {number} unifiedGameId
   */
  async setManualMapping(platform, platformCategoryId, unifiedGameId) {
    await this.mapper.setManualMapping(platform, platformCategoryId, unifiedGameId);
    this.invalidateCache();
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
}

module.exports = CategoryService;
