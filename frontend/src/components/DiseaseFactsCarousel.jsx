import React, { useRef, useState } from 'react';
import { ArrowRight, Droplets, Eye, Leaf, Sprout, Wind } from 'lucide-react';

const diseases = [
  {
    name: 'Tomato late blight', crop: 'Tomato · Potato', kind: 'Water mold',
    source: 'University of Minnesota Extension', url: 'https://extension.umn.edu/agriculture/specialty-crops/vegetable-farming/disease-management/late-blight',
    facts: [
      ['Cause', 'Phytophthora infestans; despite its name, it is a water mold, not a true fungus.'],
      ['Crops', 'Most often affects potato and tomato; related nightshade plants can also host it.'],
      ['Field signs', 'Irregular dark, water-soaked leaf blotches; fruit may develop firm brown patches.'],
      ['Favored by', 'Cool, damp weather around 16–21°C (60–70°F), especially with wet foliage.'],
      ['Spread', 'Windborne spores and infected seed tubers or transplants can start new infections.'],
    ],
  },
  {
    name: 'Tomato early blight', crop: 'Tomato · Potato', kind: 'Fungal disease',
    source: 'University of Minnesota Extension', url: 'https://extension.umn.edu/agriculture/specialty-crops/vegetable-farming/disease-management/early-blight-in-tomato-and-potato',
    facts: [
      ['Cause', 'Usually Alternaria solani or the closely related Alternaria tomatophila.'],
      ['Crops', 'Common on tomato and potato; some related nightshade plants can carry it too.'],
      ['Field signs', 'Older, lower leaves show brown spots with target-like rings and yellowing edges.'],
      ['Favored by', 'Warm weather, heavy dew or rain, and long periods of leaf wetness.'],
      ['Spread', 'Spores move from infected debris and soil by wind, tools, contact, or rain splash.'],
    ],
  },
  {
    name: 'Apple scab', crop: 'Apple · Crabapple', kind: 'Fungal disease',
    source: 'University of Minnesota Extension', url: 'https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/yard-and-garden-problems/apple-scab',
    facts: [
      ['Cause', 'Venturia inaequalis, a fungus that infects leaves and developing fruit.'],
      ['Crops', 'Apple and crabapple are common hosts; related host-specific strains affect other trees.'],
      ['Field signs', 'Olive-green leaf spots darken over time; fruit can become corky or cracked.'],
      ['Favored by', 'Warm, rainy spring weather and several hours of moisture on leaves.'],
      ['Spread', 'The fungus survives on fallen leaves; wind and splashing rain carry spores to new growth.'],
    ],
  },
  {
    name: 'Cucurbit powdery mildew', crop: 'Cucumber · Squash · Melon', kind: 'Fungal disease',
    source: 'University of Minnesota Extension', url: 'https://extension.umn.edu/agriculture/specialty-crops/vegetable-farming/disease-management/powdery-mildew-of-cucurbits',
    facts: [
      ['Cause', 'Most commonly Podosphaera xanthii, one of the powdery mildew fungi.'],
      ['Crops', 'Can affect cucumber, squash, pumpkin, melon, gourds, and watermelon.'],
      ['Field signs', 'White powdery patches appear on either leaf surface and can spread across foliage.'],
      ['Favored by', 'Humid conditions around 20–27°C (68–81°F); crowded growth can raise risk.'],
      ['Spread', 'Air carries spores between leaves; new spores form readily in warm, dry conditions.'],
    ],
  },
  {
    name: 'Rice blast', crop: 'Rice', kind: 'Fungal disease',
    source: 'UC Statewide IPM Program', url: 'https://ipm.ucanr.edu/agriculture/rice/rice-blast/',
    facts: [
      ['Cause', 'Magnaporthe oryzae, also known by its asexual name Pyricularia oryzae.'],
      ['Crops', 'Rice; the disease name changes by where it appears, such as leaf or neck blast.'],
      ['Field signs', 'Leaf lesions are often diamond-shaped with pale or gray centers and darker edges.'],
      ['Favored by', 'Long leaf-wetness periods and very high humidity; infection is favored near 25–28°C.'],
      ['Spread', 'Airborne spores can trigger repeat infection cycles when warm, wet conditions persist.'],
    ],
  },
];

const factIcons = [Leaf, Sprout, Eye, Droplets, Wind];

export default function DiseaseFactsCarousel() {
  const [active, setActive] = useState(0);
  const touchStart = useRef(null);
  const dragStart = useRef(null);
  const wheelAmount = useRef(0);
  const wheelLocked = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const disease = diseases[active];
  const go = direction => setActive(index => (index + direction + diseases.length) % diseases.length);
  const onTouchStart = event => { touchStart.current = { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY }; };
  const onTouchEnd = event => {
    if (!touchStart.current) return;
    const dx = event.changedTouches[0].clientX - touchStart.current.x;
    const dy = event.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
    touchStart.current = null;
  };
  const onWheel = event => {
    if (Math.abs(event.deltaX) < 4 || Math.abs(event.deltaX) < Math.abs(event.deltaY) * 1.25) return;
    event.preventDefault();
    if (wheelLocked.current) return;
    wheelAmount.current += event.deltaX;
    if (Math.abs(wheelAmount.current) >= 48) {
      go(wheelAmount.current > 0 ? 1 : -1);
      wheelAmount.current = 0;
      wheelLocked.current = true;
      window.setTimeout(() => { wheelLocked.current = false; wheelAmount.current = 0; }, 500);
    }
  };
  const onPointerDown = event => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || event.target.closest('a,button')) return;
    dragStart.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerUp = event => {
    if (!dragStart.current || dragStart.current.pointerId !== event.pointerId) return;
    const dx = event.clientX - dragStart.current.x;
    const dy = event.clientY - dragStart.current.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
    dragStart.current = null;
    setIsDragging(false);
  };
  const onPointerMove = event => {
    if (!dragStart.current || dragStart.current.pointerId !== event.pointerId) return;
    if (Math.abs(event.clientX - dragStart.current.x) > 8) setIsDragging(true);
  };
  const onPointerCancel = () => { dragStart.current = null; setIsDragging(false); };

  return <section className="disease-facts-section" aria-labelledby="disease-facts-title">
    <div className="disease-facts-heading">
      <span className="eyebrow">FIELD GUIDE · 5 COMMON DISEASES</span>
      <h2 id="disease-facts-title">Know the signs. Catch changes earlier.</h2>
      <p>Explore five familiar crop diseases, the conditions that favor them, and the clues growers often notice first.</p>
    </div>

    <div className={`disease-carousel${isDragging ? ' is-dragging' : ''}`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} onDragStart={event => event.preventDefault()} onKeyDown={event => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); go(-1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); go(1); }
    }} tabIndex={0} aria-label="Disease facts carousel. Swipe, drag, or use the arrow keys to change disease.">
      <div className="disease-facts-orbit" key={disease.name}>
        {disease.facts.map(([label, text], index) => {
          const Icon = factIcons[index];
          return <article className={`disease-fact disease-fact-${index + 1}`} key={label}>
            <span className="disease-fact-icon"><Icon size={15}/></span>
            <div><small>{label}</small><p>{text}</p></div>
          </article>;
        })}
        <div className="disease-facts-core" aria-live="polite">
          <span className="disease-core-mark"><Leaf size={27}/></span>
          <small>{disease.crop}</small>
          <h3>{disease.name}</h3>
          <span className="disease-core-type">{disease.kind}</span>
        </div>
      </div>
      <div className="disease-carousel-controls">
        <div className="disease-carousel-dots" aria-hidden="true">
          {diseases.map((item, index) => <span key={item.name} className={active === index ? 'active' : ''}/>) }
        </div>
        <span className="disease-carousel-count">{String(active + 1).padStart(2, '0')} <i>/</i> {String(diseases.length).padStart(2, '0')} <small>Swipe or drag to explore</small></span>
      </div>
      <a className="disease-facts-source" href={disease.url} target="_blank" rel="noreferrer">Facts: {disease.source} <ArrowRight size={13}/></a>
    </div>
  </section>;
}
