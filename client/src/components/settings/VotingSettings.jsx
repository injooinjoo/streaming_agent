import React, { useState, useEffect } from 'react';
import {
  Copy, RefreshCw, Save, ExternalLink, Plus, Trash2,
  Vote, Check, Play, StopCircle, BarChart3
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../config/api';
import socket from '../../config/socket';
import { OverlayPreviewWrapper } from './shared';
import VotingOverlay from '../VotingOverlay';
import LoadingSpinner from '../shared/LoadingSpinner';
import './ChatSettings.css';

const defaultColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const VotingSettings = () => {
  const { token, user } = useAuth();
  const [settings, setSettings] = useState({
    showPercentage: true,
    showCount: true,
    animateChanges: true,
    theme: 'default'
  });
  const [currentPoll, setCurrentPoll] = useState(null);
  const [newPoll, setNewPoll] = useState({
    title: '',
    options: [
      { text: '옵션 1', color: defaultColors[0] },
      { text: '옵션 2', color: defaultColors[1] }
    ],
    duration: 60
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const overlayHash = user?.userHash || null;

  // Preview poll for demonstration
  const previewPoll = currentPoll || {
    id: 'preview',
    title: '미리보기 투표',
    options: [
      { id: 0, text: '옵션 A', color: defaultColors[0], votes: 35 },
      { id: 1, text: '옵션 B', color: defaultColors[1], votes: 25 },
      { id: 2, text: '옵션 C', color: defaultColors[2], votes: 40 }
    ],
    status: 'active',
    duration: 60
  };

  const overlayUrl = overlayHash
    ? `${window.location.origin}/overlay/${overlayHash}/voting`
    : '';

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/user-settings/voting`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.value && data.value !== '{}') {
        setSettings(prev => ({ ...prev, ...JSON.parse(data.value) }));
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/user-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ key: 'voting', value: settings })
      });
      socket.emit('settings-update', { key: 'voting', userHash: overlayHash });
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(overlayUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const addOption = () => {
    if (newPoll.options.length >= 6) return;
    const newColor = defaultColors[newPoll.options.length % defaultColors.length];
    setNewPoll(prev => ({
      ...prev,
      options: [...prev.options, { text: `옵션 ${prev.options.length + 1}`, color: newColor }]
    }));
  };

  const removeOption = (index) => {
    if (newPoll.options.length <= 2) return;
    setNewPoll(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const updateOption = (index, field, value) => {
    setNewPoll(prev => ({
      ...prev,
      options: prev.options.map((opt, i) =>
        i === index ? { ...opt, [field]: value } : opt
      )
    }));
  };

  const startPoll = () => {
    if (!newPoll.title.trim()) {
      alert('투표 제목을 입력해주세요.');
      return;
    }

    const poll = {
      id: Date.now(),
      title: newPoll.title,
      options: newPoll.options.map((opt, idx) => ({
        id: idx,
        text: opt.text,
        color: opt.color,
        votes: 0
      })),
      duration: newPoll.duration,
      status: 'active',
      startedAt: new Date().toISOString()
    };

    setCurrentPoll(poll);

    if (overlayHash) {
      socket.emit('poll-start', { userHash: overlayHash, poll });
    }
  };

  const endPoll = () => {
    if (currentPoll && overlayHash) {
      socket.emit('poll-end', {
        userHash: overlayHash,
        pollId: currentPoll.id,
        results: currentPoll.options
      });
    }
    setCurrentPoll(null);
  };

  const simulateVote = (optionId) => {
    if (!currentPoll) return;

    setCurrentPoll(prev => ({
      ...prev,
      options: prev.options.map(opt =>
        opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
      )
    }));

    if (overlayHash) {
      const newCount = currentPoll.options.find(o => o.id === optionId).votes + 1;
      socket.emit('poll-vote', {
        userHash: overlayHash,
        pollId: currentPoll.id,
        optionId,
        newCount
      });
    }
  };

  useEffect(() => {
    if (token) {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [token]);

  if (loading) {
    return (
      <div className="settings-panel">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <>
      <div className="premium-settings-header">
        <div className="header-top-row">
          <div className="title-area">
            <Vote size={28} />
            <span className="title-text">투표 시스템</span>
            <div className="badge-wrapper">
              <span className="badge-new">NEW</span>
            </div>
          </div>
          <div className="action-area">
            <button className="btn-copy-url" onClick={copyUrl}>
              {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? '복사됨' : 'URL 복사'}
            </button>
            <button className="btn-external-view" onClick={() => window.open(overlayUrl, '_blank')}>
              <ExternalLink size={16} /> 오버레이 보기
            </button>
          </div>
        </div>
      </div>

      <div className="chat-settings-container">
        <div className="chat-settings-main">
          {/* 디스플레이 설정 */}
          <div className="settings-card glass-premium">
            <div className="card-header">
              <h3>디스플레이 설정</h3>
            </div>

            <div className="checkbox-grid-refined">
              <label>
                <input
                  type="checkbox"
                  checked={settings.showPercentage}
                  onChange={(e) => setSettings(prev => ({ ...prev, showPercentage: e.target.checked }))}
                />
                퍼센트 표시
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={settings.showCount}
                  onChange={(e) => setSettings(prev => ({ ...prev, showCount: e.target.checked }))}
                />
                투표 수 표시
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={settings.animateChanges}
                  onChange={(e) => setSettings(prev => ({ ...prev, animateChanges: e.target.checked }))}
                />
                애니메이션 효과
              </label>
            </div>
          </div>

          {/* 현재 투표 상태 */}
          {currentPoll && (
            <div className="settings-card glass-premium active-poll-card">
              <div className="card-header">
                <h3>진행 중인 투표</h3>
                <button className="btn-end-poll" onClick={endPoll}>
                  <StopCircle size={16} /> 투표 종료
                </button>
              </div>

              <div className="poll-title-display">{currentPoll.title}</div>

              <div className="poll-options-display">
                {currentPoll.options.map((option) => {
                  const totalVotes = currentPoll.options.reduce((sum, o) => sum + o.votes, 0);
                  const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;

                  return (
                    <div key={option.id} className="poll-option-item" onClick={() => simulateVote(option.id)}>
                      <div className="option-header">
                        <span className="option-text">{option.text}</span>
                        <span className="option-stats">
                          {option.votes}표 ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="option-bar">
                        <div
                          className="option-bar-fill"
                          style={{ width: `${percentage}%`, backgroundColor: option.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="simulate-hint">옵션을 클릭하면 테스트 투표가 됩니다.</p>
            </div>
          )}

          {/* 새 투표 만들기 */}
          {!currentPoll && (
            <div className="settings-card glass-premium">
              <div className="card-header">
                <h3>새 투표 만들기</h3>
              </div>

              <div className="settings-row-pair vertical">
                <span className="row-label">투표 제목</span>
                <input
                  type="text"
                  className="styled-input"
                  value={newPoll.title}
                  onChange={(e) => setNewPoll(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="투표 제목을 입력하세요..."
                />
              </div>

              <div className="settings-row-pair vertical">
                <span className="row-label">투표 옵션 (2~6개)</span>
                <div className="poll-options-list">
                  {newPoll.options.map((option, index) => (
                    <div key={index} className="poll-option-edit">
                      <input
                        type="color"
                        value={option.color}
                        onChange={(e) => updateOption(index, 'color', e.target.value)}
                      />
                      <input
                        type="text"
                        className="styled-input"
                        value={option.text}
                        onChange={(e) => updateOption(index, 'text', e.target.value)}
                        placeholder={`옵션 ${index + 1}`}
                      />
                      <button
                        className="btn-icon-small danger"
                        onClick={() => removeOption(index)}
                        disabled={newPoll.options.length <= 2}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  className="btn-add-option"
                  onClick={addOption}
                  disabled={newPoll.options.length >= 6}
                >
                  <Plus size={18} /> 옵션 추가
                </button>
              </div>

              <button className="btn-start-poll" onClick={startPoll}>
                <Play size={18} /> 투표 시작
              </button>
            </div>
          )}
        </div>

        <aside className="chat-settings-preview-aside">
          {/* 실시간 미리보기 */}
          <OverlayPreviewWrapper title="투표 미리보기" height={400}>
            <VotingOverlay
              previewMode={true}
              previewSettings={settings}
              previewPoll={previewPoll}
            />
          </OverlayPreviewWrapper>

          {/* 저장 */}
          <div className="save-controls-wrapper">
            <button className="btn-save-full" onClick={saveSettings} disabled={saving}>
              {saving ? <RefreshCw size={18} className="spin" /> : <Save size={18} />}
              {saving ? '저장 중...' : '설정 저장'}
            </button>
          </div>
        </aside>
      </div>
    </>
  );
};

export default VotingSettings;
