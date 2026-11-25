import React from 'react';
import { Leaf, ArrowUpRight } from 'lucide-react';

const groups = [
  { title: 'Platform', links: [['Crop scan', '#scan'], ['Disease watch', '#disease-news'], ['Weather risk', '#outbreak']] },
  { title: 'Workspace', links: [['Farmer dashboard', '#dashboard'], ['My scans', '#scans'], ['Treatment library', '#treatments']] },
  { title: 'Guidance', links: [['Plant health news', '#disease-news'], ['How it works', '#how-it-works'], ['Privacy', '#privacy']] },
];

export default function AppFooter({ onNavigate, onLogout }) {
  const handleLink = (event, label) => {
    if (onLogout) {
      event.preventDefault();
      onLogout();
      return;
    }
    if (!onNavigate) return;
    event.preventDefault();
    if (label === 'Weather risk' || label === 'Disease watch') onNavigate('outbreak');
    else if (label === 'Crop scan') onNavigate('scanner');
    else if (label === 'Treatment library') onNavigate('pesticides');
    else if (label === 'Farmer dashboard') onNavigate('home');
    else if (label === 'My scans') onNavigate('history');
    else if (label === 'Plant health news' || label === 'How it works') {
      onNavigate('home');
      window.setTimeout(() => document.getElementById(label === 'Plant health news' ? 'disease-news' : 'how-it-works')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  };

  return <footer className="app-footer">
    <div className="footer-main">
      <div className="footer-brand-block">
        <a className="footer-brand" href="#top" onClick={e => handleLink(e, 'Home')}><span className="footer-brand-icon"><Leaf size={19}/></span><span>Wis<span>teria</span></span></a>
        <p>Clear crop health guidance, with AI screening and agronomist review.</p>
        <span className="footer-note">Built for better-informed growing.</span>
      </div>
      {groups.map(group => <div className="footer-link-group" key={group.title}><h3>{group.title}</h3>{group.links.map(([label, href]) => <a key={label} href={href} onClick={e => handleLink(e, label)}>{label}<ArrowUpRight size={12}/></a>)}</div>)}
    </div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} Wisteria</span><span>AI offers an initial assessment; consult an agronomist for confirmation.</span><a href="#top" onClick={e => handleLink(e, 'Home')}>Back to top ↑</a></div>
  </footer>;
}
