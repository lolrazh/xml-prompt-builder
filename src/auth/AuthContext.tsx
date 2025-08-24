import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { tokenManager } from './auth-client';
import { loadCachedUser, saveCachedUser, clearCachedUser, type CachedUser } from './auth-cache';
import type { DisplayUser } from './useBetterAuth';

interface AuthContextType {
  manualUser: DisplayUser | null;
  setManualUser: (user: DisplayUser | null) => void;
  manualLoading: boolean;
  setManualLoading: (loading: boolean) => void;
  clearManualAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [manualUser, setManualUser] = useState<DisplayUser | null>(null);
  const [manualLoading, setManualLoading] = useState(false);

  // Hydrate manual user from cache on mount if we have JWT tokens
  useEffect(() => {
    const token = tokenManager.getToken();
    const cached = loadCachedUser();
    
    if (token && cached && !manualUser) {
      console.log('Hydrating manual user from cache:', cached);
      const displayUserData: DisplayUser = {
        id: cached.id,
        email: cached.email,
        name: `${cached.firstName || ''} ${cached.lastName || ''}`.trim() || cached.email || '',
        image: cached.profilePictureUrl,
        emailVerified: false,
        createdAt: cached.createdAt,
        updatedAt: cached.updatedAt,
      };
      setManualUser(displayUserData);
    }
  }, [manualUser]);

  // Persist manual user to cache whenever it changes
  useEffect(() => {
    if (manualUser) {
      console.log('Saving manual user to cache:', manualUser);
      const cachedUser: CachedUser = {
        id: manualUser.id || '',
        email: manualUser.email || '',
        firstName: manualUser.name?.split(' ')[0] || null,
        lastName: manualUser.name?.split(' ').slice(1).join(' ') || null,
        profilePictureUrl: manualUser.image || null,
        createdAt: manualUser.createdAt || new Date().toISOString(),
        updatedAt: manualUser.updatedAt || new Date().toISOString(),
      };
      saveCachedUser(cachedUser);
    }
  }, [manualUser]);

  const clearManualAuth = () => {
    console.log('Clearing manual auth state');
    setManualUser(null);
    clearCachedUser();
    tokenManager.clearToken();
  };

  return (
    <AuthContext.Provider 
      value={{ 
        manualUser, 
        setManualUser, 
        manualLoading, 
        setManualLoading,
        clearManualAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}