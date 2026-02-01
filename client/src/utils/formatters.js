/**
 * Number Formatting Utilities
 * 숫자 포맷팅 유틸리티 함수들
 */

/**
 * null/undefined/NaN 안전 처리
 */
const safeNumber = (value) => {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/**
 * 숫자를 한국식 축약 단위로 표시 (만, 억)
 * @param {number|string|null} num
 * @param {Object} [options]
 * @param {number} [options.precision=1] - 소수점 자릿수
 * @param {string} [options.suffix=''] - 단위 접미사 (예: '명', '개', '건')
 * @returns {string}
 *
 * formatCompactKo(150000000) -> "1.5억"
 * formatCompactKo(12345) -> "1.2만"
 * formatCompactKo(999) -> "999"
 * formatCompactKo(12345, { suffix: '명' }) -> "1.2만명"
 */
export const formatCompactKo = (num, { precision = 1, suffix = '' } = {}) => {
  const n = safeNumber(num);
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';

  if (abs >= 100000000) {
    return `${sign}${(abs / 100000000).toFixed(precision)}억${suffix}`;
  }
  if (abs >= 10000) {
    return `${sign}${(abs / 10000).toFixed(precision)}만${suffix}`;
  }
  if (abs >= 1000) {
    return `${sign}${abs.toLocaleString('ko-KR')}${suffix}`;
  }
  return `${sign}${abs}${suffix}`;
};

/**
 * 숫자를 천 단위 콤마로 포맷 (예: 1500 -> "1,500")
 */
export const formatFullNumber = (num) => {
  return safeNumber(num).toLocaleString('ko-KR');
};

/**
 * 금액을 원화(₩) 표시로 포맷 (예: 1500 -> "₩1,500")
 */
export const formatCurrency = (amount) => {
  return `₩${safeNumber(amount).toLocaleString('ko-KR')}`;
};

/**
 * 금액을 한국식 축약으로 표시 (만원, 억원)
 * @param {number|string|null} amount
 * @param {Object} [options]
 * @param {boolean} [options.showSymbol=true] - ₩ 기호 표시 여부
 * @returns {string}
 *
 * formatCurrencyCompact(1523000) -> "₩152.3만"
 * formatCurrencyCompact(250000000) -> "₩2.5억"
 * formatCurrencyCompact(5000) -> "₩5,000"
 * formatCurrencyCompact(1523000, { showSymbol: false }) -> "152.3만"
 */
export const formatCurrencyCompact = (amount, { showSymbol = true } = {}) => {
  const n = safeNumber(amount);
  const prefix = showSymbol ? '₩' : '';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';

  if (abs >= 100000000) {
    return `${sign}${prefix}${(abs / 100000000).toFixed(1)}억`;
  }
  if (abs >= 10000) {
    return `${sign}${prefix}${(abs / 10000).toFixed(1)}만`;
  }
  return `${sign}${prefix}${abs.toLocaleString('ko-KR')}`;
};

/**
 * 금액을 오버레이용 '원' 단위로 표시 (예: 15000 -> "15,000원")
 */
export const formatWon = (amount) => {
  return `${safeNumber(amount).toLocaleString('ko-KR')}원`;
};

/**
 * 퍼센트 포맷
 * @param {number|string|null} value - 퍼센트 값 (기본: 0-100 범위)
 * @param {number} [decimals=1] - 소수점 자릿수
 * @param {Object} [options]
 * @param {boolean} [options.isRatio=false] - true이면 0-1 범위를 100 곱셈
 * @returns {string}
 *
 * formatPercent(12.5) -> "12.5%"
 * formatPercent(0.125, 1, { isRatio: true }) -> "12.5%"
 */
export const formatPercent = (value, decimals = 1, { isRatio = false } = {}) => {
  let n = safeNumber(value);
  if (isRatio) n = n * 100;
  return `${n.toFixed(decimals)}%`;
};

/**
 * 증감률 포맷 (양수에 + 기호 표시)
 *
 * formatGrowth(12.5) -> "+12.5%"
 * formatGrowth(-3.2) -> "-3.2%"
 */
export const formatGrowth = (value, decimals = 1) => {
  const n = safeNumber(value);
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}%`;
};

/**
 * @deprecated Use formatCompactKo() instead.
 * 하위 호환을 위해 유지. 기존 K/M -> 만/억으로 변경됨.
 */
export const formatNumber = (num) => {
  return formatCompactKo(num);
};
