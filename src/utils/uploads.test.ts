import { it, expect } from 'vitest';
import { validateUpload, proofCategory } from './uploads';
it('validates MIME, extensions, size and image-only uploads', () => {
  expect(validateUpload({ name: 'photo.JPG', type: 'image/jpeg', size: 4 * 1024 * 1024 })).toBe('');
  expect(validateUpload({ name: 'photo.svg', type: 'image/svg+xml', size: 100 })).not.toBe('');
  expect(validateUpload({ name: 'photo.exe', type: 'image/jpeg', size: 100 })).not.toBe('');
  expect(
    validateUpload({ name: 'proof.pdf', type: 'application/pdf', size: 5 * 1024 * 1024 }),
  ).toBe('');
  expect(validateUpload({ name: 'proof.pdf', type: 'application/pdf', size: 100 }, true)).not.toBe(
    '',
  );
  expect(
    validateUpload({ name: 'photo.png', type: 'image/png', size: 4 * 1024 * 1024 + 1 }),
  ).not.toBe('');
});
it('routes unified activities to the correct proof folder', () => {
  expect(proofCategory('Certification')).toBe('certificates');
  for (const c of ['Academic Achievement', 'Competition', 'Hackathon'] as const)
    expect(proofCategory(c)).toBe('achievements');
  expect(proofCategory('Volunteering')).toBe('other');
});
