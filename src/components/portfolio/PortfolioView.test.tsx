import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { PortfolioView } from './PortfolioView';
import { emptyPortfolio, type Portfolio } from '../../types';
import { completePortfolio } from '../../../tests/fixtures/portfolio';

beforeEach(() => vi.stubGlobal('window', { location: { origin: 'https://ascend.example' } }));
afterEach(() => vi.unstubAllGlobals());
const render = (portfolio: Portfolio) =>
  renderToStaticMarkup(
    <MemoryRouter initialEntries={['/u/KBTUG23998']}>
      <PortfolioView portfolio={portfolio} />
    </MemoryRouter>,
  );
it('shows only explicitly public education results and respects Education section visibility', () => {
  const p = completePortfolio();
  p.education = [{ educationId: 'edu-1', collegeId: p.student.collegeId, level: 'Engineering', institution: 'Public Engineering College', board: '', academicYear: '2025-2026', engineeringYear: '2', gradingType: 'CGPA', score: '8.75', scale: '10', showPublic: true }, { educationId: 'edu-2', collegeId: p.student.collegeId, level: '10th', institution: 'Private School', board: '', academicYear: '', engineeringYear: '', gradingType: 'Percentage', score: '91', scale: '100', showPublic: false }];
  expect(render(p)).toContain('8.75 / 10 CGPA');
  expect(render(p)).not.toContain('Private School');
  p.settings.hiddenSections.push('Education');
  expect(render(p)).not.toContain('Public Engineering College');
});

it('renders real work and only opted-in contact and certificate proof', () => {
  const p = completePortfolio();
  const html = render(p);
  expect(html).toContain('Campus Connect');
  expect(html).toContain('mailto:alex@example.com');
  expect(html).toContain('href="https://example.com/certificate.pdf"');
  expect(html).not.toContain(p.student.collegeEmail);
  expect(html).not.toContain('tel:');
  expect(html).not.toContain('Institution Verified');
  for (const activity of p.activities.filter((a) => !a.isPublicProof && a.proofUrl)) {
    expect(html).not.toContain(activity.proofUrl);
  }
  p.links.showEmail = false;
  expect(render(p)).not.toContain('alex@example.com');
});

it('keeps section visibility and order, theme, font and accent in the shared portfolio model', () => {
  const p = completePortfolio();
  p.settings.theme = 'Developer';
  p.settings.font = 'DM Sans';
  p.settings.accent = '#16786b';
  p.settings.hiddenSections = ['Projects', 'Experience'];
  p.settings.sectionOrder = ['Skills', ...p.settings.sectionOrder.filter((s) => s !== 'Skills')];
  const html = render(p);
  expect(html).toContain('data-theme="Developer"');
  expect(html).toContain('DM Sans');
  expect(html).toContain('--pp-accent:#16786b');
  expect(html).not.toContain('Campus Connect');
  expect(html).not.toContain('Software Engineering Intern');
  expect(html.indexOf('id="skills"')).toBeLessThan(html.indexOf('id="about"'));
  expect(html).not.toContain('href="#projects"');
});

it('hides empty sections and invalid contact on a sparse profile', () => {
  const p = emptyPortfolio('KBTUG23997', 'private@kbtcoe.org');
  p.student.fullName = 'Jordan Lee';
  p.links = { ...p.links, publicEmail: 'not-an-email', showEmail: true };
  const html = render(p);
  expect(html).toContain('Jordan Lee');
  expect(html).not.toContain('class="pp-section ');
  expect(html).not.toContain('Portfolio at a glance');
  expect(html).not.toContain('mailto:');
  expect(html).not.toContain('private@kbtcoe.org');
});
