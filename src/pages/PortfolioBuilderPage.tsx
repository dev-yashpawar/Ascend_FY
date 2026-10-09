import { useState, useEffect, useRef } from 'react';
import {
  ArrowUp,
  ArrowDown,
  Check,
  Eye,
  Loader2,
  Palette,
  Monitor,
  Smartphone,
  X,
  Globe,
  ExternalLink as ExternalIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePortfolio } from '../hooks/usePortfolio';
import { api, isMock } from '../services/api';
import { accents, type Section } from '../types';
import { Feedback } from '../components/ui';
import { PageHeading } from '../components/layout/Layout';
import { PortfolioView } from '../components/portfolio/PortfolioView';
import { ShareControls } from '../components/portfolio/ShareControls';
export function PortfolioBuilderPage() {
  const { portfolio, setPortfolio } = usePortfolio();
  const [settings, setSettings] = useState(portfolio!.settings);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mobilePreview, setMobilePreview] = useState(false);
  const [viewport, setViewport] = useState('desktop');
  const [dirty, setDirty] = useState(false);
  const previewRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!mobilePreview) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    previewRef.current?.querySelector<HTMLButtonElement>('[aria-label="Close preview"]')?.focus();
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMobilePreview(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const nodes = [
        ...(previewRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), select',
        ) || []),
      ].filter((el) => el.offsetParent !== null);
      const first = nodes[0],
        last = nodes.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      }
      if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKey);
      previousFocus?.focus();
    };
  }, [mobilePreview]);
  if (!portfolio) return null;
  const preview = { ...portfolio, settings };
  function change(update: Partial<typeof settings>) {
    setSettings((s) => ({ ...s, ...update }));
    setDirty(true);
    setSuccess('');
  }
  function move(index: number, delta: number) {
    const arr = [...settings.sectionOrder];
    [arr[index], arr[index + delta]] = [arr[index + delta], arr[index]];
    change({ sectionOrder: arr });
  }
  function toggle(section: Section) {
    change({
      hiddenSections: settings.hiddenSections.includes(section)
        ? settings.hiddenSections.filter((s) => s !== section)
        : [...settings.hiddenSections, section],
    });
  }
  async function save(publish?: boolean) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const p = await api.saveSettings({
        ...settings,
        ...(publish !== undefined ? { published: publish } : {}),
      });
      setPortfolio(p);
      setSettings(p.settings);
      setDirty(false);
      setSuccess(
        publish === true
          ? 'Your portfolio is published. Your story is ready to share.'
          : publish === false
            ? 'Portfolio unpublished. The public link is now private.'
            : 'Customization saved.',
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        title="Make it yours."
        description="Your work. Your voice. Your own corner of the internet."
        action={
          <div className="button-row">
            <button
              className="btn secondary builder-mobile-preview"
              onClick={() => setMobilePreview(true)}
            >
              <Eye size={16} />
              Preview
            </button>
            <button className="btn primary" disabled={busy} onClick={() => void save()}>
              {busy ? <Loader2 size={16} className="spin" /> : <Check size={16} />}Save changes
            </button>
          </div>
        }
      />
      <Feedback error={error} success={success} />
      <div className="builder-layout">
        <section className="builder-controls card" inert={mobilePreview}>
          <div className="controls-title">
            <Palette size={17} />
            <strong>Portfolio style</strong>
            {dirty && <small>Unsaved</small>}
          </div>
          <fieldset>
            <legend>Choose a theme</legend>
            <div className="theme-options">
              {(['Minimal', 'Modern', 'Developer'] as const).map((t) => (
                <button
                  className={`theme-option ${t.toLowerCase()} ${settings.theme === t ? 'selected' : ''}`}
                  key={t}
                  aria-pressed={settings.theme === t}
                  onClick={() => change({ theme: t })}
                >
                  <span className="theme-thumb">
                    <i />
                    <b />
                    <b />
                    <span>
                      <i />
                      <i />
                    </span>
                  </span>
                  <strong>{t}</strong>
                  {settings.theme === t && <Check size={12} />}
                </button>
              ))}
            </div>
            <p>
              {settings.theme === 'Minimal'
                ? 'Clean, focused, and placement ready.'
                : settings.theme === 'Modern'
                  ? 'Strong visuals and a professional first impression.'
                  : 'A darker canvas for a builder’s story.'}
            </p>
          </fieldset>
          <div className="field">
            <label htmlFor="font">Typography</label>
            <select
              id="font"
              value={settings.font}
              onChange={(e) => change({ font: e.target.value as typeof settings.font })}
            >
              {['Inter', 'Poppins', 'DM Sans'].map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </div>
          <fieldset>
            <legend>Accent color</legend>
            <div className="color-options">
              {accents.map((c, i) => (
                <button
                  key={c}
                  style={{ background: c }}
                  className={settings.accent === c ? 'selected' : ''}
                  aria-label={`Use ${['indigo', 'teal', 'terracotta', 'violet', 'blue', 'rose'][i]} accent`}
                  aria-pressed={settings.accent === c}
                  onClick={() => change({ accent: c })}
                >
                  {settings.accent === c && <Check size={16} />}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="section-order">
            <legend>Your sections</legend>
            <p>Show what matters. Arrange your story.</p>
            {settings.sectionOrder.map((s, i) => (
              <div className="section-control" key={s}>
                <label>
                  <input
                    type="checkbox"
                    checked={!settings.hiddenSections.includes(s)}
                    onChange={() => toggle(s)}
                  />
                  <span>{s}</span>
                </label>
                <button
                  className="icon-btn"
                  disabled={i === 0}
                  aria-label={`Move ${s} up`}
                  onClick={() => move(i, -1)}
                >
                  <ArrowUp size={13} />
                </button>
                <button
                  className="icon-btn"
                  disabled={i === settings.sectionOrder.length - 1}
                  aria-label={`Move ${s} down`}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown size={13} />
                </button>
              </div>
            ))}
          </fieldset>
          <div className="publish-panel">
            <span className={`badge ${portfolio.settings.published ? 'verified' : ''}`}>
              <Globe size={12} />
              {portfolio.settings.published ? 'Published' : 'Private draft'}
            </span>
            <h3>Your next chapter is one click away.</h3>
            <p>
              {isMock
                ? 'Demo publishing is stored on this device. Connect Google Sheets for a public link that works everywhere.'
                : 'Published portfolios are available to anyone with the link. Your college email stays private.'}
            </p>
            <button
              className="btn primary full"
              disabled={busy || !portfolio.student.fullName}
              onClick={() => void save(true)}
            >
              {busy ? <Loader2 className="spin" size={15} /> : <Globe size={15} />}{' '}
              {portfolio.settings.published ? 'Update published portfolio' : 'Publish portfolio'}
            </button>
            {!portfolio.student.fullName && (
              <small>Add your name in Profile Settings before publishing.</small>
            )}
            {portfolio.settings.published && (
              <button
                className="text-link muted unpublish-button"
                disabled={busy}
                onClick={() => void save(false)}
              >
                Unpublish portfolio
              </button>
            )}
          </div>
        </section>
        <section
          ref={previewRef}
          role={mobilePreview ? 'dialog' : undefined}
          aria-modal={mobilePreview || undefined}
          aria-label={mobilePreview ? 'Portfolio preview' : 'Live portfolio preview'}
          className={`builder-preview ${mobilePreview ? 'mobile-preview-open' : ''}`}
        >
          <header className="preview-toolbar">
            <span>
              <i />
              Live preview
            </span>
            <div>
              <button
                className={`icon-btn ${viewport === 'desktop' ? 'active' : ''}`}
                aria-label="Desktop preview"
                onClick={() => setViewport('desktop')}
              >
                <Monitor size={17} />
              </button>
              <button
                className={`icon-btn ${viewport === 'mobile' ? 'active' : ''}`}
                aria-label="Mobile preview"
                onClick={() => setViewport('mobile')}
              >
                <Smartphone size={17} />
              </button>
              <Link
                className="icon-btn"
                to={`/u/${portfolio.student.collegeId}`}
                aria-label="Open saved portfolio"
              >
                <ExternalIcon size={16} />
              </Link>
              <button
                className="icon-btn mobile-preview-close"
                aria-label="Close preview"
                onClick={() => setMobilePreview(false)}
              >
                <X size={21} />
              </button>
            </div>
          </header>
          <div className={`preview-canvas ${viewport === 'mobile' ? 'phone-width' : ''}`}>
            <PortfolioView portfolio={preview} preview />
          </div>
          <div className="preview-footer">
            <span>Changes appear here as you make them.</span>
            <span>
              {settings.theme} · {settings.font}
            </span>
          </div>
        </section>
      </div>
      {portfolio.settings.published && (
        <div className="builder-share card">
          <h2>Your portfolio is out in the world.</h2>
          <ShareControls collegeId={portfolio.student.collegeId} published />
        </div>
      )}
    </>
  );
}
