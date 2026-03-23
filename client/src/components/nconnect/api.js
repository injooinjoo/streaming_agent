import { API_URL, mockFetch } from '../../config/api';

const readJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const fetchNConnectRanking = async ({
  season = 'preseason-2026',
  period = 'current',
  platform = 'soop',
  limit = 100,
} = {}) => {
  const params = new URLSearchParams({
    season,
    period,
    platform,
    limit: String(limit),
  });

  const response = await mockFetch(`${API_URL}/api/nconnect/ranking?${params.toString()}`);
  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(data?.error || '랭킹 데이터를 불러오지 못했습니다.');
  }

  return data;
};

export const fetchNConnectContents = async ({
  platform = 'all',
  sort = 'viewers',
  limit = 24,
} = {}) => {
  const params = new URLSearchParams({
    platform,
    sort,
    limit: String(limit),
  });

  const response = await mockFetch(`${API_URL}/api/nconnect/contents?${params.toString()}`);
  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(data?.error || '진행 중 콘텐츠를 불러오지 못했습니다.');
  }

  return data;
};

export const fetchNConnectNotices = async () => {
  const response = await mockFetch(`${API_URL}/api/nconnect/notices`);
  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(data?.error || '공지사항을 불러오지 못했습니다.');
  }

  return data;
};

export const fetchNConnectNoticeDetail = async (noticeId) => {
  const response = await mockFetch(`${API_URL}/api/nconnect/notices/${noticeId}`);
  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(data?.error || '공지사항 상세를 불러오지 못했습니다.');
  }

  return data;
};

export const fetchNConnectMembershipStatus = async (accessToken) => {
  const response = await mockFetch(`${API_URL}/api/nconnect/membership-status`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(data?.error || '멤버십 상태를 불러오지 못했습니다.');
  }

  return data;
};
