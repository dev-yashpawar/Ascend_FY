import { SafeError } from './security.mjs';

export const LINKEDIN_PATH_PARAMETER = '__ascend_linkedin_path';
export const LINKEDIN_ROUTES = new Set([
  'oauth/start',
  'oauth/callback',
  'connection',
  'disconnect',
  'draft/create',
  'draft/read',
  'draft/edit',
  'draft/generate',
  'draft/publish',
  'job',
  'media/read',
  'media/upload',
  'internal/context',
  'internal/draft-save',
  'internal/claim',
  'internal/publish',
  'internal/recover',
]);

export function resolveLinkedInRequest(req) {
  const url = new URL(req.url, 'https://ascend.invalid');
  function parameter(name) {
    const values = url.searchParams.getAll(name);
    if (values.length > 1) throw new SafeError('Ambiguous routing parameter.', 400);
    if (values.length === 1) return values[0];
    // Vercel may expose rewritten destination parameters in req.query only.
    const value = req.query?.[name];
    if (value === undefined) return null;
    if (typeof value !== 'string') throw new SafeError('Invalid routing parameter.', 400);
    return value;
  }
  let path;
  if (url.pathname.startsWith('/api/linkedin/')) {
    // Public path takes precedence over query parameters, including caller-supplied ones.
    path = url.pathname.slice('/api/linkedin/'.length);
  } else if (
    url.pathname === '/api/linkedin-handler' ||
    url.pathname === '/api/linkedin-handler.js'
  ) {
    path = parameter(LINKEDIN_PATH_PARAMETER);
  }
  if (!LINKEDIN_ROUTES.has(path)) throw new SafeError('Sharing route not found.', 404);
  return { path, parameter };
}
