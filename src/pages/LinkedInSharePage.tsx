import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Linkedin, Loader2, ImagePlus, ExternalLink } from 'lucide-react';
import { linkedin } from '../services/linkedin';
import { getSession, isMock } from '../services/api';
import { usePortfolio } from '../hooks/usePortfolio';
import { fileBase64 } from '../utils/uploads';
import type { LinkedInConnection, ShareDraft, ShareJob, ShareMedia } from '../types/linkedin';
import { PageHeading } from '../components/layout/Layout';
import { Feedback, Loading, TextArea } from '../components/ui';
import './linkedin.css';
const lockedStates = ['queued', 'publishing', 'published', 'publication_unknown'];
function MediaPreview({
  media,
  onReady,
}: {
  media: ShareMedia;
  onReady?: (ready: boolean) => void;
}) {
  const [url, setUrl] = useState(''),
    [error, setError] = useState('');
  useEffect(() => {
    onReady?.(false);
    let active = true;
    let objectUrl = '';
    setUrl('');
    setError('');
    const load = media.base64 ? Promise.resolve(media) : linkedin.media(media.id);
    load
      .then((m) => {
        if (!active) return;
        const bytes = Uint8Array.from(atob(m.base64 || ''), (c) => c.charCodeAt(0));
        objectUrl = URL.createObjectURL(new Blob([bytes], { type: m.mimeType }));
        setUrl(objectUrl);
      })
      .catch(() => {
        if (active)
          setError('Image preview unavailable. Select the image again before publishing.');
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [media.id, media.hash, media.base64, onReady]);
  return error ? (
    <p role="alert">{error}</p>
  ) : url ? (
    <img
      className="linkedin-image"
      src={url}
      alt="Selected achievement image for your LinkedIn post"
      onLoad={() => onReady?.(true)}
      onError={() => {
        setError('This image cannot be previewed. Choose a valid JPG or PNG before publishing.');
        onReady?.(false);
      }}
    />
  ) : (
    <Loading label="Loading image preview…" />
  );
}
export function LinkedInSharePage() {
  const [params, setParams] = useSearchParams();
  const { portfolio } = usePortfolio();
  const [draft, setDraft] = useState<ShareDraft | null>(null),
    [connection, setConnection] = useState<LinkedInConnection | null>(null),
    [job, setJob] = useState<ShareJob | null>(null);
  const [busy, setBusy] = useState(''),
    [error, setError] = useState(''),
    [dirty, setDirty] = useState(false),
    [approved, setApproved] = useState(false),
    [preview, setPreview] = useState(false),
    [loading, setLoading] = useState(true);
  const [imageReady, setImageReady] = useState(false);
  const loadedId = useRef('');
  const creationId = useRef({ key: '', id: crypto.randomUUID() });
  const storageKey = `ascend:linkedin:last-draft:${getSession()?.collegeId}`;
  useEffect(() => {
    const id = params.get('draft') || sessionStorage.getItem(storageKey);
    if (params.get('draft') && loadedId.current === params.get('draft')) return;
    const sourceKey = `${params.get('sourceKind')}:${params.get('sourceId')}`;
    if (creationId.current.key !== sourceKey)
      creationId.current = { key: sourceKey, id: crypto.randomUUID() };
    setLoading(true);
    let active = true;
    (async () => {
      try {
        const c = await linkedin.connection();
        if (active) setConnection(c);
        const d = params.get('draft')
          ? await linkedin.read(params.get('draft')!)
          : params.get('sourceId')
            ? await linkedin.create(
                params.get('sourceKind') || '',
                params.get('sourceId')!,
                creationId.current.id,
              )
            : id
              ? await linkedin.read(id)
              : null;
        if (!active) return;
        if (d) {
          setDraft(d);
          sessionStorage.setItem(storageKey, d.id);
          loadedId.current = d.id;
          setParams({ draft: d.id }, { replace: true });
          if (d.jobId) setJob(await linkedin.job(d.jobId));
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [params, storageKey, setParams]);
  const generating = draft?.status === 'generating' && !dirty;
  const pollingJob = job && ['queued', 'publishing'].includes(job.status);
  useEffect(() => {
    if (!draft || (!generating && !pollingJob)) return;
    let active = true;
    const timer = window.setInterval(async () => {
      try {
        if (pollingJob && job) {
          const j = await linkedin.job(job.id);
          if (active) {
            setJob(j);
            if (!['queued', 'publishing'].includes(j.status)) {
              setDraft(await linkedin.read(draft.id));
              setApproved(false);
              setPreview(false);
              if (j.status === 'reconnect_required') setConnection(await linkedin.connection());
            }
          }
        } else {
          const d = await linkedin.read(draft.id);
          if (active) setDraft(d);
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    }, 4000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [draft?.id, generating, pollingJob, job?.id]);
  function change(patch: Partial<ShareDraft>) {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    setDirty(true);
    setApproved(false);
    setPreview(false);
    setError('');
  }
  async function save(force = false) {
    if (!draft) throw new Error('Choose an activity first.');
    let d = draft;
    if (dirty || force) {
      try {
        d = await linkedin.edit(draft);
      } catch (e) {
        if (
          draft.status !== 'generating' ||
          !(e instanceof Error) ||
          !e.message.includes('Draft changed')
        )
          throw e;
        const latest = await linkedin.read(draft.id);
        d = await linkedin.edit({ ...draft, revision: latest.revision });
      }
    }
    setDraft(d);
    setDirty(false);
    return d;
  }
  async function action(kind: string) {
    if (busy || !draft) return;
    setBusy(kind);
    setError('');
    try {
      if (kind === 'connect') {
        const d = await save();
        sessionStorage.setItem(storageKey, d.id);
        window.location.assign((await linkedin.connect(d.id)).authorizationUrl);
      }
      if (kind === 'generate') {
        const d = await save();
        setDraft(await linkedin.generate(d));
      }
      if (kind === 'preview') {
        await save(true);
        setJob(null);
        setPreview(true);
        setApproved(false);
      }
      if (kind === 'publish' && approved && preview && !dirty) {
        const j = await linkedin.publish(draft);
        setJob(j);
        setDraft({ ...draft, status: j.status, jobId: j.id });
        if (!['queued', 'publishing'].includes(j.status)) {
          setApproved(false);
          setPreview(false);
          if (j.status === 'reconnect_required') setConnection(await linkedin.connection());
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  }
  async function chooseImage(file: File) {
    if (busy) return;
    setBusy('image');
    setError('');
    try {
      if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 2 * 1024 * 1024)
        throw new Error(
          'Choose a JPG or PNG image up to 2 MiB. Use a certificate screenshot instead of a PDF.',
        );
      const media = await linkedin.upload(
        file.name,
        file.type,
        await fileBase64(file),
        crypto.randomUUID(),
      );
      change({ media });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  }
  const locked = !!draft && lockedStates.includes(draft.status);
  const connectionResult = params.get('connection');
  return (
    <>
      <PageHeading
        eyebrow="YOUR WORK, YOUR WORDS"
        title="Share your achievement."
        description="Create a post in your own voice. You choose what to share and when to publish."
      />
      {isMock && (
        <p className="demo-notice">
          Development demo · LinkedIn connection and publishing are disabled. No real post will be
          made.
        </p>
      )}
      <Feedback
        error={error || draft?.error || job?.error || ''}
        success={connectionResult === 'connected' ? 'LinkedIn connected. Your draft is saved.' : ''}
      />
      {connectionResult === 'denied' && (
        <p role="status">Connection was cancelled. Your draft is still saved.</p>
      )}
      {connectionResult === 'connection_failed' && (
        <p role="status">
          Connection could not be completed. Your saved draft can be reopened below; try connecting
          again.
        </p>
      )}
      {loading ? (
        <Loading label="Opening your sharing draft…" />
      ) : !draft ? (
        <div className="card linkedin-empty">
          <h2>Choose something you’re proud of.</h2>
          <p>Open an activity or a saved skill and choose Share on LinkedIn.</p>
          {error && (
            <button className="btn secondary" onClick={() => window.location.reload()}>
              Retry opening sharing
            </button>
          )}
          <Link className="btn secondary" to="/dashboard/activities">
            View activities
          </Link>
          <Link className="btn secondary" to="/dashboard/skills">
            View skills
          </Link>
        </div>
      ) : (
        <div className="linkedin-layout">
          <section className="card linkedin-editor">
            <div className="linkedin-account">
              <Linkedin size={22} />
              <div>
                <strong>
                  {connection?.connected ? connection.name : 'Connect your LinkedIn account'}
                </strong>
                <p>
                  {connection?.connected
                    ? 'Posting to your personal LinkedIn profile.'
                    : 'You can prepare your draft before connecting.'}
                </p>
              </div>
              <button
                className="btn secondary small"
                disabled={!!busy || locked}
                onClick={() => void action('connect')}
              >
                {connection?.connected ? 'Reconnect' : 'Connect LinkedIn'}
              </button>
            </div>
            <div className="linkedin-source">
              <span className="eyebrow">{draft.source.category}</span>
              <h2>{draft.source.title}</h2>
              <p>{draft.source.organization}</p>
            </div>
            <fieldset disabled={!!busy || locked}>
              <div className="field">
                <label htmlFor="linkedin-tone">Tone</label>
                <select
                  id="linkedin-tone"
                  value={draft.tone}
                  onChange={(e) => change({ tone: e.target.value as ShareDraft['tone'] })}
                >
                  <option value="professional">Professional</option>
                  <option value="simple">Simple</option>
                  <option value="enthusiastic">Enthusiastic</option>
                </select>
              </div>
              <details className="linkedin-context">
                <summary>Choose profile context for your caption</summary>
                <p>Only the selected activity and the context you approve here are used.</p>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={!!draft.context.name}
                    onChange={(e) =>
                      change({
                        context: {
                          ...draft.context,
                          name: e.target.checked ? draft.availableContext.name : '',
                        },
                      })
                    }
                  />
                  Include my name{' '}
                  {draft.availableContext.name && `(${draft.availableContext.name})`}
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={!!draft.context.headline}
                    onChange={(e) =>
                      change({
                        context: {
                          ...draft.context,
                          headline: e.target.checked ? draft.availableContext.headline : '',
                        },
                      })
                    }
                  />
                  Include my headline{' '}
                  {draft.availableContext.headline && `(${draft.availableContext.headline})`}
                </label>
                <TextArea
                  label="Career interests or learning to mention (optional)"
                  value={draft.context.interests}
                  maxLength={300}
                  onChange={(e) =>
                    change({ context: { ...draft.context, interests: e.target.value } })
                  }
                />
              </details>
              <TextArea
                label="Your caption"
                rows={10}
                value={draft.caption}
                maxLength={2800}
                hint={`${draft.caption.length} / 2,800 characters · Review generated text for accuracy.`}
                onChange={(e) => change({ caption: e.target.value })}
              />
              <div className="linkedin-actions">
                <button
                  type="button"
                  className="btn secondary"
                  disabled={generating}
                  onClick={() => void action('generate')}
                >
                  {generating ? (
                    <>
                      <Loader2 className="spin" size={16} /> Generating…
                    </>
                  ) : draft.caption ? (
                    'Regenerate caption'
                  ) : (
                    'Generate caption'
                  )}
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => void action('preview')}
                  disabled={!draft.caption.trim()}
                >
                  Save & preview
                </button>
              </div>
              <div className="linkedin-media">
                <label className="linkedin-upload">
                  <ImagePlus size={18} />
                  <span>
                    {busy === 'image'
                      ? 'Uploading…'
                      : 'Select an achievement photo or certificate image'}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    disabled={!!busy || locked}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void chooseImage(file);
                      e.target.value = '';
                    }}
                  />
                </label>
                <p>
                  JPG or PNG, up to 2 MiB. New sharing uploads stay private in Ascend. Publishing
                  makes the selected image public on LinkedIn.
                </p>
                {draft.source.proofUrl && (
                  <button
                    className="btn secondary small"
                    onClick={() => {
                      const id = /^https:\/\/drive\.google\.com\/file\/d\/([\w-]+)/.exec(
                        draft.source.proofUrl || '',
                      )?.[1];
                      if (!id) {
                        setError('Upload an image through Ascend first.');
                        return;
                      }
                      setBusy('image');
                      linkedin
                        .media(id)
                        .then((media) => change({ media }))
                        .catch((e) => setError(e.message))
                        .finally(() => setBusy(''));
                    }}
                  >
                    Use activity’s uploaded image
                  </button>
                )}
                {draft.media && (
                  <>
                    <MediaPreview media={draft.media} />
                    <button className="btn secondary small" onClick={() => change({ media: null })}>
                      Remove image · use text only
                    </button>
                  </>
                )}
              </div>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={draft.includePortfolio}
                  disabled={!portfolio?.settings.published}
                  onChange={(e) => change({ includePortfolio: e.target.checked })}
                />
                Include my published Ascend portfolio link
              </label>
              {!portfolio?.settings.published && (
                <p className="linkedin-hint">
                  Publish your Ascend portfolio to include its public link.
                </p>
              )}
            </fieldset>
          </section>
          <section className="card linkedin-preview" aria-label="LinkedIn post preview">
            <span className="eyebrow">FINAL PREVIEW</span>
            <h2>{connection?.name || 'Your LinkedIn profile'}</h2>
            <p className="linkedin-public">Public · visible to anyone on LinkedIn</p>
            <div className="linkedin-caption">
              {draft.caption || 'Your caption will appear here.'}
            </div>
            {draft.includePortfolio && (
              <p className="linkedin-portfolio-url">
                {window.location.origin}/u/{portfolio?.student.collegeId}
              </p>
            )}
            {draft.media && <MediaPreview media={draft.media} onReady={setImageReady} />}
            {!locked && (
              <>
                <p className="linkedin-notice">
                  Publishing shares this exact caption and selected image publicly on your LinkedIn
                  account. Saving an Ascend record never publishes a post.
                </p>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={approved}
                    disabled={!preview || dirty || !!busy || (!!draft.media && !imageReady)}
                    onChange={(e) => setApproved(e.target.checked)}
                  />
                  I reviewed this preview and approve it for public posting.
                </label>
                <button
                  className="btn primary full"
                  disabled={
                    !!busy ||
                    !connection?.connected ||
                    !approved ||
                    !preview ||
                    dirty ||
                    generating ||
                    (!!draft.media && !imageReady)
                  }
                  onClick={() => void action('publish')}
                >
                  {busy === 'publish' ? (
                    <>
                      <Loader2 className="spin" size={16} /> Publishing…
                    </>
                  ) : (
                    <>
                      <Linkedin size={16} />
                      Publish to LinkedIn
                    </>
                  )}
                </button>
                {!preview && (
                  <p className="linkedin-hint">
                    Save & preview your latest changes before approving.
                  </p>
                )}
                {!connection?.connected && (
                  <p className="linkedin-hint">
                    Connect LinkedIn to enable publishing. Your draft will be preserved.
                  </p>
                )}
              </>
            )}
            {(job || locked) && (
              <div className="linkedin-result" role="status">
                <strong>{(job?.status || draft.status).replaceAll('_', ' ')}</strong>
                {job?.status === 'published' && (
                  <>
                    <p>LinkedIn confirmed your post.</p>
                    {job.postUrl ? (
                      <a
                        className="btn secondary"
                        href={job.postUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View LinkedIn post
                        <ExternalLink size={16} />
                      </a>
                    ) : (
                      <p>
                        Post ID: {job.postId}. LinkedIn did not return a public link; find the post
                        on your profile.
                      </p>
                    )}
                  </>
                )}
                {['queued', 'publishing'].includes(job?.status || draft.status) && (
                  <p>
                    We’re processing your approved post. You can leave and reopen this draft to
                    check its status.
                  </p>
                )}
                {(job?.status || draft.status) === 'publication_unknown' && (
                  <p>
                    Check your LinkedIn profile before taking further action. Automatic resubmission
                    is blocked to prevent a duplicate post.
                  </p>
                )}
                {(job?.status || draft.status) === 'failed' && (
                  <p>
                    Your activity and caption are saved. Make any changes, save a new preview, and
                    approve it again to retry.
                  </p>
                )}
                {(job?.status || draft.status) === 'reconnect_required' && (
                  <p>
                    Reconnect your LinkedIn account, then save and approve a new preview. Your
                    caption is still saved.
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
