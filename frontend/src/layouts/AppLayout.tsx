import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AppHeader } from '../components/AppHeader';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

interface AppLayoutProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, requireAuth = true }) => {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <LoadingSpinner size="lg" label="Authenticating..." />
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AppHeader />
      <main className="flex-1">{children}</main>
    </div>
  );
};
