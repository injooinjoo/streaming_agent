import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config/api';

/**
 * 설정 폼 관리를 위한 커스텀 훅
 *
 * @param {string} settingsKey - 설정 키 (chat, alert, goal 등)
 * @param {object} defaultSettings - 기본 설정값
 * @param {object} options - 추가 옵션
 * @param {function} options.mergeStrategy - 커스텀 병합 전략 (선택)
 * @param {function} options.onSaveSuccess - 저장 성공 콜백 (선택)
 * @param {function} options.onError - 에러 콜백 (선택)
 * @returns {object} 설정 폼 상태 및 함수들
 */
const useSettingsForm = (settingsKey, defaultSettings, options = {}) => {
  const {
    mergeStrategy,
    onSaveSuccess,
    onError
  } = options;

  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  // 안전한 JSON 파싱
  const safeJsonParse = (value, fallback) => {
    if (!value || value === '{}') return fallback;
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch (e) {
      console.error('JSON 파싱 에러:', e);
      return fallback;
    }
  };

  // 설정 불러오기
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/settings/${settingsKey}`);

      if (!res.ok) {
        throw new Error(`설정 조회 실패: ${res.status}`);
      }

      const data = await res.json();

      if (data.value) {
        const parsed = safeJsonParse(data.value, {});

        // 커스텀 병합 전략이 있으면 사용, 없으면 기본 병합
        const mergedSettings = mergeStrategy
          ? mergeStrategy(defaultSettings, parsed)
          : { ...defaultSettings, ...parsed };

        setSettings(mergedSettings);
      }
    } catch (e) {
      console.error('설정 조회 에러:', e);
      setError(e.message);
      onError?.(e);
    } finally {
      setLoading(false);
    }
  }, [settingsKey, defaultSettings, mergeStrategy, onError]);

  // 설정 저장
  const saveSettings = useCallback(async () => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: settingsKey, value: settings })
      });

      if (!res.ok) {
        throw new Error(`설정 저장 실패: ${res.status}`);
      }

      setIsDirty(false);
      onSaveSuccess?.();
      return true;
    } catch (e) {
      console.error('설정 저장 에러:', e);
      setError(e.message);
      onError?.(e);
      return false;
    } finally {
      setSaving(false);
    }
  }, [settingsKey, settings, onSaveSuccess, onError]);

  // 설정 초기화
  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
    setIsDirty(true);
  }, [defaultSettings]);

  // 설정 업데이트 (단일 필드)
  const updateSetting = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }, []);

  // 설정 업데이트 (중첩 필드, 예: colors.streamer.nick)
  const updateNestedSetting = useCallback((path, value) => {
    setSettings(prev => {
      const keys = path.split('.');
      const newSettings = { ...prev };
      let current = newSettings;

      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
    setIsDirty(true);
  }, []);

  // 여러 설정 한번에 업데이트
  const updateSettings = useCallback((updates) => {
    setSettings(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  }, []);

  // 초기 로드
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    // 상태
    settings,
    setSettings,
    loading,
    saving,
    error,
    isDirty,

    // 액션
    fetchSettings,
    saveSettings,
    resetSettings,
    updateSetting,
    updateNestedSetting,
    updateSettings
  };
};

export default useSettingsForm;
