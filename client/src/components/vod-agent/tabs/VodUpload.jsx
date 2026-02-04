import { useState } from 'react';
import {
  Upload, Video, Youtube, Music2, Instagram, Link2, Calendar,
  Check, AlertCircle, X, Copy, ExternalLink
} from 'lucide-react';
import { platforms } from '../data/mockData';

const VodUpload = () => {
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: '',
    platforms: ['shorts', 'tiktok', 'reels'],
    scheduledAt: '',
    thumbnailOption: 'auto'
  });
  const [generatedLink, setGeneratedLink] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // 플랫폼 아이콘
  const PlatformIcon = ({ platform, size = 16 }) => {
    const icons = {
      shorts: <Youtube size={size} />,
      tiktok: <Music2 size={size} />,
      reels: <Instagram size={size} />
    };
    return icons[platform] || null;
  };

  // 파일 드래그 앤 드롭 핸들러
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      setUploadedFile(file);
      // 자동으로 추적 링크 생성
      generateTrackingLink();
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFile(file);
      generateTrackingLink();
    }
  };

  // 추적 링크 생성
  const generateTrackingLink = () => {
    const randomId = Math.random().toString(36).substring(2, 8);
    setGeneratedLink(`https://vod.link/${randomId}`);
  };

  // 플랫폼 토글
  const togglePlatform = (platform) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }));
  };

  // 업로드 시뮬레이션
  const handleUpload = () => {
    if (!uploadedFile || formData.platforms.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    // 업로드 진행 시뮬레이션
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploading(false);
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  // 링크 복사
  const copyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
    }
  };

  // 파일 제거
  const removeFile = () => {
    setUploadedFile(null);
    setGeneratedLink(null);
    setUploadProgress(0);
  };

  return (
    <div className="animate-fade">
      <header className="vod-page-header">
        <div className="vod-page-title">
          <h1>영상 업로드</h1>
          <p>릴스, 쇼츠, 틱톡에 한 번에 업로드하세요</p>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: uploadedFile ? '1fr 400px' : '1fr', gap: '24px' }}>
        {/* 메인 폼 영역 */}
        <div>
          {/* 업로드 영역 */}
          {!uploadedFile ? (
            <div
              className={`vod-upload-zone ${dragOver ? 'drag-over' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input').click()}
            >
              <input
                id="file-input"
                type="file"
                accept="video/*"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              <div className="vod-upload-icon">
                <Upload size={32} />
              </div>
              <div className="vod-upload-text">클릭하거나 영상을 드래그하세요</div>
              <div className="vod-upload-hint">
                MP4, MOV, WebM 지원 · 최대 500MB · 세로 영상 권장 (9:16)
              </div>
            </div>
          ) : (
            <>
              {/* 업로드된 파일 미리보기 */}
              <div className="vod-section">
                <div className="vod-section-header">
                  <div className="vod-section-title">
                    <Video size={18} style={{ color: 'var(--primary)' }} />
                    <h2>업로드된 영상</h2>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={removeFile}>
                    <X size={14} /> 제거
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'var(--bg-page)', borderRadius: '12px' }}>
                  <div style={{
                    width: '120px',
                    height: '68px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}>
                    <Video size={32} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                      {uploadedFile.name}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div style={{ width: '100px' }}>
                      <div style={{ height: '6px', background: 'var(--border-light)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${uploadProgress}%`,
                          height: '100%',
                          background: 'var(--primary)',
                          transition: 'width 0.3s'
                        }} />
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'center' }}>
                        {uploadProgress}%
                      </div>
                    </div>
                  )}
                  {uploadProgress === 100 && (
                    <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={16} /> 완료
                    </div>
                  )}
                </div>
              </div>

              {/* 영상 정보 폼 */}
              <div className="vod-section">
                <div className="vod-section-header">
                  <div className="vod-section-title">
                    <h2>영상 정보</h2>
                  </div>
                </div>

                <div className="vod-form-group">
                  <label className="vod-form-label">제목</label>
                  <input
                    type="text"
                    className="vod-form-input"
                    placeholder="영상 제목을 입력하세요"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className="vod-form-group">
                  <label className="vod-form-label">
                    설명
                    <span className="vod-form-hint">추적 링크가 자동으로 삽입됩니다</span>
                  </label>
                  <textarea
                    className="vod-form-input vod-form-textarea"
                    placeholder="영상 설명을 입력하세요..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="vod-form-group">
                  <label className="vod-form-label">태그 / 해시태그</label>
                  <input
                    type="text"
                    className="vod-form-input"
                    placeholder="#쇼츠 #틱톡 #릴스"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  />
                </div>

                <div className="vod-form-group">
                  <label className="vod-form-label">업로드 플랫폼</label>
                  <div className="vod-checkbox-group">
                    {Object.entries(platforms).map(([key, platform]) => (
                      <div
                        key={key}
                        className={`vod-checkbox-item ${formData.platforms.includes(key) ? 'checked' : ''}`}
                        onClick={() => togglePlatform(key)}
                        style={{
                          borderColor: formData.platforms.includes(key) ? platform.color : undefined,
                          background: formData.platforms.includes(key) ? platform.bgColor : undefined
                        }}
                      >
                        <div style={{ color: platform.color }}>
                          <PlatformIcon platform={key} size={20} />
                        </div>
                        <span style={{ fontWeight: 500 }}>{platform.name}</span>
                        {formData.platforms.includes(key) && (
                          <Check size={16} style={{ color: platform.color, marginLeft: 'auto' }} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="vod-form-group">
                  <label className="vod-form-label">
                    <Calendar size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    예약 업로드 (선택사항)
                  </label>
                  <input
                    type="datetime-local"
                    className="vod-form-input"
                    value={formData.scheduledAt}
                    onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* 사이드 패널 - 추적 링크 및 미리보기 */}
        {uploadedFile && (
          <div>
            {/* 추적 링크 */}
            <div className="vod-section">
              <div className="vod-section-header">
                <div className="vod-section-title">
                  <Link2 size={18} style={{ color: 'var(--primary)' }} />
                  <h2>추적 링크</h2>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  이 링크가 영상 설명란에 자동으로 삽입됩니다
                </div>
                <div className="vod-link-preview">
                  <span className="vod-link-url">{generatedLink}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-icon btn-ghost" onClick={copyLink} title="복사">
                      <Copy size={16} />
                    </button>
                    <button className="btn btn-icon btn-ghost" title="열기">
                      <ExternalLink size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div style={{
                padding: '16px',
                background: 'rgba(16, 185, 129, 0.1)',
                borderRadius: '10px',
                border: '1px solid rgba(16, 185, 129, 0.2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <AlertCircle size={18} style={{ color: '#10b981', marginTop: '2px' }} />
                  <div>
                    <div style={{ fontWeight: 600, color: '#10b981', marginBottom: '4px' }}>수익 창출 안내</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.5 }}>
                      이 링크를 통해 유입된 사용자가 전환되면 CPA 기반으로 수익이 발생합니다.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 설명 미리보기 */}
            <div className="vod-section">
              <div className="vod-section-header">
                <div className="vod-section-title">
                  <h2>설명 미리보기</h2>
                </div>
              </div>

              <div style={{
                padding: '16px',
                background: 'var(--bg-page)',
                borderRadius: '10px',
                fontSize: '14px',
                color: 'var(--text-main)',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap'
              }}>
                {formData.description || '영상 설명이 여기에 표시됩니다...'}
                {formData.description && '\n\n'}
                <span style={{ color: 'var(--primary)' }}>
                  🔗 더 많은 정보: {generatedLink}
                </span>
                {formData.tags && (
                  <>
                    {'\n\n'}
                    <span style={{ color: 'var(--text-muted)' }}>{formData.tags}</span>
                  </>
                )}
              </div>
            </div>

            {/* 업로드 버튼 */}
            <button
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '16px' }}
              onClick={handleUpload}
              disabled={uploading || formData.platforms.length === 0}
            >
              {uploading ? (
                <>업로드 중... {uploadProgress}%</>
              ) : uploadProgress === 100 ? (
                <>
                  <Check size={18} /> 업로드 완료!
                </>
              ) : (
                <>
                  <Upload size={18} /> {formData.platforms.length}개 플랫폼에 업로드
                </>
              )}
            </button>

            {formData.platforms.length === 0 && (
              <div style={{ textAlign: 'center', fontSize: '13px', color: '#ef4444', marginTop: '8px' }}>
                최소 1개 이상의 플랫폼을 선택하세요
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VodUpload;
