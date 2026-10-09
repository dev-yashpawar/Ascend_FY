import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { emptyPortfolio } from '../types';
const memory = new Map<string, string>();
beforeEach(() => {
  vi.resetModules();
  memory.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => memory.get(k) || null,
    setItem: (k: string, v: string) => memory.set(k, v),
    removeItem: (k: string) => memory.delete(k),
  });
  vi.stubEnv('VITE_USE_MOCK_DATA', 'false');
  vi.stubEnv('VITE_ASCEND_API_URL', 'https://script.google.com/macros/s/test/exec');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it('uses simple text/plain POST and a session token without Google credentials', async () => {
  const { api, setSession } = await import('./api');
  setSession({ collegeId: 'KBTUG23999', token: 'test-edit-token' });
  const portfolio = emptyPortfolio('KBTUG23999', 'student@kbtcoe.org');
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: { schemaReady: true } }) })
    .mockResolvedValue({ ok: true, json: async () => ({ success: true, data: portfolio }) });
  vi.stubGlobal('fetch', fetchMock);
  await api.saveLinks({ ...portfolio.links, linkedin: 'https://linkedin.com/in/test' });
  const [url, options] = fetchMock.mock.calls[1];
  expect(url).toContain('action=saveLinks');
  expect(options.headers['Content-Type']).toBe('text/plain;charset=utf-8');
  expect(options.redirect).toBe('follow');
  expect(JSON.parse(options.body)).toMatchObject({
    action: 'saveLinks',
    collegeId: 'KBTUG23999',
    token: 'test-edit-token',
  });
});
it('returns server validation errors rather than reporting false success', async () => {
  const { api } = await import('./api');
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, message: 'Start date is required.' }),
    }),
  );
  await expect(api.getPortfolio('KBTUG23999')).rejects.toThrow('Start date is required.');
});
it('reports temporary connection failures and missing configuration', async () => {
  const { api } = await import('./api');
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
  await expect(api.getStudent('KBTUG23999')).rejects.toThrow('Could not connect to Google Sheets');
  vi.stubEnv('VITE_ASCEND_API_URL', '');
  await expect(api.getStudent('KBTUG23999')).rejects.toThrow('not connected');
});
it('persists mock students and records across API reloads and keeps public emails private', async () => {
  vi.stubEnv('VITE_USE_MOCK_DATA', 'true');
  let mod = await import('./api');
  const result = await mod.api.startSession('KBTUG23999', 'Student@kbtcoe.org');
  mod.setSession(result.session);
  const student = {
    ...result.portfolio.student,
    fullName: 'Test Student',
    branch: 'Civil Engineering',
    year: '3rd Year',
  };
  await mod.api.saveStudent(student);
  await mod.api.saveSettings({ ...result.portfolio.settings, published: true });
  vi.resetModules();
  mod = await import('./api');
  expect((await mod.api.getPortfolio('KBTUG23999')).student.fullName).toBe('Test Student');
  mod.setSession(null);
  expect((await mod.api.getPortfolio('KBTUG23999')).student.collegeEmail).toBe('');
  expect(
    (await mod.api.getPublishedPortfolios()).find((p) => p.student.collegeId === 'KBTUG23999')
      ?.student.collegeEmail,
  ).toBe('');
});
it('keeps unpublished mock portfolios out of public views', async () => {
  vi.stubEnv('VITE_USE_MOCK_DATA', 'true');
  const mod = await import('./api');
  await mod.api.startSession('KBTUG23999', 'student@kbtcoe.org');
  await expect(mod.api.getPortfolio('KBTUG23999')).rejects.toThrow('not been published');
  expect(
    (await mod.api.getPublishedPortfolios()).some((p) => p.student.collegeId === 'KBTUG23999'),
  ).toBe(false);
});

it('does not silently fall back when the deployment URL is still a placeholder', async () => {
  const { api } = await import('./api');
  vi.stubEnv('VITE_ASCEND_API_URL', 'PASTE_APPS_SCRIPT_WEB_APP_URL_HERE');
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  await expect(api.startSession('KBTUG23513', 'Kbtug23513@kbtcoe.org')).rejects.toThrow(
    'not connected',
  );
  expect(fetchMock).not.toHaveBeenCalled();
});
it('uploads transient base64 through text/plain with a stable retry ID and editor token', async () => {
  const { api, setSession } = await import('./api');
  setSession({ collegeId: 'KBTUG23513', token: 'edit-token' });
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { version: '2026-10-09.uploads.v2', schemaReady: true },
      }),
    })
    .mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          fileId: 'file1',
          viewUrl: 'https://drive.google.com/file/d/file1/view',
          fileName: 'certificate.pdf',
          mimeType: 'application/pdf',
          public: false,
          mediaUrl: '',
        },
      }),
    });
  vi.stubGlobal('fetch', fetchMock);
  await api.uploadFile({
    collegeId: 'KBTUG23513',
    category: 'certificates',
    fileName: 'certificate.pdf',
    mimeType: 'application/pdf',
    base64: 'JVBERi0=',
    uploadId: 'retry-id',
  });
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({
    action: 'uploadFile',
    uploadId: 'retry-id',
    token: 'edit-token',
    category: 'certificates',
  });
  expect(fetchMock.mock.calls[1][1].headers['Content-Type']).toBe('text/plain;charset=utf-8');
});
it('requests public redaction even when an editing session exists and accepts singular experience', async () => {
  const { api, setSession } = await import('./api');
  setSession({ collegeId: 'KBTUG23513', token: 'edit-token' });
  const { experiences, ...p } = emptyPortfolio('KBTUG23513', '');
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, data: { ...p, experience: experiences } }),
  });
  vi.stubGlobal('fetch', fetchMock);
  expect((await api.getPublicPortfolio('KBTUG23513')).experiences).toEqual([]);
  expect(fetchMock.mock.calls[0][0]).toContain('publicOnly=true');
});
it('blocks uploads before POST when the deployment does not support the current schema', async () => {
  const { api, setSession } = await import('./api');
  setSession({ collegeId: 'KBTUG23513', token: 'edit-token' });
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ success: false, message: 'Unknown read operation.' }),
  });
  vi.stubGlobal('fetch', fetchMock);
  await expect(
    api.uploadFile({
      collegeId: 'KBTUG23513',
      category: 'profile',
      fileName: 'profile.jpg',
      mimeType: 'image/jpeg',
      base64: '/9j/',
      uploadId: 'retry-id',
    }),
  ).rejects.toThrow('New version > Deploy');
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toContain('getUploadCapabilities');
});
