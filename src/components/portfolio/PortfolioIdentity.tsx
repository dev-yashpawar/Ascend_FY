import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, Download, Menu, X, GraduationCap } from 'lucide-react';
import type { Portfolio, Section } from '../../types';
import { Avatar } from '../ui';
import { activitiesFor, collegeName } from '../../utils/profile';
import { ShareControls } from './ShareControls';
import { ProfessionalProfiles } from './PortfolioContact';
import { sectionId } from './portfolioUtils';

export function PortfolioNav({
  portfolio: p,
  visible,
  preview,
}: {
  portfolio: Portfolio;
  visible: Section[];
  preview: boolean;
}) {
  const [open, setOpen] = useState(false);
  const navLabels: Partial<Record<Section, string>> = {
    About: 'About',
    Projects: 'Work',
    Experience: 'Experience',
    Achievements: 'Achievements',
    Certifications: 'Certificates',
    Contact: 'Contact',
  };
  const navSections = visible.filter((s) => navLabels[s]);
  return (
    <header className="pp-nav no-print">
      <div className="pp-nav-inner">
        <Link className="pp-brand" to="/">
          <span className="pp-brand-symbol" aria-hidden="true">
            ↗
          </span>
          <span>
            {p.student.fullName.split(' ')[0] || 'Ascend'}
            <b>.</b>
          </span>
        </Link>
        {navSections.length > 0 && (
          <button
            className="pp-menu pp-button"
            aria-label={open ? 'Close portfolio navigation' : 'Open portfolio navigation'}
            aria-expanded={open}
            aria-controls={preview ? 'preview-portfolio-nav' : 'public-portfolio-nav'}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}
        <nav
          id={preview ? 'preview-portfolio-nav' : 'public-portfolio-nav'}
          className={open ? 'is-open' : ''}
          aria-label="Portfolio sections"
        >
          {navSections.map((s) => (
            <a key={s} href={`#${sectionId(s, preview)}`} onClick={() => setOpen(false)}>
              {navLabels[s]}
            </a>
          ))}
        </nav>
        {!preview && (
          <ShareControls collegeId={p.student.collegeId} published={p.settings.published} compact />
        )}
      </div>
    </header>
  );
}

export function PortfolioHero({
  portfolio: p,
  visible,
  preview,
}: {
  portfolio: Portfolio;
  visible: Section[];
  preview: boolean;
}) {
  const s = p.student;
  const intro = visible.includes('About') ? s.about.split(/(?<=[.!?])\s/)[0] : '';
  return (
    <section className="pp-hero" aria-label="Professional introduction">
      <div className="pp-hero-copy">
        <p className="pp-overline">
          {[s.branch, s.year].filter(Boolean).join(' / ') || 'STUDENT PORTFOLIO'}
        </p>
        <h1>
          {s.fullName || 'Your next chapter'}
          <span>.</span>
        </h1>
        {s.headline && <h2>{s.headline}</h2>}
        {intro && (
          <p className="pp-intro">{intro.length > 190 ? `${intro.slice(0, 187)}…` : intro}</p>
        )}
        <div className="pp-hero-actions no-print">
          {visible.includes('Projects') && (
            <a className="pp-button pp-button-primary" href={`#${sectionId('Projects', preview)}`}>
              View my work <ArrowDownRight size={18} />
            </a>
          )}
          <button className="pp-button" disabled={preview} onClick={() => window.print()}>
            <Download size={17} />
            Download resume
          </button>
        </div>
        <ProfessionalProfiles links={p.links} />
      </div>
      <aside className="pp-identity-panel">
        <div className="pp-portrait-grid">
          <span className="pp-grid-cross cross-one" aria-hidden="true">
            +
          </span>
          <Avatar name={s.fullName || 'Student'} url={s.photoUrl} size="large" />
          <span className="pp-grid-cross cross-two" aria-hidden="true">
            +
          </span>
        </div>
        <div className="pp-identity-caption">
          <GraduationCap size={18} />
          <span>{collegeName}</span>
        </div>
        {s.year && (
          <p className="pp-current">
            <span>Currently</span>
            {[s.year, s.branch].filter(Boolean).join(' · ')}
          </p>
        )}
      </aside>
    </section>
  );
}

export function PortfolioStats({
  portfolio: p,
  visible,
}: {
  portfolio: Portfolio;
  visible: Section[];
}) {
  const activitySections: Section[] = [
    'Certifications',
    'Achievements',
    'Workshops & Conferences',
    'Leadership',
    'Volunteering',
  ];
  const stats = [
    { n: visible.includes('Projects') ? p.projects.length : 0, label: 'Projects' },
    { n: visible.includes('Experience') ? p.experiences.length : 0, label: 'Experiences' },
    {
      n: visible.includes('Certifications')
        ? p.activities.filter((a) => a.category === 'Certification').length
        : 0,
      label: 'Certifications',
    },
    {
      n: visible.includes('Achievements')
        ? p.activities.filter((a) => ['Competition', 'Hackathon'].includes(a.category)).length
        : 0,
      label: 'Competitions & hackathons',
    },
    {
      n: new Set(
        activitySections
          .filter((s) => visible.includes(s))
          .flatMap((s) => activitiesFor(s, p.activities).map((a) => a.activityId)),
      ).size,
      label: 'Activities',
    },
  ].filter((s) => s.n > 0);
  return stats.length ? (
    <div className="pp-proof-strip" aria-label="Portfolio at a glance">
      {stats.map((s) => (
        <div key={s.label}>
          <strong>{String(s.n).padStart(2, '0')}</strong>
          <span>{s.label}</span>
        </div>
      ))}
    </div>
  ) : null;
}
