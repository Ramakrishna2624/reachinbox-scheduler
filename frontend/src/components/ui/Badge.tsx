import React from 'react';
import { clsx } from 'clsx';

type BadgeVariant = 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED' | 'default';

const variantMap: Record<BadgeVariant, string> = {
  SCHEDULED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  PROCESSING: 'bg-purple-500/10 text-purple-400 border-purple-500/20 animate-pulse',
  SENT: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  FAILED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  default: 'bg-slate-700/40 text-slate-300 border-slate-700',
};

interface BadgeProps {
  status?: BadgeVariant;
  label?: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status = 'default', label, className }) => (
  <span
    className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border',
      variantMap[status] || variantMap.default,
      className
    )}
  >
    {label || status}
  </span>
);
