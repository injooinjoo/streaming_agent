import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { API_URL } from "../config/api";
import socket from "../config/socket";
import "./Overlay.css";

// ===== 상수 정의 =====

// 샘플 메시지 데이터
const sampleMessages = [
  { id: 'sample-1', sender: '김스트리머', senderId: 'streamer123', message: '안녕하세요! 오늘도 방송 시작합니다~', platform: 'soop', role: 'streamer' },
  { id: 'sample-2', sender: '팬클럽장', senderId: 'fanclub01', message: '오늘 방송도 화이팅입니다!', platform: 'chzzk', role: 'fan' },
  { id: 'sample-3', sender: '일반시청자', senderId: 'viewer99', message: 'ㅋㅋㅋㅋ 재밌다', platform: 'youtube', role: 'regular' },
  { id: 'sample-4', sender: 'VIP유저', senderId: 'vip_member', message: '후원 감사합니다~', platform: 'soop', role: 'vip' },
  { id: 'sample-5', sender: '매니저', senderId: 'manager01', message: '공지: 오늘 이벤트 진행중!', platform: 'chzzk', role: 'manager' },
  { id: 'sample-6', sender: '구독자A', senderId: 'sub_a', message: '구독 1년 달성했어요!', platform: 'youtube', role: 'subscriber' },
  { id: 'sample-7', sender: '서포터', senderId: 'supporter_x', message: '항상 응원합니다', platform: 'soop', role: 'supporter' },
  { id: 'sample-8', sender: 'VVIP멤버', senderId: 'vvip01', message: '방송 퀄리티 최고네요', platform: 'chzzk', role: 'vvip' },
  // 이모지 포함 샘플
  { id: 'sample-9', sender: '이모지러버', senderId: 'emoji01', message: '🎉🎉🎉', platform: 'soop', role: 'regular' },
  { id: 'sample-10', sender: '행복이', senderId: 'happy02', message: '😀😀😀😀', platform: 'chzzk', role: 'fan' },
  { id: 'sample-11', sender: '하트팬', senderId: 'heart03', message: '❤️❤️❤️', platform: 'youtube', role: 'subscriber' },
  { id: 'sample-12', sender: '웃음충', senderId: 'laugh04', message: '🤣👍🔥', platform: 'soop', role: 'regular' },
  { id: 'sample-13', sender: '응원단', senderId: 'cheer05', message: '💪🏆✨', platform: 'chzzk', role: 'supporter' },
];

// 테마 목록
const themeOptions = [
  'default', 'tanmak', 'cat', 'newyear', 'lol', 'star', 'pubg', 'heart', 'winter',
  'retro-pink', 'retro-blue', 'rainbow', 'crayon', 'gold', 'dotted', 'windows', 'kakao',
  'round', 'balloon', 'chalk', 'neon', 'neon-bg', 'box-white', 'box-black', 'leather', 'postit', 'food', 'overwatch'
];

// 알려진 봇 목록
const KNOWN_BOTS = [
  'nightbot', 'streamelements', 'moobot', 'streamlabs', 'wizebot',
  'phantombot', 'deepbot', 'ankhbot', 'botisimo', 'coebot',
  '나이트봇', '스트림엘리먼트', '봇', 'bot'
];

// 욕설 필터 목록 (레벨별)
const PROFANITY_LISTS = {
  low: ['시발', '씨발', '병신', '지랄', '개새끼', 'ㅅㅂ', 'ㅂㅅ', '느금마'],
  medium: ['시발', '씨발', '병신', '지랄', '개새끼', 'ㅅㅂ', 'ㅂㅅ', '느금마',
           '씹', '좆', '보지', '자지', '꺼져', '닥쳐', '미친', '썅'],
  high: ['시발', '씨발', '병신', '지랄', '개새끼', 'ㅅㅂ', 'ㅂㅅ', '느금마',
         '씹', '좆', '보지', '자지', '꺼져', '닥쳐', '미친', '썅',
         'ㅈ같', 'ㄱㅅㄲ', 'ㅁㅊ', 'ㄷㅊ', 'ㄲㅈ', '시1발', '씨1발', 'tlqkf',
         '병1신', '개1새끼', 'qkstod', '개쉐끼', '빠가', '븅신']
};

// ===== 유틸리티 함수들 =====

// 닉네임 기반 랜덤 색상 생성
const generateColorFromString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 60%)`;
};

// 시간 포맷팅
const formatTime = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// 현재 시간 포맷팅
const formatCurrentTime = () => {
  const now = new Date();
  return now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

// TTS 재생
const speakText = (text, rate = 1) => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = rate;
    window.speechSynthesis.speak(utterance);
  }
};

// 알림음 재생
const playAlertSound = () => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = 800;
  oscillator.type = 'sine';
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.3);
};

// SOOP 이모티콘 파싱 - {:emoteName:} 패턴을 이미지로 변환
const parseEmoticons = (message) => {
  if (!message || typeof message !== 'string') return message;

  // {:emoteName:} 패턴 매칭
  const emoticonRegex = /\{:([a-zA-Z0-9_]+):\}/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = emoticonRegex.exec(message)) !== null) {
    // 이모티콘 앞의 텍스트 추가
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: message.slice(lastIndex, match.index)
      });
    }

    // 이모티콘 추가
    const emoteName = match[1];
    parts.push({
      type: 'emoticon',
      name: emoteName,
      // SOOP 이모티콘 CDN URL (기본 이모티콘)
      url: `https://stimg.sooplive.co.kr/emoticon/default/${emoteName}.png`
    });

    lastIndex = match.index + match[0].length;
  }

  // 마지막 텍스트 추가
  if (lastIndex < message.length) {
    parts.push({
      type: 'text',
      content: message.slice(lastIndex)
    });
  }

  // 이모티콘이 없으면 원본 반환
  if (parts.length === 0) return message;

  return parts;
};

// 유니코드 이모지 정규식 (완전한 이모지 매칭)
const UNICODE_EMOJI_REGEX = /(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})(?:\u{FE0F})?(?:\u{200D}(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})(?:\u{FE0F})?)*/gu;

// 메시지에 이모지가 있는지 체크 (SOOP 이모티콘 + 유니코드 이모지)
const hasEmoji = (message) => {
  if (!message || typeof message !== 'string') return false;

  // SOOP 이모티콘 체크
  if (/\{:[a-zA-Z0-9_]+:\}/.test(message)) return true;

  // 유니코드 이모지 체크
  const emojiMatch = message.match(UNICODE_EMOJI_REGEX);
  if (emojiMatch && emojiMatch.length > 0) return true;

  return false;
};

// 메시지에서 이모지만 추출 (SOOP 이모티콘 + 유니코드 이모지)
const extractEmojisOnly = (message) => {
  if (!message || typeof message !== 'string') return null;

  const parts = [];

  // 1. SOOP 이모티콘 추출 {:emoteName:}
  const emoticonRegex = /\{:([a-zA-Z0-9_]+):\}/g;
  let match;
  while ((match = emoticonRegex.exec(message)) !== null) {
    parts.push({
      type: 'emoticon',
      name: match[1],
      url: `https://stimg.sooplive.co.kr/emoticon/default/${match[1]}.png`,
      index: match.index
    });
  }

  // 2. 유니코드 이모지 추출
  const unicodeMatches = message.matchAll(UNICODE_EMOJI_REGEX);
  for (const m of unicodeMatches) {
    parts.push({
      type: 'unicode-emoji',
      content: m[0],
      index: m.index
    });
  }

  // 이모지가 하나도 없으면 null 반환
  if (parts.length === 0) return null;

  // 원본 순서대로 정렬
  parts.sort((a, b) => a.index - b.index);

  return parts;
};

// 메시지 렌더링 컴포넌트 (이모티콘 포함)
const MessageContent = ({ message }) => {
  const parsed = parseEmoticons(message);

  // 문자열이면 그대로 반환
  if (typeof parsed === 'string') {
    return <>{parsed}</>;
  }

  // 파싱된 배열이면 각 파트 렌더링
  return (
    <>
      {parsed.map((part, index) => {
        if (part.type === 'text') {
          return <span key={index}>{part.content}</span>;
        }
        if (part.type === 'emoticon') {
          return (
            <img
              key={index}
              src={part.url}
              alt={part.name}
              className="chat-emoticon"
              onError={(e) => {
                // 이미지 로드 실패 시 원본 텍스트로 대체
                e.target.style.display = 'none';
                e.target.insertAdjacentText('afterend', `{:${part.name}:}`);
              }}
            />
          );
        }
        return null;
      })}
    </>
  );
};

// 이모지 전용 모드용 렌더링 컴포넌트
const EmojiOnlyContent = ({ message }) => {
  const emojis = extractEmojisOnly(message);

  if (!emojis || emojis.length === 0) return null;

  return (
    <>
      {emojis.map((item, index) => {
        if (item.type === 'emoticon') {
          return (
            <img
              key={index}
              src={item.url}
              alt={item.name}
              className="chat-emoticon"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          );
        }
        if (item.type === 'unicode-emoji') {
          return <span key={index} className="unicode-emoji">{item.content}</span>;
        }
        return null;
      })}
    </>
  );
};

// ===== 메인 컴포넌트 =====

const ChatOverlay = ({
  previewMode = false,
  previewSettings = null,
  previewMessages = null
}) => {
  const { userHash } = useParams();
  const [searchParams] = useSearchParams();
  const isObsMode = searchParams.get('obs') === '1' || searchParams.get('layer') === '1';
  const [messages, setMessages] = useState([]);
  const [settings, setSettings] = useState({
    theme: 'default',
    direction: 'left',
    sortType: 'one-line',
    animation: 'fadeIn',
    animationSpeed: 0.2,
    fontSize: 28,
    transparency: 100,
    showIcons: true,
    nicknameDivider: ' : ',
    fontFamily: 'Pretendard',
    fontBold: false,
    fontOutlineColor: '#000000dd',
    fontOutlineSize: 2,
    useBgColor: false,
    bgColor: '#00000000',
    bgImage: '',
    bgImageMode: 'cover',
    showSampleChat: true,
    sampleDelay: 30,
    showHoverPanel: true,
    filterEnabled: true,
    notificationEnabled: true,
    useScroll: false,
    showNickname: true,
    showUserId: false,
    randomNicknameColor: true,
    setNicknameColor: true,
    topFadeout: true,
    autoHide: false,
    useCustomCss: false,
    customCss: '',
    useWebFont: false,
    // 필터링
    userFilter: '',
    botFilter: true,
    wordFilter: '',
    donationMessageFilter: true,
    profanityFilter: false,
    profanityFilterLevel: 'medium',
    profanityFilterAction: 'hide',
    // 이모지 전용 모드
    emojiOnlyMode: false,
    // 알림
    donationNotify: 'image',
    entryNotify: 'none',
    chatNotify: 'none',
    // 위젯
    viewerCount: { enabled: false, position: 'bottom', url: '' },
    notice: { enabled: false, position: 'top', theme: 'default', url: '', content: '' },
    timer: { enabled: false, position: 'bottom', theme: 'default', url: '', base: 'none' },
    // 채팅 고정
    pinId: '',
    pinVoice: false,
    pinAutoHide: false,
    colors: {
      streamer: { nick: '#ffffff', message: '#ffffff' },
      manager: { nick: '#ffffff', message: '#ffffff' },
      vvip: { nick: '#ffffff', message: '#ffffff' },
      vip: { nick: '#ffffff', message: '#ffffff' },
      fan: { nick: '#ffffff', message: '#ffffff' },
      subscriber: { nick: '#ffffff', message: '#ffffff' },
      supporter: { nick: '#ffffff', message: '#ffffff' },
      regular: { nick: '#ffffff', message: '#ffffff' }
    }
  });

  // 추가 상태
  const [isPaused, setIsPaused] = useState(false);
  const [showSample, setShowSample] = useState(false);
  const [sampleIndex, setSampleIndex] = useState(0);
  const [displayedSamples, setDisplayedSamples] = useState([]);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [noticeContent, setNoticeContent] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState('none'); // none, current, stream, countdown
  const [viewerCountValue, setViewerCountValue] = useState(0);
  const [streamStartTime, setStreamStartTime] = useState(null);

  // Refs
  const lastRealMessageRef = useRef(Date.now());
  const sampleIntervalRef = useRef(null);
  const checkIntervalRef = useRef(null);
  const autoHideTimeoutRef = useRef({});
  const timerIntervalRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // ===== 설정 로드 =====
  const fetchSettings = async () => {
    try {
      const url = userHash
        ? `${API_URL}/api/overlay/${userHash}/settings/chat`
        : `${API_URL}/api/settings/chat`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.value && data.value !== '{}') {
        const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        setSettings(prev => ({ ...prev, ...parsed }));

        // 위젯 초기 상태 설정
        if (parsed.notice?.content) {
          setNoticeContent(parsed.notice.content);
        }
        if (parsed.timer?.base === 'current') {
          setTimerMode('current');
          setTimerRunning(true);
        } else if (parsed.timer?.base === 'stream') {
          setTimerMode('stream');
          setStreamStartTime(Date.now());
          setTimerRunning(true);
        }
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  };

  // ===== 필터링 로직 =====
  const shouldFilterMessage = useCallback((msg) => {
    if (!settings.filterEnabled) return { filter: false };

    const sender = msg.sender?.toLowerCase() || '';
    const senderId = msg.senderId?.toLowerCase() || '';
    const message = msg.message || '';

    // 이모지 전용 모드 필터링 (최우선)
    if (settings.emojiOnlyMode) {
      if (!hasEmoji(message)) {
        return { filter: true, reason: 'no-emoji' };
      }
      // 이모지가 있으면 emojiOnly 플래그 설정
      return { filter: false, emojiOnly: true };
    }

    // 후원 메시지 필터링
    if (settings.donationMessageFilter && (msg.type === 'donation' || msg.isDonation)) {
      return { filter: true, reason: 'donation' };
    }

    // 봇 필터링
    if (settings.botFilter) {
      if (KNOWN_BOTS.some(bot => sender.includes(bot) || senderId.includes(bot))) {
        return { filter: true, reason: 'bot' };
      }
    }

    // 사용자 필터링
    if (settings.userFilter) {
      const filterList = settings.userFilter.split(',').map(f => f.trim().toLowerCase()).filter(Boolean);
      if (filterList.some(f => sender.includes(f) || senderId.includes(f))) {
        return { filter: true, reason: 'user' };
      }
    }

    // 단어 필터링
    if (settings.wordFilter) {
      const wordList = settings.wordFilter.split(/[,\n]/).map(w => w.trim().toLowerCase()).filter(Boolean);
      if (wordList.some(word => message.toLowerCase().includes(word))) {
        if (settings.profanityFilterAction === 'hide') {
          return { filter: true, reason: 'word' };
        } else {
          return { filter: false, mask: true, words: wordList };
        }
      }
    }

    // 욕설 필터링
    if (settings.profanityFilter) {
      const profanityList = PROFANITY_LISTS[settings.profanityFilterLevel] || PROFANITY_LISTS.medium;
      const hasProfanity = profanityList.some(word => message.toLowerCase().includes(word.toLowerCase()));
      if (hasProfanity) {
        if (settings.profanityFilterAction === 'hide') {
          return { filter: true, reason: 'profanity' };
        } else {
          return { filter: false, mask: true, words: profanityList };
        }
      }
    }

    return { filter: false };
  }, [settings.filterEnabled, settings.emojiOnlyMode, settings.donationMessageFilter, settings.botFilter, settings.userFilter, settings.wordFilter,
      settings.profanityFilter, settings.profanityFilterLevel, settings.profanityFilterAction]);

  // 메시지 마스킹
  const maskMessage = useCallback((message, words) => {
    let masked = message;
    words.forEach(word => {
      const regex = new RegExp(word, 'gi');
      masked = masked.replace(regex, '♡'.repeat(word.length));
    });
    return masked;
  }, []);

  // ===== 명령어 처리 =====
  const processCommand = useCallback((msg) => {
    const message = msg.message?.trim() || '';
    const role = msg.role || '';

    // 관리자 권한 체크 (스트리머, 매니저)
    const isAdmin = ['streamer', 'manager'].includes(role);
    if (!isAdmin) return false;

    // 공지 명령어
    if (message.startsWith('!공지 ') || message.startsWith('#공지 ')) {
      const content = message.slice(4).trim();
      setNoticeContent(content);
      setSettings(prev => ({
        ...prev,
        notice: { ...prev.notice, enabled: true, content }
      }));
      return true;
    }

    if (message === '!공지삭제' || message === '!공지끝' || message === '#공지삭제') {
      setNoticeContent('');
      setSettings(prev => ({
        ...prev,
        notice: { ...prev.notice, enabled: false, content: '' }
      }));
      return true;
    }

    if (message.startsWith('!공지/테마/')) {
      const theme = message.slice(7).trim();
      setSettings(prev => ({
        ...prev,
        notice: { ...prev.notice, theme }
      }));
      return true;
    }

    if (message === '!공지/시간' || message === '!공지 방송시간') {
      const content = formatCurrentTime();
      setNoticeContent(content);
      setSettings(prev => ({
        ...prev,
        notice: { ...prev.notice, enabled: true, content }
      }));
      return true;
    }

    // 타이머 명령어
    if (message === '!시간' || message === '#시간') {
      setTimerMode('current');
      setTimerRunning(true);
      setSettings(prev => ({
        ...prev,
        timer: { ...prev.timer, enabled: true, base: 'current' }
      }));
      return true;
    }

    if (message === '!시간삭제') {
      setTimerRunning(false);
      setTimerMode('none');
      setSettings(prev => ({
        ...prev,
        timer: { ...prev.timer, enabled: false }
      }));
      return true;
    }

    if (message === '!시간 방송시간' || message === '!시간 업타임') {
      setTimerMode('stream');
      setStreamStartTime(Date.now());
      setTimerRunning(true);
      setSettings(prev => ({
        ...prev,
        timer: { ...prev.timer, enabled: true, base: 'stream' }
      }));
      return true;
    }

    if (message === '!시간정지') {
      setTimerRunning(false);
      return true;
    }

    if (message === '!시간시작') {
      setTimerRunning(true);
      return true;
    }

    // !시간 10분, !시간 600
    const timerMatch = message.match(/^!시간\s+(\d+)(분|초)?$/);
    if (timerMatch) {
      let seconds = parseInt(timerMatch[1]);
      if (timerMatch[2] === '분') seconds *= 60;
      setTimerSeconds(seconds);
      setTimerMode('countdown');
      setTimerRunning(true);
      setSettings(prev => ({
        ...prev,
        timer: { ...prev.timer, enabled: true }
      }));
      return true;
    }

    // !시간/추가/+1분
    const addTimeMatch = message.match(/^!시간\/추가\/([+-]?\d+)(분|초)?$/);
    if (addTimeMatch) {
      let delta = parseInt(addTimeMatch[1]);
      if (addTimeMatch[2] === '분') delta *= 60;
      setTimerSeconds(prev => Math.max(0, prev + delta));
      return true;
    }

    if (message.startsWith('!시간/테마/')) {
      const theme = message.slice(7).trim();
      setSettings(prev => ({
        ...prev,
        timer: { ...prev.timer, theme }
      }));
      return true;
    }

    // 채팅 고정 명령어
    if (message.startsWith('!고정 ')) {
      const target = message.slice(4).trim();
      setSettings(prev => ({ ...prev, pinId: target }));
      return true;
    }

    if (message.startsWith('!음성고정 ')) {
      const target = message.slice(6).trim();
      setSettings(prev => ({ ...prev, pinId: target, pinVoice: true }));
      return true;
    }

    if (message === '!고정해제' || message === '!고정삭제') {
      setPinnedMessages([]);
      setSettings(prev => ({ ...prev, pinId: '' }));
      return true;
    }

    return false;
  }, []);

  // ===== 알림 처리 =====
  const handleNotification = useCallback((event) => {
    if (!settings.notificationEnabled) return;

    // 후원 알림
    if (event.type === 'donation' && settings.donationNotify !== 'none') {
      if (settings.donationNotify === 'text') {
        // 채팅에 후원 메시지 표시 (이미 처리됨)
      }
      // image는 별도 AlertOverlay에서 처리
    }

    // 입장 알림
    if (event.type === 'entry' && settings.entryNotify !== 'none') {
      if (settings.entryNotify === 'text') {
        const entryMsg = {
          id: `entry-${Date.now()}`,
          sender: '시스템',
          message: `${event.sender}님이 입장했습니다`,
          platform: event.platform,
          role: 'system',
          isEntry: true
        };
        setMessages(prev => [...prev.slice(-49), entryMsg]);
      }
      if (settings.entryNotify === 'alert') {
        playAlertSound();
      }
      if (settings.entryNotify === 'voice') {
        speakText(`${event.sender}님이 입장했습니다`);
      }
    }

    // 채팅 사운드
    if (event.type === 'chat' && settings.chatNotify !== 'none') {
      if (settings.chatNotify === 'alert') {
        playAlertSound();
      }
      if (settings.chatNotify === 'voice') {
        speakText(event.message);
      }
    }
  }, [settings.notificationEnabled, settings.donationNotify, settings.entryNotify, settings.chatNotify]);

  // ===== 채팅 고정 처리 =====
  const handlePinMessage = useCallback((msg) => {
    if (!settings.pinId) return;

    const pinTargets = settings.pinId.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    const sender = msg.sender?.toLowerCase() || '';
    const senderId = msg.senderId?.toLowerCase() || '';

    if (pinTargets.some(t => sender.includes(t) || senderId.includes(t))) {
      setPinnedMessages(prev => [...prev.slice(-4), { ...msg, pinnedAt: Date.now() }]);

      if (settings.pinVoice) {
        speakText(`${msg.sender}: ${msg.message}`);
      }

      if (settings.pinAutoHide) {
        setTimeout(() => {
          setPinnedMessages(prev => prev.filter(p => p.id !== msg.id));
        }, 10000); // 10초 후 자동 해제
      }
    }
  }, [settings.pinId, settings.pinVoice, settings.pinAutoHide]);

  // ===== OBS 브라우저 소스용 투명 배경 =====
  useEffect(() => {
    if (!previewMode) {
      document.body.classList.add('overlay-mode');
      return () => document.body.classList.remove('overlay-mode');
    }
  }, [previewMode]);

  // ===== 설정 가져오기 및 소켓 연결 =====
  useEffect(() => {
    if (previewMode) return;

    fetchSettings();

    if (userHash) {
      socket.emit("join-overlay", userHash);
    }

    socket.on("new-event", (event) => {
      // 명령어 처리
      if (processCommand(event)) return;

      if (event.type === "chat") {
        // 필터링 체크
        const filterResult = shouldFilterMessage(event);
        if (filterResult.filter) return;

        // 마스킹 처리
        let processedEvent = { ...event };
        if (filterResult.mask && filterResult.words) {
          processedEvent.message = maskMessage(event.message, filterResult.words);
        }

        // 일시정지 상태가 아닐 때만 메시지 추가
        if (!isPaused) {
          setMessages((prev) => [...prev.slice(-49), { ...processedEvent, timestamp: Date.now() }]);
        }

        // 실제 메시지 수신 시 타임스탬프 갱신 및 샘플 숨김
        lastRealMessageRef.current = Date.now();
        setShowSample(false);
        setDisplayedSamples([]);

        // 알림 처리
        handleNotification(event);

        // 채팅 고정 처리
        handlePinMessage(processedEvent);
      }

      // 입장 이벤트
      if (event.type === "entry") {
        handleNotification(event);
      }
    });

    socket.on("settings-updated", (data) => {
      if (data.key === 'chat') fetchSettings();
    });

    // 시청자수 업데이트
    socket.on("viewer-count", (count) => {
      setViewerCountValue(count);
    });

    return () => {
      if (userHash) {
        socket.emit("leave-overlay", userHash);
      }
      socket.off("new-event");
      socket.off("settings-updated");
      socket.off("viewer-count");
    };
  }, [userHash, isPaused, previewMode, processCommand, shouldFilterMessage, maskMessage, handleNotification, handlePinMessage]);

  // ===== 자동 숨김 처리 =====
  useEffect(() => {
    if (!settings.autoHide) return;

    // 새 메시지마다 5초 후 제거
    messages.forEach(msg => {
      if (!autoHideTimeoutRef.current[msg.id]) {
        autoHideTimeoutRef.current[msg.id] = setTimeout(() => {
          setMessages(prev => prev.filter(m => m.id !== msg.id));
          delete autoHideTimeoutRef.current[msg.id];
        }, 5000);
      }
    });

    return () => {
      Object.values(autoHideTimeoutRef.current).forEach(timeout => clearTimeout(timeout));
    };
  }, [messages, settings.autoHide]);

  // ===== 샘플 채팅 표시 로직 =====
  useEffect(() => {
    if (!settings.showSampleChat || previewMode) return;

    checkIntervalRef.current = setInterval(() => {
      const timeSinceLastMessage = Date.now() - lastRealMessageRef.current;
      const delayMs = (settings.sampleDelay || 30) * 1000;

      if (timeSinceLastMessage > delayMs && messages.length === 0) {
        setShowSample(true);
      }
    }, 1000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [settings.showSampleChat, settings.sampleDelay, messages.length, previewMode]);

  // ===== 샘플 메시지 순환 표시 =====
  useEffect(() => {
    if (!showSample) {
      if (sampleIntervalRef.current) {
        clearInterval(sampleIntervalRef.current);
      }
      return;
    }

    const addSampleMessage = () => {
      setSampleIndex((prev) => {
        const nextIndex = (prev + 1) % sampleMessages.length;
        const newSample = {
          ...sampleMessages[nextIndex],
          id: `sample-${Date.now()}`,
          timestamp: Date.now(),
          isSample: true
        };
        setDisplayedSamples((prevSamples) => [...prevSamples.slice(-4), newSample]);
        return nextIndex;
      });
    };

    addSampleMessage();
    sampleIntervalRef.current = setInterval(addSampleMessage, 3000);

    return () => {
      if (sampleIntervalRef.current) {
        clearInterval(sampleIntervalRef.current);
      }
    };
  }, [showSample]);

  // ===== 타이머 로직 =====
  useEffect(() => {
    if (!timerRunning) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      if (timerMode === 'countdown') {
        setTimerSeconds(prev => {
          if (prev <= 0) {
            setTimerRunning(false);
            playAlertSound();
            return 0;
          }
          return prev - 1;
        });
      } else if (timerMode === 'stream' && streamStartTime) {
        setTimerSeconds(Math.floor((Date.now() - streamStartTime) / 1000));
      }
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [timerRunning, timerMode, streamStartTime]);

  // ===== 웹폰트 로드 =====
  useEffect(() => {
    if (settings.useWebFont && settings.fontFamily) {
      const fontMap = {
        'Pretendard': 'Pretendard',
        'NanumGothic': 'Nanum+Gothic',
        'GmarketSans': 'Gmarket+Sans',
        'MapleStory': 'MapleStory'
      };
      const fontName = fontMap[settings.fontFamily] || settings.fontFamily;
      const link = document.createElement('link');
      link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@400;700&display=swap`;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
      return () => document.head.removeChild(link);
    }
  }, [settings.useWebFont, settings.fontFamily]);

  // ===== 호버 패널 핸들러 =====
  const handlePauseToggle = () => setIsPaused(!isPaused);

  const handleClearMessages = () => {
    setMessages([]);
    setDisplayedSamples([]);
    setPinnedMessages([]);
  };

  const handleThemeChange = async (e) => {
    const newTheme = e.target.value;
    const newSettings = { ...settings, theme: newTheme };
    setSettings(newSettings);

    try {
      await fetch(`${API_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'chat', value: newSettings })
      });
    } catch (err) {
      console.error('Failed to save theme:', err);
    }
  };

  const handleFontSizeChange = async (delta) => {
    const newSize = Math.max(12, Math.min(72, settings.fontSize + delta));
    const newSettings = { ...settings, fontSize: newSize };
    setSettings(newSettings);

    try {
      await fetch(`${API_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'chat', value: newSettings })
      });
    } catch (err) {
      console.error('Failed to save font size:', err);
    }
  };

  const handleFilterToggle = async () => {
    const newSettings = { ...settings, filterEnabled: !settings.filterEnabled };
    setSettings(newSettings);

    try {
      await fetch(`${API_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'chat', value: newSettings })
      });
    } catch (err) {
      console.error('Failed to save filter setting:', err);
    }
  };

  const handleNotificationToggle = async () => {
    const newSettings = { ...settings, notificationEnabled: !settings.notificationEnabled };
    setSettings(newSettings);

    try {
      await fetch(`${API_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'chat', value: newSettings })
      });
    } catch (err) {
      console.error('Failed to save notification setting:', err);
    }
  };

  // ===== 렌더링 헬퍼 =====
  const activeSettings = previewMode && previewSettings ? previewSettings : settings;
  const activeMessages = previewMode && previewMessages ? previewMessages : (messages.length > 0 ? messages : displayedSamples);

  const getAnimationStyle = () => {
    return {
      animationDuration: `${activeSettings.animationSpeed}s`
    };
  };

  const getAnimationClass = () => {
    switch (activeSettings.animation) {
      case 'slideIn': return 'animate-slide-in';
      case 'bounceIn': return 'animate-bounceIn';
      case 'zoomIn': return 'animate-zoomIn';
      case 'fadeIn': return 'animate-fade-in';
      default: return 'animate-fade-up';
    }
  };

  const getRoleColors = (role, sender) => {
    const roleKey = role || 'regular';
    const baseColors = activeSettings.colors[roleKey] || activeSettings.colors.regular;

    // 랜덤 닉네임 색상
    if (activeSettings.randomNicknameColor && !activeSettings.setNicknameColor) {
      return {
        nick: generateColorFromString(sender || 'user'),
        message: baseColors.message
      };
    }

    return baseColors;
  };

  const getSortTypeClass = () => {
    switch (activeSettings.sortType) {
      case 'multi-line': return 'sort-multi-line';
      case 'start-align': return 'sort-start-align';
      case 'indiv-align': return 'sort-indiv-align';
      default: return 'sort-one-line';
    }
  };

  // ===== 렌더링 =====
  return (
    <div
      className={`chat-overlay theme-${activeSettings.theme} ${activeSettings.direction} ${isPaused ? 'paused' : ''} ${previewMode ? 'preview-mode' : ''} ${activeSettings.topFadeout ? 'top-fadeout' : ''} ${activeSettings.useScroll ? 'use-scroll' : ''}`}
      style={{
        alignItems: activeSettings.direction === 'center' ? 'center' : activeSettings.direction === 'right' ? 'flex-end' : 'flex-start',
        opacity: activeSettings.transparency / 100,
        fontFamily: activeSettings.fontFamily,
        backgroundColor: activeSettings.useBgColor ? activeSettings.bgColor : 'transparent',
        backgroundImage: activeSettings.bgImage ? `url(${activeSettings.bgImage})` : 'none',
        backgroundSize: activeSettings.bgImageMode === 'repeat' ? 'auto' : activeSettings.bgImageMode,
        backgroundRepeat: activeSettings.bgImageMode === 'repeat' ? 'repeat' : 'no-repeat',
        backgroundPosition: 'center'
      }}
    >
      {/* 커스텀 CSS 삽입 */}
      {activeSettings.useCustomCss && activeSettings.customCss && (
        <style dangerouslySetInnerHTML={{ __html: activeSettings.customCss }} />
      )}

      {/* 공지 위젯 - 상단 */}
      {activeSettings.notice?.enabled && activeSettings.notice?.position === 'top' && (activeSettings.notice?.content || noticeContent) && (
        <div className={`notice-widget top theme-${activeSettings.notice.theme || 'default'}`}>
          <div className="notice-content">
            <span className="notice-icon">📢</span>
            <span className="notice-text">{activeSettings.notice?.content || noticeContent}</span>
          </div>
        </div>
      )}

      {/* 타이머 위젯 - 상단 */}
      {activeSettings.timer?.enabled && activeSettings.timer?.position === 'top' && (
        <div className={`timer-widget top theme-${activeSettings.timer.theme || 'default'}`}>
          <span className="timer-value">
            {timerMode === 'current' ? formatCurrentTime() : formatTime(timerSeconds)}
          </span>
        </div>
      )}

      {/* 시청자수 위젯 - 상단 */}
      {activeSettings.viewerCount?.enabled && activeSettings.viewerCount?.position === 'top' && (
        <div className="viewer-widget top">
          <span className="viewer-icon">👥</span>
          <span className="viewer-count">{viewerCountValue.toLocaleString()}</span>
        </div>
      )}

      {/* 호버 컨트롤 패널 - OBS 모드에서는 숨김 */}
      {!previewMode && !isObsMode && activeSettings.showHoverPanel && (
        <div className="overlay-hover-panel">
          <div className="hover-controls">
            <button
              className={`hover-btn ${isPaused ? 'active' : ''}`}
              onClick={handlePauseToggle}
              title={isPaused ? '재개' : '일시정지'}
            >
              {isPaused ? '▶️' : '⏸️'}
            </button>

            <button
              className="hover-btn"
              onClick={handleClearMessages}
              title="채팅 지우기"
            >
              🗑️
            </button>

            <div className="hover-divider" />

            <select
              className="hover-select"
              value={settings.theme}
              onChange={handleThemeChange}
              title="테마 선택"
            >
              {themeOptions.map(theme => (
                <option key={theme} value={theme}>{theme}</option>
              ))}
            </select>

            <div className="hover-divider" />

            <div className="font-size-controls">
              <button
                className="hover-btn small"
                onClick={() => handleFontSizeChange(-2)}
                title="폰트 작게"
              >
                A-
              </button>
              <span className="font-size-display">{settings.fontSize}px</span>
              <button
                className="hover-btn small"
                onClick={() => handleFontSizeChange(2)}
                title="폰트 크게"
              >
                A+
              </button>
            </div>

            <div className="hover-divider" />

            <button
              className={`hover-btn ${activeSettings.filterEnabled ? 'active' : ''}`}
              onClick={handleFilterToggle}
              title={activeSettings.filterEnabled ? '필터 끄기' : '필터 켜기'}
            >
              {activeSettings.filterEnabled ? '🔇' : '🔊'}
            </button>

            <button
              className={`hover-btn ${activeSettings.notificationEnabled ? 'active' : ''}`}
              onClick={handleNotificationToggle}
              title={activeSettings.notificationEnabled ? '알림 끄기' : '알림 켜기'}
            >
              {activeSettings.notificationEnabled ? '🔔' : '🔕'}
            </button>
          </div>
        </div>
      )}

      {/* 일시정지 인디케이터 */}
      {isPaused && (
        <div className="paused-indicator">
          ⏸️ 일시정지됨
        </div>
      )}

      {/* 고정된 채팅 */}
      {pinnedMessages.length > 0 && (
        <div className="pinned-messages">
          {pinnedMessages.map((msg) => {
            const roleColors = getRoleColors(msg.role, msg.sender);
            return (
              <div key={msg.id} className="pinned-message-item">
                <span className="pin-icon">📌</span>
                <span className="sender" style={{ color: roleColors.nick }}>
                  {msg.sender}
                </span>
                <span className="message-text" style={{ color: roleColors.message }}>
                  <MessageContent message={msg.message} />
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* 메시지 컨테이너 */}
      <div
        className={`messages-container ${getSortTypeClass()}`}
        ref={messagesContainerRef}
        style={{
          overflowY: activeSettings.useScroll ? 'auto' : 'hidden',
          alignItems: activeSettings.direction === 'center' ? 'center' : activeSettings.direction === 'right' ? 'flex-end' : 'flex-start'
        }}
      >
        {activeMessages.map((msg, index) => {
          // 이모지 전용 모드: 이모지가 없는 메시지는 완전히 숨김
          if (activeSettings.emojiOnlyMode && !hasEmoji(msg.message)) {
            return null;
          }

          const roleColors = getRoleColors(msg.role, msg.sender);
          const outlineStyle = activeSettings.fontOutlineSize > 0
            ? { textShadow: `0 0 ${activeSettings.fontOutlineSize}px ${activeSettings.fontOutlineColor}, 0 0 ${activeSettings.fontOutlineSize}px ${activeSettings.fontOutlineColor}` }
            : {};

          return (
            <div
              key={msg.id || index}
              className={`chat-message-item ${getAnimationClass()} ${msg.isSample ? 'sample' : ''} ${msg.isEntry ? 'entry' : ''}`}
              style={{
                fontSize: `${activeSettings.fontSize}px`,
                fontWeight: activeSettings.fontBold ? 'bold' : 'normal',
                color: roleColors.message,
                ...outlineStyle,
                ...getAnimationStyle()
              }}
            >
              {activeSettings.showIcons && msg.platform && (
                <img
                  src={`/assets/logos/${msg.platform}.png`}
                  alt={msg.platform}
                  className="chat-platform-logo"
                />
              )}
              {activeSettings.showNickname && (
                <span className="sender" style={{ color: roleColors.nick }}>
                  {msg.sender}
                  {activeSettings.showUserId && msg.senderId && (
                    <span className="sender-id">({msg.senderId})</span>
                  )}
                  {activeSettings.nicknameDivider}
                </span>
              )}
              <span className="message-text">
                {activeSettings.emojiOnlyMode ? (
                  <EmojiOnlyContent message={msg.message} />
                ) : (
                  <MessageContent message={msg.message} />
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* 공지 위젯 - 하단 */}
      {activeSettings.notice?.enabled && activeSettings.notice?.position === 'bottom' && (activeSettings.notice?.content || noticeContent) && (
        <div className={`notice-widget bottom theme-${activeSettings.notice.theme || 'default'}`}>
          <div className="notice-content">
            <span className="notice-icon">📢</span>
            <span className="notice-text">{activeSettings.notice?.content || noticeContent}</span>
          </div>
        </div>
      )}

      {/* 타이머 위젯 - 하단 */}
      {activeSettings.timer?.enabled && activeSettings.timer?.position === 'bottom' && (
        <div className={`timer-widget bottom theme-${activeSettings.timer.theme || 'default'}`}>
          <span className="timer-value">
            {timerMode === 'current' ? formatCurrentTime() : formatTime(timerSeconds)}
          </span>
        </div>
      )}

      {/* 시청자수 위젯 - 하단 */}
      {activeSettings.viewerCount?.enabled && activeSettings.viewerCount?.position === 'bottom' && (
        <div className="viewer-widget bottom">
          <span className="viewer-icon">👥</span>
          <span className="viewer-count">{viewerCountValue.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
};

export default ChatOverlay;
