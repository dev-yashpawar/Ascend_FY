import type { Portfolio, Activity, Section } from '../types';
export const collegeName = import.meta.env.VITE_COLLEGE_NAME || 'KBT College of Engineering';
export const emailDomain = import.meta.env.VITE_COLLEGE_EMAIL_DOMAIN || 'kbtcoe.org';
export const idPattern = import.meta.env.VITE_COLLEGE_ID_PATTERN || '^KBTUG\\d{5}$';
export function validateIdentity(id: string, email: string): string | null {
  if (!new RegExp(idPattern, 'i').test(id.trim()))
    return 'Enter a valid college ID, for example KBTUG23513.';
  if (
    !/^[^\s@]+@[^\s@]+$/.test(email.trim()) ||
    email.trim().split('@')[1].toLowerCase() !== emailDomain.toLowerCase()
  )
    return `Use your college email at ${emailDomain}.`;
  return null;
}
export function safeUrl(value: string): string | undefined {
  try {
    const u = new URL(value);
    return ['https:', 'http:'].includes(u.protocol) ? u.href : undefined;
  } catch {
    return undefined;
  }
}
export function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase() || 'AS'
  );
}
export function strength(p: Portfolio) {
  const s = p.student;
  return Math.min(
    100,
    (s.fullName && s.branch && s.year ? 20 : 0) +
      (s.headline && s.about ? 10 : 0) +
      (p.skills.length ? 10 : 0) +
      (p.projects.length ? 20 : 0) +
      (p.experiences.length ? 10 : 0) +
      (p.activities.length ? 15 : 0) +
      (['linkedin', 'github', 'leetcode', 'website', 'other'].some(
        (k) => p.links[k as keyof typeof p.links],
      )
        ? 5
        : 0) +
      (p.projects.length + p.activities.length >= 3 ? 10 : 0),
  );
}
export function activitiesFor(section: Section, activities: Activity[]) {
  const groups: Partial<Record<Section, string[]>> = {
    Certifications: ['Certification'],
    Achievements: ['Competition', 'Academic Achievement', 'Hackathon', 'Club Activity', 'Other'],
    'Workshops & Conferences': ['Workshop', 'Conference'],
    Leadership: ['Leadership'],
    Volunteering: ['Volunteering', 'Community Service'],
  };
  return activities.filter((a) => groups[section]?.includes(a.category));
}
export function dateLabel(value: string) {
  if (!value) return '';
  const date = new Date(value.length === 7 ? `${value}-01T12:00:00` : `${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(date);
}
export function recordId(r: { projectId?: string; experienceId?: string; activityId?: string }) {
  return r.projectId || r.experienceId || r.activityId || '';
}
