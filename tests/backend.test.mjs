import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import crypto from 'node:crypto';
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
    this.data.push(row.map((v) => (typeof v === 'string' && v.startsWith("'") ? v.slice(1) : v)));
  }
  getDataRange() {
    return { getValues: () => this.data.map((r) => [...r]) };
  }
  getRange(row, col, count, width) {
    return {
      getValues: () =>
        this.data.slice(row - 1, row - 1 + count).map((r) => r.slice(col - 1, col - 1 + width)),
      setFontWeight: () => {},
      setNumberFormat() {
        return this;
      },
      setValues: (values) => {
        values.forEach((r, i) => {
          const cells = r.map((v) => (typeof v === 'string' && v.startsWith("'") ? v.slice(1) : v));
          const target = this.data[row - 1 + i] || [];
          cells.forEach((v, j) => {
            target[col - 1 + j] = v;
          });
          this.data[row - 1 + i] = target;
        });
      },
    };
  }
  deleteRow(row) {
    this.data.splice(row - 1, 1);
  }
}
function harness() {
  const sheets = {};
  const filesById = new Map();
  class Folder {
    constructor(name) {
      this.name = name;
      this.id = crypto.randomUUID();
      this.children = {};
      this.files = [];
      this.access = 'private';
    }
    getId() {
      return this.id;
    }
    getSharingAccess() {
      return this.access;
    }
    getFoldersByName(name) {
      return iterator(this.children[name] ? [this.children[name]] : []);
    }
    createFolder(name) {
      return (this.children[name] = new Folder(name));
    }
    getFilesByName(name) {
      return iterator(this.files.filter((f) => f.name === name));
    }
    createFile(blob) {
      const parent = this;
      const f = {
        name: blob.name,
        id: crypto.randomUUID(),
        access: 'private',
        getId() {
          return this.id;
        },
        getResourceKey() {
          return '';
        },
        getParents() {
          return iterator([parent]);
        },
        getUrl() {
          return 'https://drive.google.com/file/d/' + this.id + '/view';
        },
        setSharing(access) {
          this.access = access;
        },
      };
      filesById.set(f.id, f);
      this.files.push(f);
      return f;
    }
  }
  function iterator(items) {
    let i = 0;
    return { hasNext: () => i < items.length, next: () => items[i++] };
  }
  const root = new Folder('Student Uploads');
  const properties = { SPREADSHEET_ID: 'test' };
  const ss = { getSheetByName: (n) => sheets[n], insertSheet: (n) => (sheets[n] = new Sheet()) };
  const context = vm.createContext({
    DriveApp: {
      getFolderById: () => root,
      getFileById: (id) => {
        if (!filesById.has(id)) throw new Error('File not found');
        return filesById.get(id);
      },
      Access: { PRIVATE: 'private', ANYONE_WITH_LINK: 'public' },
      Permission: { VIEW: 'view' },
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => properties[k],
        setProperty: (k, v) => (properties[k] = v),
      }),
    },
    SpreadsheetApp: { openById: () => ss, flush: () => {} },
    Utilities: {
      base64Decode: (v) => [...Buffer.from(v, 'base64')],
      newBlob: (bytes, mime, name) => ({ bytes, mime, name }),
      getUuid: () => crypto.randomUUID(),
      computeDigest: (_, v) => crypto.createHash('sha256').update(v).digest(),
      base64Encode: (v) => Buffer.from(v).toString('base64'),
      DigestAlgorithm: { SHA_256: 'sha256' },
    },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    ContentService: {
      createTextOutput: (v) => ({ setMimeType: () => JSON.parse(v) }),
      MimeType: { JSON: 'json' },
    },
  });
  vm.runInContext(fs.readFileSync('backend/Code.gs', 'utf8'), context);
  context.setupAscend();
  const post = (body) => context.doPost({ postData: { contents: JSON.stringify(body) } });
  const get = (body) => context.doGet({ parameter: body });
  const start = (id = 'KBTUG23999') =>
    post({ action: 'startSession', collegeId: id, collegeEmail: id.toLowerCase() + '@kbtcoe.org' })
      .data;
  return { context, sheets, post, get, start, root };
}
test('sets up all seven exact schemas and normalizes case', () => {
  const h = harness();
  assert.equal(Object.keys(h.sheets).length, 7);
  const r = h.post({
    action: 'startSession',
    collegeId: 'kbtug23513',
    collegeEmail: 'Kbtug23513@kbtcoe.org',
  });
  assert.equal(r.success, true);
  assert.equal(r.data.portfolio.student.collegeId, 'KBTUG23513');
  assert.equal(r.data.portfolio.student.collegeEmail, 'kbtug23513@kbtcoe.org');
});
test('rejects invalid identities and wrong returning email', () => {
  const h = harness();
  assert.equal(
    h.post({ action: 'startSession', collegeId: 'KBTUG23513', collegeEmail: 'x@gmail.com' })
      .success,
    false,
  );
  h.start();
  assert.equal(
    h.post({ action: 'startSession', collegeId: 'KBTUG23999', collegeEmail: 'someone@kbtcoe.org' })
      .success,
    false,
  );
});
test('keeps drafts private, requires edit tokens and redacts public email', () => {
  const h = harness();
  const r = h.start();
  const id = r.session.collegeId;
  assert.equal(h.get({ action: 'getPortfolio', collegeId: id }).success, false);
  assert.equal(h.post({ action: 'saveStudent', collegeId: id, student: {} }).success, false);
  const body = { collegeId: id, token: r.session.token };
  const student = {
    ...r.portfolio.student,
    fullName: 'Test Student',
    branch: 'Civil Engineering',
    year: '3rd Year',
  };
  assert.equal(h.post({ ...body, action: 'saveStudent', student }).success, true);
  assert.equal(
    h.post({
      ...body,
      action: 'saveSettings',
      settings: { ...r.portfolio.settings, published: true },
    }).success,
    true,
  );
  const p = h.get({ action: 'getPortfolio', collegeId: id });
  assert.equal(p.success, true);
  assert.equal(p.data.student.collegeEmail, '');
  assert.equal(
    h.get({ action: 'getPortfolio', ...body }).data.student.collegeEmail,
    student.collegeEmail,
  );
  assert.equal(h.get({ action: 'getPublishedPortfolios' }).data[0].student.collegeEmail, '');
});
test('writes structured records, idempotently retries, and prevents forged verification', () => {
  const h = harness();
  const r = h.start();
  const body = { collegeId: r.session.collegeId, token: r.session.token };
  const record = {
    projectId: crypto.randomUUID(),
    title: '=SUM(1,2)',
    description: 'A useful tool',
    techStack: ['React', 'React'],
    githubUrl: '',
    liveUrl: '',
    imageUrl: '',
    verificationStatus: 'verified',
  };
  let saved = h.post({ ...body, action: 'addProject', record });
  assert.equal(saved.success, true);
  assert.equal(saved.data.projects[0].verificationStatus, 'self_reported');
  assert.equal(saved.data.projects[0].title, '=SUM(1,2)');
  assert.deepEqual(saved.data.projects[0].techStack, ['React']);
  saved = h.post({ ...body, action: 'addProject', record });
  assert.equal(saved.data.projects.length, 1);
  assert.equal(h.context.cell_(' =IMPORTXML("https://bad")'), '\' =IMPORTXML("https://bad")');
  const row = h.sheets.Projects.data[1];
  row[8] = 'verified';
  saved = h.post({ ...body, action: 'updateProject', record });
  assert.equal(saved.data.projects[0].verificationStatus, 'verified');
  saved = h.post({
    ...body,
    action: 'updateProject',
    record: { ...record, description: 'Changed evidence' },
  });
  assert.equal(saved.data.projects[0].verificationStatus, 'self_reported');
  assert.equal(
    h.post({ ...body, action: 'deleteProject', recordId: record.projectId }).data.projects.length,
    0,
  );
});
test('prevents cross-student record overwrites and deletion', () => {
  const h = harness();
  const a = h.start();
  const b = h.start('KBTUG23888');
  const record = {
    activityId: crypto.randomUUID(),
    title: 'Workshop',
    category: 'Workshop',
    organization: 'College',
    activityDate: '2026-10-08',
    description: '',
    proofUrl: '',
  };
  const bodyA = { collegeId: a.session.collegeId, token: a.session.token };
  const bodyB = { collegeId: b.session.collegeId, token: b.session.token };
  assert.equal(h.post({ ...bodyA, action: 'addActivity', record }).success, true);
  assert.equal(h.post({ ...bodyB, action: 'updateActivity', record }).success, false);
  assert.equal(
    h.post({ ...bodyB, action: 'deleteActivity', recordId: record.activityId }).success,
    false,
  );
});
test('validates date chronology, URL protocols, categories and section order', () => {
  const h = harness();
  const r = h.start();
  const body = { collegeId: r.session.collegeId, token: r.session.token };
  assert.equal(
    h.post({ ...body, action: 'saveLinks', links: { github: 'javascript:alert(1)' } }).success,
    false,
  );
  assert.equal(
    h.post({
      ...body,
      action: 'saveSettings',
      settings: { ...r.portfolio.settings, sectionOrder: ['About'] },
    }).success,
    false,
  );
  assert.equal(
    h.post({
      ...body,
      action: 'addExperience',
      record: {
        organization: 'Org',
        role: 'Intern',
        startDate: '2026-10',
        endDate: '2026-01',
        currentlyWorking: false,
      },
    }).success,
    false,
  );
  assert.equal(
    h.post({
      ...body,
      action: 'addActivity',
      record: { title: 'Bad date', category: 'Workshop', activityDate: '2026-02-31' },
    }).success,
    false,
  );
});
test('round trips experience, activities, links, settings, and ordered skills', () => {
  const h = harness();
  const r = h.start();
  const body = { collegeId: r.session.collegeId, token: r.session.token };
  assert.equal(
    h.post({
      ...body,
      action: 'saveSkills',
      skills: [{ skillName: 'CAD' }, { skillName: 'Leadership' }],
    }).data.skills[1].sortOrder,
    1,
  );
  const exp = h.post({
    ...body,
    action: 'addExperience',
    record: {
      organization: 'Lab',
      role: 'Student',
      startDate: '2026-01',
      endDate: '',
      currentlyWorking: true,
      description: 'Research',
      proofUrl: 'https://example.org/proof',
    },
  });
  assert.equal(exp.data.experiences[0].currentlyWorking, true);
  const activity = h.post({
    ...body,
    action: 'addActivity',
    record: {
      title: 'Certificate',
      category: 'Certification',
      activityDate: '2026-10-08',
      organization: 'College',
      description: 'Learned',
      proofUrl: '',
    },
  });
  assert.equal(activity.data.activities[0].category, 'Certification');
  const link = h.post({
    ...body,
    action: 'saveLinks',
    links: { linkedin: 'https://linkedin.com/in/test' },
  });
  assert.equal(link.data.links.linkedin, 'https://linkedin.com/in/test');
  const s = h.post({
    ...body,
    action: 'saveSettings',
    settings: {
      ...r.portfolio.settings,
      theme: 'Developer',
      font: 'DM Sans',
      hiddenSections: ['Contact'],
      sectionOrder: [...r.portfolio.settings.sectionOrder].reverse(),
    },
  });
  assert.equal(s.data.settings.theme, 'Developer');
  assert.equal(s.data.settings.sectionOrder[0], 'Contact');
  assert.equal(
    h.post({ ...body, action: 'deleteExperience', recordId: exp.data.experiences[0].experienceId })
      .data.experiences.length,
    0,
  );
  assert.equal(
    h.post({ ...body, action: 'deleteActivity', recordId: activity.data.activities[0].activityId })
      .data.activities.length,
    0,
  );
});

test('Drive upload creates exact folders, keeps proof private, makes media public and reuses retries', () => {
  const h = harness();
  const r = h.start('KBTUG23513');
  const body = {
    action: 'uploadFile',
    collegeId: r.session.collegeId,
    token: r.session.token,
    category: 'certificates',
    fileName: 'aws-certificate.pdf',
    mimeType: 'application/pdf',
    base64: Buffer.from('%PDF-1.4 test').toString('base64'),
    uploadId: crypto.randomUUID(),
  };
  assert.equal(h.post({ ...body, token: '' }).success, false);
  const first = h.post(body);
  assert.equal(first.success, true, first.message);
  assert.equal(first.data.public, false);
  assert.equal(first.data.mediaUrl, '');
  const studentFolder = h.root.children.KBTUG23513;
  assert.deepEqual(Object.keys(studentFolder.children), [
    'profile',
    'projects',
    'certificates',
    'internships',
    'achievements',
    'other',
  ]);
  assert.equal(studentFolder.children.certificates.files[0].access, 'private');
  assert.equal(h.post(body).data.fileId, first.data.fileId);
  assert.equal(studentFolder.children.certificates.files.length, 1);
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
  const image = h.post({
    ...body,
    category: 'projects',
    fileName: 'project.png',
    mimeType: 'image/png',
    base64: png.toString('base64'),
    uploadId: crypto.randomUUID(),
  });
  assert.equal(image.success, true);
  assert.equal(image.data.public, true);
  assert.equal(studentFolder.children.projects.files[0].access, 'public');
  assert.match(image.data.mediaUrl, /thumbnail/);
  assert.equal(h.post({ ...body, category: '../secret' }).success, false);
  assert.equal(h.post({ ...body, fileName: 'bad.exe' }).success, false);
  assert.equal(
    h.post({ ...body, base64: Buffer.from('not PDF').toString('base64') }).success,
    false,
  );
  assert.equal(h.post({ ...body, category: 'profile' }).success, false);
  const large = Buffer.alloc(5 * 1024 * 1024 + 1);
  large.write('%PDF-');
  assert.equal(h.post({ ...body, base64: large.toString('base64') }).success, false);
  h.root.access = 'public';
  assert.equal(h.post(body).success, false);
});
test('public aggregates omit proof URLs, editable reads retain them, and student saves never duplicate rows', () => {
  const h = harness();
  const r = h.start('KBTUG23513');
  const body = { collegeId: r.session.collegeId, token: r.session.token };
  const student = {
    ...r.portfolio.student,
    fullName: 'Test Student',
    branch: 'IT',
    year: '3rd Year',
  };
  h.post({ ...body, action: 'saveStudent', student });
  h.post({ ...body, action: 'saveStudent', student });
  assert.equal(h.sheets.Students.data.length, 2);
  const proofUrl = 'https://example.org/private/proof';
  h.post({
    ...body,
    action: 'addActivity',
    record: {
      title: 'Certificate',
      category: 'Certification',
      activityDate: '2026-10-09',
      proofUrl,
    },
  });
  h.post({
    ...body,
    action: 'addExperience',
    record: {
      organization: 'Lab',
      role: 'Intern',
      startDate: '2026-01',
      currentlyWorking: true,
      proofUrl,
    },
  });
  h.post({
    ...body,
    action: 'saveSettings',
    settings: { ...r.portfolio.settings, published: true },
  });
  const publicData = h.get({ action: 'getPortfolio', collegeId: body.collegeId }).data;
  assert.equal('proofUrl' in publicData.activities[0], false);
  assert.equal('proofUrl' in publicData.experiences[0], false);
  assert.equal(h.get({ action: 'getPortfolio', ...body }).data.activities[0].proofUrl, proofUrl);
  assert.equal(
    'proofUrl' in h.get({ action: 'getPortfolio', ...body, publicOnly: 'true' }).data.activities[0],
    false,
  );
  assert.equal(
    JSON.stringify(h.get({ action: 'getPublishedPortfolios' })).includes(proofUrl),
    false,
  );
  h.context.setupAscend();
  assert.equal(h.sheets.Students.data.length, 2);
  assert.deepEqual(Object.keys(h.sheets), [
    'Students',
    'Skills',
    'Projects',
    'Experience',
    'Activities',
    'Links',
    'PortfolioSettings',
  ]);
});

test('migrates legacy proof columns in place with private defaults and preserves existing rows', () => {
  const h = harness();
  for (const name of ['Activities', 'Experience']) {
    h.sheets[name].data[0].pop();
    const oldRow = h.sheets[name].data[0].map((key) =>
      key === 'college_id' ? 'KBTUG23513' : 'legacy-' + key,
    );
    h.sheets[name].data.push([...oldRow]);
    h.context.setupAscend();
    assert.equal(
      JSON.stringify(h.sheets[name].data[1].slice(0, oldRow.length)),
      JSON.stringify(oldRow),
    );
    assert.equal(h.sheets[name].data[0].at(-1), 'is_public_proof');
    assert.equal(h.sheets[name].data[1].at(-1), false);
    h.sheets[name].data[1][oldRow.length] = true;
    h.context.setupAscend();
    assert.equal(h.sheets[name].data[1].at(-1), true);
  }
});
test('public proof opt-in controls Drive access and public responses; cross-student files cannot be shared', () => {
  const h = harness();
  const r = h.start();
  const body = { collegeId: r.session.collegeId, token: r.session.token };
  const upload = h.post({
    ...body,
    action: 'uploadFile',
    category: 'certificates',
    fileName: 'certificate.pdf',
    mimeType: 'application/pdf',
    base64: Buffer.from('%PDF-1.4 test').toString('base64'),
  });
  assert.equal(upload.success, true, upload.message);
  h.post({
    ...body,
    action: 'saveStudent',
    student: { ...r.portfolio.student, fullName: 'Test', branch: 'IT', year: '3rd' },
  });
  h.post({
    ...body,
    action: 'saveSettings',
    settings: { ...r.portfolio.settings, published: true },
  });
  const record = {
    activityId: crypto.randomUUID(),
    title: 'Certificate',
    category: 'Certification',
    activityDate: '2026-10-09',
    proofUrl: upload.data.viewUrl,
    isPublicProof: false,
  };
  const privateResult = h.post({ ...body, action: 'addActivity', record });
  assert.equal(privateResult.success, true, privateResult.message);
  assert.equal(privateResult.data.activities[0].proofUrl, record.proofUrl);
  assert.equal(
    h.get({ action: 'getPortfolio', collegeId: body.collegeId }).data.activities[0].proofUrl,
    undefined,
  );
  const publicResult = h.post({
    ...body,
    action: 'updateActivity',
    record: { ...record, isPublicProof: true },
  });
  assert.equal(publicResult.success, true, publicResult.message);
  assert.equal(h.root.children[body.collegeId].children.certificates.files[0].access, 'public');
  assert.equal(
    h.get({ action: 'getPortfolio', collegeId: body.collegeId }).data.activities[0].proofUrl,
    record.proofUrl,
  );
  const b = h.start('KBTUG23888');
  assert.equal(
    h.post({
      action: 'addActivity',
      collegeId: b.session.collegeId,
      token: b.session.token,
      record: { ...record, activityId: crypto.randomUUID(), isPublicProof: true },
    }).success,
    false,
  );
  assert.equal(h.post({ ...body, action: 'updateActivity', record }).success, true);
  assert.equal(h.root.children[body.collegeId].children.certificates.files[0].access, 'private');
  assert.equal(
    h.get({ action: 'getPortfolio', collegeId: body.collegeId }).data.activities[0].proofUrl,
    undefined,
  );
  assert.equal(h.get({ action: 'getUploadCapabilities' }).data.schemaReady, true);
});

test('public contact migration preserves links, opts out legacy rows, and retains subsequent choices', () => {
  const h = harness();
  const sheet = h.sheets.Links;
  sheet.data[0] = sheet.data[0].slice(0, 6);
  const old = ['KBTUG23513', 'https://linkedin.com/in/test', '', '', '', ''];
  sheet.data.push([...old]);
  h.context.setupAscend();
  assert.deepEqual(sheet.data[1].slice(0, 6), old);
  assert.deepEqual(sheet.data[1].slice(6), ['', '', false, false]);
  sheet.data[1].splice(6, 4, 'public@example.com', '+1 202 555 0100', true, true);
  h.context.setupAscend();
  assert.deepEqual(sheet.data[1].slice(6), ['public@example.com', '+1 202 555 0100', true, true]);
  assert.equal(h.get({action: 'getContactCapabilities'}).data.schemaReady, true);
});

test('public contact opt-in redacts email and phone in public, gallery and owner public-view responses', () => {
  const h = harness();
  const r = h.start();
  const body = { collegeId: r.session.collegeId, token: r.session.token };
  h.post({ ...body, action: 'saveStudent', student: { ...r.portfolio.student, fullName: 'Test', branch: 'IT', year: 'Final Year' } });
  h.post({ ...body, action: 'saveSettings', settings: { ...r.portfolio.settings, published: true } });
  const links = { publicEmail: 'public@example.com', phone: '+1 202 555 0100', showEmail: false, showPhone: false };
  const privateResult = h.post({ ...body, action: 'saveLinks', links });
  assert.equal(privateResult.success, true, privateResult.message);
  assert.equal(privateResult.data.links.publicEmail, links.publicEmail);
  for (const data of [h.get({action:'getPortfolio',collegeId:body.collegeId}).data, h.get({action:'getPortfolio',...body,publicOnly:'true'}).data, h.get({action:'getPublishedPortfolios'}).data[0]]) {
    assert.equal(data.links.publicEmail, ''); assert.equal(data.links.phone, ''); assert.equal(data.student.collegeEmail, '');
  }
  assert.equal(h.post({ ...body, action: 'saveLinks', links: {...links, showEmail: true} }).success, true);
  const published = h.get({ action: 'getPortfolio', collegeId: body.collegeId }).data;
  assert.equal(published.links.publicEmail, links.publicEmail);
  assert.equal(published.links.phone, '');
  assert.equal(h.post({ ...body, action: 'saveLinks', links: {...links, publicEmail:'javascript:alert(1)', showEmail:true} }).success, false);
  assert.equal(h.post({ ...body, action: 'saveLinks', links: {...links, showPhone:'true'} }).success, false);
});
