import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createService } from '../server/linkedin/service.mjs';
import { createHandler } from '../server/linkedin/handler.mjs';
import { linkedInProvider, ProviderError } from '../server/linkedin/provider.mjs';
import { SafeError, seal, unseal, hash, imageMetadata } from '../server/linkedin/security.mjs';

const env = {
  NODE_ENV: 'test',
  ASCEND_ORIGIN: 'http://localhost:5174',
  ASCEND_BACKEND_URL: 'https://script.google.com/macros/s/test/exec',
  LINKEDIN_BRIDGE_SECRET: 'b'.repeat(48),
  LINKEDIN_CLIENT_ID: 'client',
  LINKEDIN_CLIENT_SECRET: 'secret',
  LINKEDIN_TOKEN_ENCRYPTION_KEY: 'a'.repeat(64),
  LINKEDIN_API_VERSION: '202610',
  LINKEDIN_REDIRECT_URI: 'http://localhost:5174/api/linkedin/oauth/callback',
  LINKEDIN_IMAGE_READ_MODE: 'unversioned',
  ASCEND_TO_N8N_SECRET: 'o'.repeat(48),
  N8N_TO_ASCEND_SECRET: 'i'.repeat(48),
  N8N_GENERATE_WEBHOOK_URL: 'https://automation.example/webhook/generate',
  N8N_PUBLISH_WEBHOOK_URL: 'https://automation.example/webhook/publish',
};
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jVFoAAAAASUVORK5CYII=',
  'base64',
);
function harness() {
  const sheets = {},
    properties = { SPREADSHEET_ID: 'students', LINKEDIN_BRIDGE_SECRET: env.LINKEDIN_BRIDGE_SECRET },
    files = new Map();
  class Sheet {
    constructor() {
      this.data = [];
    }
    getLastRow() {
      return this.data.length;
    }
    getMaxRows() {
      return 1000;
    }
    setFrozenRows() {}
    appendRow(row) {
      this.data.push([...row]);
    }
    deleteRow(row) {
      this.data.splice(row - 1, 1);
    }
    getDataRange() {
      return { getValues: () => this.data.map((r) => [...r]) };
    }
    getRange(row, col, count, width) {
      return {
        getValues: () =>
          Array.from({ length: count }, (_, i) =>
            Array.from({ length: width }, (_, j) => this.data[row - 1 + i]?.[col - 1 + j] ?? ''),
          ),
        setFontWeight() {
          return this;
        },
        setNumberFormat() {
          return this;
        },
        setValues: (values) =>
          values.forEach((r, i) => {
            this.data[row - 1 + i] ||= [];
            r.forEach((v, j) => (this.data[row - 1 + i][col - 1 + j] = v));
          }),
      };
    }
  }
  const iterator = (items) => {
    let i = 0;
    return { hasNext: () => i < items.length, next: () => items[i++] };
  };
  const ss = {
    getId: () => 'same-workbook',
    getSheetByName: (n) => sheets[n],
    insertSheet: (n) => (sheets[n] = new Sheet()),
  };
  const context = vm.createContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => properties[k],
        setProperty: (k, v) => (properties[k] = v),
      }),
    },
    SpreadsheetApp: { openById: () => ss, flush() {} },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      computeDigest: (_, v) => crypto.createHash('sha256').update(v).digest(),
      base64Encode: (v) => Buffer.from(v).toString('base64'),
      DigestAlgorithm: { SHA_256: 'sha256' },
    },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    ContentService: {
      createTextOutput: (v) => ({ setMimeType: () => JSON.parse(v) }),
      MimeType: { JSON: 'json' },
    },
    DriveApp: {
      getFileById: (id) => {
        if (!files.has(id)) throw new Error('No image.');
        return files.get(id);
      },
    },
  });
  vm.runInContext(fs.readFileSync('backend/Code.gs', 'utf8'), context);
  vm.runInContext(fs.readFileSync('backend/LinkedIn.gs', 'utf8'), context);
  context.setupAscend();
  context.uploadRoot_ = () => ({
    getFoldersByName: (owner) =>
      iterator([
        {
          getFoldersByName: (category) =>
            iterator(category === 'other' ? [{ getId: () => `folder-${owner}` }] : []),
        },
      ]),
  });
  const post = (body) => context.doPost({ postData: { contents: JSON.stringify(body) } });
  const start = (id) =>
    post({ action: 'startSession', collegeId: id, collegeEmail: `${id.toLowerCase()}@example.com` })
      .data.session;
  const a = start('STKBTCOE23001'),
    b = start('STKBTCOE23002');
  function activity(auth, id) {
    return post({
      action: 'addActivity',
      ...auth,
      record: {
        activityId: id,
        category: 'Hackathon',
        title: 'Campus hackathon',
        organization: 'Campus club',
        activityDate: '2026-10-01',
        description: 'I built a prototype and learned to collaborate.',
        proofUrl: '',
        isPublicProof: false,
      },
    });
  }
  assert.equal(activity(a, 'activity-a').success, true);
  assert.equal(activity(b, 'activity-b').success, true);
  const bridge = async (operation, payload = {}, auth) => {
    const r = post({
      action: 'linkedinInternal',
      secret: env.LINKEDIN_BRIDGE_SECRET,
      operation,
      payload,
      auth,
    });
    if (!r.success) throw new SafeError(r.message, 409);
    return JSON.parse(JSON.stringify(r.data));
  };
  const calls = [],
    provider = {
      exchange: async () => ({
        accessToken: 'token-A',
        memberId: 'member-A',
        name: 'Student A',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        scopes: ['openid', 'profile', 'w_member_social'],
      }),
      upload: async (...args) => {
        calls.push(['upload', ...args]);
        return 'urn:li:image:image-A';
      },
      post: async (...args) => {
        calls.push(['post', ...args]);
        return { postId: 'urn:li:share:12345', postUrl: '' };
      },
    };
  const webhookCalls = [];
  const service = createService({
    env,
    bridge,
    provider,
    fetcher: async (url, options) => {
      webhookCalls.push({ url: String(url), body: JSON.parse(options.body) });
      return new Response('{}');
    },
  });
  async function connect(auth = a) {
    const s = await service.oauthStart(auth, '');
    await service.oauthCallback({
      state: new URL(s.authorizationUrl).searchParams.get('state'),
      binding: s.binding,
      code: 'code',
    });
  }
  async function draft(auth = a, sourceId = 'activity-a') {
    const d = await service.user(
      'draft/create',
      { sourceKind: 'activity', sourceId, requestId: crypto.randomUUID() },
      auth,
    );
    return service.user(
      'draft/edit',
      {
        id: d.id,
        revision: d.revision,
        caption:
          'I built a prototype at our campus hackathon and learned to collaborate with my team.',
        tone: 'professional',
        includePortfolio: false,
        useName: false,
        useHeadline: false,
        interests: '',
      },
      auth,
    );
  }
  async function approve(d, auth = a) {
    return service.user('draft/publish', { id: d.id, revision: d.revision, approved: true }, auth);
  }
  function file(id, owner = a.collegeId, mimeType = 'image/png', bytes = png) {
    files.set(id, {
      getId: () => id,
      getName: () => 'selected.png',
      getParents: () => iterator([{ getId: () => `folder-${owner}` }]),
      getBlob: () => ({ getContentType: () => mimeType, getBytes: () => [...bytes] }),
    });
  }
  return {
    context,
    sheets,
    properties,
    post,
    a,
    b,
    bridge,
    service,
    provider,
    calls,
    webhookCalls,
    connect,
    draft,
    approve,
    file,
  };
}

test('sharing tables preserve student data and saving an activity never starts publication', () => {
  const h = harness();
  assert.equal(h.sheets.LinkedInJobs.data.length, 1);
  assert.equal(h.sheets.LinkedInDrafts.data.length, 1);
  h.context.setupAscend();
  assert.equal(h.sheets.Activities.data.length, 3);
  assert.equal(
    h.post({ action: 'linkedinInternal', secret: 'wrong', operation: 'queuedJobs' }).success,
    false,
  );
});
test('student ownership is enforced for drafts, sources, edits and jobs', async () => {
  const h = harness(),
    d = await h.draft();
  await h.connect();
  for (const action of ['draft/read', 'draft/edit', 'draft/publish'])
    await assert.rejects(
      () => h.service.user(action, { id: d.id, revision: d.revision, approved: true }, h.b),
      /not found/,
    );
  await assert.rejects(
    () => h.service.user('draft/create', { sourceKind: 'activity', sourceId: 'activity-b' }, h.a),
    /not found/,
  );
  const j = await h.approve(d);
  await assert.rejects(() => h.service.user('job', { id: j.id }, h.b), /not found/);
});
test('OAuth state is expiring, bound to browser and Ascend session, and single-use', async () => {
  const h = harness();
  const s = await h.service.oauthStart(h.a, '');
  const state = new URL(s.authorizationUrl).searchParams.get('state');
  await assert.rejects(
    () => h.service.oauthCallback({ state, binding: 'x'.repeat(43), code: 'c' }),
    /invalid/,
  );
  const record = h.context.liGet_('LinkedInOAuthStates', hash(state));
  record.expiresAt = '2000-01-01T00:00:00.000Z';
  h.context.liSave_('LinkedInOAuthStates', record);
  await assert.rejects(
    () => h.service.oauthCallback({ state, binding: s.binding, code: 'c' }),
    /expired/,
  );
  const fresh = await h.service.oauthStart(h.a, '');
  const callback = {
    state: new URL(fresh.authorizationUrl).searchParams.get('state'),
    binding: fresh.binding,
    code: 'c',
  };
  await h.service.oauthCallback(callback);
  await assert.rejects(() => h.service.oauthCallback(callback), /changed|used|completed/);
  const changed = await h.service.oauthStart(h.a, '');
  h.properties[`SESSION_${h.a.collegeId}`] = 'rotated';
  await assert.rejects(
    () =>
      h.service.oauthCallback({
        state: new URL(changed.authorizationUrl).searchParams.get('state'),
        binding: changed.binding,
        code: 'c',
      }),
    /invalid|expired/,
  );
});
test('OAuth denial creates no connection and disconnect invalidates outstanding OAuth attempts', async () => {
  const h = harness(),
    s = await h.service.oauthStart(h.a, '');
  const r = await h.service.oauthCallback({
    state: new URL(s.authorizationUrl).searchParams.get('state'),
    binding: s.binding,
    denied: true,
  });
  assert.equal(r.result, 'denied');
  assert.equal((await h.service.user('connection', {}, h.a)).connected, false);
  await h.connect();
  const second = await h.service.oauthStart(h.a, '');
  await h.service.user('disconnect', {}, h.a);
  await assert.rejects(
    () =>
      h.service.oauthCallback({
        state: new URL(second.authorizationUrl).searchParams.get('state'),
        binding: second.binding,
        code: 'c',
      }),
    /changed/,
  );
  assert.equal(h.context.liGet_('LinkedInConnections', h.a.collegeId).encryptedToken, undefined);
});
test('tokens are authenticated-encrypted, owner-bound, and excluded from browser and webhook responses', async () => {
  const encrypted = seal('private-token', env.LINKEDIN_TOKEN_ENCRYPTION_KEY, 'A');
  assert.equal(unseal(encrypted, env.LINKEDIN_TOKEN_ENCRYPTION_KEY, 'A'), 'private-token');
  assert.throws(() => unseal(encrypted, env.LINKEDIN_TOKEN_ENCRYPTION_KEY, 'B'));
  const h = harness();
  await h.connect();
  const c = await h.service.user('connection', {}, h.a);
  assert.equal(JSON.stringify(c).includes('token-A'), false);
  assert.equal(JSON.stringify(c).includes('encryptedToken'), false);
  assert.equal(
    h.context.liGet_('LinkedInConnections', h.a.collegeId).encryptedToken.includes('token-A'),
    false,
  );
  const d = await h.draft();
  await h.service.user('draft/generate', { id: d.id, revision: d.revision }, h.a);
  assert.deepEqual(Object.keys(h.webhookCalls[0].body).sort(), ['draftId', 'requestId']);
});
test('rotating the MVP login session requires fresh LinkedIn consent before an old grant can be reused', async () => {
  const h = harness();
  await h.connect();
  const d = await h.draft(),
    j = await h.approve(d),
    claim = await h.service.internal('claim', { jobId: j.id });
  const newSession = h.post({
    action: 'startSession',
    collegeId: h.a.collegeId,
    collegeEmail: `${h.a.collegeId.toLowerCase()}@example.com`,
  }).data.session;
  const connection = await h.service.user('connection', {}, newSession);
  assert.equal(connection.connected, false);
  assert.equal(connection.status, 'reconnect_required');
  const result = await h.service.internal('publish', { jobId: j.id, claimToken: claim.claimToken });
  assert.equal(result.status, 'reconnect_required');
  assert.equal(h.calls.length, 0);
});
test('delayed generation cannot overwrite a newer manual edit and errors preserve captions and student records', async () => {
  const h = harness(),
    d = await h.draft();
  await h.service.user('draft/generate', { id: d.id, revision: d.revision }, h.a);
  const requestId = h.webhookCalls[0].body.requestId;
  const ctx = await h.service.internal('context', { draftId: d.id, requestId });
  assert.equal(JSON.stringify(ctx).includes(h.a.collegeId), false);
  assert.equal(JSON.stringify(ctx).includes('example.com'), false);
  const edited = await h.service.user(
    'draft/edit',
    {
      id: d.id,
      revision: d.revision,
      caption: 'I edited this caption myself.',
      tone: 'simple',
      includePortfolio: false,
    },
    h.a,
  );
  await assert.rejects(
    () =>
      h.service.internal('draft-save', {
        draftId: d.id,
        requestId,
        caption: 'I learned '.repeat(40),
      }),
    /superseded/,
  );
  assert.equal((await h.service.user('draft/read', { id: d.id }, h.a)).caption, edited.caption);
  await h.service.user('draft/generate', { id: d.id, revision: edited.revision }, h.a);
  const again = h.webhookCalls.at(-1).body.requestId;
  await h.service.internal('draft-save', { draftId: d.id, requestId: again, error: true });
  assert.equal((await h.service.user('draft/read', { id: d.id }, h.a)).caption, edited.caption);
  assert.equal(h.sheets.Activities.data.length, 3);
});
test('unapproved/outdated revisions are rejected and concurrent approval/claims produce one immutable job', async () => {
  const h = harness();
  await h.connect();
  const d = await h.draft();
  await assert.rejects(
    () => h.service.user('draft/publish', { id: d.id, revision: d.revision, approved: false }, h.a),
    /Approve/,
  );
  await assert.rejects(
    () =>
      h.service.user('draft/publish', { id: d.id, revision: d.revision - 1, approved: true }, h.a),
    /changed/,
  );
  const [a, b] = await Promise.all([h.approve(d), h.approve(d)]);
  assert.equal(a.id, b.id);
  assert.equal(h.sheets.LinkedInJobs.data.length, 2);
  const [x, y] = await Promise.all([
    h.service.internal('claim', { jobId: a.id }),
    h.service.internal('claim', { jobId: a.id }),
  ]);
  assert.equal([x, y].filter((c) => c.eligible).length, 1);
  await assert.rejects(
    () =>
      h.service.user(
        'draft/edit',
        { id: d.id, revision: d.revision, caption: 'Changed after approval' },
        h.a,
      ),
    /locked/,
  );
  const claim = x.eligible ? x : y;
  await h.service.internal('publish', { jobId: a.id, claimToken: claim.claimToken });
  await h.service.internal('publish', { jobId: a.id, claimToken: claim.claimToken });
  assert.equal(h.calls.filter((c) => c[0] === 'post').length, 1);
  assert.equal(h.calls.at(-1)[3].caption, d.caption);
  assert.equal(h.calls.at(-1)[1], 'token-A');
});
test('a queued job cannot switch to another student connection or a newly reconnected account', async () => {
  const h = harness();
  await h.connect();
  const d = await h.draft(),
    job = await h.approve(d);
  const claim = await h.service.internal('claim', { jobId: job.id });
  const c = h.context.liGet_('LinkedInConnections', h.a.collegeId);
  c.connectionId = 'other-connection';
  c.memberId = 'member-B';
  h.context.liSave_('LinkedInConnections', c);
  const result = await h.service.internal('publish', {
    jobId: job.id,
    claimToken: claim.claimToken,
  });
  assert.equal(result.status, 'reconnect_required');
  assert.equal(h.calls.length, 0);
});
test('image selection checks ownership and publishing verifies the exact approved image bytes', async () => {
  const h = harness();
  h.file('own-image-12345');
  h.file('other-image-12345', h.b.collegeId);
  h.file('certificate-pdf-12345', h.a.collegeId, 'application/pdf');
  await assert.rejects(
    () => h.service.user('media/read', { fileId: 'other-image-12345' }, h.a),
    /another account/,
  );
  await assert.rejects(
    () => h.service.user('media/read', { fileId: 'certificate-pdf-12345' }, h.a),
    /JPG or PNG/,
  );
  assert.throws(() =>
    imageMetadata({ mimeType: 'image/png', base64: Buffer.from('not PNG').toString('base64') }),
  );
  await h.connect();
  const d = await h.draft();
  const edited = await h.service.user(
    'draft/edit',
    {
      id: d.id,
      revision: d.revision,
      caption: d.caption,
      tone: d.tone,
      includePortfolio: false,
      mediaId: 'own-image-12345',
    },
    h.a,
  );
  const job = await h.approve(edited),
    claim = await h.service.internal('claim', { jobId: job.id });
  const result = await h.service.internal('publish', {
    jobId: job.id,
    claimToken: claim.claimToken,
  });
  assert.equal(result.status, 'published');
  assert.equal(h.calls[0][0], 'upload');
  assert.equal(h.calls[1][4], 'urn:li:image:image-A');
});
test('ambiguous publication timeouts are never retried and record the unknown state', async () => {
  const h = harness();
  await h.connect();
  const d = await h.draft(),
    job = await h.approve(d),
    claim = await h.service.internal('claim', { jobId: job.id });
  let attempts = 0;
  h.provider.post = async () => {
    attempts++;
    throw new ProviderError(0, true);
  };
  const r = await h.service.internal('publish', { jobId: job.id, claimToken: claim.claimToken });
  assert.equal(r.status, 'publication_unknown');
  await h.service.internal('publish', { jobId: job.id, claimToken: claim.claimToken });
  assert.equal(attempts, 1);
  await assert.rejects(
    () => h.service.user('draft/edit', { id: d.id, revision: d.revision, caption: 'retry' }, h.a),
    /locked/,
  );
  assert.equal((await h.approve(d)).status, 'publication_unknown');
});
test('a changed media file cannot replace the image approved for a job', async () => {
  const h = harness();
  await h.connect();
  h.file('fingerprint-image-123');
  const d = await h.draft();
  const edited = await h.service.user(
    'draft/edit',
    {
      id: d.id,
      revision: d.revision,
      caption: d.caption,
      tone: d.tone,
      includePortfolio: false,
      mediaId: 'fingerprint-image-123',
    },
    h.a,
  );
  const j = await h.approve(edited),
    claim = await h.service.internal('claim', { jobId: j.id });
  const changed = Buffer.from(png);
  changed[changed.length - 1] ^= 1;
  h.file('fingerprint-image-123', h.a.collegeId, 'image/png', changed);
  const result = await h.service.internal('publish', { jobId: j.id, claimToken: claim.claimToken });
  assert.equal(result.status, 'failed');
  assert.equal(h.calls.length, 0);
});
test('a definite orchestration failure preserves a saved activity and previous caption', async () => {
  const h = harness(),
    d = await h.draft();
  const service = createService({
    env,
    bridge: h.bridge,
    provider: h.provider,
    fetcher: async () => new Response('', { status: 500 }),
  });
  const r = await service.user('draft/generate', { id: d.id, revision: d.revision }, h.a);
  assert.equal(r.caption, d.caption);
  assert.equal(r.status, 'ready');
  assert.match(r.error, /failed/);
  assert.equal(h.sheets.Activities.getLastRow(), 3);
});
test('revoked access requires reconnect and known provider rejection fails without claiming success', async () => {
  for (const [status, expected] of [
    [401, 'reconnect_required'],
    [403, 'failed'],
    [429, 'failed'],
  ]) {
    const h = harness();
    await h.connect();
    const d = await h.draft(),
      j = await h.approve(d),
      c = await h.service.internal('claim', { jobId: j.id });
    h.provider.post = async () => {
      throw new ProviderError(status);
    };
    const result = await h.service.internal('publish', { jobId: j.id, claimToken: c.claimToken });
    assert.equal(result.status, expected);
    assert.equal(result.postId, '');
    if (status === 401)
      assert.equal((await h.service.user('connection', {}, h.a)).connected, false);
  }
});
test('stale interrupted publishing jobs become unknown and generation is rate-limited', async () => {
  const h = harness();
  await h.connect();
  const d = await h.draft(),
    j = await h.approve(d);
  await h.service.internal('claim', { jobId: j.id });
  const row = h.context.liGet_('LinkedInJobs', j.id);
  row.updatedAt = '2000-01-01T00:00:00.000Z';
  const stored = h.sheets.LinkedInJobs.data[1];
  stored[2] = JSON.stringify(row);
  assert.equal((await h.service.user('job', { id: j.id }, h.a)).status, 'publication_unknown');
  const another = await h.draft();
  for (let i = 0; i < 20; i++)
    await h.service.user('draft/generate', { id: another.id, revision: another.revision }, h.a);
  await assert.rejects(
    () => h.service.user('draft/generate', { id: another.id, revision: another.revision }, h.a),
    /limit/,
  );
});
test('official provider uses Posts API, waits for image readiness, rejects upload URL redirects and never fabricates links', async () => {
  const calls = [];
  let ready = 0;
  const fetcher = async (url, options) => {
    calls.push([String(url), options]);
    if (String(url).includes('initializeUpload'))
      return Response.json({
        value: { image: 'urn:li:image:one', uploadUrl: 'https://www.linkedin.com/dms-uploads/one' },
      });
    if (options.method === 'PUT') return new Response('');
    if (String(url).includes('/rest/images/'))
      return Response.json({ status: ++ready === 1 ? 'PROCESSING' : 'AVAILABLE' });
    return new Response('', { status: 201, headers: { 'x-restli-id': 'urn:li:share:123' } });
  };
  const provider = linkedInProvider(env, fetcher, async () => {});
  const image = await provider.upload('private', 'member-A', {
    mimeType: 'image/png',
    base64: png.toString('base64'),
  });
  assert.equal(image, 'urn:li:image:one');
  assert.equal(ready, 2);
  const result = await provider.post(
    'private',
    'member-A',
    { caption: 'Approved caption', portfolioUrl: '' },
    image,
  );
  assert.equal(result.postId, 'urn:li:share:123');
  assert.equal(result.postUrl, '');
  assert.equal(calls.at(-1)[0], 'https://api.linkedin.com/rest/posts');
  assert.equal(calls.at(-1)[1].headers['LinkedIn-Version'], '202610');
  const evil = linkedInProvider(env, async () =>
    Response.json({ value: { image: 'urn:li:image:one', uploadUrl: 'http://127.0.0.1/private' } }),
  );
  await assert.rejects(() =>
    evil.upload('private', 'member-A', { base64: png.toString('base64') }),
  );
});
test('internal routes reject missing secrets and user routes reject cross-origin mutations', async () => {
  async function invoke(path, headers) {
    let output = '';
    const res = {
      headers: {},
      setHeader(k, v) {
        this.headers[k] = v;
      },
      end(s) {
        output = s;
      },
    };
    await createHandler({
      env,
      service: {
        origin: () => env.ASCEND_ORIGIN,
        internal: () => {
          throw new Error('must not reach');
        },
      },
    })({ url: '/api/linkedin/' + path, method: 'POST', headers, body: {} }, res);
    return { status: res.statusCode, body: JSON.parse(output) };
  }
  assert.equal((await invoke('internal/publish', {})).status, 401);
  assert.equal((await invoke('draft/publish', { origin: 'https://evil.example' })).status, 403);
});
test('provider OAuth checks actual scopes and uses authenticated OIDC UserInfo for the member ID', async () => {
  const calls = [];
  let allowed = true;
  const provider = linkedInProvider(env, async (url, options) => {
    calls.push([String(url), options]);
    if (String(url).includes('accessToken'))
      return Response.json({ access_token: 'only-server-sees-this', expires_in: 3600 });
    if (String(url).includes('introspectToken'))
      return Response.json({
        active: true,
        client_id: 'client',
        scope: allowed ? 'openid,profile,w_member_social' : 'openid,profile',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      });
    return Response.json({ sub: 'member-from-userinfo', name: 'Connected student' });
  });
  const result = await provider.exchange('authorization-code');
  assert.equal(result.memberId, 'member-from-userinfo');
  assert.equal(calls.at(-1)[0], 'https://api.linkedin.com/v2/userinfo');
  assert.equal(calls.at(-1)[1].headers.Authorization, 'Bearer only-server-sees-this');
  allowed = false;
  await assert.rejects(() => provider.exchange('another-code'), /permissions/);
});
test('provider missing receipts and ambiguous 5xx responses remain uncertain', async () => {
  for (const status of [201, 500]) {
    const provider = linkedInProvider(env, async () => new Response('', { status }));
    await assert.rejects(
      () => provider.post('token', 'member', { caption: 'Approved caption', portfolioUrl: '' }),
      (e) => e instanceof ProviderError && e.uncertain === true,
    );
  }
});
test('OAuth handler reads its scoped cookie and redirects without exposing codes or tokens', async () => {
  let called;
  const res = {
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v;
    },
    end() {},
  };
  const handler = createHandler({
    env,
    service: {
      origin: () => env.ASCEND_ORIGIN,
      oauthCallback: async (p) => {
        called = p;
        return { draftId: 'saved-draft', result: 'connected' };
      },
    },
  });
  await handler(
    {
      url: '/api/linkedin/oauth/callback?state=state&code=private-code',
      method: 'GET',
      headers: { cookie: 'other=1; ascend_li_oauth=browser-binding' },
    },
    res,
  );
  assert.equal(called.binding, 'browser-binding');
  assert.equal(res.statusCode, 303);
  assert.equal(res.headers.Location.includes('private-code'), false);
  assert.equal(new URL(res.headers.Location).searchParams.get('draft'), 'saved-draft');
});
test('workflows are inactive, authenticated, contain no LinkedIn tokens, and caption validation code runs', () => {
  for (const name of ['generate-draft', 'publish-approved']) {
    const workflow = JSON.parse(fs.readFileSync(`automation/n8n/${name}.json`, 'utf8'));
    assert.equal(workflow.active, false);
    assert.equal(workflow.settings.saveDataSuccessExecution, 'none');
    const hook = workflow.nodes.find((n) => n.type === 'n8n-nodes-base.webhook');
    assert.equal(hook.parameters.authentication, 'headerAuth');
    for (const [from, types] of Object.entries(workflow.connections)) {
      assert.ok(workflow.nodes.some((n) => n.name === from));
      for (const outputs of Object.values(types))
        for (const output of outputs)
          for (const target of output)
            assert.ok(workflow.nodes.some((n) => n.name === target.node));
    }
    assert.equal(JSON.stringify(workflow).includes('access_token'), false);
    if (name === 'generate-draft') {
      const code = workflow.nodes.find((n) => n.name === 'Validate caption').parameters.jsCode;
      const result = new Function('$input', code)({
        first: () => ({
          json: {
            text: 'I learned to collaborate and build a useful prototype with my team. '.repeat(8),
          },
        }),
      });
      assert.equal(result[0].json.error, false);
    }
  }
});
