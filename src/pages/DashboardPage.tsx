import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Plus,
  FolderGit2,
  BriefcaseBusiness,
  Award,
  ShieldCheck,
  Sparkles,
  Check,
} from 'lucide-react';
import { usePortfolio } from '../hooks/usePortfolio';
import { strength, dateLabel } from '../utils/profile';
import { PageHeading } from '../components/layout/Layout';
import { Badge, EmptyState } from '../components/ui';
import { RecordEditor } from '../components/forms/RecordEditor';
import { SkillsForm } from '../components/forms/SkillsForm';
import { ProfileForm } from '../components/forms/ProfileForm';
import { LinksForm } from '../components/forms/LinksForm';
import type { RecordKind } from '../types';
export function DashboardPage() {
  const { portfolio: p } = usePortfolio();
  if (!p) return null;
  const score = strength(p);
  const verified = [...p.projects, ...p.experiences, ...p.activities].filter(
    (a) => a.verificationStatus === 'verified',
  ).length;
  return (
    <>
      <PageHeading
        eyebrow="YOUR JOURNEY, IN PROGRESS"
        title={`Hello, ${p.student.fullName.split(' ')[0] || 'there'} 👋`}
        description="Every project, every experience — it all adds up."
        action={
          <Link className="btn primary" to="/dashboard/portfolio">
            My Portfolio
            <ArrowUpRight size={17} />
          </Link>
        }
      />
      <section className="dashboard-strength card">
        <div className="strength-main">
          <span className="strength-icon">
            <Sparkles size={22} />
          </span>
          <div>
            <h2>Your story is {score === 100 ? 'looking strong' : 'taking shape'}.</h2>
            <p>
              {score === 100
                ? 'Keep your portfolio current as you grow.'
                : 'A little more detail can open a lot more doors.'}
            </p>
            <Link className="text-link" to="/onboarding?step=2">
              Continue building
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
        <div className="strength-meter">
          <div>
            <strong>{score}%</strong>
            <span>Profile Strength</span>
          </div>
          <div className="progress-track">
            <i style={{ width: `${score}%` }} />
          </div>
        </div>
      </section>
      <div className="dashboard-stats">
        {[
          [p.projects.length, 'Projects', FolderGit2, 'projects'],
          [p.experiences.length, 'Experiences', BriefcaseBusiness, 'experience'],
          [p.activities.length, 'Activities', Award, 'activities'],
          [verified, 'Verified records', ShieldCheck, 'activities'],
        ].map(([n, title, Icon, path]) => {
          const I = Icon as typeof Award;
          return (
            <Link className="card stat-card" to={`/dashboard/${path}`} key={String(title)}>
              <I size={19} />
              <strong>{String(n).padStart(2, '0')}</strong>
              <span>{String(title)}</span>
              <ArrowUpRight className="stat-arrow" size={15} />
            </Link>
          );
        })}
      </div>
      <div className="dashboard-content-grid">
        <section className="card dashboard-section">
          <div className="card-heading">
            <h2>Featured projects</h2>
            <Link to="/dashboard/projects" className="text-link">
              View all
              <ArrowRight size={14} />
            </Link>
          </div>
          {p.projects.length ? (
            p.projects.slice(0, 2).map((project) => (
              <div className="dashboard-project" key={project.projectId}>
                <div className="dashboard-project-art">
                  <FolderGit2 size={26} />
                </div>
                <div>
                  <h3>{project.title}</h3>
                  <p>{project.description}</p>
                  <div className="tags">
                    {project.techStack
                      .filter(Boolean)
                      .slice(0, 3)
                      .map((t, i) => (
                        <span key={`${t}-${i}`}>{t}</span>
                      ))}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              title="What have you been building?"
              description="Give your work the spotlight it deserves."
            >
              <Link className="text-link" to="/dashboard/projects">
                <Plus size={15} />
                Add your first project
              </Link>
            </EmptyState>
          )}
        </section>
        <section className="card dashboard-section">
          <div className="card-heading">
            <h2>Recent activities</h2>
            <Link to="/dashboard/activities" className="text-link">
              View all
              <ArrowRight size={14} />
            </Link>
          </div>
          {p.activities.length ? (
            [...p.activities]
              .sort((a, b) => b.activityDate.localeCompare(a.activityDate))
              .slice(0, 3)
              .map((a) => (
                <div className="recent-activity" key={a.activityId}>
                  <span className="record-icon">
                    <Award size={18} />
                  </span>
                  <div>
                    <small>{a.category}</small>
                    <h3>{a.title}</h3>
                    <p>{dateLabel(a.activityDate)}</p>
                    <Badge status={a.verificationStatus} />
                  </div>
                </div>
              ))
          ) : (
            <EmptyState
              title="Small moments. Big growth."
              description="Add a certification, event, or achievement."
            >
              <Link className="text-link" to="/dashboard/activities">
                <Plus size={15} />
                Add an activity
              </Link>
            </EmptyState>
          )}
        </section>
      </div>
      <section className="dashboard-portfolio-cta">
        <div>
          <span className="eyebrow">READY FOR YOUR NEXT OPPORTUNITY?</span>
          <h2>A portfolio that opens the conversation.</h2>
          <p>
            {p.settings.published
              ? 'Your story is live. Make sure it grows with you.'
              : 'Choose your look and publish your story when you’re ready.'}
          </p>
        </div>
        <Link to="/dashboard/portfolio" className="btn primary">
          {p.settings.published ? 'Manage portfolio' : 'Customize & publish'}
          <ArrowUpRight size={17} />
        </Link>
      </section>
      <div className="dashboard-completion">
        <Check size={15} />
        <span>
          Your college email stays private. Your records stay self reported until verified.
        </span>
      </div>
    </>
  );
}
export function RecordsPage({ kind }: { kind: RecordKind }) {
  const titles = {
    project: ['Projects', 'Good work deserves a place to shine.'],
    experience: ['Experience', 'Show where you’ve learned, contributed, and grown.'],
    activity: ['Activities', 'Your achievements beyond the classroom, all in one place.'],
  };
  return (
    <>
      <PageHeading title={titles[kind][0]} description={titles[kind][1]} />
      <RecordEditor key={kind} kind={kind} />
    </>
  );
}
export function SkillsPage() {
  return (
    <>
      <PageHeading
        title="Your skills"
        description="A clear picture of what you know, and what you bring."
      />
      <div className="card settings-card">
        <SkillsForm />
      </div>
    </>
  );
}
export function ProfileSettingsPage() {
  return (
    <>
      <PageHeading
        title="Profile settings"
        description="Keep your introduction and professional links up to date."
      />
      <section className="card settings-card">
        <h2>Basic profile</h2>
        <ProfileForm />
      </section>
      <section className="card settings-card">
        <h2>Professional links</h2>
        <LinksForm />
      </section>
    </>
  );
}
