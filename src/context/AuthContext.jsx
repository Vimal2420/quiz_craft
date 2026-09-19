import React, { createContext, useContext, useState, useEffect } from 'react';
import { ApiClient } from '../lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usersList, setUsersList] = useState([]);

  // Fetch users for admin portal
  const fetchUsers = async () => {
    try {
      const data = await ApiClient.get('/api/admin/users');
      if (data && data.users) {
        setUsersList(data.users);
        return data.users;
      }
    } catch (err) {
      console.warn('Could not fetch users from backend:', err.message);
    }
    return [];
  };

  // Restore session from token on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = ApiClient.getToken();
      if (token) {
        try {
          const data = await ApiClient.get('/api/auth/me');
          if (data && data.user) {
            setUser(data.user);
            setRole(data.user.role);
            if (data.user.role === 'admin') {
              fetchUsers();
            }
          } else {
            ApiClient.clearToken();
          }
        } catch (err) {
          console.warn('Session expired, clearing token.');
          ApiClient.clearToken();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password, expectedRole = 'user') => {
    const cleanEmail = email.trim().toLowerCase();

    try {
      const data = await ApiClient.post('/api/auth/login', {
        email: cleanEmail,
        password,
        expectedRole
      });

      if (data && data.token && data.user) {
        ApiClient.setToken(data.token);
        setUser(data.user);
        setRole(data.user.role);

        if (data.user.role === 'admin') {
          fetchUsers();
        }
        return data.user;
      }
    } catch (err) {
      throw err;
    }
  };

  const signup = async (name, email, password, targetRole = 'user', phone = '') => {
    const cleanEmail = email.trim().toLowerCase();

    try {
      const data = await ApiClient.post('/api/auth/register', {
        name: name.trim(),
        email: cleanEmail,
        phone: phone.trim(),
        password
      });

      return {
        pendingApproval: data.pendingApproval !== undefined ? data.pendingApproval : true,
        message: data.message
      };
    } catch (err) {
      throw err;
    }
  };

  const logout = async () => {
    ApiClient.clearToken();
    setUser(null);
    setRole(null);
  };

  // Admin actions: Approve / Reject candidate registration
  const approveUser = async (userId, allowedAttempts = 3) => {
    try {
      await ApiClient.put(`/api/admin/users/${userId}/approve`, { allowedAttempts });
      await fetchUsers();
    } catch (err) {
      console.error('Failed to approve user:', err);
      throw err;
    }
  };

  const updateAttempts = async (userId, allowedAttempts, remainingAttempts) => {
    try {
      await ApiClient.put(`/api/admin/users/${userId}/attempts`, { allowedAttempts, remainingAttempts });
      await fetchUsers();
    } catch (err) {
      console.error('Failed to update attempts:', err);
      throw err;
    }
  };

  const refreshUser = async () => {
    try {
      const data = await ApiClient.get('/api/auth/me');
      if (data.user) {
        setUser(data.user);
        setRole(data.user.role);
      }
    } catch (err) {
      console.warn('Failed to refresh user profile:', err.message);
    }
  };

  const rejectUser = async (userId) => {
    try {
      await ApiClient.put(`/api/admin/users/${userId}/reject`);
      await fetchUsers();
    } catch (err) {
      console.error('Failed to reject user:', err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        login,
        signup,
        logout,
        usersList,
        approveUser,
        updateAttempts,
        refreshUser,
        rejectUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
