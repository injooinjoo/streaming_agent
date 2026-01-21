# 데이터베이스 스키마 규칙

## 개요

이 프로젝트는 `unified.db` (SQLite3)를 사용합니다. 레거시 스키마와 신규 스키마가 혼용되어 있었으나, **신규 스키마를 정규(canonical) 스키마**로 사용합니다.

---

## events 테이블 (정규 스키마)

```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,                    -- UUID
  event_type TEXT NOT NULL,               -- 'chat', 'donation', 'subscribe', 'follow', 'view'
  platform TEXT NOT NULL,

  -- Actor (이벤트 발생자)
  actor_person_id INTEGER,
  actor_nickname TEXT,
  actor_role TEXT,

  -- Target (방송자)
  target_person_id INTEGER,
  target_channel_id TEXT NOT NULL,

  -- Context
  broadcast_id INTEGER,

  -- Content
  message TEXT,
  amount INTEGER,
  original_amount INTEGER,
  currency TEXT,
  donation_type TEXT,

  -- Timestamps
  event_timestamp DATETIME NOT NULL,
  ingested_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 레거시 → 신규 컬럼 매핑

| 레거시 컬럼 (사용 금지) | 신규 컬럼 (사용) | 비고 |
|------------------------|-----------------|------|
| `type` | `event_type` | ✅ 필수 변환 |
| `timestamp` | `event_timestamp` | ✅ events 테이블만 해당 |
| `sender` | `actor_nickname` | ✅ 필수 변환 |
| `sender_id` | `actor_person_id` | 타입: TEXT → INTEGER |

### 주의사항

- `viewer_stats` 테이블은 `timestamp` 컬럼을 사용 (레거시 유지)
- `ad_impressions` 테이블도 `timestamp` 컬럼을 사용 (레거시 유지)
- **events 테이블만** `event_timestamp` 사용

---

## events 테이블 쿼리 작성 시 체크리스트

### INSERT 쿼리

```javascript
// ✅ 올바른 예시
db.run(
  `INSERT INTO events (id, event_type, platform, actor_nickname, target_channel_id, message, amount, event_timestamp)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  [uuid, eventType, platform, nickname, channelId, message, amount, timestamp]
);

// ❌ 잘못된 예시 (레거시 컬럼 사용)
db.run(
  `INSERT INTO events (id, type, platform, sender, message, amount, timestamp)
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
  [...]
);
```

### SELECT 쿼리

```javascript
// ✅ 올바른 예시
const rows = await db.all(`
  SELECT id, event_type, actor_nickname, amount, event_timestamp
  FROM events
  WHERE event_type = 'donation' AND DATE(event_timestamp) = ?
`, [today]);

// 별칭이 필요한 경우
const rows = await db.all(`
  SELECT event_type as type, actor_nickname as sender, event_timestamp as timestamp
  FROM events
  WHERE event_type = 'chat'
`);

// ❌ 잘못된 예시
const rows = await db.all(`
  SELECT type, sender, timestamp
  FROM events
  WHERE type = 'donation'
`);
```

---

## 검증 명령어

```bash
# 레거시 컬럼 사용 검색 (수정 후 0건이어야 함)
grep -rn "WHERE type = " server/
grep -rn "DATE(timestamp)" server/services/
grep -rn "sender =" server/

# events 테이블 쿼리만 검색
grep -rn "FROM events" server/ | grep -v node_modules
```

---

## 스키마 검증 유틸리티

`server/utils/schemaValidator.js` 모듈을 사용하여 쿼리 검증 가능:

```javascript
const { validateQuery } = require('./utils/schemaValidator');

// 쿼리 검증
const sql = `SELECT type FROM events WHERE timestamp > ?`;
validateQuery(sql, { context: 'myFunction' });
// 콘솔 출력: ⚠️ Schema validation failed in myFunction:
//   - Legacy column "type" detected. Use "event_type" instead.
//   - Legacy column "timestamp" detected. Use "event_timestamp" instead.
```

---

## 다른 테이블 참고

### viewer_stats (레거시 스키마 유지)

```sql
CREATE TABLE viewer_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  viewer_count INTEGER DEFAULT 0,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP  -- ← 이 테이블은 timestamp 사용
);
```

### persons (신규 스키마)

전체 스키마는 `server/db/unified-init.js` 참조.

---

## 변경 이력

| 날짜 | 변경 사항 |
|------|----------|
| 2026-01-21 | 스키마 정렬 완료: platforms.js INSERT, statsService.js SELECT 수정 |
