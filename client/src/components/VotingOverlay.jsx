import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { API_URL } from '../config/api';
import socket from '../config/socket';
import './Overlay.css';

const VotingOverlay = ({
  previewMode = false,
  previewSettings = null,
  previewPoll = null
}) => {
  const { userHash } = useParams();
  const [poll, setPoll] = useState(null);
  const [settings, setSettings] = useState({
    theme: 'default',
    showPercentage: true,
    showCount: true,
    animateChanges: true
  });

  const fetchSettings = async () => {
    try {
      const url = userHash
        ? `${API_URL}/api/overlay/${userHash}/settings/voting`
        : `${API_URL}/api/settings/voting`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.value && data.value !== '{}') {
        setSettings(prev => ({ ...prev, ...JSON.parse(data.value) }));
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  };

  const fetchActivePoll = async () => {
    try {
      const url = userHash
        ? `${API_URL}/api/overlay/${userHash}/poll/active`
        : null;

      if (!url) return;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.poll) {
          setPoll(data.poll);
        }
      }
    } catch (err) {
      console.error("Failed to fetch active poll:", err);
    }
  };

  useEffect(() => {
    // Skip API/Socket in preview mode
    if (previewMode) return;

    fetchSettings();
    fetchActivePoll();

    if (userHash) {
      socket.emit("join-overlay", userHash);
    }

    socket.on('poll-started', (data) => {
      setPoll(data);
    });

    socket.on('poll-update', (data) => {
      setPoll(prev => {
        if (!prev || prev.id !== data.pollId) return prev;
        const newOptions = [...prev.options];
        const optionIndex = newOptions.findIndex(o => o.id === data.optionId);
        if (optionIndex !== -1) {
          newOptions[optionIndex].votes = data.newCount;
        }
        return { ...prev, options: newOptions };
      });
    });

    socket.on('poll-ended', (data) => {
      if (poll?.id === data.pollId) {
        setPoll(prev => ({ ...prev, status: 'closed', results: data.results }));
        // Clear poll after showing results
        setTimeout(() => setPoll(null), 10000);
      }
    });

    socket.on('settings-updated', (data) => {
      if (data.key === 'voting') fetchSettings();
    });

    return () => {
      if (userHash) {
        socket.emit("leave-overlay", userHash);
      }
      socket.off('poll-started');
      socket.off('poll-update');
      socket.off('poll-ended');
      socket.off('settings-updated');
    };
  }, [userHash, previewMode]);

  // OBS 브라우저 소스용 투명 배경
  useEffect(() => {
    if (!previewMode) {
      document.body.classList.add('overlay-mode');
      return () => document.body.classList.remove('overlay-mode');
    }
  }, [previewMode]);

  // Use preview settings and poll if in preview mode
  const activeSettings = previewMode && previewSettings ? previewSettings : settings;
  const activePoll = previewMode ? previewPoll : poll;

  if (!activePoll) return null;

  const totalVotes = activePoll.options.reduce((sum, opt) => sum + (opt.votes || 0), 0);

  return (
    <div className={`voting-overlay theme-${activeSettings.theme} ${previewMode ? 'preview-mode' : ''}`}>
      <div className="voting-container glass">
        <div className="voting-title">{activePoll.title}</div>

        <div className="voting-options">
          {activePoll.options.map((option, index) => {
            const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;

            return (
              <div key={option.id || index} className="voting-option">
                <div className="option-header">
                  <span className="option-text">{option.text}</span>
                  <span className="option-stats">
                    {activeSettings.showCount && <span className="vote-count">{option.votes || 0}표</span>}
                    {activeSettings.showPercentage && <span className="vote-percentage">{percentage.toFixed(1)}%</span>}
                  </span>
                </div>
                <div className="option-bar-bg">
                  <div
                    className={`option-bar-fill ${activeSettings.animateChanges ? 'animated' : ''}`}
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: option.color || '#4ecdc4'
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {activePoll.status === 'active' && activePoll.duration && (
          <div className="voting-timer">
            투표 진행 중
          </div>
        )}

        {activePoll.status === 'closed' && (
          <div className="voting-closed">
            투표 종료
          </div>
        )}
      </div>
    </div>
  );
};

export default VotingOverlay;
