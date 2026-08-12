import React from 'react';
import { Mail, Zap, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserAvatar } from '../ui/UserAvatar';
import { Button } from '../ui/Button';

export const AppHeader: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 glass-card border-b border-slate-800/80 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <a href="/" className="flex items-center space-x-3 group">
          <div className="p-2 rounded-xl glow-gradient text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent leading-tight">
              ReachInbox Scheduler
            </div>
            <div className="text-[10px] text-slate-500 flex items-center gap-1">
              <Zap className="w-3 h-3 text-blue-400" /> Persistent BullMQ Engine
            </div>
          </div>
        </a>
      </div>

      <div className="flex items-center space-x-3">
        {isAuthenticated && user ? (
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-semibold text-slate-200 leading-tight">
                {user.name || user.email.split('@')[0]}
              </span>
              <span className="text-xs text-slate-500">{user.email}</span>
            </div>
            <UserAvatar user={user} size="md" />
            <Button
              variant="ghost"
              size="sm"
              icon={<LogOut className="w-4 h-4" />}
              onClick={logout}
              title="Logout"
            >
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        ) : (
          <a
            href="/api/auth/google"
            className="inline-flex items-center gap-2 glow-gradient text-white font-semibold text-xs py-2 px-4 rounded-xl shadow-lg shadow-blue-500/20 hover:opacity-90 transition-all"
          >
            Continue with Google
          </a>
        )}
      </div>
    </header>
  );
};
