/**
 * Stats Cache Service
 * 서버 사이드 통계 프리컴퓨트 + 캐싱
 *
 * 무거운 집계 쿼리를 주기적으로 미리 계산하고,
 * 클라이언트 요청 시 캐시된 값을 즉시 반환합니다.
 *
 * TTL 티어:
 * - FAST (5분): 채팅 요약, 대시보드
 * - MEDIUM (15분): 수익, 기부, 브로드캐스터
 * - SLOW (1시간): 관리자 오버뷰, 마켓플레이스, 카탈로그 통계
 */

const { getRedisService } = require("./redisService");
const { logger } = require("./logger");

// 캐시 키
const STATS_KEYS = {
  ADMIN_OVERVIEW: "stats:admin:overview",
  CATALOG_STATS: "stats:catalog:stats",
  CATALOG_TRENDS: "stats:catalog:trends",
  MARKETPLACE_STATS: "stats:marketplace:stats",
  REVENUE_SUMMARY: "stats:revenue:summary",
  REVENUE_TREND: "stats:revenue:trend",
  CHAT_SUMMARY: "stats:chat:summary",
  DASHBOARD_SUMMARY: "stats:dashboard:summary",
  PLATFORM_STATS: "stats:platform:stats",
  BROADCASTERS: "stats:broadcasters",
  CATEGORY_DONATIONS: "stats:content:cat-donations",
  REALTIME_PLATFORM: "stats:realtime:platform",
  REALTIME_TREND: "stats:realtime:trend",
  TOP_STREAMERS_REVENUE: "stats:top-streamers:revenue",
  TOP_STREAMERS_VIEWERS: "stats:top-streamers:viewers",
};

// TTL (초)
const TTL = {
  FAST: 5 * 60,       // 5분
  MEDIUM: 15 * 60,    // 15분
  SLOW: 60 * 60,      // 1시간
};

// 스케줄러 간격 (밀리초)
const SCHEDULE_MS = {
  FAST: 5 * 60 * 1000,
  MEDIUM: 15 * 60 * 1000,
  SLOW: 60 * 60 * 1000,
};

const REDIS_PREFIX = "cache:stats:";

class StatsCacheService {
  /**
   * @param {Object} options
   * @param {Object} options.statsService - StatsService 인스턴스
   * @param {Object} options.categoryService - CategoryService 인스턴스
   * @param {Object} options.designService - DesignService 인스턴스
   */
  constructor({ statsService, categoryService, designService }) {
    this.statsService = statsService;
    this.categoryService = categoryService;
    this.designService = designService;
    this.redis = getRedisService();

    // 메모리 캐시 (Redis 없을 때 fallback)
    this.memoryCache = new Map();

    // 스케줄러 인터벌 저장
    this.intervals = [];

    this.initialized = false;
  }

  // ===== 캐시 읽기/쓰기 =====

  /**
   * 캐시에서 데이터 조회
   * @param {string} key - 캐시 키
   * @returns {Promise<any|null>}
   */
  async get(key) {
    // Redis 시도
    if (this.redis.getIsConnected()) {
      try {
        const data = await this.redis.get(REDIS_PREFIX + key);
        if (data !== null) return data;
      } catch (err) {
        logger.warn("StatsCacheService Redis get error", { key, error: err.message });
      }
    }

    // 메모리 fallback
    const entry = this.memoryCache.get(key);
    if (entry && Date.now() < entry.expiresAt) {
      return entry.data;
    }

    // 만료된 항목 제거
    if (entry) this.memoryCache.delete(key);
    return null;
  }

  /**
   * 캐시에 데이터 저장
   * @param {string} key - 캐시 키
   * @param {any} data - 저장할 데이터
   * @param {number} ttlSeconds - TTL (초)
   */
  async set(key, data, ttlSeconds) {
    // Redis 저장
    if (this.redis.getIsConnected()) {
      try {
        await this.redis.set(REDIS_PREFIX + key, data, ttlSeconds);
      } catch (err) {
        logger.warn("StatsCacheService Redis set error", { key, error: err.message });
      }
    }

    // 메모리에도 저장 (fallback)
    this.memoryCache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * 특정 키 또는 패턴 무효화
   * @param {string} keyOrPrefix - 캐시 키 또는 프리픽스
   */
  async invalidate(keyOrPrefix) {
    // 정확한 키 삭제
    this.memoryCache.delete(keyOrPrefix);

    if (this.redis.getIsConnected()) {
      try {
        await this.redis.del(REDIS_PREFIX + keyOrPrefix);
      } catch (err) {
        logger.warn("StatsCacheService Redis invalidate error", { key: keyOrPrefix, error: err.message });
      }
    }

    // 프리픽스로 시작하는 메모리 캐시도 삭제
    for (const [k] of this.memoryCache) {
      if (k.startsWith(keyOrPrefix)) {
        this.memoryCache.delete(k);
      }
    }

    if (this.redis.getIsConnected()) {
      try {
        await this.redis.delByPattern(REDIS_PREFIX + keyOrPrefix + "*");
      } catch (err) {
        // ignore
      }
    }
  }

  // ===== 파라미터 키 생성 =====

  /**
   * 파라미터를 포함한 캐시 키 생성
   * @param {string} baseKey - 기본 키
   * @param {Object} params - 파라미터
   * @returns {string}
   */
  buildKey(baseKey, params = {}) {
    const parts = Object.entries(params)
      .filter(([, v]) => v !== null && v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`);

    return parts.length > 0 ? `${baseKey}:${parts.join(":")}` : baseKey;
  }

  // ===== 캐시 래핑 헬퍼 =====

  /**
   * 캐시 확인 → 없으면 계산 → 캐시 저장 → 반환
   * @param {string} key - 캐시 키
   * @param {Function} computeFn - 데이터 계산 함수
   * @param {number} ttl - TTL (초)
   * @returns {Promise<any>}
   */
  async getOrCompute(key, computeFn, ttl) {
    const cached = await this.get(key);
    if (cached !== null) return cached;

    const data = await computeFn();
    await this.set(key, data, ttl);
    return data;
  }

  // ===== 프리컴퓨트 작업들 =====

  /**
   * FAST 티어 프리컴퓨트 (5분마다)
   */
  async precomputeFast() {
    const jobs = [
      {
        key: this.buildKey(STATS_KEYS.CHAT_SUMMARY, { days: 7 }),
        fn: () => this.statsService.getChatActivitySummary(7),
      },
      {
        key: STATS_KEYS.DASHBOARD_SUMMARY,
        fn: () => this.statsService.getDashboardSummary(),
      },
      {
        key: STATS_KEYS.REALTIME_PLATFORM,
        fn: () => this.statsService.getRealtimePlatformSummary(),
      },
      {
        key: this.buildKey(STATS_KEYS.REALTIME_TREND, { type: "viewers" }),
        fn: () => this.statsService.getRealtimeTrend("viewers"),
      },
      {
        key: this.buildKey(STATS_KEYS.REALTIME_TREND, { type: "channels" }),
        fn: () => this.statsService.getRealtimeTrend("channels"),
      },
    ];

    await this._runJobs("FAST", jobs, TTL.FAST);
  }

  /**
   * MEDIUM 티어 프리컴퓨트 (15분마다)
   */
  async precomputeMedium() {
    const jobs = [
      {
        key: this.buildKey(STATS_KEYS.REVENUE_SUMMARY, { days: 30 }),
        fn: () => this.statsService.getRevenueSummary(30),
      },
      {
        key: this.buildKey(STATS_KEYS.REVENUE_SUMMARY, { days: 7 }),
        fn: () => this.statsService.getRevenueSummary(7),
      },
      {
        key: this.buildKey(STATS_KEYS.REVENUE_TREND, { days: 30 }),
        fn: () => this.statsService.getRevenueTrend(30),
      },
      {
        key: STATS_KEYS.PLATFORM_STATS,
        fn: () => this.statsService.getPlatformStats(),
      },
      {
        key: this.buildKey(STATS_KEYS.BROADCASTERS, { sortBy: "total_donations", page: 1 }),
        fn: () => this.statsService.getBroadcasters({}),
      },
      {
        key: this.buildKey(STATS_KEYS.CATEGORY_DONATIONS, { days: 30 }),
        fn: () => this.statsService.getCategoryDonations(30),
      },
      {
        key: this.buildKey(STATS_KEYS.TOP_STREAMERS_REVENUE, { limit: 10 }),
        fn: () => this.statsService.getTopStreamersByRevenue(10),
      },
      {
        key: this.buildKey(STATS_KEYS.TOP_STREAMERS_VIEWERS, { sortBy: "peak" }),
        fn: () => this.statsService.getTopStreamersByViewers({ sortBy: "peak" }),
      },
    ];

    await this._runJobs("MEDIUM", jobs, TTL.MEDIUM);
  }

  /**
   * SLOW 티어 프리컴퓨트 (1시간마다)
   */
  async precomputeSlow() {
    const jobs = [
      {
        key: STATS_KEYS.ADMIN_OVERVIEW,
        fn: () => this.statsService.getAdminOverview(),
      },
      {
        key: STATS_KEYS.MARKETPLACE_STATS,
        fn: () => this.designService.getStats(),
      },
    ];

    // categoryService 메서드 존재 확인
    if (this.categoryService.getCatalogStats) {
      jobs.push({
        key: STATS_KEYS.CATALOG_STATS,
        fn: () => this.categoryService.getCatalogStats(),
      });
    }

    if (this.categoryService.getTopCategoriesDailyTrend) {
      jobs.push({
        key: this.buildKey(STATS_KEYS.CATALOG_TRENDS, { limit: 20, days: 7 }),
        fn: () => this.categoryService.getTopCategoriesDailyTrend(20, 7),
      });
    }

    await this._runJobs("SLOW", jobs, TTL.SLOW);
  }

  /**
   * 작업 배치 실행
   * @param {string} tier - 티어 이름
   * @param {Array} jobs - { key, fn } 배열
   * @param {number} ttl - TTL (초)
   */
  async _runJobs(tier, jobs, ttl) {
    const results = await Promise.allSettled(
      jobs.map(async ({ key, fn }) => {
        try {
          const data = await fn();
          await this.set(key, data, ttl);
          return { key, success: true };
        } catch (err) {
          logger.warn(`StatsCacheService [${tier}] job failed`, { key, error: err.message });
          return { key, success: false, error: err.message };
        }
      })
    );

    const succeeded = results.filter(r => r.status === "fulfilled" && r.value.success).length;
    const failed = results.length - succeeded;

    if (failed > 0) {
      logger.warn(`StatsCacheService [${tier}] precompute: ${succeeded}/${results.length} succeeded`);
    } else {
      logger.info(`StatsCacheService [${tier}] precompute: all ${succeeded} jobs completed`);
    }
  }

  // ===== 라이프사이클 =====

  /**
   * 캐시 웜업 (서버 시작 시)
   * 모든 티어의 프리컴퓨트를 한 번 실행
   */
  async warmUp() {
    logger.info("StatsCacheService: warming up cache...");
    const start = Date.now();

    try {
      await Promise.allSettled([
        this.precomputeFast(),
        this.precomputeMedium(),
        this.precomputeSlow(),
      ]);

      this.initialized = true;
      logger.info(`StatsCacheService: warm-up completed in ${Date.now() - start}ms`);
    } catch (err) {
      logger.error("StatsCacheService: warm-up failed", { error: err.message });
    }
  }

  /**
   * 주기적 프리컴퓨트 스케줄러 시작
   */
  startSchedulers() {
    this.intervals.push(
      setInterval(() => this.precomputeFast().catch(e => logger.error("FAST precompute error", { error: e.message })), SCHEDULE_MS.FAST)
    );
    this.intervals.push(
      setInterval(() => this.precomputeMedium().catch(e => logger.error("MEDIUM precompute error", { error: e.message })), SCHEDULE_MS.MEDIUM)
    );
    this.intervals.push(
      setInterval(() => this.precomputeSlow().catch(e => logger.error("SLOW precompute error", { error: e.message })), SCHEDULE_MS.SLOW)
    );

    logger.info("StatsCacheService: schedulers started (FAST=5m, MEDIUM=15m, SLOW=1h)");
  }

  /**
   * 스케줄러 정지 (서버 종료 시)
   */
  shutdown() {
    for (const interval of this.intervals) {
      clearInterval(interval);
    }
    this.intervals = [];
    this.memoryCache.clear();
    logger.info("StatsCacheService: shutdown complete");
  }

  // ===== 이벤트 기반 무효화 =====

  /**
   * 후원 이벤트 발생 시 관련 캐시 무효화
   */
  async onDonationEvent() {
    await Promise.allSettled([
      this.invalidate(STATS_KEYS.REVENUE_SUMMARY),
      this.invalidate(STATS_KEYS.REVENUE_TREND),
      this.invalidate(STATS_KEYS.DASHBOARD_SUMMARY),
      this.invalidate(STATS_KEYS.CATEGORY_DONATIONS),
      this.invalidate(STATS_KEYS.TOP_STREAMERS_REVENUE),
      this.invalidate(STATS_KEYS.ADMIN_OVERVIEW),
    ]);
  }

  /**
   * 새 유저 등록 시
   */
  async onUserRegistered() {
    await this.invalidate(STATS_KEYS.ADMIN_OVERVIEW);
  }

  /**
   * 디자인 상태 변경 시
   */
  async onDesignChanged() {
    await this.invalidate(STATS_KEYS.MARKETPLACE_STATS);
  }
}

module.exports = { StatsCacheService, STATS_KEYS, TTL };
