import { useState, useCallback } from 'react';
import { fetchSentEmails } from '../services/api';
import { SentEmail, PaginationMeta } from '../types';

export const useSentEmails = () => {
  const [data, setData] = useState<SentEmail[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (params: { page?: number; limit?: number; status?: string } = {}) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchSentEmails({ sort: 'desc', ...params });
        setData(res.data);
        setMeta(res.meta);
      } catch (err: any) {
        setError(err?.response?.data?.error?.message || 'Failed to load sent emails');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { data, meta, loading, error, load };
};
