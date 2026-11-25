import React from 'react';
import { CloudRain, Leaf, MapPin } from 'lucide-react';
import OutbreakRisk from '../components/OutbreakRisk';

export default function OutbreakRiskPage() {
  return <section className="outbreak-page">
    <div className="outbreak-page-hero"><span className="eyebrow"><CloudRain size={13}/> FARM WEATHER WATCH</span><h1>Know when conditions favor disease.</h1><p>Choose a crop and compare your local forecast with published disease-favorable weather profiles.</p><div className="outbreak-page-points"><span><MapPin size={14}/> Your location, with permission</span><span><Leaf size={14}/> Crop-specific conditions</span></div></div>
    <OutbreakRisk />
    <aside className="outbreak-method"><b>How to read this page</b><p>“Favorable” means the forecast matches the profile’s weather rules; it does not mean a disease is present. Leaf wetness, crop stage, local pathogen presence and field practices can change real risk. Use the watchlist to guide scouting and ask an agronomist when symptoms appear.</p></aside>
  </section>;
}
