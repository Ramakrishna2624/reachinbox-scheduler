import { useState, useCallback } from 'react';
import { fetchScheduledEmails } from '../services/api';
import { ScheduledEmail, PaginationMeta } from '../types';

export const useScheduledEmails = () => {
  const [data, setData] = useState<ScheduledEmail[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (params: { page?: number; limit?: number; status?: string } = {}) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchScheduledEmails({ sort: 'asc', ...params });
        setData(res.data);
        setMeta(res.meta);
      } catch (err: any) {
        setError(err?.response?.data?.error?.message || 'Failed to load scheduled emails');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { data, meta, loading, error, load };
};
