import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, ShieldCheck, Mail, CheckCircle2, Loader2 } from 'lucide-react';
import { Logo } from '../components/layout/Layout';
import { Field, Feedback } from '../components/ui';
import { api, isMock, setSession } from '../services/api';
import { usePortfolio } from '../hooks/usePortfolio';
import { emailDomain, validateIdentity } from '../utils/profile';
export function StudentIdentityPage() {
  const [id, setId] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [existing, setExisting] = useState(false);
  const { setPortfolio } = usePortfolio();
  const navigate = useNavigate();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError('');
    const issue = validateIdentity(id, email);
    if (issue) {
      setError(issue);
      return;
    }
    setBusy(true);
    try {
      const collegeId = id.trim().toUpperCase();
      await api.getStudent(collegeId);
      const result = await api.startSession(collegeId, email.trim().toLowerCase());
      setSession(result.session);
      setPortfolio(result.portfolio);
      if (result.exists) setExisting(true);
      else navigate('/onboarding?step=2');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="identity-page">
      <div className="identity-brand">
        <Logo />
        <Link to="/" className="text-link">
          <ArrowLeft size={15} />
          Back to home
        </Link>
      </div>
      <main className="identity-layout">
        <section className="identity-story">
          <span className="eyebrow">THE START OF SOMETHING GOOD</span>
          <h1>
            Your potential.
            <br />
            Your story.
            <br />
            <em>Your portfolio.</em>
          </h1>
          <p>Build a home for everything that makes you, you.</p>
          <ol>
            <li>
              <span>01</span>
              <div>
                <strong>Start with your identity</strong>
                <p>Your college ID connects your journey.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Bring your work together</strong>
                <p>Projects, skills, and moments that matter.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Make your next move</strong>
                <p>A professional portfolio, ready to share.</p>
              </div>
            </li>
          </ol>
          <div className="identity-quote">
            “The things you do beyond the classroom
            <br />
            deserve a place beyond your camera roll.”
          </div>
        </section>
        <section className="identity-form card">
          {existing ? (
            <>
              <span className="success-emblem">
                <CheckCircle2 size={30} />
              </span>
              <span className="eyebrow">GOOD TO SEE YOU AGAIN</span>
              <h2>Welcome back.</h2>
              <p>Your story is right where you left it.</p>
              <button className="btn primary full" onClick={() => navigate('/dashboard')}>
                Continue Editing
                <ArrowRight size={17} />
              </button>
              <Link to={`/u/${id.toUpperCase()}`} className="btn secondary full">
                View Portfolio
              </Link>
            </>
          ) : (
            <>
              <span className="form-emblem">
                <GraduationIcon />
              </span>
              <span className="eyebrow">A SMALL FIRST STEP</span>
              <h2>
                Let’s start with your
                <br />
                college identity.
              </h2>
              <p>Your portfolio starts here. It takes just a few minutes.</p>
              {isMock && (
                <div className="demo-notice">
                  Demo mode · your data stays on this device. Try KBTUG23513 to explore the sample
                  profile.
                </div>
              )}
              <form onSubmit={submit}>
                <Field
                  label="College ID"
                  placeholder="KBTUG23513"
                  value={id}
                  onChange={(e) => setId(e.target.value.toUpperCase())}
                  required
                  autoComplete="username"
                  maxLength={30}
                />
                <Field
                  label="College Email"
                  type="email"
                  placeholder={`kbtug23513@${emailDomain}`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  hint={`Use your ${emailDomain} college email.`}
                />
                <Feedback error={error} />
                <button className="btn primary full" disabled={busy}>
                  {busy ? <Loader2 size={17} className="spin" /> : <ArrowRight size={17} />}{' '}
                  {busy ? 'Checking your identity…' : 'Let’s build your portfolio'}
                </button>
              </form>
              <div className="identity-privacy">
                <ShieldCheck size={18} />
                <p>
                  Your college email stays private. Only published portfolio details are shared
                  publicly.
                </p>
              </div>
              <small className="identity-disclaimer">
                This is MVP identity matching, not verified authentication.
              </small>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
function GraduationIcon() {
  return <Mail size={24} />;
}
