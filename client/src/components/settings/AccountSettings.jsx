import { useState } from 'react';
import {
  Link2, User, Shield, AlertCircle, Copy, Check,
  LogOut, Info, Key, Monitor, Lock, Smartphone,
  ChevronDown, Mail, Eye, EyeOff, UserPlus, CheckCircle
} from 'lucide-react';
import './AccountSettings.css';

const AccountSettings = () => {
  const [activeSubTab, setActiveSubTab] = useState('connection');
  const [memberId] = useState('jebMz9rAmmZraG2A487U1w');
  const [copied, setCopied] = useState(false);
  const [showMemberId, setShowMemberId] = useState(false);
  const [managerInput, setManagerInput] = useState('');

  // Platform connection states (UI only)
  const platforms = [
    {
      id: 'soop',
      name: 'SOOP',
      logo: '/assets/logos/soop.png',
      connected: true,
      profile: { name: '제이콥씨', date: '2024.01.08' }
    },
    {
      id: 'chzzk',
      name: '치지직',
      logo: '/assets/logos/chzzk.png',
      connected: false,
      profile: null
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
      </div>

      {/* Tab 1: Channel Connection */}
      {activeSubTab === 'connection' && (
        <div className="animate-fade">
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
            <div className="tips-footer">
              <button className="btn-outline-sm">다른 SOOP 아이디 연결</button>
              <p>비밀번호 방송 및 구독 플러스 전용 LIVE 방송 연결이 되지 않을 경우 채널 연결 해제 후 다시 연결 해주세요.</p>
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
    </div>
  );
};

export default AccountSettings;
