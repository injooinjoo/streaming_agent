import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Image as ImageIcon, Video, Upload, X, Search,
  Check, Info, Target, DollarSign, Calendar, Link as LinkIcon
} from 'lucide-react';
import { API_URL } from '../../config/api';
import './Advertiser.css';

const CampaignCreate = ({ campaign, onBack, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    content_type: 'image',
    content_url: '',
    click_url: '',
    budget_daily: 0,
    budget_total: 0,
    cpm: 1000,
    cpc: 100,
    start_date: '',
    end_date: '',
    target_streamers: 'all',
    target_categories: []
  });
  const [selectedStreamers, setSelectedStreamers] = useState([]);
  const [streamerSearch, setStreamerSearch] = useState('');
  const [streamers, setStreamers] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const fileInputRef = useRef(null);
  const isEdit = !!campaign;

  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name || '',
        content_type: campaign.content_type || 'image',
        content_url: campaign.content_url || '',
        click_url: campaign.click_url || '',
        budget_daily: campaign.budget_daily || 0,
        budget_total: campaign.budget_total || 0,
        cpm: campaign.cpm || 1000,
        cpc: campaign.cpc || 100,
        start_date: campaign.start_date?.split('T')[0] || '',
        end_date: campaign.end_date?.split('T')[0] || '',
        target_streamers: campaign.target_streamers || 'all',
        target_categories: campaign.target_categories ? JSON.parse(campaign.target_categories) : []
      });
      if (campaign.target_streamers && campaign.target_streamers !== 'all') {
        try {
          setSelectedStreamers(JSON.parse(campaign.target_streamers));
        } catch {
          setSelectedStreamers([]);
        }
      }
      if (campaign.content_url) {
        setPreviewFile({ url: campaign.content_url, type: campaign.content_type });
      }
    }
    fetchStreamers();
  }, [campaign]);

  const fetchStreamers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/users/streamers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStreamers(data);
      }
    } catch (err) {
      console.error('Failed to fetch streamers', err);
      // Mock data for development
      setStreamers([
        { id: 1, display_name: '스트리머A', viewers_avg: 1200 },
        { id: 2, display_name: '스트리머B', viewers_avg: 850 },
        { id: 3, display_name: '스트리머C', viewers_avg: 2100 },
        { id: 4, display_name: '게임방송D', viewers_avg: 560 },
        { id: 5, display_name: '토크방송E', viewers_avg: 340 }
      ]);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      setErrors(prev => ({ ...prev, content: '이미지 또는 동영상 파일만 업로드 가능합니다.' }));
      return;
    }

    // Preview
    const url = URL.createObjectURL(file);
    setPreviewFile({ url, file, type: isVideo ? 'video' : 'image' });
    setFormData(prev => ({ ...prev, content_type: isVideo ? 'video' : 'image' }));

    // In a real app, you would upload to server here
    // For now, we'll use a placeholder URL
    setUploading(true);
    setTimeout(() => {
      // Simulated upload - in production, upload to CDN
      setFormData(prev => ({ ...prev, content_url: url }));
      setUploading(false);
    }, 1000);
  };

  const handleStreamerToggle = (streamer) => {
    if (formData.target_streamers === 'all') {
      setFormData(prev => ({ ...prev, target_streamers: 'selected' }));
    }
    const exists = selectedStreamers.find(s => s.id === streamer.id);
    if (exists) {
      setSelectedStreamers(prev => prev.filter(s => s.id !== streamer.id));
    } else {
      setSelectedStreamers(prev => [...prev, streamer]);
    }
  };

  const removeStreamer = (streamerId) => {
    setSelectedStreamers(prev => prev.filter(s => s.id !== streamerId));
    if (selectedStreamers.length <= 1) {
      setFormData(prev => ({ ...prev, target_streamers: 'all' }));
    }
  };

  const toggleCategory = (category) => {
    const exists = formData.target_categories.includes(category);
    if (exists) {
      handleInputChange('target_categories', formData.target_categories.filter(c => c !== category));
    } else {
      handleInputChange('target_categories', [...formData.target_categories, category]);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = '캠페인 이름을 입력해주세요.';
    }
    if (!formData.content_url && !previewFile) {
      newErrors.content = '광고 콘텐츠를 업로드해주세요.';
    }
    if (formData.budget_total <= 0) {
      newErrors.budget = '총 예산을 입력해주세요.';
    }
    if (!formData.start_date) {
      newErrors.start_date = '시작일을 선택해주세요.';
    }
    if (!formData.end_date) {
      newErrors.end_date = '종료일을 선택해주세요.';
    }
    if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
      newErrors.end_date = '종료일은 시작일 이후여야 합니다.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        target_streamers: formData.target_streamers === 'all' ? 'all' : JSON.stringify(selectedStreamers.map(s => s.id)),
        target_categories: JSON.stringify(formData.target_categories)
      };

      const url = isEdit
        ? `${API_URL}/api/ads/campaigns/${campaign.id}`
        : `${API_URL}/api/ads/campaigns`;

      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        setErrors({ submit: data.error || '캠페인 저장에 실패했습니다.' });
      }
    } catch (err) {
      console.error('Failed to save campaign', err);
      setErrors({ submit: '네트워크 오류가 발생했습니다.' });
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    { id: 'game', label: '게임' },
    { id: 'talk', label: '토크/잡담' },
    { id: 'music', label: '음악' },
    { id: 'art', label: '그림/창작' },
    { id: 'sports', label: '스포츠' },
    { id: 'education', label: '교육' }
  ];

  const filteredStreamers = streamers.filter(s =>
    s.display_name?.toLowerCase().includes(streamerSearch.toLowerCase())
  );

  return (
    <div className="animate-fade">
      <header className="page-header">
        <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            className="btn-outline"
            style={{ padding: '10px', borderRadius: '10px' }}
            onClick={onBack}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1>{isEdit ? '캠페인 수정' : '새 캠페인 만들기'}</h1>
            <p>{isEdit ? '캠페인 설정을 수정합니다.' : '광고 캠페인을 생성하고 스트리머에게 노출하세요.'}</p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="campaign-form-container">
        {/* 기본 정보 */}
        <div className="campaign-form-card">
          <h3><Info size={18} /> 기본 정보</h3>
          <div className="form-row single">
            <div className="form-field">
              <label>캠페인 이름 *</label>
              <input
                type="text"
                placeholder="예: 신작 게임 런칭 광고"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
              {errors.name && <span className="hint" style={{ color: '#ef4444' }}>{errors.name}</span>}
            </div>
          </div>
        </div>

        {/* 광고 콘텐츠 */}
        <div className="campaign-form-card">
          <h3><ImageIcon size={18} /> 광고 콘텐츠</h3>
          <div className="form-row single">
            <div className="form-field">
              <label>광고 유형</label>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  className={`mode-btn ${formData.content_type === 'image' ? 'active' : ''}`}
                  onClick={() => handleInputChange('content_type', 'image')}
                  style={{ flex: 1 }}
                >
                  <ImageIcon size={18} /> 이미지
                </button>
                <button
                  type="button"
                  className={`mode-btn ${formData.content_type === 'video' ? 'active' : ''}`}
                  onClick={() => handleInputChange('content_type', 'video')}
                  style={{ flex: 1 }}
                >
                  <Video size={18} /> 동영상
                </button>
              </div>
            </div>
          </div>

          <div className="form-row single">
            <div className="form-field">
              <label>광고 파일 업로드 *</label>
              <div
                className={`file-upload-area ${previewFile ? 'has-file' : ''}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
                {uploading ? (
                  <>
                    <div className="file-upload-icon">
                      <Upload size={24} className="spin" />
                    </div>
                    <h4>업로드 중...</h4>
                  </>
                ) : previewFile ? (
                  <div className="file-preview">
                    {previewFile.type === 'video' ? (
                      <video src={previewFile.url} style={{ maxHeight: '120px' }} controls />
                    ) : (
                      <img src={previewFile.url} alt="Preview" />
                    )}
                    <span className="file-preview-name">
                      {previewFile.file?.name || '업로드된 파일'}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="file-upload-icon">
                      <Upload size={24} />
                    </div>
                    <h4>파일을 드래그하거나 클릭하여 업로드</h4>
                    <p>PNG, JPG, GIF, MP4, WebM (최대 50MB)</p>
                  </>
                )}
              </div>
              {errors.content && <span className="hint" style={{ color: '#ef4444' }}>{errors.content}</span>}
            </div>
          </div>

          <div className="form-row single">
            <div className="form-field">
              <label><LinkIcon size={14} /> 클릭 URL (선택)</label>
              <input
                type="url"
                placeholder="https://example.com/landing-page"
                value={formData.click_url}
                onChange={(e) => handleInputChange('click_url', e.target.value)}
              />
              <span className="hint">광고 클릭 시 이동할 페이지 주소</span>
            </div>
          </div>
        </div>

        {/* 타겟팅 */}
        <div className="campaign-form-card">
          <h3><Target size={18} /> 타겟팅 설정</h3>
          <div className="form-row single">
            <div className="form-field">
              <label>노출 대상 스트리머</label>
              <div className="targeting-grid">
                <div
                  className={`targeting-option ${formData.target_streamers === 'all' ? 'selected' : ''}`}
                  onClick={() => {
                    setFormData(prev => ({ ...prev, target_streamers: 'all' }));
                    setSelectedStreamers([]);
                  }}
                >
                  <span>전체 스트리머</span>
                </div>
                <div
                  className={`targeting-option ${formData.target_streamers === 'selected' ? 'selected' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, target_streamers: 'selected' }))}
                >
                  <span>선택한 스트리머만</span>
                </div>
              </div>
            </div>
          </div>

          {formData.target_streamers === 'selected' && (
            <div className="form-row single" style={{ marginTop: '16px' }}>
              <div className="form-field">
                <div className="streamer-search">
                  <Search size={16} className="streamer-search-icon" />
                  <input
                    type="text"
                    placeholder="스트리머 검색..."
                    value={streamerSearch}
                    onChange={(e) => setStreamerSearch(e.target.value)}
                  />
                </div>
                <div className="streamer-list">
                  {filteredStreamers.map(streamer => {
                    const isSelected = selectedStreamers.some(s => s.id === streamer.id);
                    return (
                      <div
                        key={streamer.id}
                        className={`streamer-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleStreamerToggle(streamer)}
                      >
                        <div className="streamer-avatar">
                          {streamer.display_name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="streamer-info">
                          <span className="streamer-name">{streamer.display_name}</span>
                          <span className="streamer-stats">평균 시청자 {streamer.viewers_avg?.toLocaleString()}명</span>
                        </div>
                        {isSelected && <Check size={16} className="streamer-check" />}
                      </div>
                    );
                  })}
                </div>
                {selectedStreamers.length > 0 && (
                  <div className="selected-streamers">
                    {selectedStreamers.map(streamer => (
                      <span key={streamer.id} className="selected-streamer-tag">
                        {streamer.display_name}
                        <button type="button" onClick={() => removeStreamer(streamer.id)}>
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="form-row single" style={{ marginTop: '20px' }}>
            <div className="form-field">
              <label>타겟 카테고리 (선택)</label>
              <div className="targeting-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {categories.map(category => (
                  <div
                    key={category.id}
                    className={`targeting-option ${formData.target_categories.includes(category.id) ? 'selected' : ''}`}
                    onClick={() => toggleCategory(category.id)}
                  >
                    <span>{category.label}</span>
                  </div>
                ))}
              </div>
              <span className="hint">선택하지 않으면 모든 카테고리에 노출됩니다.</span>
            </div>
          </div>
        </div>

        {/* 예산 설정 */}
        <div className="campaign-form-card">
          <h3><DollarSign size={18} /> 예산 설정</h3>
          <div className="form-row">
            <div className="form-field">
              <label>일일 예산 (KRW)</label>
              <div className="budget-input-wrapper">
                <span className="budget-currency">₩</span>
                <input
                  type="number"
                  placeholder="0"
                  value={formData.budget_daily || ''}
                  onChange={(e) => handleInputChange('budget_daily', parseInt(e.target.value) || 0)}
                />
              </div>
              <span className="hint">하루에 사용할 최대 금액 (0 = 제한 없음)</span>
            </div>
            <div className="form-field">
              <label>총 예산 (KRW) *</label>
              <div className="budget-input-wrapper">
                <span className="budget-currency">₩</span>
                <input
                  type="number"
                  placeholder="0"
                  value={formData.budget_total || ''}
                  onChange={(e) => handleInputChange('budget_total', parseInt(e.target.value) || 0)}
                />
              </div>
              {errors.budget && <span className="hint" style={{ color: '#ef4444' }}>{errors.budget}</span>}
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>CPM (1,000회 노출당 비용)</label>
              <div className="budget-input-wrapper">
                <span className="budget-currency">₩</span>
                <input
                  type="number"
                  placeholder="1000"
                  value={formData.cpm || ''}
                  onChange={(e) => handleInputChange('cpm', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="form-field">
              <label>CPC (클릭당 비용)</label>
              <div className="budget-input-wrapper">
                <span className="budget-currency">₩</span>
                <input
                  type="number"
                  placeholder="100"
                  value={formData.cpc || ''}
                  onChange={(e) => handleInputChange('cpc', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 기간 설정 */}
        <div className="campaign-form-card">
          <h3><Calendar size={18} /> 기간 설정</h3>
          <div className="form-row">
            <div className="form-field">
              <label>시작일 *</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
              />
              {errors.start_date && <span className="hint" style={{ color: '#ef4444' }}>{errors.start_date}</span>}
            </div>
            <div className="form-field">
              <label>종료일 *</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
              />
              {errors.end_date && <span className="hint" style={{ color: '#ef4444' }}>{errors.end_date}</span>}
            </div>
          </div>
        </div>

        {errors.submit && (
          <div style={{ padding: '12px 16px', background: '#fef2f2', borderRadius: '8px', color: '#ef4444', marginBottom: '20px' }}>
            {errors.submit}
          </div>
        )}

        <div className="campaign-form-actions">
          <button type="button" className="btn-cancel" onClick={onBack}>
            취소
          </button>
          <button type="submit" className="btn-submit" disabled={submitting}>
            {submitting ? (
              <>
                <Upload size={16} className="spin" />
                저장 중...
              </>
            ) : (
              <>
                <Check size={16} />
                {isEdit ? '캠페인 수정' : '캠페인 생성'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CampaignCreate;
