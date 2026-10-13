import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { PublicNav, Footer, PageHeading } from '../components/layout/Layout';
import { FeedbackForm } from '../components/forms/FeedbackForm';
import { Loading, ErrorState } from '../components/ui';
import { usePortfolio } from '../hooks/usePortfolio';
import { getSession, isMock, setSession } from '../services/api';
import { feedbackNeedsLogin } from '../utils/feedback';
import './feedback.css';

export function FeedbackPage({ workspace = false }: { workspace?: boolean }) {
  const { portfolio, loading, error, refresh, setPortfolio } = usePortfolio();
  const session = getSession();
  const invalidSession = feedbackNeedsLogin(error);
  const loginUrl = `/identity?next=${encodeURIComponent(workspace ? '/dashboard/feedback' : '/feedback')}`;
  useEffect(() => {
    if (invalidSession) {
      setSession(null);
      setPortfolio(null);
    }
  }, [invalidSession, setPortfolio]);
  if (!session || invalidSession || (!loading && !error && !portfolio))
    return <Navigate to={loginUrl} replace />;
  const content = (
    <>
      <PageHeading
        eyebrow="YOUR VOICE MATTERS"
        title="Help shape Ascend."
        description="Share a suggestion, report a problem, or tell us what you enjoyed. We’re building this for students, with students."
      />
      {isMock && <p className="demo-notice">Demo mode · feedback is saved on this device only.</p>}
      {loading ? (
        <Loading label="Getting your feedback form ready…" />
      ) : error ? (
        <ErrorState message={error} retry={() => void refresh()} />
      ) : portfolio ? (
        <FeedbackForm collegeId={portfolio.student.collegeId} />
      ) : (
        <Navigate to={loginUrl} replace />
      )}
    </>
  );
  return workspace ? (
    <div className="student-feedback">{content}</div>
  ) : (
    <>
      <PublicNav />
      <main className="container student-feedback student-feedback-page">{content}</main>
      <Footer />
    </>
  );
}
