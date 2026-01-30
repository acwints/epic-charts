import { useState, useEffect, useCallback } from 'react';
import { getCurrentUser, setAuthCookie, logout as apiLogout, getAuthUrl, User } from '../services/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const checkAuth = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      setState({ user, isLoading: false, isAuthenticated: true });
    } catch {
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  useEffect(() => {
    // Check for auth token in URL (from OAuth callback)
    const params = new URLSearchParams(window.location.search);
    const authToken = params.get('auth_token');

    if (authToken) {
      // Exchange token for cookie
      setAuthCookie(authToken)
        .then(() => {
          // Remove token from URL
          window.history.replaceState({}, '', window.location.pathname);
          checkAuth();
        })
        .catch(() => {
          setState({ user: null, isLoading: false, isAuthenticated: false });
        });
    } else {
      checkAuth();
    }
  }, [checkAuth]);

  const login = useCallback(async () => {
    try {
      const { auth_url } = await getAuthUrl(window.location.href);
      window.location.href = auth_url;
    } catch (error) {
      console.error('Failed to get auth URL:', error);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
      setState({ user: null, isLoading: false, isAuthenticated: false });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, []);

  return {
    ...state,
    login,
    logout,
    refetch: checkAuth,
  };
}
