import { getSession, isMock } from './api';
import type { LinkedInConnection, ShareDraft, ShareJob, ShareMedia } from '../types/linkedin';
export async function sharingRequest<T>(action: string, body: unknown = {}): Promise<T> {
  if (isMock)
    throw new Error(
      'LinkedIn sharing is unavailable for device-only demo records. Sign in on the connected Ascend site to share.',
    );
  const session = getSession();
  if (!session) throw new Error('Sign in to Ascend to share your achievement.');
  let response: Response;
  try {
    response = await fetch(`/api/linkedin/${action}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`,
        'X-Ascend-Student': session.collegeId,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45000),
    });
  } catch {
    throw new Error('Could not reach sharing. Your activity is still saved. Please retry.');
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      'LinkedIn sharing is not configured on this server yet. Your activity is still saved.',
    );
  }
  if (!response.ok || !result.success)
    throw new Error(result.message || 'Sharing is unavailable. Please retry.');
  return result.data;
}
export const linkedin = {
  connection: () => sharingRequest<LinkedInConnection>('connection'),
  disconnect: () => sharingRequest('disconnect'),
  connect: (draftId = '') =>
    sharingRequest<{ authorizationUrl: string }>('oauth/start', { draftId }),
  create: (sourceKind: string, sourceId: string, requestId: string) =>
    sharingRequest<ShareDraft>('draft/create', { sourceKind, sourceId, requestId }),
  read: (id: string) => sharingRequest<ShareDraft>('draft/read', { id }),
  edit: (draft: ShareDraft) =>
    sharingRequest<ShareDraft>('draft/edit', {
      id: draft.id,
      revision: draft.revision,
      caption: draft.caption,
      tone: draft.tone,
      includePortfolio: draft.includePortfolio,
      mediaId: draft.media?.id || '',
      useName: !!draft.context.name,
      useHeadline: !!draft.context.headline,
      interests: draft.context.interests,
    }),
  generate: (d: ShareDraft) =>
    sharingRequest<ShareDraft>('draft/generate', { id: d.id, revision: d.revision }),
  publish: (d: ShareDraft) =>
    sharingRequest<ShareJob>('draft/publish', { id: d.id, revision: d.revision, approved: true }),
  job: (id: string) => sharingRequest<ShareJob>('job', { id }),
  media: (fileId: string) => sharingRequest<ShareMedia>('media/read', { fileId }),
  upload: (fileName: string, mimeType: string, base64: string, uploadId: string) =>
    sharingRequest<ShareMedia>('media/upload', { fileName, mimeType, base64, uploadId }),
};
