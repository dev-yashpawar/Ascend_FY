import { emptyPortfolio, type Portfolio } from '../../src/types';
export function completePortfolio(): Portfolio {
  const p = emptyPortfolio('KBTUG23998', 'private.login@kbtcoe.org');
  p.student = { ...p.student, fullName: 'Alex Morgan', branch: 'Information Technology', year: 'Final Year', headline: 'Software engineer. Thoughtful products, built to work.', about: 'I build full-stack applications that make complex workflows feel simple. My work brings together accessible interfaces, reliable APIs, and a curiosity about how people actually use technology.', photoUrl: 'http://127.0.0.1:5174/tests/fixtures/portrait.svg' };
  p.skills = ['JavaScript', 'TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'Java'].map((skillName, sortOrder) => ({ skillName, sortOrder, skillId: `skill-${sortOrder}`, collegeId: p.student.collegeId }));
  p.projects = [
    ['Campus Connect', 'A campus community platform connecting students with events, teams, and opportunities. Designed an accessible discovery experience and a dependable registration workflow.', 'React,TypeScript,Node.js,PostgreSQL', 'campus'],
    ['Fieldnotes', 'An offline-first workspace for research teams to capture observations and organize fieldwork. Built conflict-aware sync and clear progress feedback.', 'React,IndexedDB,Express', 'fieldnotes'],
    ['Circuit Lab', 'An interactive learning tool that helps engineering students explore systems and document experiments. Built reusable simulation interfaces with keyboard access.', 'TypeScript,React,SVG', 'circuit'],
  ].map(([title, description, stack, image], i) => ({ projectId: `project-${i}`, collegeId: p.student.collegeId, title, description, techStack: stack.split(','), githubUrl: 'https://github.com', liveUrl: 'https://example.com', imageUrl: `http://127.0.0.1:5174/tests/fixtures/${image}.svg`, verificationStatus: 'self_reported', createdAt: '', updatedAt: '' }));
  p.experiences = [
    { experienceId: 'exp-1', collegeId: p.student.collegeId, role: 'Software Engineering Intern', organization: 'Student Innovation Lab', startDate: '2026-06', endDate: '', currentlyWorking: true, description: 'Built an accessible dashboard for campus research teams and connected it to a structured API. Collaborated with designers and researchers, documented component decisions, and improved the handoff experience.', proofUrl: '', isPublicProof: false, verificationStatus: 'self_reported', createdAt: '', updatedAt: '' },
    { experienceId: 'exp-2', collegeId: p.student.collegeId, role: 'Frontend Developer', organization: 'Campus Open Source Collective', startDate: '2025-11', endDate: '2026-04', currentlyWorking: false, description: 'Contributed reusable interfaces and tests to an open-source campus portal. Reviewed pull requests and mentored first-time contributors.', proofUrl: '', isPublicProof: false, verificationStatus: 'self_reported', createdAt: '', updatedAt: '' },
  ];
  p.activities = [
    ['Certification', 'Cloud Foundations', 'Cloud Learning Academy'],
    ['Certification', 'Accessible Web Interfaces', 'Campus Learning Studio'],
    ['Certification', 'Database Systems', 'Engineering Learning Centre'],
    ['Hackathon', 'Campus Innovation Sprint', 'Student Innovation Cell'],
    ['Hackathon', 'Sustainable Systems Challenge', 'Engineering Society'],
    ['Leadership', 'Technical Club Lead', 'Campus Developer Club'],
    ['Workshop', 'Building resilient APIs', 'Open Source Collective'],
    ['Volunteering', 'Digital literacy mentor', 'Community Learning Centre'],
  ].map(([category, title, organization], i) => ({ activityId: `activity-${i}`, collegeId: p.student.collegeId, category: category as Portfolio['activities'][number]['category'], title, organization, activityDate: '2026-08-20', description: '', proofUrl: i === 0 ? 'https://example.com/certificate.pdf' : 'https://example.com/private.pdf', isPublicProof: i === 0, verificationStatus: 'self_reported', createdAt: '', updatedAt: '' }));
  p.links = { ...p.links, github: 'https://github.com', linkedin: 'https://linkedin.com', leetcode: 'https://leetcode.com', publicEmail: 'alex@example.com', phone: '+1 202 555 0100', showEmail: true, showPhone: false };
  p.settings.published = true;
  return p;
}
