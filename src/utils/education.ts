import { educationLevels, type EducationRecord } from '../types';
export function educationLabel(r: EducationRecord): string {
  return r.level === 'Engineering' ? `Engineering · Year ${r.engineeringYear}` : r.level;
}
export function educationScore(r: EducationRecord): string {
  return r.score === ''
    ? 'Result not added yet'
    : r.gradingType === 'Percentage'
      ? `${r.score}%`
      : `${r.score} / ${r.scale} CGPA`;
}
export function validateEducation(r: EducationRecord): string | null {
  if (!educationLevels.includes(r.level)) return 'Choose an education level.';
  if (!r.institution.trim() || r.institution.length > 200)
    return 'Enter an institution name within 200 characters.';
  if (r.board.length > 200 || r.academicYear.length > 40)
    return 'Keep the board and academic year within the field limits.';
  if (r.level === 'Engineering' && !['1', '2', '3', '4'].includes(r.engineeringYear))
    return 'Choose an engineering year.';
  if (!['Percentage', 'CGPA'].includes(r.gradingType)) return 'Choose a grading type.';
  if (r.gradingType === 'CGPA' && !['4', '10'].includes(r.scale))
    return 'Choose a CGPA scale of 4 or 10.';
  const maximum = r.gradingType === 'Percentage' ? 100 : Number(r.scale);
  if (r.score !== '' && (!/^\d+(?:\.\d{1,2})?$/.test(r.score) || Number(r.score) > maximum))
    return `Enter a result between 0 and ${maximum}, with up to two decimal places.`;
  return null;
}
