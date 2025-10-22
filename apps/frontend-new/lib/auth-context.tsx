'use client';

import { createContext, useContext, useCallback, ReactNode } from 'react';
import { useQuery, ApolloError } from '@/lib/apollo-client';
import { GET_CURRENT_USER } from '@/lib/graphql/queries/user';
import { GetCurrentUserQuery, User, UserType } from '@/lib/generated/graphql';
import { logout as logoutApi } from '@/lib/auth';

export type AuthUser = {
  id: string;
  email: string;
  username: string | null;
  fullName: string | null;
  userType: UserType;
};

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: ApolloError | undefined;
  login: () => Promise<void>;
  logout: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, loading, error, refetch } = useQuery<GetCurrentUserQuery>(GET_CURRENT_USER, {
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  const user = data?.getCurrentUser 
    ? {
        id: data.getCurrentUser.id,
        email: data.getCurrentUser.email,
        username: data.getCurrentUser.username,
        fullName: data.getCurrentUser.fullName,
        userType: data.getCurrentUser.userType,
      }
    : null;

  const login = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const logout = useCallback(async () => {
    const success = await logoutApi();
    if (success) {
      await refetch();
    }
    return success;
  }, [refetch]);

  const refreshUser = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const value: AuthContextValue = {
    user,
    loading,
    error,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
