/**
 * SnowflakeService - Snowflake 데이터 웨어하우스 연동 (v2)
 *
 * PERSONS 중심 통합 스키마 사용
 * - PERSONS: 스트리머 + 시청자 통합 정체성
 * - EVENTS: 이벤트 로그 (actor/target person_id)
 * - BROADCASTS: 방송 세션 (MERGE 업데이트)
 * - CATEGORIES: 카테고리 (MERGE 업데이트)
 * - VIEWER_ENGAGEMENT: 채널별 참여 통계
 * - VIEWER_SNAPSHOTS: 시청자 수 시계열
 *
 * NOTE: Snowflake is the ONLY data store - no SQLite fallback
 */

const snowflake = require("snowflake-sdk");
const fs = require("fs");
const { logger } = require("./logger");

/**
 * SOOP platform_user_id 정규화
 * (1), (2), (3) 등 멀티 디바이스 접미사 제거
 * @param {string} userId - 원본 user_id
 * @returns {string} 정규화된 user_id
 */
function normalizeSoopUserId(userId) {
  if (!userId) return userId;
  // 끝에 붙는 (1), (2), (3), ... 제거
  return userId.replace(/\s*\(\d+\)$/, "").trim();
}

class SnowflakeService {
  constructor(options = {}) {
    // Build config based on available auth method
    this.config = {
      account: process.env.SNOWFLAKE_ACCOUNT,
      username: process.env.SNOWFLAKE_USERNAME,
      database: process.env.SNOWFLAKE_DATABASE || "STREAMING_AGENT",
      schema: process.env.SNOWFLAKE_SCHEMA || "RAW",
      warehouse: process.env.SNOWFLAKE_WAREHOUSE || "COMPUTE_WH",
      role: process.env.SNOWFLAKE_ROLE || "SYSADMIN",
    };

    // Key-pair authentication (preferred)
    const privateKeyPath = process.env.SNOWFLAKE_PRIVATE_KEY_PATH;
    if (privateKeyPath && fs.existsSync(privateKeyPath)) {
      this.config.authenticator = "SNOWFLAKE_JWT";
      this.config.privateKey = fs.readFileSync(privateKeyPath, "utf8");
      this.authMethod = "keypair";
    } else if (process.env.SNOWFLAKE_PASSWORD) {
      // Password fallback
      this.config.password = process.env.SNOWFLAKE_PASSWORD;
      this.authMethod = "password";
    }

    this.connection = null;
    this.isConnected = false;

    // Batch configuration
    this.batchSize = options.batchSize || 100;
    this.flushIntervalMs = options.flushIntervalMs || 30000; // 30 seconds
    this.eventBuffer = [];
    this.flushTimer = null;

    // Retry configuration
    this.maxRetries = options.maxRetries || 3;
    this.retryDelayMs = options.retryDelayMs || 1000;

    // Dead letter queue callback
    this.deadLetterCallback = options.onDeadLetter || null;

    // Connection state
    this.connectionPromise = null;
    this.reconnecting = false;

    // Person ID cache (platform:user_id -> person_id)
    this.personIdCache = new Map();
    this.personIdCacheMaxSize = 10000;
  }

  /**
   * Snowflake 활성화 여부 (SNOWFLAKE_ENABLED=false로 비활성화)
   */
  isEnabled() {
    const enabled = process.env.SNOWFLAKE_ENABLED;
    return enabled !== "false";
  }

  /**
   * Snowflake 연결 확인 (환경변수)
   */
  isConfigured() {
    if (!this.isEnabled()) {
      return false;
    }
    // Check for either key-pair or password auth
    const hasAuth = this.config.privateKey || this.config.password;
    return !!(this.config.account && this.config.username && hasAuth);
  }

  /**
   * Snowflake 연결
   */
  async connect() {
    if (!this.isConfigured()) {
      logger.warn("Snowflake not configured - skipping connection", {
        account: this.config.account ? "set" : "missing",
        username: this.config.username ? "set" : "missing",
        authMethod: this.authMethod || "none",
      });
      return null;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      this.connection = snowflake.createConnection(this.config);

      this.connection.connect((err, conn) => {
        this.connectionPromise = null;

        if (err) {
          logger.error("Snowflake connection error", {
            error: err.message,
            account: this.config.account,
          });
          reject(err);
          return;
        }

        this.isConnected = true;
        logger.info("Snowflake connected", {
          account: this.config.account,
          database: this.config.database,
          schema: this.config.schema,
        });

        this.startFlushInterval();
        resolve(conn);
      });
    });

    return this.connectionPromise;
  }

  /**
   * 연결 해제
   */
  async disconnect() {
    await this.flush();
    this.stopFlushInterval();

    return new Promise((resolve) => {
      if (this.connection && this.isConnected) {
        this.connection.destroy((err) => {
          if (err) {
            logger.error("Snowflake disconnect error", { error: err.message });
          }
          this.isConnected = false;
          this.connection = null;
          logger.info("Snowflake disconnected");
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  // ========================================
  // PERSONS (통합 정체성)
  // ========================================

  /**
   * Person 캐시 키 생성
   */
  getPersonCacheKey(platform, platformUserId) {
    return `${platform}:${platformUserId}`;
  }

  /**
   * Person Upsert 및 ID 반환
   * @param {Object} person - 사용자 정보
   * @returns {Promise<number|null>} person_id
   */
  async upsertPerson(person) {
    if (!this.isConfigured() || !this.isConnected) {
      return null;
    }

    if (!person.platformUserId || person.platformUserId === "system") {
      return null;
    }

    // SOOP user_id 정규화: (1), (2) 등 멀티 디바이스 접미사 제거
    const normalizedUserId = person.platform === "soop"
      ? normalizeSoopUserId(person.platformUserId)
      : person.platformUserId;

    // 캐시 확인
    const cacheKey = this.getPersonCacheKey(person.platform, normalizedUserId);
    if (this.personIdCache.has(cacheKey)) {
      return this.personIdCache.get(cacheKey);
    }

    const now = new Date().toISOString();

    // MERGE로 Upsert 후 ID 조회 (정규화된 user_id 사용)
    const mergeSql = `
      MERGE INTO ${this.config.database}.${this.config.schema}.PERSONS AS target
      USING (SELECT
        ${this.sqlString(person.platform)} AS platform,
        ${this.sqlString(normalizedUserId)} AS platform_user_id
      ) AS source
      ON target.platform = source.platform AND target.platform_user_id = source.platform_user_id
      WHEN MATCHED THEN UPDATE SET
        nickname = ${this.sqlString(person.nickname)},
        profile_image_url = ${this.sqlString(person.profileImageUrl)},
        ${person.channelId ? `channel_id = ${this.sqlString(person.channelId)},` : ""}
        ${person.followerCount !== undefined ? `follower_count = ${person.followerCount},` : ""}
        ${person.subscriberCount !== undefined ? `subscriber_count = ${person.subscriberCount},` : ""}
        last_seen_at = ${this.sqlString(now)},
        updated_at = ${this.sqlString(now)}
      WHEN NOT MATCHED THEN INSERT (
        platform, platform_user_id, nickname, profile_image_url,
        channel_id, first_seen_at, last_seen_at, created_at, updated_at
      ) VALUES (
        ${this.sqlString(person.platform)},
        ${this.sqlString(normalizedUserId)},
        ${this.sqlString(person.nickname)},
        ${this.sqlString(person.profileImageUrl)},
        ${this.sqlString(person.channelId)},
        ${this.sqlString(now)},
        ${this.sqlString(now)},
        ${this.sqlString(now)},
        ${this.sqlString(now)}
      )
    `;

    try {
      await this.executeWithRetry(mergeSql);

      // ID 조회 (정규화된 user_id 사용)
      const selectSql = `
        SELECT id FROM ${this.config.database}.${this.config.schema}.PERSONS
        WHERE platform = ${this.sqlString(person.platform)}
          AND platform_user_id = ${this.sqlString(normalizedUserId)}
      `;
      const rows = await this.executeWithRetry(selectSql);

      if (rows && rows.length > 0) {
        const personId = rows[0].ID;
        // 캐시 저장 (크기 제한)
        if (this.personIdCache.size >= this.personIdCacheMaxSize) {
          // 가장 오래된 항목 삭제 (간단한 FIFO)
          const firstKey = this.personIdCache.keys().next().value;
          this.personIdCache.delete(firstKey);
        }
        this.personIdCache.set(cacheKey, personId);
        return personId;
      }
      return null;
    } catch (error) {
      logger.warn("Snowflake person upsert failed", {
        error: error.message,
        platform: person.platform,
        userId: person.platformUserId,
      });
      return null;
    }
  }

  /**
   * Person 통계 업데이트 (채팅/후원 카운트 증가)
   * @param {number} personId - person ID
   * @param {Object} stats - { chatCount, donationCount, donationAmount }
   */
  async updatePersonStats(personId, stats) {
    if (!this.isConfigured() || !this.isConnected || !personId) {
      return;
    }

    const now = new Date().toISOString();
    const chatInc = stats.chatCount || 0;
    const donationCountInc = stats.donationCount || 0;
    const donationAmountInc = stats.donationAmount || 0;

    const sql = `
      UPDATE ${this.config.database}.${this.config.schema}.PERSONS
      SET
        total_chat_count = total_chat_count + ${chatInc},
        total_donation_count = total_donation_count + ${donationCountInc},
        total_donation_amount = total_donation_amount + ${donationAmountInc},
        last_seen_at = ${this.sqlString(now)},
        updated_at = ${this.sqlString(now)}
      WHERE id = ${personId}
    `;

    try {
      await this.executeWithRetry(sql);
    } catch (error) {
      logger.warn("Snowflake person stats update failed", {
        error: error.message,
        personId,
      });
    }
  }

  /**
   * Person ID 조회 (캐시 우선)
   */
  async getPersonId(platform, platformUserId) {
    if (!platformUserId || platformUserId === "system") {
      return null;
    }

    const cacheKey = this.getPersonCacheKey(platform, platformUserId);
    if (this.personIdCache.has(cacheKey)) {
      return this.personIdCache.get(cacheKey);
    }

    if (!this.isConfigured() || !this.isConnected) {
      return null;
    }

    const sql = `
      SELECT id FROM ${this.config.database}.${this.config.schema}.PERSONS
      WHERE platform = ${this.sqlString(platform)}
        AND platform_user_id = ${this.sqlString(platformUserId)}
    `;

    try {
      const rows = await this.executeWithRetry(sql);
      if (rows && rows.length > 0) {
        const personId = rows[0].ID;
        this.personIdCache.set(cacheKey, personId);
        return personId;
      }
    } catch (error) {
      logger.warn("Snowflake person ID lookup failed", { error: error.message });
    }
    return null;
  }

  // ========================================
  // EVENTS (이벤트 로그)
  // ========================================

  /**
   * 이벤트를 배치 버퍼에 추가
   * @param {UnifiedEvent} normalizedEvent - 정규화된 이벤트
   */
  addEvent(normalizedEvent) {
    if (!this.isConfigured()) {
      return;
    }

    this.eventBuffer.push(normalizedEvent);

    if (this.eventBuffer.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * 버퍼의 이벤트들을 Snowflake에 저장
   */
  async flush() {
    if (this.eventBuffer.length === 0) {
      return;
    }

    if (!this.isConnected) {
      try {
        await this.connect();
      } catch (error) {
        this.sendToDeadLetter(this.eventBuffer, error.message);
        this.eventBuffer = [];
        return;
      }
    }

    const eventsToInsert = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      await this.batchInsertEvents(eventsToInsert);
      logger.info("Snowflake batch insert successful", {
        count: eventsToInsert.length,
      });
    } catch (error) {
      logger.error("Snowflake batch insert failed", {
        error: error.message,
        count: eventsToInsert.length,
      });
      this.sendToDeadLetter(eventsToInsert, error.message);
    }
  }

  /**
   * 배치 INSERT 실행 (새 스키마)
   */
  async batchInsertEvents(events) {
    if (events.length === 0) return;

    const values = events.map((event) => this.formatEventForInsert(event));

    const sql = `
      INSERT INTO ${this.config.database}.${this.config.schema}.EVENTS (
        id, event_type, platform,
        actor_person_id, actor_nickname, actor_role,
        target_person_id, target_channel_id,
        message, amount, original_amount, currency, donation_type,
        event_timestamp, raw_data
      )
      SELECT
        column1, column2, column3,
        column4, column5, column6,
        column7, column8,
        column9, column10, column11, column12, column13,
        column14, PARSE_JSON(column15)
      FROM VALUES ${values.join(",\n")}
    `;

    return this.executeWithRetry(sql);
  }

  /**
   * 이벤트를 SQL VALUES 형식으로 변환 (새 스키마)
   */
  formatEventForInsert(event) {
    const e = event;

    return `(
      ${this.sqlString(e.id)},
      ${this.sqlString(e.type)},
      ${this.sqlString(e.platform)},
      ${e.actorPersonId || "NULL"},
      ${this.sqlString(e.sender?.nickname)},
      ${this.sqlString(e.sender?.role)},
      ${e.targetPersonId || "NULL"},
      ${this.sqlString(e.metadata?.channelId)},
      ${this.sqlString(e.content?.message)},
      ${e.content?.amount || "NULL"},
      ${e.content?.originalAmount || "NULL"},
      ${this.sqlString(e.content?.currency)},
      ${this.sqlString(e.content?.donationType)},
      ${this.sqlString(e.metadata?.timestamp || new Date().toISOString())},
      ${this.sqlString(JSON.stringify(e.metadata?.rawData || {}))}
    )`;
  }

  // ========================================
  // BROADCASTS (방송 세션)
  // ========================================

  /**
   * 방송 정보 Upsert (MERGE)
   * 1행 = 1방송 (카테고리 변경 시 새 레코드 생성)
   * @param {Object} broadcast - 방송 정보
   *   - rootBroadcastId: 원본 방송 세션 ID (카테고리 변경으로 분리된 경우)
   */
  async upsertBroadcast(broadcast) {
    if (!this.isConfigured() || !this.isConnected) {
      return;
    }

    const now = new Date().toISOString();

    // CATEGORIES Lazy Loading: 새 카테고리 발견 시 즉시 저장
    if (broadcast.categoryId) {
      await this.upsertCategory({
        platform: broadcast.platform,
        categoryId: broadcast.categoryId,
        categoryName: broadcast.categoryName,
        thumbnailUrl: broadcast.thumbnailUrl,
      });
    }

    // root_broadcast_id 처리: 없으면 NULL (첫 방송), 있으면 그대로 사용
    const rootBroadcastIdValue = broadcast.rootBroadcastId
      ? broadcast.rootBroadcastId
      : "NULL";

    // 카테고리 변경 시 새 레코드 생성: category_id를 매칭 조건에 포함
    const sql = `
      MERGE INTO ${this.config.database}.${this.config.schema}.BROADCASTS AS target
      USING (SELECT
        ${this.sqlString(broadcast.platform)} AS platform,
        ${this.sqlString(broadcast.channelId)} AS channel_id,
        ${this.sqlString(broadcast.broadcastId)} AS broadcast_id,
        ${this.sqlString(broadcast.categoryId)} AS category_id
      ) AS source
      ON target.platform = source.platform
         AND target.channel_id = source.channel_id
         AND (target.broadcast_id = source.broadcast_id OR (target.broadcast_id IS NULL AND source.broadcast_id IS NULL))
         AND (target.category_id = source.category_id OR (target.category_id IS NULL AND source.category_id IS NULL))
      WHEN MATCHED THEN UPDATE SET
        broadcaster_person_id = ${broadcast.broadcasterPersonId || "broadcaster_person_id"},
        title = ${this.sqlString(broadcast.title)},
        category_name = COALESCE(${this.sqlString(broadcast.categoryName)}, category_name),
        thumbnail_url = ${this.sqlString(broadcast.thumbnailUrl)},
        current_viewer_count = ${broadcast.viewerCount || 0},
        peak_viewer_count = GREATEST(peak_viewer_count, ${broadcast.viewerCount || 0}),
        is_live = ${broadcast.isLive !== false ? "TRUE" : "FALSE"},
        ${broadcast.endedAt ? `ended_at = ${this.sqlString(broadcast.endedAt)},` : ""}
        ${broadcast.endedAt && broadcast.startedAt ? `duration_minutes = TIMESTAMPDIFF('minute', started_at, ${this.sqlString(broadcast.endedAt)}),` : ""}
        updated_at = ${this.sqlString(now)}
      WHEN NOT MATCHED THEN INSERT (
        platform, channel_id, broadcast_id, broadcaster_person_id,
        title, category_id, category_name, thumbnail_url,
        current_viewer_count, peak_viewer_count, is_live,
        started_at, recorded_at, updated_at, root_broadcast_id
      ) VALUES (
        ${this.sqlString(broadcast.platform)},
        ${this.sqlString(broadcast.channelId)},
        ${this.sqlString(broadcast.broadcastId)},
        ${broadcast.broadcasterPersonId || "NULL"},
        ${this.sqlString(broadcast.title)},
        ${this.sqlString(broadcast.categoryId)},
        ${this.sqlString(broadcast.categoryName)},
        ${this.sqlString(broadcast.thumbnailUrl)},
        ${broadcast.viewerCount || 0},
        ${broadcast.viewerCount || 0},
        ${broadcast.isLive !== false ? "TRUE" : "FALSE"},
        ${broadcast.startedAt ? this.sqlString(broadcast.startedAt) : this.sqlString(now)},
        ${this.sqlString(now)},
        ${this.sqlString(now)},
        ${rootBroadcastIdValue}
      )
    `;

    try {
      await this.executeWithRetry(sql);
      logger.debug("Snowflake broadcast upsert successful", {
        platform: broadcast.platform,
        channelId: broadcast.channelId,
        rootBroadcastId: broadcast.rootBroadcastId,
      });
    } catch (error) {
      logger.error("Snowflake broadcast upsert failed", {
        error: error.message,
        broadcast,
      });
    }
  }

  /**
   * 방송 ID 조회 (root_broadcast_id 설정용)
   * @param {string} platform
   * @param {string} channelId
   * @param {string} broadcastId - 플랫폼 방송 ID
   * @param {string} categoryId
   * @returns {Promise<number|null>} BROADCASTS.id
   */
  async getBroadcastId(platform, channelId, broadcastId, categoryId) {
    if (!this.isConfigured() || !this.isConnected) {
      return null;
    }

    const sql = `
      SELECT id FROM ${this.config.database}.${this.config.schema}.BROADCASTS
      WHERE platform = ${this.sqlString(platform)}
        AND channel_id = ${this.sqlString(channelId)}
        ${broadcastId ? `AND broadcast_id = ${this.sqlString(broadcastId)}` : "AND broadcast_id IS NULL"}
        ${categoryId ? `AND category_id = ${this.sqlString(categoryId)}` : "AND category_id IS NULL"}
      LIMIT 1
    `;

    try {
      const rows = await this.executeWithRetry(sql);
      if (rows && rows.length > 0) {
        return rows[0].ID;
      }
    } catch (error) {
      logger.warn("Snowflake broadcast ID lookup failed", { error: error.message });
    }
    return null;
  }

  /**
   * 방송 통계 업데이트 (채팅/후원 카운트 + 평균 시청자)
   * @param {string} platform
   * @param {string} channelId
   * @param {string} broadcastId
   * @param {string} categoryId - 카테고리 ID (카테고리별 레코드 구분)
   * @param {Object} stats - { chatCount, donationAmount, avgViewerCount, viewerSamples }
   */
  async updateBroadcastStats(platform, channelId, broadcastId, categoryId, stats) {
    if (!this.isConfigured() || !this.isConnected) {
      return;
    }

    const now = new Date().toISOString();
    const chatInc = stats.chatCount || 0;
    const donationInc = stats.donationAmount || 0;

    // avg_viewer_count 계산: viewerSamples가 있으면 평균 계산, 아니면 직접 전달된 값 사용
    let avgViewerCount = null;
    if (stats.viewerSamples && stats.viewerSamples.length > 0) {
      const sum = stats.viewerSamples.reduce((a, b) => a + b, 0);
      avgViewerCount = Math.round(sum / stats.viewerSamples.length);
    } else if (stats.avgViewerCount !== undefined) {
      avgViewerCount = stats.avgViewerCount;
    }

    const avgViewerUpdate = avgViewerCount !== null
      ? `avg_viewer_count = ${avgViewerCount},`
      : "";

    const sql = `
      UPDATE ${this.config.database}.${this.config.schema}.BROADCASTS
      SET
        total_chat_count = total_chat_count + ${chatInc},
        total_donation_amount = total_donation_amount + ${donationInc},
        ${avgViewerUpdate}
        updated_at = ${this.sqlString(now)}
      WHERE platform = ${this.sqlString(platform)}
        AND channel_id = ${this.sqlString(channelId)}
        ${broadcastId ? `AND broadcast_id = ${this.sqlString(broadcastId)}` : "AND broadcast_id IS NULL"}
        ${categoryId ? `AND category_id = ${this.sqlString(categoryId)}` : "AND category_id IS NULL"}
    `;

    try {
      await this.executeWithRetry(sql);
    } catch (error) {
      logger.warn("Snowflake broadcast stats update failed", {
        error: error.message,
        platform,
        channelId,
      });
    }
  }

  /**
   * 방송 정보 배치 Upsert
   * @param {Array} broadcasts - 방송 정보 배열
   */
  async upsertBroadcastsBatch(broadcasts) {
    if (!this.isConfigured() || !this.isConnected || broadcasts.length === 0) {
      return;
    }

    // 개별 upsert 실행 (MERGE는 배치 VALUES와 함께 쓰기 복잡)
    for (const broadcast of broadcasts) {
      await this.upsertBroadcast(broadcast);
    }

    logger.info("Snowflake broadcasts batch upsert successful", {
      count: broadcasts.length,
    });
  }

  // ========================================
  // CATEGORIES (카테고리)
  // ========================================

  /**
   * 카테고리 배치 Upsert (MERGE)
   * viewerCount, streamerCount 제거됨 - 카테고리 메타데이터만 저장
   * @param {string} platform - 플랫폼
   * @param {Array} categories - 카테고리 목록
   */
  async upsertCategories(platform, categories) {
    if (!this.isConfigured() || !this.isConnected || categories.length === 0) {
      return;
    }

    const now = new Date().toISOString();

    const values = categories
      .map(
        (cat) => `(
      ${this.sqlString(platform)},
      ${this.sqlString(cat.categoryId)},
      ${this.sqlString(cat.categoryName)},
      ${this.sqlString(cat.categoryType)},
      ${this.sqlString(cat.thumbnailUrl)},
      ${this.sqlString(now)}
    )`
      )
      .join(",\n");

    const sql = `
      MERGE INTO ${this.config.database}.${this.config.schema}.CATEGORIES AS target
      USING (
        SELECT
          column1 AS platform,
          column2 AS category_id,
          column3 AS category_name,
          column4 AS category_type,
          column5 AS thumbnail_url,
          column6 AS recorded_at
        FROM VALUES ${values}
      ) AS source
      ON target.platform = source.platform AND target.category_id = source.category_id
      WHEN MATCHED THEN UPDATE SET
        target.category_name = source.category_name,
        target.category_type = source.category_type,
        target.thumbnail_url = source.thumbnail_url,
        target.recorded_at = source.recorded_at,
        target.updated_at = source.recorded_at
      WHEN NOT MATCHED THEN INSERT (
        platform, category_id, category_name, category_type,
        thumbnail_url, recorded_at, updated_at
      ) VALUES (
        source.platform,
        source.category_id,
        source.category_name,
        source.category_type,
        source.thumbnail_url,
        source.recorded_at,
        source.recorded_at
      )
    `;

    try {
      await this.executeWithRetry(sql);
      logger.info("Snowflake categories batch upsert successful", {
        platform,
        count: categories.length,
      });
    } catch (error) {
      logger.error("Snowflake categories batch upsert failed", {
        error: error.message,
        platform,
        count: categories.length,
      });
    }
  }

  /**
   * 단일 카테고리 Upsert (wrapper)
   * @param {Object} category - { platform, categoryId, categoryName, categoryType, thumbnailUrl }
   */
  async upsertCategory(category) {
    if (!category.platform || !category.categoryId) {
      return;
    }
    return this.upsertCategories(category.platform, [category]);
  }

  /**
   * 하루 한 번 카테고리 일괄 업데이트 (매일 오전 9시 이후 첫 호출)
   * @param {string} platform - 플랫폼
   * @param {Array} categories - 카테고리 목록
   * @returns {boolean} - 업데이트 수행 여부
   */
  async upsertCategoriesDaily(platform, categories) {
    const cacheKey = `category_updated_${platform}`;
    const now = new Date();
    const today9AM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
    const lastUpdate = this._categoryUpdateCache?.get(cacheKey) || 0;

    // 오전 9시 이후 && 오늘 아직 업데이트 안 했으면 업데이트
    // (마지막 업데이트가 오늘 9시 이전이고, 현재가 9시 이후)
    const shouldUpdate = now >= today9AM && lastUpdate < today9AM.getTime();

    logger.debug(`[categories] ${platform}: lastUpdate=${lastUpdate}, shouldUpdate=${shouldUpdate}, now=${now.getTime()}, today9AM=${today9AM.getTime()}`);

    // 첫 실행이거나 조건 충족하지 않으면 스킵
    if (lastUpdate !== 0 && !shouldUpdate) {
      logger.debug(`[categories] ${platform}: Skipping - already updated today`);
      return false;
    }

    // 업데이트 수행
    await this.upsertCategories(platform, categories);

    // 캐시 갱신 (timestamp로 저장)
    if (!this._categoryUpdateCache) {
      this._categoryUpdateCache = new Map();
    }
    this._categoryUpdateCache.set(cacheKey, now.getTime());

    logger.info(`Categories daily update completed for ${platform}`, {
      count: categories.length,
    });
    return true;
  }

  // ========================================
  // VIEWER_ENGAGEMENT (채널별 참여 통계)
  // ========================================

  /**
   * 채널별 참여 통계 업데이트 (MERGE)
   * @param {Object} engagement - { personId, platform, channelId, broadcasterPersonId, chatCount, donationCount, donationAmount }
   */
  async upsertViewerEngagement(engagement) {
    if (!this.isConfigured() || !this.isConnected || !engagement.personId) {
      return;
    }

    const now = new Date().toISOString();
    const chatInc = engagement.chatCount || 0;
    const donationCountInc = engagement.donationCount || 0;
    const donationAmountInc = engagement.donationAmount || 0;

    const sql = `
      MERGE INTO ${this.config.database}.${this.config.schema}.VIEWER_ENGAGEMENT AS target
      USING (SELECT
        ${engagement.personId} AS person_id,
        ${this.sqlString(engagement.platform)} AS platform,
        ${this.sqlString(engagement.channelId)} AS channel_id
      ) AS source
      ON target.person_id = source.person_id
         AND target.platform = source.platform
         AND target.channel_id = source.channel_id
      WHEN MATCHED THEN UPDATE SET
        chat_count = chat_count + ${chatInc},
        donation_count = donation_count + ${donationCountInc},
        total_donation_amount = total_donation_amount + ${donationAmountInc},
        last_seen_at = ${this.sqlString(now)},
        updated_at = ${this.sqlString(now)}
      WHEN NOT MATCHED THEN INSERT (
        person_id, platform, channel_id, broadcaster_person_id,
        chat_count, donation_count, total_donation_amount,
        first_seen_at, last_seen_at, updated_at
      ) VALUES (
        ${engagement.personId},
        ${this.sqlString(engagement.platform)},
        ${this.sqlString(engagement.channelId)},
        ${engagement.broadcasterPersonId || "NULL"},
        ${chatInc},
        ${donationCountInc},
        ${donationAmountInc},
        ${this.sqlString(now)},
        ${this.sqlString(now)},
        ${this.sqlString(now)}
      )
    `;

    try {
      await this.executeWithRetry(sql);
    } catch (error) {
      logger.warn("Snowflake viewer engagement upsert failed", {
        error: error.message,
        personId: engagement.personId,
        channelId: engagement.channelId,
      });
    }
  }

  // ========================================
  // VIEWER_SNAPSHOTS (시청자 수 시계열)
  // ========================================

  /**
   * 시청자 스냅샷 INSERT
   * @param {Object} snapshot - { platform, channelId, broadcastId, viewerCount, chatRatePerMinute }
   */
  async insertViewerSnapshot(snapshot) {
    if (!this.isConfigured() || !this.isConnected) {
      return;
    }

    const now = new Date().toISOString();

    const sql = `
      INSERT INTO ${this.config.database}.${this.config.schema}.VIEWER_SNAPSHOTS (
        platform, channel_id, broadcast_id, viewer_count, chat_rate_per_minute, snapshot_at
      ) VALUES (
        ${this.sqlString(snapshot.platform)},
        ${this.sqlString(snapshot.channelId)},
        ${this.sqlString(snapshot.broadcastId)},
        ${snapshot.viewerCount || 0},
        ${snapshot.chatRatePerMinute || "NULL"},
        ${this.sqlString(now)}
      )
    `;

    try {
      await this.executeWithRetry(sql);
    } catch (error) {
      logger.warn("Snowflake viewer snapshot insert failed", {
        error: error.message,
        platform: snapshot.platform,
        channelId: snapshot.channelId,
      });
    }
  }

  /**
   * 시청자 스냅샷 배치 INSERT
   * @param {Array} snapshots - 스냅샷 배열
   */
  async insertViewerSnapshotsBatch(snapshots) {
    if (!this.isConfigured() || !this.isConnected || snapshots.length === 0) {
      return;
    }

    const now = new Date().toISOString();

    const values = snapshots
      .map(
        (s) => `(
      ${this.sqlString(s.platform)},
      ${this.sqlString(s.channelId)},
      ${this.sqlString(s.broadcastId)},
      ${s.viewerCount || 0},
      ${s.chatRatePerMinute || "NULL"},
      ${this.sqlString(now)}
    )`
      )
      .join(",\n");

    const sql = `
      INSERT INTO ${this.config.database}.${this.config.schema}.VIEWER_SNAPSHOTS (
        platform, channel_id, broadcast_id, viewer_count, chat_rate_per_minute, snapshot_at
      )
      SELECT column1, column2, column3, column4, column5, column6
      FROM VALUES ${values}
    `;

    try {
      await this.executeWithRetry(sql);
      logger.info("Snowflake viewer snapshots batch insert successful", {
        count: snapshots.length,
      });
    } catch (error) {
      logger.error("Snowflake viewer snapshots batch insert failed", {
        error: error.message,
        count: snapshots.length,
      });
    }
  }

  // ========================================
  // 유틸리티
  // ========================================

  /**
   * SQL 문자열 이스케이프
   */
  sqlString(value) {
    if (value === null || value === undefined) return "NULL";
    const escaped = String(value).replace(/'/g, "''");
    return `'${escaped}'`;
  }

  /**
   * 재시도 로직이 포함된 쿼리 실행
   */
  async executeWithRetry(sql, retryCount = 0) {
    return new Promise((resolve, reject) => {
      this.connection.execute({
        sqlText: sql,
        complete: async (err, stmt, rows) => {
          if (err) {
            if (retryCount < this.maxRetries) {
              logger.warn("Snowflake query retry", {
                retry: retryCount + 1,
                error: err.message,
              });

              if (this.isConnectionError(err)) {
                this.isConnected = false;
                try {
                  await this.connect();
                } catch (connErr) {
                  reject(connErr);
                  return;
                }
              }

              await this.sleep(this.retryDelayMs * Math.pow(2, retryCount));
              return resolve(this.executeWithRetry(sql, retryCount + 1));
            }
            reject(err);
            return;
          }
          resolve(rows);
        },
      });
    });
  }

  /**
   * 연결 오류 여부 확인
   */
  isConnectionError(err) {
    const message = err.message?.toLowerCase() || "";
    return (
      message.includes("connection") ||
      message.includes("network") ||
      message.includes("timeout")
    );
  }

  /**
   * Dead Letter Queue로 전송
   */
  sendToDeadLetter(events, errorMessage) {
    if (this.deadLetterCallback) {
      events.forEach((event) => this.deadLetterCallback(event, errorMessage));
    } else {
      logger.warn("Dead letter events discarded (no callback)", {
        count: events.length,
        error: errorMessage,
      });
    }
  }

  /**
   * 주기적 flush 시작
   */
  startFlushInterval() {
    if (this.flushTimer) return;

    this.flushTimer = setInterval(() => {
      this.flush().catch((err) => {
        logger.error("Scheduled flush failed", { error: err.message });
      });
    }, this.flushIntervalMs);

    logger.info("Snowflake flush interval started", {
      intervalMs: this.flushIntervalMs,
    });
  }

  /**
   * 주기적 flush 중지
   */
  stopFlushInterval() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
      logger.info("Snowflake flush interval stopped");
    }
  }

  /**
   * Sleep 유틸리티
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 버퍼 상태 조회 (모니터링용)
   */
  getStats() {
    return {
      isConnected: this.isConnected,
      isConfigured: this.isConfigured(),
      bufferSize: this.eventBuffer.length,
      batchSize: this.batchSize,
      flushIntervalMs: this.flushIntervalMs,
      personCacheSize: this.personIdCache.size,
    };
  }

  // ========================================
  // 하위 호환성 (Deprecated)
  // ========================================

  /**
   * @deprecated Use upsertPerson instead
   */
  async upsertStreamer(streamer) {
    return this.upsertPerson({
      platform: streamer.platform,
      platformUserId: streamer.streamerId || streamer.channelId,
      nickname: streamer.nickname,
      profileImageUrl: streamer.profileImageUrl,
      channelId: streamer.channelId,
      followerCount: streamer.followerCount,
      subscriberCount: streamer.subscriberCount,
    });
  }

  /**
   * @deprecated Use upsertPerson + upsertViewerEngagement instead
   */
  async upsertChatUser(user, eventType = "chat", donationAmount = 0) {
    const personId = await this.upsertPerson({
      platform: user.platform,
      platformUserId: user.id,
      nickname: user.nickname,
      profileImageUrl: user.profileImage,
    });

    if (personId) {
      const chatCount = eventType === "chat" ? 1 : 0;
      const donationCount = eventType === "donation" ? 1 : 0;

      await this.updatePersonStats(personId, {
        chatCount,
        donationCount,
        donationAmount,
      });

      if (user.channelId) {
        await this.upsertViewerEngagement({
          personId,
          platform: user.platform,
          channelId: user.channelId,
          chatCount,
          donationCount,
          donationAmount,
        });
      }
    }
  }
}

// 싱글톤 인스턴스
let snowflakeInstance = null;

/**
 * SnowflakeService 인스턴스 가져오기
 */
const getSnowflakeService = (options = {}) => {
  if (!snowflakeInstance) {
    snowflakeInstance = new SnowflakeService(options);
  }
  return snowflakeInstance;
};

/**
 * SnowflakeService 초기화 (서버 시작 시)
 */
const initSnowflakeService = async (options = {}) => {
  const service = getSnowflakeService(options);

  if (service.isConfigured()) {
    try {
      await service.connect();
      return service;
    } catch (error) {
      logger.error("Snowflake initialization failed", {
        error: error.message,
      });
      return service;
    }
  }

  logger.info("Snowflake not configured - running without data warehouse");
  return service;
};

module.exports = {
  SnowflakeService,
  getSnowflakeService,
  initSnowflakeService,
};
