import React, { useState, useEffect } from 'react';
import {
  Copy, RefreshCw, Save, Plus, Trash2,
  Bot, Check, MessageCircle, Clock, UserPlus, Heart, DollarSign,
  Power, Edit2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../config/api';
import socket from '../../config/socket';
import LoadingSpinner from '../shared/LoadingSpinner';
import './BotSettings.css';

const defaultCommands = [
  { id: 1, command: '!안녕', response: '{user}님 안녕하세요! 환영합니다 🎉', cooldown: 5, isActive: true },
  { id: 2, command: '!룰', response: '채팅 규칙: 1. 서로 존중하기 2. 스포일러 금지 3. 도배 금지', cooldown: 30, isActive: true },
  { id: 3, command: '!후원', response: '후원은 토스: xxx-xxx-xxxx 로 해주시면 됩니다!', cooldown: 60, isActive: true }
];

const defaultAutoMessages = [
  { id: 1, triggerType: 'enter', message: '{user}님이 입장하셨습니다! 환영해요 👋', isActive: false },
  { id: 2, triggerType: 'follow', message: '{user}님 팔로우 감사합니다! 💖', isActive: true },
  { id: 3, triggerType: 'interval', triggerValue: '10', message: '채팅에 참여해주셔서 감사합니다! 좋아요와 구독 부탁드려요~', isActive: false }
];

const triggerTypeLabels = {
  interval: { label: '주기적', icon: <Clock size={14} />, desc: '분 단위로 반복' },
  enter: { label: '입장시', icon: <UserPlus size={14} />, desc: '시청자 입장시' },
  follow: { label: '팔로우', icon: <Heart size={14} />, desc: '팔로우/구독시' },
  donation: { label: '후원시', icon: <DollarSign size={14} />, desc: '후원 발생시' }
};

const BotSettings = () => {
  const { token, user } = useAuth();
  const [settings, setSettings] = useState({
    botName: 'StreamBot',
    isActive: false,
    commands: defaultCommands,
    autoMessages: defaultAutoMessages
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const overlayHash = user?.userHash || null;
  const [editingCommand, setEditingCommand] = useState(null);
  const [editingAutoMsg, setEditingAutoMsg] = useState(null);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/user-settings/bot`, {
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
        body: JSON.stringify({ key: 'bot', value: settings })
      });
      socket.emit('settings-update', { key: 'bot', userHash: overlayHash });
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleBotActive = () => {
    setSettings(prev => ({ ...prev, isActive: !prev.isActive }));
    if (overlayHash) {
      socket.emit('bot-toggle', { userHash: overlayHash, isActive: !settings.isActive });
    }
  };

  // Command management
  const addCommand = () => {
    const newCommand = {
      id: Date.now(),
      command: '!명령어',
      response: '응답 메시지를 입력하세요',
      cooldown: 5,
      isActive: true
    };
    setSettings(prev => ({
      ...prev,
      commands: [...prev.commands, newCommand]
    }));
    setEditingCommand(newCommand.id);
  };

  const updateCommand = (id, field, value) => {
    setSettings(prev => ({
      ...prev,
      commands: prev.commands.map(cmd =>
        cmd.id === id ? { ...cmd, [field]: value } : cmd
      )
    }));
  };

  const removeCommand = (id) => {
    setSettings(prev => ({
      ...prev,
      commands: prev.commands.filter(cmd => cmd.id !== id)
    }));
  };

  // Auto message management
  const addAutoMessage = () => {
    const newMsg = {
      id: Date.now(),
      triggerType: 'interval',
      triggerValue: '10',
      message: '자동 메시지를 입력하세요',
      isActive: false
    };
    setSettings(prev => ({
      ...prev,
      autoMessages: [...prev.autoMessages, newMsg]
    }));
    setEditingAutoMsg(newMsg.id);
  };

  const updateAutoMessage = (id, field, value) => {
    setSettings(prev => ({
      ...prev,
      autoMessages: prev.autoMessages.map(msg =>
        msg.id === id ? { ...msg, [field]: value } : msg
      )
    }));
  };

  const removeAutoMessage = (id) => {
    setSettings(prev => ({
      ...prev,
      autoMessages: prev.autoMessages.filter(msg => msg.id !== id)
    }));
  };

  const testCommand = (command) => {
    if (overlayHash) {
      const testResponse = command.response.replace('{user}', '테스트유저');
      socket.emit('bot-message', {
        userHash: overlayHash,
        botName: settings.botName,
        message: testResponse
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
    <div className="settings-panel">
      <div className="premium-settings-header">
        <div className="header-top-row">
          <div className="title-area">
            <Bot size={28} />
            <span className="title-text">챗봇 설정</span>
            <div className="badge-wrapper">
              <span className="badge-new">NEW</span>
            </div>
          </div>
          <div className="action-area">
            <button
              className={`btn-bot-toggle ${settings.isActive ? 'active' : ''}`}
              onClick={toggleBotActive}
            >
              <Power size={16} />
              {settings.isActive ? '봇 활성화됨' : '봇 비활성화'}
            </button>
          </div>
        </div>

        <div className="bot-status-card glass-premium">
          <div className="bot-avatar">
            <Bot size={32} />
          </div>
          <div className="bot-info">
            <input
              type="text"
              className="bot-name-input"
              value={settings.botName}
              onChange={(e) => setSettings(prev => ({ ...prev, botName: e.target.value }))}
              placeholder="봇 이름"
            />
            <span className="bot-status">
              <span className={`status-dot ${settings.isActive ? 'green' : 'gray'}`}></span>
              {settings.isActive ? '온라인' : '오프라인'}
            </span>
          </div>
        </div>
      </div>

      {/* 명령어 설정 */}
      <div className="settings-card">
        <div className="card-header">
          <h3>채팅 명령어</h3>
          <p>시청자가 채팅에서 사용할 수 있는 명령어를 설정합니다.</p>
        </div>

        <div className="commands-list">
          {settings.commands.map((cmd) => (
            <div key={cmd.id} className={`command-item ${cmd.isActive ? '' : 'disabled'}`}>
              <div className="command-header">
                <div className="command-toggle">
                  <label className="toggle-switch small">
                    <input
                      type="checkbox"
                      checked={cmd.isActive}
                      onChange={(e) => updateCommand(cmd.id, 'isActive', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
                {editingCommand === cmd.id ? (
                  <input
                    type="text"
                    className="command-input"
                    value={cmd.command}
                    onChange={(e) => updateCommand(cmd.id, 'command', e.target.value)}
                    onBlur={() => setEditingCommand(null)}
                    autoFocus
                  />
                ) : (
                  <span className="command-name" onClick={() => setEditingCommand(cmd.id)}>
                    {cmd.command}
                    <Edit2 size={12} />
                  </span>
                )}
                <div className="command-actions">
                  <button
                    className="btn-icon-small"
                    onClick={() => testCommand(cmd)}
                    title="테스트"
                  >
                    <MessageCircle size={16} />
                  </button>
                  <button
                    className="btn-icon-small danger"
                    onClick={() => removeCommand(cmd.id)}
                    title="삭제"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="command-body">
                <textarea
                  className="command-response"
                  value={cmd.response}
                  onChange={(e) => updateCommand(cmd.id, 'response', e.target.value)}
                  placeholder="응답 메시지 ({user} = 사용자 이름)"
                  rows={2}
                />
                <div className="command-options">
                  <div className="cooldown-setting">
                    <Clock size={14} />
                    <input
                      type="number"
                      min="0"
                      max="3600"
                      value={cmd.cooldown}
                      onChange={(e) => updateCommand(cmd.id, 'cooldown', parseInt(e.target.value))}
                    />
                    <span>초 쿨다운</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button className="btn-add-command" onClick={addCommand}>
          <Plus size={18} /> 명령어 추가
        </button>

        <div className="variable-hint">
          <strong>사용 가능한 변수:</strong> {'{user}'} = 사용자 이름, {'{channel}'} = 채널명, {'{time}'} = 현재 시간
        </div>
      </div>

      {/* 자동 메시지 설정 */}
      <div className="settings-card">
        <div className="card-header">
          <h3>자동 메시지</h3>
          <p>특정 상황에서 자동으로 전송되는 메시지를 설정합니다.</p>
        </div>

        <div className="auto-messages-list">
          {settings.autoMessages.map((msg) => (
            <div key={msg.id} className={`auto-message-item ${msg.isActive ? '' : 'disabled'}`}>
              <div className="auto-message-header">
                <div className="auto-message-toggle">
                  <label className="toggle-switch small">
                    <input
                      type="checkbox"
                      checked={msg.isActive}
                      onChange={(e) => updateAutoMessage(msg.id, 'isActive', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
                <div className="trigger-type-selector">
                  <select
                    value={msg.triggerType}
                    onChange={(e) => updateAutoMessage(msg.id, 'triggerType', e.target.value)}
                  >
                    {Object.entries(triggerTypeLabels).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                  {msg.triggerType === 'interval' && (
                    <div className="interval-input">
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={msg.triggerValue || '10'}
                        onChange={(e) => updateAutoMessage(msg.id, 'triggerValue', e.target.value)}
                      />
                      <span>분 마다</span>
                    </div>
                  )}
                  {msg.triggerType === 'donation' && (
                    <div className="donation-input">
                      <input
                        type="number"
                        min="0"
                        value={msg.triggerValue || '1000'}
                        onChange={(e) => updateAutoMessage(msg.id, 'triggerValue', e.target.value)}
                      />
                      <span>원 이상</span>
                    </div>
                  )}
                </div>
                <button
                  className="btn-icon-small danger"
                  onClick={() => removeAutoMessage(msg.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <textarea
                className="auto-message-content"
                value={msg.message}
                onChange={(e) => updateAutoMessage(msg.id, 'message', e.target.value)}
                placeholder="자동 메시지 내용"
                rows={2}
              />
              <div className="trigger-hint">
                {triggerTypeLabels[msg.triggerType]?.icon}
                <span>{triggerTypeLabels[msg.triggerType]?.desc}</span>
              </div>
            </div>
          ))}
        </div>

        <button className="btn-add-auto-message" onClick={addAutoMessage}>
          <Plus size={18} /> 자동 메시지 추가
        </button>
      </div>

      {/* 저장 */}
      <div className="save-controls-wrapper">
        <button className="btn-save-full" onClick={saveSettings} disabled={saving}>
          {saving ? <RefreshCw size={18} className="spin" /> : <Save size={18} />}
          {saving ? '저장 중...' : '설정 저장'}
        </button>
      </div>
    </div>
  );
};

export default BotSettings;
