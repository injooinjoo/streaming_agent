# Custom Hooks

Settings 컴포넌트에서 재사용 가능한 커스텀 훅들입니다.

## 훅 목록

### useSettingsForm

설정 폼의 fetch/save/reset 로직을 관리합니다.

```jsx
import { useSettingsForm } from '../hooks';
import { useToast } from '../contexts/ToastContext';

const defaultSettings = { theme: 'default', fontSize: 28 };

const MySettings = () => {
  const { showSuccess, showError } = useToast();

  const {
    settings,
    loading,
    saving,
    updateSetting,
    saveSettings,
    resetSettings,
    fetchSettings
  } = useSettingsForm('myKey', defaultSettings, {
    onSaveSuccess: () => showSuccess('설정이 저장되었습니다.'),
    onError: (e) => showError(e.message)
  });

  if (loading) return <div>로딩 중...</div>;

  return (
    <div>
      <input
        value={settings.theme}
        onChange={(e) => updateSetting('theme', e.target.value)}
      />
      <button onClick={saveSettings} disabled={saving}>
        {saving ? '저장 중...' : '저장'}
      </button>
    </div>
  );
};
```

### useSectionNavigation

섹션 스크롤 네비게이션을 관리합니다.

```jsx
import { useSectionNavigation } from '../hooks';

const SECTIONS = ['theme', 'detail', 'font'];

const MySettings = () => {
  const { activeNav, scrollToSection, setSectionRef } = useSectionNavigation(SECTIONS);

  return (
    <div>
      {/* 네비게이션 탭 */}
      <div className="sticky-tabs">
        {SECTIONS.map(id => (
          <button
            key={id}
            className={activeNav === id ? 'active' : ''}
            onClick={() => scrollToSection(id)}
          >
            {id}
          </button>
        ))}
      </div>

      {/* 섹션들 */}
      <section ref={setSectionRef('theme')} data-section="theme">
        테마 설정
      </section>
      <section ref={setSectionRef('detail')} data-section="detail">
        상세 설정
      </section>
      <section ref={setSectionRef('font')} data-section="font">
        폰트 설정
      </section>
    </div>
  );
};
```

### useOverlayUrl

오버레이 URL 생성 및 복사를 관리합니다.

```jsx
import { useOverlayUrl } from '../hooks';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const MySettings = () => {
  const { user } = useAuth();
  const { showSuccess } = useToast();

  const {
    overlayUrl,
    copied,
    copyOverlayUrl,
    openOverlay
  } = useOverlayUrl(user?.userHash, 'chat', {
    onCopySuccess: () => showSuccess('URL이 복사되었습니다.')
  });

  return (
    <div>
      <input readOnly value={overlayUrl || '로그인 필요'} />
      <button onClick={copyOverlayUrl}>
        {copied ? '복사됨!' : 'URL 복사'}
      </button>
      <button onClick={openOverlay}>
        새창으로 열기
      </button>
    </div>
  );
};
```

## 공통 컴포넌트

`components/settings/shared/` 디렉토리에서 제공됩니다.

```jsx
import {
  SettingsHeader,
  StickyTabs,
  SettingsRow,
  RangeSlider,
  ColorPicker,
  ThemeGrid
} from '../components/settings/shared';
```

### SettingsHeader

설정 페이지 헤더 (제목, URL 복사, 버튼들)

### StickyTabs

고정 네비게이션 탭

### SettingsRow

레이블 + 컨트롤 레이아웃

### RangeSlider

슬라이더 + 값 표시

### ColorPicker

색상 선택기 + 프리셋

### ThemeGrid

테마 선택 그리드
