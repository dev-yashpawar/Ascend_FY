import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Share2, Copy, QrCode, Download, X, Check, Loader2 } from 'lucide-react';
import { Feedback } from '../ui';
import { useLocation, useNavigate } from 'react-router-dom';
export function ShareControls({
  collegeId,
  published,
  compact = false,
}: {
  collegeId: string;
  published: boolean;
  compact?: boolean;
}) {
  const [qr, setQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const url = `${window.location.origin}/u/${collegeId}`;
  const location = useLocation();
  const navigate = useNavigate();
  async function copy() {
    setError('');
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError('Copy the portfolio URL from the field below.');
    }
  }
  async function share() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (navigator.share)
        await navigator.share({
          title: 'My Ascend Portfolio',
          text: 'Explore my projects, experience, and achievements.',
          url,
        });
      else await copy();
    } catch (e) {
      if ((e as Error).name !== 'AbortError')
        setError('Sharing was unavailable. Use Copy link or the QR code.');
    } finally {
      setBusy(false);
    }
  }
  function openQr() {
    setQr(true);
    dialogRef.current?.showModal();
  }
  return (
    <div className={`share-wrapper no-print ${compact ? 'share-compact' : ''}`}>
      <div className="share-controls">
        <button
          className="btn portfolio-primary"
          disabled={!published || busy}
          onClick={() => void share()}
        >
          {busy ? <Loader2 size={16} className="spin" /> : <Share2 size={16} />}Share portfolio
        </button>
        <button
          className="btn portfolio-secondary share-copy"
          disabled={!published}
          onClick={() => void copy()}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Link copied' : 'Copy link'}
        </button>
        <button
          className="btn portfolio-secondary icon-only"
          disabled={!published}
          aria-label="Show portfolio QR code"
          onClick={openQr}
        >
          <QrCode size={18} />
        </button>
        <button
          className="btn portfolio-secondary share-print"
          onClick={() => {
            if (location.pathname.startsWith('/u/')) window.print();
            else navigate(`/u/${collegeId}?print=1`);
          }}
        >
          <Download size={16} />
          {compact ? 'Resume' : 'Save as PDF'}
        </button>
      </div>
      {!published && (
        <small className="draft-share-note">
          Publish your portfolio from the builder to enable sharing.
        </small>
      )}
      <Feedback error={error} />
      {error && (
        <input
          aria-label="Portfolio link"
          value={url}
          readOnly
          onFocus={(e) => e.target.select()}
        />
      )}
      <dialog
        ref={dialogRef}
        className="qr-dialog"
        aria-labelledby={`qr-title-${collegeId}`}
        onClose={() => setQr(false)}
      >
        <button
          className="icon-btn qr-close"
          aria-label="Close QR code"
          onClick={() => dialogRef.current?.close()}
        >
          <X size={19} />
        </button>
        <span className="eyebrow">YOUR NEXT CONNECTION</span>
        <h2 id={`qr-title-${collegeId}`}>Scan. Connect. Ascend.</h2>
        <p>Your portfolio, one scan away.</p>
        {qr && <QRCodeSVG value={url} size={200} level="M" marginSize={4} />}
        <input
          aria-label="Shareable portfolio URL"
          readOnly
          value={url}
          onFocus={(e) => e.target.select()}
        />
        <button className="btn primary full" onClick={() => void copy()}>
          {copied ? <Check size={16} /> : <Copy size={16} />}{' '}
          {copied ? 'Copied' : 'Copy portfolio link'}
        </button>
      </dialog>
    </div>
  );
}
