import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Save,
  Eye,
  Send,
  ChevronLeft,
  RefreshCw,
  MessageSquare,
  Bell,
  Target,
  Type,
  Subtitles,
  Circle,
  Smile,
  BarChart,
  Film,
  Monitor,
  Package,
  Palette,
  Code,
  Settings,
  Layout,
  Sparkles,
  Download,
  Upload,
  Copy,
  Check,
  AlertCircle,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import './DesignCustomizer.css';

const API_URL = import.meta.env.VITE_API_URL || '';

const overlayTypes = [
  { id: 'chat', label: '채팅', icon: <MessageSquare size={18} />, defaultTheme: 'default' },
  { id: 'alert', label: '알림', icon: <Bell size={18} />, defaultTheme: 'default' },
  { id: 'goal', label: '목표', icon: <Target size={18} />, defaultTheme: 'default' },
  { id: 'ticker', label: '전광판', icon: <Type size={18} />, defaultTheme: 'default' },
  { id: 'subtitle', label: '자막', icon: <Subtitles size={18} />, defaultTheme: 'default' },
  { id: 'roulette', label: '룰렛', icon: <Circle size={18} />, defaultTheme: 'default' },
  { id: 'emoji', label: '이모지', icon: <Smile size={18} />, defaultTheme: 'default' },
  { id: 'voting', label: '투표', icon: <BarChart size={18} />, defaultTheme: 'default' },
  { id: 'credits', label: '크레딧', icon: <Film size={18} />, defaultTheme: 'default' },
  { id: 'ad', label: '광고', icon: <Monitor size={18} />, defaultTheme: 'default' }
];

// 테마 옵션 (채팅 기준)
const chatThemes = [
  { id: 'default', label: '기본', preview: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 'neon', label: '네온', preview: 'linear-gradient(135deg, #00f260 0%, #0575e6 100%)' },
  { id: 'retro-pink', label: '레트로(핑크)', preview: 'linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%)' },
  { id: 'retro-blue', label: '레트로(블루)', preview: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 'gold', label: '골드', preview: 'linear-gradient(135deg, #f5af19 0%, #f12711 100%)' },
  { id: 'kakao', label: '카카오톡', preview: 'linear-gradient(135deg, #fee500 0%, #ffc107 100%)' },
  { id: 'windows', label: '윈도우', preview: 'linear-gradient(135deg, #0078d7 0%, #00bcf2 100%)' },
  { id: 'chalk', label: '칠판', preview: 'linear-gradient(135deg, #2d5016 0%, #1a3009 100%)' },
  { id: 'box-white', label: '박스(흰)', preview: 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)' },
  { id: 'box-black', label: '박스(검)', preview: 'linear-gradient(135deg, #1a1a1a 0%, #333333 100%)' },
  { id: 'balloon', label: '풍선', preview: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
  { id: 'postit', label: '포스트잇', preview: 'linear-gradient(135deg, #fff740 0%, #ff7eb3 100%)' }
];

const DesignCustomizer = () => {
  const { designId } = useParams();
  const [searchParams] = useSearchParams();
  const isPreviewOnly = searchParams.get('preview') === 'true';
  const navigate = useNavigate();
  const { user, token } = useAuth();

  // State
  const [loading, setLoading] = useState(!!designId);
  const [saving, setSaving] = useState(false);
  const [design, setDesign] = useState({
    name: '',
    description: '',
    category: 'chat',
    tags: '',
    design_data: {
      theme: 'default',
      animation: 'fadeIn',
      fontSize: 28,
      fontFamily: 'Pretendard',
      colors: {
        primary: '#3b82f6',
        secondary: '#8b5cf6',
        background: 'transparent',
        text: '#ffffff'
      },
      layout: {
        alignment: 'left',
        padding: 10,
        borderRadius: 8
      }
    },
    custom_css: ''
  });

  const [editorMode, setEditorMode] = useState('visual'); // visual | code
  const [activePanel, setActivePanel] = useState('theme'); // theme | style | layout
  const [previewKey, setPreviewKey] = useState(0);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [notification, setNotification] = useState(null);

  // Load design if editing
  useEffect(() => {
    if (designId && token) {
      fetchDesign();
    }
  }, [designId, token]);

  const fetchDesign = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/designs/${designId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        const designData = data.design;

        setDesign({
          name: designData.name || '',
          description: designData.description || '',
          category: designData.category || 'chat',
          tags: designData.tags || '',
          design_data: typeof designData.design_data === 'string'
            ? JSON.parse(designData.design_data)
            : designData.design_data || {},
          custom_css: designData.custom_css || ''
        });
      } else {
        showNotification('디자인을 불러올 수 없습니다.', 'error');
        navigate('/my-designs');
      }
    } catch (err) {
      showNotification('오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSave = async (asDraft = true) => {
    if (!design.name.trim()) {
      showNotification('디자인 이름을 입력해주세요.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: design.name,
        description: design.description,
        category: design.category,
        tags: design.tags,
        design_data: design.design_data,
        custom_css: design.custom_css
      };

      const url = designId
        ? `${API_URL}/api/designs/${designId}`
        : `${API_URL}/api/designs`;

      const res = await fetch(url, {
        method: designId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        showNotification('저장되었습니다!', 'success');

        if (!designId) {
          navigate(`/designer/${data.design.id}`, { replace: true });
        }
      } else {
        const data = await res.json();
        showNotification(data.error || '저장에 실패했습니다.', 'error');
      }
    } catch (err) {
      showNotification('저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setSaving(false);
      setShowSaveModal(false);
    }
  };

  const handleSubmit = async () => {
    if (!designId) {
      // 먼저 저장
      await handleSave(true);
      return;
    }

    if (!confirm('이 디자인을 마켓플레이스 심사에 제출하시겠습니까?\n제출 후에는 수정이 불가능합니다.')) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/designs/${designId}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        showNotification('심사에 제출되었습니다!', 'success');
        setTimeout(() => navigate('/my-designs'), 1500);
      } else {
        const data = await res.json();
        showNotification(data.error || '제출에 실패했습니다.', 'error');
      }
    } catch (err) {
      showNotification('제출 중 오류가 발생했습니다.', 'error');
    }
  };

  const updateDesignData = (key, value) => {
    setDesign(prev => ({
      ...prev,
      design_data: {
        ...prev.design_data,
        [key]: value
      }
    }));
    setPreviewKey(prev => prev + 1);
  };

  const updateColors = (key, value) => {
    setDesign(prev => ({
      ...prev,
      design_data: {
        ...prev.design_data,
        colors: {
          ...prev.design_data.colors,
          [key]: value
        }
      }
    }));
    setPreviewKey(prev => prev + 1);
  };

  const updateLayout = (key, value) => {
    setDesign(prev => ({
      ...prev,
      design_data: {
        ...prev.design_data,
        layout: {
          ...prev.design_data.layout,
          [key]: value
        }
      }
    }));
    setPreviewKey(prev => prev + 1);
  };

  const getCategoryIcon = (category) => {
    const type = overlayTypes.find(t => t.id === category);
    return type ? type.icon : <Package size={18} />;
  };

  if (loading) {
    return (
      <div className="customizer-loading">
        <RefreshCw size={32} className="spin" />
        <p>디자인 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="design-customizer">
      {/* 알림 */}
      {notification && (
        <div className={`customizer-notification ${notification.type}`}>
          {notification.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          {notification.message}
        </div>
      )}

      {/* 헤더 */}
      <header className="customizer-header">
        <div className="header-left">
          <Link to="/my-designs" className="back-link">
            <ChevronLeft size={20} />
            내 디자인
          </Link>
        </div>

        <div className="header-center">
          <input
            type="text"
            className="design-title-input"
            placeholder="디자인 이름 입력..."
            value={design.name}
            onChange={(e) => setDesign(prev => ({ ...prev, name: e.target.value }))}
            disabled={isPreviewOnly}
          />
        </div>

        <div className="header-right">
          <button className="header-btn preview-btn" onClick={() => setPreviewKey(prev => prev + 1)}>
            <RefreshCw size={16} />
            새로고침
          </button>
          {!isPreviewOnly && (
            <>
              <button
                className="header-btn save-btn"
                onClick={() => handleSave(true)}
                disabled={saving}
              >
                {saving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />}
                저장
              </button>
              <button
                className="header-btn submit-btn"
                onClick={handleSubmit}
                disabled={saving}
              >
                <Send size={16} />
                공유하기
              </button>
            </>
          )}
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <div className="customizer-main">
        {/* 좌측: 설정 패널 */}
        <aside className="customizer-sidebar">
          {/* 모드 토글 */}
          <div className="mode-toggle">
            <button
              className={`mode-btn ${editorMode === 'visual' ? 'active' : ''}`}
              onClick={() => setEditorMode('visual')}
            >
              <Palette size={16} />
              비주얼
            </button>
            <button
              className={`mode-btn ${editorMode === 'code' ? 'active' : ''}`}
              onClick={() => setEditorMode('code')}
            >
              <Code size={16} />
              코드
            </button>
          </div>

          {editorMode === 'visual' ? (
            <>
              {/* 오버레이 타입 선택 */}
              <div className="sidebar-section">
                <h3 className="section-title">오버레이 타입</h3>
                <div className="overlay-type-grid">
                  {overlayTypes.map(type => (
                    <button
                      key={type.id}
                      className={`type-btn ${design.category === type.id ? 'active' : ''}`}
                      onClick={() => setDesign(prev => ({ ...prev, category: type.id }))}
                      disabled={isPreviewOnly}
                    >
                      {type.icon}
                      <span>{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 패널 탭 */}
              <div className="panel-tabs">
                <button
                  className={`panel-tab ${activePanel === 'theme' ? 'active' : ''}`}
                  onClick={() => setActivePanel('theme')}
                >
                  <Sparkles size={16} />
                  테마
                </button>
                <button
                  className={`panel-tab ${activePanel === 'style' ? 'active' : ''}`}
                  onClick={() => setActivePanel('style')}
                >
                  <Palette size={16} />
                  스타일
                </button>
                <button
                  className={`panel-tab ${activePanel === 'layout' ? 'active' : ''}`}
                  onClick={() => setActivePanel('layout')}
                >
                  <Layout size={16} />
                  레이아웃
                </button>
              </div>

              {/* 테마 패널 */}
              {activePanel === 'theme' && (
                <div className="panel-content">
                  <h4>테마 선택</h4>
                  <div className="theme-grid">
                    {chatThemes.map(theme => (
                      <button
                        key={theme.id}
                        className={`theme-card ${design.design_data.theme === theme.id ? 'active' : ''}`}
                        onClick={() => updateDesignData('theme', theme.id)}
                        disabled={isPreviewOnly}
                      >
                        <div className="theme-preview" style={{ background: theme.preview }} />
                        <span>{theme.label}</span>
                      </button>
                    ))}
                  </div>

                  <h4>애니메이션</h4>
                  <select
                    value={design.design_data.animation || 'fadeIn'}
                    onChange={(e) => updateDesignData('animation', e.target.value)}
                    disabled={isPreviewOnly}
                  >
                    <option value="fadeIn">페이드 인</option>
                    <option value="slideIn">슬라이드 인</option>
                    <option value="bounceIn">바운스 인</option>
                    <option value="scaleIn">스케일 인</option>
                    <option value="none">없음</option>
                  </select>
                </div>
              )}

              {/* 스타일 패널 */}
              {activePanel === 'style' && (
                <div className="panel-content">
                  <h4>폰트</h4>
                  <select
                    value={design.design_data.fontFamily || 'Pretendard'}
                    onChange={(e) => updateDesignData('fontFamily', e.target.value)}
                    disabled={isPreviewOnly}
                  >
                    <option value="Pretendard">Pretendard</option>
                    <option value="Noto Sans KR">Noto Sans KR</option>
                    <option value="Nanum Gothic">나눔고딕</option>
                    <option value="Nanum Myeongjo">나눔명조</option>
                    <option value="D2Coding">D2Coding</option>
                    <option value="Gmarket Sans">Gmarket Sans</option>
                  </select>

                  <div className="range-input">
                    <label>폰트 크기: {design.design_data.fontSize || 28}px</label>
                    <input
                      type="range"
                      min="12"
                      max="48"
                      value={design.design_data.fontSize || 28}
                      onChange={(e) => updateDesignData('fontSize', parseInt(e.target.value))}
                      disabled={isPreviewOnly}
                    />
                  </div>

                  <h4>색상</h4>
                  <div className="color-inputs">
                    <div className="color-input">
                      <label>기본 색상</label>
                      <input
                        type="color"
                        value={design.design_data.colors?.primary || '#3b82f6'}
                        onChange={(e) => updateColors('primary', e.target.value)}
                        disabled={isPreviewOnly}
                      />
                    </div>
                    <div className="color-input">
                      <label>보조 색상</label>
                      <input
                        type="color"
                        value={design.design_data.colors?.secondary || '#8b5cf6'}
                        onChange={(e) => updateColors('secondary', e.target.value)}
                        disabled={isPreviewOnly}
                      />
                    </div>
                    <div className="color-input">
                      <label>텍스트 색상</label>
                      <input
                        type="color"
                        value={design.design_data.colors?.text || '#ffffff'}
                        onChange={(e) => updateColors('text', e.target.value)}
                        disabled={isPreviewOnly}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 레이아웃 패널 */}
              {activePanel === 'layout' && (
                <div className="panel-content">
                  <h4>정렬</h4>
                  <div className="alignment-buttons">
                    {['left', 'center', 'right'].map(align => (
                      <button
                        key={align}
                        className={`align-btn ${design.design_data.layout?.alignment === align ? 'active' : ''}`}
                        onClick={() => updateLayout('alignment', align)}
                        disabled={isPreviewOnly}
                      >
                        {align === 'left' ? '왼쪽' : align === 'center' ? '가운데' : '오른쪽'}
                      </button>
                    ))}
                  </div>

                  <div className="range-input">
                    <label>여백: {design.design_data.layout?.padding || 10}px</label>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      value={design.design_data.layout?.padding || 10}
                      onChange={(e) => updateLayout('padding', parseInt(e.target.value))}
                      disabled={isPreviewOnly}
                    />
                  </div>

                  <div className="range-input">
                    <label>모서리 둥글기: {design.design_data.layout?.borderRadius || 8}px</label>
                    <input
                      type="range"
                      min="0"
                      max="24"
                      value={design.design_data.layout?.borderRadius || 8}
                      onChange={(e) => updateLayout('borderRadius', parseInt(e.target.value))}
                      disabled={isPreviewOnly}
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            /* 코드 에디터 모드 */
            <div className="code-editor-container">
              <h3 className="section-title">커스텀 CSS</h3>
              <p className="code-help">
                CSS를 직접 작성하여 디자인을 커스터마이즈하세요.
              </p>
              <textarea
                className="code-editor"
                placeholder={`/* 커스텀 CSS를 입력하세요 */
.chat-message {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 10px 16px;
}

.chat-nickname {
  color: #ffd700;
  font-weight: bold;
}`}
                value={design.custom_css}
                onChange={(e) => setDesign(prev => ({ ...prev, custom_css: e.target.value }))}
                disabled={isPreviewOnly}
              />
            </div>
          )}

          {/* 디자인 정보 */}
          <div className="sidebar-section design-info-section">
            <h3 className="section-title">디자인 정보</h3>
            <div className="info-input">
              <label>설명</label>
              <textarea
                placeholder="디자인에 대한 간단한 설명..."
                value={design.description}
                onChange={(e) => setDesign(prev => ({ ...prev, description: e.target.value }))}
                disabled={isPreviewOnly}
                rows={3}
              />
            </div>
            <div className="info-input">
              <label>태그 (쉼표로 구분)</label>
              <input
                type="text"
                placeholder="네온, 사이버펑크, 게임..."
                value={design.tags}
                onChange={(e) => setDesign(prev => ({ ...prev, tags: e.target.value }))}
                disabled={isPreviewOnly}
              />
            </div>
          </div>
        </aside>

        {/* 우측: 미리보기 */}
        <main className="customizer-preview">
          <div className="preview-header">
            <h3>
              <Eye size={18} />
              실시간 미리보기
            </h3>
            <span className="preview-category">
              {getCategoryIcon(design.category)}
              {overlayTypes.find(t => t.id === design.category)?.label}
            </span>
          </div>

          <div className="preview-canvas" key={previewKey}>
            {/* 실제 미리보기 렌더링 영역 */}
            <div
              className="preview-content"
              style={{
                '--primary-color': design.design_data.colors?.primary || '#3b82f6',
                '--secondary-color': design.design_data.colors?.secondary || '#8b5cf6',
                '--text-color': design.design_data.colors?.text || '#ffffff',
                '--font-family': design.design_data.fontFamily || 'Pretendard',
                '--font-size': `${design.design_data.fontSize || 28}px`,
                '--padding': `${design.design_data.layout?.padding || 10}px`,
                '--border-radius': `${design.design_data.layout?.borderRadius || 8}px`,
                '--text-align': design.design_data.layout?.alignment || 'left'
              }}
            >
              {/* 샘플 채팅 메시지 */}
              {design.category === 'chat' && (
                <div className={`sample-chat theme-${design.design_data.theme}`}>
                  <div className="sample-message">
                    <span className="sample-nickname">스트리머</span>
                    <span className="sample-text">안녕하세요! 방송 시작합니다~</span>
                  </div>
                  <div className="sample-message">
                    <span className="sample-nickname">시청자123</span>
                    <span className="sample-text">오늘 컨텐츠 뭐해요?</span>
                  </div>
                  <div className="sample-message">
                    <span className="sample-nickname">팬클럽</span>
                    <span className="sample-text">ㅋㅋㅋㅋ 재밌다</span>
                  </div>
                </div>
              )}

              {/* 알림 샘플 */}
              {design.category === 'alert' && (
                <div className={`sample-alert theme-${design.design_data.theme}`}>
                  <div className="alert-icon">🎉</div>
                  <div className="alert-content">
                    <div className="alert-title">별풍선 1,000개</div>
                    <div className="alert-user">후원자님</div>
                    <div className="alert-message">항상 응원합니다!</div>
                  </div>
                </div>
              )}

              {/* 목표 샘플 */}
              {design.category === 'goal' && (
                <div className={`sample-goal theme-${design.design_data.theme}`}>
                  <div className="goal-title">후원 목표</div>
                  <div className="goal-progress">
                    <div className="goal-bar" style={{ width: '65%' }} />
                  </div>
                  <div className="goal-text">650,000 / 1,000,000원</div>
                </div>
              )}

              {/* 다른 오버레이 타입들의 샘플... */}
              {!['chat', 'alert', 'goal'].includes(design.category) && (
                <div className="sample-placeholder">
                  {getCategoryIcon(design.category)}
                  <p>{overlayTypes.find(t => t.id === design.category)?.label} 미리보기</p>
                </div>
              )}
            </div>

            {/* 커스텀 CSS 적용 */}
            {design.custom_css && (
              <style>{design.custom_css}</style>
            )}
          </div>

          <div className="preview-info">
            <p>미리보기는 실제 오버레이의 근사치입니다. 실제 적용 시 약간의 차이가 있을 수 있습니다.</p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DesignCustomizer;
