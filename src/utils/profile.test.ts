import { describe, it, expect } from 'vitest';
import { emptyPortfolio } from '../types';
import { validateIdentity, strength, safeUrl, activitiesFor } from './profile';
describe('Identity and public profile rules', () => {
  it('accepts student IDs with personal or college email, preserving legacy identities', () => {
    expect(validateIdentity('stkbtcoe23513', 'Student@gmail.com')).toBeNull();
    expect(validateIdentity('STKBTCOE123456', 'student@outlook.com')).toBeNull();
    expect(validateIdentity('STKBTCOE23513', 'student@kbtcoe.org')).toBeNull();
    expect(validateIdentity('kbtug23513', 'Kbtug23513@kbtcoe.org')).toBeNull();
    expect(validateIdentity('KBT23513', 'x@kbtcoe.org')).toBeTruthy();
    expect(validateIdentity('KBTUG23513', 'x@gmail.com')).toBeNull();
    expect(validateIdentity('STKBTCOE', 'x@gmail.com')).toBeTruthy();
    expect(validateIdentity('STKBTCOE23abc', 'x@gmail.com')).toBeTruthy();
    expect(validateIdentity('STKBTCOE23513', 'x@')).toBeTruthy();
    expect(validateIdentity('STKBTCOE23513', 'x@gmail')).toBeTruthy();
  });
  it('calculates profile strength from records rather than random numbers', () => {
    const p = emptyPortfolio('KBTUG23999', 'student@kbtcoe.org');
    expect(strength(p)).toBe(0);
    p.student = {
      ...p.student,
      fullName: 'Student',
      branch: 'Civil',
      year: '3rd Year',
      headline: 'Engineer',
      about: 'My story',
    };
    expect(strength(p)).toBe(30);
    p.skills = [{ skillId: 's', collegeId: p.student.collegeId, skillName: 'CAD', sortOrder: 0 }];
    expect(strength(p)).toBe(40);
  });
  it('rejects dangerous URLs', () => {
    expect(safeUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeUrl('data:text/html,hello')).toBeUndefined();
    expect(safeUrl('https://github.com/ascend')).toBeTruthy();
  });
  it('maps every category to a public section', () => {
    const cats = [
      'Certification',
      'Conference',
      'Workshop',
      'Competition',
      'Club Activity',
      'Volunteering',
      'Leadership',
      'Community Service',
      'Academic Achievement',
      'Hackathon',
      'Other',
    ];
    const p = emptyPortfolio('KBTUG23999', 's@kbtcoe.org');
    p.activities = cats.map((category, i) => ({
      activityId: String(i),
      collegeId: p.student.collegeId,
      category: category as (typeof p.activities)[number]['category'],
      title: category,
      organization: '',
      activityDate: '2026-10-08',
      description: '',
      proofUrl: '',
      verificationStatus: 'self_reported',
      createdAt: '',
      updatedAt: '',
    }));
    const results = [
      'Certifications',
      'Achievements',
      'Workshops & Conferences',
      'Leadership',
      'Volunteering',
    ].flatMap((s) => activitiesFor(s as Parameters<typeof activitiesFor>[0], p.activities));
    expect(results).toHaveLength(cats.length);
    expect(new Set(results.map((r) => r.activityId)).size).toBe(cats.length);
  });
});
