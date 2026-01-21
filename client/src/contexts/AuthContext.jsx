import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_URL } from '../config/api';

const AuthContext = createContext(null);

// 기본 사용자 정보 (overlayHash는 API에서 가져옴)
const defaultUser = {
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
  const [user, setUser] = useState(defaultUser);
  const [loading, setLoading] = useState(true);

  // 서버에서 유저 정보 가져오기 (overlayHash 포함)
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            'Authorization': 'Bearer auto-login-token',
          },
        });
        if (res.ok) {
          const data = await res.json();
          setUser({
            ...defaultUser,
            id: data.id,
            email: data.email,
            displayName: data.displayName,
            role: data.role,
            avatarUrl: data.avatarUrl,
            userHash: data.overlayHash, // DB에서 가져온 해시
          });
        }
      } catch (e) {
        console.error('Failed to fetch user info:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  // 더미 함수들 (호환성 유지)
  const register = async () => ({ user });
  const login = async () => ({ user });
  const loginAsGuest = () => {};
  const logout = () => {};
  const updateProfile = async () => ({ user });

  const value = {
    user,
    token: 'auto-login-token',
    accessToken: 'auto-login-token', // alias for compatibility
    loading,
    isAuthenticated: true,
    register,
    login,
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
