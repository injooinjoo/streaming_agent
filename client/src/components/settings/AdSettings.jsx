import { useState, useEffect, useRef, useCallback } from 'react';
import {
  DollarSign, Plus, Trash2, Edit2, Play, Pause, BarChart3,
  Eye, MousePointerClick, TrendingUp, Move, Maximize2,
  Image, Video, Settings, Save, X, Check, GripVertical,
  Monitor, RefreshCw, AlertCircle, Calendar, Copy, Link, ExternalLink
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../config/api';
import './AdSettings.css';

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

const defaultSlotData = {
  name: '새 광고 슬롯',
  type: 'banner',
  position: { x: 10, y: 80 },
  size: { width: 300, height: 100 },
  enabled: true,
};

const slotTypes = [
  { value: 'banner', label: '배너', icon: Image },
  { value: 'popup', label: '팝업', icon: Video },
  { value: 'corner', label: '코너', icon: Maximize2 },
];

// Draggable & Resizable Slot Component
const DraggableSlot = ({ slot, isSelected, onSelect, onUpdate, canvasRef, scale }) => {
  const slotRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ width: 0, height: 0, x: 0, y: 0 });

  const handleMouseDown = (e) => {
    if (e.target.classList.contains('resize-handle')) return;
    e.stopPropagation();
    onSelect(slot.id);
    setIsDragging(true);
    setDragStart({
      x: e.clientX - (slot.position.x / 100) * canvasRef.current.offsetWidth,
      y: e.clientY - (slot.position.y / 100) * canvasRef.current.offsetHeight,
    });
  };

  const handleResizeStart = (e) => {
    e.stopPropagation();
    onSelect(slot.id);
    setIsResizing(true);
    setResizeStart({
      width: slot.size.width,
      height: slot.size.height,
      x: e.clientX,
      y: e.clientY,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!canvasRef.current) return;

      if (isDragging) {
        const canvasRect = canvasRef.current.getBoundingClientRect();
        let newX = ((e.clientX - dragStart.x) / canvasRect.width) * 100;
        let newY = ((e.clientY - dragStart.y) / canvasRect.height) * 100;

        // Clamp within canvas bounds
        const slotWidthPercent = (slot.size.width / CANVAS_WIDTH) * 100;
        const slotHeightPercent = (slot.size.height / CANVAS_HEIGHT) * 100;
        newX = Math.max(0, Math.min(100 - slotWidthPercent, newX));
        newY = Math.max(0, Math.min(100 - slotHeightPercent, newY));

        onUpdate(slot.id, {
          ...slot,
          position: { x: Math.round(newX * 10) / 10, y: Math.round(newY * 10) / 10 },
        });
      }

      if (isResizing) {
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const deltaX = (e.clientX - resizeStart.x) / scale;
        const deltaY = (e.clientY - resizeStart.y) / scale;

        let newWidth = Math.max(100, resizeStart.width + deltaX);
        let newHeight = Math.max(50, resizeStart.height + deltaY);

        // Clamp to canvas bounds
        const maxWidth = CANVAS_WIDTH - (slot.position.x / 100) * CANVAS_WIDTH;
        const maxHeight = CANVAS_HEIGHT - (slot.position.y / 100) * CANVAS_HEIGHT;
        newWidth = Math.min(newWidth, maxWidth);
        newHeight = Math.min(newHeight, maxHeight);

        onUpdate(slot.id, {
          ...slot,
          size: { width: Math.round(newWidth), height: Math.round(newHeight) },
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, resizeStart, slot, onUpdate, canvasRef, scale]);

  const slotStyle = {
    left: `${slot.position.x}%`,
    top: `${slot.position.y}%`,
    width: `${(slot.size.width / CANVAS_WIDTH) * 100}%`,
    height: `${(slot.size.height / CANVAS_HEIGHT) * 100}%`,
  };

  return (
    <div
      ref={slotRef}
      className={`canvas-slot ${isSelected ? 'selected' : ''} ${!slot.enabled ? 'disabled' : ''} slot-type-${slot.type}`}
      style={slotStyle}
      onMouseDown={handleMouseDown}
    >
      <div className="slot-content">
        <div className="slot-label">
          <GripVertical size={12} />
          <span>{slot.name}</span>
        </div>
        <div className="slot-dimensions">
          {slot.size.width} x {slot.size.height}
        </div>
      </div>
      {isSelected && (
        <div className="resize-handle" onMouseDown={handleResizeStart}>
          <Maximize2 size={10} />
        </div>
      )}
    </div>
  );
};

// Slot Preview Canvas
const SlotPreviewCanvas = ({ slots, selectedSlotId, onSelectSlot, onUpdateSlot }) => {
  const canvasRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (canvasRef.current) {
        setScale(canvasRef.current.offsetWidth / CANVAS_WIDTH);
      }
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const handleCanvasClick = (e) => {
    if (e.target === canvasRef.current || e.target.classList.contains('canvas-grid')) {
      onSelectSlot(null);
    }
  };

  return (
    <div className="slot-preview-wrapper">
      <div className="canvas-header">
        <Monitor size={16} />
        <span>미리보기 (16:9)</span>
        <span className="canvas-resolution">1920 x 1080</span>
      </div>
      <div
        ref={canvasRef}
        className="slot-preview-canvas"
        onClick={handleCanvasClick}
      >
        <div className="canvas-grid" />
        <div className="canvas-safe-zone" />
        {slots.map((slot) => (
          <DraggableSlot
            key={slot.id}
            slot={slot}
            isSelected={selectedSlotId === slot.id}
            onSelect={onSelectSlot}
            onUpdate={onUpdateSlot}
            canvasRef={canvasRef}
            scale={scale}
          />
        ))}
        {slots.length === 0 && (
          <div className="canvas-empty">
            <Plus size={32} />
            <p>광고 슬롯을 추가하세요</p>
            <span>드래그 & 드롭으로 위치를 조정할 수 있습니다</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Slot Editor Panel
const SlotEditorPanel = ({ slot, onUpdate, onDelete, onClose }) => {
  const [editedSlot, setEditedSlot] = useState(slot);

  useEffect(() => {
    setEditedSlot(slot);
  }, [slot]);

  const handleChange = (field, value) => {
    const updated = { ...editedSlot };
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      updated[parent] = { ...updated[parent], [child]: value };
    } else {
      updated[field] = value;
    }
    setEditedSlot(updated);
    onUpdate(slot.id, updated);
  };

  return (
    <div className="slot-editor-panel">
      <div className="editor-header">
        <h4>슬롯 편집</h4>
        <button className="btn-icon-close" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <div className="editor-body">
        <div className="editor-field">
          <label>슬롯 이름</label>
          <input
            type="text"
            value={editedSlot.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="슬롯 이름"
          />
        </div>

        <div className="editor-field">
          <label>슬롯 타입</label>
          <div className="type-selector">
            {slotTypes.map((type) => (
              <button
                key={type.value}
                className={`type-btn ${editedSlot.type === type.value ? 'active' : ''}`}
                onClick={() => handleChange('type', type.value)}
              >
                <type.icon size={16} />
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="editor-field-row">
          <div className="editor-field half">
            <label>X 위치 (%)</label>
            <input
              type="number"
              value={editedSlot.position.x}
              onChange={(e) => handleChange('position.x', parseFloat(e.target.value) || 0)}
              min={0}
              max={100}
              step={0.1}
            />
          </div>
          <div className="editor-field half">
            <label>Y 위치 (%)</label>
            <input
              type="number"
              value={editedSlot.position.y}
              onChange={(e) => handleChange('position.y', parseFloat(e.target.value) || 0)}
              min={0}
              max={100}
              step={0.1}
            />
          </div>
        </div>

        <div className="editor-field-row">
          <div className="editor-field half">
            <label>너비 (px)</label>
            <input
              type="number"
              value={editedSlot.size.width}
              onChange={(e) => handleChange('size.width', parseInt(e.target.value) || 100)}
              min={100}
              max={1920}
            />
          </div>
          <div className="editor-field half">
            <label>높이 (px)</label>
            <input
              type="number"
              value={editedSlot.size.height}
              onChange={(e) => handleChange('size.height', parseInt(e.target.value) || 50)}
              min={50}
              max={1080}
            />
          </div>
        </div>

        <div className="editor-field">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={editedSlot.enabled}
              onChange={(e) => handleChange('enabled', e.target.checked)}
            />
            <span>광고 노출 허용</span>
          </label>
        </div>
      </div>

      <div className="editor-footer">
        <button className="btn-delete" onClick={() => onDelete(slot.id)}>
          <Trash2 size={14} />
          삭제
        </button>
      </div>
    </div>
  );
};

// Main AdSettings Component
const AdSettings = () => {
  const [slots, setSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('slots');
  const [copied, setCopied] = useState(false);

  const { isAuthenticated, user } = useAuth();

  // Generate overlay URL
  const overlayHash = user?.overlayHash || 'demo';
  const clientUrl = API_URL.includes('localhost')
    ? 'http://localhost:5173'
    : window.location.origin;
  const overlayUrl = `${clientUrl}/overlay/${overlayHash}/ads`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(overlayUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = overlayUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Revenue stats (sample data)
  const [revenueStats] = useState({
    totalImpressions: 45678,
    totalClicks: 1234,
    totalRevenue: 156000,
    ctr: 2.7,
    avgRevenuePerClick: 126,
    pendingSettlement: 77000,
  });

  // Settlement history (sample data)
  const [settlements] = useState([
    { period: '2024-12', revenue: 120000, status: 'paid', paidDate: '2025-01-05' },
    { period: '2024-11', revenue: 98000, status: 'paid', paidDate: '2024-12-05' },
    { period: '2024-10', revenue: 85000, status: 'paid', paidDate: '2024-11-05' },
  ]);

  useEffect(() => {
    // Load slots from API
    const loadSlots = async () => {
      try {
        // API call would go here
        // const response = await fetch('/api/ads/slots');
        // const data = await response.json();

        // Sample data for development
        const sampleSlots = [
          {
            id: 1,
            name: '좌측 하단 배너',
            type: 'banner',
            position: { x: 2, y: 85 },
            size: { width: 320, height: 100 },
            enabled: true,
            impressions: 12540,
            clicks: 342,
            revenue: 45000,
          },
          {
            id: 2,
            name: '우측 상단 코너',
            type: 'corner',
            position: { x: 82, y: 2 },
            size: { width: 200, height: 200 },
            enabled: true,
            impressions: 8320,
            clicks: 156,
            revenue: 28000,
          },
        ];
        setSlots(sampleSlots);
      } catch (error) {
        console.error('Failed to load slots:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSlots();
  }, []);

  const handleAddSlot = () => {
    const newSlot = {
      ...defaultSlotData,
      id: Date.now(),
      impressions: 0,
      clicks: 0,
      revenue: 0,
    };
    setSlots([...slots, newSlot]);
    setSelectedSlotId(newSlot.id);
  };

  const handleUpdateSlot = useCallback((id, updatedSlot) => {
    setSlots((prev) =>
      prev.map((slot) => (slot.id === id ? { ...slot, ...updatedSlot } : slot))
    );
  }, []);

  const handleDeleteSlot = (id) => {
    setSlots((prev) => prev.filter((slot) => slot.id !== id));
    setSelectedSlotId(null);
  };

  const handleToggleSlot = (id) => {
    setSlots((prev) =>
      prev.map((slot) =>
        slot.id === id ? { ...slot, enabled: !slot.enabled } : slot
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // API call would go here
      // await fetch('/api/ads/slots', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ slots }),
      // });
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API delay
      alert('광고 슬롯 설정이 저장되었습니다.');
    } catch (error) {
      console.error('Failed to save slots:', error);
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const selectedSlot = slots.find((s) => s.id === selectedSlotId);

  if (!isAuthenticated) {
    return (
      <div className="ad-settings animate-fade">
        <header className="page-header">
          <div className="page-title">
            <h1>광고 관리</h1>
            <p>광고 슬롯을 설정하고 수익을 관리하세요.</p>
          </div>
        </header>
        <div className="placeholder-view" style={{ padding: '80px 40px', textAlign: 'center' }}>
          <DollarSign size={64} style={{ color: '#cbd5e1' }} strokeWidth={1} />
          <h3 style={{ marginTop: '20px', color: '#374151' }}>로그인이 필요합니다</h3>
          <p style={{ color: '#64748b' }}>광고 관리 기능을 사용하려면 로그인해주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ad-settings animate-fade">
      <header className="page-header">
        <div className="page-title">
          <h1>광고 관리</h1>
          <p>광고 슬롯 위치를 설정하고 수익을 확인하세요.</p>
        </div>
        <div className="header-buttons">
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />}
            {saving ? '저장 중...' : '설정 저장'}
          </button>
        </div>
      </header>

      {/* Revenue Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span>이번 달 노출</span>
            <Eye size={14} />
          </div>
          <div className="stat-content">
            <span className="value">{revenueStats.totalImpressions.toLocaleString()}</span>
            <span className="subtext">회</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <span>클릭수</span>
            <MousePointerClick size={14} />
          </div>
          <div className="stat-content">
            <span className="value">{revenueStats.totalClicks.toLocaleString()}</span>
            <span className="subtext">CTR {revenueStats.ctr}%</span>
          </div>
        </div>
        <div className="stat-card highlight">
          <div className="stat-header">
            <span>예상 수익</span>
            <TrendingUp size={14} />
          </div>
          <div className="stat-content">
            <span className="value">₩{revenueStats.totalRevenue.toLocaleString()}</span>
            <span className="subtext">정산 대기 ₩{revenueStats.pendingSettlement.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tabs-container">
        <button
          className={`tab-btn ${activeTab === 'slots' ? 'active' : ''}`}
          onClick={() => setActiveTab('slots')}
        >
          <Move size={16} />
          슬롯 설정
        </button>
        <button
          className={`tab-btn ${activeTab === 'revenue' ? 'active' : ''}`}
          onClick={() => setActiveTab('revenue')}
        >
          <BarChart3 size={16} />
          수익 현황
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <Calendar size={16} />
          정산 내역
        </button>
      </div>

      {/* Slot Settings Tab */}
      {activeTab === 'slots' && (
        <div className="slot-settings-container">
          {/* Overlay URL Section */}
          <div className="overlay-url-section glass-card">
            <div className="url-header">
              <Link size={18} />
              <h3>광고 오버레이 URL</h3>
            </div>
            <p className="url-description">
              아래 URL을 OBS 브라우저 소스에 추가하세요. 설정한 위치에 타겟 광고가 자동으로 노출됩니다.
            </p>
            <div className="url-input-row">
              <input
                type="text"
                value={overlayUrl}
                readOnly
                className="url-input"
              />
              <button
                className={`btn-copy ${copied ? 'copied' : ''}`}
                onClick={handleCopyUrl}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? '복사됨!' : 'URL 복사'}
              </button>
              <a
                href={overlayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-preview"
              >
                <ExternalLink size={16} />
                미리보기
              </a>
            </div>
          </div>

          <div className="slot-settings-main">
            {/* Canvas */}
            <SlotPreviewCanvas
              slots={slots}
              selectedSlotId={selectedSlotId}
              onSelectSlot={setSelectedSlotId}
              onUpdateSlot={handleUpdateSlot}
            />

            {/* Slot List */}
            <div className="slot-list-section">
              <div className="section-header">
                <h3>광고 슬롯 목록</h3>
                <button className="btn-add-slot" onClick={handleAddSlot}>
                  <Plus size={16} />
                  새 슬롯 추가
                </button>
              </div>

              {loading ? (
                <div className="loading-state">
                  <RefreshCw size={24} className="spin" />
                  <p>로딩 중...</p>
                </div>
              ) : slots.length === 0 ? (
                <div className="empty-state">
                  <DollarSign size={48} />
                  <h4>광고 슬롯이 없습니다</h4>
                  <p>새 광고 슬롯을 추가하여 수익을 창출하세요.</p>
                </div>
              ) : (
                <div className="slot-list">
                  {slots.map((slot) => (
                    <div
                      key={slot.id}
                      className={`slot-item ${selectedSlotId === slot.id ? 'selected' : ''} ${!slot.enabled ? 'disabled' : ''}`}
                      onClick={() => setSelectedSlotId(slot.id)}
                    >
                      <div className="slot-item-icon">
                        {slot.type === 'banner' && <Image size={20} />}
                        {slot.type === 'popup' && <Video size={20} />}
                        {slot.type === 'corner' && <Maximize2 size={20} />}
                      </div>
                      <div className="slot-item-info">
                        <div className="slot-item-name">{slot.name}</div>
                        <div className="slot-item-details">
                          {slot.size.width}x{slot.size.height}px •
                          위치: {slot.position.x}%, {slot.position.y}%
                        </div>
                      </div>
                      <div className="slot-item-stats">
                        <span>{slot.impressions?.toLocaleString() || 0} 노출</span>
                        <span>₩{slot.revenue?.toLocaleString() || 0}</span>
                      </div>
                      <div className="slot-item-actions">
                        <button
                          className={`btn-toggle ${slot.enabled ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSlot(slot.id);
                          }}
                          title={slot.enabled ? '비활성화' : '활성화'}
                        >
                          {slot.enabled ? <Play size={14} /> : <Pause size={14} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Editor Sidebar */}
          <div className="slot-settings-sidebar">
            {selectedSlot ? (
              <SlotEditorPanel
                slot={selectedSlot}
                onUpdate={handleUpdateSlot}
                onDelete={handleDeleteSlot}
                onClose={() => setSelectedSlotId(null)}
              />
            ) : (
              <div className="editor-placeholder">
                <Move size={32} />
                <h4>슬롯을 선택하세요</h4>
                <p>캔버스에서 슬롯을 클릭하거나<br />목록에서 선택하여 편집합니다.</p>
              </div>
            )}

            {/* Quick Tips */}
            <div className="tips-card">
              <h4><AlertCircle size={14} /> 사용 팁</h4>
              <ul>
                <li>슬롯을 드래그하여 위치를 조정하세요</li>
                <li>우측 하단 핸들로 크기를 변경하세요</li>
                <li>광고가 미집행되면 해당 영역은 투명하게 표시됩니다</li>
                <li>설정 변경 후 저장 버튼을 눌러주세요</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Tab */}
      {activeTab === 'revenue' && (
        <div className="revenue-section glass-card">
          <h3>슬롯별 수익 현황</h3>
          <div className="revenue-table">
            <div className="revenue-header">
              <span>슬롯명</span>
              <span>노출</span>
              <span>클릭</span>
              <span>CTR</span>
              <span>수익</span>
            </div>
            {slots.map((slot) => (
              <div key={slot.id} className="revenue-row">
                <span className="slot-name">
                  {slot.type === 'banner' && <Image size={16} />}
                  {slot.type === 'popup' && <Video size={16} />}
                  {slot.type === 'corner' && <Maximize2 size={16} />}
                  {slot.name}
                </span>
                <span>{slot.impressions?.toLocaleString() || 0}</span>
                <span>{slot.clicks?.toLocaleString() || 0}</span>
                <span>{slot.impressions ? ((slot.clicks / slot.impressions) * 100).toFixed(2) : 0}%</span>
                <span className="revenue-amount">₩{slot.revenue?.toLocaleString() || 0}</span>
              </div>
            ))}
            <div className="revenue-row total">
              <span>합계</span>
              <span>{slots.reduce((sum, s) => sum + (s.impressions || 0), 0).toLocaleString()}</span>
              <span>{slots.reduce((sum, s) => sum + (s.clicks || 0), 0).toLocaleString()}</span>
              <span>-</span>
              <span className="revenue-amount">
                ₩{slots.reduce((sum, s) => sum + (s.revenue || 0), 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Settlement History Tab */}
      {activeTab === 'history' && (
        <div className="settlement-section glass-card">
          <h3>정산 내역</h3>
          <div className="settlement-list">
            {settlements.map((settlement, idx) => (
              <div key={idx} className="settlement-item">
                <div className="settlement-period">
                  <Calendar size={16} />
                  {settlement.period}
                </div>
                <div className="settlement-amount">
                  ₩{settlement.revenue.toLocaleString()}
                </div>
                <div className={`settlement-status ${settlement.status}`}>
                  {settlement.status === 'paid' && <Check size={14} />}
                  {settlement.status === 'paid' ? '정산 완료' : '정산 대기'}
                </div>
                <div className="settlement-date">
                  {settlement.paidDate || '-'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdSettings;
