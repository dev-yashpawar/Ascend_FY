import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import deployedHandler from '../api/linkedin-handler.js';
import { createHandler } from '../server/linkedin/handler.mjs';
import {
  LINKEDIN_ROUTES,
  LINKEDIN_PATH_PARAMETER as key,
  resolveLinkedInRequest,
} from '../server/linkedin/routing.mjs';

const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
const rewrite = config.rewrites.find((r) => r.source === '/api/linkedin/:path*');
function rewritten(path, query = '') {
  const url = new URL(rewrite.destination.replace(':path*', path), 'https://ascend.example');
  for (const [name, value] of new URLSearchParams(query)) url.searchParams.append(name, value);
  return url.pathname + url.search;
}
async function invoke(handler, url, method = 'GET', headers = {}, query) {
  let body;
  const res = {
    headers: {},
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    end(text) {
      body = text;
    },
  };
  await handler({ url, method, headers, query, body: {} }, res);
  return {
    status: res.statusCode,
    headers: res.headers,
    body: body ? JSON.parse(body) : undefined,
  };
}
test('Vite deployment explicitly maps nested API paths to an existing concrete function before the SPA fallback', () => {
  assert.ok(rewrite);
  assert.equal(config.functions['api/linkedin-handler.js'].maxDuration, 60);
  assert.equal(rewrite.destination, '/api/linkedin-handler?__ascend_linkedin_path=:path*');
  assert.ok(fs.existsSync('api/linkedin-handler.js'));
  assert.equal(fs.existsSync('api/linkedin/[...route].js'), false);
  assert.ok(
    config.rewrites.indexOf(rewrite) <
      config.rewrites.findIndex((r) => r.destination === '/index.html'),
  );
  const spa = config.rewrites.find((r) => r.destination === '/index.html');
  const spaMatch = new RegExp('^' + spa.source + '$');
  for (const path of [
    '/api/linkedin/oauth/start',
    '/api/linkedin/oauth/callback',
    '/api/linkedin/internal/publish',
    '/images/campus/campus-atrium.webp',
    '/assets/app.js',
  ])
    assert.equal(spaMatch.test(path), false);
  for (const path of [
    '/dashboard/activities',
    '/dashboard/linkedin',
    '/identity',
    '/u/STKBTCOE23513',
  ])
    assert.equal(spaMatch.test(path), true);
});
test('every existing user/internal route resolves both as an original URL and a rewritten function request', async () => {
  for (const path of LINKEDIN_ROUTES) {
    assert.equal(resolveLinkedInRequest({ url: '/api/linkedin/' + path }).path, path);
    assert.equal(resolveLinkedInRequest({ url: rewritten(path) }).path, path);
    assert.equal(
      resolveLinkedInRequest({ url: '/api/linkedin-handler', query: { [key]: path } }).path,
      path,
    );
    if (path !== 'oauth/callback') {
      const result = await invoke(deployedHandler, rewritten(path));
      assert.equal(result.status, 405, path);
      assert.equal(result.body.success, false);
      assert.equal(result.body.message, 'Method not allowed.');
      assert.equal(result.headers['content-type'], 'application/json');
    }
  }
});
test('route reconstruction rejects missing, unknown and duplicated fallback paths and cannot override the public path', () => {
  for (const url of [
    '/api/linkedin-handler',
    '/api/linkedin-handler?__ascend_linkedin_path=unknown',
    '/api/linkedin-handler?__ascend_linkedin_path=oauth/start&__ascend_linkedin_path=internal/publish',
    '/api/linkedin-other/oauth/start',
    '/api/linkedin/oauth%2Fstart',
  ])
    assert.throws(() => resolveLinkedInRequest({ url }));
  assert.throws(() =>
    resolveLinkedInRequest({
      url: '/api/linkedin-handler',
      query: { [key]: ['oauth/start', 'internal/publish'] },
    }),
  );
  assert.equal(
    resolveLinkedInRequest({
      url: '/api/linkedin/oauth/start?__ascend_linkedin_path=internal/publish',
    }).path,
    'oauth/start',
  );
});
test('rewriting preserves callback state, authorization code, browser cookie and denied-consent handling', async () => {
  for (const queryOnly of [false, true]) {
    let received;
    const handler = createHandler({
      service: {
        origin: () => 'https://ascend.example',
        oauthCallback: async (input) => {
          received = input;
          return { draftId: 'saved-draft', result: 'denied' };
        },
      },
    });
    const params = { state: 'one-time-state', code: 'code+with/slash=', error: 'access_denied' };
    const result = await invoke(
      handler,
      queryOnly
        ? '/api/linkedin-handler'
        : rewritten('oauth/callback', new URLSearchParams(params).toString()),
      'GET',
      { cookie: 'ascend_li_oauth=browser-binding' },
      queryOnly ? { [key]: 'oauth/callback', ...params } : undefined,
    );
    assert.deepEqual(received, {
      state: params.state,
      code: params.code,
      denied: true,
      binding: 'browser-binding',
    });
    assert.equal(result.status, 303);
    assert.equal(new URL(result.headers.location).pathname, '/dashboard/linkedin');
    assert.equal(result.headers.location.includes(params.code), false);
    assert.match(
      result.headers['set-cookie'],
      /Path=\/api\/linkedin\/oauth; HttpOnly; SameSite=Lax/,
    );
  }
});
test('rewritten internal and user POST routes retain their authentication and origin checks', async () => {
  const handler = createHandler({
    env: { N8N_TO_ASCEND_SECRET: 's'.repeat(48) },
    service: {
      origin: () => 'https://ascend.example',
      internal: () => {
        throw new Error('must not execute');
      },
      oauthStart: () => {
        throw new Error('must not start OAuth');
      },
    },
  });
  assert.equal((await invoke(handler, rewritten('internal/publish'), 'POST')).status, 401);
  assert.equal(
    (await invoke(handler, rewritten('oauth/start'), 'POST', { origin: 'https://other.example' }))
      .status,
    403,
  );
  assert.equal(
    (await invoke(handler, rewritten('oauth/start'), 'POST', { origin: 'https://ascend.example' }))
      .status,
    401,
  );
});
