# Streaming Agent - 종합 문서

> **스트리머를 위한 실시간 오버레이 관리 플랫폼**
>
> SOOP, Chzzk, YouTube, Twitch 지원

---

## 목차

1. [Executive Summary](#1-executive-summary)
2. [배경 및 문제 정의](#2-배경-및-문제-정의)
3. [시장 분석 및 경쟁사](#3-시장-분석-및-경쟁사)
4. [실행 계획](#4-실행-계획)
5. [기대 효과 및 사업적 가치](#5-기대-효과-및-사업적-가치)
6. [리스크 및 대응 방안](#6-리스크-및-대응-방안)
7. [신규 기능 아이디어](#7-신규-기능-아이디어)
8. [기술 아키텍처](#8-기술-아키텍처)
9. [핵심 기능 명세](#9-핵심-기능-명세)
10. [데이터베이스 스키마](#10-데이터베이스-스키마)
11. [API 명세](#11-api-명세)
12. [Socket.io 이벤트](#12-socketio-이벤트)
13. [개발 가이드](#13-개발-가이드)
14. [로드맵](#14-로드맵)

---

# Part 1: 비즈니스 전략

---

## 1. Executive Summary

### 프로젝트 정의

**Streaming Agent**는 스트리머 방송 화면 위에서 동작하는 오버레이 기반 에이전트로, 멀티 플랫폼 방송·채팅·후원·이벤트 데이터를 실시간으로 수집·정규화·분석하는 데이터 인입 시스템입니다.

### 핵심 목표

| 단계 | 목표 |
|------|------|
| **1차 목표** | 라이브 스트리밍 중 발생하는 방대한 데이터를 독점 확보 |
| **궁극적 목표** | 넥슨의 IP와 기술력을 활용한 '압도적으로 재미있는 방송 경험' 제공으로 넥슨 게임이 스트리밍 시장을 장악 |

### 전략적 가치

- 경쟁사가 접근할 수 없는 실시간 스트리밍 데이터 → **핵심 자산**
- 넥슨의 모든 사업 부문이 더 스마트한 의사결정
- 추후 넥슨 게임 전용 혜택과 기능 탑재 → **시장 지배력 구축**

---

## 2. 배경 및 문제 정의

### 2.1 현재 직면한 문제점

| 문제 | 상세 설명 |
|------|----------|
| **직관에 의존한 민심 파악** | 숙제 방송이 아닌 곳에서 어떤 게임이 인기를 얻고 있는지, 유저들이 우리 게임에 대해 어떻게 말하는지 파편화된 정보에 의존해 추측 |
| **데이터 주권의 부재** | 모든 데이터 주권은 각 플랫폼에 종속되어 있어 그들이 제공하는 제한적인 데이터만 제공 받음 |
| **측정 불가한 ROI** | 데이터 부재는 곧 성과 측정 부재. 특히 Live stream 과업에 사용되는 마케팅 비용이 실제로 얼마나 효과가 있었는지 답하기 어려움 |

### 2.2 스트리밍 생태계 구조

```
┌─────────────────────────────────────────────────────────────┐
│                    스트리밍 생태계 구조                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 플랫폼 레이어     YouTube, Twitch, SOOP, 치지직          │
│     ├─ 송출, 트래픽, 결제 권한 보유                          │
│                                                             │
│  2. 툴(도구) 레이어   위플랩, Streamlabs, PRISM              │
│     ├─ 오버레이, 알림, 인터랙션 제공                         │
│     ├─ ★ 모든 이벤트가 통과하는 핵심 지점                    │
│     └─ ★ 현재 데이터 자산화 미흡                            │
│                                                             │
│  3. 콘텐츠 레이어     게임, 토크, 음악, 스포츠 등             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 구조적 문제

- 게임 내 데이터는 풍부하나 게임 외 노출, 방송 반응, 커뮤니티 반응과 연결 단절
- 스트리머 운영은 감각, 경험, 사후 대응 중심
- 정량화 불가능한 영역이 과도하게 큼

### 2.4 왜 '오버레이 서비스'인가?

스트리머들은 방송 연출 및 소통을 위해 송출 전에 오버레이 프로그램을 미들웨어로 활용합니다.

**오버레이의 특성:**
- 스트리머 워크플로우의 중앙
- 플랫폼 종속 없음
- 항상 켜져 있음
- 모든 이벤트가 통과함
- → **직접적으로 모든 데이터 수집이 가능**

### 2.5 스트리머 라이브 방송 워크플로우

| 단계 | 프로그램 예시 | 주요 역할 |
|------|-------------|----------|
| 1. 화면 구성 및 송출 | 프릭샷, OBS Studio, XSplit | 게임, 웹캠 등 방송 화면을 만들고 스트리밍 플랫폼 서버로 전송 |
| **2. 소통/후원 기능 추가** | **위플랩 (Weflab)** | **채팅창, 후원 알림 등 오버레이 위젯을 만들고 URL 제공** |
| 3. 최종 화면 조합 | 프릭샷, OBS Studio, XSplit | 위플랩에서 받은 URL을 방송 화면에 추가 |
| 4. 방송 시작 | 프릭샷, OBS Studio, XSplit | 스트리밍 플랫폼 내 본인 채널에서 최종 화면 송출 시작 |
| 5. 라이브 기반 VOD 제작 | CapCut, Vrew | 방송의 재미있는 부분만 따로 잘라 짧은 클립 영상 제작 |

### 2.6 수집 가능한 데이터 종류

#### 시청자 상호작용 데이터
- **채팅**: 시청자 닉네임, 메시지 내용, 채팅 시간, 구독 여부 등
- **후원**: 후원자 닉네임, 후원 금액, 후원 메시지, 후원 종류(별풍선, 슈퍼챗 등), 후원 시점
- **구독/팔로우**: 구독/팔로우한 시청자 닉네임, 구독 개월 수, 팔로우 시간

#### 방송 상태 데이터
- 방송 상태 (On/Off)
- 크로스 플랫폼 실시간 시청자 수
- 방송 카테고리 및 방송 제목

#### 스트리머 정보
- 크로스 플랫폼 스트리머 닉네임, 채널 ID 등 공개된 프로필 정보

---

## 3. 시장 분석 및 경쟁사

### 3.1 위플랩 (Weflab)

> **국내 스트리머 오버레이 시장의 사실상 표준**

| 항목 | 정보 |
|------|------|
| 직원 수 | 5~15명 |
| 연 매출 | 비공개 (추정 3~10억 원 미만) |
| 누적 사용자 수 | 수만 명(한국 스트리머 중심) |
| 주 고객군 | 개인 스트리머 |

**평가:**
- ✅ 기능적 완성도 매우 높음
- ❌ 데이터 소유 구조 없음
- ❌ 분석·확장·사업 연계 기능 부재

#### 위플랩 기능 전체 목록

**메인 위젯 기능**
- 채팅창 – 테마 스킨, 공지, 타이머, 시청자 수 표시
- 후원 알림 – TTS, 룰렛, 시그니처 사운드
- 후원 자막 – MVP, 랭킹, 이미지 후원
- 목표치 그래프 – 후원, 시청자 수 목표
- 룰렛 후원 – 확률형 미션/벌칙
- 이모티콘 리액션 – 시청자 반응 효과
- 엔딩 크레딧 – 후원/채팅/이모티콘 요약
- 전광판 – 메시지 표시
- 투표 – 채팅/후원 기반 참여

**계정 및 관리 기능**
- 다중 플랫폼 채널 연결, 계정 공유, 로그인 기록, 보안 관리

**미디어 및 파일 관리**
- 이미지·사운드 업로드, 드래그 드롭, 사운드 녹음

**필터링 및 관리**
- 사용자/단어 필터링, 후원·엔딩 크레딧 필터링

**분석 및 통계**
- 룰렛 통계, 후원 관리, 후원 이미지 저장

**테마 및 디자인**
- 테마 시스템, 탄막 효과

**유틸리티 및 기타**
- 설정 불러오기, URL 복사, 채팅 재연결, 위플봇, 전자녀(TTS), 개수별 후원 설정, 다국어 지원

> 💡 **본 사업에서는 위 기능 전부를 기본 요건으로 전제**

### 3.2 PRISM Live Studio

- 송출 중심의 방송 툴
- 플랫폼 중립 전략으로 활용 (단, 치지직 한정)
- 게임 연동 및 데이터 분석 목적에는 한계

### 3.3 결론

> **게임사 관점에서 스트리밍 데이터를 수집·정규화·활용하기 위한 서비스가 존재하지 않음**

---

## 4. 실행 계획

### 4.1 Phase 1: 유저(스트리머) 확보

**마일스톤:** 출시 이후 1~2년차

**목표:** 위플랩보다 더 좋거나 최소 동일한 툴을 제공하여 시장을 장악하고, 스트리밍 데이터를 독점 확보

#### 핵심 전략

##### 1. 넥슨 IP를 활용한 넥슨만의 TTS/이펙트 제공

**넥슨 게임 캐릭터 TTS 보이스:**
- '메이플스토리' 세렌
- '던전앤파이터' 세리아
- 등 넥슨 인기 게임 캐릭터 목소리로 후원을 읽어주는 TTS를 독점 제공

**다이내믹 모션 이펙트:**
- 정적인 GIF 알림을 넘어, 방송 화면 전체와 상호작용하는 영화 같은 모션 그래픽 알림
- 시청자가 구매한 이모티콘이 방송 화면에 '비처럼' 내리거나 터지는 등 새로운 형태의 시청자 참여

##### 2. 수집된 데이터로 스트리머용 대시보드 제공

"어떤 게임, 어떤 장면에서 시청자 반응이 폭발했는지", "어떤 콘텐츠가 구독 전환율이 높았는지" 등을 분석하여, **데이터에 기반한 성장 전략**을 수립할 수 있게 지원

**대시보드 기능:**
- 방송 핵심 지표 추이 (인터렉티브 그래프)
- 주요 이벤트 타임라인과 시청자 반응 분석
  - 예: `[23:10] 👍 GOOD: 시청자 참여 '룰렛 후원' 진행 (시청자 수 반등, 긍정 채팅량 증가)`
- 시청자 분석 ('큰 손', 채팅왕, 신규 구독 분류)
- 자주 언급된 키워드
- 게임별 성과 분석

| 게임 카테고리 | 플레이 시간 | 평균 시청자 | 팔로워 전환율 | 시간당 후원금 | 긍정 채팅 비율 |
|-------------|------------|------------|-------------|-------------|--------------|
| ⚽ FC 온라인 | 1시간 30분 | **1,120명** | **1.2%** | **₩ 350,000** | **85%** |
| 🍁 메이플스토리 | 2시간 | 750명 | 0.5% | ₩ 127,000 | 60% |

##### 3. 방송 설정 템플릿 마켓 플레이스 기능 제공

스트리머들 뿐 아니라 그 팬들도 템플릿을 생성할 수 있는 공간을 제공하여, 트렌디한 콘텐츠가 끊임없이 생성되도록 함

- 예: 이세돌 전용 후원 위젯 (제작자: 이세돌 팬)

##### 4. 스트리머 파트너십을 활용한 락인(lock-in)

- 넥슨 파트너 스트리머 or 광고 방송 송출 시 Streaming Agent 사용 조건 부여
- 신입/소규모 스트리머: 넥슨이 이 데이터를 통해 잠재력 있는 스트리머 발굴 및 지원 프로그램 진행 예정이라는 유도

##### 5. 그 외 편의 기능 제공

- 익명의 시청자 후원 기능 (유튜브에서 닉네임 안보이도록 하고 싶은 사람을 위해)

### 4.2 Phase 2: 넥슨 독점 기능 출시

**목표:** 확보된 데이터 인프라와 시장 지배력을 바탕으로, 넥슨 게임의 유저 유입 및 전환을 직접 유도

**핵심 전략:**

1단계에서 구축된 인프라 위에 넥슨 게임 성장을 위한 독점 기능들을 탑재:

- **게임-방송 실시간 연동**
- **스트림 드롭스**
- **인터랙티브 광고**

---

## 5. 기대 효과 및 사업적 가치

> 💡 이 프로젝트의 가치는 단기적인 직접 매출이 아닌, **독보적인 '데이터 자산' 확보**에 있습니다.

### 5.1 '데이터' 그 자체가 주는 압도적인 사업적 가치

#### 마케팅 & 사업개발 측면

| 활용 | 설명 |
|------|------|
| **'진짜' 인플루언서 발굴** | 표면적인 팔로워 수가 아닌 각 게임에 대한 채팅 참여율과 긍정 반응률을 기반으로 잠재력 있는 스트리머를 경쟁사보다 먼저 발굴하고 파트너십 |
| **캠페인 성과 측정** | 특정 스트리머의 방송 이후 채팅에서 우리 게임 언급량이 얼마나 늘었는지, 긍정/부정 키워드는 무엇인지 정량적으로 분석하여 캠페인의 실질적 효과 측정 |
| **정밀 타겟 그룹 식별** | 특정 스트리머의 시청자들이 어떤 성향인지 분석하여 타겟팅 (예: 서브컬처 게임 언급량이 높은 시청자 그룹 → '블루 아카이브'의 잠재 고객으로 타겟팅) |

#### 게임 개발 및 운영 측면

| 활용 | 설명 |
|------|------|
| **'날것 그대로의' 유저 피드백** | 실시간 채팅에서 나오는 필터링되지 않은 반응을 즉각 수집 |
| **콘텐츠 매력도 분석** | 스트리머들과 시청자들이 어떤 보스 몬스터, 어떤 맵에서 가장 오래 머무는지, 시청자들은 어떤 장면에서 가장 뜨겁게 반응하는지 데이터로 분석 |

### 5.2 미래의 직접적인 매출 및 생태계 지배력

- **넥슨 게임 방송에 대한 연출 강화:** '스트림 드롭스', '프리미엄 TTS 보이스', '스페셜 모션 이펙트' 등 넥슨 게임 방송에 유리한 혜택을 제공하여 넥슨 게임을 하면 방송이 재밌다는 대세감 조성
- **신규 직접 수익 모델:** 방송 연출 효과를 유료로 판매하거나, 설정 템플릿 마켓 플레이스, 또는 각종 제휴와 같은 BM을 통해 플랫폼 자체의 자생력 확보

---

## 6. 리스크 및 대응 방안

| 리스크 | 해결 방안 |
|--------|----------|
| **시장 저항 및 중립성 훼손 우려** | 유저(스트리머) 확보 단계에서는 철저히 '중립적인 툴'로 포지셔닝. "우리는 모든 스트리밍 방송을 위한 최고의 툴을 제공하며, 넥슨 게임과 관련한 특수 기능은 부가적인 기능일 뿐"이라는 명분 확보 |
| **스트리머 모객의 어려움** | 기존 툴(위플랩)에서의 마이그레이션을 손쉽게 제공하고, 템플릿 마켓 플레이스 기능을 통해 트렌디한 템플릿이 알아서 생성되는 구조 형성. 넥슨의 크리에이터 파트너십도 적극 활용 |
| **초기 투자 비용 및 기술적 난이도** | 프로덕트 특성상 기술적 난이도가 높지 않을 것으로 예상 (위플랩도 총 사원 5명 정도). MVP(최소 기능 제품)를 통한 단계적 접근으로 초기 리스크 관리 |
| **데이터 보안 및 개인정보보호 이슈** | 개인정보보호 규정을 잘 설계하고, 익명 데이터의 수집 및 활용 목적에 대해서도 투명하게 고지하며, 최고 수준의 보안 약속 |

---

## 7. 신규 기능 아이디어

### 7.1 우선순위 높은 아이디어

| 기능 | 설명 |
|------|------|
| **유튜브 업로드용 자동 채팅 필터** | VOD 편집 시 자동으로 부적절한 채팅 블러 처리 |
| **브금 분리 영상 저장** | 저작권 문제 없이 VOD 제작 가능하도록 배경음악 분리 |
| **인게임 닉네임 숨김** | 스나이핑 방지를 위한 게임 내 닉네임 자동 가림 |
| **롤 미니맵 가리기** | 방송에서는 가리고, 영상에서는 보이게 하는 기능 |
| **성우 계약 전용 TTS** | 넥슨 IP 캐릭터 성우가 직접 녹음한 고품질 TTS |

### 7.2 기본적 조건

- 기존 위플랩 기능들은 모두 구현해야 함
- 기존 위플랩 설정 값을 한번에 옮길 수 있는 원클릭 Importing 시스템
- 넥슨 뿐만 아니라 여러 게임사들 방송까지도 같이 효율성 있게 해야 함
- 자체 TTS, 자체 이펙트, 자체 필터값 등 차별성 필요
- 호환이 용이한 설계
- SOOP, 치지직, 유튜브, 트위치 연결 가능
- 자체 통계를 모아볼 수 있음

---

# Part 2: 기술 문서

---

## 8. 기술 아키텍처

### 8.1 기술 스택

| 영역 | 기술 |
|------|------|
| **Frontend** | React 19, Vite 7, React Router DOM 7, Lucide React, Recharts |
| **Backend** | Express 5, Socket.io 4, SQLite3 |
| **인증** | JWT (jsonwebtoken), bcrypt |
| **OAuth** | SOOP, Naver, Google, Twitch |
| **스타일** | CSS Custom Properties, Glass-morphism |

### 8.2 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         시스템 아키텍처                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [Streamer Client]                                                      │
│       │                                                                 │
│       ▼                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │               Overlay / Widget Layer                         │       │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐          │       │
│  │  │Chat │ │Alert│ │Goal │ │Tick │ │Vote │ │Emoji│  ...      │       │
│  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘          │       │
│  └─────────────────────────────────────────────────────────────┘       │
│       │                                                                 │
│       ▼                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │            Event Ingestion Layer                             │       │
│  │         WebSocket / REST, Platform Adapter                   │       │
│  │              (Socket.io + Express)                           │       │
│  └─────────────────────────────────────────────────────────────┘       │
│       │                                                                 │
│       ▼                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │              Data Processing                                 │       │
│  │              Normalization                                   │       │
│  └─────────────────────────────────────────────────────────────┘       │
│       │                                                                 │
│       ▼                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │              Data Storage                                    │       │
│  │         Raw / Normalized / Warehouse                         │       │
│  │                (SQLite3)                                     │       │
│  └─────────────────────────────────────────────────────────────┘       │
│       │                                                                 │
│       ▼                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │            Application Layer                                 │       │
│  │       Dashboard / Analytics / Integration                    │       │
│  └─────────────────────────────────────────────────────────────┘       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 8.3 프로젝트 구조

```
streaming_agent/
├── client/                              # React 프론트엔드 (Vite)
│   ├── src/
│   │   ├── App.jsx                     # 메인 라우터 (11개 라우트)
│   │   ├── main.jsx                    # 엔트리 포인트
│   │   ├── index.css                   # 글로벌 스타일
│   │   ├── App.css                     # 앱 컨테이너 스타일
│   │   │
│   │   ├── components/
│   │   │   ├── Dashboard.jsx           # 메인 대시보드
│   │   │   ├── Dashboard.css
│   │   │   │
│   │   │   ├── [오버레이 컴포넌트 - 10개]
│   │   │   ├── ChatOverlay.jsx         # 실시간 채팅 표시
│   │   │   ├── AlertOverlay.jsx        # 후원 알림 + TTS
│   │   │   ├── SubtitleOverlay.jsx     # 후원 자막
│   │   │   ├── GoalOverlay.jsx         # 목표치 그래프
│   │   │   ├── TickerOverlay.jsx       # 전광판
│   │   │   ├── RouletteOverlay.jsx     # 룰렛
│   │   │   ├── EmojiOverlay.jsx        # 이모지 반응
│   │   │   ├── VotingOverlay.jsx       # 투표
│   │   │   ├── CreditsOverlay.jsx      # 엔딩 크레딧
│   │   │   ├── AdOverlay.jsx           # 광고 표시
│   │   │   ├── Overlay.css             # 공통 오버레이 스타일
│   │   │   │
│   │   │   ├── settings/               # 설정 패널 (15개)
│   │   │   │   ├── ChatSettings.jsx    # 채팅 설정 (26+ 테마)
│   │   │   │   ├── ChatSettings.css
│   │   │   │   ├── AlertSettings.jsx   # 알림 설정
│   │   │   │   ├── SubtitleSettings.jsx
│   │   │   │   ├── GoalSettings.jsx
│   │   │   │   ├── TickerSettings.jsx
│   │   │   │   ├── RouletteSettings.jsx
│   │   │   │   ├── EmojiSettings.jsx
│   │   │   │   ├── VotingSettings.jsx
│   │   │   │   ├── CreditsSettings.jsx
│   │   │   │   ├── BotSettings.jsx     # 챗봇 설정
│   │   │   │   ├── AdSettings.jsx      # 광고 슬롯 관리
│   │   │   │   ├── DesignSettings.jsx
│   │   │   │   ├── AccountSettings.jsx
│   │   │   │   └── *.css
│   │   │   │
│   │   │   ├── auth/
│   │   │   │   ├── LoginPage.jsx       # 이메일/OAuth 로그인
│   │   │   │   ├── RegisterPage.jsx    # 회원가입
│   │   │   │   └── AuthForm.css
│   │   │   │
│   │   │   ├── advertiser/
│   │   │   │   ├── AdvertiserDashboard.jsx  # 광고주 대시보드
│   │   │   │   ├── CampaignCreate.jsx
│   │   │   │   ├── CampaignDetail.jsx
│   │   │   │   └── Advertiser.css
│   │   │   │
│   │   │   ├── analytics/
│   │   │   │   ├── RevenueAnalytics.jsx    # 수익 분석
│   │   │   │   ├── ViewerAnalytics.jsx     # 시청자 분석
│   │   │   │   ├── ContentAnalytics.jsx    # 콘텐츠 성과
│   │   │   │   ├── AdAnalytics.jsx         # 광고 분석
│   │   │   │   ├── AnalyticsPage.css
│   │   │   │   └── shared/
│   │   │   │       ├── AnalyticsCard.jsx
│   │   │   │       ├── ChartContainer.jsx
│   │   │   │       ├── TimeRangeSelector.jsx
│   │   │   │       └── TrendIndicator.jsx
│   │   │   │
│   │   │   └── marketplace/
│   │   │       ├── MarketplacePage.jsx
│   │   │       ├── MarketplaceTab.jsx
│   │   │       └── MarketplacePage.css
│   │   │
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx         # 인증 상태 관리
│   │   │   └── ThemeContext.jsx        # 라이트/다크/시스템 테마
│   │   │
│   │   └── config/
│   │       └── api.js                  # API URL 설정
│   │
│   ├── public/assets/                  # 정적 에셋 (로고)
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── index.js                        # Express + Socket.io (1647줄)
│   ├── package.json
│   ├── .env.example
│   └── weflab_clone.db                 # SQLite 데이터베이스
│
├── docs/
│   ├── spec.md                         # 기능 명세서 (레거시)
│   └── COMPREHENSIVE_DOCUMENTATION.md  # 종합 문서 (이 파일)
│
└── package.json                        # 루트 워크스페이스 설정
```

### 8.4 라우팅 구조

```javascript
Routes (11개 라우트):
├── /                           → Dashboard (메인)
├── /login                      → LoginPage
├── /register                   → RegisterPage
├── /advertiser                 → AdvertiserDashboard
│
├── /overlay/:userHash/chat     → ChatOverlay
├── /overlay/:userHash/alerts   → AlertOverlay
├── /overlay/:userHash/subtitles→ SubtitleOverlay
├── /overlay/:userHash/goals    → GoalOverlay
├── /overlay/:userHash/ticker   → TickerOverlay
├── /overlay/:userHash/roulette → RouletteOverlay
├── /overlay/:userHash/emoji    → EmojiOverlay
├── /overlay/:userHash/voting   → VotingOverlay
├── /overlay/:userHash/credits  → CreditsOverlay
└── /overlay/:userHash/ads      → AdOverlay
```

---

## 9. 핵심 기능 명세

### 9.1 오버레이 시스템 (10종)

| # | 오버레이 | 용도 | 주요 설정 | Socket 이벤트 |
|---|---------|------|----------|---------------|
| 1 | **ChatOverlay** | 실시간 채팅창 | 26+ 테마, 폰트, 색상, 애니메이션 | `new-event` |
| 2 | **AlertOverlay** | 후원 알림 | TTS, 사운드, 금액별 이펙트, 지속시간 | `new-event` (donation) |
| 3 | **SubtitleOverlay** | 후원 자막 | 텍스트 스타일, 위치, 모드 | `new-event` (donation) |
| 4 | **GoalOverlay** | 목표치 그래프 | 바/원형, 타겟, 색상, 자동증가 | `new-event` (auto-increment) |
| 5 | **TickerOverlay** | 전광판 | 속도, 스타일, 메시지 | `settings-updated` |
| 6 | **RouletteOverlay** | 룰렛 | 세그먼트, 트리거, 스핀 | `roulette-spin` |
| 7 | **EmojiOverlay** | 이모지 반응 | 이모지 세트, 애니메이션 | `emoji-reaction`, `emoji-burst` |
| 8 | **VotingOverlay** | 투표 | 옵션, 시간제한 | `poll-start`, `poll-vote`, `poll-end` |
| 9 | **CreditsOverlay** | 엔딩 크레딧 | 섹션, 속도, 음악 | `credits-start`, `credits-stop` |
| 10 | **AdOverlay** | 광고 표시 | 슬롯 위치/크기, 캠페인 | `ad-slots-updated`, `ads-refresh` |

### 9.2 채팅창 상세 설정

#### 테마 목록 (26+)
기본, 탄막, 고양이, 설날, 롤, 스타, 배그, 하트, 겨울, 레트로, 무지개, 크레용, 골드, 점선, 윈도우, 카카오톡, 라운드, 풍선, 칠판, 네온, 박스, 가죽, 포스트잇, 음식, 오버워치 등

#### 설정 옵션

```javascript
const defaultSettings = {
  // 테마
  theme: 'default',

  // 레이아웃
  alignment: 'left',           // 'left' | 'center' | 'right'
  lineMode: 'wrap',            // 'wrap' | 'single'
  direction: 'left',
  sortType: 'one-line',

  // 효과
  animation: 'fadeIn',         // 'fadeIn' | 'slideIn' | 'bounceIn' | 'zoomIn'
  animationSpeed: 0.2,
  transparency: 100,           // 0-100%

  // 텍스트
  fontSize: 28,
  fontFamily: 'Pretendard',
  fontBold: false,
  fontOutlineColor: '#000000dd',
  fontOutlineSize: 2,
  bgColor: '#00000000',

  // 역할별 색상 (8개 역할)
  colors: {
    streamer: { nick: '#ff6b6b', message: '#ffffff' },
    manager: { nick: '#ffd93d', message: '#ffffff' },
    vvip: { nick: '#c792ea', message: '#ffffff' },
    vip: { nick: '#89ddff', message: '#ffffff' },
    fan: { nick: '#82aaff', message: '#ffffff' },
    subscriber: { nick: '#addb67', message: '#ffffff' },
    supporter: { nick: '#ffcb6b', message: '#ffffff' },
    regular: { nick: '#ffffff', message: '#ffffff' }
  },

  // 고급
  userFilter: '',
  donationFilter: true,
  wordFilter: ''
};
```

### 9.3 후원 알림 상세 설정

```javascript
const defaultSettings = {
  theme: 'default',
  duration: 30,                 // 초
  volume: 50,                   // 0-100
  animation: 'bounceIn',
  exitAnimation: 'fadeOut',
  transparency: 100,

  // 금액별 시그니처 알림
  signatures: [
    {
      id: 1,
      minAmount: 1,
      maxAmount: 30000,
      alertSound: 'url',
      alertImage: 'url',
      animation: 'bounceIn',
      textFormat: '{닉네임}님 {종류} 감사합니다!'
    }
  ]
};
```

### 9.4 인증 시스템

#### 지원 방식
- 이메일/비밀번호 (bcrypt 해시)
- OAuth 2.0: SOOP, Naver, Google, Twitch

#### JWT 토큰
- 만료: 7일 (`JWT_EXPIRES_IN = "7d"`)
- 페이로드: `{ id, email, displayName, role, overlayHash }`
- 저장: localStorage

#### 인증 흐름

```
1. 회원가입/로그인
   ↓
2. 서버: JWT + overlay_hash 생성
   ↓
3. 프론트엔드: JWT를 localStorage에 저장
   ↓
4. API 호출 시: Authorization: Bearer ${token}
   ↓
5. 오버레이 URL: /overlay/:hash/settings/:key (인증 불필요)
```

### 9.5 광고 관리 시스템

#### 스트리머 측
- 광고 슬롯 생성/관리 (banner, popup, corner)
- 위치, 크기 설정
- 수익 통계 조회
- 월별 정산 내역

#### 광고주 측
- 캠페인 생성 (이미지/비디오/HTML)
- CPM (1000회 노출당 비용) / CPC (클릭당 비용) 설정
- 예산 관리 (일별/총 예산)
- 타겟 스트리머 지정
- 성과 통계

### 9.6 마켓플레이스

- 디자인 카테고리: chat, alert, goal, ticker, subtitle, package
- 크리에이터 등록/관리
- 다운로드 수, 평점 시스템
- 리뷰 기능

### 9.7 챗봇 시스템

#### 기능
- 커스텀 명령어 (`!명령어` → 응답)
- 자동 메시지 (interval, follow, donation, entry 트리거)
- 쿨다운 설정

---

## 10. 데이터베이스 스키마

### 10.1 테이블 목록 (13개)

```
┌─────────────────────────────────────────────────────────────┐
│                    데이터베이스 스키마                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [사용자 관리]                                               │
│  ├── users              - 사용자 계정                        │
│  └── user_settings      - 사용자별 설정 (JSON)               │
│                                                             │
│  [이벤트 & 스트리밍]                                         │
│  ├── events             - 채팅/후원 이벤트 기록               │
│  └── settings           - 글로벌 설정 (레거시)               │
│                                                             │
│  [오버레이 기능]                                              │
│  ├── roulette_wheels    - 룰렛 설정                         │
│  ├── signature_sounds   - 시그니처 알림음                    │
│  ├── emoji_settings     - 이모지 반응                       │
│  ├── voting_polls       - 투표                              │
│  ├── poll_votes         - 투표 기록                         │
│  └── ending_credits     - 엔딩 크레딧                       │
│                                                             │
│  [챗봇]                                                      │
│  ├── chat_bots          - 봇 설정                           │
│  ├── bot_commands       - 명령어                            │
│  └── bot_auto_messages  - 자동 메시지                       │
│                                                             │
│  [광고 시스템]                                               │
│  ├── ad_slots           - 스트리머 광고 슬롯                 │
│  ├── ad_campaigns       - 광고주 캠페인                      │
│  ├── ad_impressions     - 노출/클릭 추적                    │
│  └── ad_settlements     - 정산                              │
│                                                             │
│  [마켓플레이스]                                              │
│  ├── creators           - 크리에이터 프로필                  │
│  ├── designs            - 디자인 템플릿                      │
│  └── design_reviews     - 리뷰                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 테이블 상세

#### users

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',           -- 'user' | 'creator' | 'advertiser' | 'admin'
  oauth_provider TEXT,
  oauth_id TEXT,
  overlay_hash TEXT UNIQUE,            -- 16자 hex (공개 URL용)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### user_settings

```sql
CREATE TABLE user_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  setting_key TEXT NOT NULL,           -- 'chat' | 'alert' | 'goal' | ...
  setting_value TEXT,                  -- JSON
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, setting_key)
);
CREATE INDEX idx_user_settings ON user_settings(user_id, setting_key);
```

#### events

```sql
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,                  -- 'chat' | 'donation' | 'follow' | ...
  sender TEXT,
  amount INTEGER,
  message TEXT,
  platform TEXT,                       -- 'soop' | 'chzzk' | 'youtube' | 'twitch'
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### ad_campaigns

```sql
CREATE TABLE ad_campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  advertiser_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  content_type TEXT DEFAULT 'image',   -- 'image' | 'video' | 'html'
  content_url TEXT,
  click_url TEXT,
  budget_daily REAL,
  budget_total REAL,
  budget_spent REAL DEFAULT 0,
  cpm REAL,                            -- Cost Per Mille
  cpc REAL,                            -- Cost Per Click
  start_date DATE,
  end_date DATE,
  target_streamers TEXT,               -- JSON
  target_categories TEXT,              -- JSON
  status TEXT DEFAULT 'pending',       -- 'pending' | 'active' | 'paused' | 'completed' | 'rejected'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (advertiser_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## 11. API 명세

### 11.1 인증 API

| Method | Endpoint | Auth | 설명 |
|--------|----------|------|------|
| POST | `/api/auth/register` | ✗ | 이메일/비밀번호 회원가입 |
| POST | `/api/auth/login` | ✗ | 로그인, JWT 토큰 반환 |
| GET | `/api/auth/me` | ✓ | 현재 사용자 정보 조회 |
| PUT | `/api/auth/profile` | ✓ | 프로필 업데이트 |
| GET | `/api/auth/:provider` | ✗ | OAuth 시작 (soop/naver/google/twitch) |
| GET | `/api/auth/:provider/callback` | ✗ | OAuth 콜백 |

### 11.2 설정 API

#### 글로벌 설정 (레거시)

| Method | Endpoint | Auth | 설명 |
|--------|----------|------|------|
| GET | `/api/settings/:key` | ✗ | 글로벌 설정 조회 |
| POST | `/api/settings` | ✗ | 글로벌 설정 저장, Socket.io 브로드캐스트 |

#### 사용자별 설정

| Method | Endpoint | Auth | 설명 |
|--------|----------|------|------|
| POST | `/api/user-settings` | ✓ | 사용자 설정 저장 |
| GET | `/api/user-settings/:key` | ✓ | 사용자 설정 조회 |

#### 오버레이 URL (공개)

| Method | Endpoint | Auth | 설명 |
|--------|----------|------|------|
| GET | `/api/overlay/urls` | ✓ | 모든 오버레이 URL 조회 |
| POST | `/api/overlay/regenerate-hash` | ✓ | 오버레이 해시 재생성 |
| GET | `/api/overlay/:hash/settings/:key` | ✗ | 해시 기반 설정 조회 (OBS용) |

### 11.3 광고 API

#### 스트리머 - 광고 슬롯

| Method | Endpoint | Auth | 설명 |
|--------|----------|------|------|
| GET | `/api/ads/slots` | ✓ | 광고 슬롯 목록 (통계 포함) |
| POST | `/api/ads/slots` | ✓ | 슬롯 생성 |
| PUT | `/api/ads/slots/:id` | ✓ | 슬롯 수정 |
| DELETE | `/api/ads/slots/:id` | ✓ | 슬롯 삭제 |
| PUT | `/api/ads/slots` | ✓ | 일괄 업데이트 |

#### 스트리머 - 수익

| Method | Endpoint | Auth | 설명 |
|--------|----------|------|------|
| GET | `/api/ads/revenue` | ✓ | 월별 수익 통계 |
| GET | `/api/ads/settlements` | ✓ | 정산 내역 (12개월) |

#### 광고주 - 캠페인

| Method | Endpoint | Auth | 설명 |
|--------|----------|------|------|
| GET | `/api/ads/campaigns` | ✓ | 캠페인 목록 |
| POST | `/api/ads/campaigns` | ✓ | 캠페인 생성 |
| PUT | `/api/ads/campaigns/:id` | ✓ | 캠페인 수정 |
| PUT | `/api/ads/campaigns/:id/status` | ✓ | 상태 변경 |
| DELETE | `/api/ads/campaigns/:id` | ✓ | 캠페인 삭제 |
| GET | `/api/ads/campaigns/:id/stats` | ✓ | 성과 통계 |

#### 공개 - 광고 전달

| Method | Endpoint | Auth | 설명 |
|--------|----------|------|------|
| GET | `/api/overlay/:hash/ads/slots` | ✗ | 활성 슬롯 조회 |
| GET | `/api/overlay/:hash/ads/active` | ✗ | 활성 캠페인 조회 |
| POST | `/api/ads/impression` | ✗ | 노출 기록 |
| POST | `/api/ads/click` | ✗ | 클릭 기록 |

### 11.4 유틸리티 API

| Method | Endpoint | Auth | 설명 |
|--------|----------|------|------|
| POST | `/api/simulate-event` | ✗ | 테스트 이벤트 발생 |
| GET | `/api/events` | ✗ | 최근 50개 이벤트 조회 |
| GET | `/api/users/streamers` | ✓ | 스트리머 목록 (타겟팅용) |

---

## 12. Socket.io 이벤트

### 12.1 룸 관리

| 이벤트 | 방향 | 데이터 | 설명 |
|--------|------|--------|------|
| `join-overlay` | Client → Server | `hash` | 오버레이 룸 참가 |
| `leave-overlay` | Client → Server | `hash` | 오버레이 룸 퇴장 |
| `join-ad-overlay` | Client → Server | `hash` | 광고 오버레이 룸 참가 |
| `leave-ad-overlay` | Client → Server | `hash` | 광고 오버레이 룸 퇴장 |

### 12.2 설정 & 업데이트

| 이벤트 | 방향 | 데이터 | 설명 |
|--------|------|--------|------|
| `settings-update` | Client → Server | `{ key, value, hash }` | 설정 변경 요청 |
| `settings-updated` | Server → Client | `{ key }` | 설정 변경 알림 |
| `new-event` | Server → Client | `{ type, sender, amount, message, platform, timestamp, id }` | 새 이벤트 알림 |

### 12.3 기능별 이벤트

| 이벤트 | 방향 | 설명 |
|--------|------|------|
| `roulette-spin` | 양방향 | 룰렛 스핀 `{ resultIndex, segments, userHash }` |
| `emoji-reaction` | 양방향 | 단일 이모지 `{ emoji, position, userHash }` |
| `emoji-burst` | 양방향 | 다중 이모지 `{ emojis, userHash }` |
| `poll-start` | Client → Server | 투표 시작 `{ poll, userHash }` |
| `poll-started` | Server → Client | 투표 시작됨 `{ poll }` |
| `poll-vote` | 양방향 | 투표 `{ pollId, optionId, newCount, userHash }` |
| `poll-update` | Server → Client | 투표 업데이트 |
| `poll-end` | 양방향 | 투표 종료 `{ pollId, results, userHash }` |
| `poll-ended` | Server → Client | 투표 종료됨 |
| `credits-start` | 양방향 | 크레딧 시작 `{ credits, userHash }` |
| `credits-stop` | 양방향 | 크레딧 정지 `{ userHash }` |
| `bot-toggle` | 양방향 | 봇 토글 `{ isActive, userHash }` |
| `bot-message` | 양방향 | 봇 메시지 `{ botName, message, userHash }` |
| `ad-slots-updated` | Server → Client | 광고 슬롯 변경 |
| `ads-refresh` | Server → Client | 광고 새로고침 |

---

## 13. 개발 가이드

### 13.1 환경 설정

#### 실행 명령어

```bash
# 전체 실행 (client + server)
npm run dev

# 클라이언트만 (Vite dev server, 포트 5173)
npm run client

# 서버만 (Express, 포트 3001)
npm run server
```

#### 환경 변수

**서버 (`server/.env`)**
```bash
# 서버 설정
PORT=3001
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:3001

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# OAuth Providers
SOOP_CLIENT_ID=
SOOP_CLIENT_SECRET=
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=
```

**클라이언트 (`client/.env`)**
```bash
VITE_API_URL=http://localhost:3001
```

### 13.2 코딩 컨벤션

#### React 컴포넌트 패턴 - Settings

```jsx
const defaultSettings = {
  // 기본 설정값
};

const ComponentSettings = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const { user, token } = useAuth();

  // 사용자별 설정 조회
  const fetchSettings = async () => {
    const res = await fetch(`${API_URL}/api/user-settings/key`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.value) setSettings(JSON.parse(data.value));
    setLoading(false);
  };

  // 설정 저장
  const saveSettings = async () => {
    await fetch(`${API_URL}/api/user-settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ key: 'settingKey', value: settings })
    });
  };

  useEffect(() => { fetchSettings(); }, []);

  // 폼 렌더링 + 미리보기
};
```

#### React 컴포넌트 패턴 - Overlay

```jsx
const socket = io(API_URL);

const OverlayComponent = () => {
  const { userHash } = useParams();
  const [settings, setSettings] = useState(defaultSettings);

  // 해시 기반 설정 조회
  const fetchSettings = async () => {
    const url = userHash
      ? `${API_URL}/api/overlay/${userHash}/settings/overlayKey`
      : `${API_URL}/api/settings/overlayKey`;
    const data = await fetch(url).then(r => r.json());
    if (data.value) setSettings(JSON.parse(data.value));
  };

  useEffect(() => {
    fetchSettings();

    // Socket.io 룸 참가
    if (userHash) socket.emit("join-overlay", userHash);

    // 이벤트 리스너
    socket.on('new-event', (event) => {
      if (event.type === 'expected') {
        // 이벤트 처리
      }
    });

    socket.on('settings-updated', (data) => {
      if (data.key === 'overlayKey') fetchSettings();
    });

    // 클린업
    return () => {
      if (userHash) socket.emit("leave-overlay", userHash);
    };
  }, [userHash]);
};
```

#### CSS 스타일링

- CSS Custom Properties 사용 (`index.css`에 정의)
- `glass-premium` 클래스: 프리미엄 글래스 효과
- BEM 스타일 네이밍: `.component-name`, `.component-name__element`
- 반응형 브레이크포인트: 1200px, 1024px, 768px

### 13.3 중요 규칙

1. **한국어 UI**: 모든 사용자 인터페이스는 한국어로 작성
2. **실시간 동기화**: 설정 변경 시 Socket.io로 오버레이에 즉시 반영
3. **로딩 상태**: `RefreshCw` 아이콘으로 로딩 표시
4. **URL 복사**: 각 오버레이는 복사 가능한 URL 제공
5. **미리보기**: 설정 변경 시 실시간 미리보기 제공

---

## 14. 로드맵

### 14.1 현재 구현 완료 ✅

#### 오버레이 시스템
- [x] ChatOverlay (26+ 테마)
- [x] AlertOverlay (TTS 지원)
- [x] SubtitleOverlay
- [x] GoalOverlay (바/원형)
- [x] TickerOverlay
- [x] RouletteOverlay
- [x] EmojiOverlay
- [x] VotingOverlay
- [x] CreditsOverlay
- [x] AdOverlay

#### 인증 시스템
- [x] 이메일/비밀번호 로그인
- [x] OAuth (SOOP, Naver, Google, Twitch)
- [x] JWT 토큰 관리
- [x] 오버레이 해시 생성

#### 실시간 동기화
- [x] Socket.io 기반 실시간 업데이트
- [x] 해시 기반 룸 시스템
- [x] 이벤트 브로드캐스팅

#### 광고 관리
- [x] 스트리머 광고 슬롯 관리
- [x] 광고주 캠페인 관리
- [x] CPM/CPC 과금 시스템
- [x] 노출/클릭 추적
- [x] 수익 정산

#### 기타
- [x] 마켓플레이스 기본 구조
- [x] 분석 대시보드
- [x] 챗봇 시스템

### 14.2 Phase 1 추가 개발 예정

- [ ] 넥슨 IP TTS 보이스 (메이플 세렌, 던파 세리아 등)
- [ ] 다이내믹 모션 이펙트
- [ ] 스트리머 성장 대시보드
- [ ] 위플랩 설정 마이그레이션 도구
- [ ] 게임별 성과 분석

### 14.3 Phase 2 개발 예정

- [ ] 게임-방송 실시간 연동
- [ ] 스트림 드롭스
- [ ] 인터랙티브 광고

### 14.4 신규 아이디어

- [ ] 유튜브 업로드용 자동 채팅 필터
- [ ] 브금 분리 영상 저장
- [ ] 인게임 닉네임 숨김
- [ ] 롤 미니맵 가리기 (방송/영상 분리)
- [ ] 성우 계약 전용 TTS

---

## 부록: 플랫폼 아이콘

| 플랫폼 | 파일 경로 |
|--------|----------|
| SOOP | `/assets/logos/soop.png` |
| Chzzk | `/assets/logos/chzzk.png` |
| YouTube | `/assets/logos/youtube.png` |

---

## 결론

**Streaming Agent**는 단순한 오버레이 툴 개발이 아닌, **스트리밍 데이터를 전략 자산으로 전환하는 데이터 파이프라인**입니다.

스트리머·유저·게임을 연결하는 핵심 인프라로 활용되어, **경쟁사가 따라올 수 없는 데이터 독점 우위**를 확보하고, 향후 5년간 스트리밍 마케팅과 유저 인사이트에서 압도적 우위를 점할 수 있을 것입니다.

---

*문서 최종 업데이트: 2026-01-09*
