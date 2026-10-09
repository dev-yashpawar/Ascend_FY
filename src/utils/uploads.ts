import type { Category, UploadCategory } from '../types';
export function proofCategory(category: Category): UploadCategory {
  if (category === 'Certification') return 'certificates';
  if (['Academic Achievement', 'Competition', 'Hackathon'].includes(category))
    return 'achievements';
  return 'other';
}
export function validateUpload(
  file: Pick<File, 'name' | 'type' | 'size'>,
  imagesOnly = false,
): string {
  const types: Record<string, RegExp> = {
    'image/jpeg': /\.jpe?g$/i,
    'image/png': /\.png$/i,
    'application/pdf': /\.pdf$/i,
  };
  if (!types[file.type]?.test(file.name) || (imagesOnly && file.type === 'application/pdf'))
    return imagesOnly ? 'Choose a JPG or PNG image.' : 'Choose a JPG, PNG or PDF file.';
  if (!file.size) return 'The selected file is empty.';
  if (file.size > (file.type === 'application/pdf' ? 5 : 4) * 1024 * 1024)
    return 'Images must be at most 4 MB; PDFs at most 5 MB.';
  return '';
}
export function fileBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read this file. Select it again.'));
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.readAsDataURL(file);
  });
}
