/**
 * Nexon Game Category IDs by Platform
 * Used for Nexon affinity calculation and influencer discovery filtering
 */

const NEXON_SOOP_CATEGORY_IDS = [
  '00040005', // 서든어택
  '00040070', // FC 온라인
  '00040032', // 메이플스토리
  '00040158', // 메이플스토리 월드
  '00360113', // 마비노기 모바일
  '00360055', // 카트라이더 러쉬플러스
  '00040004', // 던전앤파이터
  '00040065', // 바람의나라
];

const NEXON_CHZZK_CATEGORY_IDS = [
  'MapleStory',
  'Dungeon_Fighter_Online',
  'FC_Online',
  'Sudden_Attack',
  'KartRider',
  'Mabinogi',
  'The_First_Descendant',
  'V4',
];

/** All Nexon category IDs across all platforms */
const ALL_NEXON_CATEGORY_IDS = [
  ...NEXON_SOOP_CATEGORY_IDS,
  ...NEXON_CHZZK_CATEGORY_IDS,
];

module.exports = {
  NEXON_SOOP_CATEGORY_IDS,
  NEXON_CHZZK_CATEGORY_IDS,
  ALL_NEXON_CATEGORY_IDS,
};
