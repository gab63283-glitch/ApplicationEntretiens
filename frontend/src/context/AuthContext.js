import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

export const AuthContext = createContext();

const API_URL = 'http://localhost:3002/api';

export const AuthProvider = ({ children }) => {
  const [manager, setManager] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Configuration axios avec le token
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      loadManager();
    } else {
      setLoading(false);
    }
  }, [token]);

  // Charger les infos du manager
  const loadManager = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`);
      setManager(response.data);
    } catch (error) {
      console.error('Erreur chargement manager:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  // Login
  const login = async (email, mot_de_passe) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        mot_de_passe
      });

      const { token, manager } = response.data;
      
      localStorage.setItem('token', token);
      setToken(token);
      setManager(manager);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Erreur de connexion'
      };
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setManager(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  // Vérifier si le token est expiré
  const isTokenExpired = () => {
    if (!token) return true;
    try {
      const decoded = jwtDecode(token);
      return decoded.exp < Date.now() / 1000;
    } catch {
      return true;
    }
  };

  const value = {
    manager,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!token && !isTokenExpired()
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};