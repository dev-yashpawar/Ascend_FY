import { createService } from './service.mjs';
import { SafeError, equal } from './security.mjs';
import { resolveLinkedInRequest } from './routing.mjs';
export function createHandler(options = {}) {
  const env = options.env || process.env,
    service = options.service || createService(options);
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const json = (status, data) => {
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    };
    try {
      const { path, parameter } = resolveLinkedInRequest(req);
      if (path === 'oauth/callback' && req.method === 'GET') {
        let result;
        const binding = String(req.headers.cookie || '')
          .split(';')
          .map((s) => s.trim())
          .find((s) => s.startsWith('ascend_li_oauth='))
          ?.slice(16);
        try {
          result = await service.oauthCallback({
            state: parameter('state'),
            code: parameter('code'),
            denied: !!parameter('error'),
            binding,
          });
        } catch {
          result = { result: 'connection_failed' };
        }
        const destination = new URL('/dashboard/linkedin', service.origin());
        if (result.draftId) destination.searchParams.set('draft', result.draftId);
        destination.searchParams.set('connection', result.result);
        res.setHeader(
          'Set-Cookie',
          `ascend_li_oauth=; Path=/api/linkedin/oauth; HttpOnly; SameSite=Lax; Max-Age=0${service.origin().startsWith('https:') ? '; Secure' : ''}`,
        );
        res.statusCode = 303;
        res.setHeader('Location', destination.href);
        res.end();
        return;
      }
      if (req.method !== 'POST') throw new SafeError('Method not allowed.', 405);
      let body = req.body;
      if (body === undefined) {
        const chunks = [];
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 3000000) throw new SafeError('Image or request is too large.', 413);
          chunks.push(chunk);
        }
        body = Buffer.concat(chunks).toString('utf8');
      }
      if (typeof body === 'string') {
        if (body.length > 3000000) throw new SafeError('Request is too large.', 413);
        try {
          body = JSON.parse(body);
        } catch {
          throw new SafeError('Invalid request.');
        }
      }
      if (!body || typeof body !== 'object' || Array.isArray(body))
        throw new SafeError('Invalid request.');
      if (path.startsWith('internal/')) {
        if (!equal(req.headers['x-ascend-internal'], env.N8N_TO_ASCEND_SECRET))
          throw new SafeError('Internal authentication required.', 401);
        return json(200, { success: true, data: await service.internal(path.slice(9), body) });
      }
      if (req.headers.origin !== service.origin())
        throw new SafeError('Open sharing from Ascend.', 403);
      const token = /^Bearer ([\w-]{20,200})$/.exec(req.headers.authorization || '')?.[1];
      const collegeId = String(req.headers['x-ascend-student'] || '')
        .trim()
        .toUpperCase();
      if (!token || !/^(?:STKBTCOE\d+|KBTUG\d{5})$/.test(collegeId))
        throw new SafeError('Sign in to Ascend again.', 401);
      const auth = { collegeId, token };
      if (path === 'oauth/start') {
        const result = await service.oauthStart(auth, body.draftId || '');
        res.setHeader(
          'Set-Cookie',
          `ascend_li_oauth=${result.binding}; Path=/api/linkedin/oauth; HttpOnly; SameSite=Lax; Max-Age=600${service.origin().startsWith('https:') ? '; Secure' : ''}`,
        );
        return json(200, { success: true, data: { authorizationUrl: result.authorizationUrl } });
      }
      return json(200, { success: true, data: await service.user(path, body, auth) });
    } catch (e) {
      // Never return provider response bodies, tokens, callback codes, URLs or stack traces.
      return json(e instanceof SafeError ? e.status : 500, {
        success: false,
        message:
          e instanceof SafeError
            ? e.message
            : 'Sharing is temporarily unavailable. Your activity is still saved.',
        code: e instanceof SafeError ? e.code : 'sharing_unavailable',
      });
    }
  };
}
