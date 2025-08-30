import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';

interface AuthContextType {
  token: string | null;
  isLoading: boolean;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshToken = async () => {
    try {
      if (isSignedIn) {
        // Get session token specifically for backend API authentication
        const newToken = await getToken({
          template: "contextly-backend-jwt"
        });
        if (newToken) {
          setToken(newToken);
          sessionStorage.setItem('clerk_token', newToken);
        }
      } else {
        setToken(null);
        sessionStorage.removeItem('clerk_token');
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      setToken(null);
      sessionStorage.removeItem('clerk_token');
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      if (isLoaded) {
        await refreshToken();
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [isLoaded, isSignedIn, getToken]);

  // Refresh token periodically (every 45 minutes)
  useEffect(() => {
    if (!isSignedIn) return;

    const interval = setInterval(() => {
      refreshToken();
    }, 45 * 60 * 1000); // 45 minutes

    return () => clearInterval(interval);
  }, [isSignedIn]);

  const value: AuthContextType = {
    token,
    isLoading,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};