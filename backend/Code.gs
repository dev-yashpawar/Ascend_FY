/** Ascend MVP. Resource IDs stay on the server; setup preserves existing data. */
const SPREADSHEET_ID = '1r-ORdVKmKzzb3Zv4DO0OqwMWFYSgYRItuQElQqG_fRI';
const FEEDBACK_SPREADSHEET_ID = '1e4uQk1vn4n_FFwvnqaZjZsDefrWruRNDYiSFgKXQ1E0';
const UPLOAD_ROOT_FOLDER_ID = '1H2fhrSwv6jcvQb_AB4jKtOYGxxWxjvXJ';
var UPLOAD_API_VERSION = '2026-10-09.uploads.v2';
var UPLOAD_CATEGORIES = ['profile', 'projects', 'certificates', 'internships', 'achievements', 'other'];
var SCHEMA = {
  Students: [
    'college_id',
    'college_email',
    'full_name',
    'branch',
    'year',
    'headline',
    'about',
    'photo_url',
    'created_at',
    'updated_at',
  ],
  Skills: ['skill_id', 'college_id', 'skill_name', 'sort_order'],
  Projects: [
    'project_id',
    'college_id',
    'title',
    'description',
    'tech_stack',
    'github_url',
    'live_url',
    'image_url',
    'verification_status',
    'created_at',
    'updated_at',
  ],
  Experience: [
    'experience_id',
    'college_id',
    'organization',
    'role',
    'start_date',
    'end_date',
    'currently_working',
    'description',
    'proof_url',
    'verification_status',
    'created_at',
    'updated_at',
    'is_public_proof',
  ],
  Activities: [
    'activity_id',
    'college_id',
    'category',
    'title',
    'organization',
    'activity_date',
    'description',
    'proof_url',
    'verification_status',
    'created_at',
    'updated_at',
    'is_public_proof',
  ],
  Links: ['college_id', 'linkedin', 'github', 'leetcode', 'website', 'other', 'public_email', 'phone', 'show_email', 'show_phone'],
  PortfolioSettings: [
    'college_id',
    'theme',
    'font',
    'accent',
    'section_order',
    'hidden_sections',
    'published',
    'updated_at',
  ],
  Feedback: ['feedback_id', 'college_id', 'category', 'subject', 'message', 'created_at', 'status'],
  Education: ['education_id', 'college_id', 'level', 'institution', 'board', 'academic_year', 'engineering_year', 'grading_type', 'score', 'scale', 'show_public'],
};
var SECTIONS = [
  'About',
  'Education',
  'Skills',
  'Projects',
  'Experience',
  'Certifications',
  'Achievements',
  'Workshops & Conferences',
  'Leadership',
  'Volunteering',
  'Contact',
];
var CATEGORIES = [
  'Certification',
  'Conference',
  'Workshop',
  'Competition',
  'Club Activity',
  'Volunteering',
  'Leadership',
  'Community Service',
  'Academic Achievement',
  'Hackathon',
  'Other',
];
var ACCENTS = ['#4655d5', '#16786b', '#a34f32', '#8554bd', '#236eaa', '#b04474'];
function props_() {
  return PropertiesService.getScriptProperties();
}
function spreadsheet_() {
  var id = props_().getProperty('SPREADSHEET_ID') || SPREADSHEET_ID;
  if (!id) throw new Error('Backend not configured. Set SPREADSHEET_ID in Script Properties.');
  return SpreadsheetApp.openById(id);
}
function tableSpreadsheet_(name) {
  if (name !== 'Feedback') return spreadsheet_();
  var id = props_().getProperty('FEEDBACK_SPREADSHEET_ID') || FEEDBACK_SPREADSHEET_ID;
  return id ? SpreadsheetApp.openById(id) : spreadsheet_();
}
function setupAscend() {
  Object.keys(SCHEMA).forEach(function (name) {
    var ss = tableSpreadsheet_(name);
    var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    if (!sheet.getLastRow()) {
      sheet.appendRow(SCHEMA[name]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, SCHEMA[name].length).setFontWeight('bold');
    } else {
      var expected = SCHEMA[name];
      var headers = sheet.getRange(1, 1, 1, expected.length).getValues()[0];
      var oldSchema = expected.slice(0, -1);
      if ((name === 'Activities' || name === 'Experience') &&
          JSON.stringify(headers.slice(0, oldSchema.length)) === JSON.stringify(oldSchema) &&
          (!headers[oldSchema.length] || headers[oldSchema.length] === 'is_public_proof')) {
        sheet.getRange(1, expected.length, 1, 1).setValues([['is_public_proof']]);
        for (var row = 2; row <= sheet.getLastRow(); row++) {
          var value = sheet.getRange(row, expected.length, 1, 1).getValues()[0][0];
          if (value === '' || value === undefined || value === null)
            sheet.getRange(row, expected.length, 1, 1).setValues([[false]]);
        }
      } else if (name === 'Links' && JSON.stringify(headers.slice(0, 6)) === JSON.stringify(expected.slice(0, 6))) {
        for (var column = 6; column < expected.length; column++) {
          if (headers[column] && headers[column] !== expected[column]) throw new Error('Unexpected headers in Links. Existing data has been preserved.');
        }
        sheet.getRange(1, 7, 1, 4).setValues([expected.slice(6)]);
        for (var contactRow = 2; contactRow <= sheet.getLastRow(); contactRow++) {
          for (var contactColumn = 7; contactColumn <= 10; contactColumn++) {
            var contactValue = sheet.getRange(contactRow, contactColumn, 1, 1).getValues()[0][0];
            if (contactValue === '' || contactValue === undefined || contactValue === null)
              sheet.getRange(contactRow, contactColumn, 1, 1).setValues([[contactColumn >= 9 ? false : '']]);
          }
        }
      } else if (JSON.stringify(headers) !== JSON.stringify(expected))
        throw new Error('Unexpected headers in ' + name + '. Existing data has been preserved.');
    }
  });
  migrateFeedback_();
}
// Copy missing historical submissions; preserve the old tab and destination edits.
function migrateFeedback_() {
  var source = spreadsheet_();
  var destination = tableSpreadsheet_('Feedback');
  if (source.getId() === destination.getId()) return;
  var oldSheet = source.getSheetByName('Feedback');
  if (!oldSheet || !oldSheet.getLastRow()) return;
  if (JSON.stringify(oldSheet.getRange(1, 1, 1, SCHEMA.Feedback.length).getValues()[0]) !== JSON.stringify(SCHEMA.Feedback))
    throw new Error('Unexpected headers in the old Feedback tab. Existing data has been preserved.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('Feedback migration is busy. Please retry setupAscend.');
  try {
    var known = Object.create(null);
    rows_('Feedback').forEach(function (r) { known[r.feedback_id] = true; });
    oldSheet.getDataRange().getValues().slice(1).forEach(function (row) {
      if (!row[0] || known[row[0]]) return;
      var record = {};
      SCHEMA.Feedback.forEach(function (key, i) {
        record[key] = row[i] instanceof Date ? row[i].toISOString() : row[i];
      });
      store_('Feedback', 'feedback_id', record);
      known[row[0]] = true;
    });
    SpreadsheetApp.flush();
  } finally { lock.releaseLock(); }
}
function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
function respond_(fn) {
  try {
    return json_({ success: true, data: fn() });
  } catch (err) {
    return json_({ success: false, message: err.message || 'Unable to process request.' });
  }
}
function doGet(e) {
  return respond_(function () {
    var p = e.parameter || {};
    var action = p.action;
    var id = p.collegeId ? identityId_(p.collegeId) : '';
    if (action === 'getEducationCapabilities') {
      var educationSheet = spreadsheet_().getSheetByName('Education');
      return { schemaReady: !!educationSheet && JSON.stringify(educationSheet.getRange(1, 1, 1, SCHEMA.Education.length).getValues()[0]) === JSON.stringify(SCHEMA.Education) };
    }
    if (action === 'getFeedbackCapabilities') {
      var feedbackSheet = tableSpreadsheet_('Feedback').getSheetByName('Feedback');
      return {
        schemaReady: !!feedbackSheet && JSON.stringify(feedbackSheet.getRange(1, 1, 1, SCHEMA.Feedback.length).getValues()[0]) === JSON.stringify(SCHEMA.Feedback),
        storage: tableSpreadsheet_('Feedback').getId() === spreadsheet_().getId() ? 'student_spreadsheet' : 'separate_spreadsheet'
      };
    }
    if (action === 'getContactCapabilities') {
      var linksSheet = spreadsheet_().getSheetByName('Links');
      return { schemaReady: !!linksSheet && JSON.stringify(linksSheet.getRange(1, 1, 1, SCHEMA.Links.length).getValues()[0]) === JSON.stringify(SCHEMA.Links) };
    }
    if (action === 'getUploadCapabilities') return {
      version: UPLOAD_API_VERSION,
      schemaReady: ['Activities', 'Experience'].every(function (name) {
        var sheet = spreadsheet_().getSheetByName(name);
        return sheet && sheet.getRange(1, SCHEMA[name].length, 1, 1).getValues()[0][0] === 'is_public_proof';
      })
    };
    if (action === 'getStudent') return { exists: !!find_('Students', 'college_id', id) };
    if (action === 'getPublishedPortfolios')
      return rows_('PortfolioSettings')
        .filter(function (s) {
          return s.published === true || s.published === 'true';
        })
        .map(function (s) {
          return portfolio_(s.college_id, false);
        });
    if (action === 'getPortfolio') {
      var owner = authorized_(id, p.token);
      return portfolio_(id, owner, p.publicOnly === 'true');
    }
    throw new Error('Unknown read operation.');
  });
}
function doPost(e) {
  return respond_(function () {
    if (!e.postData || e.postData.contents.length > 7100000)
      throw new Error('Invalid request payload.');
    var body;
    try { body = JSON.parse(e.postData.contents); } catch (_) { throw new Error('Invalid JSON request.'); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid request payload.');
    if (body.action !== 'uploadFile' && e.postData.contents.length > 150000) throw new Error('Request is too large.');
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(15000)) throw new Error('The service is busy. Please retry.');
    try {
      return mutate_(body);
    } finally {
      lock.releaseLock();
    }
  });
}
function rows_(name) {
  var sheet = tableSpreadsheet_(name).getSheetByName(name);
  if (!sheet) throw new Error('Run setupAscend first.');
  var values = sheet.getDataRange().getValues();
  return values
    .slice(1)
    .filter(function (row) {
      return row[0] !== '';
    })
    .map(function (row) {
      var obj = {};
      SCHEMA[name].forEach(function (key, i) {
        if (row[i] instanceof Date) {
          obj[key] =
            ['start_date', 'end_date'].indexOf(key) >= 0
              ? Utilities.formatDate(row[i], spreadsheet_().getSpreadsheetTimeZone(), 'yyyy-MM')
              : key === 'activity_date'
                ? Utilities.formatDate(
                    row[i],
                    spreadsheet_().getSpreadsheetTimeZone(),
                    'yyyy-MM-dd',
                  )
                : row[i].toISOString();
        } else obj[key] = row[i];
      });
      return obj;
    });
}
function find_(name, key, value) {
  return rows_(name).find(function (r) {
    return r[key] === value;
  });
}
function cell_(value) {
  if (typeof value === 'string' && /^[\s]*[=+\-@]/.test(value)) return "'" + value;
  return value === undefined || value === null ? '' : value;
}
function store_(name, key, obj) {
  var sheet = tableSpreadsheet_(name).getSheetByName(name);
  var values = sheet.getDataRange().getValues();
  var col = SCHEMA[name].indexOf(key);
  var row = values.findIndex(function (r, i) {
    return i > 0 && r[col] === obj[key];
  });
  var data = SCHEMA[name].map(function (k) {
    return cell_(obj[k]);
  });
  var target = row > 0 ? row + 1 : sheet.getLastRow() + 1;
  if (target > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), 100);
  sheet.getRange(target, 1, 1, data.length).setNumberFormat('@').setValues([data]);
}
function delete_(name, key, id, collegeId) {
  var sheet = spreadsheet_().getSheetByName(name);
  var values = sheet.getDataRange().getValues();
  var keyIndex = SCHEMA[name].indexOf(key),
    ownerIndex = SCHEMA[name].indexOf('college_id');
  for (var i = values.length - 1; i >= 1; i--) {
    if (values[i][keyIndex] === id) {
      if (values[i][ownerIndex] !== collegeId)
        throw new Error('Record belongs to another student.');
      sheet.deleteRow(i + 1);
    }
  }
}
function clean_(value, max) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw new Error('Expected a text value.');
  var s = value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim();
  if (s.length > (max || 5000)) throw new Error('A field exceeds its character limit.');
  return s;
}
function required_(value, label, max) {
  var s = clean_(value, max);
  if (!s) throw new Error(label + ' is required.');
  return s;
}
function url_(value) {
  var s = clean_(value, 2000);
  if (s && !/^https?:\/\/[^\s\/]+(?:[\/\?#][^\s]*)?$/i.test(s))
    throw new Error('Links must use http or https.');
  return s;
}
function identityId_(value) {
  var id = required_(value, 'College ID', 30).toUpperCase();
  var pattern = props_().getProperty('COLLEGE_ID_PATTERN');
  if (!pattern || ['^KBTUG\\d{5}$', '^KBTUG[0-9]{5}$'].indexOf(pattern) >= 0)
    pattern = '^(?:STKBTCOE[0-9]+|KBTUG[0-9]{5})$';
  if (!new RegExp(pattern, 'i').test(id)) throw new Error('Invalid college ID format.');
  return id;
}
function email_(value) {
  var email = required_(value, 'Email address', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error('Enter a valid personal or college email address.');
  return email;
}
function camel_(obj) {
  var out = {};
  Object.keys(obj).forEach(function (k) {
    var key = k.replace(/_([a-z])/g, function (_, c) {
      return c.toUpperCase();
    });
    var value = obj[k];
    if (['tech_stack', 'section_order', 'hidden_sections'].indexOf(k) >= 0)
      value = typeof value === 'string' ? JSON.parse(value || '[]') : value;
    if (['currently_working', 'published', 'is_public_proof', 'show_email', 'show_phone', 'show_public'].indexOf(k) >= 0)
      value = value === true || value === 'true';
    out[key] = value;
  });
  return out;
}
function settings_(id) {
  return {
    college_id: id,
    theme: 'Modern',
    font: 'Inter',
    accent: ACCENTS[0],
    section_order: JSON.stringify(SECTIONS),
    hidden_sections: '[]',
    published: false,
    updated_at: new Date().toISOString(),
  };
}
function links_(id) {
  return { college_id: id, linkedin: '', github: '', leetcode: '', website: '', other: '', public_email: '', phone: '', show_email: false, show_phone: false };
}
function digest_(token) {
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token));
}
function authorized_(id, token) {
  if (!token || typeof token !== 'string' || token.length > 200) return false;
  return props_().getProperty('SESSION_' + id) === digest_(token);
}
function portfolio_(id, owner, publicView) {
  var student = find_('Students', 'college_id', id);
  if (!student) throw new Error('Portfolio not found.');
  var settings = find_('PortfolioSettings', 'college_id', id) || settings_(id);
  if (!owner && settings.published !== true && settings.published !== 'true')
    throw new Error('This portfolio has not been published yet.');
  if (!owner || publicView) student.college_email = '';
  var children = function (name) {
    return rows_(name)
      .filter(function (r) {
        return r.college_id === id;
      })
      .map(function (r) {
        var result = camel_(r);
        if ((!owner || publicView) && !result.isPublicProof && Object.prototype.hasOwnProperty.call(result, 'proofUrl')) delete result.proofUrl;
        return result;
      });
  };
  var publicLinks = camel_(find_('Links', 'college_id', id) || links_(id));
  if (!owner || publicView) {
    if (publicLinks.showEmail !== true) publicLinks.publicEmail = '';
    if (publicLinks.showPhone !== true) publicLinks.phone = '';
  }
  return {
    student: camel_(student),
    skills: children('Skills').sort(function (a, b) {
      return Number(a.sortOrder) - Number(b.sortOrder);
    }),
    projects: children('Projects'),
    experiences: children('Experience'),
    activities: children('Activities'),
    education: spreadsheet_().getSheetByName('Education') ? children('Education').filter(function (r) { return (owner && !publicView) || r.showPublic === true; }) : [],
    links: publicLinks,
    settings: camel_(settings),
  };
}
function list_(value, max) {
  if (!Array.isArray(value) || value.length > (max || 100)) throw new Error('Invalid list.');
  return value;
}
function uuid_(value) {
  if (!value) return Utilities.getUuid();
  var id = clean_(value, 60);
  if (!/^[a-zA-Z0-9-]+$/.test(id)) throw new Error('Invalid record ID.');
  return id;
}
function date_(value, month) {
  var s = clean_(value, 10);
  if (!s) return '';
  var pattern = month ? /^\d{4}-(0[1-9]|1[0-2])$/ : /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
  if (!pattern.test(s)) throw new Error('Invalid date.');
  if (!month && new Date(s + 'T12:00:00Z').toISOString().slice(0, 10) !== s)
    throw new Error('Invalid date.');
  return s;
}
function submitFeedback_(f, id, now) {
  if (!f || typeof f !== 'object' || Array.isArray(f)) throw new Error('Invalid feedback.');
  var sheet = tableSpreadsheet_('Feedback').getSheetByName('Feedback');
  if (!sheet || JSON.stringify(sheet.getRange(1, 1, 1, SCHEMA.Feedback.length).getValues()[0]) !== JSON.stringify(SCHEMA.Feedback))
    throw new Error('Run setupAscend to create the Feedback tab, then deploy a New version.');
  var category = required_(f.category, 'Feedback type', 30);
  if (['Suggestion', 'Bug report', 'General feedback'].indexOf(category) < 0) throw new Error('Choose a valid feedback type.');
  var subject = clean_(f.subject || '', 120);
  var message = required_(f.message, 'Your feedback', 2000);
  if (message.length < 10) throw new Error('Please add at least 10 characters to your feedback.');
  var feedbackId = uuid_(f.feedbackId);
  var existing = find_('Feedback', 'feedback_id', feedbackId);
  if (existing) {
    if (existing.college_id !== id || existing.category !== category || existing.subject !== subject || existing.message !== message)
      throw new Error('This feedback submission ID has already been used. Start a new submission.');
    return { feedbackId: existing.feedback_id, createdAt: existing.created_at };
  }
  var cutoff = Date.parse(now) - 24 * 60 * 60 * 1000;
  if (rows_('Feedback').filter(function (r) { return r.college_id === id && Date.parse(r.created_at) >= cutoff; }).length >= 10)
    throw new Error('You have sent 10 messages in the last 24 hours. Please try again later.');
  store_('Feedback', 'feedback_id', {
    feedback_id: feedbackId, college_id: id, category: category, subject: subject,
    message: message, created_at: now, status: 'new'
  });
  return { feedbackId: feedbackId, createdAt: now };
}
function saveEducation_(input, id) {
  var sheet = spreadsheet_().getSheetByName('Education');
  if (!sheet || JSON.stringify(sheet.getRange(1, 1, 1, SCHEMA.Education.length).getValues()[0]) !== JSON.stringify(SCHEMA.Education))
    throw new Error('Run setupAscend to create Education, then deploy a New version.');
  var existing = rows_('Education');
  var ids = Object.create(null), levels = Object.create(null);
  var records = list_(input, 7).map(function (r) {
    if (!r || typeof r !== 'object') throw new Error('Invalid education record.');
    var rid = uuid_(r.educationId);
    if (ids[rid]) throw new Error('Duplicate education ID.');
    ids[rid] = true;
    if (existing.some(function (e) { return e.education_id === rid && e.college_id !== id; })) throw new Error('Education belongs to another student.');
    if (['10th', '12th', 'Diploma', 'Engineering'].indexOf(r.level) < 0) throw new Error('Choose an education level.');
    var year = r.level === 'Engineering' ? required_(r.engineeringYear, 'Engineering year', 1) : '';
    if (year && ['1', '2', '3', '4'].indexOf(year) < 0) throw new Error('Choose an engineering year from 1 to 4.');
    var slot = r.level + year;
    if (levels[slot]) throw new Error('Only one result per education level or engineering year is allowed.');
    levels[slot] = true;
    if (['Percentage', 'CGPA'].indexOf(r.gradingType) < 0) throw new Error('Choose a grading type.');
    var scale = r.gradingType === 'Percentage' ? '100' : clean_(r.scale, 2);
    if (r.gradingType === 'CGPA' && ['4', '10'].indexOf(scale) < 0) throw new Error('Choose a CGPA scale of 4 or 10.');
    var score = clean_(r.score, 10);
    if (score && (!/^\d+(?:\.\d{1,2})?$/.test(score) || Number(score) > Number(scale))) throw new Error('Result must be between 0 and ' + scale + ', with up to two decimal places.');
    if (typeof r.showPublic !== 'boolean') throw new Error('Choose education visibility.');
    return { education_id: rid, college_id: id, level: r.level, institution: required_(r.institution, 'Institution', 200), board: clean_(r.board, 200), academic_year: clean_(r.academicYear, 40), engineering_year: year, grading_type: r.gradingType, score: score, scale: scale, show_public: r.showPublic };
  });
  records.forEach(function (r) { store_('Education', 'education_id', r); });
  existing.filter(function (r) { return r.college_id === id && !ids[r.education_id]; }).forEach(function (r) { delete_('Education', 'education_id', r.education_id, id); });
}
function mutate_(b) {
  var id = identityId_(b.collegeId);
  var now = new Date().toISOString();
  var action = b.action;
  if (action === 'startSession') {
    var email = email_(b.collegeEmail);
    var student = find_('Students', 'college_id', id);
    var exists = !!student;
    if (student && String(student.college_email).toLowerCase() !== email)
      throw new Error('This college ID is already registered. Use the same email you registered with.');
    if (!student) {
      store_('Students', 'college_id', {
        college_id: id,
        college_email: email,
        full_name: '',
        branch: '',
        year: '',
        headline: '',
        about: '',
        photo_url: '',
        created_at: now,
        updated_at: now,
      });
      store_('Links', 'college_id', links_(id));
      store_('PortfolioSettings', 'college_id', settings_(id));
    }
    var token = Utilities.getUuid() + Utilities.getUuid();
    props_().setProperty('SESSION_' + id, digest_(token));
    return {
      exists: exists,
      session: { collegeId: id, token: token },
      portfolio: portfolio_(id, true),
    };
  }
  if (!authorized_(id, b.token))
    throw new Error('Your editing session has ended. Enter your college identity again.');
  var student = find_('Students', 'college_id', id);
  if (!student) throw new Error('Student not found.');
  if (action === 'submitFeedback') return submitFeedback_(b.feedback, id, now);
  if (action === 'saveEducation') {
    saveEducation_(b.education, id);
    return portfolio_(id, true);
  }
  if (action === 'uploadFile') return uploadFile_(b, id);
  if (action === 'saveStudent') {
    var s = b.student || {};
    store_('Students', 'college_id', {
      college_id: id,
      college_email: student.college_email,
      full_name: required_(s.fullName, 'Full name', 120),
      branch: required_(s.branch, 'Branch', 120),
      year: required_(s.year, 'Year', 50),
      headline: clean_(s.headline, 180),
      about: clean_(s.about, 5000),
      photo_url: url_(s.photoUrl),
      created_at: student.created_at,
      updated_at: now,
    });
  } else if (action === 'saveSkills') {
    var skills = list_(b.skills, 100).map(function (s, i) {
      return {
        skill_id: uuid_(s.skillId),
        college_id: id,
        skill_name: required_(s.skillName, 'Skill', 60),
        sort_order: i,
      };
    });
    var names = {};
    var ids = {};
    skills.forEach(function (s) {
      var key = s.skill_name.toLowerCase();
      if (names[key] || ids[s.skill_id]) throw new Error('Skills must be unique.');
      names[key] = true;
      ids[s.skill_id] = true;
      var existing = find_('Skills', 'skill_id', s.skill_id);
      if (existing && existing.college_id !== id)
        throw new Error('Skill belongs to another student.');
    });
    var sheet = spreadsheet_().getSheetByName('Skills');
    var values = sheet.getDataRange().getValues();
    for (var i = values.length - 1; i >= 1; i--) if (values[i][1] === id) sheet.deleteRow(i + 1);
    skills.forEach(function (s) {
      store_('Skills', 'skill_id', s);
    });
  } else if (action === 'saveLinks') {
    var l = b.links || {};
    var publicEmail = clean_(l.publicEmail || '', 254).trim();
    var phone = clean_(l.phone || '', 30).trim();
    if (publicEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(publicEmail)) throw new Error('Enter a valid public contact email.');
    if (phone && !/^[+\d() .-]{6,30}$/.test(phone)) throw new Error('Enter a valid phone number.');
    if (l.showEmail !== undefined && typeof l.showEmail !== 'boolean') throw new Error('Invalid email visibility.');
    if (l.showPhone !== undefined && typeof l.showPhone !== 'boolean') throw new Error('Invalid phone visibility.');
    if (l.showEmail === true && !publicEmail) throw new Error('Add a public email before enabling visibility.');
    if (l.showPhone === true && !phone) throw new Error('Add a phone before enabling visibility.');
    var contactSheet = spreadsheet_().getSheetByName('Links');
    if (!contactSheet || contactSheet.getRange(1, 10, 1, 1).getValues()[0][0] !== 'show_phone') throw new Error('Run setupAscend to add public contact columns.');
    store_('Links', 'college_id', {
      college_id: id,
      linkedin: url_(l.linkedin),
      github: url_(l.github),
      leetcode: url_(l.leetcode),
      website: url_(l.website),
      other: url_(l.other),
      public_email: publicEmail,
      phone: phone,
      show_email: l.showEmail === true,
      show_phone: l.showPhone === true,
    });
  } else if (action === 'saveSettings') {
    var s = b.settings || {};
    if (
      ['Minimal', 'Modern', 'Developer'].indexOf(s.theme) < 0 ||
      ['Inter', 'Poppins', 'DM Sans'].indexOf(s.font) < 0 ||
      ACCENTS.indexOf(s.accent) < 0
    )
      throw new Error('Invalid portfolio style.');
    var order = list_(s.sectionOrder, 11);
    if (
      order.length !== SECTIONS.length ||
      new Set(order).size !== SECTIONS.length ||
      order.some(function (v) {
        return SECTIONS.indexOf(v) < 0;
      })
    )
      throw new Error('Section order must include each section once.');
    var hidden = list_(s.hiddenSections, 11);
    if (
      new Set(hidden).size !== hidden.length ||
      hidden.some(function (v) {
        return SECTIONS.indexOf(v) < 0;
      })
    )
      throw new Error('Invalid hidden sections.');
    if (typeof s.published !== 'boolean') throw new Error('Invalid publishing state.');
    if (s.published && !student.full_name) throw new Error('Add your name before publishing.');
    store_('PortfolioSettings', 'college_id', {
      college_id: id,
      theme: s.theme,
      font: s.font,
      accent: s.accent,
      section_order: JSON.stringify(order),
      hidden_sections: JSON.stringify(hidden),
      published: s.published,
      updated_at: now,
    });
  } else {
    var match = String(action).match(/^(add|update|delete)(Project|Experience|Activity)$/);
    if (!match) throw new Error('Unknown write operation.');
    var table =
      match[2] === 'Project' ? 'Projects' : match[2] === 'Experience' ? 'Experience' : 'Activities';
    var key = SCHEMA[table][0];
    if (match[1] === 'delete') {
      var deleted = find_(table, key, b.recordId);
      if (deleted && deleted.college_id === id && deleted.proof_url && deleted.is_public_proof) setProofSharing_(deleted.proof_url, id, false);
      delete_(table, key, required_(b.recordId, 'Record ID', 60), id);
    } else {
      var r = b.record || {};
      var camelKey = key.replace(/_([a-z])/g, function (_, c) {
        return c.toUpperCase();
      });
      var rid = uuid_(r[camelKey]);
      var old = find_(table, key, rid);
      if (old && old.college_id !== id) throw new Error('Record belongs to another student.');
      if (match[1] === 'update' && !old)
        throw new Error('Record no longer exists. Refresh your portfolio.');
      var data = {
        college_id: id,
        description: clean_(r.description, 5000),
        verification_status: 'self_reported',
        created_at: old ? old.created_at : now,
        updated_at: now,
      };
      data[key] = rid;
      if (table === 'Projects') {
        data.title = required_(r.title, 'Project title', 180);
        data.description = required_(r.description, 'Description', 5000);
        data.tech_stack = JSON.stringify([
          ...new Set(
            list_(r.techStack, 40)
              .map(function (v) {
                return clean_(v, 60);
              })
              .filter(Boolean),
          ),
        ]);
        data.github_url = url_(r.githubUrl);
        data.live_url = url_(r.liveUrl);
        data.image_url = url_(r.imageUrl);
      }
      if (table === 'Experience') {
        data.organization = required_(r.organization, 'Organization', 180);
        data.role = required_(r.role, 'Role', 180);
        data.start_date = date_(required_(r.startDate, 'Start date'), true);
        if (typeof r.currentlyWorking !== 'boolean')
          throw new Error('Invalid current experience flag.');
        data.currently_working = r.currentlyWorking;
        data.end_date = r.currentlyWorking ? '' : date_(required_(r.endDate, 'End date'), true);
        if (data.end_date && data.end_date < data.start_date)
          throw new Error('End date must follow start date.');
        data.proof_url = url_(r.proofUrl);
      }
      if (table === 'Activities') {
        data.category = required_(r.category, 'Category', 50);
        if (CATEGORIES.indexOf(data.category) < 0) throw new Error('Invalid activity category.');
        data.title = required_(r.title, 'Activity title', 180);
        data.organization = clean_(r.organization, 180);
        data.activity_date = date_(required_(r.activityDate, 'Activity date'), false);
        data.proof_url = url_(r.proofUrl);
      }
      if (table === 'Activities' || table === 'Experience') {
        if (r.isPublicProof !== undefined && typeof r.isPublicProof !== 'boolean') throw new Error('Invalid proof visibility.');
        data.is_public_proof = r.isPublicProof === true;
        if (data.is_public_proof && !data.proof_url) throw new Error('Upload a proof file before enabling public visibility.');
        if (data.proof_url) setProofSharing_(data.proof_url, id, data.is_public_proof);
        if (old && old.proof_url && old.proof_url !== data.proof_url && old.is_public_proof)
          setProofSharing_(old.proof_url, id, false);
      }
      // Identical retries retain manually assigned verification; edited evidence resets it.
      if (old) {
        var unchanged = SCHEMA[table]
          .filter(function (k) {
            return ['verification_status', 'created_at', 'updated_at', 'is_public_proof'].indexOf(k) < 0;
          })
          .every(function (k) {
            return String(old[k]) === String(data[k]);
          });
        if (unchanged) data.verification_status = old.verification_status;
      }
      store_(table, key, data);
    }
  }
  SpreadsheetApp.flush();
  return portfolio_(id, true);
}

// Resolve folders under the configured root only. Never accept a folder ID from a client.
function uploadRoot_() {
  var root = DriveApp.getFolderById(UPLOAD_ROOT_FOLDER_ID);
  if (root.getSharingAccess() !== DriveApp.Access.PRIVATE)
    throw new Error('Student Uploads must be restricted in Drive before uploading.');
  return root;
}
function childFolder_(parent, name) {
  var folders = parent.getFoldersByName(name);
  var folder = folders.hasNext() ? folders.next() : parent.createFolder(name);
  if (folder.getSharingAccess() !== DriveApp.Access.PRIVATE)
    throw new Error('Student upload folders must be restricted in Drive.');
  return folder;
}
function uploadFile_(b, id) {
  var category = required_(b.category, 'Upload category', 30);
  if (UPLOAD_CATEGORIES.indexOf(category) < 0) throw new Error('Invalid upload category.');
  var mime = required_(b.mimeType, 'File type', 50);
  var extensions = { 'image/jpeg': /\.jpe?g$/i, 'image/png': /\.png$/i, 'application/pdf': /\.pdf$/i };
  var name = required_(b.fileName, 'File name', 180).replace(/[^a-zA-Z0-9._ -]/g, '_');
  if (!extensions[mime] || !extensions[mime].test(name)) throw new Error('Use a JPG, PNG or PDF with the matching file extension.');
  var publicMedia = category === 'profile' || category === 'projects';
  if (publicMedia && mime === 'application/pdf') throw new Error('Profile and project images must be JPG or PNG.');
  var limit = (mime === 'application/pdf' ? 5 : 4) * 1024 * 1024;
  if (typeof b.base64 !== 'string' || !b.base64 || b.base64.length > Math.ceil(limit / 3) * 4 ||
      b.base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(b.base64)) throw new Error('Invalid or oversized upload.');
  var bytes;
  try { bytes = Utilities.base64Decode(b.base64); } catch (_) { throw new Error('Unable to decode file.'); }
  if (!bytes.length || bytes.length > limit) throw new Error('Images must be at most 4 MB; PDFs at most 5 MB.');
  var signature = bytes.slice(0, 8).map(function (v) { return (v + 256) % 256; });
  var valid = mime === 'image/jpeg' ? signature[0] === 255 && signature[1] === 216 && signature[2] === 255 :
    mime === 'image/png' ? signature.join(',') === '137,80,78,71,13,10,26,10' :
    signature.slice(0, 5).join(',') === '37,80,68,70,45';
  if (!valid) throw new Error('The file contents do not match the selected file type.');
  var studentFolder = childFolder_(uploadRoot_(), id);
  var folders = {};
  UPLOAD_CATEGORIES.forEach(function (c) { folders[c] = childFolder_(studentFolder, c); });
  // Stable upload ID makes a retry reuse a completed file. No base64 enters Sheets or Properties.
  var uploadId = uuid_(b.uploadId);
  var storedName = uploadId + '-' + name;
  var matches = folders[category].getFilesByName(storedName);
  var file = matches.hasNext() ? matches.next() : folders[category].createFile(Utilities.newBlob(bytes, mime, storedName));
  try {
    file.setSharing(publicMedia ? DriveApp.Access.ANYONE_WITH_LINK : DriveApp.Access.PRIVATE, DriveApp.Permission.VIEW);
  } catch (_) {
    throw new Error('Drive sharing failed. Check account sharing policies, then retry the same upload.');
  }
  return {
    fileId: file.getId(), viewUrl: file.getUrl(), fileName: name, mimeType: mime,
    public: publicMedia,
    mediaUrl: publicMedia ? mediaUrl_(file) : ''
  };
}

function mediaUrl_(file) {
  // Stable URL includes the resource key when Drive requires one. Do not store expiring API thumbnailLink values.
  var key = file.getResourceKey();
  return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(file.getId()) + '&sz=w1200' +
    (key ? '&resourcekey=' + encodeURIComponent(key) : '');
}
function ownedProofFile_(url, id) {
  var match = /^https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)(?:[\/?#]|$)/.exec(url);
  if (!match) return null;
  var file = DriveApp.getFileById(match[1]);
  var studentFolder = childFolder_(uploadRoot_(), id);
  var allowed = [];
  ['certificates', 'internships', 'achievements', 'other'].forEach(function (category) {
    var found = studentFolder.getFoldersByName(category);
    if (found.hasNext()) allowed.push(found.next().getId());
  });
  var parents = file.getParents();
  while (parents.hasNext()) if (allowed.indexOf(parents.next().getId()) >= 0) return file;
  throw new Error('This proof file is not in your student upload folders. Upload it through Ascend first.');
}
function setProofSharing_(url, id, isPublic) {
  var file = ownedProofFile_(url, id);
  if (!file) {
    if (isPublic) throw new Error('Public proofs must be Drive files uploaded through Ascend.');
    return; // Preserve legacy private external proof links without changing another service's permissions.
  }
  file.setSharing(isPublic ? DriveApp.Access.ANYONE_WITH_LINK : DriveApp.Access.PRIVATE, DriveApp.Permission.VIEW);
}
