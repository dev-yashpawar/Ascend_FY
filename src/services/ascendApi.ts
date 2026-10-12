import {
  emptyPortfolio,
  type Portfolio,
  type Student,
  type Skill,
  type ProfessionalLinks,
  type PortfolioSettings,
  type Session,
  type RecordKind,
  type StudentRecord,
} from '../types';
import { demoPortfolios } from '../mock/data';
import { recordId, validateIdentity } from '../utils/profile';
// Student pilot builds always use the live API. Fixtures are explicitly opt-in in development.
export const isMock = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_DATA === 'true';
const DB_KEY = 'ascend:mock:v1';
const SESSION_KEY = 'ascend:session:v1';
type Response<T> = import('../types').APIResponse<T>;
export function getSession(): Session | null {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}
export function setSession(s: Session | null) {
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else localStorage.removeItem(SESSION_KEY);
}
function readDB(): Record<string, Portfolio> {
  const raw = localStorage.getItem(DB_KEY);
  return raw
    ? JSON.parse(raw)
    : Object.fromEntries(demoPortfolios().map((p) => [p.student.collegeId, p]));
}
function publicData(p: Portfolio): Portfolio {
  const result = structuredClone(p);
  result.student.collegeEmail = '';
  if (result.links.showEmail !== true) result.links.publicEmail = '';
  if (result.links.showPhone !== true) result.links.phone = '';
  result.experiences.forEach((r) => {
    if (!r.isPublicProof) r.proofUrl = '';
  });
  result.activities.forEach((r) => {
    if (!r.isPublicProof) r.proofUrl = '';
  });
  return result;
}
async function mock<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  await new Promise((r) => setTimeout(r, 250));
  const db = readDB();
  const id = String(payload.collegeId || '');
  let p = db[id];
  if (action === 'getStudent') return { exists: !!p } as T;
  if (action === 'getPublishedPortfolios')
    return Object.values(db)
      .filter((p) => p.settings.published)
      .map(publicData) as T;
  if (action === 'startSession') {
    const email = String(payload.collegeEmail).toLowerCase();
    const error = validateIdentity(id, email);
    if (error) throw new Error(error);
    if (p && p.student.collegeEmail.toLowerCase() !== email)
      throw new Error(
        'This college ID is already registered. Use the same email you registered with.',
      );
    const exists = !!p;
    p ||= emptyPortfolio(id, email);
    db[id] = p;
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    return { exists, session: { collegeId: id, token: 'device-local-demo' }, portfolio: p } as T;
  }
  if (!p) throw new Error('Portfolio not found. Start with your college identity.');
  const owner = getSession()?.collegeId === id && payload.token === 'device-local-demo';
  if (action === 'getPortfolio') {
    if (!p.settings.published && !owner)
      throw new Error('This portfolio has not been published yet.');
    return (owner && !payload.publicOnly ? p : publicData(p)) as T;
  }
  if (!owner) throw new Error('Your editing session has ended. Enter your college identity again.');
  if (action === 'saveStudent')
    p.student = {
      ...p.student,
      ...(payload.student as Student),
      collegeId: id,
      collegeEmail: p.student.collegeEmail,
      updatedAt: new Date().toISOString(),
    };
  if (action === 'saveSkills') p.skills = payload.skills as Skill[];
  if (action === 'saveLinks') p.links = payload.links as ProfessionalLinks;
  if (action === 'saveSettings')
    p.settings = {
      ...(payload.settings as PortfolioSettings),
      updatedAt: new Date().toISOString(),
    };
  const match = action.match(/^(add|update|delete)(Project|Experience|Activity)$/);
  if (match) {
    const key =
      match[2] === 'Project'
        ? 'projects'
        : match[2] === 'Experience'
          ? 'experiences'
          : 'activities';
    const list = p[key] as StudentRecord[];
    const item = payload.record as StudentRecord;
    const rid = String(payload.recordId || recordId(item));
    const index = list.findIndex((r) => recordId(r) === rid);
    if (match[1] !== 'delete') {
      if ('startDate' in item && !item.startDate) throw new Error('Start date is required.');
      if ('activityDate' in item && !item.activityDate)
        throw new Error('Activity date is required.');
    }
    if (match[1] === 'delete') {
      if (index >= 0) list.splice(index, 1);
    } else {
      const previous = index >= 0 ? list[index] : null;
      const unchanged =
        previous &&
        Object.keys(item)
          .filter((k) => !['verificationStatus', 'createdAt', 'updatedAt'].includes(k))
          .every(
            (k) =>
              JSON.stringify(previous[k as keyof StudentRecord]) ===
              JSON.stringify(item[k as keyof StudentRecord]),
          );
      const saved = {
        ...item,
        collegeId: id,
        verificationStatus: unchanged ? previous.verificationStatus : 'self_reported',
        updatedAt: new Date().toISOString(),
      } as StudentRecord;
      if (index >= 0) list[index] = saved;
      else list.push(saved);
    }
  }
  db[id] = p;
  localStorage.setItem(DB_KEY, JSON.stringify(db));
  return structuredClone(p) as T;
}
async function request<T>(
  action: string,
  payload: Record<string, unknown> = {},
  read = false,
): Promise<T> {
  const session = getSession();
  const data = {
    ...payload,
    ...(session && session.collegeId === payload.collegeId ? { token: session.token } : {}),
  };
  if (isMock) return mock<T>(action, data);
  const endpoint = import.meta.env.VITE_ASCEND_API_URL;
  if (!endpoint || endpoint.includes('PASTE_APPS_SCRIPT'))
    throw new Error(
      'Google Sheets is not connected. Deploy backend/Code.gs and set VITE_ASCEND_API_URL to its Web App /exec URL.',
    );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), action === 'uploadFile' ? 60000 : 30000);
  try {
    const url = new URL(endpoint);
    url.searchParams.set('action', action);
    if (read) Object.entries(data).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    const response = await fetch(
      url.href,
      read
        ? { signal: controller.signal, redirect: 'follow', cache: 'no-store' }
        : {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action, ...data }),
            signal: controller.signal,
            redirect: 'follow',
          },
    );
    if (!response.ok)
      throw new Error(
        'The service is temporarily unavailable. Your edits are still here; please retry.',
      );
    let result: Response<T>;
    try {
      result = (await response.json()) as Response<T>;
    } catch {
      throw new Error(
        'The backend returned an unreadable response. Check Apps Script deployment access and retry.',
      );
    }
    if (!result || typeof result.success !== 'boolean')
      throw new Error('The backend returned an invalid response. Please retry.');
    if (!result.success) throw new Error(result.message);
    return result.data;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError')
      throw new Error('The request timed out. Check your connection and retry.');
    if (e instanceof TypeError)
      throw new Error('Could not connect to Google Sheets. Check your connection and retry.');
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}
function normalizePortfolio(p: Portfolio & { experience?: Portfolio['experiences'] }): Portfolio {
  return {
    ...p,
    experiences: (p.experiences || p.experience || []).map((r) => ({
      ...r,
      proofUrl: r.proofUrl || '',
    })),
    activities: p.activities.map((r) => ({ ...r, proofUrl: r.proofUrl || '' })),
  };
}
const UPLOAD_API_VERSION = '2026-10-09.uploads.v2';
async function requireUploadBackend() {
  try {
    const info = await request<{ version: string; schemaReady: boolean }>(
      'getUploadCapabilities',
      {},
      true,
    );
    if (info.version !== UPLOAD_API_VERSION || !info.schemaReady) throw new Error('outdated');
  } catch {
    throw new Error(
      'The upload backend is outdated or not ready. Run setupAscend, then Deploy > Manage deployments > Edit > Version > New version > Deploy.',
    );
  }
}
export const api = {
  uploadFile: (payload: import('../types').UploadRequest) => {
    if (isMock)
      return Promise.reject(
        new Error('Drive uploads require live API mode. Connect the Apps Script backend.'),
      );
    return requireUploadBackend()
      .then(() => request<import('../types').UploadedFile>('uploadFile', { ...payload }))
      .then((result) => {
        const url =
          payload.category === 'profile' || payload.category === 'projects'
            ? result.mediaUrl
            : result.viewUrl;
        if (!result.fileId || !/^https:\/\//.test(url || ''))
          throw new Error(
            'The upload service did not return a persistent file URL. Retry the upload.',
          );
        return result;
      });
  },
  getStudent: (collegeId: string) =>
    request<{ exists: boolean }>('getStudent', { collegeId }, true),
  startSession: (collegeId: string, collegeEmail: string) =>
    request<{ exists: boolean; session: Session; portfolio: Portfolio }>('startSession', {
      collegeId,
      collegeEmail,
    }),
  getPortfolio: (collegeId: string) =>
    request<Portfolio>('getPortfolio', { collegeId }, true).then(normalizePortfolio),
  getPublicPortfolio: (collegeId: string) =>
    request<Portfolio>('getPortfolio', { collegeId, publicOnly: true }, true).then(
      normalizePortfolio,
    ),
  getPublishedPortfolios: () =>
    request<Portfolio[]>('getPublishedPortfolios', {}, true).then((items) =>
      items.map(normalizePortfolio),
    ),
  saveStudent: (student: Student) =>
    request<Portfolio>('saveStudent', { collegeId: student.collegeId, student }),
  saveSkills: (collegeId: string, skills: Skill[]) =>
    request<Portfolio>('saveSkills', { collegeId, skills }),
  saveLinks: async (links: ProfessionalLinks) => {
    if (!isMock && ['publicEmail', 'phone', 'showEmail', 'showPhone'].some((k) => k in links)) {
      let ready = false;
      try {
        ready = (await request<{ schemaReady: boolean }>('getContactCapabilities', {}, true))
          .schemaReady;
      } catch {
        /* Old deployments do not know this operation. */
      }
      if (!ready)
        throw new Error(
          'Public contact settings need the updated backend. Run setupAscend and deploy a New version.',
        );
    }
    return request<Portfolio>('saveLinks', { collegeId: links.collegeId, links });
  },
  saveSettings: (settings: PortfolioSettings) =>
    request<Portfolio>('saveSettings', { collegeId: settings.collegeId, settings }),
  saveRecord: async (kind: RecordKind, record: StudentRecord, edit: boolean) => {
    if (!isMock && 'proofUrl' in record && (record.proofUrl || record.isPublicProof))
      await requireUploadBackend();
    return request<Portfolio>(
      `${edit ? 'update' : 'add'}${kind[0].toUpperCase() + kind.slice(1)}`,
      {
        collegeId: record.collegeId,
        record,
      },
    );
  },
  deleteRecord: (kind: RecordKind, collegeId: string, id: string) =>
    request<Portfolio>(`delete${kind[0].toUpperCase() + kind.slice(1)}`, {
      collegeId,
      recordId: id,
    }),
};
