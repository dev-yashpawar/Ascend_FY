import { SafeError } from './security.mjs';
export class ProviderError extends SafeError {
  constructor(status, uncertain = false) {
    super(
      status === 401
        ? 'Reconnect your LinkedIn account.'
        : 'LinkedIn could not complete this request. Check account access and try again.',
      status === 401 ? 409 : 502,
      status === 401 ? 'reconnect_required' : 'provider_error',
    );
    this.providerStatus = status;
    this.uncertain = uncertain;
  }
}
export function linkedInProvider(
  env,
  fetcher = fetch,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
) {
  const version = env.LINKEDIN_API_VERSION;
  const headers = (token) => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version': version,
  });
  async function call(url, options = {}, post = false) {
    try {
      const response = await fetcher(url, {
        ...options,
        redirect: 'error',
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok)
        throw new ProviderError(
          response.status,
          post && (response.status >= 500 || response.status === 408),
        );
      return response;
    } catch (e) {
      if (e instanceof ProviderError) throw e;
      throw new ProviderError(0, post);
    }
  }
  return {
    async exchange(code) {
      const form = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: env.LINKEDIN_REDIRECT_URI,
        client_id: env.LINKEDIN_CLIENT_ID,
        client_secret: env.LINKEDIN_CLIENT_SECRET,
      });
      const token = await (
        await call('https://www.linkedin.com/oauth/v2/accessToken', { method: 'POST', body: form })
      ).json();
      if (!token.access_token || !Number.isFinite(Number(token.expires_in)))
        throw new ProviderError(0);
      const inspection = await (
        await call('https://www.linkedin.com/oauth/v2/introspectToken', {
          method: 'POST',
          body: new URLSearchParams({
            token: token.access_token,
            client_id: env.LINKEDIN_CLIENT_ID,
            client_secret: env.LINKEDIN_CLIENT_SECRET,
          }),
        })
      ).json();
      const scopes = String(inspection.scope || '')
        .split(/[ ,]+/)
        .filter(Boolean);
      if (
        !inspection.active ||
        inspection.client_id !== env.LINKEDIN_CLIENT_ID ||
        !['openid', 'profile', 'w_member_social'].every((s) => scopes.includes(s))
      )
        throw new SafeError(
          'Required LinkedIn permissions were not granted.',
          409,
          'reconnect_required',
        );
      const identity = await (
        await call('https://api.linkedin.com/v2/userinfo', {
          headers: { Authorization: `Bearer ${token.access_token}` },
        })
      ).json();
      if (!/^[A-Za-z0-9_-]{1,200}$/.test(identity.sub || '')) throw new ProviderError(0);
      return {
        accessToken: token.access_token,
        memberId: identity.sub,
        name: String(identity.name || 'LinkedIn member').slice(0, 200),
        scopes,
        expiresAt: new Date(
          Math.min(
            Date.now() + Number(token.expires_in) * 1000,
            Number(inspection.expires_at || Infinity) * 1000,
          ),
        ).toISOString(),
      };
    },
    async upload(token, memberId, media) {
      if (!['versioned', 'unversioned'].includes(env.LINKEDIN_IMAGE_READ_MODE))
        throw new SafeError(
          'Image sharing is not enabled for this app yet. Remove the image to publish text only.',
          409,
          'image_access_required',
        );
      const initialized = await (
        await call('https://api.linkedin.com/rest/images?action=initializeUpload', {
          method: 'POST',
          headers: headers(token),
          body: JSON.stringify({ initializeUploadRequest: { owner: `urn:li:person:${memberId}` } }),
        })
      ).json();
      const asset = initialized.value;
      if (!asset || !/^urn:li:image:[\w-]+$/.test(asset.image || '')) throw new ProviderError(0);
      const url = new URL(asset.uploadUrl);
      // Only provider-returned upload destinations; no redirects and no caller-supplied URLs.
      if (
        url.protocol !== 'https:' ||
        url.hostname !== 'www.linkedin.com' ||
        url.port ||
        !url.pathname.startsWith('/dms-uploads/') ||
        url.username ||
        url.password
      )
        throw new ProviderError(0);
      await call(url, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': media.mimeType },
        body: Buffer.from(media.base64, 'base64'),
      });
      for (let attempt = 0; attempt < 8; attempt++) {
        const readHeaders = headers(token);
        if (env.LINKEDIN_IMAGE_READ_MODE === 'unversioned') delete readHeaders['LinkedIn-Version'];
        const info = await (
          await call(`https://api.linkedin.com/rest/images/${encodeURIComponent(asset.image)}`, {
            headers: readHeaders,
          })
        ).json();
        if (info.status === 'AVAILABLE') return asset.image;
        if (info.status === 'PROCESSING_FAILED')
          throw new SafeError('LinkedIn could not process this image. Choose another image.');
        await sleep(1000);
      }
      throw new SafeError(
        'The image is still processing. No post was submitted. Please try again later.',
      );
    },
    async post(token, memberId, snapshot, imageUrn) {
      const commentary =
        snapshot.caption + (snapshot.portfolioUrl ? `\n\n${snapshot.portfolioUrl}` : '');
      const payload = {
        author: `urn:li:person:${memberId}`,
        commentary,
        visibility: 'PUBLIC',
        distribution: {
          feedDistribution: 'MAIN_FEED',
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: 'PUBLISHED',
        isReshareDisabledByAuthor: false,
      };
      if (imageUrn)
        payload.content = {
          media: { id: imageUrn, altText: 'Achievement image selected and approved by its author' },
        };
      const response = await call(
        'https://api.linkedin.com/rest/posts',
        { method: 'POST', headers: headers(token), body: JSON.stringify(payload) },
        true,
      );
      const postId = response.headers.get('x-restli-id');
      if (!postId || !/^urn:li:(share|ugcPost):\d+$/.test(postId)) throw new ProviderError(0, true);
      let postUrl = '';
      try {
        const location = new URL(response.headers.get('location'));
        if (
          location.protocol === 'https:' &&
          location.hostname === 'www.linkedin.com' &&
          location.pathname.startsWith('/feed/update/') &&
          !location.username &&
          !location.password
        )
          postUrl = location.href;
      } catch {
        /* No public URL supplied: display the actual post ID only. */
      }
      return { postId, postUrl };
    },
  };
}
