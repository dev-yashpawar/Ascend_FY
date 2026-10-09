import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { api, getSession } from '../services/api';
import type { Portfolio } from '../types';
interface Context {
  portfolio: Portfolio | null;
  setPortfolio: (p: Portfolio | null) => void;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
}
const PortfolioContext = createContext<Context | null>(null);
export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [portfolio, setPortfolioState] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(!!getSession());
  const [error, setError] = useState('');
  const setPortfolio = useCallback((value: Portfolio | null) => {
    setPortfolioState(value);
    setError('');
    setLoading(false);
  }, []);
  const refresh = useCallback(async () => {
    const session = getSession();
    if (!session) {
      setLoading(false);
      setPortfolio(null);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await api.getPortfolio(session.collegeId);
      if (getSession()?.token === session.token) setPortfolio(result);
    } catch (e) {
      if (getSession()?.token === session.token) setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [setPortfolio]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return (
    <PortfolioContext.Provider value={{ portfolio, setPortfolio, loading, error, refresh }}>
      {children}
    </PortfolioContext.Provider>
  );
}
export function usePortfolio() {
  const value = useContext(PortfolioContext);
  if (!value) throw new Error('PortfolioProvider required');
  return value;
}
