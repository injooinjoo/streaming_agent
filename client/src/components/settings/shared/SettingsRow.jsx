import React from 'react';
import { HelpCircle } from 'lucide-react';

/**
 * 설정 폼 Row 컴포넌트
 * 레이블과 컨트롤을 표준화된 레이아웃으로 표시합니다.
 *
 * @param {object} props
 * @param {string} props.label - 레이블 텍스트
 * @param {string} props.description - 설명 텍스트 (선택)
 * @param {string} props.tooltip - 툴팁 텍스트 (선택)
 * @param {boolean} props.required - 필수 표시 여부
 * @param {React.ReactNode} props.children - 컨트롤 요소
 * @param {string} props.className - 추가 클래스명
 * @param {boolean} props.inline - 인라인 레이아웃 여부
 */
const SettingsRow = ({
  label,
  description,
  tooltip,
  required = false,
  children,
  className = '',
  inline = true
}) => {
  return (
    <div className={`settings-row ${inline ? 'inline' : 'stacked'} ${className}`}>
      <div className="settings-row-label">
        <span className="label-text">
          {label}
          {required && <span className="required">*</span>}
        </span>
        {tooltip && (
          <span className="label-tooltip" title={tooltip}>
            <HelpCircle size={14} />
          </span>
        )}
        {description && (
          <span className="label-description">{description}</span>
        )}
      </div>
      <div className="settings-row-control">
        {children}
      </div>
    </div>
  );
};

export default SettingsRow;
