# Snowflake Streamlit 대시보드

스트리밍 분석을 위한 Snowflake 내장 Streamlit 앱입니다.

## 배포 방법

### 방법 1: Snowflake 웹 콘솔 (가장 쉬움)

1. [Snowflake 웹 콘솔](https://app.snowflake.com)에 로그인
2. 좌측 메뉴에서 **Streamlit** 클릭
3. 우상단 **+ Streamlit App** 클릭
4. 앱 이름 입력: `streaming_analytics`
5. 데이터베이스/스키마 선택 (FACT_EVENTS 테이블이 있는 곳)
6. 웨어하우스 선택
7. **Create** 클릭
8. `streamlit_app.py` 내용을 에디터에 붙여넣기
9. **Run** 클릭

### 방법 2: Snowflake CLI (snowcli)

```bash
# Snowflake CLI 설치
pip install snowflake-cli-labs

# 연결 설정
snow connection add

# 앱 배포
snow streamlit deploy \
  --name streaming_analytics \
  --file streamlit_app.py \
  --database YOUR_DATABASE \
  --schema PUBLIC
```

### 방법 3: SQL로 생성

```sql
-- Streamlit 앱 생성
CREATE OR REPLACE STREAMLIT streaming_analytics
  ROOT_LOCATION = '@your_stage/streamlit/'
  MAIN_FILE = 'streamlit_app.py'
  QUERY_WAREHOUSE = 'COMPUTE_WH';

-- 스테이지에 파일 업로드
PUT file://./streamlit_app.py @your_stage/streamlit/ AUTO_COMPRESS=FALSE OVERWRITE=TRUE;
```

## 필요한 테이블

앱이 동작하려면 다음 테이블이 필요합니다:

```sql
-- 이벤트 팩트 테이블 (필수)
CREATE TABLE IF NOT EXISTS fact_events (
    event_id VARCHAR PRIMARY KEY,
    event_type VARCHAR NOT NULL,
    platform VARCHAR NOT NULL,
    channel_id VARCHAR NOT NULL,
    user_id VARCHAR,
    user_nickname VARCHAR,
    user_profile_image VARCHAR,
    user_role VARCHAR,
    user_tier VARCHAR,
    amount_krw NUMBER,
    original_amount NUMBER,
    currency VARCHAR,
    donation_type VARCHAR,
    message TEXT,
    badges VARIANT,
    subscription_info VARIANT,
    event_timestamp TIMESTAMP_NTZ,
    synced_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- 시청자 수 팩트 테이블 (선택)
CREATE TABLE IF NOT EXISTS fact_viewer_stats (
    id VARCHAR PRIMARY KEY,
    platform VARCHAR NOT NULL,
    channel_id VARCHAR NOT NULL,
    viewer_count NUMBER,
    concurrent_chatters NUMBER,
    recorded_at TIMESTAMP_NTZ
);
```

## 대시보드 기능

### 1. 핵심 지표
- 총 후원 금액
- 고유 후원자 수
- 총 채팅 수
- 평균 후원액

### 2. 후원 추이
- 일별 후원 금액 라인 차트
- 플랫폼별 색상 구분

### 3. 플랫폼별 분석
- 플랫폼별 후원 금액 비교
- 플랫폼별 채팅 활동 비교

### 4. 상위 후원자
- TOP 10 후원자 랭킹
- 총 후원액, 후원 횟수, 마지막 후원 시간

### 5. 시간대별 활동
- 시간대별 채팅/후원 분포
- 피크 타임 분석

### 6. 후원 유형별 분석
- 별풍선, 치즈, Super Chat 등 유형별 분석

### 7. 최근 이벤트
- 실시간 이벤트 피드
- 유형별 필터링

## 필터 옵션

- **기간**: 오늘, 최근 7일, 30일, 90일, 전체
- **플랫폼**: SOOP, Chzzk, YouTube, Twitch 선택

## 권한 설정

Streamlit 앱이 테이블에 접근하려면 적절한 권한이 필요합니다:

```sql
-- 역할에 SELECT 권한 부여
GRANT SELECT ON TABLE fact_events TO ROLE your_streamlit_role;
GRANT SELECT ON TABLE fact_viewer_stats TO ROLE your_streamlit_role;

-- 웨어하우스 사용 권한
GRANT USAGE ON WAREHOUSE compute_wh TO ROLE your_streamlit_role;
```

## 커스터마이징

### 차트 스타일 변경
Streamlit의 `st.line_chart`, `st.bar_chart` 대신 Plotly 사용:

```python
import plotly.express as px

fig = px.line(df, x='date', y='amount', color='platform')
st.plotly_chart(fig, use_container_width=True)
```

### 자동 새로고침
```python
import time
st.button("새로고침", on_click=lambda: st.experimental_rerun())

# 또는 자동 새로고침 (60초마다)
# time.sleep(60)
# st.experimental_rerun()
```
