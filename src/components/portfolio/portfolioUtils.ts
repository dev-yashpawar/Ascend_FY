import type { Section } from '../../types';

export const sectionId = (section: Section, preview = false) =>
  `${preview ? 'preview-' : ''}${section.toLowerCase().replace(/[^a-z]/g, '')}`;
