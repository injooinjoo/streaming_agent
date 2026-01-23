/**
 * ViewerEstimationService - 시청자 수 추정 서비스 (Chzzk 하이브리드)
 *
 * Chzzk는 입장/퇴장 이벤트가 없으므로 다음 방법으로 추정:
 * 1. 활동 시청자 (채팅/후원) - 확실한 최소치
 * 2. 평균 동시 접속자 × 회전율 계수 - 통계 기반
 * 3. 두 값의 최대치를 총 시청자 수로 추정
 *
 * 정확도: 60-70%
 *
 * Supports both SQLite (development) and PostgreSQL (production/Supabase)
 */

const { db: dbLogger } = require("./logger");
const { getSQLHelpers, isPostgres } = require("../config/database.config");

class ViewerEstimationService {
  constructor(db) {
    this.db = db;

    // 추정 계수 (플랫폼별로 다를 수 있음)
    this.COEFFICIENTS = {
      // 채팅 참여율 (전체 시청자 중 채팅하는 비율)
      CHAT_PARTICIPATION_RATE: 0.3, // 30%

      // 회전율 계수 (평균 동접 대비 총 시청자 비율)
      // 예: 평균 1000명이면 총 2500명이 들락날락
      VIEWER_TURNOVER_RATE: 2.5,

      // 최소 신뢰 구간
      MIN_CONFIDENCE_THRESHOLD: 10, // 최소 10명의 활동 시청자 필요
    };
  }

  /**
   * 활동 시청자 카운트 (채팅/후원한 사람)
   * @param {string} channelId - 채널 ID
   * @param {string} platform - 플랫폼
   * @param {string} timeRange - 시작 시간 (ISO format)
   * @returns {Promise<number>}
   */
  async getActiveViewers(channelId, platform, timeRange) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT COUNT(DISTINCT actor_person_id) as count
         FROM events
         WHERE target_channel_id = ?
           AND platform = ?
           AND event_timestamp >= ?
           AND actor_person_id IS NOT NULL`,
        [channelId, platform, timeRange],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row?.count || 0);
          }
        }
      );
    });
  }

  /**
   * 평균 동시 접속자 수 조회
   * @param {number} broadcastId - 방송 ID
   * @returns {Promise<number>}
   */
  async getAverageConcurrentViewers(broadcastId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT AVG(viewer_count) as avg_count
         FROM viewer_snapshots
         WHERE broadcast_id = ?`,
        [broadcastId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row?.avg_count || 0);
          }
        }
      );
    });
  }

  /**
   * 총 시청자 수 추정 (하이브리드 방식)
   * @param {Object} params
   * @param {string} params.channelId - 채널 ID
   * @param {string} params.platform - 플랫폼
   * @param {number} params.broadcastId - 방송 ID
   * @param {string} params.startTime - 방송 시작 시간
   * @returns {Promise<Object>}
   */
  async estimateTotalViewers(params) {
    const { channelId, platform, broadcastId, startTime } = params;

    try {
      // 1. 활동 시청자 수 (확실한 최소치)
      const activeCount = await this.getActiveViewers(
        channelId,
        platform,
        startTime
      );

      // 2. 평균 동시 접속자 수
      const avgConcurrent = await this.getAverageConcurrentViewers(broadcastId);

      // 3. 추정 방법 1: 채팅 참여율 기반
      const estimateFromChat =
        activeCount / this.COEFFICIENTS.CHAT_PARTICIPATION_RATE;

      // 4. 추정 방법 2: 동시접속 회전율 기반
      const estimateFromConcurrent =
        avgConcurrent * this.COEFFICIENTS.VIEWER_TURNOVER_RATE;

      // 5. 두 추정치의 최대값 선택
      const estimatedTotal = Math.max(estimateFromChat, estimateFromConcurrent);

      // 6. 신뢰도 계산
      const confidence = this.calculateConfidence(
        activeCount,
        avgConcurrent,
        estimateFromChat,
        estimateFromConcurrent
      );

      dbLogger.debug("Viewer estimation calculated", {
        channelId,
        platform,
        activeCount,
        avgConcurrent,
        estimateFromChat: Math.round(estimateFromChat),
        estimateFromConcurrent: Math.round(estimateFromConcurrent),
        estimatedTotal: Math.round(estimatedTotal),
        confidence,
      });

      return {
        confirmed: activeCount, // 확실한 활동 시청자
        estimated: Math.round(estimatedTotal), // 추정 총 시청자
        avgConcurrent: Math.round(avgConcurrent), // 평균 동접
        confidence, // 신뢰도 (%)
        method:
          estimateFromChat > estimateFromConcurrent
            ? "chat-based"
            : "concurrent-based",
      };
    } catch (error) {
      dbLogger.error("Viewer estimation error", {
        error: error.message,
        params,
      });
      throw error;
    }
  }

  /**
   * 신뢰도 계산
   * @param {number} activeCount - 활동 시청자 수
   * @param {number} avgConcurrent - 평균 동접
   * @param {number} estimate1 - 추정치 1
   * @param {number} estimate2 - 추정치 2
   * @returns {string} - 신뢰도 (예: "60-70%")
   */
  calculateConfidence(activeCount, avgConcurrent, estimate1, estimate2) {
    // 신뢰도 계산 로직
    let score = 50; // 기본 50%

    // 1. 활동 시청자가 많을수록 신뢰도 증가
    if (activeCount >= this.COEFFICIENTS.MIN_CONFIDENCE_THRESHOLD) {
      score += 10;
    }
    if (activeCount >= 50) {
      score += 5;
    }
    if (activeCount >= 100) {
      score += 5;
    }

    // 2. 평균 동접이 있으면 신뢰도 증가
    if (avgConcurrent >= 50) {
      score += 10;
    }

    // 3. 두 추정치가 비슷하면 신뢰도 증가
    const diff = Math.abs(estimate1 - estimate2);
    const avgEstimate = (estimate1 + estimate2) / 2;
    const diffRatio = avgEstimate > 0 ? diff / avgEstimate : 1;

    if (diffRatio < 0.3) {
      // 30% 이내 차이
      score += 10;
    } else if (diffRatio < 0.5) {
      // 50% 이내 차이
      score += 5;
    }

    // 4. 신뢰도 범위 결정
    if (score >= 75) {
      return "70-80%";
    } else if (score >= 65) {
      return "60-70%";
    } else if (score >= 55) {
      return "50-60%";
    } else {
      return "40-50%";
    }
  }

  /**
   * 특정 날짜의 총 시청자 수 추정
   * @param {string} channelId - 채널 ID
   * @param {string} platform - 플랫폼
   * @param {string} date - 날짜 (YYYY-MM-DD)
   * @returns {Promise<Object>}
   */
  async estimateDailyViewers(channelId, platform, date) {
    // Cross-database date comparison
    const dateOnly = isPostgres() ? `started_at::DATE` : `DATE(started_at)`;

    return new Promise((resolve, reject) => {
      // 해당 날짜의 모든 방송 조회
      this.db.all(
        `SELECT id, started_at, ended_at
         FROM broadcasts
         WHERE platform = ?
           AND channel_id = ?
           AND ${dateOnly} = ?`,
        [platform, channelId, date],
        async (err, broadcasts) => {
          if (err) {
            reject(err);
            return;
          }

          if (!broadcasts || broadcasts.length === 0) {
            resolve({
              confirmed: 0,
              estimated: 0,
              broadcastCount: 0,
              confidence: "N/A",
            });
            return;
          }

          try {
            // 각 방송별 추정
            const estimates = await Promise.all(
              broadcasts.map((broadcast) =>
                this.estimateTotalViewers({
                  channelId,
                  platform,
                  broadcastId: broadcast.id,
                  startTime: broadcast.started_at,
                })
              )
            );

            // 중복 제거 (여러 방송을 본 사람 고려)
            // 간단한 방법: 최대값 사용 (가장 많은 사람이 본 방송)
            const maxEstimate = estimates.reduce(
              (max, est) => (est.estimated > max.estimated ? est : max),
              estimates[0]
            );

            resolve({
              confirmed: maxEstimate.confirmed,
              estimated: maxEstimate.estimated,
              broadcastCount: broadcasts.length,
              confidence: maxEstimate.confidence,
            });
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  }

  /**
   * 시청자 활동 패턴 분석
   * @param {string} channelId - 채널 ID
   * @param {string} platform - 플랫폼
   * @param {number} days - 분석 기간 (일)
   * @returns {Promise<Object>}
   */
  async analyzeViewerPattern(channelId, platform, days = 7) {
    // Cross-database date functions
    const dateOnly = isPostgres() ? `event_timestamp::DATE` : `DATE(event_timestamp)`;
    const daysAgo = isPostgres()
      ? `NOW() - INTERVAL '${days} days'`
      : `datetime('now', '-${days} days')`;

    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT
           ${dateOnly} as date,
           COUNT(DISTINCT actor_person_id) as active_viewers,
           COUNT(*) as total_events,
           SUM(CASE WHEN event_type = 'chat' THEN 1 ELSE 0 END) as chat_count,
           SUM(CASE WHEN event_type = 'donation' THEN 1 ELSE 0 END) as donation_count
         FROM events
         WHERE target_channel_id = ?
           AND platform = ?
           AND event_timestamp >= ${daysAgo}
         GROUP BY ${dateOnly}
         ORDER BY date DESC`,
        [channelId, platform],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            const pattern = rows || [];
            const avgActiveViewers =
              pattern.length > 0
                ? pattern.reduce((sum, row) => sum + row.active_viewers, 0) /
                  pattern.length
                : 0;

            resolve({
              pattern,
              avgActiveViewers: Math.round(avgActiveViewers),
              days,
            });
          }
        }
      );
    });
  }
}

module.exports = ViewerEstimationService;
