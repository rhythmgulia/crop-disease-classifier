import React from 'react';
import { ArrowRight, Leaf, ShieldCheck, Sparkles } from 'lucide-react';
import LandingSections from '../components/LandingSections';
import AppFooter from '../components/AppFooter';

export default function PublicLanding({ onGetStarted, onSignIn }) {
  return <div className="public-site" id="top">
    <section className="public-landing-screen">
      <header className="public-landing-header">
        <a className="public-brand" href="#top" aria-label="Wisteria home"><span><Leaf size={23}/></span>Wisteria</a>
        <button type="button" className="public-signin" onClick={onSignIn}>Sign in</button>
      </header>
      <main className="public-landing-main">
        <div className="public-landing-copy">
          <div className="public-eyebrow"><Sparkles size={15}/> AI crop health, with human expertise</div>
          <h1>Know your crops.<br/><em>Grow with confidence.</em></h1>
          <p>Get an instant AI diagnosis, then let an agronomist confirm it. Clear next steps for every scan, all in one place.</p>
          <button type="button" className="public-get-started" onClick={onGetStarted}>Get started <ArrowRight size={19}/></button>
          <div className="public-proof"><ShieldCheck size={16}/><span>AI screening with expert review</span><i/><span>Crop guidance in nine Indian languages</span></div>
        </div>
        <div className="public-landing-visual" aria-hidden="true">
          <div className="public-visual-orbit"><div className="public-leaf"><Leaf size={184} strokeWidth={1}/><span/><span/><span/></div></div>
          <div className="public-status-card"><span className="public-status-icon"><ShieldCheck size={19}/></span><span><b>Expert checked</b><small>Diagnosis approved</small></span><i>✓</i></div>
          <div className="public-visual-caption"><span>01</span><b>Understand your crop health</b><small>One clear scan at a time.</small></div>
        </div>
      </main>
      <div className="public-landing-bottom"><span>Plant health, made clearer.</span><a href="#how-it-works">Explore Wisteria ↓</a></div>
    </section>
    <LandingSections/>
    <AppFooter/>
  </div>;
}
