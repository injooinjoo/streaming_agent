import React, { useState, useEffect } from 'react';
import {
  Copy, RefreshCw, Save, ExternalLink,
  Gamepad2, Check, Trophy, Crosshair, User, Link2, Monitor
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../config/api';
import LoadingSpinner from '../shared/LoadingSpinner';
import './GameSettings.css';

// 기본 설정
const defaultSettings = {
  nexon: {
    enabled: true,
    accountId: '',
    selectedGames: ['maplestory', 'fconline', 'suddenattack']
  },
  riot: {
    enabled: false,
    region: 'kr',
    gameName: '',
    tagLine: '',
    selectedGames: ['lol', 'valorant', 'tft']
  },
  pubg: {
    enabled: false,
    platform: 'steam',
    playerName: ''
  },
  steam: {
    enabled: false,
    steamId: ''
  }
};

// 플랫폼 정보
const platforms = [
  {
    id: 'nexon',
    name: '넥슨',
    icon: '🎮',
    description: '메이플, FC온라인, 서든어택',
    games: [
      { id: 'maplestory', name: '메이플스토리', icon: '🍁' },
      { id: 'fconline', name: 'FC온라인', icon: '⚽' },
      { id: 'suddenattack', name: '서든어택', icon: '🔫' },
      { id: 'dnf', name: '던전앤파이터', icon: '⚔️' },
      { id: 'kart', name: '카트라이더', icon: '🏎️' }
    ]
  },
  {
    id: 'riot',
    name: '라이엇 게임즈',
    icon: '⚔️',
    description: 'LoL, 발로란트, TFT',
    games: [
      { id: 'lol', name: '리그 오브 레전드', icon: '🏆' },
      { id: 'valorant', name: '발로란트', icon: '🎯' },
      { id: 'tft', name: '전략적 팀 전투', icon: '♟️' }
    ]
  },
  {
    id: 'pubg',
    name: 'PUBG',
    icon: '🪖',
    description: '배틀그라운드',
    games: [
      { id: 'pubg', name: 'PUBG', icon: '🪖' }
    ]
  },
  {
    id: 'steam',
    name: '스팀',
    icon: '🎯',
    description: '스팀 게임 라이브러리',
    games: [
      { id: 'steam', name: '현재 플레이 중', icon: '🎮' }
    ]
  }
];

// 가상 데이터
const mockGameData = {
  lol: {
    nickname: 'Faker',
    tier: 'Challenger',
    lp: 1247,
    winRate: 67,
    recentGames: [
      { win: true }, { win: true }, { win: false }, { win: true }, { win: true }
    ]
  },
  valorant: {
    nickname: 'Hide on Bush',
    rank: 'Radiant',
    rr: 450,
    kd: 1.4,
    winRate: 58
  },
  tft: {
    nickname: 'TFT Master',
    tier: 'Grandmaster',
    lp: 856,
    avgPlace: 3.2
  },
  maplestory: {
    nickname: '단풍잎사랑',
    level: 287,
    job: '아크메이지(불,독)',
    legion: 8500,
    guild: '별빛마을'
  },
  fconline: {
    nickname: 'FCKing',
    level: 42,
    rating: 2340,
    winRate: 61,
    division: '슈퍼챔피언스'
  },
  suddenattack: {
    nickname: '헤드샷장인',
    level: 75,
    kd: 2.1,
    winRate: 54,
    clan: '최강클랜'
  },
  pubg: {
    nickname: 'ChickenDinner',
    tier: 'Master',
    rp: 5200,
    kd: 3.2,
    winRate: 18
  },
  steam: {
    nickname: 'GamerPro',
    currentGame: 'Counter-Strike 2',
    playtime: '1,247시간'
  }
};

// 오버레이 타입
const overlayTypes = [
  { id: 'stats', name: '전적 오버레이', icon: <Trophy size={16} /> },
  { id: 'live', name: '실시간 매치', icon: <Crosshair size={16} /> },
  { id: 'profile', name: '프로필', icon: <User size={16} /> }
];

const GameSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const overlayHash = user?.userHash || null;
  const [copied, setCopied] = useState('');
  const [selectedOverlayType, setSelectedOverlayType] = useState('stats');
  const [selectedGame, setSelectedGame] = useState('lol');

  const overlayUrl = overlayHash
    ? `${window.location.origin}/overlay/${overlayHash}/game`
    : '';

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/settings/game`);
      const data = await res.json();
      if (data.value && data.value !== '{}') {
        setSettings(prev => ({ ...prev, ...JSON.parse(data.value) }));
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ key: 'game', value: settings })
      });
      alert('설정이 저장되었습니다!');
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = async (url, gameId) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(gameId);
      setTimeout(() => setCopied(''), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handlePlatformToggle = (platformId) => {
    setSettings(prev => ({
      ...prev,
      [platformId]: {
        ...prev[platformId],
        enabled: !prev[platformId].enabled
      }
    }));
  };

  const handleInputChange = (platformId, field, value) => {
    setSettings(prev => ({
      ...prev,
      [platformId]: {
        ...prev[platformId],
        [field]: value
      }
    }));
  };

  const handleGameToggle = (platformId, gameId) => {
    setSettings(prev => {
      const currentGames = prev[platformId].selectedGames || [];
      const newGames = currentGames.includes(gameId)
        ? currentGames.filter(g => g !== gameId)
        : [...currentGames, gameId];
      return {
        ...prev,
        [platformId]: {
          ...prev[platformId],
          selectedGames: newGames
        }
      };
    });
  };

  const getEnabledGames = () => {
    const enabledGames = [];
    platforms.forEach(platform => {
      if (settings[platform.id]?.enabled) {
        platform.games.forEach(game => {
          if (settings[platform.id].selectedGames?.includes(game.id)) {
            enabledGames.push({ ...game, platform: platform.id });
          }
        });
      }
    });
    return enabledGames;
  };

  const getOverlayUrl = (gameId) => {
    const hash = overlayHash || 'demo';
    return `${window.location.origin}/overlay/${hash}/game/${gameId}`;
  };

  const renderPreview = () => {
    const data = mockGameData[selectedGame];
    if (!data) return null;

    switch (selectedGame) {
      case 'lol':
        return (
          <div className="overlay-preview-card">
            <div className="player-name">
              <Trophy size={20} />
              {data.nickname}
            </div>
            <div className="rank-info">
              <span className="tier-badge challenger">{data.tier}</span>
              {data.lp.toLocaleString()} LP
            </div>
            <div className="recent-games">
              {data.recentGames.map((game, i) => (
                <div key={i} className={`game-result ${game.win ? 'win' : 'loss'}`}>
                  {game.win ? 'W' : 'L'}
                </div>
              ))}
            </div>
            <div className="stats-row">
              <div className="stat-item">
                <div className="stat-value">{data.winRate}%</div>
                <div className="stat-label">승률</div>
              </div>
            </div>
          </div>
        );

      case 'valorant':
        return (
          <div className="overlay-preview-card">
            <div className="player-name">
              <Crosshair size={20} />
              {data.nickname}
            </div>
            <div className="rank-info">
              <span className="tier-badge radiant">{data.rank}</span>
              {data.rr} RR
            </div>
            <div className="stats-row">
              <div className="stat-item">
                <div className="stat-value">{data.kd}</div>
                <div className="stat-label">K/D</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{data.winRate}%</div>
                <div className="stat-label">승률</div>
              </div>
            </div>
          </div>
        );

      case 'maplestory':
        return (
          <div className="overlay-preview-card">
            <div className="player-name">🍁 {data.nickname}</div>
            <div className="rank-info">Lv.{data.level} {data.job}</div>
            <div className="stats-row">
              <div className="stat-item">
                <div className="stat-value">{data.legion.toLocaleString()}</div>
                <div className="stat-label">유니온</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{data.guild}</div>
                <div className="stat-label">길드</div>
              </div>
            </div>
          </div>
        );

      case 'fconline':
        return (
          <div className="overlay-preview-card">
            <div className="player-name">⚽ {data.nickname}</div>
            <div className="rank-info">{data.division} · {data.rating.toLocaleString()} RP</div>
            <div className="stats-row">
              <div className="stat-item">
                <div className="stat-value">{data.winRate}%</div>
                <div className="stat-label">승률</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">Lv.{data.level}</div>
                <div className="stat-label">레벨</div>
              </div>
            </div>
          </div>
        );

      case 'suddenattack':
        return (
          <div className="overlay-preview-card">
            <div className="player-name">🔫 {data.nickname}</div>
            <div className="rank-info">Lv.{data.level} · {data.clan}</div>
            <div className="stats-row">
              <div className="stat-item">
                <div className="stat-value">{data.kd}</div>
                <div className="stat-label">K/D</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{data.winRate}%</div>
                <div className="stat-label">승률</div>
              </div>
            </div>
          </div>
        );

      case 'pubg':
        return (
          <div className="overlay-preview-card">
            <div className="player-name">🪖 {data.nickname}</div>
            <div className="rank-info">
              <span className="tier-badge master">{data.tier}</span>
              {data.rp.toLocaleString()} RP
            </div>
            <div className="stats-row">
              <div className="stat-item">
                <div className="stat-value">{data.kd}</div>
                <div className="stat-label">K/D</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{data.winRate}%</div>
                <div className="stat-label">승률</div>
              </div>
            </div>
          </div>
        );

      case 'tft':
        return (
          <div className="overlay-preview-card">
            <div className="player-name">♟️ {data.nickname}</div>
            <div className="rank-info">
              <span className="tier-badge grandmaster">{data.tier}</span>
              {data.lp.toLocaleString()} LP
            </div>
            <div className="stats-row">
              <div className="stat-item">
                <div className="stat-value">{data.avgPlace}</div>
                <div className="stat-label">평균 등수</div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="overlay-preview-card">
            <div className="player-name">🎮 {mockGameData.steam?.nickname || 'Player'}</div>
            <div className="rank-info">현재 플레이 중: {mockGameData.steam?.currentGame || 'None'}</div>
          </div>
        );
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    const enabledGames = getEnabledGames();
    if (enabledGames.length > 0 && !enabledGames.find(g => g.id === selectedGame)) {
      setSelectedGame(enabledGames[0].id);
    }
  }, [settings]);

  if (loading) {
    return (
      <div className="settings-panel">
        <LoadingSpinner />
      </div>
    );
  }

  const enabledGames = getEnabledGames();

  return (
    <div className="settings-panel">
      {/* 헤더 */}
      <div className="premium-settings-header">
        <div className="header-top-row">
          <div className="title-area">
            <Gamepad2 size={28} />
            <span className="title-text">게임 오버레이</span>
            <span className="badge-test">테스트 모드</span>
          </div>
          <div className="action-area">
            <a
              href={overlayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-external-view"
            >
              <ExternalLink size={16} />
              새 창에서 보기
            </a>
          </div>
        </div>

        <div className="url-copy-section glass-premium">
          <div className="url-label-row">
            <span className="label">오버레이 URL</span>
            <span className="label-status">
              <span className="status-dot green"></span>
              연결됨
            </span>
          </div>
          <div className="url-copy-box">
            <input
              type="text"
              value={overlayUrl || '로그인이 필요합니다'}
              readOnly
              className="styled-input"
            />
            <button
              className={`btn-copy ${copied === 'main' ? 'copied' : ''}`}
              onClick={() => copyUrl(overlayUrl, 'main')}
              disabled={!overlayUrl}
            >
              {copied === 'main' ? <Check size={16} /> : <Copy size={16} />}
              {copied === 'main' ? '복사됨' : '복사'}
            </button>
          </div>
        </div>
      </div>

      {/* 계정 연동 섹션 */}
      <div className="settings-card">
        <div className="card-header">
          <h3><Link2 size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />계정 연동</h3>
          <p>게임 플랫폼 계정을 연동하여 전적/랭크 정보를 자동으로 가져옵니다</p>
        </div>

        <div className="platform-grid">
          {platforms.map(platform => (
            <div
              key={platform.id}
              className={`platform-card platform-${platform.id} ${settings[platform.id]?.enabled ? 'enabled' : ''}`}
            >
              <div className="platform-card-header">
                <div className="platform-info">
                  <div className="platform-icon">{platform.icon}</div>
                  <div className="platform-name">
                    <h3>{platform.name}</h3>
                    <span>{platform.description}</span>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings[platform.id]?.enabled || false}
                    onChange={() => handlePlatformToggle(platform.id)}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="platform-card-body">
                {platform.id === 'nexon' && (
                  <div className="input-group">
                    <label>넥슨 계정 ID</label>
                    <input
                      type="text"
                      className="styled-input"
                      placeholder="example@nexon.com"
                      value={settings.nexon?.accountId || ''}
                      onChange={(e) => handleInputChange('nexon', 'accountId', e.target.value)}
                      disabled={!settings.nexon?.enabled}
                    />
                  </div>
                )}

                {platform.id === 'riot' && (
                  <>
                    <div className="input-group">
                      <label>게임 이름</label>
                      <input
                        type="text"
                        className="styled-input"
                        placeholder="게임 이름"
                        value={settings.riot?.gameName || ''}
                        onChange={(e) => handleInputChange('riot', 'gameName', e.target.value)}
                        disabled={!settings.riot?.enabled}
                      />
                    </div>
                    <div className="input-group">
                      <label>태그라인</label>
                      <input
                        type="text"
                        className="styled-input"
                        placeholder="KR1"
                        value={settings.riot?.tagLine || ''}
                        onChange={(e) => handleInputChange('riot', 'tagLine', e.target.value)}
                        disabled={!settings.riot?.enabled}
                      />
                    </div>
                  </>
                )}

                {platform.id === 'pubg' && (
                  <>
                    <div className="input-group">
                      <label>플랫폼</label>
                      <select
                        className="styled-select"
                        value={settings.pubg?.platform || 'steam'}
                        onChange={(e) => handleInputChange('pubg', 'platform', e.target.value)}
                        disabled={!settings.pubg?.enabled}
                      >
                        <option value="steam">Steam</option>
                        <option value="kakao">카카오</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label>플레이어 닉네임</label>
                      <input
                        type="text"
                        className="styled-input"
                        placeholder="닉네임"
                        value={settings.pubg?.playerName || ''}
                        onChange={(e) => handleInputChange('pubg', 'playerName', e.target.value)}
                        disabled={!settings.pubg?.enabled}
                      />
                    </div>
                  </>
                )}

                {platform.id === 'steam' && (
                  <div className="input-group">
                    <label>Steam ID</label>
                    <input
                      type="text"
                      className="styled-input"
                      placeholder="76561198xxxxxxxxx"
                      value={settings.steam?.steamId || ''}
                      onChange={(e) => handleInputChange('steam', 'steamId', e.target.value)}
                      disabled={!settings.steam?.enabled}
                    />
                  </div>
                )}

                {/* 게임 선택 */}
                {platform.games.length > 1 && (
                  <div className="input-group">
                    <label>연동할 게임</label>
                    <div className="game-checkboxes">
                      {platform.games.map(game => (
                        <label
                          key={game.id}
                          className={`game-checkbox ${!settings[platform.id]?.enabled ? 'disabled' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={settings[platform.id]?.selectedGames?.includes(game.id) || false}
                            onChange={() => handleGameToggle(platform.id, game.id)}
                            disabled={!settings[platform.id]?.enabled}
                          />
                          <span>{game.icon} {game.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className={`connection-status ${settings[platform.id]?.enabled ? 'connected' : 'disconnected'}`}>
                  <span className="status-dot"></span>
                  {settings[platform.id]?.enabled ? '테스트 모드로 연결됨' : '연결되지 않음'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 오버레이 미리보기 */}
      <div className="settings-card">
        <div className="card-header">
          <h3><Monitor size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />오버레이 미리보기</h3>
          <p>방송에 표시될 오버레이를 미리 확인하세요</p>
        </div>

        {enabledGames.length > 0 ? (
          <>
            <div className="game-selector-tabs">
              {enabledGames.map(game => (
                <button
                  key={game.id}
                  className={`game-tab ${selectedGame === game.id ? 'active' : ''}`}
                  onClick={() => setSelectedGame(game.id)}
                >
                  {game.icon} {game.name}
                </button>
              ))}
            </div>

            <div className="overlay-type-tabs">
              {overlayTypes.map(type => (
                <button
                  key={type.id}
                  className={`overlay-type-tab ${selectedOverlayType === type.id ? 'active' : ''}`}
                  onClick={() => setSelectedOverlayType(type.id)}
                >
                  {type.icon} {type.name}
                </button>
              ))}
            </div>

            <div className="game-overlay-preview">
              {renderPreview()}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <Gamepad2 size={48} />
            <h3>연동된 게임이 없습니다</h3>
            <p>위에서 플랫폼을 활성화하고 게임을 선택해주세요</p>
          </div>
        )}
      </div>

      {/* OBS 가이드 */}
      <div className="settings-card">
        <div className="card-header">
          <h3><ExternalLink size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />OBS에 추가하기</h3>
          <p>아래 URL을 OBS 브라우저 소스에 추가하세요</p>
        </div>

        <div className="obs-steps">
          <div className="obs-step">
            <div className="step-number">1</div>
            <div className="step-content">OBS Studio에서 <strong>소스 추가 → 브라우저</strong>를 선택하세요</div>
          </div>
          <div className="obs-step">
            <div className="step-number">2</div>
            <div className="step-content">아래 URL을 복사하여 <strong>URL</strong> 필드에 붙여넣으세요</div>
          </div>
          <div className="obs-step">
            <div className="step-number">3</div>
            <div className="step-content">권장 크기: <strong>너비 400px, 높이 200px</strong></div>
          </div>
        </div>

        {enabledGames.length > 0 ? (
          <div className="overlay-url-list">
            {enabledGames.map(game => (
              <div key={game.id} className="overlay-url-item">
                <div className="url-game-info">
                  <span className="game-icon">{game.icon}</span>
                  <span className="game-name">{game.name}</span>
                </div>
                <div className="url-input-wrapper">
                  <input
                    type="text"
                    value={getOverlayUrl(game.id)}
                    readOnly
                  />
                  <button
                    className={`btn-copy ${copied === game.id ? 'copied' : ''}`}
                    onClick={() => copyUrl(getOverlayUrl(game.id), game.id)}
                  >
                    {copied === game.id ? <Check size={14} /> : <Copy size={14} />}
                    {copied === game.id ? '복사됨' : '복사'}
                  </button>
                </div>
                <span className="url-size-info">400 x 200</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Link2 size={48} />
            <h3>연동된 게임이 없습니다</h3>
            <p>플랫폼을 연동하면 오버레이 URL이 생성됩니다</p>
          </div>
        )}
      </div>

      {/* 저장 버튼 */}
      <div className="save-controls-wrapper">
        <button
          className="btn-save-full"
          onClick={saveSettings}
          disabled={saving}
        >
          {saving ? <RefreshCw className="spin" size={18} /> : <Save size={18} />}
          {saving ? '저장 중...' : '설정 저장하기'}
        </button>
      </div>
    </div>
  );
};

export default GameSettings;
