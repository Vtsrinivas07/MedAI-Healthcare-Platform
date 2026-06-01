import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const _formatApiError = (error) => {
    try {
      if (!error) return 'Unknown error';
      // Axios-style errors
      const resp = error.response;
      if (resp) {
        const status = resp.status;
        const data = resp.data;
        if (data && (data.detail || data.message)) return `${data.detail || data.message} (status ${status})`;
        try {
          return `${JSON.stringify(data)} (status ${status})`;
        } catch (e) {
          return `HTTP ${status}`;
        }
      }
      // Network or other errors
      return error.message || String(error);
    } catch (e) {
      return 'Unexpected error';
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      const { access_token, user } = response;
      
      if (!access_token || !user) {
        throw new Error('Invalid response from server');
      }
      
      localStorage.setItem('authToken', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      setIsAuthenticated(true);
      
      return { success: true, user: user };
    } catch (error) {
      console.error('Login error', error);
      return { success: false, error: _formatApiError(error) };
    }
  };

  const loginWithOTP = async (mobile, otp) => {
    try {
      const response = await authAPI.verifyOTP(mobile, otp);
      const { access_token, user } = response;
      
      localStorage.setItem('authToken', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      setIsAuthenticated(true);
      
      return { success: true, user: user };
    } catch (error) {
      console.error('OTP login error', error);
      return { success: false, error: _formatApiError(error) };
    }
  };

  const loginWithGoogle = async (credential) => {
    try {
      const response = await authAPI.googleAuth(credential);
      const { access_token, user } = response;
      
      localStorage.setItem('authToken', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      setIsAuthenticated(true);
      
      return { success: true, user: user };
    } catch (error) {
      console.error('Google login error', error);
      return { success: false, error: _formatApiError(error) };
    }
  };

  const setAuthSession = (accessToken, nextUser) => {
    if (!accessToken || !nextUser) {
      return;
    }

    localStorage.setItem('authToken', accessToken);
    localStorage.setItem('user', JSON.stringify(nextUser));
    setUser(nextUser);
    setIsAuthenticated(true);
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      const { access_token, user } = response;
      
      localStorage.setItem('authToken', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      setIsAuthenticated(true);
      
      return { success: true, user: user };
    } catch (error) {
      console.error('Registration error', error);
      return { success: false, error: _formatApiError(error) };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      // Silent error, continue with cleanup
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const value = {
    user,
    setUser,
    isAuthenticated,
    loading,
    login,
    loginWithOTP,
    loginWithGoogle,
    setAuthSession,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
