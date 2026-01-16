/**
 * RiotAdapter - Riot Games API 클라이언트
 *
 * League of Legends, VALORANT, Teamfight Tactics 게임 데이터를 조회합니다.
 *
 * @see https://developer.riotgames.com
 */

class RiotAdapter {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.RIOT_API_KEY || "";
    this.region = options.region || "kr";

    // 리전별 API 베이스 URL
    this.baseUrls = {
      // 플랫폼 라우팅
      kr: "https://kr.api.riotgames.com",
      na1: "https://na1.api.riotgames.com",
      euw1: "https://euw1.api.riotgames.com",
      eun1: "https://eun1.api.riotgames.com",
      jp1: "https://jp1.api.riotgames.com",
      // 리전 라우팅 (매치, 계정)
      asia: "https://asia.api.riotgames.com",
      americas: "https://americas.api.riotgames.com",
      europe: "https://europe.api.riotgames.com",
    };

    // 플랫폼 → 리전 매핑
    this.platformToRegion = {
      kr: "asia",
      jp1: "asia",
      na1: "americas",
      br1: "americas",
      la1: "americas",
      la2: "americas",
      euw1: "europe",
      eun1: "europe",
      tr1: "europe",
      ru: "europe",
    };

    // Rate Limit 관리
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.lastRequestTime = 0;
    this.minRequestInterval = 50; // 20 requests/second = 50ms 간격
  }

  /**
   * API 요청 (Rate Limit 처리 포함)
   */
  async fetch(url, options = {}) {
    // Rate Limit 대기
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      await this.sleep(this.minRequestInterval - timeSinceLastRequest);
    }

    this.lastRequestTime = Date.now();

    const response = await fetch(url, {
      ...options,
      headers: {
        "X-Riot-Token": this.apiKey,
        ...options.headers,
      },
    });

    // Rate Limit 초과
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get("Retry-After") || "1");
      console.log(`[riot] Rate limited, waiting ${retryAfter}s`);
      await this.sleep(retryAfter * 1000);
      return this.fetch(url, options);
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Riot API error: ${response.status} - ${errorBody}`);
    }

    return response.json();
  }

  /**
   * 유틸리티: sleep
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================================
  // 계정 API
  // ============================================================

  /**
   * Riot ID로 계정 정보 조회
   * @param {string} gameName - 게임 닉네임 (예: "Faker")
   * @param {string} tagLine - 태그라인 (예: "KR1")
   * @returns {Promise<Object>} 계정 정보 (puuid, gameName, tagLine)
   */
  async getAccountByRiotId(gameName, tagLine) {
    const region = this.platformToRegion[this.region] || "asia";
    const url = `${this.baseUrls[region]}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
    return this.fetch(url);
  }

  /**
   * PUUID로 계정 정보 조회
   */
  async getAccountByPuuid(puuid) {
    const region = this.platformToRegion[this.region] || "asia";
    const url = `${this.baseUrls[region]}/riot/account/v1/accounts/by-puuid/${puuid}`;
    return this.fetch(url);
  }

  // ============================================================
  // League of Legends API
  // ============================================================

  /**
   * PUUID로 소환사 정보 조회
   */
  async getLolSummonerByPuuid(puuid) {
    const url = `${this.baseUrls[this.region]}/lol/summoner/v4/summoners/by-puuid/${puuid}`;
    return this.fetch(url);
  }

  /**
   * 소환사 ID로 랭크 정보 조회
   */
  async getLolRankBySummonerId(summonerId) {
    const url = `${this.baseUrls[this.region]}/lol/league/v4/entries/by-summoner/${summonerId}`;
    return this.fetch(url);
  }

  /**
   * PUUID로 최근 매치 ID 목록 조회
   */
  async getLolMatchIds(puuid, count = 5, queue = null) {
    const region = this.platformToRegion[this.region] || "asia";
    let url = `${this.baseUrls[region]}/lol/match/v5/matches/by-puuid/${puuid}/ids?count=${count}`;
    if (queue) {
      url += `&queue=${queue}`;
    }
    return this.fetch(url);
  }

  /**
   * 매치 ID로 매치 상세 정보 조회
   */
  async getLolMatchById(matchId) {
    const region = this.platformToRegion[this.region] || "asia";
    const url = `${this.baseUrls[region]}/lol/match/v5/matches/${matchId}`;
    return this.fetch(url);
  }

  /**
   * LoL 플레이어 전적 조회 (통합)
   * @param {string} gameName - 게임 닉네임
   * @param {string} tagLine - 태그라인
   * @returns {Promise<Object>} 전적 정보
   */
  async getLolPlayerStats(gameName, tagLine) {
    try {
      // 1. 계정 정보 (PUUID)
      const account = await this.getAccountByRiotId(gameName, tagLine);

      // 2. 소환사 정보
      const summoner = await this.getLolSummonerByPuuid(account.puuid);

      // 3. 랭크 정보 (summoner.id가 있을 때만 조회)
      let soloRank = null;
      let flexRank = null;
      if (summoner.id) {
        try {
          const ranks = await this.getLolRankBySummonerId(summoner.id);
          soloRank = ranks.find((r) => r.queueType === "RANKED_SOLO_5x5") || null;
          flexRank = ranks.find((r) => r.queueType === "RANKED_FLEX_SR") || null;
        } catch (rankError) {
          console.warn(`[riot] Could not fetch rank info: ${rankError.message}`);
        }
      }

      // 4. 최근 매치 (5게임)
      const matchIds = await this.getLolMatchIds(account.puuid, 5);
      const recentGames = [];

      for (const matchId of matchIds) {
        try {
          const match = await this.getLolMatchById(matchId);
          const participant = match.info.participants.find(
            (p) => p.puuid === account.puuid
          );

          if (participant) {
            recentGames.push({
              win: participant.win,
              championName: participant.championName,
              kills: participant.kills,
              deaths: participant.deaths,
              assists: participant.assists,
              cs: participant.totalMinionsKilled + participant.neutralMinionsKilled,
              duration: Math.floor(match.info.gameDuration / 60),
              gameMode: match.info.gameMode,
            });
          }
        } catch (error) {
          console.error(`[riot] Failed to fetch match ${matchId}:`, error.message);
        }
      }

      // 결과 정리
      return {
        nickname: `${account.gameName}#${account.tagLine}`,
        puuid: account.puuid,
        summonerLevel: summoner.summonerLevel,
        profileIconId: summoner.profileIconId,
        profileIconUrl: `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/${summoner.profileIconId}.png`,
        soloRank: soloRank
          ? {
              tier: soloRank.tier,
              rank: soloRank.rank,
              lp: soloRank.leaguePoints,
              wins: soloRank.wins,
              losses: soloRank.losses,
              winRate: Math.round(
                (soloRank.wins / (soloRank.wins + soloRank.losses)) * 100
              ),
            }
          : null,
        flexRank: flexRank
          ? {
              tier: flexRank.tier,
              rank: flexRank.rank,
              lp: flexRank.leaguePoints,
              wins: flexRank.wins,
              losses: flexRank.losses,
              winRate: Math.round(
                (flexRank.wins / (flexRank.wins + flexRank.losses)) * 100
              ),
            }
          : null,
        recentGames,
      };
    } catch (error) {
      console.error(`[riot] getLolPlayerStats error:`, error.message);
      throw error;
    }
  }

  // ============================================================
  // VALORANT API
  // ============================================================

  /**
   * VALORANT 매치 목록 조회
   */
  async getValMatchIds(puuid, count = 5) {
    const region = this.platformToRegion[this.region] || "asia";
    const url = `${this.baseUrls[region]}/val/match/v1/matchlists/by-puuid/${puuid}`;
    const data = await this.fetch(url);
    return data.history?.slice(0, count).map((m) => m.matchId) || [];
  }

  /**
   * VALORANT 매치 상세 조회
   */
  async getValMatchById(matchId) {
    const region = this.platformToRegion[this.region] || "asia";
    const url = `${this.baseUrls[region]}/val/match/v1/matches/${matchId}`;
    return this.fetch(url);
  }

  /**
   * VALORANT 플레이어 전적 조회 (통합)
   * @param {string} gameName - 게임 닉네임
   * @param {string} tagLine - 태그라인
   * @returns {Promise<Object>} 전적 정보
   */
  async getValPlayerStats(gameName, tagLine) {
    try {
      // 1. 계정 정보
      const account = await this.getAccountByRiotId(gameName, tagLine);

      // 2. 최근 매치
      const matchIds = await this.getValMatchIds(account.puuid, 5);
      const recentGames = [];

      for (const matchId of matchIds) {
        try {
          const match = await this.getValMatchById(matchId);
          const player = match.players?.find((p) => p.puuid === account.puuid);

          if (player) {
            const stats = player.stats || {};
            recentGames.push({
              win: player.team === match.teams?.find((t) => t.won)?.teamId,
              agent: player.characterId,
              kills: stats.kills || 0,
              deaths: stats.deaths || 0,
              assists: stats.assists || 0,
              score: stats.score || 0,
              map: match.matchInfo?.mapId,
              mode: match.matchInfo?.gameMode,
            });
          }
        } catch (error) {
          console.error(`[riot] Failed to fetch val match ${matchId}:`, error.message);
        }
      }

      // KDA 계산
      const totalKills = recentGames.reduce((sum, g) => sum + g.kills, 0);
      const totalDeaths = recentGames.reduce((sum, g) => sum + g.deaths, 0);
      const totalAssists = recentGames.reduce((sum, g) => sum + g.assists, 0);
      const kda = totalDeaths > 0
        ? ((totalKills + totalAssists) / totalDeaths).toFixed(2)
        : (totalKills + totalAssists).toFixed(2);

      return {
        nickname: `${account.gameName}#${account.tagLine}`,
        puuid: account.puuid,
        kda: parseFloat(kda),
        avgKills: recentGames.length > 0 ? (totalKills / recentGames.length).toFixed(1) : 0,
        avgDeaths: recentGames.length > 0 ? (totalDeaths / recentGames.length).toFixed(1) : 0,
        avgAssists: recentGames.length > 0 ? (totalAssists / recentGames.length).toFixed(1) : 0,
        winRate: recentGames.length > 0
          ? Math.round((recentGames.filter((g) => g.win).length / recentGames.length) * 100)
          : 0,
        recentGames,
      };
    } catch (error) {
      console.error(`[riot] getValPlayerStats error:`, error.message);
      throw error;
    }
  }

  // ============================================================
  // TFT API
  // ============================================================

  /**
   * TFT 소환사 정보 조회
   */
  async getTftSummonerByPuuid(puuid) {
    const url = `${this.baseUrls[this.region]}/tft/summoner/v1/summoners/by-puuid/${puuid}`;
    return this.fetch(url);
  }

  /**
   * TFT 랭크 정보 조회
   */
  async getTftRankBySummonerId(summonerId) {
    const url = `${this.baseUrls[this.region]}/tft/league/v1/entries/by-summoner/${summonerId}`;
    return this.fetch(url);
  }

  /**
   * TFT 매치 목록 조회
   */
  async getTftMatchIds(puuid, count = 5) {
    const region = this.platformToRegion[this.region] || "asia";
    const url = `${this.baseUrls[region]}/tft/match/v1/matches/by-puuid/${puuid}/ids?count=${count}`;
    return this.fetch(url);
  }

  /**
   * TFT 매치 상세 조회
   */
  async getTftMatchById(matchId) {
    const region = this.platformToRegion[this.region] || "asia";
    const url = `${this.baseUrls[region]}/tft/match/v1/matches/${matchId}`;
    return this.fetch(url);
  }

  /**
   * TFT 플레이어 전적 조회 (통합)
   */
  async getTftPlayerStats(gameName, tagLine) {
    try {
      // 1. 계정 정보
      const account = await this.getAccountByRiotId(gameName, tagLine);

      // 2. 소환사 정보
      const summoner = await this.getTftSummonerByPuuid(account.puuid);

      // 3. 랭크 정보
      const ranks = await this.getTftRankBySummonerId(summoner.id);
      const rankedRank = ranks.find((r) => r.queueType === "RANKED_TFT");

      // 4. 최근 매치
      const matchIds = await this.getTftMatchIds(account.puuid, 5);
      const recentGames = [];

      for (const matchId of matchIds) {
        try {
          const match = await this.getTftMatchById(matchId);
          const participant = match.info?.participants?.find(
            (p) => p.puuid === account.puuid
          );

          if (participant) {
            recentGames.push({
              placement: participant.placement,
              level: participant.level,
              goldLeft: participant.gold_left,
              playersEliminated: participant.players_eliminated,
              traits: participant.traits?.filter((t) => t.tier_current > 0) || [],
              units: participant.units?.map((u) => ({
                characterId: u.character_id,
                tier: u.tier,
                items: u.itemNames || [],
              })) || [],
            });
          }
        } catch (error) {
          console.error(`[riot] Failed to fetch tft match ${matchId}:`, error.message);
        }
      }

      // 평균 등수 계산
      const avgPlacement = recentGames.length > 0
        ? (recentGames.reduce((sum, g) => sum + g.placement, 0) / recentGames.length).toFixed(1)
        : 0;

      return {
        nickname: `${account.gameName}#${account.tagLine}`,
        puuid: account.puuid,
        summonerLevel: summoner.summonerLevel,
        rank: rankedRank
          ? {
              tier: rankedRank.tier,
              rank: rankedRank.rank,
              lp: rankedRank.leaguePoints,
              wins: rankedRank.wins,
              losses: rankedRank.losses,
            }
          : null,
        avgPlacement: parseFloat(avgPlacement),
        top4Rate: recentGames.length > 0
          ? Math.round((recentGames.filter((g) => g.placement <= 4).length / recentGames.length) * 100)
          : 0,
        recentGames,
      };
    } catch (error) {
      console.error(`[riot] getTftPlayerStats error:`, error.message);
      throw error;
    }
  }
}

module.exports = RiotAdapter;
