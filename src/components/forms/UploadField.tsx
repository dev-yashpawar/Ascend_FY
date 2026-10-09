import { useId, useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { api } from '../../services/ascendApi';
import type { UploadCategory } from '../../types';
import { fileBase64, validateUpload } from '../../utils/uploads';
import { Feedback, ExternalLink } from '../ui';
export function UploadField({
  collegeId,
  category,
  label,
  disabled = false,
  onUploaded,
  onBusyChange,
}: {
  collegeId: string;
  category: UploadCategory;
  label: string;
  disabled?: boolean;
  onUploaded: (url: string) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewUrl, setViewUrl] = useState('');
  const uploadId = useRef('');
  const pending = useRef(false);
  const publicMedia = category === 'profile' || category === 'projects';
  async function upload(selected = file, id = uploadId.current) {
    if (!selected || pending.current || disabled) return;
    pending.current = true;
    setBusy(true);
    onBusyChange(true);
    setError('');
    setSuccess('');
    try {
      const base64 = await fileBase64(selected);
      const result = await api.uploadFile({
        collegeId,
        category,
        fileName: selected.name,
        mimeType: selected.type,
        base64,
        uploadId: id,
      });
      onUploaded(publicMedia ? result.mediaUrl : result.viewUrl);
      setViewUrl(result.viewUrl);
      setSuccess('Uploaded \u2713 - save this form to attach the file to your record.');
      onBusyChange(false);
    } catch (e) {
      setError('Upload failed: ' + (e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="field upload-field">
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        disabled={busy || disabled}
        accept={publicMedia ? '.jpg,.jpeg,.png' : '.jpg,.jpeg,.png,.pdf'}
        onChange={(e) => {
          const selected = e.target.files?.[0] || null;
          const issue = selected ? validateUpload(selected, publicMedia) : '';
          setError(issue);
          setSuccess('');
          setViewUrl('');
          setFile(issue ? null : selected);
          uploadId.current = crypto.randomUUID();
          onBusyChange(!!selected && !issue);
          if (selected && !issue) void upload(selected, uploadId.current);
        }}
      />
      <small>
        {publicMedia
          ? 'JPG / PNG up to 4 MB. Uploaded images are public portfolio media.'
          : 'JPG / PNG up to 4 MB, PDF up to 5 MB. Proof files are private unless you explicitly enable public visibility when saving the record.'}
      </small>
      <button
        type="button"
        className="btn secondary"
        disabled={!file || busy || disabled || !!success}
        onClick={() => void upload()}
      >
        {busy ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}
        {busy ? 'Uploading...' : error && file ? 'Retry upload' : 'Upload file'}
      </button>
      {file && !busy && (
        <button
          type="button"
          className="btn secondary small"
          disabled={disabled}
          onClick={() => {
            if (inputRef.current) inputRef.current.value = '';
            setFile(null);
            setError('');
            setSuccess('');
            setViewUrl('');
            onBusyChange(false);
          }}
        >
          Remove selected file
        </button>
      )}
      <Feedback error={error} success={success} />
      {viewUrl && <ExternalLink url={viewUrl}>Open uploaded file in Drive</ExternalLink>}
    </div>
  );
}
