import React from 'react';
import { Check, Copy, ExternalLink, HelpCircle } from 'lucide-react';
import { StatusBadge } from '../../shared/studio';

const SettingsHeader = ({
  title,
  overlayType,
  overlayHash,
  copied = false,
  onCopyUrl,
  onOpenExternal,
  badges,
  infoText,
  showGuideButton = true,
}) => {
  const overlayUrl = overlayHash
    ? `${window.location.origin}/overlay/${overlayHash}/${overlayType}`
    : '';

  const handleCopy = () => {
    if (overlayUrl && onCopyUrl) {
      onCopyUrl(overlayUrl);
    }
  };

  const handleOpenExternal = () => {
    if (!overlayUrl) return;

    if (onOpenExternal) {
      onOpenExternal();
      return;
    }

    window.open(overlayUrl, '_blank');
  };

  return (
    <div className="premium-settings-header animate-fade">
      <div className="header-top-row">
        <div className="title-area">
          <div className="badge-wrapper">
            <StatusBadge className="studio-accent--blue">Overlay Settings</StatusBadge>
            {badges}
          </div>
          <h2 className="title-text">{title}</h2>
          {infoText ? <p className="settings-header__info">{infoText}</p> : null}
        </div>

        <div className="action-area">
          <button className="btn-copy-url" onClick={handleCopy} disabled={!overlayHash}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? '복사됨' : 'URL 복사'}
          </button>
          {showGuideButton ? (
            <button className="btn-setup-guide" type="button">
              <HelpCircle size={16} />
              설정 가이드
            </button>
          ) : null}
          <button className="btn-external-view" onClick={handleOpenExternal} disabled={!overlayHash}>
            <ExternalLink size={16} />
            새 창에서 보기
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsHeader;
