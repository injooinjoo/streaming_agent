import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_URL } from '../config/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // OAuth 콜백 토큰 처리
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const oauthToken = urlParams.get('token');

    if (oauthToken) {
      localStorage.setItem('token', oauthToken);
      setToken(oauthToken);
      // URL에서 토큰 파라미터 제거
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // 토큰이 있으면 사용자 정보 로드
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const res = await fetch(`${API_URL}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (res.ok) {
            const userData = await res.json();
            setUser(userData);
          } else {
            // 토큰이 유효하지 않으면 제거
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
          }
        } catch (err) {
          console.error('Failed to load user:', err);
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    loadUser();
  }, [token]);

  // 회원가입
  const register = async (email, password, displayName) => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, displayName }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || '회원가입에 실패했습니다.');
    }

    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);

    return data;
  };

  // 로그인
  const login = async (email, password) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || '로그인에 실패했습니다.');
    }

    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);

    return data;
  };

  // 로그아웃
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  // 프로필 수정
  const updateProfile = async (displayName, avatarUrl) => {
    const res = await fetch(`${API_URL}/api/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ displayName, avatarUrl }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || '프로필 수정에 실패했습니다.');
    }

    setUser(prev => ({
      ...prev,
      displayName: data.user.displayName,
      avatarUrl: data.user.avatarUrl,
    }));

    return data;
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    register,
    login,
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
