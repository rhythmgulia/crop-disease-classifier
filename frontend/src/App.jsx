import React, { useEffect, useState } from 'react';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import Topbar from './components/Topbar';
import AuthPage from './pages/AuthPage';
import PublicLanding from './pages/PublicLanding';
import FarmerDashboard from './pages/FarmerDashboard';
import DiseaseScanner from './pages/DiseaseScanner';
import ScanHistory from './pages/ScanHistory';
import ReviewQueue from './pages/ReviewQueue';
import AgronomyAssistant from './pages/AgronomyAssistant';
import PesticideRegistry from './pages/PesticideRegistry';
import OutbreakRiskPage from './pages/OutbreakRiskPage';
import InsightRail from './components/InsightRail';
import AppFooter from './components/AppFooter';
import LandingSections from './components/LandingSections';
import { getCurrentUser } from './api/client';

function MainApp() {
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState('login');
  const [checking, setChecking] = useState(Boolean(localStorage.getItem('agrovision_token')));
  const [activeTab, setActiveTab] = useState('home');
  const [currentDiagnosis, setCurrentDiagnosis] = useState(null);
  const [assistantContext, setAssistantContext] = useState(null);
  const [scannerVisited, setScannerVisited] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem('agrovision_token')) return;
    getCurrentUser().then(account => { setUser(account); setActiveTab(account.role === 'agronomist' ? 'reviews' : 'home'); })
      .catch(() => localStorage.removeItem('agrovision_token')).finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (activeTab !== 'assistant') return;
    // A public landing-page hash can otherwise keep the workspace anchored below its top.
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    const resetScroll = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.querySelector('.app-content')?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.querySelector('.page-glass')?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    };
    resetScroll();
    requestAnimationFrame(resetScroll);
  }, [activeTab]);

  const authenticated = account => { setUser(account); setActiveTab(account.role === 'agronomist' ? 'reviews' : 'home'); };
  const navigate = nextTab => { if (nextTab === 'scanner') setScannerVisited(true); setActiveTab(nextTab); };
  const logout = () => { localStorage.removeItem('agrovision_token'); setUser(null); setShowAuth(false); setCurrentDiagnosis(null); setAssistantContext(null); setScannerVisited(false); setActiveTab('home'); };
  const agronomistFooterLogout = () => { logout(); setAuthInitialMode('login'); setShowAuth(true); };
  if (checking) return <div className="boot-screen"><span className="brand-mark">◌</span><p>Opening your workspace…</p></div>;
  if (!user) return showAuth
    ? <AuthPage initialMode={authInitialMode} onBack={() => setShowAuth(false)} onAuthenticated={authenticated}/>
    : <PublicLanding onGetStarted={() => { setAuthInitialMode('signup'); setShowAuth(true); }} onSignIn={() => { setAuthInitialMode('login'); setShowAuth(true); }}/>;

  const tab = user.role === 'agronomist' ? 'reviews' : activeTab;
  const hideInsightRail = tab === 'pesticides';
  return <div className="agrix-app-shell"><Topbar activeTab={tab} setActiveTab={navigate} user={user} onLogout={logout}/><div className={`agrix-workspace ${hideInsightRail ? 'workspace-no-insight' : ''}`}><main className={`app-content ${tab === 'assistant' ? 'assistant-stage' : ''}`}><div className="page-glass">
    {user.role === 'agronomist' && <ReviewQueue/>}
    {user.role === 'farmer' && tab === 'home' && <FarmerDashboard user={user} onNewScan={() => navigate('scanner')} onViewHistory={() => navigate('history')}/>}
    {user.role === 'farmer' && scannerVisited && <div style={{ display: tab === 'scanner' ? 'contents' : 'none' }}><DiseaseScanner isActive={tab === 'scanner'} preloadedDiagnosis={currentDiagnosis} onDiagnosisComplete={diagnosis => { setCurrentDiagnosis(diagnosis); if (diagnosis) setAssistantContext(null); }} onNavigateAssistant={diagnosis => { if (diagnosis) setCurrentDiagnosis(diagnosis); setAssistantContext(null); navigate('assistant'); }}/></div>}
    {user.role === 'farmer' && tab === 'history' && <ScanHistory/>}
    {user.role === 'farmer' && tab === 'assistant' && <AgronomyAssistant initialScan={assistantContext ? null : currentDiagnosis} initialContext={assistantContext} storageKey={`agrovision_assistant_messages_${user.id}`}/>}
    {user.role === 'farmer' && tab === 'pesticides' && <PesticideRegistry onSelectForAssistant={item => { setAssistantContext(item.disease_class || item.predicted_class || null); navigate('assistant'); }}/>}
    {user.role === 'farmer' && tab === 'outbreak' && <OutbreakRiskPage/>}
  </div></main>{!hideInsightRail && <InsightRail user={user} activeTab={tab} diagnosis={currentDiagnosis} onNavigate={navigate}/>}</div>{user.role === 'farmer' && tab === 'home' && <div className="dashboard-lower"><LandingSections className="dashboard-landing"/></div>}<div className="app-footer-frame"><AppFooter onNavigate={user.role === 'agronomist' ? undefined : navigate} onLogout={user.role === 'agronomist' ? agronomistFooterLogout : undefined}/></div></div>;
}

export default function App() { return <ThemeProvider><ToastProvider><MainApp/></ToastProvider></ThemeProvider>; }
