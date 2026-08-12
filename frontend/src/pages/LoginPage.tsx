import React from 'react';
import { CheckCircle2, Zap, Shield, Database, Mail } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../services/api';

const GOOGLE_ICON = (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

const features = [
  { icon: <Database className="w-4 h-4" />, text: 'PostgreSQL + Prisma persistent storage' },
  { icon: <Zap className="w-4 h-4" />, text: 'BullMQ + Redis queue-driven scheduling' },
  { icon: <Shield className="w-4 h-4" />, text: 'Distributed atomic idempotency guards' },
  { icon: <Mail className="w-4 h-4" />, text: 'Ethereal Email SMTP preview delivery' },
];

export const LoginPage: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (!loading && isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient gradients */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-purple-600/8 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md">
        <div className="glass-card border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-8">
          {/* Brand */}
          <div className="text-center space-y-3">
            <div className="inline-flex p-4 rounded-2xl glow-gradient text-white shadow-xl shadow-blue-500/25 mb-1">
              <Mail className="w-9 h-9" />
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">ReachInbox</h1>
            <p className="text-sm text-slate-400">
              Production-grade persistent email scheduling engine
            </p>
          </div>

          {/* Features */}
          <div className="space-y-2.5 py-2 border-y border-slate-800/80">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-xs text-slate-300">
                <span className="text-emerald-400">{f.icon}</span>
                {f.text}
              </div>
            ))}
          </div>

          {/* OAuth */}
          <div className="space-y-4">
            <a
              href={`${API_BASE_URL}/auth/google`}
              className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 hover:bg-slate-100 font-bold text-sm py-3.5 px-6 rounded-2xl shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              {GOOGLE_ICON}
              Continue with Google
            </a>
            <p className="text-[11px] text-center text-slate-500 flex items-center justify-center gap-1.5">
              <Shield className="w-3 h-3" />
              Real Google OAuth 2.0 · No mock authentication
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          ReachInbox Scheduler · Internship Technical Assessment
        </p>
      </div>
    </div>
  );
};
