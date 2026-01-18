-- ============================================
-- Snowflake Schema v2.1 - 컬럼 추가
-- 넥슨 게임 스트리밍 Buzz → Conversion 분석용
-- ============================================
-- 실행: Snowsight (https://app.snowflake.com)에서 실행

USE SCHEMA STREAMING_AGENT.RAW;

-- ============================================
-- 1. BROADCASTS - root_broadcast_id 추가
-- 목적: 카테고리 변경 시 Row 분리 유지하되, 원본 세션 연결 고리 확보
-- ============================================

ALTER TABLE BROADCASTS ADD COLUMN root_broadcast_id INTEGER;
COMMENT ON COLUMN BROADCASTS.root_broadcast_id IS '원본 방송 세션 ID (카테고리 변경으로 분리된 경우 최초 방송 ID)';

-- 기존 데이터: 자기 자신을 root로 설정
UPDATE BROADCASTS SET root_broadcast_id = id WHERE root_broadcast_id IS NULL;

-- ============================================
-- 2. PERSONS - 넥슨 연동 정보 추가
-- 목적: Viewer → Gamer 전환 추적 (Attribution)
-- ============================================

ALTER TABLE PERSONS ADD COLUMN nexon_link_status BOOLEAN DEFAULT FALSE;
ALTER TABLE PERSONS ADD COLUMN nexon_creator_code VARCHAR(50);

COMMENT ON COLUMN PERSONS.nexon_link_status IS '넥슨 계정 연동 여부';
COMMENT ON COLUMN PERSONS.nexon_creator_code IS '넥슨 크리에이터즈 파트너 코드';

-- ============================================
-- 3. EVENTS - 감성/미션 태그 추가
-- 목적: 후원 맥락 분석 (언제 돈이 터지는가)
-- ============================================

ALTER TABLE EVENTS ADD COLUMN sentiment_score FLOAT;
ALTER TABLE EVENTS ADD COLUMN is_mission BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN EVENTS.sentiment_score IS '채팅 감성 점수 (-1.0 부정 ~ +1.0 긍정)';
COMMENT ON COLUMN EVENTS.is_mission IS '미션/퀘스트 후원 여부';

-- ============================================
-- 4. VIEWER_SNAPSHOTS - 게임 상태 추가
-- 목적: 실제 플레이 시간 vs 대기 시간 구분
-- ============================================

ALTER TABLE VIEWER_SNAPSHOTS ADD COLUMN game_state VARCHAR(20);

COMMENT ON COLUMN VIEWER_SNAPSHOTS.game_state IS '게임 상태 (in_game, lobby, loading, cutscene 등)';

-- ============================================
-- 5. 검증
-- ============================================

-- 새 컬럼 확인
DESCRIBE TABLE BROADCASTS;
DESCRIBE TABLE PERSONS;
DESCRIBE TABLE EVENTS;
DESCRIBE TABLE VIEWER_SNAPSHOTS;

-- 컬럼 설명 확인
SELECT TABLE_NAME, COLUMN_NAME, COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'RAW'
  AND COLUMN_NAME IN ('root_broadcast_id', 'nexon_link_status', 'nexon_creator_code',
                       'sentiment_score', 'is_mission', 'game_state')
ORDER BY TABLE_NAME, ORDINAL_POSITION;
