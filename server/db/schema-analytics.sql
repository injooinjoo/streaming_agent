-- ============================================================
-- SOOP Analytics Schema
-- 스트리머/시청자 데이터 수집 및 분석용 스키마
-- ============================================================
-- 설계 원칙:
-- 1. 양방향 조회: 유저→시청기록, 방송→시청자목록
-- 2. 확장 가능: WebSocket 연결 수 증가 대비
-- 3. 5분 단위 스냅샷 기반 시계열 데이터
-- ============================================================

-- ========================================
-- 1. 플랫폼 유저 (스트리머 + 시청자 통합)
-- ========================================
CREATE TABLE IF NOT EXISTS platform_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- 플랫폼 식별
  platform TEXT NOT NULL DEFAULT 'soop',     -- soop, chzzk, twitch
  platform_user_id TEXT NOT NULL,            -- 플랫폼 내 고유 ID

  -- 기본 정보
  username TEXT NOT NULL,                    -- 로그인 ID (예: khm11903)
  nickname TEXT,                             -- 표시 닉네임 (예: 봉준)
  profile_image TEXT,

  -- 유저 타입
  is_streamer INTEGER DEFAULT 0,             -- 스트리머 여부
  is_partner INTEGER DEFAULT 0,              -- 파트너 여부

  -- 스트리머 전용 정보 (JSON)
  streamer_data TEXT,                        -- station_no, grade 등

  -- 통계 스냅샷 (마지막 업데이트 시점)
  follower_count INTEGER DEFAULT 0,
  subscriber_count INTEGER DEFAULT 0,
  fan_count INTEGER DEFAULT 0,

  -- 타임스탬프
  first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(platform, platform_user_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_users_lookup
  ON platform_users(platform, username);
CREATE INDEX IF NOT EXISTS idx_platform_users_streamer
  ON platform_users(is_streamer) WHERE is_streamer = 1;


-- ========================================
-- 2. 방송 세션 (라이브 단위)
-- ========================================
CREATE TABLE IF NOT EXISTS broadcasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- 플랫폼/방송 식별
  platform TEXT NOT NULL DEFAULT 'soop',
  broadcast_id TEXT NOT NULL,                -- BNO (방송번호)

  -- 스트리머 연결
  streamer_id INTEGER REFERENCES platform_users(id),
  streamer_username TEXT,                    -- 빠른 조회용 비정규화

  -- 방송 정보
  title TEXT,
  category TEXT,
  sub_category TEXT,
  tags TEXT,                                 -- JSON array

  -- 시간
  started_at DATETIME NOT NULL,
  ended_at DATETIME,
  duration_seconds INTEGER,                  -- 계산된 방송 시간

  -- 집계 통계 (방송 종료 시 또는 주기적 계산)
  peak_viewers INTEGER DEFAULT 0,
  avg_viewers REAL DEFAULT 0,
  total_unique_viewers INTEGER DEFAULT 0,
  total_chat_count INTEGER DEFAULT 0,
  total_donation_amount INTEGER DEFAULT 0,   -- 원화 기준

  -- 상태
  is_live INTEGER DEFAULT 1,

  UNIQUE(platform, broadcast_id)
);

CREATE INDEX IF NOT EXISTS idx_broadcasts_streamer
  ON broadcasts(streamer_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_live
  ON broadcasts(is_live, started_at) WHERE is_live = 1;
CREATE INDEX IF NOT EXISTS idx_broadcasts_time
  ON broadcasts(started_at DESC);


-- ========================================
-- 3. 방송 스냅샷 (5분 단위 상태 기록)
-- ========================================
CREATE TABLE IF NOT EXISTS broadcast_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  broadcast_id INTEGER NOT NULL REFERENCES broadcasts(id),

  -- 스냅샷 시각 (5분 단위 정각)
  snapshot_at DATETIME NOT NULL,

  -- 시청자 수
  total_viewers INTEGER DEFAULT 0,
  pc_viewers INTEGER DEFAULT 0,
  mobile_viewers INTEGER DEFAULT 0,

  -- 변경 추적 (제목/카테고리 변경 시에만 저장)
  title TEXT,
  category TEXT,

  UNIQUE(broadcast_id, snapshot_at)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_lookup
  ON broadcast_snapshots(broadcast_id, snapshot_at DESC);


-- ========================================
-- 4. 시청 기록 (핵심 테이블!)
-- ========================================
-- 5분 스냅샷 시점에 "유저 X가 방송 Y를 시청 중"
CREATE TABLE IF NOT EXISTS viewing_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- 누가
  viewer_id INTEGER NOT NULL REFERENCES platform_users(id),
  viewer_username TEXT,                      -- 빠른 조회용 비정규화

  -- 어디서
  broadcast_id INTEGER NOT NULL REFERENCES broadcasts(id),
  streamer_id INTEGER REFERENCES platform_users(id),

  -- 언제 (5분 단위 스냅샷 시각)
  snapshot_at DATETIME NOT NULL,

  -- 시청자 상태 (WebSocket에서 수집)
  is_subscriber INTEGER DEFAULT 0,           -- 구독자
  is_fan INTEGER DEFAULT 0,                  -- 팬클럽

  -- 중복 방지
  UNIQUE(viewer_id, broadcast_id, snapshot_at)
);

-- 양방향 조회를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_viewing_by_viewer
  ON viewing_records(viewer_id, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_viewing_by_broadcast
  ON viewing_records(broadcast_id, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_viewing_by_streamer
  ON viewing_records(streamer_id, snapshot_at DESC);


-- ========================================
-- 5. 후원 기록
-- ========================================
CREATE TABLE IF NOT EXISTS donations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- 후원자
  sender_id INTEGER REFERENCES platform_users(id),
  sender_username TEXT,
  sender_nickname TEXT,

  -- 수신자 (스트리머)
  receiver_id INTEGER REFERENCES platform_users(id),
  receiver_username TEXT,

  -- 방송 정보
  broadcast_id INTEGER REFERENCES broadcasts(id),

  -- 후원 유형
  donation_type TEXT NOT NULL,               -- balloon, ad_balloon, video_balloon, subscribe

  -- 금액
  item_count INTEGER DEFAULT 0,              -- 개수
  amount_krw INTEGER DEFAULT 0,              -- 원화 환산

  -- 메시지
  message TEXT,

  -- 구독 전용
  subscription_months INTEGER,

  -- 시각
  donated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_donations_sender
  ON donations(sender_id, donated_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_receiver
  ON donations(receiver_id, donated_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_broadcast
  ON donations(broadcast_id, donated_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_time
  ON donations(donated_at DESC);


-- ========================================
-- 6. 시청 세션 (집계 테이블)
-- ========================================
-- viewing_records를 집계해서 연속 시청 구간 생성
CREATE TABLE IF NOT EXISTS viewing_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  viewer_id INTEGER NOT NULL REFERENCES platform_users(id),
  broadcast_id INTEGER NOT NULL REFERENCES broadcasts(id),
  streamer_id INTEGER REFERENCES platform_users(id),

  -- 연속 시청 구간
  session_start DATETIME NOT NULL,
  session_end DATETIME,

  -- 시청 시간 (초 단위)
  duration_seconds INTEGER DEFAULT 0,

  -- 스냅샷 횟수 (5분 단위이므로 * 300 = 대략적인 시청 시간)
  snapshot_count INTEGER DEFAULT 0,

  -- 동시 시청 정보
  avg_concurrent_streams REAL DEFAULT 1      -- 해당 세션 동안 평균 동시 시청 수
);

CREATE INDEX IF NOT EXISTS idx_sessions_viewer
  ON viewing_sessions(viewer_id, session_start DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_broadcast
  ON viewing_sessions(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_sessions_streamer
  ON viewing_sessions(streamer_id);


-- ========================================
-- 7. 모니터링 설정
-- ========================================
-- WebSocket 연결 대상 관리 (확장 가능)
CREATE TABLE IF NOT EXISTS monitoring_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- 설정 키
  config_key TEXT NOT NULL UNIQUE,
  config_value TEXT NOT NULL,

  -- 설명
  description TEXT,

  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 기본 설정 삽입
INSERT OR IGNORE INTO monitoring_config (config_key, config_value, description) VALUES
  ('max_websocket_connections', '100', '최대 동시 WebSocket 연결 수'),
  ('min_viewers_threshold', '100', 'WebSocket 연결 기준 최소 시청자 수'),
  ('snapshot_interval_seconds', '300', '스냅샷 주기 (초)'),
  ('api_polling_interval_seconds', '300', 'API 폴링 주기 (초)');


-- ========================================
-- 8. 모니터링 대상 (수동 등록)
-- ========================================
CREATE TABLE IF NOT EXISTS monitoring_targets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  platform TEXT NOT NULL DEFAULT 'soop',
  target_username TEXT NOT NULL,             -- 스트리머 username

  -- 우선순위 (높을수록 먼저 연결)
  priority INTEGER DEFAULT 0,

  -- 활성화 여부
  is_active INTEGER DEFAULT 1,

  -- 메모
  note TEXT,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(platform, target_username)
);


-- ========================================
-- 9. 일별 집계 통계
-- ========================================
CREATE TABLE IF NOT EXISTS daily_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  stat_date DATE NOT NULL,
  platform TEXT NOT NULL DEFAULT 'soop',

  -- 대상 (스트리머 또는 시청자)
  user_id INTEGER REFERENCES platform_users(id),
  user_type TEXT NOT NULL,                   -- 'streamer' or 'viewer'

  -- 스트리머 통계
  broadcast_count INTEGER DEFAULT 0,
  total_broadcast_seconds INTEGER DEFAULT 0,
  peak_viewers INTEGER DEFAULT 0,
  avg_viewers REAL DEFAULT 0,
  unique_viewers INTEGER DEFAULT 0,
  total_donations_received INTEGER DEFAULT 0,

  -- 시청자 통계
  streams_watched INTEGER DEFAULT 0,
  total_watch_seconds INTEGER DEFAULT 0,
  unique_streamers_watched INTEGER DEFAULT 0,
  total_donations_sent INTEGER DEFAULT 0,

  UNIQUE(stat_date, user_id, user_type)
);

CREATE INDEX IF NOT EXISTS idx_daily_stats_date
  ON daily_stats(stat_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_stats_user
  ON daily_stats(user_id, stat_date DESC);


-- ========================================
-- 10. 수집 작업 로그
-- ========================================
CREATE TABLE IF NOT EXISTS collection_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  job_type TEXT NOT NULL,                    -- 'api_poll', 'ws_snapshot', 'daily_aggregate'
  started_at DATETIME NOT NULL,
  completed_at DATETIME,

  -- 결과
  status TEXT DEFAULT 'running',             -- 'running', 'success', 'error'
  records_processed INTEGER DEFAULT 0,
  error_message TEXT,

  -- 상세 정보
  details TEXT                               -- JSON
);

CREATE INDEX IF NOT EXISTS idx_collection_logs_time
  ON collection_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_collection_logs_type
  ON collection_logs(job_type, started_at DESC);
