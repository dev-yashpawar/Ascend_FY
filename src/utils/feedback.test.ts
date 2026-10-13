import { it, expect } from 'vitest';
import { validateFeedback, feedbackNeedsLogin, feedbackReturnPath } from './feedback';
import type { StudentFeedback } from '../types';
const sample: StudentFeedback = {
  feedbackId: 'id',
  collegeId: 'STKBTCOE23513',
  category: 'Suggestion',
  subject: '',
  message: 'Please add a project filter.',
};
it('returns to only known feedback routes and redirects identity errors without masking network failures', () => {
  expect(feedbackReturnPath('/feedback')).toBe('/feedback');
  expect(feedbackReturnPath('/dashboard/feedback')).toBe('/dashboard/feedback');
  for (const path of [
    null,
    'https://example.com',
    '//example.com',
    '/dashboard',
    '/feedback?next=anything',
  ])
    expect(feedbackReturnPath(path)).toBeNull();
  for (const message of [
    'Portfolio not found.',
    'Your editing session has ended. Enter your college identity again.',
    'This portfolio has not been published yet.',
  ])
    expect(feedbackNeedsLogin(message)).toBe(true);
  expect(
    feedbackNeedsLogin('Could not connect to Google Sheets. Check your connection and retry.'),
  ).toBe(false);
});
it('accepts meaningful suggestions and rejects whitespace, oversized input and unknown categories', () => {
  expect(validateFeedback(sample)).toBeNull();
  expect(validateFeedback({ ...sample, message: '          ' })).toBeTruthy();
  expect(validateFeedback({ ...sample, message: 'x'.repeat(2001) })).toBeTruthy();
  expect(validateFeedback({ ...sample, subject: 'x'.repeat(121) })).toBeTruthy();
  expect(
    validateFeedback({ ...sample, category: 'invalid' as StudentFeedback['category'] }),
  ).toBeTruthy();
});
