import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Link2, User, Shield, AlertCircle, Copy, Check,
  LogOut, Info, Key, Monitor, Lock, Smartphone,
  ChevronDown, Mail, Eye, EyeOff, UserPlus, CheckCircle,
  Download, Upload, X, FileJson, AlertTriangle, CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import './AccountSettings.css';

const AccountSettings = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('connection');
  const [memberId] = useState('jebMz9rAmmZraG2A487U1w');
  const [copied, setCopied] = useState(false);
  const [showMemberId, setShowMemberId] = useState(false);
  const [managerInput, setManagerInput] = useState('');
  const [connectionStatus, setConnectionStatus] = useState({ soop: {}, chzzk: {} });
  const [loadingConnections, setLoadingConnections] = useState(true);

  // Fetch connection status on mount
  useEffect(() => {
    fetchConnectionStatus();
  }, []);

  const fetchConnectionStatus = async () => {
    setLoadingConnections(true);
    try {
      const response = await fetch('http://localhost:3001/api/connections/status');
      const data = await response.json();
      setConnectionStatus(data);
    } catch (error) {
      console.error('Failed to fetch connection status:', error);
    } finally {
      setLoadingConnections(false);
    }
  };

  // Platform connection states - dynamically built from API data
  const platforms = [
    {
      id: 'soop',
      name: 'SOOP',
      logo: '/assets/logos/soop.png',
      connected: connectionStatus.soop?.connected || false,
      profile: connectionStatus.soop?.connected
        ? {
            name: connectionStatus.soop?.channels?.[0]?.channelId || '연결됨',
            date: new Date().toLocaleDateString('ko-KR')
          }
        : null,
      channels: connectionStatus.soop?.channels || []
    },
    {
      id: 'chzzk',
      name: '치지직',
      logo: '/assets/logos/chzzk.png',
      connected: connectionStatus.chzzk?.connected || false,
      profile: connectionStatus.chzzk?.connected
        ? {
            name: connectionStatus.chzzk?.channels?.[0]?.channelId?.substring(0, 8) + '...' || '연결됨',
            date: new Date().toLocaleDateString('ko-KR')
          }
        : null,
      channels: connectionStatus.chzzk?.channels || []
    },
    {
      id: 'youtube',
      name: '유튜브',
      logo: '/assets/logos/youtube.png',
      connected: false,
      profile: null
    },
    {
      id: 'twitch',
      name: '트위치',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Twitch_Glitch_Logo_Purple.svg',
      connected: false,
      profile: null
    }
  ];

  // Security settings (UI only)
  const [security, setSecurity] = useState({
    twoFactorEnabled: false,
    loginAlerts: true
  });

  // Import settings state
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [importUrl, setImportUrl] = useState('');
  const [fileUploaded, setFileUploaded] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Import platforms data
  const importPlatforms = [
    { id: 'weplab', name: '위플랩', icon: '🎮', format: '.json', color: '#6366f1' },
    { id: 'obs', name: 'OBS', icon: '📹', format: '.json', color: '#302e5c' },
    { id: 'xsplit', name: 'XSplit', icon: '🎬', format: '.xml', color: '#00a4ef' },
    { id: 'prickshot', name: '프릭샷', icon: '📷', format: '.ini', color: '#ff6b35' }
  ];

  // Mock imported settings (for preview)
  const mockImportedSettings = {
    theme: 'heart',
    duration: 25,
    volume: 70,
    ttsEnabled: true,
    ttsVolume: 60,
    animation: 'fadeIn',
    fontSize: 24,
    showBadge: true
  };

  // Login history data
  const loginHistory = [
    { date: '2026-01-08 00:39:27', platform: 'SOOP', ip: '211.***.***.124', device: 'PC', current: true },
    { date: '2026-01-08 00:39:25', platform: 'SOOP', ip: '211.***.***.124', device: 'PC', current: false },
    { date: '2026-01-07 22:09:58', platform: 'SOOP', ip: '211.***.***.124', device: 'PC', current: false },
    { date: '2026-01-07 13:53:16', platform: 'SOOP', ip: '112.***.***.13', device: 'PC', current: false },
    { date: '2025-12-19 17:53:13', platform: '네이버', ip: '112.***.***.13', device: 'PC', current: false },
    { date: '2025-10-25 00:22:24', platform: 'SOOP', ip: '211.***.***.124', device: 'PC', current: false },
  ];

  const copyMemberId = async () => {
    await navigator.clipboard.writeText(memberId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePlatformConnect = (platformId) => {
    // UI only - would trigger OAuth flow
    console.log(`Connecting to ${platformId}...`);
  };

  const handlePlatformDisconnect = (platformId) => {
    // UI only - would show confirmation
    console.log(`Disconnecting from ${platformId}...`);
  };

  const getPlatformLogo = (platform) => {
    if (platform === 'SOOP') return '/assets/logos/soop.png';
    if (platform === '네이버') return 'https://static.cdnlogo.com/logos/n/55/naver.svg';
    return '/assets/logos/soop.png';
  };

  // Import settings handlers
  const handlePlatformSelect = (platformId) => {
    setSelectedPlatform(platformId);
    setFileUploaded(false);
    setShowPreview(false);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    // UI only - simulate file upload
    setFileUploaded(true);
    setShowPreview(true);
  };

  const handleImportFromUrl = () => {
    if (importUrl.trim()) {
      // UI only - simulate URL import
      setFileUploaded(true);
      setShowPreview(true);
    }
  };

  const handleApplyImport = () => {
    // UI only - show success message
    alert('설정이 성공적으로 적용되었습니다! (UI 목업)');
    setSelectedPlatform(null);
    setFileUploaded(false);
    setShowPreview(false);
    setImportUrl('');
  };

  const handleExportSettings = () => {
    // UI only - simulate export
    alert('현재 설정을 내보냈습니다! (UI 목업)');
  };

  const getSettingLabel = (key) => {
    const labels = {
      theme: '테마',
      duration: '표시 시간',
      volume: '볼륨',
      ttsEnabled: 'TTS 사용',
      ttsVolume: 'TTS 볼륨',
      animation: '애니메이션',
      fontSize: '글꼴 크기',
      showBadge: '뱃지 표시'
    };
    return labels[key] || key;
  };

  const formatSettingValue = (key, value) => {
    if (typeof value === 'boolean') return value ? '사용' : '미사용';
    if (key === 'duration') return `${value}초`;
    if (key === 'volume' || key === 'ttsVolume') return `${value}%`;
    if (key === 'fontSize') return `${value}px`;
    return value;
  };

  return (
    <div className="account-settings settings-panel animate-fade">
      <div className="account-settings-header">
        <h1>계정 설정</h1>
        <p>플랫폼 연결, 계정 관리, 보안 설정을 관리합니다</p>
      </div>

      <div className="account-tabs">
        <button
          className={`account-tab ${activeSubTab === 'connection' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('connection')}
        >
          <Link2 size={16} /> 채널 연결
        </button>
        <button
          className={`account-tab ${activeSubTab === 'account' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('account')}
        >
          <User size={16} /> 계정 관리
        </button>
        <button
          className={`account-tab ${activeSubTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('security')}
        >
          <Shield size={16} /> 보안 관리
        </button>
        <button
          className={`account-tab ${activeSubTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('import')}
        >
          <Download size={16} /> 설정 가져오기
        </button>
      </div>

      {/* Tab 1: Channel Connection */}
      {activeSubTab === 'connection' && (
        <div className="animate-fade">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ color: '#94a3b8', margin: 0 }}>실시간 플랫폼 연결 상태</p>
            <button
              onClick={fetchConnectionStatus}
              disabled={loadingConnections}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '8px',
                color: '#6366f1',
                cursor: loadingConnections ? 'not-allowed' : 'pointer'
              }}
            >
              <RefreshCw size={14} className={loadingConnections ? 'spin' : ''} />
              {loadingConnections ? '로딩 중...' : '새로고침'}
            </button>
          </div>
          <div className="platform-cards-grid">
            {platforms.map(platform => (
              <div
                key={platform.id}
                className={`platform-card ${platform.connected ? 'connected' : ''}`}
              >
                <div className="platform-card-header">
                  <div className="platform-logo">
                    <img src={platform.logo} alt={platform.name} />
                  </div>
                  {platform.connected ? (
                    <span className="status-badge success">
                      <CheckCircle size={12} /> 연결됨
                    </span>
                  ) : (
                    <span className="status-badge pending">미연결</span>
                  )}
                </div>

                <div className="platform-name">{platform.name}</div>

                {platform.connected ? (
                  <div className="platform-profile">
                    <div className="profile-avatar">
                      {platform.profile.name.charAt(0)}
                    </div>
                    <div className="profile-info">
                      <span className="profile-name">{platform.profile.name}</span>
                      <span className="profile-date">{platform.profile.date} 연결</span>
                    </div>
                  </div>
                ) : (
                  <div className="platform-connect-prompt">
                    계정을 연결하여 채팅 오버레이를 사용하세요
                  </div>
                )}

                <div className="platform-actions">
                  {platform.connected ? (
                    <>
                      <button className="btn-outline-sm">재연결</button>
                      <button
                        className="btn-danger-ghost"
                        onClick={() => handlePlatformDisconnect(platform.id)}
                      >
                        연결 해제
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn-primary-sm"
                      onClick={() => handlePlatformConnect(platform.id)}
                    >
                      <Link2 size={14} /> 연결하기
                    </button>
                  )}
                </div>
                {platform.id === 'soop' && platform.connected && (
                  <div className="platform-extra">
                    <button className="btn-outline-sm btn-full">다른 SOOP 아이디 연결</button>
                    <p className="platform-tip">비밀번호 방송 및 구독 플러스 전용 LIVE 방송 연결이 되지 않을 경우 연결 해제 후 다시 연결 해주세요.</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="connection-tips">
            <div className="tips-header">
              <Info size={18} />
              <span>연결 주의사항</span>
            </div>
            <div className="tips-list">
              <div className="tip-item">
                <span className="bullet">•</span>
                <p>로그인 계정의 <strong>이메일 정보를 변경시 새로운 계정으로 인식</strong>되니 주의해주세요! 이전 설정을 불러올 수 없습니다.</p>
              </div>
              <div className="tip-item">
                <span className="bullet">•</span>
                <p>
                  장면전환시 <strong>URL이 새로고침 되지 않게 설정</strong>해주세요.
                  <span className="tip-chips">
                    <span className="tip-chip">프릭샷</span>
                    <span className="tip-chip">XSplit</span>
                    <span className="tip-chip">OBS</span>
                  </span>
                </p>
              </div>
              <div className="tip-item">
                <span className="bullet">•</span>
                <p>테스트를 제외한 기능들은 <strong>생방송을 시작해야 연결</strong> 가능하며, 생방송 시작 직후 1분이 지나도 연결이 불가할 경우 채팅 재연결을 눌러주세요.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Account Management */}
      {activeSubTab === 'account' && (
        <div className="animate-fade">
          <div className="settings-card glass-premium">
            <div className="card-header">
              <h3><Key size={18} /> 회원 아이디</h3>
              <p>API 연동 및 계정 공유에 사용되는 고유 식별자입니다</p>
            </div>

            <div className="member-id-section">
              <div className="member-id-box">
                <div className="id-display">
                  <Lock size={16} />
                  <span className="id-value">
                    {showMemberId ? memberId : '••••••••••••••••••••••'}
                  </span>
                  <button
                    className="btn-icon-ghost"
                    onClick={() => setShowMemberId(!showMemberId)}
                    title={showMemberId ? '숨기기' : '보기'}
                  >
                    {showMemberId ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <button
                  className={`btn-copy ${copied ? 'copied' : ''}`}
                  onClick={copyMemberId}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? '복사됨' : '복사'}
                </button>
              </div>
              <div className="warning-box">
                <AlertCircle size={16} />
                <span>방송 화면이나 허용되지 않은 타인에게 노출하지 마세요!</span>
              </div>
            </div>
          </div>

          <div className="settings-card glass-premium manager-section">
            <div className="card-header">
              <h3><UserPlus size={18} /> 매니저 계정 공유</h3>
              <p>신뢰할 수 있는 매니저에게 대시보드 접근 권한을 부여합니다</p>
            </div>

            <div className="manager-warning">
              <AlertCircle size={16} />
              <span>계정공유는 반드시 인증된 관리자에게만 공유해주세요. 계정 공유로 인한 모든 책임은 본인에게 있습니다.</span>
            </div>

            <div className="manager-add-section">
              <div className="input-with-button">
                <input
                  type="text"
                  placeholder="매니저 회원 아이디 입력"
                  value={managerInput}
                  onChange={(e) => setManagerInput(e.target.value)}
                />
                <button className="btn-primary-sm">공유 요청</button>
              </div>
            </div>

            <div className="manager-list">
              <div className="manager-list-header">
                <span>공유 대상</span>
                <span>공유 일자</span>
                <span>상태</span>
                <span>관리</span>
              </div>
              <div className="empty-state">
                <UserPlus size={32} />
                <p>공유된 매니저가 없습니다</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Security Management */}
      {activeSubTab === 'security' && (
        <div className="animate-fade">
          <div className="security-options-grid">
            <div className="security-option-card">
              <div className="option-icon">
                <Key size={22} />
              </div>
              <div className="option-content">
                <h4>비밀번호 변경</h4>
                <p>정기적인 비밀번호 변경을 권장합니다</p>
              </div>
              <button className="btn-outline-sm">변경하기</button>
            </div>

            <div className="security-option-card">
              <div className="option-icon">
                <Smartphone size={22} />
              </div>
              <div className="option-content">
                <h4>2단계 인증</h4>
                <p>추가 보안을 위한 인증 앱 연동</p>
              </div>
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  id="2fa"
                  checked={security.twoFactorEnabled}
                  onChange={(e) => setSecurity({...security, twoFactorEnabled: e.target.checked})}
                />
                <label htmlFor="2fa"></label>
              </div>
            </div>

            <div className="security-option-card">
              <div className="option-icon">
                <Mail size={22} />
              </div>
              <div className="option-content">
                <h4>로그인 알림</h4>
                <p>새로운 기기에서 로그인 시 알림</p>
              </div>
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  id="loginAlert"
                  checked={security.loginAlerts}
                  onChange={(e) => setSecurity({...security, loginAlerts: e.target.checked})}
                />
                <label htmlFor="loginAlert"></label>
              </div>
            </div>
          </div>

          <div className="login-history-section">
            <div className="section-header">
              <h3><Monitor size={18} /> 로그인 기록</h3>
              <button className="btn-danger-ghost">
                <LogOut size={14} /> 모든 기기 로그아웃
              </button>
            </div>

            <div className="login-history-table">
              <table>
                <thead>
                  <tr>
                    <th>일시</th>
                    <th>플랫폼</th>
                    <th>IP 주소</th>
                    <th>기기</th>
                  </tr>
                </thead>
                <tbody>
                  {loginHistory.map((log, i) => (
                    <tr key={i} className={log.current ? 'current-session' : ''}>
                      <td>
                        {log.current && <span className="current-badge">현재 세션</span>}
                        {log.date}
                      </td>
                      <td>
                        <div className="platform-badge">
                          <img src={getPlatformLogo(log.platform)} alt={log.platform} />
                          <span>{log.platform}</span>
                        </div>
                      </td>
                      <td className="ip-address">{log.ip}</td>
                      <td>
                        <div className="device-badge">
                          <Monitor size={14} />
                          <span>{log.device}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="load-more-btn">
                <ChevronDown size={16} /> 더 보기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Import Settings */}
      {activeSubTab === 'import' && (
        <div className="animate-fade">
          <div className="settings-card glass-premium import-settings-card">
            <div className="card-header">
              <h3><Download size={18} /> 다른 프로그램에서 설정 가져오기</h3>
              <p>기존에 사용하던 프로그램의 설정을 가져와 빠르게 시작하세요</p>
            </div>

            {/* Platform Selection */}
            <div className="import-platform-section">
              <h4><FileJson size={16} /> 플랫폼 선택</h4>
              <div className="import-platform-grid">
                {importPlatforms.map(platform => (
                  <button
                    key={platform.id}
                    className={`import-platform-card ${selectedPlatform === platform.id ? 'selected' : ''}`}
                    onClick={() => handlePlatformSelect(platform.id)}
                    style={{ '--platform-color': platform.color }}
                  >
                    <span className="platform-icon">{platform.icon}</span>
                    <span className="platform-name">{platform.name}</span>
                    <span className="platform-format">{platform.format}</span>
                    {selectedPlatform === platform.id && (
                      <CheckCircle2 size={18} className="selected-check" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* File Upload */}
            {selectedPlatform && (
              <div className="import-upload-section">
                <h4><Upload size={16} /> 설정 파일 업로드</h4>
                <div
                  className={`import-upload-zone ${fileUploaded ? 'uploaded' : ''}`}
                  onDrop={handleFileDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => document.getElementById('import-file-input')?.click()}
                >
                  {fileUploaded ? (
                    <>
                      <CheckCircle2 size={32} className="upload-success-icon" />
                      <p>settings_{selectedPlatform}.json 업로드 완료</p>
                    </>
                  ) : (
                    <>
                      <Upload size={32} />
                      <p>설정 파일을 드래그하거나 클릭해서 업로드</p>
                      <span className="upload-hint">
                        지원 형식: {importPlatforms.find(p => p.id === selectedPlatform)?.format}
                      </span>
                    </>
                  )}
                  <input type="file" id="import-file-input" hidden />
                </div>

                <div className="import-url-section">
                  <span className="divider-text">또는 URL로 가져오기</span>
                  <div className="input-with-button">
                    <input
                      type="text"
                      placeholder="설정 URL 입력..."
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                    />
                    <button className="btn-primary-sm" onClick={handleImportFromUrl}>
                      가져오기
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Preview */}
            {showPreview && (
              <div className="import-preview-section">
                <h4><Info size={16} /> 가져올 설정 미리보기</h4>
                <div className="import-preview-box">
                  {Object.entries(mockImportedSettings).map(([key, value]) => (
                    <div key={key} className="preview-item">
                      <CheckCircle2 size={14} className="preview-check" />
                      <span className="preview-label">{getSettingLabel(key)}:</span>
                      <span className="preview-value">{formatSettingValue(key, value)}</span>
                    </div>
                  ))}
                </div>

                <div className="import-warning">
                  <AlertTriangle size={16} />
                  <span>현재 설정을 덮어씁니다. 백업을 권장합니다.</span>
                </div>

                <div className="import-actions">
                  <button className="btn-outline-sm" onClick={handleExportSettings}>
                    <Upload size={14} /> 현재 설정 내보내기
                  </button>
                  <button className="btn-primary-sm" onClick={handleApplyImport}>
                    <Download size={14} /> 설정 적용하기
                  </button>
                </div>
              </div>
            )}

            {/* Tips */}
            {!selectedPlatform && (
              <div className="import-tips">
                <Info size={16} />
                <div>
                  <p><strong>처음 사용하시나요?</strong></p>
                  <p>기존에 사용하던 스트리밍 도구가 있다면, 설정 파일을 내보내서 여기에 업로드하면 됩니다.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 로그아웃 섹션 */}
      <div className="logout-section">
        <button
          className="logout-button"
          onClick={() => {
            logout();
            navigate('/login');
          }}
        >
          <LogOut size={18} />
          로그아웃
        </button>
      </div>
    </div>
  );
};

export default AccountSettings;
