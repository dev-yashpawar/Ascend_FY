import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Sparkles, CheckCircle2 } from 'lucide-react';
import { Logo } from '../components/layout/Layout';
import { Loading, ErrorState } from '../components/ui';
import { ProfileForm } from '../components/forms/ProfileForm';
import { SkillsForm } from '../components/forms/SkillsForm';
import { RecordEditor } from '../components/forms/RecordEditor';
import { LinksForm } from '../components/forms/LinksForm';
import { PortfolioView } from '../components/portfolio/PortfolioView';
import { usePortfolio } from '../hooks/usePortfolio';
import { getSession, isMock } from '../services/api';
import { strength } from '../utils/profile';
const steps = [
  'Identity',
  'Basic Profile',
  'Skills',
  'Projects',
  'Experience',
  'Activities',
  'Professional Links',
  'Preview',
];
export function OnboardingPage() {
  const { portfolio, loading, error, refresh } = usePortfolio();
  const [params, setParams] = useSearchParams();
  const step = Math.max(2, Math.min(8, Number(params.get('step')) || 2));
  function next() {
    setParams({ step: String(step + 1) });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  if (!getSession()) return <Navigate to="/identity" />;
  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} retry={() => void refresh()} />;
  if (!portfolio) return <Navigate to="/identity" />;
  const titles = [
    '',
    '',
    'First, introduce yourself.',
    'What do you bring to the table?',
    'Show us what you’ve built.',
    'Experience shapes your story.',
    'Celebrate the moments that matter.',
    'Let’s connect the dots.',
    'Your story, at a glance.',
  ];
  return (
    <div className="onboarding-page">
      <header className="onboarding-header container">
        <Logo />
        <Link className="text-link" to="/dashboard">
          Finish later
          <ArrowUpIcon />
        </Link>
      </header>
      <main className="onboarding-layout container">
        <aside className="onboarding-sidebar">
          <span className="eyebrow">YOUR NEXT CHAPTER</span>
          <h2>
            Build your
            <br />
            portfolio.
          </h2>
          <ol>
            {steps.map((title, i) => (
              <li
                key={title}
                className={i + 1 === step ? 'current' : i + 1 < step ? 'complete' : ''}
              >
                <span>{i + 1 < step ? <Check size={15} /> : String(i + 1).padStart(2, '0')}</span>
                {title}
              </li>
            ))}
          </ol>
          <p>
            <ShieldNote />A portfolio is built one small step at a time. You can always edit later.
          </p>
        </aside>
        <section className={`onboarding-content ${step === 8 ? 'wide' : ''}`}>
          <div className="wizard-progress">
            <span>Step {step} of 8</span>
            <span>{Math.round((step / 8) * 100)}%</span>
            <div>
              <i style={{ width: `${(step / 8) * 100}%` }} />
            </div>
          </div>
          <h1>{titles[step]}</h1>
          <p className="wizard-description">
            {step === 2
              ? 'A few details to put a name and a voice to your work.'
              : step === 8
                ? 'Your portfolio brings it all together. Next, make it your own and publish.'
                : 'Everything here becomes part of your professional portfolio. This section is optional.'}
          </p>
          {isMock && <small className="mock-save-note">Demo mode · saved on this device</small>}
          <div key={step} className="wizard-step">
            {step === 2 ? (
              <ProfileForm onSaved={next} label="Save & Continue" />
            ) : step === 3 ? (
              <SkillsForm onSaved={next} label="Save & Continue" />
            ) : step === 4 ? (
              <RecordEditor kind="project" onContinue={next} />
            ) : step === 5 ? (
              <RecordEditor kind="experience" onContinue={next} />
            ) : step === 6 ? (
              <RecordEditor kind="activity" onContinue={next} />
            ) : step === 7 ? (
              <LinksForm onSaved={next} label="Save & Continue" />
            ) : (
              <>
                <div className="preview-ready-strip">
                  <Sparkles size={21} />
                  <div>
                    <strong>{strength(portfolio)}% profile strength</strong>
                    <p>A strong start. Keep adding to your story.</p>
                  </div>
                  <Link className="btn primary" to="/ready">
                    Finish & Continue
                    <ArrowRight size={16} />
                  </Link>
                </div>
                <div className="onboarding-preview">
                  <PortfolioView portfolio={portfolio} preview />
                </div>
              </>
            )}
          </div>
          <div className="wizard-bottom">
            <button
              className="text-link"
              onClick={() => {
                if (step === 2) window.location.assign('/identity');
                else setParams({ step: String(step - 1) });
              }}
            >
              <ArrowLeft size={15} />
              Back
            </button>
            {step > 2 && step < 8 && (
              <button className="text-link muted" onClick={next}>
                Skip optional section
                <ArrowRight size={15} />
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
function ShieldNote() {
  return <CheckCircle2 size={18} />;
}
function ArrowUpIcon() {
  return <ArrowRight size={15} />;
}
export function ReadyPage() {
  const { portfolio, loading } = usePortfolio();
  if (loading) return <Loading />;
  if (!portfolio) return <Navigate to="/identity" />;
  const score = strength(portfolio);
  return (
    <div className="ready-page">
      <Logo />
      <main className="ready-card">
        <span className="success-emblem">
          <CheckCircle2 size={36} />
        </span>
        <span className="eyebrow">LOOK WHAT YOU’VE BUILT</span>
        <h1>Your portfolio is ready.</h1>
        <p>
          Your college journey has a professional home.
          <br />
          Customize it, publish it, and make your next move.
        </p>
        <div className="ready-strength">
          <strong>
            {score}
            <span>%</span>
          </strong>
          <p>Profile Strength</p>
          <div className="progress-track">
            <i style={{ width: `${score}%` }} />
          </div>
        </div>
        <div className="ready-stats">
          {[
            [portfolio.projects.length, 'Projects'],
            [portfolio.experiences.length, 'Experiences'],
            [portfolio.activities.length, 'Activities'],
            [
              portfolio.activities.filter((a) => a.category === 'Certification').length,
              'Certifications',
            ],
          ].map(([n, t]) => (
            <div key={t}>
              <strong>{n}</strong>
              <small>{t}</small>
            </div>
          ))}
        </div>
        <Link className="btn primary full" to="/dashboard/portfolio">
          Customize Portfolio
          <ArrowRight size={17} />
        </Link>
        <Link className="btn secondary full" to={`/u/${portfolio.student.collegeId}`}>
          View My Portfolio
        </Link>
        <Link className="text-link" to="/dashboard">
          Continue Editing
        </Link>
        <small className="ready-note">Your portfolio stays private until you publish it.</small>
      </main>
    </div>
  );
}
