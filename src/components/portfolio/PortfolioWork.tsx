import { useEffect, useState } from 'react';
import { Code2, Github, Globe, Award } from 'lucide-react';
import type { Activity, Experience, Project, Skill } from '../../types';
import { Badge, ExternalLink } from '../ui';
import { dateLabel, safeUrl } from '../../utils/profile';

function ProjectCard({
  project: p,
  featured,
  index,
}: {
  project: Project;
  featured: boolean;
  index: number;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [p.imageUrl]);
  return (
    <article className={`pp-project ${featured ? 'pp-featured-project' : ''}`}>
      <div className="pp-project-visual">
        {safeUrl(p.imageUrl) && !failed ? (
          <img
            src={safeUrl(p.imageUrl)}
            alt={`${p.title} project preview`}
            loading="lazy"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="pp-project-fallback">
            <div className="pp-code-window" aria-hidden="true">
              <span>● ● ●</span>
              <Code2 size={40} />
              <i />
              <i />
              <i />
            </div>
            <span>{p.techStack.slice(0, 3).join(' / ') || 'PROJECT SHOWCASE'}</span>
          </div>
        )}
        <span className="pp-project-index">
          {featured ? 'FEATURED / ' : ''}
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>
      <div className="pp-project-copy">
        <span className="pp-overline">{featured ? 'FEATURED PROJECT' : 'PROJECT'}</span>
        <h3>{p.title}</h3>
        <Badge status={p.verificationStatus} />
        <p className="pp-project-description">{p.description.replace(/\*\*/g, '')}</p>
        {p.techStack.length > 0 && (
          <div className="pp-tags">
            {p.techStack.filter(Boolean).map((t, i) => (
              <span key={`${t}-${i}`}>{t}</span>
            ))}
          </div>
        )}
        <div className="pp-project-links">
          <ExternalLink url={p.githubUrl}>
            <Github size={16} />
            Source code
          </ExternalLink>
          <ExternalLink url={p.liveUrl}>
            <Globe size={16} />
            Live demo
          </ExternalLink>
        </div>
      </div>
    </article>
  );
}
export function FeaturedProjects({ projects }: { projects: Project[] }) {
  return (
    <div className="pp-project-grid">
      {projects.map((p, i) => (
        <ProjectCard key={p.projectId} project={p} featured={i === 0} index={i} />
      ))}
    </div>
  );
}
export function SkillsSection({ skills }: { skills: Skill[] }) {
  return (
    <div className="pp-skill-collection">
      {[...skills]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((s) => (
          <span key={s.skillId}>{s.skillName}</span>
        ))}
    </div>
  );
}
export function ExperienceTimeline({ experiences }: { experiences: Experience[] }) {
  return (
    <div className="pp-timeline">
      {[...experiences]
        .sort((a, b) => b.startDate.localeCompare(a.startDate))
        .map((e) => (
          <article key={e.experienceId} className="pp-experience">
            <div className="pp-experience-year">{e.startDate.slice(0, 4)}</div>
            <div className="pp-experience-body">
              <div className="pp-role-heading">
                <div>
                  <h3>{e.role}</h3>
                  <p>{e.organization}</p>
                </div>
                <span className="pp-period">
                  {dateLabel(e.startDate)} — {e.currentlyWorking ? 'Present' : dateLabel(e.endDate)}
                </span>
              </div>
              <Badge status={e.verificationStatus} />
              {e.description && (
                <p className="pp-experience-description">{e.description.replace(/\*\*/g, '')}</p>
              )}
              {e.isPublicProof === true && (
                <ExternalLink url={e.proofUrl} className="pp-proof-link">
                  View Proof
                </ExternalLink>
              )}
            </div>
          </article>
        ))}
    </div>
  );
}
export function ActivityCollection({
  activities,
  journey = false,
}: {
  activities: Activity[];
  journey?: boolean;
}) {
  return (
    <div className={journey ? 'pp-journey' : 'pp-activity-grid'}>
      {[...activities]
        .sort((a, b) => b.activityDate.localeCompare(a.activityDate))
        .map((a) => (
          <article className={`pp-activity ${journey ? 'pp-journey-item' : ''}`} key={a.activityId}>
            <div className="pp-activity-top">
              <span className="pp-activity-label">{a.category}</span>
              <span>{dateLabel(a.activityDate)}</span>
            </div>
            <h3>{a.title}</h3>
            {a.organization && <p className="pp-issuer">{a.organization}</p>}
            {a.description && (
              <p className="pp-activity-description">{a.description.replace(/\*\*/g, '')}</p>
            )}
            <div className="pp-activity-bottom">
              <Badge status={a.verificationStatus} />
              {a.isPublicProof === true && safeUrl(a.proofUrl) && (
                <ExternalLink url={a.proofUrl} className="pp-proof-link">
                  {a.category === 'Certification' ? 'View Certificate' : 'View Proof'}
                </ExternalLink>
              )}
              {a.category === 'Certification' && (
                <Award size={23} aria-hidden="true" className="pp-award" />
              )}
            </div>
          </article>
        ))}
    </div>
  );
}
