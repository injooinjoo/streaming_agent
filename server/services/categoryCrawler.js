/**
 * CategoryCrawler - 플랫폼별 카테고리 크롤링 서비스
 *
 * SOOP과 Chzzk 플랫폼에서 게임/카테고리 목록을 수집합니다.
 */

const { category: categoryLogger } = require("./logger");

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

    const categories = [];
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

        if (!data || !Array.isArray(data.data)) {
          categoryLogger.debug("SOOP: No more data or invalid response");
          break;
        }

        const items = data.data;
        if (items.length === 0) {
          hasMore = false;
          break;
        }

        for (const item of items) {
          categories.push({
            platform: "soop",
            platformCategoryId: String(item.cate_no || item.id),
            platformCategoryName: item.cate_name || item.name,
            categoryType: item.cate_type || "GAME",
            thumbnailUrl: item.cate_img || item.thumbnail || null,
            viewerCount: parseInt(item.total_view_cnt, 10) || 0,
            streamerCount: parseInt(item.total_broad_cnt, 10) || 0,
          });
        }

        categoryLogger.debug("SOOP page fetched", { page: pageNo, count: items.length });

        // 다음 페이지
        if (items.length < listCnt) {
          hasMore = false;
        } else {
          pageNo++;
        }
      } catch (error) {
        categoryLogger.error("SOOP page failed", { page: pageNo, error: error.message });
        hasMore = false;
      }
    }

    categoryLogger.info("SOOP crawl complete", { total: categories.length });
    return categories;
  }

  /**
   * Chzzk 카테고리 목록 크롤링 (라이브 방송에서 discover)
   * @returns {Promise<PlatformCategory[]>}
   */
  async fetchChzzkCategories() {
    categoryLogger.debug("Fetching Chzzk categories...");

    const categoryMap = new Map();

    // 여러 페이지의 라이브 방송에서 카테고리 수집
    const pagesToFetch = 10;
    const pageSize = 100;

    for (let page = 0; page < pagesToFetch; page++) {
      try {
        const offset = page * pageSize;
        const url = `https://api.chzzk.naver.com/service/v1/home/lives?size=${pageSize}&offset=${offset}`;
        const data = await this.fetchWithRetry("chzzk", url);

        if (!data || !data.content || !data.content.data) {
          categoryLogger.debug("Chzzk: No more data");
          break;
        }

        const lives = data.content.data;
        if (lives.length === 0) break;

        for (const live of lives) {
          if (live.liveCategory && live.liveCategoryValue) {
            const categoryId = live.liveCategory;

            if (!categoryMap.has(categoryId)) {
              categoryMap.set(categoryId, {
                platform: "chzzk",
                platformCategoryId: categoryId,
                platformCategoryName: live.liveCategoryValue,
                categoryType: live.categoryType || "GAME",
                thumbnailUrl: live.liveThumbnailImageUrl || null,
                viewerCount: 0,
                streamerCount: 0,
              });
            }

            // 시청자/스트리머 수 집계
            const category = categoryMap.get(categoryId);
            category.viewerCount += live.concurrentUserCount || 0;
            category.streamerCount += 1;
          }
        }

        categoryLogger.debug("Chzzk page fetched", { page: page + 1, uniqueCategories: categoryMap.size });
      } catch (error) {
        categoryLogger.error("Chzzk page failed", { page: page + 1, error: error.message });
        break;
      }
    }

    const categories = Array.from(categoryMap.values());
    categoryLogger.info("Chzzk crawl complete", { total: categories.length });
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
   * 카테고리 Upsert (없으면 생성, 있으면 업데이트)
   * @param {PlatformCategory} category
   */
  upsertCategory(category) {
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
   * 오래된 카테고리 비활성화 (7일 이상 미발견)
   */
  async deactivateStaleCategories() {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE platform_categories
        SET is_active = 0
        WHERE last_seen_at < datetime('now', '-7 days')
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
