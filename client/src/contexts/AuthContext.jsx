import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_URL } from '../config/api';

const AuthContext = createContext(null);

// 감스트 데모 사용자 정보
const gamstUser = {
  id: 1,
  email: 'devil0108@soop.co.kr',
  displayName: '감스트',
  role: 'admin',
  channelId: 'devil0108',
  platform: 'soop',
  userHash: null, // DB에서 가져옴
  avatarUrl: null,
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // 서버에서 감스트 유저 정보 가져오기 (overlayHash 포함)
  const fetchGamstUser = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': 'Bearer auto-login-token',
        },
      });
      if (res.ok) {
        const data = await res.json();
        return {
          ...gamstUser,
          id: data.id,
          email: data.email,
          displayName: data.displayName,
          role: data.role,
          avatarUrl: data.avatarUrl,
          userHash: data.overlayHash,
          channelId: data.channelId || gamstUser.channelId,
          platform: data.platform || gamstUser.platform,
        };
      }
    } catch (e) {
      console.error('Failed to fetch user info:', e);
    }
    return gamstUser;
  };

  // 초기 로딩 시 자동 로그인 (개발/데모 환경)
  useEffect(() => {
    const autoLogin = async () => {
      // 로그아웃 상태가 아니면 자동으로 감스트 로그인
      const isLoggedOut = localStorage.getItem('isLoggedOut') === 'true';
      if (!isLoggedOut) {
        const userData = await fetchGamstUser();
        setUser(userData);
        setIsAuthenticated(true);
      }
      setLoading(false);
    };
    autoLogin();
  }, []);

  // 감스트로 로그인
  const loginAsGamst = async () => {
    const userData = await fetchGamstUser();
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.removeItem('isLoggedOut');
  };

  // 로그아웃
  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.setItem('isLoggedOut', 'true');
  };

  // 더미 함수들 (호환성 유지)
  const register = async () => ({ user });
  const login = async () => ({ user });
  const loginAsGuest = () => {};
  const updateProfile = async () => ({ user });

  const value = {
    user,
    token: isAuthenticated ? 'auto-login-token' : null,
    accessToken: isAuthenticated ? 'auto-login-token' : null,
    loading,
    isAuthenticated,
    register,
    login,
    loginAsGamst,
    loginAsGuest,
    logout,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
