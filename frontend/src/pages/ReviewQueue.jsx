import React, { useCallback, useEffect, useState } from 'react';
import { Check, CheckCircle2, Clock3, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { approveDiagnosis, disapproveDiagnosis, getPendingReviews } from '../api/client';

const nice = value => (value || '').replace(/___/g, ' · ').replace(/_/g, ' ');

export default function ReviewQueue() {
  const [queue, setQueue] = useState([]); const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(''); const [error, setError] = useState('');
  const load = useCallback(async (silent = false) => { if (!silent) setLoading(true); try { setQueue(await getPendingReviews()); setError(''); } catch (e) { setError(e.response?.data?.detail || 'Could not load the review queue.'); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); const timer = window.setInterval(() => load(true), 5000); return () => window.clearInterval(timer); }, [load]);
  async function decide(id, decision) { setBusy(id); setError(''); try { if (decision === 'approved') await approveDiagnosis(id); else await disapproveDiagnosis(id); setQueue(items => items.filter(item => item.id !== id)); } catch (e) { setError(e.response?.data?.detail || `Could not ${decision === 'approved' ? 'approve' : 'disapprove'} this diagnosis.`); await load(true); } finally { setBusy(''); } }
  return <section className="page-section">
    <div className="review-hero"><div><span className="eyebrow"><ShieldCheck size={14}/> AGRONOMIST WORKSPACE</span><h1>Diagnosis review</h1><p>Review low-confidence results. Approving or rejecting a scan updates the shared record for every farmer and agronomist.</p></div><div className="queue-count"><strong>{queue.length}</strong><span>waiting for review</span></div></div>
    <div className="section-heading review-heading"><div><span className="eyebrow">PENDING APPROVAL</span><h2>Submitted scans</h2></div><button onClick={load} className="refresh-button"><RefreshCw size={15}/> Refresh</button></div>
    {error && <div className="inline-error">{error}</div>}
    {loading && <div className="loading-state">Loading the review queue…</div>}
    {!loading && queue.length === 0 && <div className="empty-state"><span className="empty-icon green"><CheckCircle2/></span><h3>All caught up</h3><p>Scans enter this queue only when the model confidence is below 60%.</p></div>}
    <div className="review-list">{queue.map(item => <article className="review-card" key={item.id}><img className="review-photo" src={item.image_url || ''} alt="Farmer submitted leaf"/><div className="review-info"><span className="review-pending"><Clock3 size={13}/> Awaiting review</span><h3>{nice(item.predicted_class)}</h3><p>Submitted by <b>{item.farmer_name || 'Farmer'}</b>{item.farmer_email ? ` · ${item.farmer_email}` : ''}</p><div className="review-meta"><span>AI confidence <b>{Math.round((item.confidence || 0) * 100)}%</b></span><span>Severity <b>{item.severity || 'Not estimated'}</b></span><span>{item.created_at ? new Date(item.created_at).toLocaleString() : ''}</span></div></div><div className="review-actions"><button disabled={busy === item.id} onClick={() => decide(item.id, 'disapproved')} className="disapprove-button"><X size={15}/>{busy === item.id ? 'Saving…' : 'Disapprove'}</button><button disabled={busy === item.id} onClick={() => decide(item.id, 'approved')} className="approve-button"><Check size={16}/>{busy === item.id ? 'Saving…' : 'Approve diagnosis'}</button></div></article>)}</div>
  </section>;
}
