import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  DollarSign,
  Image as ImageIcon,
  Info,
  Link as LinkIcon,
  Search,
  Target,
  Upload,
  Video,
  X,
} from 'lucide-react';
import { API_URL, mockFetch } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import './Advertiser.css';

const getAuthToken = (accessToken) =>
  accessToken || localStorage.getItem('accessToken') || localStorage.getItem('token') || null;

const getStreamerDisplayName = (streamer) => streamer.displayName || streamer.display_name || '이름 없음';

const defaultFormData = {
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
  target_categories: [],
};

const categoryOptions = [
  { id: 'game', label: '게임' },
  { id: 'talk', label: '토크/잡담' },
  { id: 'music', label: '음악' },
  { id: 'art', label: '그림/창작' },
  { id: 'sports', label: '스포츠' },
  { id: 'education', label: '교육' },
];

const CampaignCreate = ({ campaign, onBack, onSuccess }) => {
  const { accessToken } = useAuth();
  const fileInputRef = useRef(null);
  const isEdit = Boolean(campaign);

  const [formData, setFormData] = useState(defaultFormData);
  const [selectedStreamerIds, setSelectedStreamerIds] = useState([]);
  const [streamerSearch, setStreamerSearch] = useState('');
  const [streamers, setStreamers] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const authToken = getAuthToken(accessToken);

  useEffect(() => {
    const nextFormData = campaign
      ? {
          name: campaign.name || '',
          content_type: campaign.content_type || 'image',
          content_url: campaign.content_url || '',
          click_url: campaign.click_url || '',
          budget_daily: Number(campaign.budget_daily || 0),
          budget_total: Number(campaign.budget_total || 0),
          cpm: Number(campaign.cpm || 1000),
          cpc: Number(campaign.cpc || 100),
          start_date: campaign.start_date?.split('T')[0] || '',
          end_date: campaign.end_date?.split('T')[0] || '',
          target_streamers: campaign.target_streamers || 'all',
          target_categories: (() => {
            if (Array.isArray(campaign.target_categories)) {
              return campaign.target_categories;
            }

            if (typeof campaign.target_categories === 'string' && campaign.target_categories) {
              try {
                return JSON.parse(campaign.target_categories);
              } catch {
                return [];
              }
            }

            return [];
          })(),
        }
      : defaultFormData;

    setFormData(nextFormData);

    if (campaign?.target_streamers && campaign.target_streamers !== 'all') {
      try {
        const parsed = JSON.parse(campaign.target_streamers);
        setSelectedStreamerIds(Array.isArray(parsed) ? parsed.map(String) : []);
      } catch {
        setSelectedStreamerIds([]);
      }
    } else {
      setSelectedStreamerIds([]);
    }

    if (campaign?.content_url) {
      setPreviewFile({
        url: campaign.content_url,
        type: campaign.content_type || 'image',
        name: campaign.name || 'campaign-asset',
        isObjectUrl: false,
      });
    } else {
      setPreviewFile(null);
    }
  }, [campaign]);

  useEffect(() => {
    return () => {
      if (previewFile?.isObjectUrl) {
        URL.revokeObjectURL(previewFile.url);
      }
    };
  }, [previewFile]);

  useEffect(() => {
    const fetchStreamers = async () => {
      if (!authToken) {
        return;
      }

      try {
        const response = await mockFetch(`${API_URL}/api/users/streamers`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const normalizedStreamers = Array.isArray(data)
          ? data.map((streamer) => ({
              ...streamer,
              id: String(streamer.id),
              displayName: getStreamerDisplayName(streamer),
              viewersAvg: streamer.viewersAvg || streamer.viewers_avg || 0,
            }))
          : [];

        setStreamers(normalizedStreamers);
      } catch (error) {
        console.error('Failed to fetch streamers', error);
        setStreamers([
          { id: '1', displayName: '스트리머A', viewersAvg: 1200 },
          { id: '2', displayName: '스트리머B', viewersAvg: 850 },
          { id: '3', displayName: '스트리머C', viewersAvg: 2100 },
        ]);
      }
    };

    fetchStreamers();
  }, [authToken]);

  const selectedStreamers = useMemo(
    () => streamers.filter((streamer) => selectedStreamerIds.includes(String(streamer.id))),
    [selectedStreamerIds, streamers]
  );

  const filteredStreamers = useMemo(() => {
    const normalizedQuery = streamerSearch.trim().toLowerCase();

    return streamers.filter((streamer) => {
      if (!normalizedQuery) {
        return true;
      }

      return getStreamerDisplayName(streamer).toLowerCase().includes(normalizedQuery);
    });
  }, [streamerSearch, streamers]);

  const handleInputChange = (field, value) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((current) => ({
        ...current,
        [field]: null,
      }));
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      setErrors((current) => ({
        ...current,
        content: '이미지 또는 동영상 파일만 업로드할 수 있습니다.',
      }));
      return;
    }

    if (previewFile?.isObjectUrl) {
      URL.revokeObjectURL(previewFile.url);
    }

    const previewUrl = URL.createObjectURL(file);
    setPreviewFile({
      url: previewUrl,
      type: isVideo ? 'video' : 'image',
      name: file.name,
      isObjectUrl: true,
    });

    handleInputChange('content_type', isVideo ? 'video' : 'image');

    setUploading(true);
    window.setTimeout(() => {
      handleInputChange('content_url', previewUrl);
      setUploading(false);
    }, 600);
  };

  const handleStreamerToggle = (streamerId) => {
    handleInputChange('target_streamers', 'selected');

    setSelectedStreamerIds((current) =>
      current.includes(String(streamerId))
        ? current.filter((id) => id !== String(streamerId))
        : [...current, String(streamerId)]
    );
  };

  const removeStreamer = (streamerId) => {
    setSelectedStreamerIds((current) => {
      const nextIds = current.filter((id) => id !== String(streamerId));

      if (nextIds.length === 0) {
        handleInputChange('target_streamers', 'all');
      }

      return nextIds;
    });
  };

  const toggleCategory = (categoryId) => {
    const alreadySelected = formData.target_categories.includes(categoryId);
    handleInputChange(
      'target_categories',
      alreadySelected
        ? formData.target_categories.filter((item) => item !== categoryId)
        : [...formData.target_categories, categoryId]
    );
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.name.trim()) {
      nextErrors.name = '캠페인 이름을 입력해주세요.';
    }

    if (!formData.content_url) {
      nextErrors.content = '광고 소재를 업로드해주세요.';
    }

    if (Number(formData.budget_total) <= 0) {
      nextErrors.budget_total = '총 예산은 1원 이상이어야 합니다.';
    }

    if (!formData.start_date) {
      nextErrors.start_date = '시작일을 선택해주세요.';
    }

    if (!formData.end_date) {
      nextErrors.end_date = '종료일을 선택해주세요.';
    }

    if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
      nextErrors.end_date = '종료일은 시작일보다 같거나 늦어야 합니다.';
    }

    if (formData.target_streamers === 'selected' && selectedStreamerIds.length === 0) {
      nextErrors.target_streamers = '노출할 스트리머를 하나 이상 선택해주세요.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!authToken || !validateForm()) {
      return;
    }

    const serializedTargetStreamers = formData.target_streamers === 'all' ? 'all' : JSON.stringify(selectedStreamerIds);

    const payload = {
      name: formData.name.trim(),
      content_type: formData.content_type,
      content_url: formData.content_url,
      click_url: formData.click_url,
      budget_daily: Number(formData.budget_daily || 0),
      budget_total: Number(formData.budget_total || 0),
      cpm: Number(formData.cpm || 0),
      cpc: Number(formData.cpc || 0),
      start_date: formData.start_date,
      end_date: formData.end_date,
      target_streamers: serializedTargetStreamers,
      target_categories: JSON.stringify(formData.target_categories),
      contentType: formData.content_type,
      contentUrl: formData.content_url,
      clickUrl: formData.click_url,
      budgetDaily: Number(formData.budget_daily || 0),
      budgetTotal: Number(formData.budget_total || 0),
      startDate: formData.start_date,
      endDate: formData.end_date,
      targetStreamers: formData.target_streamers === 'all' ? 'all' : selectedStreamerIds,
      targetCategories: formData.target_categories,
    };

    setSubmitting(true);

    try {
      const url = isEdit ? `${API_URL}/api/ads/campaigns/${campaign.id}` : `${API_URL}/api/ads/campaigns`;
      const response = await mockFetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        setErrors({
          submit: data.error || '캠페인을 저장하지 못했습니다.',
        });
        return;
      }

      onSuccess?.();
    } catch (error) {
      console.error('Failed to save campaign', error);
      setErrors({
        submit: '캠페인을 저장하는 중 오류가 발생했습니다.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade">
      <header className="page-header">
        <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button type="button" className="btn-outline" style={{ padding: '10px', borderRadius: '10px' }} onClick={onBack}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1>{isEdit ? '캠페인 수정' : '새 캠페인 만들기'}</h1>
            <p>{isEdit ? '광고 노출 조건과 예산을 업데이트합니다.' : '새 광고 캠페인을 만들고 노출 대상을 설정합니다.'}</p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="campaign-form-container">
        <div className="campaign-form-card">
          <h3>
            <Info size={18} /> 기본 정보
          </h3>
          <div className="form-row single">
            <div className="form-field">
              <label>캠페인 이름 *</label>
              <input
                type="text"
                placeholder="예: 신작 게임 런칭 캠페인"
                value={formData.name}
                onChange={(event) => handleInputChange('name', event.target.value)}
              />
              {errors.name ? <span className="hint" style={{ color: '#ef4444' }}>{errors.name}</span> : null}
            </div>
          </div>
        </div>

        <div className="campaign-form-card">
          <h3>
            <ImageIcon size={18} /> 광고 소재
          </h3>

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
              <div className={`file-upload-area ${previewFile ? 'has-file' : ''}`} onClick={() => fileInputRef.current?.click()}>
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
                    <h4>업로드 중입니다...</h4>
                  </>
                ) : previewFile ? (
                  <div className="file-preview">
                    {previewFile.type === 'video' ? (
                      <video src={previewFile.url} style={{ maxHeight: '120px' }} controls />
                    ) : (
                      <img src={previewFile.url} alt="광고 미리보기" />
                    )}
                    <span className="file-preview-name">{previewFile.name || '업로드한 파일'}</span>
                  </div>
                ) : (
                  <>
                    <div className="file-upload-icon">
                      <Upload size={24} />
                    </div>
                    <h4>파일을 선택하거나 드래그해서 업로드하세요</h4>
                    <p>PNG, JPG, GIF, MP4, WebM</p>
                  </>
                )}
              </div>
              {errors.content ? <span className="hint" style={{ color: '#ef4444' }}>{errors.content}</span> : null}
            </div>
          </div>

          <div className="form-row single">
            <div className="form-field">
              <label>
                <LinkIcon size={14} /> 클릭 이동 URL
              </label>
              <input
                type="url"
                placeholder="https://example.com"
                value={formData.click_url}
                onChange={(event) => handleInputChange('click_url', event.target.value)}
              />
              <span className="hint">광고 클릭 시 열릴 랜딩 페이지 주소입니다.</span>
            </div>
          </div>
        </div>

        <div className="campaign-form-card">
          <h3>
            <Target size={18} /> 노출 대상
          </h3>

          <div className="form-row single">
            <div className="form-field">
              <label>스트리머 대상</label>
              <div className="targeting-grid">
                <div
                  className={`targeting-option ${formData.target_streamers === 'all' ? 'selected' : ''}`}
                  onClick={() => {
                    handleInputChange('target_streamers', 'all');
                    setSelectedStreamerIds([]);
                  }}
                >
                  <span>전체 스트리머</span>
                </div>
                <div
                  className={`targeting-option ${formData.target_streamers === 'selected' ? 'selected' : ''}`}
                  onClick={() => handleInputChange('target_streamers', 'selected')}
                >
                  <span>선택한 스트리머만</span>
                </div>
              </div>
              {errors.target_streamers ? (
                <span className="hint" style={{ color: '#ef4444' }}>{errors.target_streamers}</span>
              ) : null}
            </div>
          </div>

          {formData.target_streamers === 'selected' ? (
            <div className="form-row single" style={{ marginTop: '16px' }}>
              <div className="form-field">
                <div className="streamer-search">
                  <Search size={16} className="streamer-search-icon" />
                  <input
                    type="text"
                    placeholder="스트리머 검색"
                    value={streamerSearch}
                    onChange={(event) => setStreamerSearch(event.target.value)}
                  />
                </div>

                <div className="streamer-list">
                  {filteredStreamers.map((streamer) => {
                    const id = String(streamer.id);
                    const isSelected = selectedStreamerIds.includes(id);

                    return (
                      <div
                        key={id}
                        className={`streamer-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleStreamerToggle(id)}
                      >
                        <div className="streamer-avatar">{getStreamerDisplayName(streamer).charAt(0).toUpperCase()}</div>
                        <div className="streamer-info">
                          <span className="streamer-name">{getStreamerDisplayName(streamer)}</span>
                          <span className="streamer-stats">평균 시청자 {Number(streamer.viewersAvg || 0).toLocaleString()}명</span>
                        </div>
                        {isSelected ? <Check size={16} className="streamer-check" /> : null}
                      </div>
                    );
                  })}
                </div>

                {selectedStreamers.length > 0 ? (
                  <div className="selected-streamers">
                    {selectedStreamers.map((streamer) => (
                      <span key={streamer.id} className="selected-streamer-tag">
                        {getStreamerDisplayName(streamer)}
                        <button type="button" onClick={() => removeStreamer(streamer.id)}>
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="form-row single" style={{ marginTop: '20px' }}>
            <div className="form-field">
              <label>카테고리 타겟팅</label>
              <div className="targeting-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {categoryOptions.map((category) => (
                  <div
                    key={category.id}
                    className={`targeting-option ${formData.target_categories.includes(category.id) ? 'selected' : ''}`}
                    onClick={() => toggleCategory(category.id)}
                  >
                    <span>{category.label}</span>
                  </div>
                ))}
              </div>
              <span className="hint">선택하지 않으면 모든 카테고리에서 노출됩니다.</span>
            </div>
          </div>
        </div>

        <div className="campaign-form-card">
          <h3>
            <DollarSign size={18} /> 예산 설정
          </h3>

          <div className="form-row">
            <div className="form-field">
              <label>일일 예산</label>
              <div className="budget-input-wrapper">
                <span className="budget-currency">₩</span>
                <input
                  type="number"
                  min="0"
                  value={formData.budget_daily || ''}
                  onChange={(event) => handleInputChange('budget_daily', Number(event.target.value) || 0)}
                />
              </div>
              <span className="hint">0으로 두면 일일 한도 없이 운영합니다.</span>
            </div>

            <div className="form-field">
              <label>총 예산 *</label>
              <div className="budget-input-wrapper">
                <span className="budget-currency">₩</span>
                <input
                  type="number"
                  min="0"
                  value={formData.budget_total || ''}
                  onChange={(event) => handleInputChange('budget_total', Number(event.target.value) || 0)}
                />
              </div>
              {errors.budget_total ? <span className="hint" style={{ color: '#ef4444' }}>{errors.budget_total}</span> : null}
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>CPM</label>
              <div className="budget-input-wrapper">
                <span className="budget-currency">₩</span>
                <input
                  type="number"
                  min="0"
                  value={formData.cpm || ''}
                  onChange={(event) => handleInputChange('cpm', Number(event.target.value) || 0)}
                />
              </div>
            </div>

            <div className="form-field">
              <label>CPC</label>
              <div className="budget-input-wrapper">
                <span className="budget-currency">₩</span>
                <input
                  type="number"
                  min="0"
                  value={formData.cpc || ''}
                  onChange={(event) => handleInputChange('cpc', Number(event.target.value) || 0)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="campaign-form-card">
          <h3>
            <Info size={18} /> 집행 기간
          </h3>
          <div className="form-row">
            <div className="form-field">
              <label>시작일 *</label>
              <input type="date" value={formData.start_date} onChange={(event) => handleInputChange('start_date', event.target.value)} />
              {errors.start_date ? <span className="hint" style={{ color: '#ef4444' }}>{errors.start_date}</span> : null}
            </div>

            <div className="form-field">
              <label>종료일 *</label>
              <input type="date" value={formData.end_date} onChange={(event) => handleInputChange('end_date', event.target.value)} />
              {errors.end_date ? <span className="hint" style={{ color: '#ef4444' }}>{errors.end_date}</span> : null}
            </div>
          </div>
        </div>

        {errors.submit ? (
          <div
            style={{
              padding: '12px 16px',
              background: '#fef2f2',
              borderRadius: '8px',
              color: '#ef4444',
              marginBottom: '20px',
            }}
          >
            {errors.submit}
          </div>
        ) : null}

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
