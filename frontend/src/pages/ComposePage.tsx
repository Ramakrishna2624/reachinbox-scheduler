import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { FileUploader } from '../components/ui/FileUploader';
import { createCampaign } from '../services/api';
import { useToast } from '../context/ToastContext';
import { ParsedLeads } from '../utils/emailParser';
import { CreateCampaignPayload } from '../types';
import {
  Users, Clock, Zap, AlertTriangle, CheckCircle2, Mail
} from 'lucide-react';

interface ComposePageProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const localISOString = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 5);
  return d.toISOString().slice(0, 16);
};

export const ComposePage: React.FC<ComposePageProps> = ({ onSuccess, onCancel }) => {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [startTime, setStartTime] = useState(localISOString());
  const [delayMs, setDelayMs] = useState('1000');
  const [hourlyLimit, setHourlyLimit] = useState('50');
  const [leads, setLeads] = useState<ParsedLeads | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!subject.trim()) e.subject = 'Subject is required';
    if (!body.trim()) e.body = 'Email body is required';
    if (!senderEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail))
      e.senderEmail = 'Valid sender email required';
    if (!leads || leads.validEmails.length === 0) e.leads = 'At least one valid email lead required';
    if (new Date(startTime) <= new Date()) e.startTime = 'Start time must be in the future';
    const delay = Number(delayMs);
    if (isNaN(delay) || delay < 0) e.delayMs = 'Delay must be ≥ 0';
    const limit = Number(hourlyLimit);
    if (isNaN(limit) || limit < 1 || limit > 500) e.hourlyLimit = 'Hourly limit: 1–500';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload: CreateCampaignPayload = {
        subject,
        body,
        sender: { email: senderEmail, displayName: senderName || undefined },
        startTime: new Date(startTime).toISOString(),
        delayBetweenEmailsMs: Number(delayMs),
        hourlyLimit: Number(hourlyLimit),
        recipients: leads!.validEmails,
      };
      const result = await createCampaign(payload);
      showToast(
        `Campaign scheduled! ${result.scheduledCount} emails queued starting ${new Date(result.firstScheduledAt).toLocaleString()}.`,
        'success'
      );
      onSuccess?.();
      if (!onSuccess) navigate('/dashboard');
    } catch (err: any) {
      showToast(err?.response?.data?.error?.message || 'Failed to schedule campaign', 'error');
    } finally {
      setLoading(false);
    }
  };

  const totalValid = leads?.validEmails.length ?? 0;
  const totalInvalid = leads?.invalidCount ?? 0;
  const hasLeads = totalValid > 0;
  const delayNum = Number(delayMs) || 0;
  const limitNum = Number(hourlyLimit) || 0;
  const totalDurationMs = totalValid > 1 ? (totalValid - 1) * delayNum : 0;
  const hours = Math.floor(totalDurationMs / 3600000);
  const minutes = Math.floor((totalDurationMs % 3600000) / 60000);

  return (
    <div className="space-y-6">
      {/* Sender */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Sender Email"
          type="email"
          placeholder="you@example.com"
          value={senderEmail}
          onChange={(e) => setSenderEmail(e.target.value)}
          error={errors.senderEmail}
          id="sender-email"
        />
        <Input
          label="Sender Display Name (optional)"
          placeholder="Your Name"
          value={senderName}
          onChange={(e) => setSenderName(e.target.value)}
          id="sender-name"
        />
      </div>

      {/* Email Content */}
      <Input
        label="Subject"
        placeholder="Your email subject line"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        error={errors.subject}
        id="email-subject"
      />
      <Textarea
        label="Email Body"
        placeholder="Write your email content here..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        error={errors.body}
        rows={5}
        id="email-body"
      />

      {/* Lead File Upload */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Recipient Leads (CSV / TXT)
        </label>
        <FileUploader onParsed={setLeads} />
        {errors.leads && <p className="text-xs text-rose-400">{errors.leads}</p>}

        {leads && (
          <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-sm">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-bold">{totalValid.toLocaleString()}</span>
              <span className="text-slate-400">valid</span>
            </div>
            {totalInvalid > 0 && (
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-bold">{totalInvalid}</span>
                <span className="text-slate-400">invalid / duplicates skipped</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Schedule Config */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input
          label="Start Time"
          type="datetime-local"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          error={errors.startTime}
          id="start-time"
        />
        <Input
          label="Delay Between Sends (ms)"
          type="number"
          min={0}
          placeholder="1000"
          value={delayMs}
          onChange={(e) => setDelayMs(e.target.value)}
          error={errors.delayMs}
          hint="Minimum gap between individual sends"
          id="delay-ms"
        />
        <Input
          label="Hourly Send Limit"
          type="number"
          min={1}
          max={500}
          placeholder="50"
          value={hourlyLimit}
          onChange={(e) => setHourlyLimit(e.target.value)}
          error={errors.hourlyLimit}
          hint="Redis-backed rate limit per hour"
          id="hourly-limit"
        />
      </div>

      {/* Summary Card */}
      {hasLeads && (
        <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-3">
          <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">
            Scheduling Summary
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: <Users className="w-3.5 h-3.5" />, label: 'Recipients', val: totalValid.toLocaleString() },
              { icon: <Clock className="w-3.5 h-3.5" />, label: 'Starts', val: new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
              { icon: <Zap className="w-3.5 h-3.5" />, label: 'Delay', val: `${delayNum}ms` },
              { icon: <Mail className="w-3.5 h-3.5" />, label: 'Hourly Max', val: limitNum },
            ].map((item) => (
              <div key={item.label} className="flex flex-col gap-1">
                <div className="flex items-center gap-1 text-slate-400 text-[10px] uppercase tracking-wider font-medium">
                  {item.icon} {item.label}
                </div>
                <span className="text-sm font-bold text-slate-100">{item.val}</span>
              </div>
            ))}
          </div>
          {totalValid > 1 && (
            <p className="text-xs text-slate-400">
              Estimated send window:{' '}
              <span className="text-slate-200 font-medium">
                {hours > 0 ? `${hours}h ` : ''}{minutes}m
              </span>{' '}
              at current delay (rate limit may extend this).
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800/60">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={loading} id="compose-cancel">
            Cancel
          </Button>
        )}
        <Button
          variant="primary"
          size="lg"
          loading={loading}
          onClick={handleSubmit}
          icon={<Mail className="w-4 h-4" />}
          id="compose-submit"
        >
          Schedule Campaign
        </Button>
      </div>
    </div>
  );
};
