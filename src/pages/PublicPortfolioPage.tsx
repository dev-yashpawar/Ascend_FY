import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Portfolio } from '../types';
import { api, getSession, isMock } from '../services/api';
import { Loading } from '../components/ui';
import { PortfolioView } from '../components/portfolio/PortfolioView';
import { ArrowLeft, RefreshCw } from 'lucide-react';
export function PublicPortfolioPage() {
  const { collegeId = '' } = useParams();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  function load() {
    setLoading(true);
    setError('');
    api
      .getPublicPortfolio(collegeId.toUpperCase())
      .then(setPortfolio)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    load();
  }, [collegeId]);
  useEffect(() => {
    if (!portfolio) return;
    const student = portfolio.student;
    const previousTitle = document.title;
    document.title = `${student.fullName}${student.headline ? ` — ${student.headline}` : ''} | Ascend`;
    const tags = {
      'og:title': document.title,
      'og:description': student.headline || 'Projects, experience, and achievements.',
      'og:image': student.photoUrl || '',
      'og:url': `${window.location.origin}/u/${student.collegeId}`,
      'og:type': 'profile',
    };
    const restore: (() => void)[] = [];
    Object.entries(tags).forEach(([property, content]) => {
      let node = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
      const existing = node;
      const before = node?.content || '';
      if (!node) {
        node = document.createElement('meta');
        node.setAttribute('property', property);
        document.head.appendChild(node);
      }
      node.content = content;
      const tag = node;
      restore.push(() => {
        if (existing) tag.content = before;
        else tag.remove();
      });
    });
    return () => {
      document.title = previousTitle;
      restore.forEach((fn) => fn());
    };
  }, [portfolio]);
  useEffect(() => {
    if (!portfolio || loading || new URLSearchParams(window.location.search).get('print') !== '1')
      return;
    const timer = window.setTimeout(() => {
      window.print();
      window.history.replaceState(null, '', window.location.pathname);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [portfolio, loading]);
  if (loading) return <Loading />;
  if (error || !portfolio)
    return (
      <main className="empty-state public-empty">
        <h1>This story isn’t available yet.</h1>
        <p>{error}</p>
        <div className="button-row">
          <button className="btn secondary" onClick={load}>
            <RefreshCw size={16} />
            Try again
          </button>
          <Link className="btn primary" to="/explore">
            Explore portfolios
          </Link>
        </div>
      </main>
    );
  return (
    <>
      {isMock && (
        <div className="public-demo-banner no-print">
          Demo portfolio · device-local data. Links work on this browser until Google Sheets is
          connected.
        </div>
      )}
      {!portfolio.settings.published && getSession()?.collegeId === collegeId.toUpperCase() && (
        <div className="draft-banner no-print">
          <span>Private preview · this portfolio is not published.</span>
          <Link to="/dashboard/portfolio">
            Back to builder
            <ArrowLeft size={14} />
          </Link>
        </div>
      )}
      <PortfolioView portfolio={portfolio} />
    </>
  );
}
