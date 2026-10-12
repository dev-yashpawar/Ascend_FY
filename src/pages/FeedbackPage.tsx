import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { PublicNav, Footer, PageHeading } from '../components/layout/Layout';
import { FeedbackForm } from '../components/forms/FeedbackForm';
import { Loading, ErrorState } from '../components/ui';
import { usePortfolio } from '../hooks/usePortfolio';
import { getSession, isMock } from '../services/api';
import './feedback.css';

export function FeedbackPage({ workspace = false }: { workspace?: boolean }) {
  const { portfolio, loading, error, refresh } = usePortfolio();
  const session = getSession();
  const content = (
    <>
      <PageHeading
        eyebrow="YOUR VOICE MATTERS"
        title="Help shape Ascend."
        description="Share a suggestion, report a problem, or tell us what you enjoyed. We’re building this for students, with students."
      />
      {isMock && <p className="demo-notice">Demo mode · feedback is saved on this device only.</p>}
      {!session ? (
        <section className="card student-feedback-success">
          <MessageSquare size={30} aria-hidden="true" />
          <h2>We’d love to hear from you.</h2>
          <p>
            Sign in with your college ID and personal or college email, then open Feedback from your
            workspace.
          </p>
          <Link className="btn primary" to="/identity">
            Sign in to share feedback
          </Link>
        </section>
      ) : loading ? (
        <Loading label="Getting your feedback form ready…" />
      ) : error ? (
        <ErrorState message={error} retry={() => void refresh()} />
      ) : portfolio ? (
        <FeedbackForm collegeId={portfolio.student.collegeId} />
      ) : (
        <Link className="btn primary" to="/identity">
          Sign in again
        </Link>
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
