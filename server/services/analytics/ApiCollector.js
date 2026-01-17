/**
 * API Collector
 *
 * SOOP API를 통해 방송 목록 및 메타데이터 수집
 * - 5분 주기 폴링
 * - 전체 라이브 방송 목록 수집
 * - 방송 시작/종료 감지
 */

const EventEmitter = require("events");

class ApiCollector extends EventEmitter {
  /**
   * @param {sqlite3.Database} db
   */
  constructor(db) {
    super();

    this.db = db;
    this.defaultHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: "https://play.sooplive.co.kr/",
    };

    // 현재 라이브 방송 캐시 (종료 감지용)
    this.currentLiveBroadcasts = new Map();
  }

  /**
   * 전체 라이브 방송 수집
   * @returns {Promise<Array>}
   */
  async collectAllLiveBroadcasts() {
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
   * @param {number} page
   * @returns {Promise<Array>}
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
   * @param {Array} broadcasts
   */
  async processBroadcasts(broadcasts) {
    const now = new Date();
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

        newLiveBroadcasts.set(broadcastId, broadcast);
      } catch (err) {
        console.warn(`[ApiCollector] Process broadcast ${broadcastId} error:`, err.message);
      }
    }

    // 현재 라이브 캐시 업데이트
    this.currentLiveBroadcasts = newLiveBroadcasts;
  }

  /**
   * 스트리머 저장/업데이트
   * @param {Object} broadcast
   */
  upsertStreamer(broadcast) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO platform_users
         (platform, platform_user_id, username, nickname, is_streamer, last_seen_at)
         VALUES ('soop', ?, ?, ?, 1, CURRENT_TIMESTAMP)
         ON CONFLICT(platform, platform_user_id) DO UPDATE SET
           nickname = excluded.nickname,
           is_streamer = 1,
           last_seen_at = CURRENT_TIMESTAMP`,
        [broadcast.user_id, broadcast.user_id, broadcast.user_nick],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  /**
   * 방송 저장/업데이트
   * @param {Object} broadcast
   */
  upsertBroadcast(broadcast) {
    return new Promise((resolve, reject) => {
      const broadcastId = broadcast.broad_no || broadcast.bno;
      const tags = JSON.stringify(broadcast.hash_tags || []);

      this.db.run(
        `INSERT INTO broadcasts
         (platform, broadcast_id, streamer_username, title, category, sub_category, tags, started_at, is_live)
         VALUES ('soop', ?, ?, ?, ?, ?, ?, ?, 1)
         ON CONFLICT(platform, broadcast_id) DO UPDATE SET
           title = excluded.title,
           category = excluded.category,
           is_live = 1,
           peak_viewers = MAX(peak_viewers, ?)`,
        [
          broadcastId,
          broadcast.user_id,
          broadcast.broad_title,
          broadcast.category_name,
          broadcast.sub_category || null,
          tags,
          broadcast.broad_start,
          parseInt(broadcast.total_view_cnt, 10) || 0,
        ],
        function (err) {
          if (err) reject(err);
          else {
            // streamer_id 업데이트 (서브쿼리)
            this.db?.run(
              `UPDATE broadcasts SET streamer_id = (
                SELECT id FROM platform_users
                WHERE platform = 'soop' AND platform_user_id = ?
              ) WHERE platform = 'soop' AND broadcast_id = ? AND streamer_id IS NULL`,
              [broadcast.user_id, broadcastId]
            );
            resolve();
          }
        }
      );
    });
  }

  /**
   * 방송 스냅샷 저장
   * @param {Object} broadcast
   */
  saveBroadcastSnapshot(broadcast) {
    return new Promise((resolve, reject) => {
      const broadcastId = broadcast.broad_no || broadcast.bno;
      const snapshotAt = this.roundToFiveMinutes(new Date()).toISOString();

      this.db.run(
        `INSERT OR REPLACE INTO broadcast_snapshots
         (broadcast_id, snapshot_at, total_viewers, pc_viewers, mobile_viewers, title, category)
         SELECT
           b.id,
           ?,
           ?,
           ?,
           ?,
           ?,
           ?
         FROM broadcasts b
         WHERE b.platform = 'soop' AND b.broadcast_id = ?`,
        [
          snapshotAt,
          parseInt(broadcast.total_view_cnt, 10) || 0,
          parseInt(broadcast.pc_view_cnt, 10) || 0,
          parseInt(broadcast.mobile_view_cnt, 10) || 0,
          broadcast.broad_title,
          broadcast.category_name,
          broadcastId,
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  /**
   * 종료된 방송 감지
   * @param {Array} currentBroadcasts
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
   * @param {string} broadcastId
   */
  markBroadcastEnded(broadcastId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE broadcasts SET
           is_live = 0,
           ended_at = CURRENT_TIMESTAMP,
           duration_seconds = CAST(
             (julianday(CURRENT_TIMESTAMP) - julianday(started_at)) * 86400 AS INTEGER
           )
         WHERE platform = 'soop' AND broadcast_id = ? AND is_live = 1`,
        [broadcastId],
        (err) => {
          if (err) reject(err);
          else {
            console.log(`[ApiCollector] Broadcast ended: ${broadcastId}`);
            this.emit("broadcast-ended", { broadcastId });
            resolve();
          }
        }
      );
    });
  }

  /**
   * 특정 스트리머의 방송 정보 조회
   * @param {string} streamerId - 스트리머 ID (username)
   * @returns {Promise<Object|null>}
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
   * @param {Date} date
   * @returns {Date}
   */
  roundToFiveMinutes(date) {
    const ms = date.getTime();
    const fiveMin = 5 * 60 * 1000;
    return new Date(Math.floor(ms / fiveMin) * fiveMin);
  }

  /**
   * 대기
   * @param {number} ms
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = ApiCollector;
