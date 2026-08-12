import React from 'react';
import { Inbox, Mail, AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: 'inbox' | 'mail' | 'error';
  action?: React.ReactNode;
}

const iconMap = {
  inbox: Inbox,
  mail: Mail,
  error: AlertCircle,
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = 'inbox',
  action,
}) => {
  const Icon = iconMap[icon];
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
      <div className="p-4 rounded-2xl bg-slate-800/60 text-slate-400">
        <Icon className="w-10 h-10" />
      </div>
      <div className="space-y-1">
        <h4 className="text-base font-bold text-slate-200">{title}</h4>
        {description && <p className="text-sm text-slate-500 max-w-xs">{description}</p>}
      </div>
      {action}
    </div>
  );
};

export const ErrorMessage: React.FC<{ message: string; onRetry?: () => void }> = ({
  message,
  onRetry,
}) => (
  <div className="flex flex-col items-center justify-center py-12 space-y-4">
    <div className="p-4 rounded-2xl bg-rose-500/10 text-rose-400">
      <AlertCircle className="w-8 h-8" />
    </div>
    <p className="text-sm text-rose-400 font-medium">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="text-xs text-blue-400 hover:text-blue-300 underline font-medium"
      >
        Try again
      </button>
    )}
  </div>
);
