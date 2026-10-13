import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { api, setSession } from '../../services/api';
import { feedbackCategories, type StudentFeedback } from '../../types';
import { validateFeedback, feedbackNeedsLogin } from '../../utils/feedback';
import { usePortfolio } from '../../hooks/usePortfolio';
import { Field, TextArea, Feedback } from '../ui';

export function FeedbackForm({ collegeId }: { collegeId: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setPortfolio } = usePortfolio();
  const [category, setCategory] = useState<StudentFeedback['category']>('Suggestion');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const attempt = useRef<{ fingerprint: string; feedbackId: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || sent) return;
    const fields = { collegeId, category, subject: subject.trim(), message: message.trim() };
    const issue = validateFeedback({ ...fields, feedbackId: '' });
    if (issue) {
      setError(issue);
      return;
    }
    const fingerprint = JSON.stringify(fields);
    if (attempt.current?.fingerprint !== fingerprint)
      attempt.current = { fingerprint, feedbackId: crypto.randomUUID() };
    setBusy(true);
    setError('');
    try {
      await api.submitFeedback({ ...fields, feedbackId: attempt.current.feedbackId });
      setSent(true);
      setSubject('');
      setMessage('');
      attempt.current = null;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Feedback could not be sent. Please retry.';
      if (feedbackNeedsLogin(message)) {
        setSession(null);
        setPortfolio(null);
        navigate(`/identity?next=${encodeURIComponent(location.pathname)}`, { replace: true });
      } else setError(message);
    } finally {
      setBusy(false);
    }
  }
  if (sent)
    return (
      <section className="card student-feedback-success" role="status">
        <CheckCircle2 size={32} aria-hidden="true" />
        <h2>Thanks for helping Ascend improve.</h2>
        <p>Your feedback has been received. We appreciate you taking the time to share it.</p>
        <button
          className="btn secondary"
          onClick={() => {
            setSent(false);
            setCategory('Suggestion');
          }}
        >
          Send another suggestion
        </button>
      </section>
    );
  return (
    <form className="card student-feedback-form" onSubmit={(e) => void submit(e)} aria-busy={busy}>
      <div className="field">
        <label htmlFor="feedback-category">Feedback type</label>
        <select
          id="feedback-category"
          value={category}
          disabled={busy}
          onChange={(e) => setCategory(e.target.value as StudentFeedback['category'])}
        >
          {feedbackCategories.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>
      <Field
        label="Subject (optional)"
        value={subject}
        maxLength={120}
        disabled={busy}
        placeholder="What would you like to improve?"
        onChange={(e) => setSubject(e.target.value)}
      />
      <TextArea
        label="Your feedback"
        value={message}
        required
        minLength={10}
        maxLength={2000}
        rows={7}
        disabled={busy}
        placeholder="Tell us what works well, what could be better, or an idea you’d love to see."
        hint={`${message.length.toLocaleString()} / 2,000 characters`}
        onChange={(e) => setMessage(e.target.value)}
      />
      <p className="student-feedback-privacy">
        Visible only to the Ascend team, not on your public portfolio. Please don’t include
        passwords or sensitive personal details.
      </p>
      <Feedback error={error} />
      <button className="btn primary" disabled={busy} type="submit">
        {busy ? <Loader2 size={17} className="spin" /> : <Send size={17} />}
        {busy ? 'Sending…' : error ? 'Retry feedback' : 'Send feedback'}
      </button>
    </form>
  );
}
