export type ShareStatus =
  | 'draft'
  | 'generating'
  | 'ready'
  | 'queued'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'reconnect_required'
  | 'publication_unknown';
export interface LinkedInConnection {
  connected: boolean;
  name: string;
  expiresAt: string;
  status: string;
}
export interface ShareMedia {
  id: string;
  hash: string;
  name: string;
  mimeType: string;
  base64?: string;
}
export interface ShareDraft {
  id: string;
  revision: number;
  sourceKind: 'activity' | 'skill';
  sourceId: string;
  source: {
    title: string;
    category: string;
    description: string;
    organization: string;
    date: string;
    proofUrl?: string;
  };
  status: ShareStatus;
  caption: string;
  tone: 'professional' | 'simple' | 'enthusiastic';
  media: ShareMedia | null;
  includePortfolio: boolean;
  context: { name: string; headline: string; interests: string };
  availableContext: { name: string; headline: string };
  error?: string;
  jobId?: string;
}
export interface ShareJob {
  id: string;
  draftId: string;
  status: ShareStatus;
  error: string;
  postId: string;
  postUrl: string;
}
