import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { useScheduledEmails } from '../hooks/useScheduledEmails';
import { useSentEmails } from '../hooks/useSentEmails';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { EmptyState, ErrorMessage } from '../components/ui/EmptyState';
import { LoadingSpinner, SkeletonRow } from '../components/ui/LoadingSpinner';
import { ComposePage } from './ComposePage';
import { AppLayout } from '../layouts/AppLayout';
import {
  CalendarClock, CheckCircle2, RefreshCw, PlusCircle,
  ChevronLeft, ChevronRight, ExternalLink
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  try { return format(parseISO(iso), 'MMM d, yyyy · HH:mm'); } catch { return iso; }
};

const TABS = [
  { id: 'scheduled', label: 'Scheduled', icon: <CalendarClock className="w-4 h-4" /> },
  { id: 'sent', label: 'Sent / Failed', icon: <CheckCircle2 className="w-4 h-4" /> },
];

// ── Pagination control ────────────────────────────────────────────────────────
const Pagination: React.FC<{
  page: number; totalPages: number; onPage: (p: number) => void;
}> = ({ page, totalPages, onPage }) => (
  <div className="flex items-center justify-between pt-4 border-t border-slate-800/60">
    <span className="text-xs text-slate-500">
      Page <span className="font-medium text-slate-300">{page}</span> of{' '}
      <span className="font-medium text-slate-300">{totalPages}</span>
    </span>
    <div className="flex gap-2">
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}
        icon={<ChevronLeft className="w-3.5 h-3.5" />}>Prev</Button>
      <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}
        icon={<ChevronRight className="w-3.5 h-3.5" />}>Next</Button>
    </div>
  </div>
);

// ── Scheduled Table ───────────────────────────────────────────────────────────
const ScheduledTable: React.FC<{ onRefresh: () => void }> = ({ onRefresh }) => {
  const { data, meta, loading, error, load } = useScheduledEmails();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const fetch = useCallback((p = page, s = statusFilter) => {
    load({ page: p, limit: 20, status: s || undefined });
  }, [load, page, statusFilter]);

  useEffect(() => { fetch(1, ''); }, []);

  const handlePage = (p: number) => { setPage(p); fetch(p); };
  const handleFilter = (s: string) => { setStatusFilter(s); setPage(1); fetch(1, s); };

  if (error) return <ErrorMessage message={error} onRetry={() => fetch()} />;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {['', 'SCHEDULED', 'PROCESSING', 'SENT', 'FAILED'].map((s) => (
            <button
              key={s}
              onClick={() => handleFilter(s)}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
                statusFilter === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />}
          onClick={() => { onRefresh(); fetch(); }} className="ml-auto">
          Refresh
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800/80 bg-slate-900/50">
              {['Recipient', 'Subject', 'Scheduled At', 'Status', 'Attempts'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    title="No scheduled emails"
                    description="Create a campaign to start scheduling emails."
                    icon="mail"
                  />
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row.id} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-200">{row.email}</td>
                  <td className="px-4 py-3 text-slate-300 max-w-[200px] truncate" title={row.subject}>{row.subject}</td>
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{fmtDate(row.scheduledAt)}</td>
                  <td className="px-4 py-3">
                    <Badge status={row.status as any} label={row.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-center">{row.attempts}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {meta && meta.totalPages > 1 && (
        <Pagination page={page} totalPages={meta.totalPages} onPage={handlePage} />
      )}
      {meta && (
        <p className="text-xs text-slate-500 text-right">
          {meta.total.toLocaleString()} total recipients
        </p>
      )}
    </div>
  );
};

// ── Sent/Failed Table ─────────────────────────────────────────────────────────
const SentTable: React.FC<{ onRefresh: () => void }> = ({ onRefresh }) => {
  const { data, meta, loading, error, load } = useSentEmails();
  const [page, setPage] = useState(1);

  useEffect(() => { load({ page: 1, limit: 20 }); }, []);

  const handlePage = (p: number) => { setPage(p); load({ page: p, limit: 20 }); };

  if (error) return <ErrorMessage message={error} onRetry={() => load({ page })} />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />}
          onClick={() => { onRefresh(); load({ page }); }}>
          Refresh
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800/80 bg-slate-900/50">
              {['Recipient', 'Subject', 'Sent / Failed At', 'Status', 'Message ID', 'Reason'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    title="No emails sent yet"
                    description="Sent and failed emails will appear here once campaigns are processed."
                    icon="inbox"
                  />
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row.id} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-200">{row.email}</td>
                  <td className="px-4 py-3 text-slate-300 max-w-[160px] truncate" title={row.subject}>{row.subject}</td>
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{fmtDate(row.sentAt)}</td>
                  <td className="px-4 py-3">
                    <Badge status={row.status as any} label={row.status} />
                  </td>
                  <td className="px-4 py-3">
                    {row.messageId ? (
                      <span className="text-xs font-mono text-blue-400 truncate block max-w-[140px]" title={row.messageId}>
                        {row.messageId.slice(0, 20)}…
                      </span>
                    ) : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {row.errorMessage ? (
                      <span className="text-xs text-rose-400 truncate block max-w-[160px]" title={row.errorMessage}>
                        {row.errorMessage.slice(0, 60)}
                      </span>
                    ) : <span className="text-slate-600">—</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {meta && meta.totalPages > 1 && (
        <Pagination page={page} totalPages={meta.totalPages} onPage={handlePage} />
      )}
      {meta && (
        <p className="text-xs text-slate-500 text-right">
          {meta.total.toLocaleString()} total records
        </p>
      )}
    </div>
  );
};

// ── Dashboard Page ────────────────────────────────────────────────────────────
export const DashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [composeOpen, setComposeOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <AppLayout requireAuth>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Page Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Email Dashboard</h1>
            <p className="text-sm text-slate-400 mt-0.5">Monitor and manage your scheduled campaigns</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/docs" className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-400 transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /> Ethereal Docs
            </Link>
            <Button
              variant="primary"
              icon={<PlusCircle className="w-4 h-4" />}
              onClick={() => setComposeOpen(true)}
              id="open-compose"
            >
              Compose Email
            </Button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center gap-1 p-1 bg-slate-900/70 rounded-2xl border border-slate-800 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'glow-gradient text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table Panel */}
        <div className="glass-card border border-slate-800/80 rounded-2xl p-6">
          {activeTab === 'scheduled' && (
            <ScheduledTable key={refreshKey} onRefresh={refresh} />
          )}
          {activeTab === 'sent' && (
            <SentTable key={refreshKey} onRefresh={refresh} />
          )}
        </div>
      </div>

      {/* Compose Modal */}
      <Modal
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        title="Compose & Schedule Campaign"
        size="lg"
      >
        <ComposePage
          onSuccess={() => { setComposeOpen(false); refresh(); }}
          onCancel={() => setComposeOpen(false)}
        />
      </Modal>
    </AppLayout>
  );
};
