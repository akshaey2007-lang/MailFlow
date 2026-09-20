import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('mailflow_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('mailflow_access_token'));
  const [loading, setLoading] = useState(true);

  // Sync session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('mailflow_access_token');
      if (token) {
        try {
          const profile = await authApi.getProfile();
          setUser(profile);
          localStorage.setItem('mailflow_user', JSON.stringify(profile));
        } catch (err) {
          // Token expired and refresh failed
          logout();
        }
      }
      setLoading(false);
    };

    const handleCustomLogout = () => {
      logout();
    };

    window.addEventListener('mailflow_logout', handleCustomLogout);
    checkAuth();

    return () => {
      window.removeEventListener('mailflow_logout', handleCustomLogout);
    };
  }, []);

  const login = async (email, password) => {
    const data = await authApi.login(email, password);
    const { access, refresh, user: loggedInUser } = data;

    localStorage.setItem('mailflow_access_token', access);
    localStorage.setItem('mailflow_refresh_token', refresh);
    localStorage.setItem('mailflow_user', JSON.stringify(loggedInUser));

    setAccessToken(access);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const register = async (userData) => {
    const data = await authApi.register(userData);
    const { tokens, user: registeredUser } = data;

    localStorage.setItem('mailflow_access_token', tokens.access);
    localStorage.setItem('mailflow_refresh_token', tokens.refresh);
    localStorage.setItem('mailflow_user', JSON.stringify(registeredUser));

    setAccessToken(tokens.access);
    setUser(registeredUser);
    return registeredUser;
  };

  const logout = () => {
    localStorage.removeItem('mailflow_access_token');
    localStorage.removeItem('mailflow_refresh_token');
    localStorage.removeItem('mailflow_user');
    setAccessToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('mailflow_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!accessToken,
        loading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
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
