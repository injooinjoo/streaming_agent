"""
수익 분석 페이지 - Snowflake Streamlit

후원 수익, 트렌드, 예측을 분석합니다.
"""

import streamlit as st
from snowflake.snowpark.context import get_active_session
import pandas as pd
from datetime import datetime, timedelta

session = get_active_session()

st.set_page_config(page_title="수익 분석", page_icon="💰", layout="wide")

st.title("💰 수익 분석")

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

# 1. 수익 요약
st.header("📊 수익 요약")

revenue_summary = session.sql(f"""
    SELECT
        SUM(amount_krw) as total_revenue,
        COUNT(*) as total_donations,
        COUNT(DISTINCT user_id) as unique_donors,
        AVG(amount_krw) as avg_donation,
        MAX(amount_krw) as max_donation,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY amount_krw) as median_donation
    FROM fact_events
    WHERE event_type = 'donation'
    AND event_timestamp >= '{start_date}'
    AND platform IN ({platform_list})
""").collect()[0]

col1, col2, col3 = st.columns(3)

with col1:
    st.metric(
        "총 수익",
        f"₩{revenue_summary['TOTAL_REVENUE'] or 0:,.0f}",
        f"{revenue_summary['TOTAL_DONATIONS'] or 0:,}건"
    )

with col2:
    st.metric(
        "고유 후원자",
        f"{revenue_summary['UNIQUE_DONORS'] or 0:,}명",
        f"평균 ₩{revenue_summary['AVG_DONATION'] or 0:,.0f}"
    )

with col3:
    st.metric(
        "최대/중앙값",
        f"₩{revenue_summary['MAX_DONATION'] or 0:,.0f}",
        f"중앙값 ₩{revenue_summary['MEDIAN_DONATION'] or 0:,.0f}"
    )

st.divider()

# 2. 일별 수익 추이
st.header("📈 일별 수익 추이")

daily_revenue = session.sql(f"""
    SELECT
        DATE_TRUNC('day', event_timestamp) as date,
        SUM(amount_krw) as revenue,
        COUNT(*) as donations,
        COUNT(DISTINCT user_id) as donors
    FROM fact_events
    WHERE event_type = 'donation'
    AND event_timestamp >= '{start_date}'
    AND platform IN ({platform_list})
    GROUP BY 1
    ORDER BY 1
""").to_pandas()

if not daily_revenue.empty:
    # 이동 평균 계산
    daily_revenue['MA7'] = daily_revenue['REVENUE'].rolling(window=7, min_periods=1).mean()

    chart_data = daily_revenue.set_index('DATE')[['REVENUE', 'MA7']]
    st.line_chart(chart_data)

    # 통계 테이블
    st.subheader("일별 통계")
    daily_revenue['DATE'] = pd.to_datetime(daily_revenue['DATE']).dt.strftime('%Y-%m-%d')
    daily_revenue['REVENUE'] = daily_revenue['REVENUE'].apply(lambda x: f"₩{x:,.0f}")
    daily_revenue.columns = ['날짜', '수익', '후원수', '후원자수', '7일 이동평균']
    st.dataframe(daily_revenue.tail(14), use_container_width=True, hide_index=True)
else:
    st.info("데이터가 없습니다.")

st.divider()

# 3. 플랫폼별 수익 비교
st.header("🎮 플랫폼별 수익")

platform_revenue = session.sql(f"""
    SELECT
        platform,
        SUM(amount_krw) as total_revenue,
        COUNT(*) as donation_count,
        COUNT(DISTINCT user_id) as unique_donors,
        AVG(amount_krw) as avg_donation,
        SUM(amount_krw) * 100.0 / SUM(SUM(amount_krw)) OVER () as revenue_share
    FROM fact_events
    WHERE event_type = 'donation'
    AND event_timestamp >= '{start_date}'
    AND platform IN ({platform_list})
    GROUP BY platform
    ORDER BY total_revenue DESC
""").to_pandas()

if not platform_revenue.empty:
    col1, col2 = st.columns(2)

    with col1:
        st.subheader("수익 비중")
        st.bar_chart(platform_revenue.set_index('PLATFORM')['TOTAL_REVENUE'])

    with col2:
        st.subheader("평균 후원액")
        st.bar_chart(platform_revenue.set_index('PLATFORM')['AVG_DONATION'])

    # 상세 테이블
    platform_revenue['TOTAL_REVENUE'] = platform_revenue['TOTAL_REVENUE'].apply(lambda x: f"₩{x:,.0f}")
    platform_revenue['AVG_DONATION'] = platform_revenue['AVG_DONATION'].apply(lambda x: f"₩{x:,.0f}")
    platform_revenue['REVENUE_SHARE'] = platform_revenue['REVENUE_SHARE'].apply(lambda x: f"{x:.1f}%")
    platform_revenue.columns = ['플랫폼', '총 수익', '후원 수', '후원자 수', '평균 후원액', '수익 비중']
    st.dataframe(platform_revenue, use_container_width=True, hide_index=True)
else:
    st.info("데이터가 없습니다.")

st.divider()

# 4. 후원 금액 분포
st.header("📊 후원 금액 분포")

donation_distribution = session.sql(f"""
    SELECT
        CASE
            WHEN amount_krw < 1000 THEN '1,000원 미만'
            WHEN amount_krw < 5000 THEN '1,000-5,000원'
            WHEN amount_krw < 10000 THEN '5,000-10,000원'
            WHEN amount_krw < 50000 THEN '10,000-50,000원'
            WHEN amount_krw < 100000 THEN '50,000-100,000원'
            ELSE '100,000원 이상'
        END as amount_range,
        COUNT(*) as count,
        SUM(amount_krw) as total
    FROM fact_events
    WHERE event_type = 'donation'
    AND event_timestamp >= '{start_date}'
    AND platform IN ({platform_list})
    GROUP BY 1
    ORDER BY MIN(amount_krw)
""").to_pandas()

if not donation_distribution.empty:
    col1, col2 = st.columns(2)

    with col1:
        st.subheader("건수 분포")
        st.bar_chart(donation_distribution.set_index('AMOUNT_RANGE')['COUNT'])

    with col2:
        st.subheader("금액 분포")
        st.bar_chart(donation_distribution.set_index('AMOUNT_RANGE')['TOTAL'])
else:
    st.info("데이터가 없습니다.")

st.divider()

# 5. 후원 유형별 분석
st.header("🎁 후원 유형별")

donation_types = session.sql(f"""
    SELECT
        COALESCE(donation_type, '기타') as type,
        platform,
        SUM(amount_krw) as total,
        COUNT(*) as count,
        AVG(amount_krw) as avg_amount
    FROM fact_events
    WHERE event_type = 'donation'
    AND event_timestamp >= '{start_date}'
    AND platform IN ({platform_list})
    GROUP BY 1, 2
    ORDER BY total DESC
""").to_pandas()

if not donation_types.empty:
    # 피벗 테이블
    pivot_types = donation_types.pivot_table(
        index='TYPE',
        columns='PLATFORM',
        values='TOTAL',
        aggfunc='sum'
    ).fillna(0)

    st.bar_chart(pivot_types)

    st.dataframe(donation_types, use_container_width=True)
else:
    st.info("데이터가 없습니다.")

st.divider()

# 6. 시간대별 수익
st.header("⏰ 시간대별 수익")

hourly_revenue = session.sql(f"""
    SELECT
        HOUR(event_timestamp) as hour,
        SUM(amount_krw) as revenue,
        COUNT(*) as donations
    FROM fact_events
    WHERE event_type = 'donation'
    AND event_timestamp >= '{start_date}'
    AND platform IN ({platform_list})
    GROUP BY 1
    ORDER BY 1
""").to_pandas()

if not hourly_revenue.empty:
    hourly_revenue['HOUR'] = hourly_revenue['HOUR'].apply(lambda x: f"{x:02d}:00")
    st.bar_chart(hourly_revenue.set_index('HOUR')['REVENUE'])
else:
    st.info("데이터가 없습니다.")

st.divider()

# 7. 요일별 수익
st.header("📅 요일별 수익")

weekday_revenue = session.sql(f"""
    SELECT
        DAYOFWEEK(event_timestamp) as day_num,
        CASE DAYOFWEEK(event_timestamp)
            WHEN 0 THEN '일요일'
            WHEN 1 THEN '월요일'
            WHEN 2 THEN '화요일'
            WHEN 3 THEN '수요일'
            WHEN 4 THEN '목요일'
            WHEN 5 THEN '금요일'
            WHEN 6 THEN '토요일'
        END as day_name,
        SUM(amount_krw) as revenue,
        COUNT(*) as donations,
        AVG(amount_krw) as avg_donation
    FROM fact_events
    WHERE event_type = 'donation'
    AND event_timestamp >= '{start_date}'
    AND platform IN ({platform_list})
    GROUP BY 1, 2
    ORDER BY 1
""").to_pandas()

if not weekday_revenue.empty:
    col1, col2 = st.columns(2)

    with col1:
        st.subheader("총 수익")
        st.bar_chart(weekday_revenue.set_index('DAY_NAME')['REVENUE'])

    with col2:
        st.subheader("평균 후원액")
        st.bar_chart(weekday_revenue.set_index('DAY_NAME')['AVG_DONATION'])
else:
    st.info("데이터가 없습니다.")

# 푸터
st.divider()
st.markdown("*수익 분석 | Snowflake Streamlit*")
