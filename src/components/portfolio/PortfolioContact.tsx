import { Github, Linkedin, Code2, Globe, ArrowUpRight, Mail, Phone } from 'lucide-react';
import type { ProfessionalLinks } from '../../types';
import { ExternalLink } from '../ui';
import { safeUrl } from '../../utils/profile';

export const profileLinks = [
  { key: 'github', label: 'GitHub', icon: Github },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { key: 'leetcode', label: 'LeetCode', icon: Code2 },
  { key: 'website', label: 'Website', icon: Globe },
  { key: 'other', label: 'Elsewhere', icon: Globe },
] as const;
export function hasPublicContact(links: ProfessionalLinks) {
  return (
    profileLinks.some((l) => safeUrl(links[l.key])) ||
    (links.showEmail === true && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(links.publicEmail || '')) ||
    (links.showPhone === true && /^[+\d() .-]{6,30}$/.test(links.phone || ''))
  );
}
export function ProfessionalProfiles({ links }: { links: ProfessionalLinks }) {
  return (
    <div className="pp-social-links">
      {profileLinks.map(({ key, label, icon: Icon }) => (
        <ExternalLink key={key} url={links[key]}>
          <Icon size={17} />
          {label}
        </ExternalLink>
      ))}
    </div>
  );
}
export function CodingProfiles({ links }: { links: ProfessionalLinks }) {
  const available = profileLinks.filter(
    (l) => ['github', 'leetcode'].includes(l.key) && safeUrl(links[l.key]),
  );
  return available.length ? (
    <div className="pp-coding-profiles">
      <span className="pp-overline">MORE OF MY WORK</span>
      <div>
        {available.map(({ key, label, icon: Icon }) => (
          <ExternalLink key={key} url={links[key]}>
            <Icon size={22} />
            <span>
              <strong>{label}</strong>
              <small>View profile</small>
            </span>
          </ExternalLink>
        ))}
      </div>
    </div>
  ) : null;
}
export function ContactSection({ links }: { links: ProfessionalLinks }) {
  const email =
    links.showEmail === true && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(links.publicEmail || '')
      ? links.publicEmail
      : '';
  const phone =
    links.showPhone === true && /^[+\d() .-]{6,30}$/.test(links.phone || '') ? links.phone : '';
  if (!hasPublicContact(links)) return null;
  return (
    <div className="pp-contact">
      <h3>
        Let’s build something useful<span>.</span>
      </h3>
      <p>
        Have an opportunity, a collaboration, or an interesting project in mind? Let’s start a
        conversation.
      </p>
      <div className="pp-contact-details">
        {email && (
          <a href={`mailto:${email}`}>
            <Mail size={18} />
            <span>
              <small>EMAIL</small>
              {email}
            </span>
            <ArrowUpRight size={17} />
          </a>
        )}
        {phone && (
          <a href={`tel:${phone.replace(/[^+\d]/g, '')}`}>
            <Phone size={18} />
            <span>
              <small>PHONE</small>
              {phone}
            </span>
            <ArrowUpRight size={17} />
          </a>
        )}
      </div>
      <div className="pp-contact-actions">
        {email && (
          <a className="pp-button pp-button-primary" href={`mailto:${email}`}>
            Email me <ArrowUpRight size={17} />
          </a>
        )}
        <ExternalLink url={links.linkedin} className="pp-button">
          <Linkedin size={17} />
          Connect on LinkedIn
        </ExternalLink>
      </div>
      <ProfessionalProfiles links={links} />
    </div>
  );
}
