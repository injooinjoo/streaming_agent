#!/bin/bash
# SQLite → Snowflake 원클릭 마이그레이션 스크립트
# 사용법: bash quick-migrate.sh

set -e

echo "=============================================="
echo "SQLite → Snowflake 마이그레이션"
echo "=============================================="

cd /root/streaming-agent

# 1. Snowflake 환경변수 설정
echo "[1/5] Snowflake 환경변수 설정..."
if ! grep -q "SNOWFLAKE_ACCOUNT" server/.env 2>/dev/null; then
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
    echo "  환경변수 추가 완료"
else
    echo "  환경변수 이미 설정됨"
fi

# 2. snowflake-sdk 설치
echo "[2/5] snowflake-sdk 설치..."
if ! npm list snowflake-sdk >/dev/null 2>&1; then
    npm install snowflake-sdk --save
    echo "  snowflake-sdk 설치 완료"
else
    echo "  snowflake-sdk 이미 설치됨"
fi

# 3. 현재 SQLite 데이터 확인
echo "[3/5] SQLite 데이터 확인..."
sqlite3 server/weflab_clone.db << 'SQL'
.mode column
.headers on
SELECT 'platform_users' as table_name, COUNT(*) as count FROM platform_users
UNION ALL
SELECT 'broadcasts', COUNT(*) FROM broadcasts
UNION ALL
SELECT 'viewing_records', COUNT(*) FROM viewing_records
UNION ALL
SELECT 'donations', COUNT(*) FROM donations
UNION ALL
SELECT 'broadcast_stats_5min', COUNT(*) FROM broadcast_stats_5min;
SQL

# 4. 마이그레이션 dry-run
echo ""
echo "[4/5] 마이그레이션 Dry-run..."
read -p "Dry-run을 실행하시겠습니까? (y/n): " confirm
if [ "$confirm" = "y" ]; then
    node server/scripts/migrate-sqlite-to-snowflake.js --dry-run --skip-schema
fi

# 5. 실제 마이그레이션
echo ""
echo "[5/5] 실제 마이그레이션 실행..."
read -p "실제 마이그레이션을 시작하시겠습니까? (y/n): " confirm
if [ "$confirm" = "y" ]; then
    echo "마이그레이션 시작..."
    echo "예상 소요 시간: ~40분 (viewing_records 크기에 따라 변동)"
    echo ""

    node server/scripts/migrate-sqlite-to-snowflake.js --batch-size 500 --skip-schema

    echo ""
    echo "=============================================="
    echo "마이그레이션 완료!"
    echo "=============================================="

    # DB_TYPE 전환 여부
    read -p "Snowflake 모드로 전환하시겠습니까? (y/n): " switch
    if [ "$switch" = "y" ]; then
        if ! grep -q "DB_TYPE=snowflake" server/.env; then
            echo "DB_TYPE=snowflake" >> server/.env
        fi
        pm2 restart streaming-agent
        echo "서버가 Snowflake 모드로 재시작되었습니다."
    fi
else
    echo "마이그레이션이 취소되었습니다."
fi
