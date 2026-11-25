import React from 'react';
import { Leaf, LogOut, Plus, ShieldCheck } from 'lucide-react';

const farmerLinks = [
  { id: 'home', label: 'Dashboard' }, { id: 'scanner', label: 'Crop Management' },
  { id: 'history', label: 'Crop Reports' }, { id: 'pesticides', label: 'Pest & Disease' },
  { id: 'outbreak', label: 'Outbreak risk' },
];

export default function Topbar({ activeTab, setActiveTab, user, onLogout }) {
  const isAgronomist = user?.role === 'agronomist';
  const links = isAgronomist ? [{ id: 'reviews', label: 'Disease Reviews' }] : farmerLinks;
  const name = user?.name || 'Account';
  return <header className="agrix-topbar">
    <button className="topbar-brand" onClick={() => setActiveTab(isAgronomist ? 'reviews' : 'home')}><span className="topbar-brand-icon"><Leaf size={21}/></span><span>Wis<span>teria</span></span></button>
    <nav className="topbar-nav">{links.map(link => <button key={link.id} className={activeTab === link.id ? 'active' : ''} onClick={() => setActiveTab(link.id)}>{link.label}</button>)}{!isAgronomist && <button className={activeTab === 'assistant' ? 'active topbar-ai-link' : 'topbar-ai-link'} onClick={() => setActiveTab('assistant')}>AI Assistant</button>}</nav>
    <div className="topbar-actions">{!isAgronomist && <button className="topbar-add" onClick={() => setActiveTab('scanner')} title="New scan"><Plus size={17}/><span>New scan</span></button>}<button className="topbar-logout" aria-label="Log out" title="Log out" onClick={onLogout}><LogOut size={17}/></button><div className="topbar-user"><span className={`avatar ${isAgronomist ? 'agronomist' : ''}`}>{isAgronomist ? <ShieldCheck size={17}/> : name.slice(0,1).toUpperCase()}</span><span className="topbar-user-text"><b>{name}</b><small>{isAgronomist ? 'Agronomist' : 'Farm manager'}</small></span></div></div>
  </header>;
}
