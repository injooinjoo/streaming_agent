/**
 * CategoryMapper - 크로스 플랫폼 카테고리 매핑 서비스
 *
 * 플랫폼별 카테고리를 통합 게임 카탈로그에 매핑합니다.
 * Fuzzy matching을 사용하여 자동 매핑을 지원합니다.
 *
 * Uses cross-database compatible helpers from connections.js
 */

const { category: categoryLogger } = require("./logger");
const { getOne, getAll, runQuery, runReturning, isPostgres } = require("../db/connections");

/**
 * Get placeholder for parameterized queries
 */
const p = (index) => isPostgres() ? `$${index}` : '?';

// 자동 매핑 신뢰도 임계값
const CONFIDENCE_THRESHOLD = 0.85;

// 알려진 매핑 (초기 시드 데이터)
const KNOWN_MAPPINGS = [
  { names: ["리그 오브 레전드", "League of Legends", "LoL", "롤"], nameKr: "리그 오브 레전드", name: "League of Legends", genre: "MOBA", developer: "Riot Games" },
  { names: ["발로란트", "VALORANT", "Valorant"], nameKr: "발로란트", name: "VALORANT", genre: "FPS", developer: "Riot Games" },
  { names: ["메이플스토리", "MapleStory", "메이플"], nameKr: "메이플스토리", name: "MapleStory", genre: "MMORPG", developer: "Nexon" },
  { names: ["던전앤파이터", "Dungeon & Fighter", "던파", "DNF"], nameKr: "던전앤파이터", name: "Dungeon & Fighter", genre: "Action RPG", developer: "Neople" },
  { names: ["FC 온라인", "FC Online", "피파온라인", "FIFA Online"], nameKr: "FC 온라인", name: "FC Online", genre: "Sports", developer: "Nexon" },
  { names: ["로스트아크", "LOST ARK", "Lost Ark", "로아"], nameKr: "로스트아크", name: "Lost Ark", genre: "MMORPG", developer: "Smilegate RPG" },
  { names: ["배틀그라운드", "PUBG: BATTLEGROUNDS", "PUBG", "배그"], nameKr: "배틀그라운드", name: "PUBG: BATTLEGROUNDS", genre: "Battle Royale", developer: "PUBG Corporation" },
  { names: ["오버워치 2", "Overwatch 2", "오버워치"], nameKr: "오버워치 2", name: "Overwatch 2", genre: "FPS", developer: "Blizzard Entertainment" },
  { names: ["마인크래프트", "Minecraft"], nameKr: "마인크래프트", name: "Minecraft", genre: "Sandbox", developer: "Mojang Studios" },
  { names: ["서든어택", "Sudden Attack"], nameKr: "서든어택", name: "Sudden Attack", genre: "FPS", developer: "Nexon" },
  { names: ["전략적 팀 전투", "Teamfight Tactics", "TFT", "롤토체스"], nameKr: "전략적 팀 전투", name: "Teamfight Tactics", genre: "Auto Battler", developer: "Riot Games" },
  { names: ["카트라이더: 드리프트", "KartRider: Drift", "카트라이더", "카트"], nameKr: "카트라이더: 드리프트", name: "KartRider: Drift", genre: "Racing", developer: "Nexon" },
  { names: ["스타크래프트", "StarCraft", "스타1", "스타크래프트: 리마스터"], nameKr: "스타크래프트", name: "StarCraft", genre: "RTS", developer: "Blizzard Entertainment" },
  { names: ["스타크래프트 2", "StarCraft II", "스타2"], nameKr: "스타크래프트 2", name: "StarCraft II", genre: "RTS", developer: "Blizzard Entertainment" },
  { names: ["디아블로 4", "Diablo IV", "디아블로4", "디아4"], nameKr: "디아블로 4", name: "Diablo IV", genre: "Action RPG", developer: "Blizzard Entertainment" },
  { names: ["월드 오브 워크래프트", "World of Warcraft", "WoW", "와우"], nameKr: "월드 오브 워크래프트", name: "World of Warcraft", genre: "MMORPG", developer: "Blizzard Entertainment" },
  { names: ["그랑블루 판타지 리링크", "Granblue Fantasy: Relink"], nameKr: "그랑블루 판타지 리링크", name: "Granblue Fantasy: Relink", genre: "Action RPG", developer: "Cygames" },
  { names: ["엘든 링", "Elden Ring", "엘링"], nameKr: "엘든 링", name: "Elden Ring", genre: "Action RPG", developer: "FromSoftware" },
  { names: ["몬스터 헌터", "Monster Hunter", "몬헌"], nameKr: "몬스터 헌터", name: "Monster Hunter", genre: "Action RPG", developer: "Capcom" },
  { names: ["검은사막", "Black Desert", "검사", "BDO"], nameKr: "검은사막", name: "Black Desert", genre: "MMORPG", developer: "Pearl Abyss" },
];

class CategoryMapper {
  constructor(db) {
    // db parameter kept for backward compatibility but not used
    this.db = db;
    this.knownMappings = KNOWN_MAPPINGS;
  }

  /**
   * 문자열 정규화 (비교용)
   * @param {string} str
   * @returns {string}
   */
  normalize(str) {
    if (!str) return "";
    return str
      .toLowerCase()
      .replace(/[:\-_\s]+/g, "")
      .replace(/[^a-z0-9가-힣]/g, "");
  }

  /**
   * Levenshtein 거리 계산
   * @param {string} a
   * @param {string} b
   * @returns {number}
   */
  levenshteinDistance(a, b) {
    if (!a || !b) return Math.max(a?.length || 0, b?.length || 0);

    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * 문자열 유사도 계산 (0-1)
   * @param {string} a
   * @param {string} b
   * @returns {number}
   */
  calculateSimilarity(a, b) {
    const normalizedA = this.normalize(a);
    const normalizedB = this.normalize(b);

    if (normalizedA === normalizedB) return 1.0;
    if (!normalizedA || !normalizedB) return 0;

    const distance = this.levenshteinDistance(normalizedA, normalizedB);
    const maxLength = Math.max(normalizedA.length, normalizedB.length);

    return 1 - distance / maxLength;
  }

  /**
   * 알려진 매핑에서 게임 찾기
   * @param {string} categoryName
   * @returns {Object|null}
   */
  findKnownMapping(categoryName) {
    const normalized = this.normalize(categoryName);

    for (const mapping of this.knownMappings) {
      for (const name of mapping.names) {
        if (this.normalize(name) === normalized) {
          return mapping;
        }
      }
    }

    return null;
  }

  /**
   * DB에서 기존 통합 게임 조회
   * @returns {Promise<Array>}
   */
  async getUnifiedGames() {
    return await getAll("SELECT * FROM unified_games ORDER BY name", []);
  }

  /**
   * 통합 게임 생성
   * @param {Object} game
   * @returns {Promise<number>}
   */
  async createUnifiedGame(game) {
    const isVerifiedValue = game.isVerified ? (isPostgres() ? 'TRUE' : 1) : (isPostgres() ? 'FALSE' : 0);

    if (isPostgres()) {
      // PostgreSQL: Use RETURNING
      const result = await runReturning(
        `INSERT INTO unified_games
          (name, name_kr, genre, genre_kr, developer, is_verified)
         VALUES (${p(1)}, ${p(2)}, ${p(3)}, ${p(4)}, ${p(5)}, ${isVerifiedValue})
         RETURNING id`,
        [
          game.name,
          game.nameKr || null,
          game.genre || null,
          game.genreKr || null,
          game.developer || null,
        ]
      );
      return result?.id;
    } else {
      // SQLite: Use lastID from runQuery result
      const result = await runQuery(
        `INSERT INTO unified_games
          (name, name_kr, genre, genre_kr, developer, is_verified)
         VALUES (${p(1)}, ${p(2)}, ${p(3)}, ${p(4)}, ${p(5)}, ${isVerifiedValue})`,
        [
          game.name,
          game.nameKr || null,
          game.genre || null,
          game.genreKr || null,
          game.developer || null,
        ]
      );
      return result?.lastID;
    }
  }

  /**
   * 카테고리를 통합 게임에 자동 매핑
   * @param {Object} category - { platform, platformCategoryId, platformCategoryName }
   * @returns {Promise<{unifiedGameId: number, confidence: number}|null>}
   */
  async autoMapCategory(category) {
    const categoryName = category.platformCategoryName;

    // 1. 알려진 매핑에서 먼저 찾기
    const knownMapping = this.findKnownMapping(categoryName);

    if (knownMapping) {
      // 통합 게임이 있는지 확인, 없으면 생성
      const existingGames = await this.getUnifiedGames();
      let unifiedGame = existingGames.find(
        (g) =>
          this.normalize(g.name) === this.normalize(knownMapping.name) ||
          this.normalize(g.name_kr) === this.normalize(knownMapping.nameKr)
      );

      if (!unifiedGame) {
        const newGameId = await this.createUnifiedGame({
          name: knownMapping.name,
          nameKr: knownMapping.nameKr,
          genre: knownMapping.genre,
          developer: knownMapping.developer,
          isVerified: true,
        });
        unifiedGame = { id: newGameId };
      }

      // 매핑 저장
      await this.saveMapping(
        unifiedGame.id,
        category.platform,
        category.platformCategoryId,
        1.0,
        false
      );

      return { unifiedGameId: unifiedGame.id, confidence: 1.0 };
    }

    // 2. 기존 통합 게임에서 유사도 검색
    const existingGames = await this.getUnifiedGames();
    let bestMatch = null;
    let bestScore = 0;

    for (const game of existingGames) {
      const scoreEn = this.calculateSimilarity(categoryName, game.name);
      const scoreKr = this.calculateSimilarity(categoryName, game.name_kr);
      const score = Math.max(scoreEn, scoreKr);

      if (score > bestScore && score >= CONFIDENCE_THRESHOLD) {
        bestScore = score;
        bestMatch = game;
      }
    }

    if (bestMatch) {
      await this.saveMapping(
        bestMatch.id,
        category.platform,
        category.platformCategoryId,
        bestScore,
        false
      );

      return { unifiedGameId: bestMatch.id, confidence: bestScore };
    }

    // 3. 새 통합 게임 생성 (매핑되지 않은 카테고리)
    const newGameId = await this.createUnifiedGame({
      name: categoryName,
      nameKr: categoryName,
      isVerified: false,
    });

    await this.saveMapping(
      newGameId,
      category.platform,
      category.platformCategoryId,
      1.0,
      false
    );

    return { unifiedGameId: newGameId, confidence: 1.0 };
  }

  /**
   * 매핑 저장
   * @param {number} unifiedGameId
   * @param {string} platform
   * @param {string} platformCategoryId
   * @param {number} confidence
   * @param {boolean} isManual
   */
  async saveMapping(unifiedGameId, platform, platformCategoryId, confidence, isManual) {
    const excludedPrefix = isPostgres() ? 'EXCLUDED' : 'excluded';
    const isManualValue = isManual ? (isPostgres() ? 'TRUE' : 1) : (isPostgres() ? 'FALSE' : 0);

    const sql = `
      INSERT INTO category_game_mappings
        (unified_game_id, platform, platform_category_id, confidence, is_manual)
      VALUES (${p(1)}, ${p(2)}, ${p(3)}, ${p(4)}, ${isManualValue})
      ON CONFLICT(platform, platform_category_id) DO UPDATE SET
        unified_game_id = ${excludedPrefix}.unified_game_id,
        confidence = ${excludedPrefix}.confidence,
        is_manual = ${excludedPrefix}.is_manual
    `;

    await runQuery(sql, [unifiedGameId, platform, platformCategoryId, confidence]);
  }

  /**
   * 플랫폼 카테고리의 통합 게임 조회
   * @param {string} platform
   * @param {string} platformCategoryId
   * @returns {Promise<Object|null>}
   */
  async getUnifiedGame(platform, platformCategoryId) {
    const sql = `
      SELECT ug.*, cgm.confidence, cgm.is_manual
      FROM unified_games ug
      JOIN category_game_mappings cgm ON ug.id = cgm.unified_game_id
      WHERE cgm.platform = ${p(1)} AND cgm.platform_category_id = ${p(2)}
    `;

    return await getOne(sql, [platform, platformCategoryId]);
  }

  /**
   * 수동 매핑 설정
   * @param {string} platform
   * @param {string} platformCategoryId
   * @param {number} unifiedGameId
   */
  async setManualMapping(platform, platformCategoryId, unifiedGameId) {
    await this.saveMapping(unifiedGameId, platform, platformCategoryId, 1.0, true);
  }

  /**
   * 매핑되지 않은 카테고리 목록
   * @returns {Promise<Array>}
   */
  async getUnmappedCategories() {
    // Cross-database boolean comparison
    const isActiveValue = isPostgres() ? 'TRUE' : '1';

    const sql = `
      SELECT pc.*
      FROM platform_categories pc
      LEFT JOIN category_game_mappings cgm
        ON pc.platform = cgm.platform AND pc.platform_category_id = cgm.platform_category_id
      WHERE cgm.id IS NULL AND pc.is_active = ${isActiveValue}
      ORDER BY pc.viewer_count DESC
    `;

    return await getAll(sql, []);
  }

  /**
   * 낮은 신뢰도의 매핑 목록
   * @param {number} threshold
   * @returns {Promise<Array>}
   */
  async getLowConfidenceMappings(threshold = 0.9) {
    // Cross-database boolean comparison
    const isActiveValue = isPostgres() ? 'TRUE' : '1';
    const isManualFalse = isPostgres() ? 'FALSE' : '0';

    const sql = `
      SELECT pc.*, cgm.confidence, cgm.is_manual, ug.name as unified_name
      FROM platform_categories pc
      JOIN category_game_mappings cgm
        ON pc.platform = cgm.platform AND pc.platform_category_id = cgm.platform_category_id
      JOIN unified_games ug ON cgm.unified_game_id = ug.id
      WHERE cgm.confidence < ${p(1)} AND cgm.is_manual = ${isManualFalse} AND pc.is_active = ${isActiveValue}
      ORDER BY pc.viewer_count DESC
    `;

    return await getAll(sql, [threshold]);
  }

  /**
   * 모든 매핑되지 않은 카테고리에 대해 자동 매핑 실행
   * @returns {Promise<{mapped: number, failed: number}>}
   */
  async mapAllUnmapped() {
    const unmapped = await this.getUnmappedCategories();
    let mapped = 0;
    let failed = 0;

    for (const category of unmapped) {
      try {
        await this.autoMapCategory({
          platform: category.platform,
          platformCategoryId: category.platform_category_id,
          platformCategoryName: category.platform_category_name,
        });
        mapped++;
      } catch (error) {
        categoryLogger.error("Failed to map category", {
          category: category.platform_category_name,
          error: error.message,
        });
        failed++;
      }
    }

    categoryLogger.info("Mapping complete", { mapped, failed });
    return { mapped, failed };
  }
}

module.exports = CategoryMapper;
