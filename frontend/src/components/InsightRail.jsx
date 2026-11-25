import React, { useEffect, useState } from 'react';
import { ArrowUpRight, CheckCircle2, Clock3, Leaf, ShieldCheck, Sparkles } from 'lucide-react';
import { getMyScans, getPendingReviews } from '../api/client';

const nameOf = value => (value || '').replace(/___/g, ' · ').replace(/_/g, ' ');

export default function InsightRail({ user, activeTab, diagnosis, onNavigate }) {
  const [entries, setEntries] = useState([]);
  useEffect(() => {
    const load = user?.role === 'agronomist' ? getPendingReviews : getMyScans;
    const refresh = () => load().then(setEntries).catch(() => setEntries([]));
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
  }, [user?.role, activeTab]);

  const selected = activeTab === 'assistant' ? null : (diagnosis || entries[0]);
  const diseaseName = selected?.approved_class || selected?.predicted_class || selected?.disease_class;
  const isApproved = selected?.review_status === 'approved';
  const isPending = selected?.review_status === 'pending';
  const isDisapproved = selected?.review_status === 'disapproved';
  const isAgronomist = user?.role === 'agronomist';

  if (activeTab === 'assistant') return <aside className="insight-rail">
    <div className="insight-day">Today</div>
    <article className="insight-card assistant-insight"><div className="insight-card-top"><span className="insight-icon"><Sparkles size={16}/></span></div><h3>Crop care, in your language</h3><p>Ask about symptoms, safe treatments, dosage, or harvest timing.</p><div className="insight-tag"><span/> Voice & text available</div></article>
    <div className="insight-day">Helpful prompts</div>
    <div className="glass-tip"><b>Start with a question</b><span>“How do I recognize early blight?”</span></div>
    <div className="glass-tip"><b>Need a diagnosis?</b><span>Send a clear photo of one leaf.</span><button onClick={() => onNavigate('scanner')}>Open scanner <ArrowUpRight size={13}/></button></div>
  </aside>;

  return <aside className="insight-rail">
    <div className="insight-day">Today</div>
    {isAgronomist ? <article className="insight-card"><div className="insight-card-top"><span className="insight-icon"><ShieldCheck size={16}/></span><span className="insight-status">LIVE</span></div><h3>Diagnosis reviews</h3><p>Farmer submissions waiting for expert confirmation.</p><strong className="insight-metric">{entries.length}<small> pending</small></strong><button className="insight-link" onClick={() => onNavigate('reviews')}>Open queue <ArrowUpRight size={14}/></button></article> : selected ? <article className="insight-card scan-insight" onClick={() => onNavigate('history')}>
      <div className="insight-card-top"><span className="insight-icon"><Leaf size={16}/></span><span className={`insight-status ${isApproved ? 'approved' : isDisapproved ? 'rejected' : !isPending ? 'cleared' : ''}`}>{isApproved ? 'APPROVED' : isDisapproved ? 'REJECTED' : isPending ? 'PENDING' : 'NO REVIEW'}</span></div>
      {selected.image_url ? <img className="insight-leaf-photo" src={selected.image_url} alt="Recent crop scan"/> : <div className="insight-leaf-placeholder"><Leaf size={32}/></div>}
      <h3>{nameOf(diseaseName)}</h3><p>{selected.crop || 'Recent crop diagnosis'} · {Math.round((selected.confidence || 0) * 100)}% AI confidence</p><div className="insight-foot"><span>{isApproved || !isPending ? <CheckCircle2 size={13}/> : <Clock3 size={13}/>} {isApproved ? 'Expert approved' : isDisapproved ? 'Diagnosis rejected' : isPending ? 'Awaiting agronomist' : 'Review not requested'}</span><ArrowUpRight size={14}/></div>
    </article> : <article className="insight-card"><div className="insight-card-top"><span className="insight-icon"><Leaf size={16}/></span></div><h3>Your first diagnosis</h3><p>Upload a leaf image to see AI results and expert review here.</p><button className="insight-link" onClick={() => onNavigate('scanner')}>Start a scan <ArrowUpRight size={14}/></button></article>}
    <div className="insight-day">{isAgronomist ? 'Review note' : 'Crop note'}</div>
    <div className="glass-tip"><span className="tip-kicker"><Sparkles size={12}/> WISTERIA INSIGHT</span><b>{isAgronomist ? 'Clear decisions build trust.' : 'A clear image helps.'}</b><span>{isAgronomist ? 'Confirm the AI result after reviewing the submitted leaf.' : 'Use natural light and frame one leaf to help the model read symptoms.'}</span></div>
    {!isAgronomist && <div className="glass-tip compact-tip"><b>Plant health assistant</b><span>Questions answered in nine Indian languages.</span><button onClick={() => onNavigate('assistant')}>Ask the assistant <ArrowUpRight size={13}/></button></div>}
  </aside>;
}
