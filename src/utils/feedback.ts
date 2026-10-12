import { feedbackCategories, type StudentFeedback } from '../types';

export function validateFeedback(feedback: StudentFeedback): string | null {
  if (!feedbackCategories.includes(feedback.category)) return 'Choose a feedback type.';
  if (feedback.subject.trim().length > 120) return 'Keep the subject within 120 characters.';
  if (feedback.message.trim().length < 10)
    return 'Please add at least 10 characters so we can understand your feedback.';
  if (feedback.message.trim().length > 2000) return 'Keep your feedback within 2,000 characters.';
  return null;
}
