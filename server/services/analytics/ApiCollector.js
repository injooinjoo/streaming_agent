/**
 * API Collector
 *
 * SOOP API를 통해 방송 목록 및 메타데이터 수집
 * - 5분 주기 폴링
 * - 전체 라이브 방송 목록 수집
 * - 방송 시작/종료 감지
 *
 * Snowflake 전용
 */

const EventEmitter = require("events");
const { getSnowflakeConnection } = require("../../db/snowflake-connection");

class ApiCollector extends EventEmitter {
  constructor() {
    super();

    this.snowflake = null;
    this.defaultHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: "https://play.sooplive.co.kr/",
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
    let page = 1;
    const maxPages = 20; // 안전 장치

    while (page <= maxPages) {
      try {
        const broadcasts = await this.fetchBroadcastPage(page);

        if (!broadcasts || broadcasts.length === 0) {
          break;
        }

        allBroadcasts.push(...broadcasts);
        page++;

        // 너무 빠른 요청 방지
        await this.sleep(100);
      } catch (err) {
        console.error(`[ApiCollector] Page ${page} fetch error:`, err.message);
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
   */
  async fetchBroadcastPage(page) {
    const response = await fetch(
      "https://live.sooplive.co.kr/api/main_broad_list_api.php",
      {
        method: "POST",
        headers: this.defaultHeaders,
        body: `selectType=action&selectValue=all&orderType=view_cnt&pageNo=${page}&lang=ko_KR`,
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.broad || [];
  }

  /**
   * 수집된 방송 처리 (DB 저장)
   */
  async processBroadcasts(broadcasts) {
    const newLiveBroadcasts = new Map();

    for (const broadcast of broadcasts) {
      const broadcastId = broadcast.broad_no || broadcast.bno;

      try {
        // 스트리머 저장/업데이트
        await this.upsertStreamer(broadcast);

        // 방송 저장/업데이트
        await this.upsertBroadcast(broadcast);

        // 스냅샷 저장
        await this.saveBroadcastSnapshot(broadcast);

        // 변경 감지 (제목, 카테고리)
        await this.detectBroadcastChanges(broadcastId, broadcast);

        newLiveBroadcasts.set(broadcastId, broadcast);
      } catch (err) {
        console.warn(`[ApiCollector] Process broadcast ${broadcastId} error:`, err.message);
      }
    }

    // 현재 라이브 캐시 업데이트
    this.currentLiveBroadcasts = newLiveBroadcasts;
  }

  /**
   * 방송 메타데이터 변경 감지
   */
  async detectBroadcastChanges(broadcastId, broadcast) {
    const currentMeta = {
      title: broadcast.broad_title,
      category: broadcast.category_name,
      subCategory: broadcast.sub_category || null,
    };

    const cachedMeta = this.broadcastMetaCache.get(broadcastId);

    if (cachedMeta) {
      // 제목 변경 감지
      if (cachedMeta.title !== currentMeta.title) {
        await this.saveBroadcastChange(broadcastId, "title", cachedMeta.title, currentMeta.title);
        console.log(`[ApiCollector] Title changed: ${broadcastId} "${cachedMeta.title}" → "${currentMeta.title}"`);
      }

      // 카테고리 변경 감지
      if (cachedMeta.category !== currentMeta.category) {
        await this.saveBroadcastChange(broadcastId, "category", cachedMeta.category, currentMeta.category);
        console.log(`[ApiCollector] Category changed: ${broadcastId} "${cachedMeta.category}" → "${currentMeta.category}"`);
      }

      // 서브카테고리 변경 감지
      if (cachedMeta.subCategory !== currentMeta.subCategory) {
        await this.saveBroadcastChange(broadcastId, "sub_category", cachedMeta.subCategory, currentMeta.subCategory);
      }
    }

    // 캐시 업데이트
    this.broadcastMetaCache.set(broadcastId, currentMeta);
  }

  /**
   * 방송 변경 기록 저장
   */
  async saveBroadcastChange(broadcastId, fieldName, oldValue, newValue) {
    await this.snowflake.run(
      `INSERT INTO BROADCAST_CHANGES (BROADCAST_ID, FIELD_NAME, OLD_VALUE, NEW_VALUE)
       SELECT b.ID, ?, ?, ?
       FROM BROADCASTS b
       WHERE b.PLATFORM = 'soop' AND b.BROADCAST_ID = ?`,
      [fieldName, oldValue, newValue, broadcastId]
    );
  }

  /**
   * 스트리머 저장/업데이트
   */
  async upsertStreamer(broadcast) {
    await this.snowflake.run(
      `MERGE INTO PLATFORM_USERS AS target
       USING (SELECT 'soop' AS PLATFORM, ? AS PLATFORM_USER_ID, ? AS USERNAME, ? AS NICKNAME) AS source
       ON target.PLATFORM = source.PLATFORM AND target.PLATFORM_USER_ID = source.PLATFORM_USER_ID
       WHEN MATCHED THEN UPDATE SET NICKNAME = source.NICKNAME, IS_STREAMER = TRUE, LAST_SEEN_AT = CURRENT_TIMESTAMP()
       WHEN NOT MATCHED THEN INSERT (PLATFORM, PLATFORM_USER_ID, USERNAME, NICKNAME, IS_STREAMER) VALUES (source.PLATFORM, source.PLATFORM_USER_ID, source.USERNAME, source.NICKNAME, TRUE)`,
      [broadcast.user_id, broadcast.user_id, broadcast.user_nick]
    );
  }

  /**
   * 방송 저장/업데이트
   */
  async upsertBroadcast(broadcast) {
    const broadcastId = broadcast.broad_no || broadcast.bno;
    const tags = JSON.stringify(broadcast.hash_tags || []);
    const viewers = parseInt(broadcast.total_view_cnt, 10) || 0;

    await this.snowflake.run(
      `MERGE INTO BROADCASTS AS target
       USING (SELECT 'soop' AS PLATFORM, ? AS BROADCAST_ID, ? AS STREAMER_USERNAME, ? AS TITLE, ? AS CATEGORY, ? AS SUB_CATEGORY, PARSE_JSON(?) AS TAGS, TO_TIMESTAMP_NTZ(?) AS STARTED_AT, ? AS VIEWERS) AS source
       ON target.PLATFORM = source.PLATFORM AND target.BROADCAST_ID = source.BROADCAST_ID
       WHEN MATCHED THEN UPDATE SET
         TITLE = source.TITLE,
         CATEGORY = source.CATEGORY,
         IS_LIVE = TRUE,
         PEAK_VIEWERS = GREATEST(target.PEAK_VIEWERS, source.VIEWERS)
       WHEN NOT MATCHED THEN INSERT
         (PLATFORM, BROADCAST_ID, STREAMER_USERNAME, TITLE, CATEGORY, SUB_CATEGORY, TAGS, STARTED_AT, IS_LIVE, PEAK_VIEWERS)
       VALUES (source.PLATFORM, source.BROADCAST_ID, source.STREAMER_USERNAME, source.TITLE, source.CATEGORY, source.SUB_CATEGORY, source.TAGS, source.STARTED_AT, TRUE, source.VIEWERS)`,
      [broadcastId, broadcast.user_id, broadcast.broad_title, broadcast.category_name, broadcast.sub_category || null, tags, broadcast.broad_start, viewers]
    );

    // streamer_id 업데이트
    await this.snowflake.run(
      `UPDATE BROADCASTS SET STREAMER_ID = (
        SELECT ID FROM PLATFORM_USERS WHERE PLATFORM = 'soop' AND PLATFORM_USER_ID = ?
      ) WHERE PLATFORM = 'soop' AND BROADCAST_ID = ? AND STREAMER_ID IS NULL`,
      [broadcast.user_id, broadcastId]
    );
  }

  /**
   * 방송 스냅샷 저장
   */
  async saveBroadcastSnapshot(broadcast) {
    const broadcastId = broadcast.broad_no || broadcast.bno;
    const snapshotAt = this.roundToFiveMinutes(new Date()).toISOString();
    const totalViewers = parseInt(broadcast.total_view_cnt, 10) || 0;
    const pcViewers = parseInt(broadcast.pc_view_cnt, 10) || 0;
    const mobileViewers = parseInt(broadcast.mobile_view_cnt, 10) || 0;

    await this.snowflake.run(
      `MERGE INTO BROADCAST_SNAPSHOTS AS target
       USING (
         SELECT b.ID AS BROADCAST_ID, ? AS SNAPSHOT_AT, ? AS TOTAL_VIEWERS, ? AS PC_VIEWERS, ? AS MOBILE_VIEWERS, ? AS TITLE, ? AS CATEGORY
         FROM BROADCASTS b WHERE b.PLATFORM = 'soop' AND b.BROADCAST_ID = ?
       ) AS source
       ON target.BROADCAST_ID = source.BROADCAST_ID AND target.SNAPSHOT_AT = source.SNAPSHOT_AT
       WHEN MATCHED THEN UPDATE SET TOTAL_VIEWERS = source.TOTAL_VIEWERS, PC_VIEWERS = source.PC_VIEWERS, MOBILE_VIEWERS = source.MOBILE_VIEWERS, TITLE = source.TITLE, CATEGORY = source.CATEGORY
       WHEN NOT MATCHED THEN INSERT (BROADCAST_ID, SNAPSHOT_AT, TOTAL_VIEWERS, PC_VIEWERS, MOBILE_VIEWERS, TITLE, CATEGORY) VALUES (source.BROADCAST_ID, source.SNAPSHOT_AT, source.TOTAL_VIEWERS, source.PC_VIEWERS, source.MOBILE_VIEWERS, source.TITLE, source.CATEGORY)`,
      [snapshotAt, totalViewers, pcViewers, mobileViewers, broadcast.broad_title, broadcast.category_name, broadcastId]
    );
  }

  /**
   * 종료된 방송 감지
   */
  async detectEndedBroadcasts(currentBroadcasts) {
    const currentIds = new Set(
      currentBroadcasts.map((b) => b.broad_no || b.bno)
    );

    // 이전에 라이브였지만 지금 없는 방송 = 종료
    for (const [broadcastId] of this.currentLiveBroadcasts) {
      if (!currentIds.has(broadcastId)) {
        await this.markBroadcastEnded(broadcastId);
      }
    }
  }

  /**
   * 방송 종료 처리
   */
  async markBroadcastEnded(broadcastId) {
    await this.snowflake.run(
      `UPDATE BROADCASTS SET
         IS_LIVE = FALSE,
         ENDED_AT = CURRENT_TIMESTAMP(),
         DURATION_SECONDS = DATEDIFF('SECOND', STARTED_AT, CURRENT_TIMESTAMP())
       WHERE PLATFORM = 'soop' AND BROADCAST_ID = ? AND IS_LIVE = TRUE`,
      [broadcastId]
    );
    console.log(`[ApiCollector] Broadcast ended: ${broadcastId}`);
    this.emit("broadcast-ended", { broadcastId });
  }

  /**
   * 특정 스트리머의 방송 정보 조회
   */
  async fetchStreamerBroadcast(streamerId) {
    try {
      const response = await fetch(
        `https://live.sooplive.co.kr/afreeca/player_live_api.php?bjid=${streamerId}`,
        {
          method: "POST",
          headers: this.defaultHeaders,
          body: `bid=${streamerId}&type=live&player_type=html5&stream_type=common&quality=original&mode=landing`,
        }
      );

      const data = await response.json();

      if (data.CHANNEL?.RESULT !== 1) {
        return null;
      }

      return {
        broadcastId: data.CHANNEL.BNO,
        chatNo: data.CHANNEL.CHATNO,
        chatDomain: data.CHANNEL.CHDOMAIN,
        chatPort: parseInt(data.CHANNEL.CHPT, 10) || 8584,
        title: data.CHANNEL.TITLE,
        category: data.CHANNEL.CATE,
      };
    } catch (err) {
      console.error(`[ApiCollector] Fetch streamer ${streamerId} error:`, err.message);
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

module.exports = ApiCollector;
