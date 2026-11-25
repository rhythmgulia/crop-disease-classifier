import React, { useEffect, useState } from 'react';
import { BookOpen, Bot, ClipboardList, Home, Leaf, LogOut, ScanLine, ShieldCheck, Sparkles } from 'lucide-react';
import { getMyScans, getPendingReviews } from '../api/client';

const humanize = value => (value || '').replace(/___/g, ' · ').replace(/_/g, ' ');

export default function Sidebar({ activeTab, setActiveTab, user, onLogout }) {
  const isAgronomist = user?.role === 'agronomist';
  const [recentItems, setRecentItems] = useState([]);
  useEffect(() => {
    const request = isAgronomist ? getPendingReviews : getMyScans;
    request().then(rows => setRecentItems(rows.slice(0, 3))).catch(() => setRecentItems([]));
  }, [isAgronomist]);
  const items = isAgronomist
    ? [{ id: 'reviews', label: 'Review queue', icon: ClipboardList }]
    : [{ id: 'home', label: 'Dashboard', icon: Home }, { id: 'scanner', label: 'New diagnosis', icon: ScanLine }, { id: 'history', label: 'My scans', icon: ClipboardList }, { id: 'assistant', label: 'AI assistant', icon: Bot }, { id: 'pesticides', label: 'Treatment library', icon: BookOpen }];

  return <aside className="workspace-sidebar glass-surface">
    <button className="workspace-new" onClick={() => setActiveTab(isAgronomist ? 'reviews' : 'assistant')}><Sparkles size={15}/>{isAgronomist ? 'Open review queue' : 'New chat'}</button>
    <div className="rail-group"><span className="rail-label">FEATURES</span><nav className="side-nav">{items.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => setActiveTab(item.id)} className={activeTab === item.id ? 'active' : ''}><Icon size={16}/><span>{item.label}</span>{activeTab === item.id && <i/>}</button>; })}</nav></div>
    <div className="rail-group rail-recents"><span className="rail-label">{isAgronomist ? 'PENDING REVIEWS' : 'RECENT SCANS'}</span>
      {recentItems.length ? recentItems.map(item => <button className="recent-link" key={item.id || item.scan_id} onClick={() => setActiveTab(isAgronomist ? 'reviews' : 'history')}><span className="recent-dot"><Leaf size={12}/></span><span><b>{humanize(item.approved_class || item.predicted_class)}</b><small>{item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Needs review'}</small></span></button>) : <p className="rail-empty">{isAgronomist ? 'New submissions will appear here.' : 'Your recent diagnoses will appear here.'}</p>}
    </div>
    <div className="rail-spacer"/>
    <div className="rail-account"><span className="rail-avatar">{isAgronomist ? <ShieldCheck size={16}/> : (user?.name || 'F').slice(0,1).toUpperCase()}</span><span className="rail-account-copy"><b>{user?.name || 'Account'}</b><small>{isAgronomist ? 'Agronomist' : 'Farmer'}</small></span><button className="rail-logout" title="Sign out" onClick={onLogout}><LogOut size={15}/></button></div>
  </aside>;
}
