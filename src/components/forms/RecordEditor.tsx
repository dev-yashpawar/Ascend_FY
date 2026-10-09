import { UploadField } from './UploadField';
import { proofCategory } from '../../utils/uploads';
import { useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  FolderGit2,
  BriefcaseBusiness,
  Award,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import {
  categories,
  type Activity,
  type Project,
  type Experience,
  type RecordKind,
  type StudentRecord,
} from '../../types';
import { usePortfolio } from '../../hooks/usePortfolio';
import { api } from '../../services/api';
import { Badge, Feedback, Field, TextArea, EmptyState, ExternalLink } from '../ui';
import { dateLabel, recordId, safeUrl } from '../../utils/profile';
const config = {
  project: { title: 'project', plural: 'projects', icon: FolderGit2 },
  experience: { title: 'experience', plural: 'experiences', icon: BriefcaseBusiness },
  activity: { title: 'activity', plural: 'activities', icon: Award },
} as const;
function blank(kind: RecordKind, collegeId: string): StudentRecord {
  const now = new Date().toISOString();
  const base = {
    collegeId,
    verificationStatus: 'self_reported' as const,
    createdAt: now,
    updatedAt: now,
    description: '',
  };
  if (kind === 'project')
    return {
      ...base,
      projectId: crypto.randomUUID(),
      title: '',
      techStack: [],
      githubUrl: '',
      liveUrl: '',
      imageUrl: '',
    };
  if (kind === 'experience')
    return {
      ...base,
      experienceId: crypto.randomUUID(),
      organization: '',
      role: '',
      startDate: '',
      endDate: '',
      currentlyWorking: false,
      proofUrl: '',
      isPublicProof: false,
    };
  return {
    ...base,
    activityId: crypto.randomUUID(),
    category: 'Certification',
    title: '',
    organization: '',
    activityDate: '',
    proofUrl: '',
    isPublicProof: false,
  };
}
export function RecordEditor({ kind, onContinue }: { kind: RecordKind; onContinue?: () => void }) {
  const { portfolio, setPortfolio } = usePortfolio();
  const cfg = config[kind];
  const items = portfolio![cfg.plural] as StudentRecord[];
  const [draft, setDraft] = useState<StudentRecord | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const Icon = cfg.icon;
  function update(key: string, value: unknown) {
    setDraft((d) => (d ? ({ ...d, [key]: value } as StudentRecord) : null));
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft || busy || uploading) return;
    setError('');
    for (const [key, value] of Object.entries(draft)) {
      if (key.endsWith('Url') && value && !safeUrl(String(value))) {
        setError('Links must be complete http or https URLs.');
        return;
      }
    }
    if (kind === 'experience') {
      const d = draft as Experience;
      if (!d.currentlyWorking && d.endDate && d.endDate < d.startDate) {
        setError('The end date must be after the start date.');
        return;
      }
    }
    setBusy(true);
    try {
      setPortfolio(await api.saveRecord(kind, draft, editing));
      setDraft(null);
      setSuccess(`${cfg.title[0].toUpperCase() + cfg.title.slice(1)} saved.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    if (deleting) return;
    setDeleting(id);
    setError('');
    try {
      setPortfolio(await api.deleteRecord(kind, portfolio!.student.collegeId, id));
      setConfirm('');
      setSuccess(`${cfg.title[0].toUpperCase() + cfg.title.slice(1)} removed.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeleting('');
    }
  }
  return (
    <div className="records-editor">
      <Feedback error={!draft ? error : ''} success={success} />
      {draft ? (
        <form className="record-form card" onSubmit={save}>
          <div className="record-form-heading">
            <h3>
              {editing ? 'Edit' : 'Add'} {cfg.title}
            </h3>
            <button
              type="button"
              className="icon-btn"
              aria-label="Close editor"
              disabled={busy || uploading}
              onClick={() => {
                setDraft(null);
                setError('');
              }}
            >
              <X size={19} />
            </button>
          </div>
          {kind === 'project' ? (
            <>
              <Field
                label="Project title"
                value={(draft as Project).title}
                onChange={(e) => update('title', e.target.value)}
                required
                maxLength={180}
              />
              <TextArea
                label="Description"
                value={draft.description}
                onChange={(e) => update('description', e.target.value)}
                required
                maxLength={5000}
                placeholder="What did you build? What problem did it solve?"
              />
              <Field
                label="Technology stack"
                value={(draft as Project).techStack.join(', ')}
                onChange={(e) =>
                  update(
                    'techStack',
                    e.target.value.split(',').map((s) => s.trim()),
                  )
                }
                hint="Separate technologies with commas, e.g. React, Node.js, MongoDB"
              />
              <div className="form-grid">
                <Field
                  label="GitHub URL"
                  type="url"
                  value={(draft as Project).githubUrl}
                  onChange={(e) => update('githubUrl', e.target.value)}
                />
                <Field
                  label="Live demo URL"
                  type="url"
                  value={(draft as Project).liveUrl}
                  onChange={(e) => update('liveUrl', e.target.value)}
                />
              </div>
              <Field
                label="Project image URL"
                type="url"
                value={(draft as Project).imageUrl}
                onChange={(e) => update('imageUrl', e.target.value)}
              />
            </>
          ) : kind === 'experience' ? (
            <>
              <div className="form-grid">
                <Field
                  label="Organization"
                  value={(draft as Experience).organization}
                  onChange={(e) => update('organization', e.target.value)}
                  required
                  maxLength={180}
                />
                <Field
                  label="Role"
                  value={(draft as Experience).role}
                  onChange={(e) => update('role', e.target.value)}
                  required
                  maxLength={180}
                />
                <Field
                  label="Start date"
                  type="month"
                  value={(draft as Experience).startDate}
                  onChange={(e) => update('startDate', e.target.value)}
                  required
                />
                <Field
                  label="End date"
                  type="month"
                  value={(draft as Experience).endDate}
                  onChange={(e) => update('endDate', e.target.value)}
                  disabled={(draft as Experience).currentlyWorking}
                  required={!(draft as Experience).currentlyWorking}
                />
              </div>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={(draft as Experience).currentlyWorking}
                  onChange={(e) => {
                    update('currentlyWorking', e.target.checked);
                    if (e.target.checked) update('endDate', '');
                  }}
                />
                I currently work here
              </label>
              <TextArea
                label="Description"
                value={draft.description}
                onChange={(e) => update('description', e.target.value)}
                maxLength={5000}
                placeholder="What did you contribute or learn?"
              />
              <Field
                label="Proof / certificate URL"
                type="url"
                value={(draft as Experience).proofUrl}
                onChange={(e) => update('proofUrl', e.target.value)}
                hint="Optional. Proof is visible only in your editing data and to authorized Drive users."
              />
            </>
          ) : (
            <>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="activity-category">Category *</label>
                  <select
                    id="activity-category"
                    disabled={uploading}
                    value={(draft as Activity).category}
                    onChange={(e) => update('category', e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <Field
                  label="Activity date"
                  type="date"
                  value={(draft as Activity).activityDate}
                  onChange={(e) => update('activityDate', e.target.value)}
                  required
                />
              </div>
              <Field
                label="Title"
                value={(draft as Activity).title}
                onChange={(e) => update('title', e.target.value)}
                required
                maxLength={180}
              />
              <Field
                label="Organization"
                value={(draft as Activity).organization}
                onChange={(e) => update('organization', e.target.value)}
                maxLength={180}
              />
              <TextArea
                label="Description"
                value={draft.description}
                onChange={(e) => update('description', e.target.value)}
                maxLength={5000}
                placeholder="Tell the story behind this achievement."
              />
              <Field
                label="Proof / certificate URL"
                type="url"
                value={(draft as Activity).proofUrl}
                onChange={(e) => update('proofUrl', e.target.value)}
              />
            </>
          )}
          {kind !== 'project' && (
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={!!(draft as Activity | Experience).isPublicProof}
                disabled={busy || uploading}
                onChange={(e) => update('isPublicProof', e.target.checked)}
              />
              Show this certificate/proof on my public portfolio
            </label>
          )}
          <UploadField
            key={kind === 'activity' ? (draft as Activity).category : kind}
            collegeId={portfolio!.student.collegeId}
            category={
              kind === 'project'
                ? 'projects'
                : kind === 'experience'
                  ? 'internships'
                  : proofCategory((draft as Activity).category)
            }
            label={kind === 'project' ? 'Upload project image' : 'Upload supporting proof'}
            disabled={busy}
            onBusyChange={setUploading}
            onUploaded={(url) => update(kind === 'project' ? 'imageUrl' : 'proofUrl', url)}
          />
          <p className="record-note">
            This record will be self reported. Only your institution can mark it verified.
          </p>
          <Feedback error={error} />
          <div className="button-row">
            <button className="btn primary" disabled={busy || uploading}>
              {busy ? <Loader2 className="spin" size={16} /> : <Plus size={16} />}{' '}
              {busy ? 'Saving…' : `Save ${cfg.title}`}
            </button>
            <button
              className="btn secondary"
              type="button"
              disabled={busy || uploading}
              onClick={() => {
                setDraft(null);
                setError('');
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="record-list">
            {items.map((item) => {
              const id = recordId(item);
              return (
                <article className="record-list-card" key={id}>
                  <span
                    className={`record-icon ${kind === 'activity' ? 'cat-' + (item as Activity).category.toLowerCase().replace(/ /g, '-') : ''}`}
                  >
                    <Icon size={21} />
                  </span>
                  <div className="record-details">
                    <div className="record-title">
                      <h3>{'role' in item ? item.role : item.title}</h3>
                      <Badge status={item.verificationStatus} />
                    </div>
                    <p>
                      {'organization' in item
                        ? item.organization
                        : item.techStack.filter(Boolean).join(' · ')}
                    </p>
                    <p className="record-description">{item.description}</p>
                    {'activityDate' in item && (
                      <small>
                        {item.category} · {dateLabel(item.activityDate)}
                      </small>
                    )}
                    {'startDate' in item && (
                      <small>
                        {dateLabel(item.startDate)} –{' '}
                        {item.currentlyWorking ? 'Present' : dateLabel(item.endDate)}
                      </small>
                    )}
                    {'proofUrl' in item && item.proofUrl && (
                      <ExternalLink url={item.proofUrl} className="proof-link">
                        {'category' in item && item.category === 'Certification'
                          ? 'View Certificate'
                          : 'View Proof'}
                      </ExternalLink>
                    )}
                    {confirm === id && (
                      <div className="delete-confirm">
                        <span>Remove this {cfg.title}?</span>
                        <button
                          className="btn danger small"
                          disabled={!!deleting}
                          onClick={() => void remove(id)}
                        >
                          {deleting === id ? 'Removing…' : 'Remove'}
                        </button>
                        <button
                          className="btn secondary small"
                          disabled={!!deleting}
                          onClick={() => setConfirm('')}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="record-actions">
                    <button
                      className="icon-btn"
                      aria-label={`Edit ${'role' in item ? item.role : item.title}`}
                      onClick={() => {
                        setDraft(structuredClone(item));
                        setEditing(true);
                        setError('');
                        setSuccess('');
                      }}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="icon-btn"
                      aria-label={`Delete ${'role' in item ? item.role : item.title}`}
                      onClick={() => setConfirm(id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          {!items.length && (
            <EmptyState
              title={`Your ${cfg.plural} start here`}
              description={
                kind === 'project'
                  ? 'A class project, a personal build, or a team effort — show what you’ve made.'
                  : kind === 'experience'
                    ? 'Internships, part-time work, or research — every experience adds to your story.'
                    : 'Certificates, competitions, volunteering, and all the moments beyond the classroom.'
              }
            />
          )}
          <button
            className="btn secondary"
            onClick={() => {
              setDraft(blank(kind, portfolio!.student.collegeId));
              setEditing(false);
              setError('');
              setSuccess('');
            }}
          >
            <Plus size={17} />
            Add {cfg.title}
          </button>
          {onContinue && (
            <div className="wizard-save">
              <button className="btn primary" onClick={onContinue}>
                Save & Continue
                <ArrowRight size={16} />
              </button>
              <small>Each record saves as you add it.</small>
            </div>
          )}
        </>
      )}
    </div>
  );
}
