import { it, expect } from 'vitest';
import { validateFeedback } from './feedback';
import type { StudentFeedback } from '../types';
const sample: StudentFeedback = {
  feedbackId: 'id',
  collegeId: 'STKBTCOE23513',
  category: 'Suggestion',
  subject: '',
  message: 'Please add a project filter.',
};
it('accepts meaningful suggestions and rejects whitespace, oversized input and unknown categories', () => {
  expect(validateFeedback(sample)).toBeNull();
  expect(validateFeedback({ ...sample, message: '          ' })).toBeTruthy();
  expect(validateFeedback({ ...sample, message: 'x'.repeat(2001) })).toBeTruthy();
  expect(validateFeedback({ ...sample, subject: 'x'.repeat(121) })).toBeTruthy();
  expect(
    validateFeedback({ ...sample, category: 'invalid' as StudentFeedback['category'] }),
  ).toBeTruthy();
});
