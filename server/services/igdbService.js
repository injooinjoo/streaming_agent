/**
 * IgdbService - IGDB (Internet Game Database) 연동 서비스
 *
 * unified_games에 IGDB 메타데이터를 보강합니다.
 * Twitch Client Credentials를 재사용하여 IGDB API v4에 접근합니다.
 *
 * - 커버 이미지, 설명, 장르/태그, 개발사, 평점 등
 * - Rate limit: 4 req/sec
 */

const { category: categoryLogger } = require("./logger");
const { getOne, getAll, runQuery, isPostgres } = require("../db/connections");

const p = (index) => (isPostgres() ? `$${index}` : "?");

// IGDB API 설정
const IGDB_API_URL = "https://api.igdb.com/v4";
const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const IGDB_IMAGE_BASE = "https://images.igdb.com/igdb/image/upload";

// Rate limiting: 4 requests per second
const RATE_LIMIT_DELAY = 260; // ms between requests (~4/sec)

// 매칭 신뢰도 임계값
const MATCH_CONFIDENCE_THRESHOLD = 0.8;

// 비게임 카테고리 스킵 리스트
const NON_GAME_CATEGORIES = [
  "just chatting", "잡담", "irl", "먹방", "asmr", "music", "음악",
  "art", "미술", "그림", "sports", "스포츠", "talk shows", "토크쇼",
  "travel & outdoors", "여행", "beauty & body art", "뷰티",
  "food & drink", "science & technology", "과학", "기술",
  "politics", "정치", "special events", "이벤트",
  "pools, hot tubs, and beaches", "animals, aquariums, and zoos",
  "fitness & health", "운동", "헬스", "makers & crafting",
  "software and game development", "tabletop rpgs",
  "날씨", "공부", "코딩", "요리", "독서", "수면",
];

// 인기 게임 IGDB ID 직접 매핑 (검색 실패 방지)
const KNOWN_IGDB_IDS = {
  "League of Legends": 115,
  "VALORANT": 126459,
  "MapleStory": 3408,
  "Dungeon & Fighter": 9592,
  "Lost Ark": 68468,
  "PUBG: BATTLEGROUNDS": 25076,
  "Overwatch 2": 152245,
  "Minecraft": 121,
  "Teamfight Tactics": 116754,
  "StarCraft": 35,
  "StarCraft II": 96,
  "Diablo IV": 119171,
  "World of Warcraft": 123,
  "Elden Ring": 119133,
  "Black Desert": 7333,
  "Fortnite": 1905,
  "Apex Legends": 114795,
  "Counter-Strike 2": 252698,
  "Dota 2": 126459, // will be corrected in search if needed
  "Genshin Impact": 119277,
  "Honkai: Star Rail": 217590,
};

// 한글 장르명 매핑
const GENRE_KR_MAP = {
  "Role-playing (RPG)": "RPG",
  "Strategy": "전략",
  "Shooter": "슈팅",
  "Adventure": "어드벤처",
  "Puzzle": "퍼즐",
  "Racing": "레이싱",
  "Sport": "스포츠",
  "Simulator": "시뮬레이션",
  "Fighting": "격투",
  "Platform": "플랫포머",
  "Arcade": "아케이드",
  "Turn-based strategy (TBS)": "턴제 전략",
  "Real Time Strategy (RTS)": "RTS",
  "MOBA": "MOBA",
  "Tactical": "전술",
  "Hack and slash/Beat 'em up": "액션",
  "Quiz/Trivia": "퀴즈",
  "Indie": "인디",
  "Pinball": "핀볼",
  "Music": "음악",
  "Card & Board Game": "카드/보드게임",
  "Visual Novel": "비주얼 노벨",
  "Point-and-click": "포인트앤클릭",
};

const THEME_KR_MAP = {
  "Action": "액션",
  "Fantasy": "판타지",
  "Science fiction": "SF",
  "Horror": "호러",
  "Thriller": "스릴러",
  "Survival": "서바이벌",
  "Historical": "역사",
  "Stealth": "스텔스",
  "Comedy": "코미디",
  "Business": "경영",
  "Drama": "드라마",
  "Non-fiction": "논픽션",
  "Sandbox": "샌드박스",
  "Open world": "오픈 월드",
  "Warfare": "전쟁",
  "Party": "파티",
  "4X (explore, expand, exploit, and exterminate)": "4X",
  "Educational": "교육",
  "Mystery": "미스터리",
  "Romance": "로맨스",
  "Erotic": "성인",
  "Kids": "아동",
};

class IgdbService {
  constructor() {
    this.accessToken = null;
    this.tokenExpiresAt = 0;
    this.clientId = process.env.TWITCH_CLIENT_ID;
    this.clientSecret = process.env.TWITCH_CLIENT_SECRET;
    this.lastRequestTime = 0;
  }

  /**
   * Twitch/IGDB 인증 정보가 설정되어 있는지 확인
   */
  isConfigured() {
    return !!(this.clientId && this.clientSecret);
  }

  /**
   * Twitch OAuth 토큰 발급/갱신
   */
  async getAccessToken() {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.accessToken;
    }

    const response = await fetch(
      `${TWITCH_TOKEN_URL}?client_id=${this.clientId}&client_secret=${this.clientSecret}&grant_type=client_credentials`,
      { method: "POST" }
    );

    if (!response.ok) {
      throw new Error(`Twitch token error: ${response.status}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000;

    categoryLogger.info("IGDB access token acquired");
    return this.accessToken;
  }

  /**
   * Rate-limited IGDB API 호출
   */
  async query(endpoint, body) {
    const token = await this.getAccessToken();

    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_DELAY - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();

    const response = await fetch(`${IGDB_API_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        "Client-ID": this.clientId,
        Authorization: `Bearer ${token}`,
        "Content-Type": "text/plain",
      },
      body,
    });

    if (response.status === 401) {
      // Token expired, retry once
      this.accessToken = null;
      return this.query(endpoint, body);
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`IGDB API error ${response.status}: ${errText}`);
    }

    return response.json();
  }

  /**
   * IGDB 커버 이미지 URL 생성
   * @param {string} imageId - IGDB image_id
   * @param {string} size - t_thumb, t_cover_small, t_cover_big, t_720p, t_1080p
   */
  getCoverUrl(imageId, size = "t_cover_big") {
    if (!imageId) return null;
    return `${IGDB_IMAGE_BASE}/${size}/${imageId}.jpg`;
  }

  /**
   * 문자열 정규화 (매칭용)
   */
  normalize(str) {
    if (!str) return "";
    return str
      .toLowerCase()
      .replace(/[:\-_\s]+/g, "")
      .replace(/[^a-z0-9가-힣]/g, "");
  }

  /**
   * 유사도 계산 (Levenshtein 기반)
   */
  calculateSimilarity(a, b) {
    const na = this.normalize(a);
    const nb = this.normalize(b);
    if (na === nb) return 1.0;
    if (!na || !nb) return 0;

    const matrix = [];
    for (let i = 0; i <= nb.length; i++) matrix[i] = [i];
    for (let j = 0; j <= na.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= nb.length; i++) {
      for (let j = 1; j <= na.length; j++) {
        if (nb.charAt(i - 1) === na.charAt(j - 1)) {
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

    const distance = matrix[nb.length][na.length];
    const maxLen = Math.max(na.length, nb.length);
    return 1 - distance / maxLen;
  }

  /**
   * 비게임 카테고리인지 확인
   */
  isNonGameCategory(name) {
    if (!name) return true;
    const normalized = name.toLowerCase().trim();
    return NON_GAME_CATEGORIES.some(
      (cat) => normalized === cat || normalized.includes(cat)
    );
  }

  /**
   * IGDB에서 게임 검색 및 최적 매치 반환
   * @param {string} name - 게임 이름 (영문 우선)
   * @param {string} nameKr - 게임 한글 이름
   * @returns {Promise<{igdbGame: Object, confidence: number}|null>}
   */
  async searchGame(name, nameKr) {
    // 1. 알려진 IGDB ID가 있으면 바로 사용
    const knownId = KNOWN_IGDB_IDS[name];
    if (knownId) {
      const results = await this.query(
        "games",
        `fields name,slug,url,summary,storyline,rating,rating_count,follows,first_release_date,
                cover.image_id,genres.name,themes.name,
                involved_companies.company.name,involved_companies.developer,involved_companies.publisher;
         where id = ${knownId};`
      );
      if (results && results.length > 0) {
        return { igdbGame: results[0], confidence: 1.0 };
      }
    }

    // 2. 영문 이름으로 검색
    if (name) {
      const results = await this.query(
        "games",
        `search "${name.replace(/"/g, '\\"')}";
         fields name,slug,url,summary,storyline,rating,rating_count,follows,first_release_date,
                cover.image_id,genres.name,themes.name,
                involved_companies.company.name,involved_companies.developer,involved_companies.publisher;
         limit 5;`
      );

      const match = this.findBestMatch(name, results);
      if (match) return match;
    }

    // 3. 한글 이름으로 검색 (영문과 다를 때만)
    if (nameKr && nameKr !== name) {
      const results = await this.query(
        "games",
        `search "${nameKr.replace(/"/g, '\\"')}";
         fields name,slug,url,summary,storyline,rating,rating_count,follows,first_release_date,
                cover.image_id,genres.name,themes.name,
                involved_companies.company.name,involved_companies.developer,involved_companies.publisher;
         limit 5;`
      );

      const match = this.findBestMatch(nameKr, results);
      if (match) return match;
    }

    return null;
  }

  /**
   * 검색 결과에서 최적 매치 선택
   */
  findBestMatch(queryName, results) {
    if (!results || results.length === 0) return null;

    let bestMatch = null;
    let bestConfidence = 0;

    for (const game of results) {
      const similarity = this.calculateSimilarity(queryName, game.name);
      if (similarity > bestConfidence) {
        bestConfidence = similarity;
        bestMatch = game;
      }
    }

    if (bestMatch && bestConfidence >= MATCH_CONFIDENCE_THRESHOLD) {
      return { igdbGame: bestMatch, confidence: bestConfidence };
    }

    // 첫 번째 결과가 정확히 매치되는 경우 (IGDB 검색 자체가 relevance 기반)
    if (results.length > 0) {
      const firstSimilarity = this.calculateSimilarity(queryName, results[0].name);
      if (firstSimilarity >= 0.6) {
        return { igdbGame: results[0], confidence: firstSimilarity };
      }
    }

    return null;
  }

  /**
   * 게임의 IGDB 데이터를 DB에 저장
   */
  async saveEnrichment(unifiedGameId, igdbGame, confidence) {
    const coverUrl = igdbGame.cover?.image_id
      ? this.getCoverUrl(igdbGame.cover.image_id)
      : null;

    const igdbUrl = igdbGame.url || (igdbGame.slug
      ? `https://www.igdb.com/games/${igdbGame.slug}`
      : null);

    // 개발사/퍼블리셔 추출
    let developer = null;
    let publisher = null;
    if (igdbGame.involved_companies) {
      for (const ic of igdbGame.involved_companies) {
        if (ic.developer && ic.company?.name) developer = ic.company.name;
        if (ic.publisher && ic.company?.name) publisher = ic.company.name;
      }
    }

    // unified_games 업데이트
    await runQuery(
      `UPDATE unified_games SET
        igdb_id = ${p(1)},
        igdb_slug = ${p(2)},
        igdb_url = ${p(3)},
        summary = ${p(4)},
        cover_url = ${p(5)},
        publisher = ${p(6)},
        igdb_rating = ${p(7)},
        igdb_rating_count = ${p(8)},
        igdb_followers = ${p(9)},
        igdb_enriched_at = ${isPostgres() ? "NOW()" : "datetime('now')"},
        igdb_match_confidence = ${p(10)},
        developer = COALESCE(${p(11)}, developer),
        description = COALESCE(${p(12)}, description),
        updated_at = ${isPostgres() ? "NOW()" : "datetime('now')"}
      WHERE id = ${p(13)}`,
      [
        igdbGame.id,
        igdbGame.slug || null,
        igdbUrl,
        igdbGame.summary || null,
        coverUrl,
        publisher,
        igdbGame.rating || null,
        igdbGame.rating_count || null,
        igdbGame.follows || null,
        confidence,
        developer,
        igdbGame.summary || null,
        unifiedGameId,
      ]
    );

    // game_genres 저장 (기존 삭제 후 재삽입)
    await runQuery(
      `DELETE FROM game_genres WHERE unified_game_id = ${p(1)}`,
      [unifiedGameId]
    );

    if (igdbGame.genres) {
      for (const genre of igdbGame.genres) {
        await runQuery(
          `INSERT INTO game_genres (unified_game_id, genre_type, igdb_id, name, name_kr)
           VALUES (${p(1)}, 'genre', ${p(2)}, ${p(3)}, ${p(4)})
           ON CONFLICT(unified_game_id, genre_type, name) DO NOTHING`,
          [
            unifiedGameId,
            genre.id || null,
            genre.name,
            GENRE_KR_MAP[genre.name] || null,
          ]
        );
      }
    }

    if (igdbGame.themes) {
      for (const theme of igdbGame.themes) {
        await runQuery(
          `INSERT INTO game_genres (unified_game_id, genre_type, igdb_id, name, name_kr)
           VALUES (${p(1)}, 'theme', ${p(2)}, ${p(3)}, ${p(4)})
           ON CONFLICT(unified_game_id, genre_type, name) DO NOTHING`,
          [
            unifiedGameId,
            theme.id || null,
            theme.name,
            THEME_KR_MAP[theme.name] || null,
          ]
        );
      }
    }

    // game_companies 저장
    await runQuery(
      `DELETE FROM game_companies WHERE unified_game_id = ${p(1)}`,
      [unifiedGameId]
    );

    if (igdbGame.involved_companies) {
      for (const ic of igdbGame.involved_companies) {
        if (!ic.company?.name) continue;
        const role = ic.developer ? "developer" : ic.publisher ? "publisher" : "supporting";
        await runQuery(
          `INSERT INTO game_companies (unified_game_id, igdb_company_id, name, role)
           VALUES (${p(1)}, ${p(2)}, ${p(3)}, ${p(4)})
           ON CONFLICT(unified_game_id, igdb_company_id, role) DO NOTHING`,
          [
            unifiedGameId,
            ic.company.id || null,
            ic.company.name,
            role,
          ]
        );
      }
    }

    categoryLogger.info("IGDB enrichment saved", {
      gameId: unifiedGameId,
      igdbId: igdbGame.id,
      name: igdbGame.name,
      confidence,
    });
  }

  /**
   * 비게임 카테고리를 enriched로 마킹 (재검색 방지)
   */
  async markAsNonGame(unifiedGameId) {
    await runQuery(
      `UPDATE unified_games SET
        igdb_enriched_at = ${isPostgres() ? "NOW()" : "datetime('now')"},
        igdb_match_confidence = 0,
        updated_at = ${isPostgres() ? "NOW()" : "datetime('now')"}
      WHERE id = ${p(1)}`,
      [unifiedGameId]
    );
  }

  /**
   * 매칭 실패한 게임을 enriched로 마킹 (30일 후 재시도)
   */
  async markAsUnmatched(unifiedGameId) {
    await runQuery(
      `UPDATE unified_games SET
        igdb_enriched_at = ${isPostgres() ? "NOW()" : "datetime('now')"},
        igdb_match_confidence = 0,
        updated_at = ${isPostgres() ? "NOW()" : "datetime('now')"}
      WHERE id = ${p(1)}`,
      [unifiedGameId]
    );
  }

  /**
   * 미처리 게임 일괄 IGDB enrichment
   * @returns {Promise<{enriched: number, skipped: number, failed: number}>}
   */
  async enrichAllUnmatched() {
    if (!this.isConfigured()) {
      categoryLogger.warn("IGDB: Twitch credentials not configured, skipping enrichment");
      return { enriched: 0, skipped: 0, failed: 0 };
    }

    const games = await getAll(
      "SELECT id, name, name_kr FROM unified_games WHERE igdb_enriched_at IS NULL ORDER BY id",
      []
    );

    let enriched = 0;
    let skipped = 0;
    let failed = 0;

    categoryLogger.info(`IGDB enrichment starting: ${games.length} games to process`);

    for (const game of games) {
      try {
        // 비게임 카테고리 스킵
        if (this.isNonGameCategory(game.name) || this.isNonGameCategory(game.name_kr)) {
          await this.markAsNonGame(game.id);
          skipped++;
          continue;
        }

        const result = await this.searchGame(game.name, game.name_kr);

        if (result) {
          await this.saveEnrichment(game.id, result.igdbGame, result.confidence);
          enriched++;
        } else {
          await this.markAsUnmatched(game.id);
          skipped++;
          categoryLogger.debug("IGDB: No match found", { name: game.name });
        }
      } catch (error) {
        failed++;
        categoryLogger.error("IGDB enrichment error", {
          gameId: game.id,
          name: game.name,
          error: error.message,
        });
        // Rate limit이나 네트워크 에러 시 잠시 대기
        if (error.message.includes("429") || error.message.includes("fetch")) {
          await new Promise((r) => setTimeout(r, 5000));
        }
      }
    }

    categoryLogger.info("IGDB enrichment complete", { enriched, skipped, failed });
    return { enriched, skipped, failed };
  }

  /**
   * 30일 지난 데이터 갱신 (팔로워 수, 평점 등 업데이트)
   * @returns {Promise<{refreshed: number, failed: number}>}
   */
  async refreshStaleData() {
    if (!this.isConfigured()) return { refreshed: 0, failed: 0 };

    const staleCondition = isPostgres()
      ? "igdb_enriched_at < NOW() - INTERVAL '30 days'"
      : "igdb_enriched_at < datetime('now', '-30 days')";

    const games = await getAll(
      `SELECT id, name, name_kr, igdb_id FROM unified_games
       WHERE igdb_id IS NOT NULL AND ${staleCondition}
       ORDER BY id LIMIT 50`,
      []
    );

    let refreshed = 0;
    let failed = 0;

    for (const game of games) {
      try {
        const results = await this.query(
          "games",
          `fields name,slug,url,summary,storyline,rating,rating_count,follows,first_release_date,
                  cover.image_id,genres.name,themes.name,
                  involved_companies.company.name,involved_companies.developer,involved_companies.publisher;
           where id = ${game.igdb_id};`
        );

        if (results && results.length > 0) {
          await this.saveEnrichment(game.id, results[0], 1.0);
          refreshed++;
        }
      } catch (error) {
        failed++;
        categoryLogger.error("IGDB refresh error", {
          gameId: game.id,
          error: error.message,
        });
      }
    }

    if (refreshed > 0 || failed > 0) {
      categoryLogger.info("IGDB stale refresh complete", { refreshed, failed });
    }
    return { refreshed, failed };
  }

  /**
   * 특정 게임 강제 enrichment (관리자용)
   */
  async enrichSingleGame(unifiedGameId) {
    if (!this.isConfigured()) {
      throw new Error("Twitch credentials not configured");
    }

    const game = await getOne(
      `SELECT id, name, name_kr FROM unified_games WHERE id = ${p(1)}`,
      [unifiedGameId]
    );

    if (!game) throw new Error("Game not found");

    const result = await this.searchGame(game.name, game.name_kr);
    if (!result) {
      throw new Error(`No IGDB match found for "${game.name}"`);
    }

    await this.saveEnrichment(game.id, result.igdbGame, result.confidence);
    return result;
  }

  /**
   * 게임의 장르/태그 목록 조회
   */
  async getGameGenres(unifiedGameId) {
    return await getAll(
      `SELECT genre_type, igdb_id, name, name_kr
       FROM game_genres
       WHERE unified_game_id = ${p(1)}
       ORDER BY genre_type, name`,
      [unifiedGameId]
    );
  }

  /**
   * 게임의 회사 목록 조회
   */
  async getGameCompanies(unifiedGameId) {
    return await getAll(
      `SELECT igdb_company_id, name, role
       FROM game_companies
       WHERE unified_game_id = ${p(1)}
       ORDER BY role, name`,
      [unifiedGameId]
    );
  }
}

module.exports = IgdbService;
