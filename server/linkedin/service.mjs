import {
  SafeError,
  caption,
  hash,
  imageMetadata,
  random,
  seal,
  unseal,
  approvedContext,
} from './security.mjs';
import { linkedInProvider } from './provider.mjs';
export function createService({
  env = process.env,
  fetcher = fetch,
  bridge: injected,
  provider: injectedProvider,
} = {}) {
  const origin = () => {
    try {
      const url = new URL(env.ASCEND_ORIGIN);
      if (
        url.pathname !== '/' ||
        url.search ||
        url.hash ||
        url.username ||
        url.password ||
        (url.protocol !== 'https:' &&
          !(
            env.NODE_ENV !== 'production' &&
            url.protocol === 'http:' &&
            ['localhost', '127.0.0.1'].includes(url.hostname)
          ))
      )
        throw new Error();
      return url.origin;
    } catch {
      throw new SafeError('Sharing is not configured yet.', 503, 'setup_required');
    }
  };
  function configured(oauth = false) {
    origin();
    if (env.LINKEDIN_DEV_MOCK === 'true')
      throw new SafeError(
        'Mock publishing is disabled. No real post will be made.',
        503,
        'setup_required',
      );
    for (const key of ['ASCEND_BACKEND_URL', 'LINKEDIN_BRIDGE_SECRET'])
      if (!env[key]) throw new SafeError('Sharing is not configured yet.', 503, 'setup_required');
    if (
      oauth &&
      (!env.LINKEDIN_CLIENT_ID ||
        !env.LINKEDIN_CLIENT_SECRET ||
        !/^[a-f0-9]{64}$/i.test(env.LINKEDIN_TOKEN_ENCRYPTION_KEY || '') ||
        !/^\d{6}$/.test(env.LINKEDIN_API_VERSION || '') ||
        env.LINKEDIN_REDIRECT_URI !== `${origin()}/api/linkedin/oauth/callback`)
    )
      throw new SafeError('LinkedIn connection is not configured yet.', 503, 'setup_required');
  }
  async function bridge(operation, payload = {}, auth) {
    if (injected) return injected(operation, payload, auth);
    configured();
    const url = new URL(env.ASCEND_BACKEND_URL);
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'script.google.com' ||
      !/^\/macros\/s\/[\w-]+\/exec$/.test(url.pathname)
    )
      throw new SafeError('Sharing backend is not configured.', 503, 'setup_required');
    try {
      const response = await fetcher(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'linkedinInternal',
          secret: env.LINKEDIN_BRIDGE_SECRET,
          operation,
          payload,
          auth,
        }),
        signal: AbortSignal.timeout(25000),
        redirect: 'follow',
      });
      const result = await response.json();
      if (!result.success && /setupAscend|LinkedIn\.gs|Unexpected headers|Internal authentication|Unknown.*operation|^College ID is required\.$/i.test(result.message || ''))
        throw new SafeError('LinkedIn sharing is not ready yet. Please contact the Ascend team.', 503, 'setup_required');
      if (!response.ok || !result.success)
        throw new SafeError(
          result.message === 'reconnect_required'
            ? 'Reconnect your LinkedIn account.'
            : result.message || 'Sharing storage is unavailable.',
          /session|Student not found/.test(result.message || '') ? 401 : 409,
          result.message === 'reconnect_required' ? 'reconnect_required' : 'invalid_request',
        );
      return result.data;
    } catch (e) {
      if (e instanceof SafeError) throw e;
      throw new SafeError(
        'Sharing storage is unavailable. Your activity is still saved.',
        503,
        'storage_unavailable',
      );
    }
  }
  const provider = injectedProvider || linkedInProvider(env, fetcher);
  const publicConnection = (c) => ({
    connected: !!c && c.status === 'connected' && Date.parse(c.expiresAt) > Date.now(),
    name: c?.name || '',
    expiresAt: c?.expiresAt || '',
    status: c?.status || 'disconnected',
  });
  function draftView(d) {
    const { owner, generation, ...safe } = d;
    return { ...safe, generationRequestId: generation?.requestId || '' };
  }
  async function dispatch(kind, payload) {
    const value = kind === 'generate' ? env.N8N_GENERATE_WEBHOOK_URL : env.N8N_PUBLISH_WEBHOOK_URL;
    if (!value || !env.ASCEND_TO_N8N_SECRET)
      throw new SafeError(
        'Sharing is not ready yet. Please try again after setup.',
        503,
        'setup_required',
      );
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password)
      throw new SafeError('Sharing is not configured.', 503, 'setup_required');
    // IDs only. The n8n webhook responds immediately; callbacks do the durable work.
    let response;
    try {
      response = await fetcher(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Ascend-Webhook': env.ASCEND_TO_N8N_SECRET,
        },
        body: JSON.stringify(payload),
        redirect: 'error',
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      return; /* n8n may have accepted the request. Durable callbacks/polling resolve its outcome. */
    }
    if (!response.ok)
      throw new SafeError(
        'Sharing could not start. Your draft is saved; try again.',
        502,
        'orchestration_unavailable',
      );
  }
  async function media(auth, fileId) {
    return imageMetadata(await bridge('media', { fileId }, auth));
  }
  async function publish(jobId, claimToken) {
    const claimHash = hash(claimToken || '');
    const execution = await bridge('executeJob', { id: jobId, claimHash });
    if (!execution.eligible) return execution.job;
    let submitted = false;
    try {
      configured(true);
      const { connection, snapshot } = execution;
      const accessToken = unseal(
        connection.encryptedToken,
        env.LINKEDIN_TOKEN_ENCRYPTION_KEY,
        connection.owner,
      );
      let imageUrn;
      if (snapshot.media) {
        const selected = imageMetadata(execution.media);
        if (selected.hash !== snapshot.media.hash)
          throw new SafeError('The selected image changed. Approve a new preview.');
        imageUrn = await provider.upload(accessToken, connection.memberId, selected);
      }
      const permission = await bridge('beginPost', { id: jobId, claimHash });
      if (!permission.eligible) return permission.job;
      submitted = true;
      const result = await provider.post(accessToken, connection.memberId, snapshot, imageUrn);
      return await bridge('finishJob', { id: jobId, claimHash, status: 'published', ...result });
    } catch (e) {
      const uncertain =
        submitted &&
        (e.uncertain === true || e.code === 'storage_unavailable' || !(e instanceof SafeError));
      const status = uncertain
        ? 'publication_unknown'
        : e.code === 'reconnect_required'
          ? 'reconnect_required'
          : 'failed';
      const message = uncertain
        ? 'LinkedIn may have accepted this post. Check your account; automatic resubmission is blocked.'
        : e instanceof SafeError
          ? e.message
          : 'Publishing stopped before submission. Your draft is saved.';
      return bridge('finishJob', { id: jobId, claimHash, status, error: message });
    }
  }
  return {
    origin,
    configured,
    bridge,
    publicConnection,
    async oauthStart(auth, draftId) {
      configured(true);
      const state = random(),
        binding = random();
      await bridge(
        'oauthStart',
        { stateHash: hash(state), bindingHash: hash(binding), draftId },
        auth,
      );
      const url = new URL('https://www.linkedin.com/oauth/v2/authorization');
      Object.entries({
        response_type: 'code',
        client_id: env.LINKEDIN_CLIENT_ID,
        redirect_uri: env.LINKEDIN_REDIRECT_URI,
        scope: 'openid profile w_member_social',
        state,
      }).forEach(([k, v]) => url.searchParams.set(k, v));
      return { authorizationUrl: url.href, binding };
    },
    async oauthCallback({ state, binding, code, denied }) {
      configured(true);
      if (!/^[\w-]{43}$/.test(state || '') || !/^[\w-]{43}$/.test(binding || ''))
        throw new SafeError('LinkedIn connection expired. Start again.', 409);
      const stateHash = hash(state);
      const context = await bridge('oauthConsume', { stateHash, bindingHash: hash(binding) });
      if (denied) return { draftId: context.draftId, result: 'denied' };
      if (typeof code !== 'string' || !code || code.length > 4000)
        throw new SafeError('Authorization code missing.');
      const result = await provider.exchange(code);
      await bridge('oauthComplete', {
        stateHash,
        connectionId: random(),
        memberId: result.memberId,
        name: result.name,
        encryptedToken: seal(result.accessToken, env.LINKEDIN_TOKEN_ENCRYPTION_KEY, context.owner),
        expiresAt: result.expiresAt,
        scopes: result.scopes,
      });
      return { draftId: context.draftId, result: 'connected' };
    },
    async user(action, body, auth) {
      configured();
      await bridge('auth', {}, auth);
      if (action === 'connection') return publicConnection(await bridge('connection', {}, auth));
      if (action === 'disconnect') return bridge('disconnect', {}, auth);
      if (action === 'draft/create')
        return draftView(
          await bridge(
            'createDraft',
            {
              id: hash(`${auth.collegeId}:draft:${body.requestId || random()}`),
              sourceKind: body.sourceKind,
              sourceId: body.sourceId,
            },
            auth,
          ),
        );
      if (action === 'draft/read') {
        let d = await bridge('readDraft', { id: body.id }, auth);
        if (d.generation && Date.parse(d.generation.expiresAt) <= Date.now()) {
          // Expired work never overwrites an edited revision. User can edit or regenerate.
          d = {
            ...d,
            status: d.caption ? 'ready' : 'failed',
            error: 'Caption generation timed out. Your activity is saved; try again.',
          };
        }
        return draftView(d);
      }
      if (action === 'draft/edit') {
        if (body.caption) body.caption = caption(body.caption);
        const selected = body.mediaId ? await media(auth, body.mediaId) : null;
        return draftView(
          await bridge(
            'editDraft',
            {
              ...body,
              media: selected
                ? {
                    id: selected.id,
                    hash: selected.hash,
                    name: selected.name,
                    mimeType: selected.mimeType,
                  }
                : null,
            },
            auth,
          ),
        );
      }
      if (action === 'draft/generate') {
        const requestId = random();
        const d = await bridge(
          'generate',
          { id: body.id, revision: body.revision, requestId },
          auth,
        );
        try {
          await dispatch('generate', { draftId: d.id, requestId });
        } catch {
          await bridge('generationSave', { id: d.id, requestId, error: true });
          return draftView(await bridge('readDraft', { id: d.id }, auth));
        }
        return draftView(d);
      }
      if (action === 'draft/publish') {
        configured(true);
        const d = await bridge('readDraft', { id: body.id }, auth);
        // Validate the current private media again before approval; bytes are checked again at publication.
        if (d.media && (await media(auth, d.media.id)).hash !== d.media.hash)
          throw new SafeError('The selected image changed. Save a new preview.');
        const jobId = hash(`${auth.collegeId}:${body.id}:${body.revision}`);
        const job = await bridge(
          'approve',
          {
            id: body.id,
            revision: body.revision,
            approved: body.approved,
            jobId,
            portfolioUrl: `${origin()}/u/${encodeURIComponent(auth.collegeId)}`,
          },
          auth,
        );
        if (job.status === 'queued') {
          try {
            await dispatch('publish', { jobId });
          } catch {
            /* Durable queued job can be dispatched again safely. */
          }
        }
        return job;
      }
      if (action === 'job') {
        const job = await bridge('readJob', { id: body.id }, auth);
        if (job.status === 'queued') {
          try {
            await dispatch('publish', { jobId: job.id });
          } catch {
            /* Keep queued. */
          }
        }
        return job;
      }
      if (action === 'media/read') return media(auth, body.fileId);
      if (action === 'media/upload') {
        imageMetadata({
          id: 'pending',
          name: body.fileName,
          mimeType: body.mimeType,
          base64: body.base64,
        });
        return imageMetadata(
          await bridge(
            'upload',
            { ...body, uploadId: body.uploadId || hash(random()).slice(0, 40) },
            auth,
          ),
        );
      }
      throw new SafeError('Sharing route not found.', 404);
    },
    async internal(action, body) {
      configured();
      if (action === 'context')
        return approvedContext(
          await bridge('generationContext', { id: body.draftId, requestId: body.requestId }),
        );
      if (action === 'draft-save') {
        let text,
          failed = body.error === true;
        if (!failed) {
          try {
            text = caption(body.caption, true);
          } catch {
            failed = true;
          }
        }
        return bridge('generationSave', {
          id: body.draftId,
          requestId: body.requestId,
          caption: text,
          error: failed,
        });
      }
      if (action === 'claim') {
        const claimToken = random();
        const result = await bridge('claimJob', { id: body.jobId, claimHash: hash(claimToken) });
        return result.eligible ? { ...result, claimToken } : result;
      }
      if (action === 'publish') return publish(body.jobId, body.claimToken);
      if (action === 'recover') {
        const jobs = await bridge('queuedJobs');
        for (const jobId of jobs) {
          try {
            await dispatch('publish', { jobId });
          } catch {
            /* Next recovery tick. */
          }
        }
        return { queued: jobs.length };
      }
      throw new SafeError('Internal route not found.', 404);
    },
  };
}
