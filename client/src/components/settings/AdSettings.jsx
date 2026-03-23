import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Calendar,
  Check,
  Copy,
  DollarSign,
  ExternalLink,
  Eye,
  Image,
  Link as LinkIcon,
  LogIn,
  Maximize2,
  MousePointerClick,
  Move,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  TrendingUp,
  Video,
  X,
} from 'lucide-react';
import { API_URL, mockFetch } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatFullNumber, formatPercent } from '../../utils/formatters';
import LoadingSpinner from '../shared/LoadingSpinner';
import './AdSettings.css';

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

const defaultSlotData = {
  name: '새 광고 슬롯',
  type: 'banner',
  position: { x: 8, y: 80 },
  size: { width: 300, height: 100 },
  enabled: true,
};

const slotTypes = [
  { value: 'banner', label: '배너', icon: Image },
  { value: 'popup', label: '팝업', icon: Video },
  { value: 'corner', label: '코너', icon: Maximize2 },
];

const getAuthToken = (accessToken) =>
  accessToken || localStorage.getItem('accessToken') || localStorage.getItem('token') || null;

const normalizeSlot = (slot, index = 0) => ({
  id: slot?.id || Date.now() + index,
  name: slot?.name || `광고 슬롯 ${index + 1}`,
  type: slot?.type || 'banner',
  position: {
    x: Number(slot?.position?.x ?? 0),
    y: Number(slot?.position?.y ?? 0),
  },
  size: {
    width: Number(slot?.size?.width ?? 300),
    height: Number(slot?.size?.height ?? 100),
  },
  enabled: slot?.enabled !== false,
  impressions: Number(slot?.impressions ?? 0),
  clicks: Number(slot?.clicks ?? 0),
  revenue: Number(slot?.revenue ?? 0),
});

const normalizeRevenueStats = (payload = {}) => ({
  totalImpressions: Number(payload.totalImpressions ?? 0),
  totalClicks: Number(payload.totalClicks ?? 0),
  totalRevenue: Number(payload.totalRevenue ?? 0),
  ctr: Number(payload.ctr ?? 0),
  avgRevenuePerClick: Number(payload.avgRevenuePerClick ?? 0),
  pendingSettlement: Number(payload.pendingSettlement ?? 0),
});

const normalizeSettlements = (payload) => {
  const list = Array.isArray(payload) ? payload : payload?.settlements;
  if (!Array.isArray(list)) return [];

  return list.map((settlement) => ({
    period: settlement.period || '-',
    revenue: Number(settlement.revenue ?? settlement.total_revenue ?? 0),
    impressions: Number(settlement.impressions ?? settlement.total_impressions ?? 0),
    clicks: Number(settlement.clicks ?? settlement.total_clicks ?? 0),
    status: settlement.status || 'pending',
    paidDate: settlement.paidDate || settlement.payment_date || null,
  }));
};

const formatSettlementLabel = (period) => {
  if (!period || typeof period !== 'string') return '-';

  const [year, month] = period.split('-');
  if (!year || !month) return period;
  return `${year}년 ${Number(month)}월`;
};

const getSettlementStatusLabel = (status) => {
  if (status === 'paid') return '정산 완료';
  if (status === 'confirmed') return '정산 확정';
  return '정산 대기';
};

const DraggableSlot = ({ slot, isSelected, onSelect, onUpdate, canvasRef, scale }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ width: 0, height: 0, x: 0, y: 0 });

  const handleMouseDown = (event) => {
    if (event.target.classList.contains('resize-handle')) return;

    event.stopPropagation();
    onSelect(slot.id);
    setIsDragging(true);
    setDragStart({
      x: event.clientX - (slot.position.x / 100) * canvasRef.current.offsetWidth,
      y: event.clientY - (slot.position.y / 100) * canvasRef.current.offsetHeight,
    });
  };

  const handleResizeStart = (event) => {
    event.stopPropagation();
    onSelect(slot.id);
    setIsResizing(true);
    setResizeStart({
      width: slot.size.width,
      height: slot.size.height,
      x: event.clientX,
      y: event.clientY,
    });
  };

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (!canvasRef.current) return;

      if (isDragging) {
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const slotWidthPercent = (slot.size.width / CANVAS_WIDTH) * 100;
        const slotHeightPercent = (slot.size.height / CANVAS_HEIGHT) * 100;

        let newX = ((event.clientX - dragStart.x) / canvasRect.width) * 100;
        let newY = ((event.clientY - dragStart.y) / canvasRect.height) * 100;

        newX = Math.max(0, Math.min(100 - slotWidthPercent, newX));
        newY = Math.max(0, Math.min(100 - slotHeightPercent, newY));

        onUpdate(slot.id, {
          ...slot,
          position: {
            x: Math.round(newX * 10) / 10,
            y: Math.round(newY * 10) / 10,
          },
        });
      }

      if (isResizing) {
        const deltaX = (event.clientX - resizeStart.x) / scale;
        const deltaY = (event.clientY - resizeStart.y) / scale;
        const maxWidth = CANVAS_WIDTH - (slot.position.x / 100) * CANVAS_WIDTH;
        const maxHeight = CANVAS_HEIGHT - (slot.position.y / 100) * CANVAS_HEIGHT;

        onUpdate(slot.id, {
          ...slot,
          size: {
            width: Math.round(Math.min(Math.max(100, resizeStart.width + deltaX), maxWidth)),
            height: Math.round(Math.min(Math.max(50, resizeStart.height + deltaY), maxHeight)),
          },
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
  }, [canvasRef, dragStart, isDragging, isResizing, onUpdate, resizeStart, scale, slot]);

  return (
    <div
      className={`canvas-slot ${isSelected ? 'selected' : ''} ${!slot.enabled ? 'disabled' : ''} slot-type-${slot.type}`}
      style={{
        left: `${slot.position.x}%`,
        top: `${slot.position.y}%`,
        width: `${(slot.size.width / CANVAS_WIDTH) * 100}%`,
        height: `${(slot.size.height / CANVAS_HEIGHT) * 100}%`,
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="slot-content">
        <div className="slot-label">
          <Move size={12} />
          <span>{slot.name}</span>
        </div>
        <div className="slot-dimensions">
          {slot.size.width} x {slot.size.height}
        </div>
      </div>
      {isSelected ? (
        <div className="resize-handle" onMouseDown={handleResizeStart}>
          <Maximize2 size={10} />
        </div>
      ) : null}
    </div>
  );
};

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

  return (
    <div className="slot-preview-wrapper">
      <div className="canvas-header">
        <Eye size={16} />
        <span>광고 슬롯 미리보기</span>
        <span className="canvas-resolution">1920 x 1080</span>
      </div>

      <div
        ref={canvasRef}
        className="slot-preview-canvas"
        onClick={(event) => {
          if (event.target === canvasRef.current || event.target.classList.contains('canvas-grid')) {
            onSelectSlot(null);
          }
        }}
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

        {!slots.length ? (
          <div className="canvas-empty">
            <Plus size={32} />
            <p>광고 슬롯을 추가해 주세요</p>
            <span>드래그해서 위치를 바꾸고 우측에서 크기를 조정할 수 있어요</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const SlotEditorPanel = ({ slot, onUpdate, onDelete, onClose }) => {
  const [editedSlot, setEditedSlot] = useState(slot);

  useEffect(() => {
    setEditedSlot(slot);
  }, [slot]);

  const handleChange = (field, value) => {
    const nextSlot = { ...editedSlot };
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      nextSlot[parent] = { ...nextSlot[parent], [child]: value };
    } else {
      nextSlot[field] = value;
    }

    setEditedSlot(nextSlot);
    onUpdate(slot.id, nextSlot);
  };

  return (
    <div className="slot-editor-panel">
      <div className="editor-header">
        <h4>슬롯 편집</h4>
        <button className="btn-icon-close" type="button" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <div className="editor-body">
        <div className="editor-field">
          <label>슬롯 이름</label>
          <input
            type="text"
            value={editedSlot.name}
            onChange={(event) => handleChange('name', event.target.value)}
            placeholder="슬롯 이름"
          />
        </div>

        <div className="editor-field">
          <label>슬롯 유형</label>
          <div className="type-selector">
            {slotTypes.map((type) => (
              <button
                key={type.value}
                type="button"
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
              min={0}
              max={100}
              step={0.1}
              value={editedSlot.position.x}
              onChange={(event) => handleChange('position.x', Number(event.target.value) || 0)}
            />
          </div>
          <div className="editor-field half">
            <label>Y 위치 (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={editedSlot.position.y}
              onChange={(event) => handleChange('position.y', Number(event.target.value) || 0)}
            />
          </div>
        </div>

        <div className="editor-field-row">
          <div className="editor-field half">
            <label>너비 (px)</label>
            <input
              type="number"
              min={100}
              max={1920}
              value={editedSlot.size.width}
              onChange={(event) => handleChange('size.width', Number(event.target.value) || 100)}
            />
          </div>
          <div className="editor-field half">
            <label>높이 (px)</label>
            <input
              type="number"
              min={50}
              max={1080}
              value={editedSlot.size.height}
              onChange={(event) => handleChange('size.height', Number(event.target.value) || 50)}
            />
          </div>
        </div>

        <div className="editor-field">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={editedSlot.enabled}
              onChange={(event) => handleChange('enabled', event.target.checked)}
            />
            광고 노출 사용
          </label>
        </div>
      </div>

      <div className="editor-footer">
        <button className="btn-delete" type="button" onClick={() => onDelete(slot.id)}>
          <Trash2 size={14} />
          삭제
        </button>
      </div>
    </div>
  );
};

const AdSettings = () => {
  const navigate = useNavigate();
  const { accessToken, token, isAuthenticated, user } = useAuth();
  const authToken = getAuthToken(accessToken || token);

  const [slots, setSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [revenueStats, setRevenueStats] = useState(normalizeRevenueStats());
  const [settlements, setSettlements] = useState([]);
  const [activeTab, setActiveTab] = useState('slots');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [copied, setCopied] = useState(false);

  const overlayHash = user?.overlayHash || user?.userHash || 'demo';
  const clientUrl = API_URL.includes('localhost') ? 'http://localhost:5173' : window.location.origin;
  const overlayUrl = `${clientUrl}/overlay/${overlayHash}/ads`;

  const getAuthHeaders = useCallback(
    (includeJson = false) => ({
      ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    }),
    [authToken]
  );

  useEffect(() => {
    if (!feedback) return undefined;
    const timeoutId = window.setTimeout(() => setFeedback(''), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  const loadAdData = useCallback(async () => {
    if (!authToken) {
      setSlots([]);
      setSettlements([]);
      setRevenueStats(normalizeRevenueStats());
      setSelectedSlotId(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [slotsResponse, revenueResponse, settlementsResponse] = await Promise.all([
        mockFetch(`${API_URL}/api/ads/slots`, {
          headers: getAuthHeaders(),
        }),
        mockFetch(`${API_URL}/api/ads/revenue`, {
          headers: getAuthHeaders(),
        }),
        mockFetch(`${API_URL}/api/ads/settlements`, {
          headers: getAuthHeaders(),
        }),
      ]);

      const slotsPayload = slotsResponse.ok ? await slotsResponse.json() : { slots: [] };
      const revenuePayload = revenueResponse.ok ? await revenueResponse.json() : {};
      const settlementsPayload = settlementsResponse.ok ? await settlementsResponse.json() : { settlements: [] };

      const nextSlots = Array.isArray(slotsPayload?.slots)
        ? slotsPayload.slots.map((slot, index) => normalizeSlot(slot, index))
        : [];

      setSlots(nextSlots);
      setRevenueStats(normalizeRevenueStats(revenuePayload));
      setSettlements(normalizeSettlements(settlementsPayload));
      setSelectedSlotId((current) => (nextSlots.some((slot) => slot.id === current) ? current : nextSlots[0]?.id || null));
    } catch (loadError) {
      console.error('Failed to load ad settings:', loadError);
      setError('광고 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      setSlots([]);
      setSettlements([]);
      setRevenueStats(normalizeRevenueStats());
      setSelectedSlotId(null);
    } finally {
      setLoading(false);
    }
  }, [authToken, getAuthHeaders]);

  useEffect(() => {
    loadAdData();
  }, [loadAdData]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(overlayUrl);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = overlayUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const handleAddSlot = () => {
    const newSlot = normalizeSlot({
      ...defaultSlotData,
      id: Date.now(),
      name: `광고 슬롯 ${slots.length + 1}`,
    });

    setSlots((current) => [...current, newSlot]);
    setSelectedSlotId(newSlot.id);
  };

  const handleUpdateSlot = useCallback((id, updatedSlot) => {
    setSlots((current) => current.map((slot) => (slot.id === id ? normalizeSlot(updatedSlot) : slot)));
  }, []);

  const handleDeleteSlot = (id) => {
    setSlots((current) => current.filter((slot) => slot.id !== id));
    setSelectedSlotId((current) => (current === id ? null : current));
  };

  const handleToggleSlot = (id) => {
    setSlots((current) =>
      current.map((slot) => (slot.id === id ? { ...slot, enabled: !slot.enabled } : slot))
    );
  };

  const handleSave = async () => {
    if (!authToken) {
      setError('로그인 후 광고 슬롯을 저장할 수 있습니다.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await mockFetch(`${API_URL}/api/ads/slots`, {
        method: 'PUT',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          slots: slots.map((slot) => ({
            id: slot.id,
            name: slot.name,
            type: slot.type,
            position: slot.position,
            size: slot.size,
            enabled: slot.enabled,
          })),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || '광고 슬롯 저장에 실패했습니다.');
      }

      setFeedback('광고 슬롯 설정이 저장되었습니다.');
      await loadAdData();
    } catch (saveError) {
      console.error('Failed to save ad slots:', saveError);
      setError(saveError.message || '광고 슬롯 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const selectedSlot = slots.find((slot) => slot.id === selectedSlotId) || null;
  const totalSlotRevenue = slots.reduce((sum, slot) => sum + Number(slot.revenue || 0), 0);
  const totalSlotImpressions = slots.reduce((sum, slot) => sum + Number(slot.impressions || 0), 0);
  const totalSlotClicks = slots.reduce((sum, slot) => sum + Number(slot.clicks || 0), 0);

  if (!isAuthenticated) {
    return (
      <div className="ad-settings animate-fade">
        <div className="editor-placeholder" style={{ maxWidth: '680px', margin: '80px auto' }}>
          <LogIn size={32} />
          <h4>로그인이 필요합니다</h4>
          <p>광고 슬롯 설정과 수익·정산 현황은 로그인한 스트리머 계정에서만 확인할 수 있습니다.</p>
          <button className="btn-copy" type="button" style={{ marginTop: '20px' }} onClick={() => navigate('/login')}>
            <LogIn size={16} />
            로그인하러 가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ad-settings animate-fade">
      <header className="page-header">
        <div className="page-title">
          <h1>광고 관리</h1>
          <p>광고 슬롯 배치, 광고 수익, 월별 정산 현황을 한 곳에서 관리해 보세요.</p>
        </div>
        <div className="header-buttons">
          <button className="btn-primary" type="button" onClick={handleSave} disabled={saving || loading}>
            {saving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />}
            {saving ? '저장 중...' : '설정 저장'}
          </button>
        </div>
      </header>

      {error ? (
        <div className="ad-settings-banner ad-settings-banner--error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      ) : null}

      {feedback ? (
        <div className="ad-settings-banner ad-settings-banner--success">
          <Check size={16} />
          <span>{feedback}</span>
        </div>
      ) : null}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span>총 노출 수</span>
            <Eye size={14} />
          </div>
          <div className="stat-content">
            <span className="value">{formatFullNumber(revenueStats.totalImpressions)}</span>
            <span className="subtext">이번 달 기준</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>총 클릭 수</span>
            <MousePointerClick size={14} />
          </div>
          <div className="stat-content">
            <span className="value">{formatFullNumber(revenueStats.totalClicks)}</span>
            <span className="subtext">CTR {formatPercent(revenueStats.ctr, 2)}</span>
          </div>
        </div>

        <div className="stat-card highlight">
          <div className="stat-header">
            <span>예상 광고 수익</span>
            <TrendingUp size={14} />
          </div>
          <div className="stat-content">
            <span className="value">{formatCurrency(revenueStats.totalRevenue)}</span>
            <span className="subtext">정산 대기 {formatCurrency(revenueStats.pendingSettlement)}</span>
          </div>
        </div>
      </div>

      <div className="tabs-container">
        <button
          className={`tab-btn ${activeTab === 'slots' ? 'active' : ''}`}
          type="button"
          onClick={() => setActiveTab('slots')}
        >
          <Move size={16} />
          슬롯 설정
        </button>
        <button
          className={`tab-btn ${activeTab === 'revenue' ? 'active' : ''}`}
          type="button"
          onClick={() => setActiveTab('revenue')}
        >
          <BarChartIcon />
          광고 수익
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          type="button"
          onClick={() => setActiveTab('history')}
        >
          <Calendar size={16} />
          정산 내역
        </button>
      </div>

      {loading ? (
        <div className="revenue-section glass-card">
          <LoadingSpinner />
        </div>
      ) : null}

      {!loading && activeTab === 'slots' ? (
        <div className="slot-settings-container">
          <div className="overlay-url-section glass-card">
            <div className="url-header">
              <LinkIcon size={18} />
              <h3>광고 오버레이 URL</h3>
            </div>
            <p className="url-description">
              아래 URL을 OBS 브라우저 소스로 추가하면 저장한 슬롯 위치 그대로 광고가 노출됩니다.
            </p>
            <div className="url-input-row">
              <input type="text" className="url-input" value={overlayUrl} readOnly />
              <button className={`btn-copy ${copied ? 'copied' : ''}`} type="button" onClick={handleCopyUrl}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? '복사 완료' : 'URL 복사'}
              </button>
              <a href={overlayUrl} target="_blank" rel="noopener noreferrer" className="btn-preview">
                <ExternalLink size={16} />
                미리보기
              </a>
            </div>
          </div>

          <div className="slot-settings-main">
            <SlotPreviewCanvas
              slots={slots}
              selectedSlotId={selectedSlotId}
              onSelectSlot={setSelectedSlotId}
              onUpdateSlot={handleUpdateSlot}
            />

            <div className="slot-list-section">
              <div className="section-header">
                <h3>광고 슬롯 목록</h3>
                <button className="btn-add-slot" type="button" onClick={handleAddSlot}>
                  <Plus size={16} />
                  슬롯 추가
                </button>
              </div>

              {!slots.length ? (
                <div className="empty-state">
                  <DollarSign size={48} />
                  <h4>등록된 광고 슬롯이 없습니다</h4>
                  <p>하나 이상의 슬롯을 배치하면 오버레이에서 광고가 노출됩니다.</p>
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
                        {slot.type === 'banner' ? <Image size={20} /> : null}
                        {slot.type === 'popup' ? <Video size={20} /> : null}
                        {slot.type === 'corner' ? <Maximize2 size={20} /> : null}
                      </div>
                      <div className="slot-item-info">
                        <div className="slot-item-name">{slot.name}</div>
                        <div className="slot-item-details">
                          {slot.size.width}x{slot.size.height}px · 위치 {slot.position.x}%, {slot.position.y}%
                        </div>
                      </div>
                      <div className="slot-item-stats">
                        <span>{formatFullNumber(slot.impressions)} 노출</span>
                        <span>{formatCurrency(slot.revenue)}</span>
                      </div>
                      <div className="slot-item-actions">
                        <button
                          className={`btn-toggle ${slot.enabled ? 'active' : ''}`}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleToggleSlot(slot.id);
                          }}
                          title={slot.enabled ? '노출 중지' : '노출 시작'}
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
                <h4>슬롯을 선택해 주세요</h4>
                <p>캔버스나 목록에서 슬롯을 고르면 위치와 크기, 노출 상태를 편집할 수 있습니다.</p>
              </div>
            )}

            <div className="tips-card">
              <h4>
                <AlertCircle size={14} />
                사용 팁
              </h4>
              <ul>
                <li>슬롯은 드래그해서 위치를 조정할 수 있습니다.</li>
                <li>우측 하단 핸들로 슬롯 크기를 빠르게 바꿀 수 있습니다.</li>
                <li>비활성화된 슬롯은 저장 후 오버레이에서 숨겨집니다.</li>
                <li>변경 후에는 꼭 설정 저장 버튼을 눌러 주세요.</li>
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      {!loading && activeTab === 'revenue' ? (
        <div className="revenue-section glass-card">
          <h3>슬롯별 광고 수익</h3>

          {!slots.length ? (
            <div className="empty-state">
              <TrendingUp size={48} />
              <h4>표시할 수익 데이터가 없습니다</h4>
              <p>광고 슬롯을 저장하고 광고가 노출되면 슬롯별 수익이 쌓입니다.</p>
            </div>
          ) : (
            <>
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
                      {slot.type === 'banner' ? <Image size={16} /> : null}
                      {slot.type === 'popup' ? <Video size={16} /> : null}
                      {slot.type === 'corner' ? <Maximize2 size={16} /> : null}
                      {slot.name}
                    </span>
                    <span>{formatFullNumber(slot.impressions)}</span>
                    <span>{formatFullNumber(slot.clicks)}</span>
                    <span>
                      {slot.impressions > 0
                        ? formatPercent(slot.clicks / slot.impressions, 2, { isRatio: true })
                        : '0.00%'}
                    </span>
                    <span className="revenue-amount">{formatCurrency(slot.revenue)}</span>
                  </div>
                ))}

                <div className="revenue-row total">
                  <span>합계</span>
                  <span>{formatFullNumber(totalSlotImpressions)}</span>
                  <span>{formatFullNumber(totalSlotClicks)}</span>
                  <span>
                    {totalSlotImpressions > 0
                      ? formatPercent(totalSlotClicks / totalSlotImpressions, 2, { isRatio: true })
                      : '0.00%'}
                  </span>
                  <span className="revenue-amount">{formatCurrency(totalSlotRevenue)}</span>
                </div>
              </div>

              <div className="ad-settings-summary-grid">
                <div className="ad-settings-summary-card">
                  <span className="ad-settings-summary-label">평균 클릭당 수익</span>
                  <strong>{formatCurrency(revenueStats.avgRevenuePerClick)}</strong>
                </div>
                <div className="ad-settings-summary-card">
                  <span className="ad-settings-summary-label">정산 대기 금액</span>
                  <strong>{formatCurrency(revenueStats.pendingSettlement)}</strong>
                </div>
              </div>
            </>
          )}
        </div>
      ) : null}

      {!loading && activeTab === 'history' ? (
        <div className="settlement-section glass-card">
          <h3>정산 내역</h3>

          {!settlements.length ? (
            <div className="empty-state">
              <Calendar size={48} />
              <h4>정산 내역이 없습니다</h4>
              <p>광고 수익이 발생하면 월 단위로 정산 이력이 표시됩니다.</p>
            </div>
          ) : (
            <div className="settlement-list">
              {settlements.map((settlement) => (
                <div key={`${settlement.period}-${settlement.status}`} className="settlement-item">
                  <div className="settlement-period">
                    <Calendar size={16} />
                    {formatSettlementLabel(settlement.period)}
                  </div>
                  <div className="settlement-amount">{formatCurrency(settlement.revenue)}</div>
                  <div className={`settlement-status ${settlement.status}`}>
                    {settlement.status === 'paid' ? <Check size={14} /> : <RefreshCw size={14} />}
                    {getSettlementStatusLabel(settlement.status)}
                  </div>
                  <div className="settlement-date">{settlement.paidDate || '지급 예정 전'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

const BarChartIcon = () => <TrendingUp size={16} />;

export default AdSettings;
