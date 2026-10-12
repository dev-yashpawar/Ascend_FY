import { UploadField } from './UploadField';
import { useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import type { Student } from '../../types';
import { Field, TextArea, Feedback, Avatar } from '../ui';
import { api } from '../../services/api';
import { usePortfolio } from '../../hooks/usePortfolio';
import { safeUrl } from '../../utils/profile';
export function ProfileForm({
  onSaved,
  label = 'Save profile',
}: {
  onSaved?: () => void;
  label?: string;
}) {
  const { portfolio, setPortfolio } = usePortfolio();
  const [student, setStudent] = useState<Student>(portfolio!.student);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const update = (key: keyof Student, value: string) => {
    setStudent((p) => ({ ...p, [key]: value }));
    setSuccess('');
  };
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy || uploading) return;
    setError('');
    if (student.photoUrl && !safeUrl(student.photoUrl)) {
      setError('Use an http or https URL for your photo.');
      return;
    }
    setBusy(true);
    try {
      setPortfolio(await api.saveStudent(student));
      setSuccess('Profile saved.');
      onSaved?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save} className="editor-form">
      <div className="photo-row">
        <Avatar name={student.fullName} url={student.photoUrl} />
        <div>
          <strong>Your professional introduction</strong>
          <p>A photo is optional. Your initials look good, too.</p>
        </div>
      </div>
      <div className="form-grid">
        <Field
          label="Full name"
          value={student.fullName}
          onChange={(e) => update('fullName', e.target.value)}
          required
          maxLength={120}
          autoComplete="name"
        />
        <Field label="College ID" value={student.collegeId} readOnly />
        <Field label="Login email" value={student.collegeEmail} readOnly />
        <div className="field">
          <label htmlFor="branch">Branch *</label>
          <select
            id="branch"
            value={student.branch}
            onChange={(e) => update('branch', e.target.value)}
            required
          >
            <option value="">Select your branch</option>
            {[
              'Information Technology',
              'Computer Engineering',
              'Electronics & Telecommunication',
              'Mechanical Engineering',
              'Civil Engineering',
              'Electrical Engineering',
              'Other',
            ].map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="year">Year of study *</label>
          <select
            id="year"
            value={student.year}
            onChange={(e) => update('year', e.target.value)}
            required
          >
            <option value="">Select your year</option>
            {['1st Year', '2nd Year', '3rd Year', '4th Year', 'Postgraduate', 'Alumni'].map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </div>
        <Field
          label="Profile photo URL"
          type="url"
          placeholder="https://… (optional)"
          value={student.photoUrl}
          onChange={(e) => update('photoUrl', e.target.value)}
        />
      </div>
      <UploadField
        collegeId={student.collegeId}
        category="profile"
        label="Upload profile photo"
        disabled={busy}
        onBusyChange={setUploading}
        onUploaded={(url) => update('photoUrl', url)}
      />
      <Field
        label="Headline"
        placeholder="Full Stack Developer | Information Technology Student"
        value={student.headline}
        onChange={(e) => update('headline', e.target.value)}
        maxLength={180}
        hint="A short introduction to what you do and what excites you."
      />
      <TextArea
        label="About you"
        placeholder="Tell us what you’re curious about, what you’re working on, and where you want to go…"
        value={student.about}
        onChange={(e) => update('about', e.target.value)}
        maxLength={5000}
        hint={`${student.about.length} characters · 200–600 is a great starting point.`}
      />
      <Feedback error={error} success={success} />
      <button className="btn primary" disabled={busy || uploading}>
        {busy ? <Loader2 size={16} className="spin" /> : <Check size={16} />}{' '}
        {busy ? 'Saving…' : label}
      </button>
    </form>
  );
}
