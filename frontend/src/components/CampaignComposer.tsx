import React, { useState } from 'react';
import { parseEmailLeads, ParsedEmailResult } from '../utils/emailParser';
import api from '../services/api';
import { Send, Upload, FileText, CheckCircle2, AlertCircle, Clock, ShieldCheck, X } from 'lucide-react';

interface CampaignComposerProps {
  onSuccess?: () => void;
}

export const CampaignComposer: React.FC<CampaignComposerProps> = ({ onSuccess }) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  
  // Format default start time to 5 minutes from now in ISO datetime-local format
  const defaultStartTime = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16);
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [delayMs, setDelayMs] = useState(1000);
  const [hourlyLimit, setHourlyLimit] = useState(100);

  const [rawTextRecipients, setRawTextRecipients] = useState('');
  const [parseResult, setParseResult] = useState<ParsedEmailResult>({
    validEmails: [],
    invalidCount: 0,
    totalExtracted: 0,
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successSummary, setSuccessSummary] = useState<any | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawTextRecipients(content);
        const result = parseEmailLeads(content);
        setParseResult(result);
      }
    };
    reader.readAsText(file);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setRawTextRecipients(text);
    const result = parseEmailLeads(text);
    setParseResult(result);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (parseResult.validEmails.length === 0) {
      setErrorMessage('Please upload a CSV/TXT lead file or enter at least one valid recipient email.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        subject,
        body,
        sender: senderEmail ? { email: senderEmail, displayName: senderName } : undefined,
        startTime: new Date(startTime).toISOString(),
        delayBetweenEmailsMs: Number(delayMs),
        hourlyLimit: Number(hourlyLimit),
        recipients: parseResult.validEmails,
      };

      const res = await api.post<{ success: boolean; data: any }>('/campaigns', payload);

      if (res.data.success) {
        setSuccessSummary(res.data.data);
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to schedule campaign';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-card border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl glow-gradient text-white shadow-md shadow-blue-500/20">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Create Email Dispatch Campaign</h3>
            <p className="text-xs text-slate-400">Configure schedule parameters, delay thresholds, and email lead lists</p>
          </div>
        </div>
        <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <ShieldCheck className="w-3.5 h-3.5" /> BullMQ Delayed Engine
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successSummary ? (
        <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-4 text-slate-200">
          <div className="flex items-center space-x-3 text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
            <h4 className="text-lg font-bold">Campaign Successfully Scheduled!</h4>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 block">Campaign ID</span>
              <span className="font-mono text-white font-semibold truncate block">{successSummary.campaignId}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 block">Scheduled Jobs</span>
              <span className="text-emerald-400 font-bold text-base">{successSummary.scheduledCount} / {successSummary.recipientCount}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 block">First Email Dispatch</span>
              <span className="text-slate-200 font-medium">{new Date(successSummary.firstScheduledAt).toLocaleTimeString()}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 block">Final Email Dispatch</span>
              <span className="text-slate-200 font-medium">{new Date(successSummary.lastScheduledAt).toLocaleTimeString()}</span>
            </div>
          </div>

          <button
            onClick={() => {
              setSuccessSummary(null);
              setSubject('');
              setBody('');
              setRawTextRecipients('');
              setParseResult({ validEmails: [], invalidCount: 0, totalExtracted: 0 });
            }}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-all"
          >
            Schedule Another Campaign
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Subject & Body */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Subject *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Welcome to ReachInbox Cold Outreach Platform"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Body Template *
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Hi there,\n\nWe are excited to share our latest scheduling features with you..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Sender Email
                  </label>
                  <input
                    type="email"
                    placeholder="outreach@reachinbox.ai"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Sender Name
                  </label>
                  <input
                    type="text"
                    placeholder="ReachInbox Sales"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Schedule Settings & Lead File Upload */}
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Delay (Ms) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={delayMs}
                    onChange={(e) => setDelayMs(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Hourly Limit *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={hourlyLimit}
                    onChange={(e) => setHourlyLimit(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* CSV/TXT Lead File Upload Area */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Upload Lead File (CSV / TXT)
                  </label>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                      {parseResult.validEmails.length} Valid Leads
                    </span>
                    {parseResult.invalidCount > 0 && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                        {parseResult.invalidCount} Ignored
                      </span>
                    )}
                  </div>
                </div>

                <div className="border-2 border-dashed border-slate-800 hover:border-blue-500/50 rounded-xl p-4 text-center transition-colors bg-slate-900/40">
                  <input
                    type="file"
                    accept=".csv, .txt"
                    onChange={handleFileUpload}
                    id="lead-file-input"
                    className="hidden"
                  />
                  <label htmlFor="lead-file-input" className="cursor-pointer flex flex-col items-center space-y-1">
                    <Upload className="w-6 h-6 text-blue-400" />
                    <span className="text-xs text-slate-300 font-medium">
                      Click to upload <code className="text-blue-400 font-mono">.csv</code> or <code className="text-blue-400 font-mono">.txt</code> lead file
                    </span>
                  </label>
                </div>
              </div>

              {/* Raw Email Text Area */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Or paste emails manually (separated by commas / newlines)
                </label>
                <textarea
                  rows={3}
                  placeholder="alex@company.com, sarah@startup.io, team@enterprise.org"
                  value={rawTextRecipients}
                  onChange={handleTextChange}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none font-mono"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl glow-gradient text-white font-bold text-sm shadow-xl shadow-blue-500/20 transition-all hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Scheduling BullMQ Delayed Jobs...</span>
              </>
            ) : (
              <>
                <Clock className="w-4 h-4" />
                <span>Schedule {parseResult.validEmails.length} Email Jobs</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
