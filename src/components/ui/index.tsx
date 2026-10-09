import {
  useState,
  useEffect,
  type ReactNode,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { ArrowUpRight, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { safeUrl, initials } from '../../utils/profile';
import type { VerificationStatus } from '../../types';
import { Link } from 'react-router-dom';
export function Field({
  label,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const id = props.id || props.name || label.replace(/\s+/g, '-');
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {props.required && <span className="required"> *</span>}
      </label>
      <input
        {...props}
        id={id}
        name={props.name || id}
        onInput={
          props.onInput ||
          (['date', 'month'].includes(props.type || '')
            ? (e) => props.onChange?.({ ...e, target: e.currentTarget })
            : undefined)
        }
      />
      {hint && <small>{hint}</small>}
    </div>
  );
}
export function TextArea({
  label,
  hint,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string }) {
  const id = props.id || props.name || label.replace(/\s+/g, '-');
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {props.required && ' *'}
      </label>
      <textarea {...props} id={id} rows={props.rows || 4} />
      {hint && <small>{hint}</small>}
    </div>
  );
}
export function Avatar({
  name,
  url,
  size = 'normal',
}: {
  name: string;
  url?: string;
  size?: 'normal' | 'small' | 'large';
}) {
  const [failed, setFailed] = useState(false);
  const src = safeUrl(url || '');
  useEffect(() => setFailed(false), [src]);
  return (
    <span className={`avatar avatar-${size}`}>
      {src && !failed ? (
        <img src={src} alt={`${name}'s profile`} onError={() => setFailed(true)} />
      ) : (
        initials(name)
      )}
    </span>
  );
}
export function Badge({ status }: { status: VerificationStatus }) {
  return status === 'verified' ? (
    <span className="badge verified">
      <CheckCircle2 size={13} /> Institution Verified
    </span>
  ) : status === 'pending' ? (
    <span className="badge">Pending verification</span>
  ) : null;
}
export function ExternalLink({
  url,
  children,
  className = '',
}: {
  url: string;
  children: ReactNode;
  className?: string;
}) {
  const href = safeUrl(url);
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <ArrowUpRight size={14} />
    </a>
  ) : null;
}
export function Feedback({ error, success }: { error?: string; success?: string }) {
  return (
    <>
      {error && (
        <div className="feedback error" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="feedback success" role="status">
          <CheckCircle2 size={16} />
          {success}
        </div>
      )}
    </>
  );
}
export function Loading({ label = 'Loading your portfolio…' }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <Loader2 className="spin" size={24} />
      <p>{label}</p>
      <div className="skeleton" />
      <div className="skeleton short" />
    </div>
  );
}
export function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="empty-state">
      <h2>Let’s try that again</h2>
      <p>{message}</p>
      <button className="btn secondary" onClick={retry}>
        <RefreshCw size={16} />
        Retry
      </button>
      {message.toLowerCase().includes('session') && (
        <Link className="btn primary" to="/identity">
          Return to college identity
        </Link>
      )}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
