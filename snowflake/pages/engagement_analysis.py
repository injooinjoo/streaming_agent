"""
참여도 분석 페이지 - Snowflake Streamlit

사용자 참여도, 리텐션, 성장 지표를 분석합니다.
"""

import streamlit as st
from snowflake.snowpark.context import get_active_session
import pandas as pd
from datetime import datetime, timedelta

session = get_active_session()

st.set_page_config(page_title="참여도 분석", page_icon="📊", layout="wide")

st.title("📊 참여도 분석")

# 사이드바 필터
st.sidebar.header("필터")
days = st.sidebar.slider("분석 기간 (일)", 7, 90, 30)
start_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')

platform_filter = st.sidebar.multiselect(
    "플랫폼",
    ["soop", "chzzk", "youtube", "twitch"],
    default=["soop", "chzzk", "youtube", "twitch"]
)
platform_list = "'" + "','".join(platform_filter) + "'"

# 1. 참여율 추이
st.header("📈 일별 참여율")

engagement_trend = session.sql(f"""
    WITH daily_stats AS (
        SELECT
            DATE_TRUNC('day', event_timestamp) as date,
            COUNT(DISTINCT CASE WHEN event_type = 'chat' THEN user_id END) as chatters,
            COUNT(DISTINCT CASE WHEN event_type = 'donation' THEN user_id END) as donors,
            COUNT(DISTINCT user_id) as total_active_users
        FROM fact_events
        WHERE event_timestamp >= '{start_date}'
        AND platform IN ({platform_list})
        AND user_id IS NOT NULL
        GROUP BY 1
    ),
    viewer_stats AS (
        SELECT
            DATE_TRUNC('day', recorded_at) as date,
            AVG(viewer_count) as avg_viewers
        FROM fact_viewer_stats
        WHERE recorded_at >= '{start_date}'
        AND platform IN ({platform_list})
        GROUP BY 1
    )
    SELECT
        d.date,
        d.chatters,
        d.donors,
        d.total_active_users,
        COALESCE(v.avg_viewers, 0) as avg_viewers,
        CASE
            WHEN v.avg_viewers > 0 THEN ROUND(d.chatters * 100.0 / v.avg_viewers, 2)
            ELSE 0
        END as chat_engagement_rate
    FROM daily_stats d
    LEFT JOIN viewer_stats v ON d.date = v.date
    ORDER BY d.date
""").to_pandas()

if not engagement_trend.empty:
    col1, col2 = st.columns(2)

    with col1:
        st.subheader("활성 사용자")
        st.line_chart(engagement_trend.set_index('DATE')[['CHATTERS', 'DONORS']])

    with col2:
        st.subheader("채팅 참여율 (%)")
        st.line_chart(engagement_trend.set_index('DATE')['CHAT_ENGAGEMENT_RATE'])
else:
    st.info("데이터가 없습니다.")

st.divider()

# 2. 사용자 리텐션 분석
st.header("🔄 사용자 리텐션")

retention_data = session.sql(f"""
    WITH user_cohorts AS (
        SELECT
            user_id,
            MIN(DATE_TRUNC('week', event_timestamp)) as cohort_week
        FROM fact_events
        WHERE event_timestamp >= '{start_date}'
        AND platform IN ({platform_list})
        AND user_id IS NOT NULL
        GROUP BY user_id
    ),
    user_activities AS (
        SELECT DISTINCT
            e.user_id,
            c.cohort_week,
            DATE_TRUNC('week', e.event_timestamp) as activity_week
        FROM fact_events e
        JOIN user_cohorts c ON e.user_id = c.user_id
        WHERE e.event_timestamp >= '{start_date}'
        AND e.platform IN ({platform_list})
    )
    SELECT
        cohort_week,
        DATEDIFF('week', cohort_week, activity_week) as week_number,
        COUNT(DISTINCT user_id) as users
    FROM user_activities
    GROUP BY 1, 2
    ORDER BY 1, 2
""").to_pandas()

if not retention_data.empty:
    # 피벗 테이블로 변환
    retention_pivot = retention_data.pivot(
        index='COHORT_WEEK',
        columns='WEEK_NUMBER',
        values='USERS'
    ).fillna(0)

    # Week 0 기준 리텐션율 계산
    for col in retention_pivot.columns:
        if col > 0:
            retention_pivot[col] = (retention_pivot[col] / retention_pivot[0] * 100).round(1)
    retention_pivot[0] = 100

    st.dataframe(retention_pivot, use_container_width=True)

    st.caption("숫자는 Week 0 대비 리텐션율 (%)입니다.")
else:
    st.info("리텐션 데이터가 없습니다.")

st.divider()

# 3. 사용자 세그먼트 분석
st.header("👥 사용자 세그먼트")

user_segments = session.sql(f"""
    WITH user_stats AS (
        SELECT
            user_id,
            user_nickname,
            platform,
            COUNT(*) as total_events,
            SUM(CASE WHEN event_type = 'chat' THEN 1 ELSE 0 END) as chat_count,
            SUM(CASE WHEN event_type = 'donation' THEN 1 ELSE 0 END) as donation_count,
            SUM(CASE WHEN event_type = 'donation' THEN amount_krw ELSE 0 END) as total_donated,
            MIN(event_timestamp) as first_seen,
            MAX(event_timestamp) as last_seen
        FROM fact_events
        WHERE event_timestamp >= '{start_date}'
        AND platform IN ({platform_list})
        AND user_id IS NOT NULL
        GROUP BY 1, 2, 3
    )
    SELECT
        CASE
            WHEN total_donated >= 100000 THEN 'VIP (10만원+)'
            WHEN total_donated >= 10000 THEN '후원자 (1만원+)'
            WHEN donation_count > 0 THEN '소액 후원자'
            WHEN chat_count >= 100 THEN '활성 채터'
            WHEN chat_count >= 10 THEN '일반 채터'
            ELSE '저활동'
        END as segment,
        COUNT(*) as user_count,
        SUM(total_donated) as segment_donation,
        AVG(chat_count) as avg_chats
    FROM user_stats
    GROUP BY 1
    ORDER BY segment_donation DESC
""").to_pandas()

if not user_segments.empty:
    col1, col2 = st.columns(2)

    with col1:
        st.subheader("세그먼트별 사용자 수")
        st.bar_chart(user_segments.set_index('SEGMENT')['USER_COUNT'])

    with col2:
        st.subheader("세그먼트별 후원 금액")
        user_segments['SEGMENT_DONATION'] = user_segments['SEGMENT_DONATION'].fillna(0)
        st.bar_chart(user_segments.set_index('SEGMENT')['SEGMENT_DONATION'])

    st.dataframe(user_segments, use_container_width=True)
else:
    st.info("사용자 데이터가 없습니다.")

st.divider()

# 4. 후원 전환 분석
st.header("💰 후원 전환 분석")

conversion_data = session.sql(f"""
    WITH user_journey AS (
        SELECT
            user_id,
            MIN(CASE WHEN event_type = 'chat' THEN event_timestamp END) as first_chat,
            MIN(CASE WHEN event_type = 'donation' THEN event_timestamp END) as first_donation
        FROM fact_events
        WHERE event_timestamp >= '{start_date}'
        AND platform IN ({platform_list})
        AND user_id IS NOT NULL
        GROUP BY user_id
    )
    SELECT
        COUNT(*) as total_users,
        SUM(CASE WHEN first_chat IS NOT NULL THEN 1 ELSE 0 END) as chatted_users,
        SUM(CASE WHEN first_donation IS NOT NULL THEN 1 ELSE 0 END) as donated_users,
        SUM(CASE WHEN first_chat IS NOT NULL AND first_donation IS NOT NULL THEN 1 ELSE 0 END) as chat_to_donate,
        AVG(CASE
            WHEN first_chat IS NOT NULL AND first_donation IS NOT NULL AND first_donation > first_chat
            THEN DATEDIFF('hour', first_chat, first_donation)
            ELSE NULL
        END) as avg_hours_to_convert
    FROM user_journey
""").collect()[0]

col1, col2, col3, col4 = st.columns(4)

with col1:
    st.metric("총 사용자", f"{conversion_data['TOTAL_USERS']:,}명")

with col2:
    chat_rate = conversion_data['CHATTED_USERS'] / conversion_data['TOTAL_USERS'] * 100 if conversion_data['TOTAL_USERS'] > 0 else 0
    st.metric("채팅 참여", f"{conversion_data['CHATTED_USERS']:,}명", f"{chat_rate:.1f}%")

with col3:
    donate_rate = conversion_data['DONATED_USERS'] / conversion_data['TOTAL_USERS'] * 100 if conversion_data['TOTAL_USERS'] > 0 else 0
    st.metric("후원 전환", f"{conversion_data['DONATED_USERS']:,}명", f"{donate_rate:.1f}%")

with col4:
    avg_hours = conversion_data['AVG_HOURS_TO_CONVERT'] or 0
    st.metric("평균 전환 시간", f"{avg_hours:.1f}시간")

st.divider()

# 5. 이벤트 유형별 히트맵
st.header("🗓️ 요일/시간별 활동 히트맵")

heatmap_data = session.sql(f"""
    SELECT
        DAYOFWEEK(event_timestamp) as day_of_week,
        HOUR(event_timestamp) as hour_of_day,
        COUNT(*) as event_count
    FROM fact_events
    WHERE event_timestamp >= '{start_date}'
    AND platform IN ({platform_list})
    GROUP BY 1, 2
    ORDER BY 1, 2
""").to_pandas()

if not heatmap_data.empty:
    pivot_heatmap = heatmap_data.pivot(
        index='DAY_OF_WEEK',
        columns='HOUR_OF_DAY',
        values='EVENT_COUNT'
    ).fillna(0)

    # 요일 이름으로 변경
    day_names = {0: '일', 1: '월', 2: '화', 3: '수', 4: '목', 5: '금', 6: '토'}
    pivot_heatmap.index = pivot_heatmap.index.map(day_names)

    st.dataframe(
        pivot_heatmap.style.background_gradient(cmap='YlOrRd'),
        use_container_width=True
    )

    st.caption("색이 진할수록 활동이 많습니다.")
else:
    st.info("활동 데이터가 없습니다.")

# 푸터
st.divider()
st.markdown("*참여도 분석 | Snowflake Streamlit*")
