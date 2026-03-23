import { createContext, useContext, useEffect, useState } from 'react';
import { API_URL, USE_MOCK_DATA, mockFetch } from '../config/api';
import { PUBLIC_DEMO_MODE } from '../config/appMode';

const AuthContext = createContext(null);

const ACCESS_TOKEN_KEY = 'accessToken';
const LEGACY_TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';
const DEMO_ACCESS_TOKEN = 'auto-login-token';
const MOCK_REFRESH_TOKEN = 'mock-refresh-token';

const demoUser = {
  id: 1,
  email: 'devil0108@soop.co.kr',
  displayName: '\uAC10\uC2A4\uD2B8',
  role: 'admin',
  channelId: 'devil0108',
  platform: 'soop',
  userHash: null,
  overlayHash: null,
  avatarUrl: null,
};

const normalizeUser = (rawUser) => {
  if (!rawUser) return null;

  const overlayHash =
    rawUser.overlayHash ??
    rawUser.overlay_hash ??
    rawUser.userHash ??
    null;

  return {
    ...rawUser,
    displayName: rawUser.displayName ?? rawUser.display_name ?? '',
    avatarUrl: rawUser.avatarUrl ?? rawUser.avatar_url ?? null,
    role: rawUser.role ?? 'user',
    channelId: rawUser.channelId ?? rawUser.channel_id ?? null,
    platform: rawUser.platform ?? null,
    userHash: overlayHash,
    overlayHash,
  };
};

const getStoredTokens = () => {
  const accessToken =
    localStorage.getItem(ACCESS_TOKEN_KEY) ||
    localStorage.getItem(LEGACY_TOKEN_KEY) ||
    null;
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY) || null;

  return { accessToken, refreshToken };
};

const storeTokens = ({ accessToken, refreshToken, token } = {}) => {
  const resolvedAccessToken = accessToken || token || null;

  if (resolvedAccessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, resolvedAccessToken);
    localStorage.setItem(LEGACY_TOKEN_KEY, resolvedAccessToken);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  }

  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};

const clearStoredTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

const getAuthHeaders = (accessToken, headers = {}) => {
  if (!accessToken) return headers;

  return {
    ...headers,
    Authorization: `Bearer ${accessToken}`,
  };
};

const readJsonSafely = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const getTokensFromQuery = () => {
  const params = new URLSearchParams(window.location.search);
  const accessToken = params.get('accessToken') || params.get('token');
  const refreshToken = params.get('refreshToken');

  if (!accessToken && !refreshToken) {
    return null;
  }

  params.delete('token');
  params.delete('accessToken');
  params.delete('refreshToken');

  const nextSearch = params.toString();
  const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
  window.history.replaceState({}, document.title, nextUrl);

  return { accessToken, refreshToken };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const clearSession = () => {
    clearStoredTokens();
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    setIsAuthenticated(false);
  };

  const commitSession = (tokens, nextUser) => {
    const normalizedUser = normalizeUser(nextUser);
    const nextAccessToken = tokens?.accessToken || tokens?.token || null;
    const nextRefreshToken = tokens?.refreshToken || null;

    storeTokens({
      accessToken: nextAccessToken,
      refreshToken: nextRefreshToken,
    });

    setAccessToken(nextAccessToken);
    setRefreshToken(nextRefreshToken);
    setUser(normalizedUser);
    setIsAuthenticated(Boolean(nextAccessToken && normalizedUser));

    return normalizedUser;
  };

  const fetchCurrentUser = async (token) => {
    const response = await mockFetch(`${API_URL}/api/auth/me`, {
      headers: getAuthHeaders(token),
    });
    const data = await readJsonSafely(response);

    if (!response.ok) {
      throw new Error(data?.error || 'Failed to load user.');
    }

    return normalizeUser(data);
  };

  const refreshAccessToken = async (currentRefreshToken) => {
    if (!currentRefreshToken) {
      return null;
    }

    if (USE_MOCK_DATA) {
      return {
        accessToken: DEMO_ACCESS_TOKEN,
        refreshToken: currentRefreshToken || MOCK_REFRESH_TOKEN,
      };
    }

    const response = await mockFetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: currentRefreshToken }),
    });
    const data = await readJsonSafely(response);

    if (!response.ok) {
      return null;
    }

    return {
      accessToken: data?.accessToken || data?.token || null,
      refreshToken: data?.refreshToken || currentRefreshToken,
    };
  };

  useEffect(() => {
    const restoreSession = async () => {
      setLoading(true);

      if (PUBLIC_DEMO_MODE) {
        try {
          const currentUser =
            (await fetchCurrentUser(DEMO_ACCESS_TOKEN).catch(() => null)) ||
            normalizeUser(demoUser);

          commitSession(
            {
              accessToken: DEMO_ACCESS_TOKEN,
              refreshToken: MOCK_REFRESH_TOKEN,
            },
            currentUser
          );
        } finally {
          setLoading(false);
        }

        return;
      }

      const storedTokens = getStoredTokens();
      const queryTokens = getTokensFromQuery();
      let tokens = queryTokens
        ? {
            accessToken: queryTokens.accessToken || storedTokens.accessToken,
            refreshToken: queryTokens.refreshToken || storedTokens.refreshToken,
          }
        : storedTokens;

      if (!tokens.accessToken && tokens.refreshToken) {
        const refreshedTokens = await refreshAccessToken(tokens.refreshToken);
        if (refreshedTokens?.accessToken) {
          tokens = refreshedTokens;
        }
      }

      if (!tokens.accessToken) {
        clearSession();
        setLoading(false);
        return;
      }

      try {
        const currentUser = await fetchCurrentUser(tokens.accessToken);
        commitSession(tokens, currentUser);
      } catch (error) {
        const refreshedTokens = await refreshAccessToken(tokens.refreshToken);

        if (refreshedTokens?.accessToken) {
          try {
            const refreshedUser = await fetchCurrentUser(refreshedTokens.accessToken);
            commitSession(refreshedTokens, refreshedUser);
          } catch (retryError) {
            console.error('Failed to restore authenticated session:', retryError);
            clearSession();
          }
        } else {
          console.error('Failed to restore authenticated session:', error);
          clearSession();
        }
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (email, password) => {
    if (USE_MOCK_DATA) {
      const currentUser = {
        ...(await fetchCurrentUser(DEMO_ACCESS_TOKEN)),
        email: email || demoUser.email,
      };

      commitSession(
        {
          accessToken: DEMO_ACCESS_TOKEN,
          refreshToken: MOCK_REFRESH_TOKEN,
        },
        currentUser
      );

      return { user: currentUser };
    }

    const response = await mockFetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await readJsonSafely(response);

    if (!response.ok) {
      throw new Error(data?.error || 'Login failed.');
    }

    const tokens = {
      accessToken: data?.accessToken || data?.token || null,
      refreshToken: data?.refreshToken || null,
    };
    const currentUser =
      (tokens.accessToken && (await fetchCurrentUser(tokens.accessToken).catch(() => null))) ||
      normalizeUser(data?.user);

    commitSession(tokens, currentUser);

    return { user: currentUser };
  };

  const register = async (email, password, displayName) => {
    if (USE_MOCK_DATA) {
      const currentUser = {
        ...(await fetchCurrentUser(DEMO_ACCESS_TOKEN)),
        email: email || demoUser.email,
        displayName: displayName || demoUser.displayName,
      };

      commitSession(
        {
          accessToken: DEMO_ACCESS_TOKEN,
          refreshToken: MOCK_REFRESH_TOKEN,
        },
        currentUser
      );

      return { user: currentUser };
    }

    const response = await mockFetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName }),
    });
    const data = await readJsonSafely(response);

    if (!response.ok) {
      throw new Error(data?.error || 'Registration failed.');
    }

    const tokens = {
      accessToken: data?.accessToken || data?.token || null,
      refreshToken: data?.refreshToken || null,
    };
    const currentUser =
      (tokens.accessToken && (await fetchCurrentUser(tokens.accessToken).catch(() => null))) ||
      normalizeUser(data?.user) || {
        email,
        displayName,
      };

    commitSession(tokens, currentUser);

    return { user: currentUser };
  };

  const loginAsGamst = async () => {
    const currentUser =
      (await fetchCurrentUser(DEMO_ACCESS_TOKEN).catch(() => null)) ||
      normalizeUser(demoUser);

    commitSession({ accessToken: DEMO_ACCESS_TOKEN }, currentUser);

    return { user: currentUser };
  };

  const loginAsGuest = () => {
    clearSession();
  };

  const logout = async () => {
    if (PUBLIC_DEMO_MODE) {
      const currentUser =
        (await fetchCurrentUser(DEMO_ACCESS_TOKEN).catch(() => null)) ||
        normalizeUser(demoUser);

      commitSession(
        {
          accessToken: DEMO_ACCESS_TOKEN,
          refreshToken: MOCK_REFRESH_TOKEN,
        },
        currentUser
      );

      return;
    }

    try {
      if (accessToken) {
        await mockFetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: getAuthHeaders(accessToken, {
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ revokeAll: true }),
        });
      }
    } catch (error) {
      console.error('Failed to notify logout:', error);
    } finally {
      clearSession();
    }
  };

  const oauthLogin = (provider) => {
    window.location.href = `${API_URL}/api/auth/${provider}`;
  };

  const updateProfile = async (profile) => {
    if (!accessToken) {
      throw new Error('Authentication required.');
    }

    const response = await mockFetch(`${API_URL}/api/auth/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(accessToken, {
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(profile),
    });
    const data = await readJsonSafely(response);

    if (!response.ok) {
      throw new Error(data?.error || 'Failed to save profile.');
    }

    const nextUser = normalizeUser(data?.user) || {
      ...user,
      ...profile,
    };

    setUser(nextUser);

    return { user: nextUser };
  };

  const value = {
    user,
    token: accessToken,
    accessToken,
    refreshToken,
    loading,
    isLoading: loading,
    isAuthenticated,
    register,
    login,
    loginAsGamst,
    loginAsGuest,
    logout,
    oauthLogin,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
