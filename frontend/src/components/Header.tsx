import React from 'react';
import { Mail, LogOut, ShieldCheck, Zap, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../services/api';

export const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  return (
    <header className="sticky top-0 z-50 glass-card border-b border-slate-800/80 px-6 py-3.5 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="p-2.5 rounded-xl glow-gradient text-white shadow-lg shadow-blue-500/20">
          <Mail className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            ReachInbox Scheduler
          </h1>
          <p className="text-xs text-slate-400 font-medium flex items-center gap-1 mt-0.5">
            <Zap className="w-3 h-3 text-blue-400" /> Persistent BullMQ + Redis Engine
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <ShieldCheck className="w-3.5 h-3.5" /> BullMQ Active
        </span>

        {isAuthenticated && user ? (
          <div className="flex items-center space-x-3 bg-slate-900/90 border border-slate-800 rounded-full py-1 px-1.5 pl-3">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name || 'User Avatar'}
                className="w-7 h-7 rounded-full object-cover ring-2 ring-blue-500/40"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-xs">
                <UserIcon className="w-4 h-4" />
              </div>
            )}
            <div className="text-left pr-1 hidden md:block">
              <div className="text-xs font-bold text-slate-200 leading-tight">
                {user.name || user.email.split('@')[0]}
              </div>
              <div className="text-[10px] text-slate-400 font-mono leading-tight">
                {user.email}
              </div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-full transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleGoogleLogin}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs py-2 px-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continue with Google
          </button>
        )}
      </div>
    </header>
  );
};
