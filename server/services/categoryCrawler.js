/**
 * CategoryCrawler - 플랫폼별 카테고리 크롤링 서비스
 *
 * SOOP과 Chzzk 플랫폼에서 게임/카테고리 목록을 수집합니다.
 *
 * Supports both SQLite (development) and PostgreSQL (production/Supabase)
 */

const { category: categoryLogger } = require("./logger");
const { isPostgres } = require("../config/database.config");

/**
 * 플랫폼 카테고리 스키마
 *
 * @typedef {Object} PlatformCategory
 * @property {string} platform - 플랫폼 ('soop' | 'chzzk')
 * @property {string} platformCategoryId - 플랫폼 내부 카테고리 ID
 * @property {string} platformCategoryName - 카테고리 이름
 * @property {string} [categoryType] - 카테고리 타입 (GAME, SPORTS, ETC)
 * @property {string} [thumbnailUrl] - 썸네일 URL
 * @property {number} viewerCount - 현재 시청자 수
 * @property {number} streamerCount - 현재 방송 수
 */

// Rate limit 설정
const RATE_LIMITS = {
  soop: {
    requestsPerSecond: 2,
    maxRetries: 3,
    retryDelay: 1000,
  },
  chzzk: {
    requestsPerSecond: 5,
    maxRetries: 3,
    retryDelay: 500,
  },
};

class CategoryCrawler {
  constructor(db) {
    this.db = db;
    this.defaultHeaders = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    };
    this.lastRequestTime = {
      soop: 0,
      chzzk: 0,
    };
  }

  /**
   * Rate limiting을 위한 딜레이
   * @param {string} platform
   */
  async rateLimit(platform) {
    const config = RATE_LIMITS[platform];
    const minInterval = 1000 / config.requestsPerSecond;
    const elapsed = Date.now() - this.lastRequestTime[platform];

    if (elapsed < minInterval) {
      await new Promise((resolve) =>
        setTimeout(resolve, minInterval - elapsed)
      );
    }
    this.lastRequestTime[platform] = Date.now();
  }

  /**
   * 재시도 로직이 포함된 fetch
   * @param {string} platform
   * @param {string} url
   * @param {Object} options
   */
  async fetchWithRetry(platform, url, options = {}) {
    const config = RATE_LIMITS[platform];

    for (let attempt = 0; attempt < config.maxRetries; attempt++) {
      try {
        await this.rateLimit(platform);

        const response = await fetch(url, {
          ...options,
          headers: {
            ...this.defaultHeaders,
            ...options.headers,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        categoryLogger.error("Fetch error", {
          platform,
          attempt: attempt + 1,
          error: error.message,
        });

        if (attempt < config.maxRetries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, config.retryDelay * Math.pow(2, attempt))
          );
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * SOOP 카테고리 목록 크롤링
   * @returns {Promise<PlatformCategory[]>}
   */
  async fetchSoopCategories() {
    categoryLogger.debug("Fetching SOOP categories...");

    // Step 1: categoryList API에서 카테고리 목록 가져오기
    const categoryMap = new Map();
    let pageNo = 1;
    const listCnt = 100;
    let hasMore = true;

    while (hasMore) {
      try {
        const url = `https://sch.sooplive.co.kr/api.php?m=categoryList&nPageNo=${pageNo}&nListCnt=${listCnt}`;
        const data = await this.fetchWithRetry("soop", url, {
          headers: {
            Origin: "https://play.sooplive.co.kr",
            Referer: "https://play.sooplive.co.kr/",
          },
        });

        if (!data || !data.data || !Array.isArray(data.data.list)) {
          categoryLogger.debug("SOOP: No more data or invalid response", { data });
          break;
        }

        const items = data.data.list;
        if (items.length === 0) {
          hasMore = false;
          break;
        }

        for (const item of items) {
          const categoryId = String(item.category_no || item.cate_no || item.id);
          categoryMap.set(categoryId, {
            platform: "soop",
            platformCategoryId: categoryId,
            platformCategoryName: item.category_name || item.cate_name || item.name,
            categoryType: item.cate_type || "GAME",
            thumbnailUrl: item.cate_img || item.thumbnail || null,
            viewerCount: 0,  // 라이브 방송에서 재집계
            streamerCount: 0,  // 라이브 방송에서 집계
          });
        }

        categoryLogger.debug("SOOP categoryList page fetched", { page: pageNo, count: items.length });
        hasMore = data.data.is_more === true;
        pageNo++;
      } catch (error) {
        categoryLogger.error("SOOP categoryList page failed", { page: pageNo, error: error.message });
        hasMore = false;
      }
    }

    // Step 2: 라이브 방송 목록에서 시청자/스트리머 수 집계
    const liveFetchPages = 30;  // 약 1,800개 방송 스캔
    const livePageSize = 60;

    for (let page = 1; page <= liveFetchPages; page++) {
      try {
        const url = `https://live.sooplive.co.kr/api/main_broad_list_api.php?selectType=action&selectValue=all&orderType=view_cnt&pageNo=${page}&lang=ko`;
        const data = await this.fetchWithRetry("soop", url, {
          headers: {
            Origin: "https://www.sooplive.co.kr",
            Referer: "https://www.sooplive.co.kr/",
          },
        });

        if (!data || !data.broad || !Array.isArray(data.broad)) {
          categoryLogger.debug("SOOP: No more live data", { page });
          break;
        }

        const broadcasts = data.broad;
        if (broadcasts.length === 0) break;

        for (const live of broadcasts) {
          const categoryId = String(live.broad_cate_no || "");
          if (categoryId && categoryMap.has(categoryId)) {
            const category = categoryMap.get(categoryId);
            category.viewerCount += parseInt(live.total_view_cnt, 10) || 0;
            category.streamerCount += 1;
          }
        }

        categoryLogger.debug("SOOP live page fetched", { page, count: broadcasts.length });

        if (broadcasts.length < livePageSize) break;
      } catch (error) {
        categoryLogger.error("SOOP live page failed", { page, error: error.message });
        break;
      }
    }

    const categories = Array.from(categoryMap.values());
    const activeCategories = categories.filter(c => c.streamerCount > 0).length;
    categoryLogger.info("SOOP crawl complete", {
      total: categories.length,
      activeCategories,
      totalViewers: categories.reduce((sum, c) => sum + c.viewerCount, 0),
      totalStreamers: categories.reduce((sum, c) => sum + c.streamerCount, 0)
    });
    return categories;
  }

  /**
   * Chzzk 카테고리 포스터 이미지 조회
   * @param {string} categoryType - 카테고리 타입 (GAME, ETC)
   * @param {string} categoryId - 카테고리 ID
   * @returns {Promise<string|null>}
   */
  async fetchChzzkCategoryPoster(categoryType, categoryId) {
    try {
      const url = `https://api.chzzk.naver.com/service/v1/categories/${categoryType}/${categoryId}/info`;
      const data = await this.fetchWithRetry("chzzk", url);
      return data?.content?.posterImageUrl || null;
    } catch (error) {
      categoryLogger.debug("Chzzk poster fetch failed", { categoryId, error: error.message });
      return null;
    }
  }

  /**
   * Chzzk 카테고리 상세 정보 조회 (openLiveCount, concurrentUserCount 포함)
   * @param {string} categoryType - 카테고리 타입 (GAME, ETC)
   * @param {string} categoryId - 카테고리 ID
   * @returns {Promise<{openLiveCount: number, concurrentUserCount: number, posterImageUrl: string|null}>}
   */
  async fetchChzzkCategoryInfo(categoryType, categoryId) {
    try {
      const url = `https://api.chzzk.naver.com/service/v1/categories/${categoryType}/${categoryId}/info`;
      const data = await this.fetchWithRetry("chzzk", url);
      const content = data?.content || {};
      return {
        openLiveCount: content.openLiveCount || 0,
        concurrentUserCount: content.concurrentUserCount || 0,
        posterImageUrl: content.posterImageUrl || null,
      };
    } catch (error) {
      categoryLogger.debug("Chzzk category info fetch failed", { categoryId, error: error.message });
      return { openLiveCount: 0, concurrentUserCount: 0, posterImageUrl: null };
    }
  }

  /**
   * Chzzk 카테고리 목록 크롤링 (홈페이지에서 카테고리 발견 + 상세 API로 정확한 수치 조회)
   * @returns {Promise<PlatformCategory[]>}
   */
  async fetchChzzkCategories() {
    categoryLogger.debug("Fetching Chzzk categories...");

    const categoryMap = new Map();

    // Step 1: 홈페이지 라이브 목록에서 활성 카테고리 발견
    const pagesToFetch = 10; // 카테고리 발견용으로는 10페이지면 충분
    const pageSize = 50;

    for (let page = 0; page < pagesToFetch; page++) {
      try {
        const offset = page * pageSize;
        const url = `https://api.chzzk.naver.com/service/v1/home/lives?size=${pageSize}&offset=${offset}`;
        const data = await this.fetchWithRetry("chzzk", url);

        if (!data || !data.content) {
          break;
        }

        const lives = data.content.streamingLiveList || data.content.data || [];
        if (!Array.isArray(lives) || lives.length === 0) {
          break;
        }

        for (const live of lives) {
          if (live.liveCategory && live.liveCategoryValue) {
            const categoryId = live.liveCategory;
            if (!categoryMap.has(categoryId)) {
              categoryMap.set(categoryId, {
                platform: "chzzk",
                platformCategoryId: categoryId,
                platformCategoryName: live.liveCategoryValue,
                categoryType: live.categoryType || "GAME",
                thumbnailUrl: null,
                viewerCount: 0,
                streamerCount: 0,
              });
            }
          }
        }

        categoryLogger.debug("Chzzk discover page fetched", {
          page: page + 1,
          livesCount: lives.length,
          uniqueCategories: categoryMap.size
        });
      } catch (error) {
        categoryLogger.error("Chzzk discover page failed", { page: page + 1, error: error.message });
        break;
      }
    }

    // Step 2: 각 카테고리의 상세 정보 조회 (정확한 방송수/시청자수)
    const categories = Array.from(categoryMap.values());
    const batchSize = 5; // API 부하 고려

    for (let i = 0; i < categories.length; i += batchSize) {
      const batch = categories.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (category) => {
          const info = await this.fetchChzzkCategoryInfo(
            category.categoryType,
            category.platformCategoryId
          );
          // 카테고리 상세 API에서 정확한 수치 사용
          category.viewerCount = info.concurrentUserCount;
          category.streamerCount = info.openLiveCount;
          if (info.posterImageUrl) {
            category.thumbnailUrl = info.posterImageUrl;
          }
        })
      );
      categoryLogger.debug("Chzzk poster batch fetched", {
        progress: `${Math.min(i + batchSize, categories.length)}/${categories.length}`
      });
    }

    const totalViewers = categories.reduce((sum, c) => sum + c.viewerCount, 0);
    const totalStreamers = categories.reduce((sum, c) => sum + c.streamerCount, 0);
    categoryLogger.info("Chzzk crawl complete", {
      categories: categories.length,
      totalStreamers,
      totalViewers,
      withPoster: categories.filter(c => c.thumbnailUrl).length
    });
    return categories;
  }

  /**
   * 모든 플랫폼 크롤링 및 DB 저장
   * @returns {Promise<{soop: number, chzzk: number}>}
   */
  async crawlAllPlatforms() {
    categoryLogger.info("Starting full crawl...");

    const results = {
      soop: 0,
      chzzk: 0,
    };

    try {
      // SOOP 크롤링
      const soopCategories = await this.fetchSoopCategories();
      for (const category of soopCategories) {
        await this.upsertCategory(category);
      }
      results.soop = soopCategories.length;
    } catch (error) {
      categoryLogger.error("SOOP crawl failed", { error: error.message });
    }

    try {
      // Chzzk 크롤링
      const chzzkCategories = await this.fetchChzzkCategories();
      for (const category of chzzkCategories) {
        await this.upsertCategory(category);
      }
      results.chzzk = chzzkCategories.length;
    } catch (error) {
      categoryLogger.error("Chzzk crawl failed", { error: error.message });
    }

    categoryLogger.info("Crawl complete", { soop: results.soop, chzzk: results.chzzk });
    return results;
  }

  /**
   * 시청자 수만 빠르게 업데이트
   * @returns {Promise<void>}
   */
  async updateViewerCounts() {
    categoryLogger.debug("Updating viewer counts...");

    try {
      const soopCategories = await this.fetchSoopCategories();
      for (const category of soopCategories) {
        await this.updateCategoryViewers(category);
      }
    } catch (error) {
      categoryLogger.error("SOOP viewer update failed", { error: error.message });
    }

    try {
      const chzzkCategories = await this.fetchChzzkCategories();
      for (const category of chzzkCategories) {
        await this.updateCategoryViewers(category);
      }
    } catch (error) {
      categoryLogger.error("Chzzk viewer update failed", { error: error.message });
    }

    categoryLogger.debug("Viewer counts updated");
  }

  /**
   * 카테고리 존재 여부 확인
   * @param {string} platform
   * @param {string} platformCategoryId
   * @returns {Promise<boolean>}
   */
  checkCategoryExists(platform, platformCategoryId) {
    return new Promise((resolve) => {
      this.db.get(
        `SELECT 1 FROM platform_categories WHERE platform = ? AND platform_category_id = ?`,
        [platform, platformCategoryId],
        (err, row) => resolve(!!row)
      );
    });
  }

  /**
   * 카테고리 Upsert (없으면 생성, 있으면 업데이트)
   * 새 카테고리 발견 시 로그 출력
   * @param {PlatformCategory} category
   */
  async upsertCategory(category) {
    // 새 카테고리인지 확인
    const exists = await this.checkCategoryExists(
      category.platform,
      category.platformCategoryId
    );

    if (!exists) {
      categoryLogger.info("새 카테고리 발견", {
        platform: category.platform,
        name: category.platformCategoryName,
        id: category.platformCategoryId,
        type: category.categoryType,
      });
    }

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO platform_categories
          (platform, platform_category_id, platform_category_name, category_type,
           thumbnail_url, viewer_count, streamer_count, last_seen_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(platform, platform_category_id) DO UPDATE SET
          platform_category_name = excluded.platform_category_name,
          category_type = excluded.category_type,
          thumbnail_url = COALESCE(excluded.thumbnail_url, platform_categories.thumbnail_url),
          viewer_count = excluded.viewer_count,
          streamer_count = excluded.streamer_count,
          last_seen_at = CURRENT_TIMESTAMP,
          is_active = 1
      `;

      this.db.run(
        sql,
        [
          category.platform,
          category.platformCategoryId,
          category.platformCategoryName,
          category.categoryType,
          category.thumbnailUrl,
          category.viewerCount,
          category.streamerCount,
        ],
        (err) => {
          if (err) {
            categoryLogger.error("Upsert failed", {
              category: category.platformCategoryName,
              error: err.message,
            });
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * 시청자 수만 업데이트
   * @param {PlatformCategory} category
   */
  updateCategoryViewers(category) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE platform_categories
        SET viewer_count = ?, streamer_count = ?, last_seen_at = CURRENT_TIMESTAMP
        WHERE platform = ? AND platform_category_id = ?
      `;

      this.db.run(
        sql,
        [
          category.viewerCount,
          category.streamerCount,
          category.platform,
          category.platformCategoryId,
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  /**
   * 통계 기록
   * @param {PlatformCategory} category
   */
  recordStats(category) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO category_stats
          (platform, platform_category_id, viewer_count, streamer_count)
        VALUES (?, ?, ?, ?)
      `;

      this.db.run(
        sql,
        [
          category.platform,
          category.platformCategoryId,
          category.viewerCount,
          category.streamerCount,
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  /**
   * 모든 카테고리의 현재 통계 기록
   */
  async recordAllStats() {
    categoryLogger.debug("Recording statistics...");

    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM platform_categories WHERE is_active = 1",
        [],
        async (err, rows) => {
          if (err) {
            reject(err);
            return;
          }

          for (const row of rows) {
            try {
              await this.recordStats({
                platform: row.platform,
                platformCategoryId: row.platform_category_id,
                viewerCount: row.viewer_count,
                streamerCount: row.streamer_count,
              });
            } catch (error) {
              categoryLogger.error("Stats record failed", {
                category: row.platform_category_name,
                error: error.message,
              });
            }
          }

          categoryLogger.debug("Recorded stats", { count: rows.length });
          resolve();
        }
      );
    });
  }

  /**
   * 단일 카테고리의 포스터 이미지를 가져와서 DB에 저장
   * @param {string} platform - 플랫폼 (soop, chzzk)
   * @param {string} platformCategoryId - 플랫폼 카테고리 ID
   * @param {string} categoryType - 카테고리 타입 (GAME, ETC)
   * @returns {Promise<string|null>} - 가져온 이미지 URL 또는 null
   */
  async fetchAndSavePosterImage(platform, platformCategoryId, categoryType = "GAME") {
    try {
      let posterUrl = null;

      if (platform === "chzzk") {
        // Chzzk: API에서 포스터 이미지 가져오기
        posterUrl = await this.fetchChzzkCategoryPoster(categoryType, platformCategoryId);
      } else if (platform === "soop") {
        // SOOP: categoryList API에서 이미지 가져오기
        try {
          const url = `https://sch.sooplive.co.kr/api.php?m=categoryList&nPageNo=1&nListCnt=300`;
          const data = await this.fetchWithRetry("soop", url, {
            headers: {
              Origin: "https://play.sooplive.co.kr",
              Referer: "https://play.sooplive.co.kr/",
            },
          });

          if (data?.data?.list) {
            const found = data.data.list.find(
              (item) => String(item.category_no || item.cate_no) === platformCategoryId
            );
            if (found) {
              posterUrl = found.cate_img || found.thumbnail || null;
            }
          }
        } catch (error) {
          categoryLogger.debug("SOOP category image fetch failed", { platformCategoryId, error: error.message });
        }
      }

      // DB에 이미지 URL 저장
      if (posterUrl) {
        await new Promise((resolve, reject) => {
          this.db.run(
            `UPDATE platform_categories SET thumbnail_url = ? WHERE platform = ? AND platform_category_id = ?`,
            [posterUrl, platform, platformCategoryId],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        categoryLogger.info("포스터 이미지 저장 완료", {
          platform,
          categoryId: platformCategoryId,
          posterUrl: posterUrl.substring(0, 50) + "..."
        });
      }

      return posterUrl;
    } catch (error) {
      categoryLogger.error("포스터 이미지 가져오기 실패", {
        platform,
        categoryId: platformCategoryId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * 오래된 카테고리 비활성화 (7일 이상 미발견)
   */
  async deactivateStaleCategories() {
    // Cross-database datetime calculation
    const sevenDaysAgo = isPostgres()
      ? `NOW() - INTERVAL '7 days'`
      : `datetime('now', '-7 days')`;
    const falseValue = isPostgres() ? `FALSE` : `0`;

    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE platform_categories
        SET is_active = ${falseValue}
        WHERE last_seen_at < ${sevenDaysAgo}
      `;

      this.db.run(sql, [], function (err) {
        if (err) {
          reject(err);
        } else {
          if (this.changes > 0) {
            categoryLogger.info("Deactivated stale categories", { count: this.changes });
          }
          resolve(this.changes);
        }
      });
    });
  }
}

module.exports = CategoryCrawler;
