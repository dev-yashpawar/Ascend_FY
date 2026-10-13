import { it, expect } from 'vitest';
import { validateEducation, educationScore } from './education';
import type { EducationRecord } from '../types';
const record: EducationRecord = {
  educationId: 'test',
  collegeId: 'STKBTCOE23513',
  level: 'Engineering',
  institution: 'Example College',
  board: '',
  academicYear: '',
  engineeringYear: '1',
  gradingType: 'CGPA',
  score: '8.75',
  scale: '10',
  showPublic: false,
};
it('validates engineering year and grade limits without losing blank or zero results', () => {
  expect(validateEducation(record)).toBeNull();
  expect(validateEducation({ ...record, score: '' })).toBeNull();
  expect(validateEducation({ ...record, score: '0' })).toBeNull();
  expect(educationScore({ ...record, score: '0' })).toBe('0 / 10 CGPA');
  for (const patch of [
    { score: '11' },
    { score: '-1' },
    { score: '8.888' },
    { score: 'NaN' },
    { scale: '4' },
    { engineeringYear: '5' },
    { institution: '' },
  ])
    expect(validateEducation({ ...record, ...patch })).toBeTruthy();
  expect(
    validateEducation({ ...record, gradingType: 'Percentage', score: '100', scale: '100' }),
  ).toBeNull();
  expect(validateEducation({ ...record, gradingType: 'Percentage', score: '100.01' })).toBeTruthy();
});
