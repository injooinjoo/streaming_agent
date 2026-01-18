-- ============================================
-- Snowflake Schema v2 - Streaming Agent
-- PERSONS 중심 통합 스키마
-- ============================================
-- 실행: Snowsight (https://app.snowflake.com)에서 실행

-- ============================================
-- STEP 1: Database & Schema Setup
-- ============================================

CREATE DATABASE IF NOT EXISTS STREAMING_AGENT;
CREATE SCHEMA IF NOT EXISTS STREAMING_AGENT.RAW;
USE SCHEMA STREAMING_AGENT.RAW;

-- ============================================
-- STEP 2: Drop Old Tables (새로 시작)
-- ============================================

DROP TABLE IF EXISTS EVENTS;
DROP TABLE IF EXISTS STREAMERS;
DROP TABLE IF EXISTS CHAT_USERS;
DROP TABLE IF EXISTS BROADCASTS;
DROP TABLE IF EXISTS CATEGORIES;
DROP TABLE IF EXISTS VIEWER_STATS;

-- ============================================
-- STEP 3: Create New Tables
-- ============================================

-- ----------------------------------------
-- 1. PERSONS (통합 정체성 테이블)
-- 스트리머 + 시청자를 하나로 관리
-- ----------------------------------------
CREATE TABLE PERSONS (
    id INTEGER AUTOINCREMENT PRIMARY KEY,
    platform VARCHAR(20) NOT NULL,           -- 'soop', 'chzzk', 'twitch', 'youtube'
    platform_user_id VARCHAR(255) NOT NULL,  -- 플랫폼 고유 사용자 ID

    -- 프로필 정보
    nickname VARCHAR(255),
    profile_image_url VARCHAR(1000),

    -- 방송자 정보 (NULL이면 방송 안 함)
    channel_id VARCHAR(255),                 -- 방송 채널 ID (있으면 방송자)
    channel_description TEXT,
    follower_count INTEGER,
    subscriber_count INTEGER,
    total_broadcast_minutes INTEGER DEFAULT 0,
    last_broadcast_at TIMESTAMP_NTZ,

    -- 시청자 통계 (전체 채널 합산)
    total_chat_count INTEGER DEFAULT 0,
    total_donation_count INTEGER DEFAULT 0,
    total_donation_amount INTEGER DEFAULT 0, -- KRW 기준

    -- 타임스탬프
    first_seen_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    last_seen_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    updated_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),

    CONSTRAINT uk_persons_platform_user UNIQUE (platform, platform_user_id)
);

-- 클러스터링: 플랫폼+사용자ID로 조회 최적화
ALTER TABLE PERSONS CLUSTER BY (platform, platform_user_id);

-- ----------------------------------------
-- 2. EVENTS (이벤트 로그)
-- 모든 채팅/후원/구독 이벤트
-- ----------------------------------------
CREATE TABLE EVENTS (
    id VARCHAR(36) PRIMARY KEY,              -- UUID
    event_type VARCHAR(20) NOT NULL,         -- 'chat', 'donation', 'subscribe', 'follow'
    platform VARCHAR(20) NOT NULL,

    -- 행위자 (누가) - PERSONS 연결
    actor_person_id INTEGER,                 -- FK to PERSONS
    actor_nickname VARCHAR(255),             -- 비정규화 (조회 편의)
    actor_role VARCHAR(20),                  -- 'streamer', 'manager', 'vip', 'fan', 'subscriber', 'regular'

    -- 대상 (어디서) - PERSONS 연결
    target_person_id INTEGER,                -- FK to PERSONS (방송자)
    target_channel_id VARCHAR(255) NOT NULL, -- 방송 채널 ID

    -- 이벤트 내용
    message TEXT,
    amount INTEGER,                          -- KRW 금액
    original_amount INTEGER,                 -- 원본 플랫폼 금액
    currency VARCHAR(20),                    -- 'KRW', 'balloon', 'bits', 'cheese' 등
    donation_type VARCHAR(30),               -- 'cheese', 'star_balloon', 'super_chat' 등

    -- 타임스탬프
    event_timestamp TIMESTAMP_NTZ NOT NULL,
    ingested_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),

    -- 원본 데이터 (디버깅용)
    raw_data VARIANT
);

-- 클러스터링: 시계열 쿼리 최적화
ALTER TABLE EVENTS CLUSTER BY (platform, TO_DATE(event_timestamp));

-- ----------------------------------------
-- 3. BROADCASTS (방송 세션)
-- 1행 = 1방송 (스냅샷 아닌 MERGE 업데이트)
-- ----------------------------------------
CREATE TABLE BROADCASTS (
    id INTEGER AUTOINCREMENT PRIMARY KEY,
    platform VARCHAR(20) NOT NULL,
    channel_id VARCHAR(255) NOT NULL,
    broadcast_id VARCHAR(255),               -- 플랫폼 방송 ID (NULL 가능)

    -- 방송자 연결
    broadcaster_person_id INTEGER,           -- FK to PERSONS

    -- 방송 정보
    title VARCHAR(1000),
    category_id VARCHAR(100),
    category_name VARCHAR(255),
    thumbnail_url VARCHAR(1000),

    -- 통계 (실시간 업데이트)
    current_viewer_count INTEGER DEFAULT 0,
    peak_viewer_count INTEGER DEFAULT 0,
    avg_viewer_count INTEGER DEFAULT 0,
    total_chat_count INTEGER DEFAULT 0,
    total_donation_amount INTEGER DEFAULT 0,

    -- 상태
    is_live BOOLEAN DEFAULT TRUE,
    started_at TIMESTAMP_NTZ,
    ended_at TIMESTAMP_NTZ,
    duration_minutes INTEGER,                -- 종료 시 계산

    -- 타임스탬프
    recorded_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    updated_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),

    -- 원본 데이터
    raw_data VARIANT,

    CONSTRAINT uk_broadcasts_session UNIQUE (platform, channel_id, broadcast_id)
);

-- 클러스터링: 채널별 조회 최적화
ALTER TABLE BROADCASTS CLUSTER BY (platform, channel_id);

-- ----------------------------------------
-- 4. CATEGORIES (카테고리/게임 메타데이터)
-- MERGE로 업데이트 (스냅샷 아님)
-- viewer_count/streamer_count 제거됨 (BROADCASTS에서 집계 가능)
-- ----------------------------------------
CREATE TABLE CATEGORIES (
    id INTEGER AUTOINCREMENT PRIMARY KEY,
    platform VARCHAR(20) NOT NULL,
    category_id VARCHAR(100) NOT NULL,       -- 플랫폼 카테고리 ID
    category_name VARCHAR(255),
    category_type VARCHAR(50),               -- 'game', 'irl', 'music' 등
    thumbnail_url VARCHAR(1000),

    -- 타임스탬프
    recorded_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    updated_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),

    CONSTRAINT uk_categories_platform UNIQUE (platform, category_id)
);

-- ----------------------------------------
-- 5. VIEWER_ENGAGEMENT (채널별 참여 통계)
-- 특정 사람의 특정 채널 참여 기록
-- ----------------------------------------
CREATE TABLE VIEWER_ENGAGEMENT (
    id INTEGER AUTOINCREMENT PRIMARY KEY,

    -- 누가
    person_id INTEGER NOT NULL,              -- FK to PERSONS

    -- 어느 채널에서
    platform VARCHAR(20) NOT NULL,
    channel_id VARCHAR(255) NOT NULL,
    broadcaster_person_id INTEGER,           -- FK to PERSONS (방송자)

    -- 참여 통계 (해당 채널에서만)
    chat_count INTEGER DEFAULT 0,
    donation_count INTEGER DEFAULT 0,
    total_donation_amount INTEGER DEFAULT 0, -- KRW

    -- 타임스탬프
    first_seen_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    last_seen_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    updated_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),

    CONSTRAINT uk_engagement_person_channel UNIQUE (person_id, platform, channel_id)
);

-- 클러스터링: 채널별 Top 후원자 조회 최적화
ALTER TABLE VIEWER_ENGAGEMENT CLUSTER BY (platform, channel_id);

-- ----------------------------------------
-- 6. VIEWER_SNAPSHOTS (시청자 수 시계열)
-- 5분/10분 간격 INSERT (보관 정책 적용)
-- ----------------------------------------
CREATE TABLE VIEWER_SNAPSHOTS (
    id INTEGER AUTOINCREMENT PRIMARY KEY,

    -- 어느 방송
    platform VARCHAR(20) NOT NULL,
    channel_id VARCHAR(255) NOT NULL,
    broadcast_id VARCHAR(255),               -- 특정 방송 세션

    -- 스냅샷 데이터
    viewer_count INTEGER NOT NULL,
    chat_rate_per_minute INTEGER,            -- 분당 채팅 수 (선택)

    -- 시간
    snapshot_at TIMESTAMP_NTZ NOT NULL,
    ingested_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- 클러스터링: 날짜별 정리 (보관 정책용)
ALTER TABLE VIEWER_SNAPSHOTS CLUSTER BY (platform, TO_DATE(snapshot_at));

-- ============================================
-- STEP 4: Create Views
-- ============================================

-- 방송자 목록 (PERSONS 중 channel_id가 있는 사람)
CREATE OR REPLACE VIEW V_BROADCASTERS AS
SELECT
    id as person_id,
    platform,
    platform_user_id,
    nickname,
    profile_image_url,
    channel_id,
    follower_count,
    subscriber_count,
    total_broadcast_minutes,
    last_broadcast_at,
    created_at
FROM PERSONS
WHERE channel_id IS NOT NULL;

-- 채널별 Top 후원자
CREATE OR REPLACE VIEW V_TOP_DONORS_BY_CHANNEL AS
SELECT
    ve.platform,
    ve.channel_id,
    p.nickname as donor_nickname,
    p.platform_user_id as donor_id,
    ve.total_donation_amount,
    ve.donation_count,
    ve.chat_count,
    ve.last_seen_at
FROM VIEWER_ENGAGEMENT ve
JOIN PERSONS p ON ve.person_id = p.id
WHERE ve.total_donation_amount > 0
ORDER BY ve.platform, ve.channel_id, ve.total_donation_amount DESC;

-- 일별 후원 요약
CREATE OR REPLACE VIEW V_DAILY_DONATIONS AS
SELECT
    TO_DATE(event_timestamp) as date,
    platform,
    target_channel_id as channel_id,
    COUNT(*) as donation_count,
    SUM(amount) as total_amount_krw,
    AVG(amount) as avg_amount_krw,
    COUNT(DISTINCT actor_person_id) as unique_donors
FROM EVENTS
WHERE event_type = 'donation'
GROUP BY TO_DATE(event_timestamp), platform, target_channel_id;

-- 시간대별 채팅 활동
CREATE OR REPLACE VIEW V_HOURLY_CHAT_ACTIVITY AS
SELECT
    TO_DATE(event_timestamp) as date,
    HOUR(event_timestamp) as hour,
    platform,
    target_channel_id as channel_id,
    COUNT(*) as message_count,
    COUNT(DISTINCT actor_person_id) as unique_chatters
FROM EVENTS
WHERE event_type = 'chat'
GROUP BY TO_DATE(event_timestamp), HOUR(event_timestamp), platform, target_channel_id;

-- 방송 통계 요약
CREATE OR REPLACE VIEW V_BROADCAST_SUMMARY AS
SELECT
    b.platform,
    b.channel_id,
    p.nickname as broadcaster_name,
    b.title,
    b.category_name,
    b.peak_viewer_count,
    b.total_chat_count,
    b.total_donation_amount,
    b.duration_minutes,
    b.started_at,
    b.ended_at,
    b.is_live
FROM BROADCASTS b
LEFT JOIN PERSONS p ON b.broadcaster_person_id = p.id;

-- 사용자 활동 요약
CREATE OR REPLACE VIEW V_PERSON_ACTIVITY AS
SELECT
    p.id as person_id,
    p.platform,
    p.nickname,
    p.channel_id IS NOT NULL as is_broadcaster,
    p.total_chat_count,
    p.total_donation_count,
    p.total_donation_amount,
    COUNT(DISTINCT ve.channel_id) as channels_engaged,
    p.first_seen_at,
    p.last_seen_at
FROM PERSONS p
LEFT JOIN VIEWER_ENGAGEMENT ve ON p.id = ve.person_id
GROUP BY p.id, p.platform, p.nickname, p.channel_id,
         p.total_chat_count, p.total_donation_count, p.total_donation_amount,
         p.first_seen_at, p.last_seen_at;

-- ============================================
-- STEP 5: Verification
-- ============================================

-- 테이블 확인
SHOW TABLES IN SCHEMA STREAMING_AGENT.RAW;

-- 뷰 확인
SHOW VIEWS IN SCHEMA STREAMING_AGENT.RAW;

-- 테이블 구조 확인
DESCRIBE TABLE PERSONS;
DESCRIBE TABLE EVENTS;
DESCRIBE TABLE BROADCASTS;
DESCRIBE TABLE CATEGORIES;
DESCRIBE TABLE VIEWER_ENGAGEMENT;
DESCRIBE TABLE VIEWER_SNAPSHOTS;

-- ============================================
-- 데이터 보관 정책 (선택사항)
-- VIEWER_SNAPSHOTS 30일 이후 삭제
-- ============================================

-- 월간 정리 작업 (수동 또는 Task로 자동화)
-- DELETE FROM VIEWER_SNAPSHOTS
-- WHERE snapshot_at < DATEADD('day', -30, CURRENT_TIMESTAMP());
