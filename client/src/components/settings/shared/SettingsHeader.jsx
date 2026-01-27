import React from 'react';
import {
  Copy, RefreshCw, Trash2, Monitor, ExternalLink, HelpCircle, Info, Check
} from 'lucide-react';

/**
 * 설정 페이지 헤더 컴포넌트
 *
 * @param {object} props
 * @param {string} props.title - 페이지 제목
 * @param {string} props.overlayType - 오버레이 타입 (chat, alerts, goals 등)
 * @param {string} props.overlayHash - 사용자 오버레이 해시
 * @param {boolean} props.copied - URL 복사됨 상태
 * @param {function} props.onCopyUrl - URL 복사 핸들러
 * @param {function} props.onRefresh - 새로고침 핸들러
 * @param {function} props.onReset - 초기화 핸들러
 * @param {function} props.onOpenExternal - 새창 열기 핸들러
 * @param {React.ReactNode} props.badges - 뱃지 요소들
 * @param {string} props.infoText - 안내 텍스트
 * @param {boolean} props.showGuideButton - 설정 가이드 버튼 표시 여부
 */
const SettingsHeader = ({
  title,
  overlayType,
  overlayHash,
  copied = false,
  onCopyUrl,
  onRefresh,
  onReset,
  onOpenExternal,
  badges,
  infoText,
  showGuideButton = true
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
    if (overlayUrl) {
      if (onOpenExternal) {
        onOpenExternal();
      } else {
        window.open(overlayUrl, '_blank');
      }
    }
  };

  return (
    <div className="premium-settings-header animate-fade">
      <div className="header-top-row">
        <div className="title-area">
          <h2 className="title-text">{title}</h2>
          {badges && (
            <div className="badge-wrapper">
              {badges}
            </div>
          )}
        </div>
        <div className="action-area">
          <button
            className="btn-copy-url"
            onClick={handleCopy}
            disabled={!overlayHash}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? '복사됨' : 'URL 복사'}
          </button>
          {showGuideButton && (
            <button className="btn-setup-guide">
              <HelpCircle size={16} /> 설정 가이드
            </button>
          )}
          <button
            className="btn-external-view"
            onClick={handleOpenExternal}
            disabled={!overlayHash}
          >
            <ExternalLink size={16} /> 새창으로 열기
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsHeader;
