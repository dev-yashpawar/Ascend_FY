import { useState } from 'react';
import { GraduationCap, Loader2, Pencil, Trash2, Plus } from 'lucide-react';
import { usePortfolio } from '../hooks/usePortfolio';
import { api } from '../services/api';
import { educationLevels, type EducationRecord } from '../types';
import { educationLabel, educationScore, validateEducation } from '../utils/education';
import { PageHeading } from '../components/layout/Layout';
import { Field, Feedback } from '../components/ui';
import './education.css';

function blank(collegeId: string): EducationRecord {
  return {
    educationId: '',
    collegeId,
    level: '10th',
    institution: '',
    board: '',
    academicYear: '',
    engineeringYear: '1',
    gradingType: 'Percentage',
    score: '',
    scale: '100',
    showPublic: false,
  };
}
export function EducationPage() {
  const { portfolio, setPortfolio } = usePortfolio();
  const id = portfolio!.student.collegeId;
  const records = portfolio!.education || [];
  const [draft, setDraft] = useState<EducationRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleting, setDeleting] = useState('');
  function change(patch: Partial<EducationRecord>) {
    setDraft((r) => (r ? { ...r, ...patch } : r));
    setError('');
    setSuccess('');
  }
  async function persist(next: EducationRecord[]) {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      setPortfolio(await api.saveEducation(id, next));
      setSuccess('Education saved.');
      setDraft(null);
      setDeleting('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Education could not be saved. Please retry.');
    } finally {
      setBusy(false);
    }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft || busy) return;
    const r = {
      ...draft,
      institution: draft.institution.trim(),
      board: draft.board.trim(),
      academicYear: draft.academicYear.trim(),
      score: draft.score.trim(),
    };
    const issue = validateEducation(r);
    if (issue) {
      setError(issue);
      return;
    }
    if (
      records.some(
        (other) =>
          other.educationId !== r.educationId &&
          other.level === r.level &&
          (r.level !== 'Engineering' || other.engineeringYear === r.engineeringYear),
      )
    ) {
      setError('This result already exists. Edit the existing entry instead.');
      return;
    }
    r.educationId ||= crypto.randomUUID();
    setDraft(r);
    const next = records.some((other) => other.educationId === r.educationId)
      ? records.map((other) => (other.educationId === r.educationId ? r : other))
      : [...records, r];
    await persist(next);
  }
  return (
    <>
      <PageHeading
        eyebrow="YOUR ACADEMIC JOURNEY"
        title="Education."
        description="Add your 10th, 12th, diploma, and year-wise engineering results."
        action={
          <button
            className="btn primary"
            disabled={busy || !!draft || records.length >= 7}
            onClick={() => {
              setDraft(blank(id));
              setError('');
              setSuccess('');
              setDeleting('');
            }}
          >
            <Plus size={16} /> Add education
          </button>
        }
      />
      <Feedback error={error} success={success} />
      {draft && (
        <form className="card education-editor" onSubmit={(e) => void save(e)} aria-busy={busy}>
          <h2>
            {records.some((r) => r.educationId === draft.educationId)
              ? 'Edit education'
              : 'Add education'}
          </h2>
          <fieldset disabled={busy}>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="education-level">Education level</label>
                <select
                  id="education-level"
                  value={draft.level}
                  onChange={(e) => change({ level: e.target.value as EducationRecord['level'] })}
                >
                  {educationLevels.map((level) => (
                    <option key={level}>{level}</option>
                  ))}
                </select>
              </div>
              {draft.level === 'Engineering' && (
                <div className="field">
                  <label htmlFor="engineering-year">Engineering year</label>
                  <select
                    id="engineering-year"
                    value={draft.engineeringYear}
                    onChange={(e) => change({ engineeringYear: e.target.value })}
                  >
                    {['1', '2', '3', '4'].map((year) => (
                      <option key={year} value={year}>
                        Year {year}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <Field
                label="School / college name"
                required
                maxLength={200}
                value={draft.institution}
                onChange={(e) => change({ institution: e.target.value })}
              />
              <Field
                label="Board / university (optional)"
                maxLength={200}
                value={draft.board}
                onChange={(e) => change({ board: e.target.value })}
              />
              <Field
                label="Academic year (optional)"
                placeholder="2025–2026"
                maxLength={40}
                value={draft.academicYear}
                onChange={(e) => change({ academicYear: e.target.value })}
              />
              <div className="field">
                <label htmlFor="grading-type">Grading type</label>
                <select
                  id="grading-type"
                  value={draft.gradingType}
                  onChange={(e) =>
                    change({
                      gradingType: e.target.value as EducationRecord['gradingType'],
                      scale: e.target.value === 'Percentage' ? '100' : '10',
                      score: '',
                    })
                  }
                >
                  <option>Percentage</option>
                  <option>CGPA</option>
                </select>
              </div>
              {draft.gradingType === 'CGPA' && (
                <div className="field">
                  <label htmlFor="cgpa-scale">CGPA scale</label>
                  <select
                    id="cgpa-scale"
                    value={draft.scale}
                    onChange={(e) => change({ scale: e.target.value })}
                  >
                    <option value="10">Out of 10</option>
                    <option value="4">Out of 4</option>
                  </select>
                </div>
              )}
              <Field
                label={
                  draft.gradingType === 'Percentage' ? 'Percentage (optional)' : 'CGPA (optional)'
                }
                inputMode="decimal"
                maxLength={6}
                value={draft.score}
                placeholder={draft.gradingType === 'Percentage' ? '85.50' : '8.75'}
                hint="Leave blank if the result is not available yet."
                onChange={(e) => change({ score: e.target.value })}
              />
            </div>
            <label className="checkbox-label education-visibility">
              <input
                type="checkbox"
                checked={draft.showPublic}
                onChange={(e) => change({ showPublic: e.target.checked })}
              />
              Show this education record and result on my public portfolio
            </label>
            <div className="education-actions">
              <button className="btn primary" type="submit">
                {busy && <Loader2 className="spin" size={16} />}
                {busy ? 'Saving…' : 'Save education'}
              </button>
              <button
                className="btn secondary"
                type="button"
                onClick={() => {
                  setDraft(null);
                  setError('');
                }}
              >
                Cancel
              </button>
            </div>
          </fieldset>
        </form>
      )}
      <div className="education-records">
        {records.length
          ? records.map((r) => (
              <article className="card education-record" key={r.educationId}>
                <GraduationCap size={22} aria-hidden="true" />
                <div className="education-record-copy">
                  <span className="eyebrow">{educationLabel(r)}</span>
                  <h2>{r.institution}</h2>
                  <p>{[r.board, r.academicYear].filter(Boolean).join(' · ')}</p>
                  <strong>{educationScore(r)}</strong>
                  <small>
                    {r.showPublic
                      ? 'Shown on public portfolio'
                      : 'Private · only visible to you and the institution'}
                  </small>
                </div>
                <div className="education-actions">
                  <button
                    className="icon-btn"
                    aria-label={`Edit ${educationLabel(r)}`}
                    disabled={busy || !!draft}
                    onClick={() => {
                      setDraft({ ...r });
                      setError('');
                      setSuccess('');
                      setDeleting('');
                    }}
                  >
                    <Pencil size={17} />
                  </button>
                  <button
                    className="icon-btn"
                    aria-label={`Delete ${educationLabel(r)}`}
                    disabled={busy || !!draft}
                    onClick={() => {
                      setDeleting(r.educationId);
                      setError('');
                    }}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
                {deleting === r.educationId && (
                  <div className="education-delete">
                    <p>Delete this education record?</p>
                    <button
                      className="btn secondary"
                      disabled={busy}
                      onClick={() =>
                        void persist(records.filter((other) => other.educationId !== r.educationId))
                      }
                    >
                      {busy ? 'Deleting…' : 'Confirm delete'}
                    </button>
                    <button
                      className="btn secondary"
                      disabled={busy}
                      onClick={() => setDeleting('')}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </article>
            ))
          : !draft && (
              <section className="card education-empty">
                <GraduationCap size={30} />
                <h2>Your academic journey starts here.</h2>
                <p>
                  Add your school results, diploma, or an engineering year. Only records you choose
                  to share appear publicly.
                </p>
              </section>
            )}
      </div>
    </>
  );
}
