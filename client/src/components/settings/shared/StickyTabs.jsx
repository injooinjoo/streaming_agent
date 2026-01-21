import React from 'react';

/**
 * 섹션 네비게이션 탭 컴포넌트
 *
 * @param {object} props
 * @param {Array} props.tabs - 탭 목록 [{id, label, icon}]
 * @param {string} props.activeTab - 현재 활성 탭 ID
 * @param {function} props.onTabClick - 탭 클릭 핸들러
 * @param {string} props.className - 추가 클래스명
 */
const StickyTabs = ({ tabs, activeTab, onTabClick, className = '' }) => {
  return (
    <div className={`sticky-tabs ${className}`}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`settings-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabClick(tab.id)}
        >
          {tab.icon} {tab.label}
        </button>
      ))}
    </div>
  );
};

export default StickyTabs;
