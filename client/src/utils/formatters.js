/**
 * Number Formatting Utilities
 * 숫자 포맷팅 유틸리티 함수들
 */

/**
 * 숫자를 K, M 단위로 축약하여 표시
 * @param {number} num - 포맷팅할 숫자
 * @returns {string} - 포맷된 문자열 (예: 1500 -> "1.5K", 1500000 -> "1.5M")
 */
export const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
};

/**
 * 숫자를 천 단위 콤마로 포맷
 * @param {number} num - 포맷팅할 숫자
 * @returns {string} - 포맷된 문자열 (예: 1500 -> "1,500")
 */
export const formatFullNumber = (num) => {
  return num.toLocaleString();
};
