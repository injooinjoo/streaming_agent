/**
 * Chzzk API Collector
 *
 * 치지직 API를 통해 방송 목록 및 메타데이터 수집
 * - 5분 주기 폴링
 * - 전체 라이브 방송 목록 수집
 * - 방송 시작/종료 감지
 *
 * Snowflake 전용
 */

const EventEmitter = require("events");
const { getSnowflakeConnection } = require("../../db/snowflake-connection");

class ChzzkApiCollector extends EventEmitter {
  constructor() {
    super();

    this.snowflake = null;
    this.defaultHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept": "application/json",
    };

    // 현재 라이브 방송 캐시 (종료 감지용)
    this.currentLiveBroadcasts = new Map();

    // 방송 메타데이터 캐시 (변경 감지용)
    this.broadcastMetaCache = new Map();
  }

  /**
   * Snowflake 연결 초기화
   */
  async initSnowflake() {
    if (!this.snowflake) {
      this.snowflake = getSnowflakeConnection();
      await this.snowflake.connect();
    }
  }

  /**
   * 전체 라이브 방송 수집
   * @returns {Promise<Array>}
   */
  async collectAllLiveBroadcasts() {
    await this.initSnowflake();

    const allBroadcasts = [];
    let offset = 0;
    const pageSize = 50;
    const maxPages = 40; // 최대 2000개 방송

    for (let page = 0; page < maxPages; page++) {
      try {
        const broadcasts = await this.fetchBroadcastPage(pageSize, offset);

        if (!broadcasts || broadcasts.length === 0) {
          break;
        }

        allBroadcasts.push(...broadcasts);
        offset += pageSize;

        // 100ms 대기 (rate limiting)
        await this.sleep(100);
      } catch (err) {
        console.error(`[ChzzkApiCollector] Page ${page + 1} fetch error:`, err.message);
        break;
      }
    }

    // 수집된 방송 처리
    await this.processBroadcasts(allBroadcasts);

    // 종료된 방송 감지
    await this.detectEndedBroadcasts(allBroadcasts);

    return allBroadcasts;
  }

  /**
   * 방송 목록 페이지 조회
   * @param {number} size - 페이지 크기
   * @param {number} offset - 오프셋
   * @returns {Promise<Array>}
   */
  async fetchBroadcastPage(size = 50, offset = 0) {
    const response = await fetch(
      `https://api.chzzk.naver.com/service/v1/home/lives?size=${size}&offset=${offset}`,
      { headers: this.defaultHeaders }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // API 응답: data.content.streamingLiveList
    if (!data || !data.content || !data.content.streamingLiveList) {
      return [];
    }

    return data.content.streamingLiveList;
  }

  /**
   * 수집된 방송 처리 (DB 저장)
   * @param {Array} broadcasts
   */
  async processBroadcasts(broadcasts) {
    const newLiveBroadcasts = new Map();

    for (const broadcast of broadcasts) {
      const channelId = broadcast.channel?.channelId;
      if (!channelId) continue;

      try {
        // 스트리머 저장/업데이트
        await this.upsertStreamer(broadcast);

        // 방송 저장/업데이트
        await this.upsertBroadcast(broadcast);

        // 스냅샷 저장
        await this.saveBroadcastSnapshot(broadcast);

        // 변경 감지 (제목, 카테고리)
        await this.detectBroadcastChanges(channelId, broadcast);

        newLiveBroadcasts.set(channelId, broadcast);
      } catch (err) {
        console.warn(`[ChzzkApiCollector] Process broadcast ${channelId} error:`, err.message);
      }
    }

    // 현재 라이브 캐시 업데이트
    this.currentLiveBroadcasts = newLiveBroadcasts;
  }

  /**
   * 방송 메타데이터 변경 감지
   * @param {string} channelId
   * @param {Object} broadcast
   */
  async detectBroadcastChanges(channelId, broadcast) {
    const currentMeta = {
      title: broadcast.liveTitle,
      category: broadcast.liveCategoryValue || broadcast.liveCategory,
    };

    const cachedMeta = this.broadcastMetaCache.get(channelId);

    if (cachedMeta) {
      // 제목 변경 감지
      if (cachedMeta.title !== currentMeta.title) {
        await this.saveBroadcastChange(channelId, "title", cachedMeta.title, currentMeta.title);
        console.log(`[ChzzkApiCollector] Title changed: ${channelId}`);
      }

      // 카테고리 변경 감지
      if (cachedMeta.category !== currentMeta.category) {
        await this.saveBroadcastChange(channelId, "category", cachedMeta.category, currentMeta.category);
        console.log(`[ChzzkApiCollector] Category changed: ${channelId}`);
      }
    }

    // 캐시 업데이트
    this.broadcastMetaCache.set(channelId, currentMeta);
  }

  /**
   * 방송 변경 기록 저장
   */
  async saveBroadcastChange(channelId, fieldName, oldValue, newValue) {
    await this.snowflake.run(
      `INSERT INTO BROADCAST_CHANGES (BROADCAST_ID, FIELD_NAME, OLD_VALUE, NEW_VALUE)
       SELECT b.ID, ?, ?, ?
       FROM BROADCASTS b
       WHERE b.PLATFORM = 'chzzk' AND b.BROADCAST_ID = ?`,
      [fieldName, oldValue, newValue, channelId]
    );
  }

  /**
   * 스트리머 저장/업데이트
   */
  async upsertStreamer(broadcast) {
    const channel = broadcast.channel || {};

    await this.snowflake.run(
      `MERGE INTO PLATFORM_USERS AS target
       USING (SELECT 'chzzk' AS PLATFORM, ? AS PLATFORM_USER_ID, ? AS USERNAME, ? AS NICKNAME) AS source
       ON target.PLATFORM = source.PLATFORM AND target.PLATFORM_USER_ID = source.PLATFORM_USER_ID
       WHEN MATCHED THEN UPDATE SET NICKNAME = source.NICKNAME, IS_STREAMER = TRUE, LAST_SEEN_AT = CURRENT_TIMESTAMP()
       WHEN NOT MATCHED THEN INSERT (PLATFORM, PLATFORM_USER_ID, USERNAME, NICKNAME, IS_STREAMER) VALUES (source.PLATFORM, source.PLATFORM_USER_ID, source.USERNAME, source.NICKNAME, TRUE)`,
      [channel.channelId, channel.channelId, channel.channelName || "Unknown"]
    );
  }

  /**
   * 방송 저장/업데이트
   */
  async upsertBroadcast(broadcast) {
    const channel = broadcast.channel || {};
    const channelId = channel.channelId;
    const tags = JSON.stringify(broadcast.tags || []);
    const viewers = broadcast.concurrentUserCount || 0;

    await this.snowflake.run(
      `MERGE INTO BROADCASTS AS target
       USING (SELECT 'chzzk' AS PLATFORM, ? AS BROADCAST_ID, ? AS STREAMER_USERNAME, ? AS TITLE, ? AS CATEGORY, PARSE_JSON(?) AS TAGS, TO_TIMESTAMP_NTZ(?) AS STARTED_AT, ? AS VIEWERS) AS source
       ON target.PLATFORM = source.PLATFORM AND target.BROADCAST_ID = source.BROADCAST_ID
       WHEN MATCHED THEN UPDATE SET
         TITLE = source.TITLE,
         CATEGORY = source.CATEGORY,
         IS_LIVE = TRUE,
         PEAK_VIEWERS = GREATEST(target.PEAK_VIEWERS, source.VIEWERS)
       WHEN NOT MATCHED THEN INSERT
         (PLATFORM, BROADCAST_ID, STREAMER_USERNAME, TITLE, CATEGORY, TAGS, STARTED_AT, IS_LIVE, PEAK_VIEWERS)
       VALUES (source.PLATFORM, source.BROADCAST_ID, source.STREAMER_USERNAME, source.TITLE, source.CATEGORY, source.TAGS, source.STARTED_AT, TRUE, source.VIEWERS)`,
      [channelId, channel.channelId, broadcast.liveTitle || "무제", broadcast.liveCategoryValue || broadcast.liveCategory || "기타", tags, broadcast.openDate || new Date().toISOString(), viewers]
    );

    await this.snowflake.run(
      `UPDATE BROADCASTS SET STREAMER_ID = (
        SELECT ID FROM PLATFORM_USERS WHERE PLATFORM = 'chzzk' AND PLATFORM_USER_ID = ?
      ) WHERE PLATFORM = 'chzzk' AND BROADCAST_ID = ? AND STREAMER_ID IS NULL`,
      [channelId, channelId]
    );
  }

  /**
   * 방송 스냅샷 저장
   */
  async saveBroadcastSnapshot(broadcast) {
    const channel = broadcast.channel || {};
    const channelId = channel.channelId;
    const snapshotAt = this.roundToFiveMinutes(new Date()).toISOString();
    const viewers = broadcast.concurrentUserCount || 0;

    await this.snowflake.run(
      `MERGE INTO BROADCAST_SNAPSHOTS AS target
       USING (
         SELECT b.ID AS BROADCAST_ID, ? AS SNAPSHOT_AT, ? AS TOTAL_VIEWERS, ? AS TITLE, ? AS CATEGORY
         FROM BROADCASTS b WHERE b.PLATFORM = 'chzzk' AND b.BROADCAST_ID = ?
       ) AS source
       ON target.BROADCAST_ID = source.BROADCAST_ID AND target.SNAPSHOT_AT = source.SNAPSHOT_AT
       WHEN MATCHED THEN UPDATE SET TOTAL_VIEWERS = source.TOTAL_VIEWERS, TITLE = source.TITLE, CATEGORY = source.CATEGORY
       WHEN NOT MATCHED THEN INSERT (BROADCAST_ID, SNAPSHOT_AT, TOTAL_VIEWERS, TITLE, CATEGORY) VALUES (source.BROADCAST_ID, source.SNAPSHOT_AT, source.TOTAL_VIEWERS, source.TITLE, source.CATEGORY)`,
      [snapshotAt, viewers, broadcast.liveTitle || "무제", broadcast.liveCategoryValue || broadcast.liveCategory || "기타", channelId]
    );
  }

  /**
   * 종료된 방송 감지
   */
  async detectEndedBroadcasts(currentBroadcasts) {
    const currentIds = new Set(
      currentBroadcasts.map((b) => b.channel?.channelId).filter(Boolean)
    );

    // 이전에 라이브였지만 지금 없는 방송 = 종료
    for (const [channelId] of this.currentLiveBroadcasts) {
      if (!currentIds.has(channelId)) {
        await this.markBroadcastEnded(channelId);
      }
    }
  }

  /**
   * 방송 종료 처리
   */
  async markBroadcastEnded(channelId) {
    await this.snowflake.run(
      `UPDATE BROADCASTS SET
         IS_LIVE = FALSE,
         ENDED_AT = CURRENT_TIMESTAMP(),
         DURATION_SECONDS = DATEDIFF('second', STARTED_AT, CURRENT_TIMESTAMP())
       WHERE PLATFORM = 'chzzk' AND BROADCAST_ID = ? AND IS_LIVE = TRUE`,
      [channelId]
    );
    console.log(`[ChzzkApiCollector] Broadcast ended: ${channelId}`);
    this.emit("broadcast-ended", { channelId });
  }

  /**
   * 채널의 라이브 상세 정보 조회
   */
  async fetchLiveDetail(channelId) {
    try {
      const response = await fetch(
        `https://api.chzzk.naver.com/service/v3/channels/${channelId}/live-detail`,
        { headers: this.defaultHeaders }
      );

      const data = await response.json();

      if (data.code !== 200 || !data.content) {
        return null;
      }

      return data.content;
    } catch (err) {
      console.error(`[ChzzkApiCollector] Fetch live detail error:`, err.message);
      return null;
    }
  }

  /**
   * 시간을 5분 단위로 반올림
   */
  roundToFiveMinutes(date) {
    const ms = date.getTime();
    const fiveMin = 5 * 60 * 1000;
    return new Date(Math.floor(ms / fiveMin) * fiveMin);
  }

  /**
   * 대기
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = ChzzkApiCollector;
