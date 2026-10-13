import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Portfolio, Section } from '../../types';
import { activitiesFor } from '../../utils/profile';
import { PortfolioEducation } from './PortfolioEducation';
import { PortfolioHero, PortfolioNav, PortfolioStats } from './PortfolioIdentity';
import {
  FeaturedProjects,
  ExperienceTimeline,
  ActivityCollection,
  SkillsSection,
} from './PortfolioWork';
import { ContactSection, CodingProfiles, hasPublicContact } from './PortfolioContact';
import './portfolio.css';
import { sectionId } from './portfolioUtils';

export function PortfolioView({
  portfolio: p,
  preview = false,
}: {
  portfolio: Portfolio;
  preview?: boolean;
}) {
  const { student: s, settings } = p;
  const content: Partial<Record<Section, ReactNode>> = {
    About: s.about ? <p className="pp-about-copy">{s.about}</p> : null,
    Education:
      s.branch || p.education?.some((r) => r.showPublic) ? (
        <PortfolioEducation records={p.education || []} student={s} />
      ) : null,
    Skills: p.skills.length ? <SkillsSection skills={p.skills} /> : null,
    Projects: p.projects.length ? <FeaturedProjects projects={p.projects} /> : null,
    Experience: p.experiences.length ? <ExperienceTimeline experiences={p.experiences} /> : null,
    Contact: hasPublicContact(p.links) ? <ContactSection links={p.links} /> : null,
  };
  for (const section of [
    'Certifications',
    'Achievements',
    'Workshops & Conferences',
    'Leadership',
    'Volunteering',
  ] as Section[]) {
    const records = activitiesFor(section, p.activities);
    content[section] = records.length ? (
      <ActivityCollection
        activities={records}
        journey={section === 'Workshops & Conferences' || section === 'Volunteering'}
      />
    ) : null;
  }
  const visible = settings.sectionOrder.filter(
    (section) => !settings.hiddenSections.includes(section) && content[section],
  );
  const labels: Partial<Record<Section, string>> = {
    About: 'About me.',
    Projects: 'Selected work.',
    Experience: 'Experience.',
    Certifications: 'Certifications.',
    Achievements: 'Achievements.',
    'Workshops & Conferences': 'Student journey.',
    Leadership: 'Leadership.',
    Volunteering: 'Community & volunteering.',
    Contact: 'Let’s connect.',
  };
  return (
    <div
      className={`pp ${preview ? 'pp-preview' : ''}`}
      data-theme={settings.theme}
      style={
        {
          '--pp-accent': settings.accent,
          fontFamily: `'${settings.font}', sans-serif`,
        } as CSSProperties
      }
    >
      <a className="pp-skip no-print" href={`#${preview ? 'preview-' : ''}portfolio-content`}>
        Skip to portfolio content
      </a>
      <PortfolioNav portfolio={p} visible={visible} preview={preview} />
      <main className="pp-container" id={`${preview ? 'preview-' : ''}portfolio-content`}>
        <PortfolioHero portfolio={p} visible={visible} preview={preview} />
        <PortfolioStats portfolio={p} visible={visible} />
        {visible.map((section, i) => (
          <section
            key={section}
            id={sectionId(section, preview)}
            className={`pp-section pp-section-${sectionId(section)}`}
          >
            <header className="pp-section-heading">
              <span className="pp-overline">
                {String(i + 1).padStart(2, '0')} /{' '}
                {section === 'Projects' ? 'WORK' : section.toUpperCase()}
              </span>
              <h2>{labels[section] || section}</h2>
              {section === 'Projects' && <p>Ideas explored. Problems solved. Things built.</p>}
            </header>
            <div className="pp-section-content">
              {content[section]}
              {section === 'Contact' && <CodingProfiles links={p.links} />}
            </div>
          </section>
        ))}
        <footer className="pp-footer">
          <span>
            {s.fullName || 'Student portfolio'} <span aria-hidden="true">/</span>{' '}
            {new Date().getFullYear()}
          </span>
          <Link to="/identity" className="pp-built">
            Built with{' '}
            <strong>
              ascend<span>.</span>
            </strong>
            <span aria-hidden="true">↗</span>
          </Link>
        </footer>
        <div className="print-url">
          {window.location.origin}/u/{s.collegeId}
        </div>
      </main>
    </div>
  );
}
