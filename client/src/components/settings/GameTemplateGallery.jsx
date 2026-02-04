import React, { useState, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Eye, Gift, Download, Users, Bell, QrCode, Sparkles, Tag, X, Ticket, Target } from 'lucide-react';
import { TEMPLATE_TYPES, GAME_FILTERS, NEXON_TEMPLATES } from './gameTemplateData';
import './GameTemplateGallery.css';

const TYPE_ICONS = {
  'qr-install': <QrCode size={12} />,
  'event-promo': <Sparkles size={12} />,
  'coupon': <Tag size={12} />,
  'download-cta': <Download size={12} />,
  'friend-invite': <Users size={12} />,
  'new-update': <Bell size={12} />,
  'promo-code': <Ticket size={12} />,
  'mission-gauge': <Target size={12} />,
};

const TYPE_COLORS = {
  'qr-install': '#10b981',
  'event-promo': '#f59e0b',
  'coupon': '#ef4444',
  'download-cta': '#3b82f6',
  'friend-invite': '#8b5cf6',
  'new-update': '#06b6d4',
  'promo-code': '#f472b6',
  'mission-gauge': '#a78bfa',
};

const MiniQR = ({ url, size = 64 }) => (
  <QRCodeSVG
    value={url}
    size={size}
    bgColor="transparent"
    fgColor="white"
    level="L"
    style={{ borderRadius: 4 }}
  />
);

const MiniPreview = ({ template }) => {
  const { type, previewData, gameIcon, color } = template;
  const gradientStyle = { background: `linear-gradient(135deg, ${color[0]}22, ${color[1]}22)` };

  switch (type) {
    case 'qr-install':
      return (
        <div className="mini-preview-content mini-qr">
          <MiniQR url={previewData.qrUrl} size={56} />
          <div className="mini-qr-info">
            <span className="mini-game-icon">{gameIcon}</span>
            <span className="mini-cta" style={{ background: `linear-gradient(135deg, ${color[0]}, ${color[1]})` }}>
              {previewData.ctaText}
            </span>
          </div>
        </div>
      );

    case 'event-promo':
      return (
        <div className="mini-preview-content mini-event" style={gradientStyle}>
          <div className="mini-event-badge" style={{ background: `linear-gradient(135deg, ${color[0]}, ${color[1]})` }}>
            EVENT
          </div>
          <div className="mini-event-title">{previewData.eventTitle}</div>
          <div className="mini-event-period">{previewData.period}</div>
        </div>
      );

    case 'coupon':
      return (
        <div className="mini-preview-content mini-coupon">
          <Gift size={18} style={{ color: color[0], marginBottom: 6 }} />
          <div className="mini-coupon-code" style={{ borderColor: `${color[0]}66` }}>
            {previewData.couponCode}
          </div>
          <div className="mini-coupon-reward">{previewData.reward}</div>
        </div>
      );

    case 'download-cta':
      return (
        <div className="mini-preview-content mini-download">
          <div className="mini-download-icon">{gameIcon}</div>
          <div className="mini-download-name">{previewData.headline}</div>
          <div className="mini-download-btn" style={{ background: `linear-gradient(135deg, ${color[0]}, ${color[1]})` }}>
            {previewData.ctaText}
          </div>
        </div>
      );

    case 'friend-invite':
      return (
        <div className="mini-preview-content mini-invite">
          <Users size={18} style={{ color: color[0], marginBottom: 4 }} />
          <div className="mini-invite-code">{previewData.inviteCode}</div>
          <div className="mini-invite-count">{previewData.count}</div>
        </div>
      );

    case 'new-update':
      return (
        <div className="mini-preview-content mini-update" style={gradientStyle}>
          <div className="mini-update-version" style={{ background: `linear-gradient(135deg, ${color[0]}, ${color[1]})` }}>
            {previewData.version}
          </div>
          <div className="mini-update-title">{previewData.updateTitle}</div>
          <div className="mini-update-count">{previewData.highlights.length}개 변경사항</div>
        </div>
      );

    case 'promo-code':
      return (
        <div className="mini-preview-content mini-promo">
          <Ticket size={18} style={{ color: color[0], marginBottom: 4 }} />
          <div className="mini-promo-code" style={{ borderColor: `${color[0]}88` }}>
            {previewData.promoCode}
          </div>
          <div className="mini-promo-benefit">{previewData.benefit}</div>
        </div>
      );

    case 'mission-gauge': {
      const percent = Math.round((previewData.current / previewData.goal) * 100);
      return (
        <div className="mini-preview-content mini-mission">
          <div className="mini-mission-title">{previewData.missionTitle}</div>
          <div className="mini-mission-bar-wrap">
            <div
              className="mini-mission-bar-fill"
              style={{ width: `${percent}%`, background: `linear-gradient(90deg, ${color[0]}, ${color[1]})` }}
            />
          </div>
          <div className="mini-mission-label">
            {previewData.current}/{previewData.goal} {previewData.unit} ({percent}%)
          </div>
        </div>
      );
    }

    default:
      return null;
  }
};

const FullPreview = ({ template, onClose }) => {
  const { type, previewData, gameIcon, title, color } = template;

  const renderContent = () => {
    switch (type) {
      case 'qr-install':
        return (
          <div className="full-preview-qr">
            <div className="full-qr-header">
              <span className="full-game-icon">{gameIcon}</span>
              <div>
                <div className="full-qr-subtitle">{previewData.subtitle}</div>
                <div className="full-qr-tagline">{previewData.tagline}</div>
              </div>
            </div>
            <div className="full-qr-body">
              <div className="full-qr-code-wrapper" style={{ borderColor: `${color[0]}44` }}>
                <QRCodeSVG value={previewData.qrUrl} size={140} bgColor="transparent" fgColor="white" level="M" />
              </div>
              <div className="full-qr-scan-text">QR 코드를 스캔하세요</div>
              <button className="full-cta-btn" style={{ background: `linear-gradient(135deg, ${color[0]}, ${color[1]})` }}>
                {previewData.ctaText}
              </button>
            </div>
          </div>
        );

      case 'event-promo':
        return (
          <div className="full-preview-event">
            <div className="full-event-banner" style={{ background: `linear-gradient(135deg, ${color[0]}33, ${color[1]}33)` }}>
              <div className="full-event-badge" style={{ background: `linear-gradient(135deg, ${color[0]}, ${color[1]})` }}>
                {gameIcon} EVENT
              </div>
              <h2 className="full-event-title">{previewData.eventTitle}</h2>
              <p className="full-event-subtitle">{previewData.eventSubtitle}</p>
              <div className="full-event-period">
                <span className="period-icon">📅</span> {previewData.period}
              </div>
              <div className="full-event-reward">
                <span className="reward-icon">🎁</span> {previewData.reward}
              </div>
              <button className="full-cta-btn" style={{ background: `linear-gradient(135deg, ${color[0]}, ${color[1]})` }}>
                {previewData.ctaText}
              </button>
            </div>
          </div>
        );

      case 'coupon':
        return (
          <div className="full-preview-coupon">
            <div className="full-coupon-header">
              <Gift size={28} style={{ color: color[0] }} />
              <span>{gameIcon} 시청자 전용 쿠폰</span>
            </div>
            <div className="full-coupon-code-box" style={{ borderColor: color[0] }}>
              <div className="full-coupon-code">{previewData.couponCode}</div>
              <div className="full-coupon-copy-hint">클릭하여 복사</div>
            </div>
            <div className="full-coupon-reward">
              <span className="reward-icon">🎁</span> {previewData.reward}
            </div>
            <div className="full-coupon-expiry">
              <span className="expiry-icon">⏰</span> {previewData.expiry}
            </div>
            <button className="full-cta-btn" style={{ background: `linear-gradient(135deg, ${color[0]}, ${color[1]})` }}>
              {previewData.ctaText}
            </button>
          </div>
        );

      case 'download-cta':
        return (
          <div className="full-preview-download">
            <div className="full-download-icon">{gameIcon}</div>
            <h2 className="full-download-name">{previewData.headline}</h2>
            <p className="full-download-tagline">{previewData.tagline}</p>
            <div className="full-download-stats">
              {Object.entries(previewData.stats).map(([key, value]) => (
                <div key={key} className="full-download-stat">
                  <div className="stat-value">{value}</div>
                  <div className="stat-label">
                    {key === 'players' ? '유저' : key === 'rating' ? '평점' : key === 'years' ? '역사' : key === 'matches' ? '매치' : key === 'maps' ? '맵' : key === 'classes' ? '직업' : key === 'tracks' ? '트랙' : key}
                  </div>
                </div>
              ))}
            </div>
            <button className="full-cta-btn full-cta-large" style={{ background: `linear-gradient(135deg, ${color[0]}, ${color[1]})` }}>
              <Download size={18} /> {previewData.ctaText}
            </button>
          </div>
        );

      case 'friend-invite':
        return (
          <div className="full-preview-invite">
            <div className="full-invite-header">
              <Users size={24} style={{ color: color[0] }} />
              <span>{gameIcon} 친구 초대 이벤트</span>
            </div>
            <div className="full-invite-body">
              <div className="full-invite-left">
                <div className="full-invite-code-label">초대 코드</div>
                <div className="full-invite-code" style={{ borderColor: color[0] }}>
                  {previewData.inviteCode}
                </div>
                <div className="full-invite-count">{previewData.count}</div>
              </div>
              <div className="full-invite-right">
                <QRCodeSVG value={previewData.qrUrl} size={100} bgColor="transparent" fgColor="white" level="L" />
              </div>
            </div>
            <div className="full-invite-reward">
              <span className="reward-icon">🎁</span> {previewData.reward}
            </div>
            <button className="full-cta-btn" style={{ background: `linear-gradient(135deg, ${color[0]}, ${color[1]})` }}>
              {previewData.ctaText}
            </button>
          </div>
        );

      case 'new-update':
        return (
          <div className="full-preview-update">
            <div className="full-update-header">
              <div className="full-update-version" style={{ background: `linear-gradient(135deg, ${color[0]}, ${color[1]})` }}>
                {previewData.version}
              </div>
              <span className="full-update-game">{gameIcon}</span>
            </div>
            <h2 className="full-update-title">{previewData.updateTitle}</h2>
            <ul className="full-update-highlights">
              {previewData.highlights.map((h, i) => (
                <li key={i}>
                  <span className="highlight-bullet" style={{ background: color[0] }} />
                  {h}
                </li>
              ))}
            </ul>
            <button className="full-cta-btn" style={{ background: `linear-gradient(135deg, ${color[0]}, ${color[1]})` }}>
              {previewData.ctaText}
            </button>
          </div>
        );

      case 'promo-code':
        return (
          <div className="full-preview-promo">
            <div className="full-promo-header">
              <Ticket size={28} style={{ color: color[0] }} />
              <span>{gameIcon} {previewData.promoTitle}</span>
            </div>
            <div className="full-promo-code-box" style={{ borderColor: color[0] }}>
              <div className="full-promo-code">{previewData.promoCode}</div>
              <div className="full-promo-copy-hint">클릭하여 복사</div>
            </div>
            <div className="full-promo-benefit">
              <span className="reward-icon">🎁</span> {previewData.benefit}
            </div>
            <div className="full-promo-valid">
              <span className="expiry-icon">⏰</span> {previewData.validUntil}
            </div>
            <button className="full-cta-btn" style={{ background: `linear-gradient(135deg, ${color[0]}, ${color[1]})` }}>
              {previewData.ctaText}
            </button>
          </div>
        );

      case 'mission-gauge': {
        const pct = Math.round((previewData.current / previewData.goal) * 100);
        return (
          <div className="full-preview-mission">
            <div className="full-mission-header">
              <Target size={24} style={{ color: color[0] }} />
              <span>{gameIcon} {previewData.missionTitle}</span>
            </div>
            <div className="full-mission-gauge-wrap">
              <div className="full-mission-gauge-bg">
                <div
                  className="full-mission-gauge-fill"
                  style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color[0]}, ${color[1]})` }}
                />
              </div>
              <div className="full-mission-gauge-label">
                <span className="full-mission-current">{previewData.current}</span>
                <span className="full-mission-sep">/</span>
                <span className="full-mission-goal">{previewData.goal} {previewData.unit}</span>
                <span className="full-mission-pct" style={{ color: color[0] }}>({pct}%)</span>
              </div>
            </div>
            <div className="full-mission-milestones">
              {previewData.milestones.map((m, i) => {
                const reached = previewData.current >= (m.at / previewData.goal) * previewData.goal;
                return (
                  <div key={i} className={`full-milestone ${reached ? 'reached' : ''}`}>
                    <div className="milestone-dot" style={{ background: reached ? color[0] : 'rgba(255,255,255,0.2)' }}>
                      {reached ? '✓' : m.at}
                    </div>
                    <div className="milestone-info">
                      <div className="milestone-at">{m.at}{previewData.unit} 달성</div>
                      <div className="milestone-reward">{m.reward}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <button className="full-cta-btn" style={{ background: `linear-gradient(135deg, ${color[0]}, ${color[1]})` }}>
              {previewData.ctaText}
            </button>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="full-preview-wrapper">
      <div className="full-preview-toolbar">
        <span className="full-preview-label">{gameIcon} {title}</span>
        <button className="full-preview-close" onClick={onClose}><X size={16} /></button>
      </div>
      <div className="full-preview-area">
        {renderContent()}
      </div>
      <div className="full-preview-info">
        이 오버레이는 예시입니다. 실제 사용 시 게임 연동 후 커스터마이즈할 수 있습니다.
      </div>
    </div>
  );
};

const GameTemplateGallery = ({ onSelectTemplate, selectedTemplate }) => {
  const [typeFilter, setTypeFilter] = useState('all');
  const [gameFilter, setGameFilter] = useState('all');

  const filtered = useMemo(() => {
    return NEXON_TEMPLATES.filter(t => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (gameFilter !== 'all' && t.game !== gameFilter) return false;
      return true;
    });
  }, [typeFilter, gameFilter]);

  return (
    <div className="template-gallery">
      {/* 유형 필터 */}
      <div className="template-filter-section">
        <div className="template-type-tabs">
          {TEMPLATE_TYPES.map(t => (
            <button
              key={t.id}
              className={`template-type-tab ${typeFilter === t.id ? 'active' : ''}`}
              onClick={() => setTypeFilter(t.id)}
            >
              {TYPE_ICONS[t.id] && <span className="tab-icon">{TYPE_ICONS[t.id]}</span>}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 게임 필터 */}
      <div className="template-game-tabs">
        {GAME_FILTERS.map(g => (
          <button
            key={g.id}
            className={`template-game-tab ${gameFilter === g.id ? 'active' : ''}`}
            onClick={() => setGameFilter(g.id)}
          >
            {g.icon} {g.label}
          </button>
        ))}
      </div>

      {/* 결과 카운트 */}
      <div className="template-count">
        {filtered.length}개 템플릿
      </div>

      {/* 카드 그리드 */}
      <div className="template-grid">
        {filtered.map(template => (
          <div
            key={template.id}
            className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
            onClick={() => onSelectTemplate(selectedTemplate?.id === template.id ? null : template)}
          >
            <div className="template-card-preview">
              <div className="template-card-game-badge">
                {template.gameIcon}
              </div>
              <MiniPreview template={template} />
            </div>
            <div className="template-card-info">
              <div className="template-card-title">{template.title}</div>
              <div className="template-card-desc">{template.description}</div>
              <div className="template-card-meta">
                <span
                  className="template-type-badge"
                  style={{ background: `${TYPE_COLORS[template.type]}20`, color: TYPE_COLORS[template.type] }}
                >
                  {TYPE_ICONS[template.type]}
                  {TEMPLATE_TYPES.find(t => t.id === template.type)?.label}
                </span>
                <button
                  className="template-preview-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTemplate(template);
                  }}
                >
                  <Eye size={12} /> 미리보기
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 선택된 템플릿 대형 프리뷰 */}
      {selectedTemplate && (
        <FullPreview
          template={selectedTemplate}
          onClose={() => onSelectTemplate(null)}
        />
      )}
    </div>
  );
};

export default GameTemplateGallery;
