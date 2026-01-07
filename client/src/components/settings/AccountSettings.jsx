import React, { useState } from 'react';
import { 
  Link2, User, Shield, AlertCircle, Copy, 
  ExternalLink, LogOut, Info, ChevronRight,
  Monitor, Globe, Lock, Key, HelpCircle, ChevronsDown
} from 'lucide-react';

const AccountSettings = () => {
  const [activeSubTab, setActiveSubTab] = useState('connection');
  const [memberId] = useState('jebMz9rAmmZraG2A487U1w');
  
  const loginHistory = [
    { date: '2026-01-08 00:39:27', platform: 'SOOP', ip: '211.***.***.124', device: 'PC' },
    { date: '2026-01-08 00:39:25', platform: 'SOOP', ip: '211.***.***.124', device: 'PC' },
    { date: '2026-01-07 22:09:58', platform: 'SOOP', ip: '211.***.***.124', device: 'PC' },
    { date: '2026-01-07 13:53:16', platform: 'SOOP', ip: '112.***.***.13', device: 'PC' },
    { date: '2025-12-19 17:53:13', platform: '네이버', ip: '112.***.***.13', device: 'PC' },
    { date: '2025-10-25 00:22:24', platform: 'SOOP', ip: '211.***.***.124', device: 'PC' },
  ];

  const copyMemberId = () => {
    navigator.clipboard.writeText(memberId);
    alert('회원 아이디가 복사되었습니다.');
  };

  return (
    <div className="settings-panel animate-fade">
      <div className="tabs-container" style={{ marginBottom: '32px' }}>
        <button 
          className={`tab-btn ${activeSubTab === 'connection' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('connection')}
        >
          채널 연결
        </button>
        <button 
          className={`tab-btn ${activeSubTab === 'account' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('account')}
        >
          계정 관리
        </button>
        <button 
          className={`tab-btn ${activeSubTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('security')}
        >
          보안 관리
        </button>
      </div>

      {activeSubTab === 'connection' && (
        <div className="animate-fade">
          <div className="connection-grid" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '16px',
            marginBottom: '32px'
          }}>
            <div className="settings-card glass-premium" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '16px',
              border: '2px solid var(--primary-light)',
              background: '#f8faff'
            }}>
              <div className="avatar" style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden' }}>
                <img src="https://upload.wikimedia.org/wikipedia/commons/e/ee/SOOP_Logo.svg" alt="SOOP" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '15px' }}>제이콥씨</div>
                <div style={{ fontSize: '11px', color: 'var(--primary)' }}>SOOP 연결됨</div>
              </div>
              <button style={{ color: 'var(--text-muted)', fontSize: '12px' }}>해제</button>
            </div>

            {[
              { name: '치지직', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/29/Chzzk_Logo.svg' },
              { name: '유튜브', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_Logo_2017.svg' },
              { name: '트위치', logo: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Twitch_logo.svg' }
            ].map(platform => (
              <div key={platform.name} className="settings-card glass-premium" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                padding: '16px'
              }}>
                <div className="avatar" style={{ width: '40px', height: '40px', background: '#fff', borderRadius: '8px', padding: '6px', border: '1px solid var(--border-light)' }}>
                  <img src={platform.logo} alt={platform.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '15px' }}>{platform.name}</div>
                </div>
                <button style={{ color: 'var(--primary)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  연결 <ChevronRight size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="settings-card glass-premium" style={{ borderLeft: '4px solid var(--primary)' }}>
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Info size={18} color="var(--primary)" />
              <h3 style={{ margin: 0, fontSize: '16px' }}>연결 주의사항</h3>
            </div>
            <div className="form-group-list" style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ color: 'var(--primary)' }}>•</div>
                <p>로그인 계정의 <span style={{ color: 'var(--primary)', fontWeight: 600 }}>이메일 정보를 변경시 새로운 계정으로 인식</span> 되니 주의해주세요! 이전 설정을 불러올 수 없습니다.</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ color: 'var(--primary)' }}>•</div>
                <p>장면전환시 <span style={{ color: 'var(--primary)', fontWeight: 600 }}>URL이 새로고침 되지 않게 설정</span> 해주세요. 
                  <span className="chip" style={{ margin: '0 4px' }}>프릭샷</span>
                  <span className="chip" style={{ margin: '0 4px' }}>XSplit</span>
                  <span className="chip" style={{ margin: '0 4px' }}>OBS</span>
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ color: 'var(--primary)' }}>•</div>
                <p>테스트를 제외한 기능들은 <span style={{ color: 'var(--primary)', fontWeight: 600 }}>생방송을 시작해야 연결</span> 가능하며, 생방송 시작 직후 1분이 지나도 연결이 불가할 경우 <span style={{ color: 'var(--primary)', textDecoration: 'underline' }}>채팅 재연결</span>을 눌러주세요.</p>
              </div>
            </div>
            
            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border-medium)' }}>
              <button className="btn-outline" style={{ fontSize: '13px' }}>다른 SOOP 아이디 연결</button>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
                비밀번호 방송 및 구독 플러스 전용 LIVE 방송 연결이 되지 않을 경우 채널 연결 해제 후 다시 연결 해주세요.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'account' && (
        <div className="animate-fade">
          <div className="settings-card glass-premium">
            <div className="input-row" style={{ alignItems: 'flex-start', gridTemplateColumns: '120px 1fr' }}>
              <div style={{ fontWeight: 600, fontSize: '14px', paddingTop: '10px' }}>회원 아이디</div>
              <div>
                <button 
                  onClick={copyMemberId}
                  style={{ 
                    background: 'var(--bg-hover)', 
                    padding: '10px 20px', 
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 500
                  }}
                >
                  <Lock size={16} /> 클릭하여 회원 아이디 복사
                </button>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px', lineHeight: '1.5' }}>
                  회원 아이디는 계정 공유 및 API 등에 사용되는 고유한 아이디 이며, <span style={{ color: 'var(--primary)' }}>방송화면 또는 허용되지 않은 타인에게 노출하지 마세요!</span>
                </div>
              </div>
            </div>
          </div>

          <div className="settings-card glass-premium">
            <div className="input-row" style={{ alignItems: 'flex-start', gridTemplateColumns: '120px 1fr' }}>
              <div style={{ fontWeight: 600, fontSize: '14px', paddingTop: '10px' }}>계정 공유 <HelpCircle size={14} /></div>
              <div>
                <div style={{ 
                  color: '#ef4444', 
                  fontSize: '13px', 
                  fontWeight: 600, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  marginBottom: '16px'
                }}>
                  <AlertCircle size={16} /> 계정공유는 반드시 인증된 관리자에게만 공유해주세요. 계정 공유로 인한 모든 책임은 본인에게 있습니다.
                </div>
                
                <div style={{ background: 'var(--bg-sidebar)', padding: '20px', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>공유 요청</label>
                      <input type="text" placeholder="회원 아이디 입력" style={{ width: '100%' }} />
                    </div>
                    <button className="btn-primary" style={{ marginTop: '20px' }}>공유 요청</button>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                        <th style={{ padding: '10px', textAlign: 'center' }}>공유 대상</th>
                        <th style={{ padding: '10px', textAlign: 'center' }}>공유 일자</th>
                        <th style={{ padding: '10px', textAlign: 'center' }}>관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan="3" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          공유 대상이 없습니다.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'security' && (
        <div className="animate-fade">
          <div className="settings-card glass-premium">
            <div className="input-row" style={{ alignItems: 'flex-start', gridTemplateColumns: 'minmax(100px, 150px) 1fr', gap: '32px' }}>
              <div style={{ fontWeight: 600, fontSize: '15px', paddingTop: '12px', color: 'var(--text-main)' }}>로그인 기록</div>
              <div style={{ width: '100%' }}>
                <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-medium)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#7c3aed0a', borderBottom: '1px solid var(--border-medium)' }}>
                        <th style={{ padding: '14px 16px', textAlign: 'left', color: 'var(--primary)', fontWeight: 600 }}>일시</th>
                        <th style={{ padding: '14px 16px', textAlign: 'left', color: 'var(--primary)', fontWeight: 600 }}>로그인</th>
                        <th style={{ padding: '14px 16px', textAlign: 'left', color: 'var(--primary)', fontWeight: 600 }}>IP</th>
                        <th style={{ padding: '14px 16px', textAlign: 'left', color: 'var(--primary)', fontWeight: 600 }}>기기</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loginHistory.map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-light)', background: 'white' }}>
                          <td style={{ padding: '14px 16px', color: 'var(--text-main)' }}>{row.date}</td>
                          <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ 
                              width: '24px', 
                              height: '24px', 
                              borderRadius: '4px',
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: row.platform === '네이버' ? '#03c75a' : '#fff',
                              border: '1px solid var(--border-light)',
                              padding: '2px'
                            }}>
                              <img 
                                src={row.platform === '네이버' ? 'https://static.cdnlogo.com/logos/n/55/naver.svg' : 'https://upload.wikimedia.org/wikipedia/commons/e/ee/SOOP_Logo.svg'} 
                                alt={row.platform} 
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                              />
                            </div>
                            <span style={{ fontWeight: 500 }}>{row.platform}</span>
                          </div>
                          </td>
                          <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>{row.ip}</td>
                          <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>{row.device}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
                  <button 
                    className="btn-primary" 
                    style={{ 
                      padding: '10px 32px', 
                      borderRadius: '50px', 
                      fontSize: '14px',
                      background: '#4e86ff',
                      boxShadow: '0 4px 12px rgba(78, 134, 255, 0.2)'
                    }}
                  >
                    <ChevronsDown size={18} style={{ marginRight: '6px' }} /> 더 보기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountSettings;
