# SQLite → Snowflake 마이그레이션 가이드

## Vultr 서버 접속

```bash
ssh root@158.247.204.45
```

## 1. 환경 변수 설정

```bash
cd /root/streaming-agent

# .env 파일 수정
cat >> server/.env << 'EOF'

# Snowflake Configuration
SNOWFLAKE_ACCOUNT=LIXSICU-QW99230
SNOWFLAKE_USERNAME=INJOO
SNOWFLAKE_PASSWORD=1qa1qa1qa!QA!QA
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_DATABASE=STREAMING_ANALYTICS
SNOWFLAKE_SCHEMA=ANALYTICS
SNOWFLAKE_ROLE=ACCOUNTADMIN
EOF
```

## 2. snowflake-sdk 설치

```bash
cd /root/streaming-agent
npm install snowflake-sdk --save
```

## 3. 마이그레이션 스크립트 업데이트

최신 코드를 pull 하거나 파일을 수동 업로드:

```bash
git pull origin cool-bhabha
```

## 4. 마이그레이션 실행

### Dry-run 먼저 (데이터 변경 없이 확인)

```bash
cd /root/streaming-agent
node server/scripts/migrate-sqlite-to-snowflake.js --dry-run
```

### 실제 마이그레이션

```bash
node server/scripts/migrate-sqlite-to-snowflake.js --batch-size 500
```

### 특정 테이블만 마이그레이션

```bash
node server/scripts/migrate-sqlite-to-snowflake.js --table platform_users
node server/scripts/migrate-sqlite-to-snowflake.js --table broadcasts
node server/scripts/migrate-sqlite-to-snowflake.js --table viewing_records
```

### 중단 후 재개 (--resume)

```bash
node server/scripts/migrate-sqlite-to-snowflake.js --resume
```

## 5. 마이그레이션 검증

### Snowflake 데이터 확인 (snowsql CLI 또는 Python)

```bash
python3 << 'EOF'
import snowflake.connector

conn = snowflake.connector.connect(
    account='LIXSICU-QW99230',
    user='INJOO',
    password='1qa1qa1qa!QA!QA',
    warehouse='COMPUTE_WH',
    database='STREAMING_ANALYTICS',
    schema='ANALYTICS'
)

cursor = conn.cursor()
cursor.execute("SELECT COUNT(*) FROM PLATFORM_USERS")
print(f"platform_users: {cursor.fetchone()[0]}")
cursor.execute("SELECT COUNT(*) FROM BROADCASTS")
print(f"broadcasts: {cursor.fetchone()[0]}")
cursor.execute("SELECT COUNT(*) FROM VIEWING_RECORDS")
print(f"viewing_records: {cursor.fetchone()[0]}")
conn.close()
EOF
```

### SQLite와 비교

```bash
sqlite3 /root/streaming-agent/server/weflab_clone.db "SELECT COUNT(*) FROM platform_users; SELECT COUNT(*) FROM broadcasts; SELECT COUNT(*) FROM viewing_records;"
```

## 6. 서버 재시작 (Snowflake 모드로)

```bash
# 환경 변수 추가
echo 'DB_TYPE=snowflake' >> /root/streaming-agent/server/.env

# PM2 재시작
pm2 restart streaming-agent

# 로그 확인
pm2 logs streaming-agent --lines 50
```

## 7. 롤백 (문제 시)

```bash
# SQLite 모드로 복귀
sed -i 's/DB_TYPE=snowflake/DB_TYPE=sqlite/' /root/streaming-agent/server/.env
pm2 restart streaming-agent
```

## 예상 소요 시간

| 테이블 | 예상 row 수 | 예상 시간 |
|--------|-------------|-----------|
| platform_users | ~170,000 | ~5분 |
| broadcasts | ~1,500 | ~30초 |
| viewing_records | ~1,190,000 | ~30분 |
| donations | ~1,800 | ~30초 |
| broadcast_stats_5min | ~1,600 | ~30초 |

**총 예상 시간: ~40분**
