import React from 'react';
import { ArrowDownRight, ArrowUpRight, Check, CloudSun, Leaf, ScanLine, ShieldCheck } from 'lucide-react';
import DiseaseFactsCarousel from './DiseaseFactsCarousel';

const updates = [
  {
    date: '21 Nov 2026', tag: 'Research · Tea',
    title: 'Researchers identify a dieback pathogen affecting Indian tea',
    summary: 'Researchers in Assam report identifying Lasiodiplodia pseudotheobromae in tea and a bacterium with potential for biological control.',
    source: 'NE NOW', url: 'https://m.nenow.in/article/assam/assam-scientists-identify-new-fungal-pathogen-causing-tea-dieback-discover-potential-biological-control-agent/550400/amp',
  },
  {
    date: '6 Nov 2026', tag: 'Field report · Rice',
    title: 'Rice disease reported in Karnataka’s Hunsur region',
    summary: 'A local report describes disease symptoms in rice fields around the Lakshmanatirtha and Harangi command areas, during grain formation.',
    source: 'Urban Acres · Prajavani report', url: 'https://urbanacres.in/rice-crop-disease-hits-3900-hectares-in-hunsur-farmers-seek-help/',
  },
  {
    date: '25 Sep 2026', tag: 'Official advisory · Paddy',
    title: 'ICAR urges closer paddy surveillance during panicle development',
    summary: 'The advisory highlights field monitoring, balanced nutrition and drainage as paddy enters a sensitive reproductive stage under humid, rainy conditions.',
    source: 'Press Information Bureau', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2315084&lang=2&reg=48',
  },
];

export function DiseaseNewsSection() {
  return <section className="disease-news" id="disease-news">
    <div className="news-heading"><div><span className="eyebrow">FIELD NOTES & RESEARCH</span><h2>Plant health, in the news.</h2><p>Recent disease reports and advisories from India and agricultural research.</p></div><span className="news-badge"><Leaf size={14}/> Curated updates</span></div>
    <div className="news-grid">{updates.map(item => <article className="news-card" key={item.title}>
      <div className="news-image"><div className="news-image-orbit"/><div className="news-leaf"><Leaf size={52} strokeWidth={1.1}/></div><span>{item.tag.split(' · ')[1]}</span></div>
      <div className="news-card-body"><div className="news-meta"><span>{item.tag}</span><time>{item.date}</time></div><h3>{item.title}</h3><p>{item.summary}</p><a href={item.url} target="_blank" rel="noreferrer">Read source <ArrowUpRight size={14}/></a><small>Source: {item.source}</small></div>
    </article>)}</div>
    <p className="news-disclaimer">News is provided for awareness. Local advisories and field diagnosis should guide crop protection decisions.</p>
  </section>;
}

export default function LandingSections({ className = '' }) {
  return <div className={`landing-sections ${className}`.trim()}>
    <section className="how-section" id="how-it-works">
      <div className="how-visual">
        <div className="how-visual-top"><span className="how-brand"><Leaf size={16}/> Wisteria</span><span className="live-chip"><i/> Scan preview</span></div>
        <div className="scan-preview">
          <div className="preview-leaf"><span className="leaf-vein"/><span className="leaf-spot spot-a"/><span className="leaf-spot spot-b"/><span className="leaf-spot spot-c"/><Leaf size={110} strokeWidth={1.1}/></div>
          <div className="scan-focus"><ScanLine size={18}/><span>Leaf image analyzed</span><Check size={15}/></div>
        </div>
        <div className="preview-diagnosis"><span className="preview-disease-icon"><ShieldCheck size={17}/></span><span><small>AI SCREENING</small><b>Possible leaf disease</b></span><strong>Review</strong></div>
        <div className="preview-caption"><CloudSun size={15}/> Clear photos and field context help guide a useful first check.</div>
      </div>
      <div className="how-copy">
        <span className="eyebrow">A CLEARER WAY TO CHECK CROP HEALTH</span>
        <h2>Three simple steps to a more informed decision.</h2>
        <p className="how-intro">Start with a leaf photo. Wisteria helps you understand what to look for and when expert review may help.</p>
        <ol className="steps-list">
          <li><span className="step-number">01</span><div><b>Select your crop</b><p>Choose a crop and upload a focused, well-lit leaf image.</p></div><ArrowDownRight size={16}/></li>
          <li><span className="step-number">02</span><div><b>Get an AI screening</b><p>Review the likely class, model confidence and visual explanation.</p></div><ArrowDownRight size={16}/></li>
          <li><span className="step-number">03</span><div><b>Follow the right next step</b><p>Low-confidence scans go to an agronomist; track their decision in your workspace.</p></div><ArrowDownRight size={16}/></li>
        </ol>
      </div>
    </section>

    <DiseaseFactsCarousel/>
    <DiseaseNewsSection/>
  </div>;
}
