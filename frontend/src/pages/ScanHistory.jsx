import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, ScanLine, XCircle } from 'lucide-react';
import { getMyScans } from '../api/client';

export default function ScanHistory() {
  const [scans, setScans] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    const refresh = () => getMyScans().then(setScans).catch(e => setError(e.response?.data?.detail || 'Could not load scans.'));
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
  }, []);
  return <section className="page-section"><div className="section-heading"><div><span className="eyebrow">FARMER WORKSPACE</span><h2>My scan history</h2><p>Every image you have submitted, with its current review status.</p></div></div>
    {error && <div className="inline-error">{error}</div>}
    {scans.length === 0 && !error && <div className="empty-state"><span className="empty-icon"><ScanLine/></span><h3>No scans yet</h3><p>Your submitted diagnoses will appear here.</p></div>}
    <div className="scan-list">{scans.map(s => { const status = s.review_status; return <article className="scan-row" key={s.id}><img src={s.image_url || ''} alt="Submitted crop"/><div className="scan-copy"><strong>{(s.approved_class || s.predicted_class).replace(/___/g, ' · ').replace(/_/g, ' ')}</strong><small>{new Date(s.created_at).toLocaleString()}{s.reviewed_by ? ` · reviewed by ${s.reviewed_by}` : ''}{status === 'disapproved' ? ' · please submit a new scan' : ''}</small></div><div className="confidence"><b>{Math.round((s.confidence || 0) * 100)}%</b><small>AI confidence</small></div><span className={`review-pill ${status === 'approved' ? 'approved' : status === 'pending' ? 'pending' : status === 'disapproved' ? 'disapproved' : 'not-required'}`}>{status === 'approved' ? <><CheckCircle2 size={14}/> Approved</> : status === 'pending' ? <><Clock3 size={14}/> Pending review</> : status === 'disapproved' ? <><XCircle size={14}/> Diagnosis rejected</> : <><CheckCircle2 size={14}/> Review not requested</>}</span></article>; })}</div>
  </section>;
}
