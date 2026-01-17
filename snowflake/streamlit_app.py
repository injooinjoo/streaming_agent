"""
Streaming Analytics Dashboard - Snowflake Streamlit App

이 앱은 Snowflake 내에서 직접 실행됩니다.
Snowflake 웹 콘솔 > Streamlit > + Streamlit App 에서 생성 후 이 코드를 붙여넣으세요.

필요한 테이블:
- FACT_EVENTS
- FACT_VIEWER_STATS
- DIM_USERS
- AGG_DAILY_STATS
"""

import streamlit as st
from snowflake.snowpark.context import get_active_session
import pandas as pd
from datetime import datetime, timedelta

# Snowflake 세션 가져오기
session = get_active_session()

# 페이지 설정
st.set_page_config(
    page_title="스트리밍 분석 대시보드",
    page_icon="📊",
    layout="wide"
)

# 커스텀 CSS
st.markdown("""
<style>
    .metric-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 20px;
        border-radius: 12px;
        color: white;
    }
    .stMetric {
        background-color: #f8f9fa;
        padding: 15px;
        border-radius: 10px;
    }
</style>
""", unsafe_allow_html=True)

# 제목
st.title("📊 스트리밍 분석 대시보드")
st.markdown("실시간 스트리밍 데이터 분석")

# 사이드바 - 필터
st.sidebar.header("🔧 필터 설정")

# 날짜 범위 선택
date_range = st.sidebar.selectbox(
    "기간 선택",
    ["오늘", "최근 7일", "최근 30일", "최근 90일", "전체"],
    index=1
)

# 날짜 계산
today = datetime.now()
if date_range == "오늘":
    start_date = today.replace(hour=0, minute=0, second=0)
elif date_range == "최근 7일":
    start_date = today - timedelta(days=7)
elif date_range == "최근 30일":
    start_date = today - timedelta(days=30)
elif date_range == "최근 90일":
    start_date = today - timedelta(days=90)
else:
    start_date = datetime(2020, 1, 1)

start_date_str = start_date.strftime('%Y-%m-%d')

# 플랫폼 선택
platform_filter = st.sidebar.multiselect(
    "플랫폼",
    ["soop", "chzzk", "youtube", "twitch"],
    default=["soop", "chzzk", "youtube", "twitch"]
)

if not platform_filter:
    platform_filter = ["soop", "chzzk", "youtube", "twitch"]

platform_list = "'" + "','".join(platform_filter) + "'"

# ===== 메인 대시보드 =====

# 1. 요약 지표
st.header("📈 핵심 지표")

col1, col2, col3, col4 = st.columns(4)

# 총 후원 금액
total_donations = session.sql(f"""
    SELECT COALESCE(SUM(amount_krw), 0) as total
    FROM fact_events
    WHERE event_type = 'donation'
    AND event_timestamp >= '{start_date_str}'
    AND platform IN ({platform_list})
""").collect()[0]['TOTAL']

# 후원 건수
donation_count = session.sql(f"""
    SELECT COUNT(*) as cnt
    FROM fact_events
    WHERE event_type = 'donation'
    AND event_timestamp >= '{start_date_str}'
    AND platform IN ({platform_list})
""").collect()[0]['CNT']

# 고유 후원자 수
unique_donors = session.sql(f"""
    SELECT COUNT(DISTINCT user_id) as cnt
    FROM fact_events
    WHERE event_type = 'donation'
    AND event_timestamp >= '{start_date_str}'
    AND platform IN ({platform_list})
    AND user_id IS NOT NULL
""").collect()[0]['CNT']

# 총 채팅 수
total_chats = session.sql(f"""
    SELECT COUNT(*) as cnt
    FROM fact_events
    WHERE event_type = 'chat'
    AND event_timestamp >= '{start_date_str}'
    AND platform IN ({platform_list})
""").collect()[0]['CNT']

with col1:
    st.metric(
        label="💰 총 후원 금액",
        value=f"₩{total_donations:,.0f}",
        delta=f"{donation_count:,}건"
    )

with col2:
    st.metric(
        label="👥 고유 후원자",
        value=f"{unique_donors:,}명"
    )

with col3:
    st.metric(
        label="💬 총 채팅",
        value=f"{total_chats:,}개"
    )

with col4:
    avg_donation = total_donations / donation_count if donation_count > 0 else 0
    st.metric(
        label="📊 평균 후원액",
        value=f"₩{avg_donation:,.0f}"
    )

st.divider()

# 2. 후원 추이 차트
st.header("📈 후원 추이")

donation_trend = session.sql(f"""
    SELECT
        DATE_TRUNC('day', event_timestamp) as date,
        platform,
        SUM(amount_krw) as total_amount,
        COUNT(*) as donation_count
    FROM fact_events
    WHERE event_type = 'donation'
    AND event_timestamp >= '{start_date_str}'
    AND platform IN ({platform_list})
    GROUP BY 1, 2
    ORDER BY 1
""").to_pandas()

if not donation_trend.empty:
    # 피벗 테이블로 변환
    pivot_df = donation_trend.pivot(index='DATE', columns='PLATFORM', values='TOTAL_AMOUNT').fillna(0)
    st.line_chart(pivot_df)
else:
    st.info("선택한 기간에 후원 데이터가 없습니다.")

# 3. 플랫폼별 분석
st.header("🎮 플랫폼별 분석")

col1, col2 = st.columns(2)

with col1:
    st.subheader("플랫폼별 후원 금액")

    platform_donations = session.sql(f"""
        SELECT
            platform,
            SUM(amount_krw) as total_amount,
            COUNT(*) as donation_count,
            COUNT(DISTINCT user_id) as unique_donors
        FROM fact_events
        WHERE event_type = 'donation'
        AND event_timestamp >= '{start_date_str}'
        AND platform IN ({platform_list})
        GROUP BY platform
        ORDER BY total_amount DESC
    """).to_pandas()

    if not platform_donations.empty:
        st.bar_chart(platform_donations.set_index('PLATFORM')['TOTAL_AMOUNT'])
        st.dataframe(platform_donations, use_container_width=True)
    else:
        st.info("데이터가 없습니다.")

with col2:
    st.subheader("플랫폼별 채팅 활동")

    platform_chats = session.sql(f"""
        SELECT
            platform,
            COUNT(*) as chat_count,
            COUNT(DISTINCT user_id) as unique_chatters
        FROM fact_events
        WHERE event_type = 'chat'
        AND event_timestamp >= '{start_date_str}'
        AND platform IN ({platform_list})
        GROUP BY platform
        ORDER BY chat_count DESC
    """).to_pandas()

    if not platform_chats.empty:
        st.bar_chart(platform_chats.set_index('PLATFORM')['CHAT_COUNT'])
        st.dataframe(platform_chats, use_container_width=True)
    else:
        st.info("데이터가 없습니다.")

st.divider()

# 4. 상위 후원자
st.header("🏆 상위 후원자")

top_donors = session.sql(f"""
    SELECT
        user_nickname,
        platform,
        SUM(amount_krw) as total_amount,
        COUNT(*) as donation_count,
        MAX(event_timestamp) as last_donation
    FROM fact_events
    WHERE event_type = 'donation'
    AND event_timestamp >= '{start_date_str}'
    AND platform IN ({platform_list})
    AND user_nickname IS NOT NULL
    GROUP BY user_nickname, platform
    ORDER BY total_amount DESC
    LIMIT 10
""").to_pandas()

if not top_donors.empty:
    # 순위 추가
    top_donors.insert(0, '순위', range(1, len(top_donors) + 1))

    # 금액 포맷팅
    top_donors['TOTAL_AMOUNT'] = top_donors['TOTAL_AMOUNT'].apply(lambda x: f"₩{x:,.0f}")
    top_donors['LAST_DONATION'] = pd.to_datetime(top_donors['LAST_DONATION']).dt.strftime('%Y-%m-%d %H:%M')

    # 컬럼명 변경
    top_donors.columns = ['순위', '닉네임', '플랫폼', '총 후원액', '후원 횟수', '마지막 후원']

    st.dataframe(top_donors, use_container_width=True, hide_index=True)
else:
    st.info("후원 데이터가 없습니다.")

st.divider()

# 5. 시간대별 활동 분석
st.header("⏰ 시간대별 활동")

hourly_activity = session.sql(f"""
    SELECT
        HOUR(event_timestamp) as hour,
        event_type,
        COUNT(*) as event_count
    FROM fact_events
    WHERE event_timestamp >= '{start_date_str}'
    AND platform IN ({platform_list})
    AND event_type IN ('chat', 'donation')
    GROUP BY 1, 2
    ORDER BY 1
""").to_pandas()

if not hourly_activity.empty:
    pivot_hourly = hourly_activity.pivot(index='HOUR', columns='EVENT_TYPE', values='EVENT_COUNT').fillna(0)
    st.area_chart(pivot_hourly)
else:
    st.info("활동 데이터가 없습니다.")

st.divider()

# 6. 후원 유형별 분석
st.header("🎁 후원 유형별 분석")

donation_types = session.sql(f"""
    SELECT
        COALESCE(donation_type, 'unknown') as donation_type,
        platform,
        SUM(amount_krw) as total_amount,
        COUNT(*) as count
    FROM fact_events
    WHERE event_type = 'donation'
    AND event_timestamp >= '{start_date_str}'
    AND platform IN ({platform_list})
    GROUP BY 1, 2
    ORDER BY total_amount DESC
""").to_pandas()

if not donation_types.empty:
    col1, col2 = st.columns(2)

    with col1:
        st.subheader("유형별 후원 금액")
        type_totals = donation_types.groupby('DONATION_TYPE')['TOTAL_AMOUNT'].sum()
        st.bar_chart(type_totals)

    with col2:
        st.subheader("상세 테이블")
        st.dataframe(donation_types, use_container_width=True)
else:
    st.info("후원 유형 데이터가 없습니다.")

st.divider()

# 7. 최근 이벤트
st.header("🔔 최근 이벤트")

event_type_filter = st.selectbox(
    "이벤트 유형",
    ["전체", "donation", "subscribe", "chat"],
    index=0
)

event_filter_sql = "" if event_type_filter == "전체" else f"AND event_type = '{event_type_filter}'"

recent_events = session.sql(f"""
    SELECT
        event_timestamp,
        event_type,
        platform,
        user_nickname,
        message,
        amount_krw,
        donation_type
    FROM fact_events
    WHERE event_timestamp >= '{start_date_str}'
    AND platform IN ({platform_list})
    {event_filter_sql}
    ORDER BY event_timestamp DESC
    LIMIT 50
""").to_pandas()

if not recent_events.empty:
    recent_events['EVENT_TIMESTAMP'] = pd.to_datetime(recent_events['EVENT_TIMESTAMP']).dt.strftime('%Y-%m-%d %H:%M:%S')
    recent_events['AMOUNT_KRW'] = recent_events['AMOUNT_KRW'].apply(
        lambda x: f"₩{x:,.0f}" if pd.notna(x) and x > 0 else "-"
    )
    recent_events['MESSAGE'] = recent_events['MESSAGE'].apply(
        lambda x: x[:50] + "..." if pd.notna(x) and len(str(x)) > 50 else x
    )

    recent_events.columns = ['시간', '유형', '플랫폼', '닉네임', '메시지', '금액', '후원유형']
    st.dataframe(recent_events, use_container_width=True, hide_index=True)
else:
    st.info("이벤트가 없습니다.")

# 푸터
st.divider()
st.markdown("""
<div style="text-align: center; color: #888; padding: 20px;">
    Streaming Analytics Dashboard | Powered by Snowflake Streamlit
</div>
""", unsafe_allow_html=True)
