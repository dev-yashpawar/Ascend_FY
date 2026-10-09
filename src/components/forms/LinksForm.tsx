import { useState } from 'react';
import { Loader2, Link2 } from 'lucide-react';
import { Field, Feedback } from '../ui';
import { usePortfolio } from '../../hooks/usePortfolio';
import { api } from '../../services/api';
import { safeUrl } from '../../utils/profile';
import type { ProfessionalLinks } from '../../types';
export function LinksForm({
  onSaved,
  label = 'Save links',
}: {
  onSaved?: () => void;
  label?: string;
}) {
  const { portfolio, setPortfolio } = usePortfolio();
  const [links, setLinks] = useState({
    publicEmail: '',
    phone: '',
    showEmail: false,
    showPhone: false,
    ...portfolio!.links,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError('');
    if (
      ['linkedin', 'github', 'leetcode', 'website', 'other'].some((k) => {
        const value = links[k as keyof ProfessionalLinks];
        return value && !safeUrl(String(value));
      })
    ) {
      setError('Use complete http or https URLs for your professional links.');
      return;
    }
    if (
      (links.publicEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(links.publicEmail)) ||
      (links.showEmail && !links.publicEmail)
    ) {
      setError('Enter a valid public contact email before showing it publicly.');
      return;
    }
    if (
      (links.phone && !/^[+\d() .-]{6,30}$/.test(links.phone)) ||
      (links.showPhone && !links.phone)
    ) {
      setError('Enter a valid phone number before showing it publicly.');
      return;
    }
    setBusy(true);
    try {
      setPortfolio(await api.saveLinks(links));
      setSuccess('Professional links saved.');
      onSaved?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="editor-form" onSubmit={save}>
      <p className="form-description">
        Where else can people find your work? All links are optional.
      </p>
      {(
        [
          ['linkedin', 'LinkedIn', 'https://linkedin.com/in/your-name'],
          ['github', 'GitHub', 'https://github.com/your-name'],
          ['leetcode', 'LeetCode', 'https://leetcode.com/u/your-name'],
          ['website', 'Personal Website', 'https://your-website.com'],
          ['other', 'Other Link', 'https://…'],
        ] as const
      ).map(([key, name, placeholder]) => (
        <Field
          key={key}
          label={name}
          placeholder={placeholder}
          type="url"
          value={links[key]}
          onChange={(e) => {
            setLinks((p) => ({ ...p, [key as keyof ProfessionalLinks]: e.target.value }));
            setSuccess('');
          }}
          maxLength={2000}
        />
      ))}
      <fieldset className="public-contact-fields">
        <legend>Public contact details</legend>
        <p className="form-description">
          Choose how visitors can contact you. Your college login email stays private.
        </p>
        <Field
          label="Public contact email"
          type="email"
          value={links.publicEmail || ''}
          maxLength={254}
          onChange={(e) => {
            setLinks((p) => ({ ...p, publicEmail: e.target.value }));
            setSuccess('');
          }}
        />
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={links.showEmail === true}
            disabled={busy}
            onChange={(e) => setLinks((p) => ({ ...p, showEmail: e.target.checked }))}
          />
          Show email publicly
        </label>
        <Field
          label="Phone (optional)"
          type="tel"
          value={links.phone || ''}
          maxLength={30}
          onChange={(e) => {
            setLinks((p) => ({ ...p, phone: e.target.value }));
            setSuccess('');
          }}
        />
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={links.showPhone === true}
            disabled={busy}
            onChange={(e) => setLinks((p) => ({ ...p, showPhone: e.target.checked }))}
          />
          Show phone publicly
        </label>
      </fieldset>
      <Feedback error={error} success={success} />
      <button className="btn primary" disabled={busy}>
        {busy ? <Loader2 className="spin" size={16} /> : <Link2 size={16} />}{' '}
        {busy ? 'Saving…' : label}
      </button>
    </form>
  );
}
