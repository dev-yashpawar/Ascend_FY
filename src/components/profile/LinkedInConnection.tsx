import { useEffect, useState } from 'react';
import { Linkedin, Loader2 } from 'lucide-react';
import { linkedin } from '../../services/linkedin';
import type { LinkedInConnection as Connection } from '../../types/linkedin';
import { Feedback } from '../ui';
export function LinkedInConnection() {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    linkedin
      .connection()
      .then((c) => {
        if (active) setConnection(c);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  async function action(disconnect: boolean) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (disconnect) {
        await linkedin.disconnect();
        setConnection(await linkedin.connection());
      } else window.location.assign((await linkedin.connect()).authorizationUrl);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card settings-card">
      <h2>LinkedIn sharing</h2>
      <p className="form-description">
        {connection?.connected
          ? `Connected as ${connection.name}.`
          : 'Connect your own account to share achievements.'}{' '}
        Nothing is published when you save an activity.
      </p>
      <Feedback error={error} />
      <button className="btn secondary" disabled={busy} onClick={() => void action(false)}>
        {busy ? <Loader2 className="spin" size={16} /> : <Linkedin size={16} />}{' '}
        {connection?.connected ? 'Reconnect LinkedIn' : 'Connect LinkedIn'}
      </button>
      {connection?.status && connection.status !== 'disconnected' && (
        <button className="btn secondary" disabled={busy} onClick={() => void action(true)}>
          Disconnect LinkedIn
        </button>
      )}
    </section>
  );
}
