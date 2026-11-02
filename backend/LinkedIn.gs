/** Private sharing storage. Called only by the Ascend server through an authenticated bridge.
 * All operations execute inside Code.gs's ScriptLock. Never add these tables to public portfolios.
 */
var LI_TABLES = ['LinkedInConnections', 'LinkedInDrafts', 'LinkedInJobs', 'LinkedInOAuthStates', 'LinkedInRates'];
function setupLinkedIn() {
  LI_TABLES.forEach(function (name) {
    var sheet = spreadsheet_().getSheetByName(name) || spreadsheet_().insertSheet(name);
    var headers = ['id', 'owner', 'data', 'updated_at'];
    if (!sheet.getLastRow()) { sheet.appendRow(headers); sheet.setFrozenRows(1); }
    else if (JSON.stringify(sheet.getRange(1, 1, 1, 4).getValues()[0]) !== JSON.stringify(headers))
      throw new Error('Unexpected headers in ' + name + '. Data preserved.');
  });
}
function liRecords_(name) {
  var sheet = spreadsheet_().getSheetByName(name);
  if (!sheet) throw new Error('Run setupAscend with LinkedIn.gs installed and redeploy.');
  return sheet.getDataRange().getValues().slice(1).filter(function (r) { return r[0]; }).map(function (r) { return JSON.parse(r[2]); });
}
function liGet_(table, id) { return liRecords_(table).find(function (r) { return r.id === id; }) || null; }
function liSave_(table, record) {
  record.updatedAt = new Date().toISOString();
  var json = JSON.stringify(record);
  if (json.length > 40000) throw new Error('Sharing record is too large.');
  var sheet = spreadsheet_().getSheetByName(table), values = sheet.getDataRange().getValues();
  var index = values.findIndex(function (r, i) { return i > 0 && r[0] === record.id; });
  var row = index > 0 ? index + 1 : sheet.getLastRow() + 1;
  if (row > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), 100);
  sheet.getRange(row, 1, 1, 4).setNumberFormat('@').setValues([[record.id, record.owner, json, record.updatedAt]]);
  SpreadsheetApp.flush();
  return record;
}
function liOwn_(table, id, owner) {
  var r = liGet_(table, id);
  if (!r || r.owner !== owner) throw new Error('Sharing record not found.');
  return r;
}
function liRate_(owner, kind, limit) {
  var day = new Date().toISOString().slice(0, 10), id = owner + ':' + kind + ':' + day;
  var r = liGet_('LinkedInRates', id) || { id: id, owner: owner, count: 0 };
  if (r.count >= limit) throw new Error('Daily sharing limit reached. Please try tomorrow.');
  r.count++; liSave_('LinkedInRates', r);
}
function liSource_(owner, kind, id) {
  var table = kind === 'activity' ? 'Activities' : kind === 'skill' ? 'Skills' : '';
  if (!table) throw new Error('Choose an activity or skill.');
  var row = find_(table, kind === 'skill' ? 'skill_id' : 'activity_id', id);
  if (!row || row.college_id !== owner) throw new Error('Activity or skill not found.');
  return kind === 'skill' ? { title: row.skill_name, category: 'Skill', description: '', organization: '', date: '' } :
    { title: row.title, category: row.category, description: row.description, organization: row.organization, date: String(row.activity_date || ''), proofUrl: row.proof_url || '' };
}
function liConnection_(owner) {
  var c = liGet_('LinkedInConnections', owner);
  if (!c || c.owner !== owner || c.status !== 'connected' || c.sessionHash !== props_().getProperty('SESSION_' + owner) || Date.parse(c.expiresAt) <= Date.now() || !c.scopes || c.scopes.indexOf('w_member_social') < 0) throw new Error('reconnect_required');
  return c;
}
function liEditable_(d) {
  if (['queued', 'publishing', 'published', 'publication_unknown'].indexOf(d.status) >= 0) throw new Error('This approved draft is locked.');
}
function liRevision_(d, revision) { if (d.revision !== revision) throw new Error('Draft changed. Reload the latest revision.'); }
function liCaption_(value) {
  var text = required_(value, 'Caption', 2800);
  if (/[^\s]+@[^\s]+\.[^\s]+|\b(?:STKBTCOE\d+|KBTUG\d{5})\b/i.test(text)) throw new Error('Remove private identifiers and contact details from your caption.');
  return text;
}
function liPublicJob_(j) {
  return { id: j.id, draftId: j.draftId, status: j.status, error: j.error || '', postId: j.postId || '', postUrl: j.postUrl || '', createdAt: j.createdAt, updatedAt: j.updatedAt };
}
function liExpireJob_(j) {
  if (j.status === 'publishing' && Date.parse(j.updatedAt) < Date.now() - 5 * 60000) {
    j.status = 'publication_unknown'; j.error = 'Publishing was interrupted. Check your LinkedIn account before taking any further action.';
    liSave_('LinkedInJobs', j);
    var d = liGet_('LinkedInDrafts', j.draftId); d.status = j.status; liSave_('LinkedInDrafts', d);
  }
  return j;
}
function liMedia_(owner, fileId) {
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(fileId || '')) throw new Error('Choose an Ascend-uploaded image.');
  var file = DriveApp.getFileById(fileId), parents = file.getParents(), owned = false;
  // Resolve existing owner folders, never caller-provided URLs or folder IDs.
  var students = uploadRoot_().getFoldersByName(owner);
  if (!students.hasNext()) throw new Error('Image not found in your uploads.');
  var student = students.next(), allowed = [];
  UPLOAD_CATEGORIES.forEach(function (category) { var folders = student.getFoldersByName(category); if (folders.hasNext()) allowed.push(folders.next().getId()); });
  while (parents.hasNext()) if (allowed.indexOf(parents.next().getId()) >= 0) owned = true;
  if (!owned) throw new Error('This image belongs to another account.');
  var blob = file.getBlob(), mime = blob.getContentType(), bytes = blob.getBytes();
  if (['image/jpeg', 'image/png'].indexOf(mime) < 0 || bytes.length > 2 * 1024 * 1024 || !bytes.length) throw new Error('Choose a JPG or PNG image up to 2 MiB. PDFs cannot be posted as images.');
  return { id: file.getId(), name: file.getName(), mimeType: mime, base64: Utilities.base64Encode(bytes) };
}
function linkedinBridge_(b) {
  var secret = props_().getProperty('LINKEDIN_BRIDGE_SECRET');
  if (!secret || secret.length < 32 || typeof b.secret !== 'string' || digest_(b.secret) !== digest_(secret)) throw new Error('Internal authentication required.');
  var p = b.payload || {}, op = b.operation, owner = '';
  var userOps = ['auth', 'connection', 'disconnect', 'oauthStart', 'createDraft', 'readDraft', 'editDraft', 'generate', 'approve', 'readJob', 'media', 'upload'];
  if (userOps.indexOf(op) >= 0) {
    owner = identityId_((b.auth || {}).collegeId);
    if (!authorized_(owner, (b.auth || {}).token)) throw new Error('Your editing session has ended. Enter your college identity again.');
    if (!find_('Students', 'college_id', owner)) throw new Error('Student not found.');
  }
  if (op === 'auth') return { owner: owner };
  if (op === 'connection') {
    var connected = liGet_('LinkedInConnections', owner);
    if (connected && connected.status === 'connected' && connected.sessionHash !== props_().getProperty('SESSION_' + owner))
      return { status: 'reconnect_required', name: connected.name, expiresAt: connected.expiresAt };
    return connected;
  }
  if (op === 'disconnect') {
    liSave_('LinkedInConnections', { id: owner, owner: owner, connectionId: Utilities.getUuid(), status: 'disconnected' });
    return { disconnected: true };
  }
  if (op === 'oauthStart') {
    liRate_(owner, 'connect', 10);
    if (p.draftId) liOwn_('LinkedInDrafts', p.draftId, owner);
    var current = liGet_('LinkedInConnections', owner);
    return liSave_('LinkedInOAuthStates', { id: required_(p.stateHash, 'State', 100), owner: owner, bindingHash: p.bindingHash, sessionHash: props_().getProperty('SESSION_' + owner), generation: current ? current.connectionId : '', expiresAt: new Date(Date.now() + 10 * 60000).toISOString(), used: false, draftId: p.draftId || '' });
  }
  if (op === 'oauthConsume' || op === 'oauthComplete') {
    var state = liGet_('LinkedInOAuthStates', p.stateHash);
    if (!state || Date.parse(state.expiresAt) <= Date.now() || state.sessionHash !== props_().getProperty('SESSION_' + state.owner)) throw new Error('OAuth state is invalid or expired.');
    var connection = liGet_('LinkedInConnections', state.owner);
    if ((connection ? connection.connectionId : '') !== state.generation) throw new Error('Connection changed. Start again.');
    if (op === 'oauthConsume') {
      if (state.used || state.bindingHash !== p.bindingHash) throw new Error('OAuth state is invalid or already used.');
      state.used = true; liSave_('LinkedInOAuthStates', state); return { owner: state.owner, draftId: state.draftId };
    }
    if (!state.used || state.completed) throw new Error('OAuth state is invalid or already completed.');
    state.completed = true; liSave_('LinkedInOAuthStates', state);
    liSave_('LinkedInConnections', { id: state.owner, owner: state.owner, connectionId: p.connectionId, sessionHash: state.sessionHash, status: 'connected', memberId: p.memberId, name: p.name, encryptedToken: p.encryptedToken, expiresAt: p.expiresAt, scopes: p.scopes });
    return { connected: true };
  }
  if (op === 'createDraft') {
    var oldDraft = liGet_('LinkedInDrafts', p.id);
    if (oldDraft) {
      if (oldDraft.owner !== owner || oldDraft.sourceId !== p.sourceId || oldDraft.sourceKind !== p.sourceKind) throw new Error('Invalid draft request.');
      return oldDraft;
    }
    liRate_(owner, 'draft', 40);
    var source = liSource_(owner, p.sourceKind, p.sourceId), student = find_('Students', 'college_id', owner);
    return liSave_('LinkedInDrafts', { id: p.id, owner: owner, sourceKind: p.sourceKind, sourceId: p.sourceId, source: source, revision: 1, status: 'draft', caption: '', tone: 'professional', media: null, includePortfolio: false, context: { name: '', headline: '', interests: '' }, availableContext: { name: student.full_name || '', headline: student.headline || '' }, createdAt: new Date().toISOString() });
  }
  if (op === 'readDraft') return liOwn_('LinkedInDrafts', p.id, owner);
  if (op === 'editDraft' || op === 'generate' || op === 'approve') {
    var d = liOwn_('LinkedInDrafts', p.id, owner);
    liRevision_(d, p.revision);
    if (op !== 'approve') liEditable_(d);
    if (op === 'editDraft') {
      if (['professional', 'simple', 'enthusiastic'].indexOf(p.tone) < 0) throw new Error('Choose a tone.');
      if (typeof p.includePortfolio !== 'boolean') throw new Error('Choose portfolio visibility.');
      var settings = find_('PortfolioSettings', 'college_id', owner);
      if (p.includePortfolio && (!settings || (settings.published !== true && settings.published !== 'true'))) throw new Error('Publish your Ascend portfolio before including its link.');
      if (p.media) liMedia_(owner, p.media.id);
      d.caption = p.caption ? liCaption_(p.caption) : ''; d.tone = p.tone; d.includePortfolio = p.includePortfolio;
      d.media = p.media ? { id: p.media.id, hash: required_(p.media.hash, 'Image fingerprint', 100), mimeType: p.media.mimeType, name: clean_(p.media.name, 200) } : null;
      d.context = { name: p.useName ? d.availableContext.name : '', headline: p.useHeadline ? d.availableContext.headline : '', interests: clean_(p.interests, 300) };
      d.revision++; d.status = d.caption ? 'ready' : 'draft'; d.generation = null; d.error = ''; return liSave_('LinkedInDrafts', d);
    }
    if (op === 'generate') {
      liRate_(owner, 'generate', 20);
      d.status = 'generating'; d.error = ''; d.generation = { requestId: p.requestId, revision: d.revision, expiresAt: new Date(Date.now() + 5 * 60000).toISOString() };
      return liSave_('LinkedInDrafts', d);
    }
    var existingJob = liGet_('LinkedInJobs', p.jobId);
    if (existingJob) {
      if (existingJob.owner !== owner || existingJob.draftId !== d.id || existingJob.revision !== d.revision) throw new Error('Invalid publishing key.');
      return liPublicJob_(liExpireJob_(existingJob));
    }
    liEditable_(d);
    if (!d.caption || d.status !== 'ready' || p.approved !== true) throw new Error('Approve the exact ready preview before publishing.');
    var conn = liConnection_(owner); liRate_(owner, 'publish', 5);
    var job = { id: p.jobId, owner: owner, draftId: d.id, revision: d.revision, connectionId: conn.connectionId, memberId: conn.memberId, status: 'queued', phase: 'queued', snapshot: { caption: d.caption, media: d.media, portfolioUrl: d.includePortfolio ? p.portfolioUrl : '' }, approvedAt: new Date().toISOString(), createdAt: new Date().toISOString() };
    liSave_('LinkedInJobs', job); d.status = 'queued'; d.jobId = job.id; d.approvedRevision = d.revision; liSave_('LinkedInDrafts', d);
    return liPublicJob_(job);
  }
  if (op === 'generationContext' || op === 'generationSave') {
    var gd = liGet_('LinkedInDrafts', p.id), gen = gd && gd.generation;
    if (!gen || gen.requestId !== p.requestId || gen.revision !== gd.revision || Date.parse(gen.expiresAt) <= Date.now()) throw new Error('Generation superseded or expired.');
    if (op === 'generationContext') return { draftId: gd.id, requestId: gen.requestId, revision: gd.revision, tone: gd.tone, context: { student: gd.context, achievement: { title: gd.source.title, category: gd.source.category, description: gd.source.description, organization: gd.source.organization, date: gd.source.date } } };
    gd.generation = null;
    if (p.error) { gd.status = gd.caption ? 'ready' : 'failed'; gd.error = 'Caption generation failed. Your saved activity and draft are unchanged. Try again.'; }
    else { gd.caption = liCaption_(p.caption); gd.revision++; gd.status = 'ready'; gd.error = ''; }
    liSave_('LinkedInDrafts', gd); return { saved: !p.error, revision: gd.revision };
  }
  if (op === 'media') return liMedia_(owner, p.fileId);
  if (op === 'upload') {
    liRate_(owner, 'upload', 30);
    if ((p.base64 || '').length > 2800000) throw new Error('Image must be at most 2 MiB.');
    var uploaded = uploadFile_({ fileName: p.fileName, mimeType: p.mimeType, base64: p.base64, uploadId: p.uploadId, category: 'other' }, owner);
    return liMedia_(owner, uploaded.fileId);
  }
  if (op === 'readJob') return liPublicJob_(liExpireJob_(liOwn_('LinkedInJobs', p.id, owner)));
  if (op === 'queuedJobs') return liRecords_('LinkedInJobs').map(liExpireJob_).filter(function (j) { return j.status === 'queued'; }).slice(0, 10).map(function (j) { return j.id; });
  if (['claimJob', 'executeJob', 'beginPost', 'finishJob'].indexOf(op) >= 0) {
    var j = liGet_('LinkedInJobs', p.id);
    if (!j) throw new Error('Publishing job not found.');
    liExpireJob_(j);
    if (op === 'claimJob') {
      if (j.status !== 'queued') return { eligible: false, job: liPublicJob_(j) };
      var jd = liOwn_('LinkedInDrafts', j.draftId, j.owner);
      if (jd.approvedRevision !== j.revision || jd.jobId !== j.id || jd.revision !== j.revision) throw new Error('Approval is outdated.');
      j.status = 'publishing'; j.phase = 'claimed'; j.claimHash = p.claimHash; liSave_('LinkedInJobs', j);
      jd.status = 'publishing'; liSave_('LinkedInDrafts', jd); return { eligible: true, jobId: j.id };
    }
    if (j.claimHash !== p.claimHash) throw new Error('Invalid job claim.');
    if (op === 'finishJob') {
      if (j.status === 'published') return liPublicJob_(j);
      if (['published', 'failed', 'publication_unknown', 'reconnect_required'].indexOf(p.status) < 0) throw new Error('Invalid job result.');
      j.status = p.status; j.error = p.error || ''; j.postId = p.postId || ''; j.postUrl = p.postUrl || '';
      if (j.status === 'reconnect_required') { var revoked = liGet_('LinkedInConnections', j.owner); if (revoked && revoked.connectionId === j.connectionId) { revoked.status = 'reconnect_required'; delete revoked.encryptedToken; liSave_('LinkedInConnections', revoked); } }
      liSave_('LinkedInJobs', j); var finished = liOwn_('LinkedInDrafts', j.draftId, j.owner); finished.status = j.status; finished.error = j.error; liSave_('LinkedInDrafts', finished); return liPublicJob_(j);
    }
    if (j.status !== 'publishing' || (op === 'executeJob' && j.phase !== 'claimed') || (op === 'beginPost' && j.phase !== 'executing')) return { eligible: false, job: liPublicJob_(j) };
    var connection;
    try { connection = liConnection_(j.owner); if (connection.connectionId !== j.connectionId || connection.memberId !== j.memberId) throw new Error('reconnect_required'); }
    catch (_) { j.status = 'reconnect_required'; j.error = 'Reconnect LinkedIn and approve a new preview.'; liSave_('LinkedInJobs', j); var expired = liOwn_('LinkedInDrafts', j.draftId, j.owner); expired.status = j.status; liSave_('LinkedInDrafts', expired); return { eligible: false, job: liPublicJob_(j) }; }
    j.phase = op === 'executeJob' ? 'executing' : 'post_request'; liSave_('LinkedInJobs', j);
    if (op === 'beginPost') return { eligible: true };
    return { eligible: true, snapshot: j.snapshot, connection: connection, media: j.snapshot.media ? liMedia_(j.owner, j.snapshot.media.id) : null };
  }
  throw new Error('Unknown internal sharing operation.');
}
