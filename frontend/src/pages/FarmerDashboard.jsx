import React, { useEffect, useState } from 'react';
import { ArrowUpRight, CheckCircle2, Clock3, Leaf, Plus, ScanLine, Sprout, XCircle } from 'lucide-react';
import { getMyScans } from '../api/client';

const displayClass = value => (value || '').replace(/___/g, ' · ').replace(/_/g, ' ');

export default function FarmerDashboard({ user, onNewScan, onViewHistory }) {
  const [scans, setScans] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    const refresh = () => getMyScans().then(setScans).catch(e => setError(e.response?.data?.detail || 'Could not load your scans.'));
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
  }, []);
  const approved = scans.filter(scan => scan.review_status === 'approved').length;
  const pending = scans.filter(scan => scan.review_status === 'pending').length;
  const recent = scans.slice(0, 5);

  return <section className="farmer-home">
    <div className="welcome-banner"><div><span className="eyebrow">YOUR FARM WORKSPACE</span><h1>Good day, {user?.name?.split(' ')[0] || 'farmer'} <span>🌱</span></h1><p>Check your crop scans and expert-confirmed diagnoses.</p><button onClick={onNewScan} className="primary-action"><Plus size={17}/> Start a new scan</button></div><div className="banner-illustration"><div className="sun-disc"/><div className="plant-stem"><i/><i/><i/></div><div className="hill hill-one"/><div className="hill hill-two"/></div></div>
    <div className="stat-grid"><article className="stat-card"><span className="stat-icon blush"><ScanLine size={19}/></span><small>Total scans</small><strong>{scans.length}</strong><span className="stat-note">Your crop diagnosis history</span></article><article className="stat-card"><span className="stat-icon lilac"><Clock3 size={19}/></span><small>Awaiting review</small><strong>{pending}</strong><span className="stat-note">An agronomist will confirm these</span></article><article className="stat-card"><span className="stat-icon mint"><CheckCircle2 size={19}/></span><small>Expert approved</small><strong>{approved}</strong><span className="stat-note">Confirmed diagnoses</span></article></div>
    <div className="section-heading"><div><span className="eyebrow">YOUR ACTIVITY</span><h2>Recent crop scans</h2></div><button className="text-action" onClick={onViewHistory}>View all <ArrowUpRight size={15}/></button></div>
    {error && <div className="inline-error">{error}</div>}
    {!error && recent.length === 0 && <div className="empty-state"><span className="empty-icon"><Sprout/></span><h3>Your scan history starts here</h3><p>Upload a clear photo for an AI diagnosis. Scans below 60% confidence are sent to an agronomist.</p><button className="primary-action" onClick={onNewScan}><ScanLine size={16}/> Scan a leaf</button></div>}
    {recent.length > 0 && <div className="scan-list">{recent.map(scan => { const status = scan.review_status; return <article className="scan-row" key={scan.id}><img src={scan.image_url || ''} alt="Scanned crop"/><div className="scan-copy"><strong>{displayClass(scan.approved_class || scan.predicted_class)}</strong><small>{new Date(scan.created_at).toLocaleString()}{scan.reviewed_by ? ` · reviewed by ${scan.reviewed_by}` : ''}{status === 'disapproved' ? ' · please submit a new scan' : ''}</small></div><div className="confidence"><b>{Math.round((scan.confidence || 0) * 100)}%</b><small>AI confidence</small></div><span className={`review-pill ${status === 'approved' ? 'approved' : status === 'pending' ? 'pending' : status === 'disapproved' ? 'disapproved' : 'not-required'}`}>{status === 'approved' ? <><CheckCircle2 size={14}/> Expert approved</> : status === 'pending' ? <><Clock3 size={14}/> Awaiting review</> : status === 'disapproved' ? <><XCircle size={14}/> Diagnosis rejected</> : <><CheckCircle2 size={14}/> Review not requested</>}</span></article>; })}</div>}
    <div className="help-card"><span className="help-icon"><Leaf size={20}/></span><div><b>A diagnosis is a helpful first check</b><p>An agronomist’s approval is shown on your scan as soon as they confirm it.</p></div></div>
  </section>;
}
