# LinkedIn sharing: setup and deployment

## Architecture

Ascend keeps React/Vite, Apps Script, Sheets and Drive. A small Node Vercel Function (`api/linkedin-handler.js`) adds native cryptography, OAuth and official LinkedIn HTTP calls using built-in APIs, without a new runtime dependency. Saving activities/skills never publishes: the user opens sharing, prepares a draft, saves the latest preview, approves it and deliberately clicks Publish.

```text
React → Ascend Node API → authenticated Apps Script bridge → private Sheets / Drive
                 ├── LinkedIn OAuth / UserInfo / Images / Posts
                 └── n8n (IDs only) → approved context → Gemini → draft revision
                                   → atomic job claim → Ascend publishing service
```

The existing Ascend authentication is **MVP college-ID/email matching plus an editing token**, not verified email authentication. Every sharing request validates that existing token against Apps Script; OAuth binds to its digest and the browser. This feature does not upgrade login assurance. Replace the underlying identity matching with verified authentication before broad production use. LinkedIn account consent does not establish institution verification.

As an additional safeguard for this MVP, LinkedIn connections are bound to the exact Ascend session that completed OAuth. A new Ascend login rotates that session and requires LinkedIn authorisation again before posting, including for previously queued jobs. Knowing a college ID/email therefore cannot by itself reuse an older LinkedIn grant.

`backend/LinkedIn.gs` creates five private tabs, each with columns `id`, `owner`, `data` (JSON), `updated_at`:

| Tab | Persisted data |
| --- | --- |
| LinkedInConnections | Owner, member ID/name, connection generation/status, encrypted token, expiry, actual granted scopes |
| LinkedInDrafts | Owner/source snapshot, approved context, caption/tone/media, revision, generation request, status, approval/job reference |
| LinkedInJobs | Unique owner/draft/revision key, immutable approved content/media fingerprint, connection binding, atomic claim, state, safe errors, actual post ID and available provider URL |
| LinkedInOAuthStates | Hashed state/browser binding, session digest, connection generation, ten-minute expiry, consumed/completed flags |
| LinkedInRates | Per-user UTC-day limits: 20 generations, 5 publications, 10 connection attempts, 40 drafts, 30 image uploads |

All storage transitions use the existing Apps Script `ScriptLock`; locks are released before provider work. A publishing job and its snapshot are durable, not an in-memory queue. These tabs never appear in portfolio APIs. Restrict the spreadsheet to authorised staff. Tokens use **AES-256-GCM with owner-bound authenticated data**; other sharing records are access controlled, not encrypted. Back up the server encryption key securely. Losing/rotating it requires students to reconnect.

## 1. Apps Script

1. Replace the existing Apps Script `Code.gs` with `backend/Code.gs`.
2. Add a script file named **LinkedIn** and paste `backend/LinkedIn.gs` into it.
3. In **Project Settings → Script properties**, add **LINKEDIN_BRIDGE_SECRET**, using a strong random secret of at least 32 characters. Put the same value in Ascend's server environment, never a VITE variable.
4. Run **setupAscend**. It calls `setupLinkedIn`, preserves existing records, and appends the private tabs. Feedback remains in its separate spreadsheet.
5. **Deploy → Manage deployments → Edit → Version → New version → Deploy**. Saving alone does not update `/exec`.

## 2. LinkedIn application and callbacks

Open [LinkedIn Developers → My apps](https://www.linkedin.com/developers/apps). Create/select Ascend and complete LinkedIn's company/app association requirements. Under **Products**, request **Share on LinkedIn** and **Sign In with LinkedIn using OpenID Connect**. Under **Auth**, confirm actual access to **openid**, **profile**, **w_member_social**. The implementation requests only those scopes, not email, deprecated profile scopes, advertising access, or restricted post-read permissions.

Register exact callback URLs:

| Environment | Callback |
| --- | --- |
| Local, default configuration | `http://localhost:5174/api/linkedin/oauth/callback` |
| Existing deployed site | `https://ascend-fy.vercel.app/api/linkedin/oauth/callback` |

LinkedIn's sample app documents HTTP localhost development. If your app's portal enforces HTTPS, expose Vite through an HTTPS tunnel, set ASCEND_ORIGIN to that exact tunnel origin, and register `https://YOUR-EXACT-TUNNEL-HOST/api/linkedin/oauth/callback`. Do not mix localhost, 127.0.0.1, network IPs, ports or Vercel preview hosts. The server requires `LINKEDIN_REDIRECT_URI` to equal `ASCEND_ORIGIN + /api/linkedin/oauth/callback`.

OAuth uses a random, single-use, expiring state bound to the initiating Ascend session and an HttpOnly SameSite=Lax browser cookie (Secure on HTTPS). The backend exchanges the code and introspects actual token scope/client/expiry. It retrieves the member identifier from authenticated **`GET /v2/userinfo` → `sub`**, with the permitted profile scope, and uses `urn:li:person:{sub}` for that same application. It does not assume `/v2/me` is provisioned or trust an unvalidated ID token. No refresh token is assumed. Denied/revoked/expired access needs reconnecting.

### Version and image-access caveat

Set **LINKEDIN_API_VERSION=202610**, the latest version listed by official versioning docs checked for this implementation on 1 November 2026. Recheck supported versions before deploying and maintain this variable. Posts use **POST `/rest/posts`**, not legacy ugcPosts. Versioned requests send `LinkedIn-Version` and `X-Restli-Protocol-Version: 2.0.0`.

Images use **POST `/rest/images?action=initializeUpload`**, PUT to the provider-returned HTTPS `www.linkedin.com/dms-uploads/` destination, and wait for **AVAILABLE** before posting. Provider calls disallow redirects, and arbitrary user URLs are never fetched. Changed/unrecognised upload hosts are rejected until reviewed against official documentation.

The official Images documentation states **w_member_social is write-only on the versioned gateway**, so that scope alone cannot read image readiness there. It also documents an unversioned/legacy GET exception. App access must be verified, not inferred from docs:

- Leave **LINKEDIN_IMAGE_READ_MODE** blank until app access is confirmed. Text-only publication is independent; an image job returns a configuration error before submitting a post.
- Set **unversioned** only after confirming your app supports the documented Images GET exception. Only readiness GET omits the version header; registration and Posts remain versioned.
- Set **versioned** only if the app is entitled to versioned Images GET. A 403 remains a real access error, never fake success. No extra scopes are silently requested.

The service stores the actual returned `x-restli-id`. A View Post link is shown only if LinkedIn supplies an allowed public Location URL. Otherwise the actual post ID is shown and the student can find the post on their profile; no permalink is guessed.

## 3. Server variables

Enter secrets in **Vercel → project → Settings → Environment Variables**; locally use the ignored `.env.local`. `.env.example` contains names only. Keep the existing VITE variables configured as before. No server secret may use the VITE prefix.

| Variable | Value |
| --- | --- |
| ASCEND_ORIGIN | `https://ascend-fy.vercel.app`, local `http://localhost:5174`, or your exact HTTPS tunnel origin |
| ASCEND_BACKEND_URL | Existing Apps Script `/exec` URL, server-side copy of the frontend endpoint |
| LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET | Credentials from LinkedIn's Auth tab |
| LINKEDIN_REDIRECT_URI | Exact registered callback above |
| LINKEDIN_API_VERSION | `202610`, maintained against supported releases |
| LINKEDIN_TOKEN_ENCRYPTION_KEY | Random 32 bytes encoded as **64 hex characters** |
| LINKEDIN_BRIDGE_SECRET | Same strong secret configured in Apps Script |
| ASCEND_TO_N8N_SECRET | Strong random secret for outgoing n8n webhooks |
| N8N_TO_ASCEND_SECRET | A different strong random secret for incoming internal API requests |
| N8N_GENERATE_WEBHOOK_URL / N8N_PUBLISH_WEBHOOK_URL | Configured production webhook URLs |
| LINKEDIN_IMAGE_READ_MODE | Blank, unversioned, or versioned, after the access check above |
| LINKEDIN_DEV_MOCK | Leave blank/false; true disables sharing instead of simulating success |

Generate keys locally using Node crypto and save them directly in your password manager/environment dashboard. Do not commit them or paste them into chat. LinkedIn tokens are stored only as authenticated ciphertext; Gemini keys belong only in n8n's credential store.

## 4. Import and configure n8n

Open **n8n → Workflows → Import from File**:

- `automation/n8n/generate-draft.json`
- `automation/n8n/publish-approved.json`

Both files are **inactive/unpublished** with placeholder credential references. Keep them unpublished until configured. Create/select:

1. **Header Auth**, name `Ascend webhook (Ascend → n8n)`, header **X-Ascend-Webhook**, value matching **ASCEND_TO_N8N_SECRET**. Select on both Webhook triggers.
2. A **different Header Auth**, name `Ascend internal API (n8n → Ascend)`, header **X-Ascend-Internal**, value matching **N8N_TO_ASCEND_SECRET**. Select on every HTTP Request node, including recovery.
3. **Google Gemini(PaLM) API** / Google Gemini Chat Model credential. Obtain a key from [Google AI Studio](https://aistudio.google.com/api-keys) and enter it directly in n8n Credentials. Select this credential and a model actually available to your account on the **Google Gemini Chat Model** node. The imported model selection is a placeholder to configure, not a guarantee of availability.

No LinkedIn credential belongs in n8n. Its webhook payloads contain only draft/request/job IDs. Only the whitelisted, student-approved achievement/name/headline/interests are fetched for Gemini, not a whole private portfolio, contact details, file bytes or LinkedIn tokens. Source text is framed as untrusted data. Caption validation checks length, private identifiers and hashtag limits; students still review factual accuracy. Prompt instructions do not guarantee an LLM can never hallucinate.

Review **Ascend origin** in both workflows and **Recovery origin** in the publishing workflow. Default is `https://ascend-fy.vercel.app`; change only to a configured trusted Ascend API origin, never a webhook-supplied URL. n8n Cloud cannot call localhost: use a configured HTTPS development tunnel for local end-to-end work, or the deployed API with mocked providers during testing.

Test webhook URLs require **Listen for test event** and are temporary. After configuring, publish/activate both workflows, copy their displayed **Production URLs** to Ascend's N8N webhook variables and redeploy Ascend. Do not leave `/webhook-test/` URLs in production.

Each workflow responds with the saved revision/current job state after its work. Ascend waits briefly for dispatch and then polls durable state; an uncertain webhook timeout does not cancel work n8n may have accepted. The publishing workflow also has a minute-based recovery schedule: it redispatches only already approved queued jobs, and cannot generate approval itself. A claimed publishing phase is never replayed automatically.

Workflow settings disable saved successful/error executions, manual execution saving and progress saving. Review workspace retention, debugging, redaction and Gemini data-processing settings too. Manual node testing necessarily shows selected context to authorised workflow editors; use fictional data. Do not log headers, secrets, OAuth callback queries or raw provider errors.

## 5. Run and deploy

Deploy to the existing Vercel project. An explicit rewrite maps `/api/linkedin/:path*` to the concrete `/api/linkedin-handler` function with a reserved route parameter. The handler prefers the original public path when preserved, otherwise validates the rewritten route against its known routes. Unknown/duplicate route parameters are rejected, and neither reconstruction path bypasses authentication. The registered `/api/linkedin/oauth/callback` URL and cookie path remain unchanged. SPA rewrites exclude `/api/` and static images so API requests are not rewritten to index.html.

Safe deployment smoke check (does not start OAuth): `GET /api/linkedin/oauth/start` must return HTTP **405**, JSON `success: false` / `message: Method not allowed.`, and no `x-vercel-error: NOT_FOUND`. A successful Vite build alone does not verify serverless routing.

Local development needs two terminals:

Use Node.js 22 or newer for the local sharing server (including its built-in `.env.local` loader).

```text
npm run dev:sharing
npm run dev
```

Open **http://localhost:5174**. Vite proxies the sharing API to **127.0.0.1:3001**. The original frontend can run independently, but sharing needs the Node server. For n8n Cloud callbacks, configure a reachable HTTPS origin as described above.

## Routes and authorisation

All routes start `/api/linkedin/`. User routes are POST JSON, authenticated using `Authorization: Bearer {existing Ascend token}` and `X-Ascend-Student`, with a matching configured browser Origin. User mutations do not use ambient cookie authentication, preventing cross-origin form submissions. OAuth alone uses its protected binding cookie.

| Route | Purpose |
| --- | --- |
| oauth/start; oauth/callback (GET) | Start/complete browser/session-bound OAuth, returning to the durable draft |
| connection; disconnect | Redacted account status; remove the local encrypted connection |
| draft/create; draft/read; draft/edit | Owner-only source context and revision-checked draft editing |
| draft/generate | Generate for the current draft revision, never publish |
| draft/publish | Approve the exact revision and create/reuse its immutable job |
| job | Owner-only status and safe queued dispatch recovery |
| media/read; media/upload | Owner-checked private Drive JPG/PNG, max 2 MiB |
| internal/context; internal/draft-save | Generation-ID/revision-bound context and result |
| internal/claim; internal/publish | Atomic claim and exact approved job execution |
| internal/recover | Redispatch eligible queued work, without granting approval |

Internal endpoints require **X-Ascend-Internal** and bind operations to persisted request/job IDs, never a caller-asserted userId. Node → Apps Script uses the separate bridge secret.

## Failures and safe recovery

- Failed generation keeps the student record and previous caption. A delayed generation cannot overwrite a newer saved edit. Editing/regenerating clears the old request binding.
- Concurrent publish clicks reuse the owner/draft/revision job. Atomic claim and provider-submit phases prevent a second external call.
- Disconnect deletes the encrypted token and changes the connection generation, invalidating queued jobs and outstanding OAuth attempts. A provider request already in flight cannot be recalled. Disconnect does not delete an existing LinkedIn post; users can also revoke Ascend in LinkedIn's permitted-services settings.
- Expired/revoked access requires reconnect. No refresh-token availability is assumed.
- New sharing images use private `other` folders in the existing Drive tree. Permitted existing activity images can be selected after ownership/type/size checks. PDFs require a JPG/PNG screenshot. Approval stores a file fingerprint and publication rechecks bytes. Drive sharing permissions are not changed to upload to LinkedIn.
- Known provider rejection becomes failed/reconnect-required. A post timeout, ambiguous 5xx, missing success receipt, interrupted submit or inability to persist a known result becomes **publication_unknown**. It stays locked; no blind retry or restricted post-read API is assumed. Check LinkedIn and reconcile manually.
- Interrupted claimed jobs become unknown after five minutes. Recovery and owner polling apply this conservatively. Known failed jobs need an edited/saved new preview and fresh approval. Queued, publishing, published and unknown drafts remain locked.

## Tests and remaining external setup

Run **npm test** and **npm run build**. `tests/linkedin.test.mjs` dependency-injects mocked providers/storage/dispatch; there is no fake-live-success environment mode. It covers owner isolation, OAuth expiry/mismatch/replay/session rotation, encryption/disconnect, saving without publication, generation conflicts/failure, revision/approval checks, immutable snapshots, duplicate claims, text/image publishing, invalid media, provider errors, revoked access, uncertain outcomes, route security and workflow structure/code.

Check desktop/mobile sharing controls, image removal, draft-preserving reconnect and settings disconnect before rollout. **Live integration is not verified:** setup still requires app product/scope approval, callbacks, server secrets, both Apps Script files and redeployment, n8n credentials/origins/activation, and a selected Gemini model. No real test post may be published without deliberate approval of its exact caption/image.

## Official references checked

- [LinkedIn OAuth](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow), [localhost sample](https://learn.microsoft.com/en-us/linkedin/shared/authentication/sample-applications), [OIDC/UserInfo](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2), [introspection](https://learn.microsoft.com/en-us/linkedin/shared/authentication/token-introspection).
- [Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api?view=li-lms-2026-10), [Images and permission caveat](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/images-api?view=li-lms-2026-06), [versioning](https://learn.microsoft.com/en-us/linkedin/marketing/versioning?view=li-lms-unversioned).
- [n8n Webhook](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/), [Basic LLM Chain](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.chainllm/), [Gemini model node](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatgooglegemini/).
