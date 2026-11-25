import React, { useMemo, useState } from 'react';
import { CloudRain, Crosshair, ExternalLink, MapPin, Search, ShieldAlert, Sun } from 'lucide-react';
import diseaseData from '../data/disease_weather_profiles.json';

const API = 'https://api.open-meteo.com/v1/forecast';
const crops = [...new Set(diseaseData.classes.filter(row => row.assessment !== 'healthy_class').map(row => row.crop))];

function assessProfile(profile, hours) {
  if (!hours.length) return null;
  const eligible = hours.filter(hour => {
    const t = hour.temperature_2m;
    return (profile.min_temp_c == null || t >= profile.min_temp_c) &&
      (profile.max_temp_c == null || t <= profile.max_temp_c);
  });
  const humid = eligible.filter(hour => profile.min_rh == null || hour.relative_humidity_2m >= profile.min_rh);
  const dryCount = eligible.filter(hour => hour.precipitation <= 0 && hour.rain <= 0).length;
  const matched = profile.dry_weather ? dryCount : humid.length;
  const required = profile.wetness_hours || 4;
  let consecutive = 0;
  let longestRun = 0;
  hours.forEach(hour => {
    const tempOkay = (profile.min_temp_c == null || hour.temperature_2m >= profile.min_temp_c) &&
      (profile.max_temp_c == null || hour.temperature_2m <= profile.max_temp_c);
    const humidityOkay = profile.min_rh == null || hour.relative_humidity_2m >= profile.min_rh;
    const moistureOkay = profile.dry_weather
      ? hour.precipitation <= 0 && hour.rain <= 0
      : humidityOkay && (hour.precipitation > 0 || hour.rain > 0 || hour.relative_humidity_2m >= 95);
    consecutive = tempOkay && moistureOkay ? consecutive + 1 : 0;
    longestRun = Math.max(longestRun, consecutive);
  });
  const evidence = profile.wetness_hours ? longestRun : matched;
  const ratio = Math.min(1, evidence / required);
  if (evidence < 2) return null;
  const favorable = evidence >= required;
  return {
    level: favorable ? 'Favorable conditions' : 'Conditions to watch',
    levelKey: favorable ? 'high' : 'watch',
    matchedHours: evidence,
    score: Math.round(ratio * 100),
    profile,
  };
}

export default function OutbreakRisk() {
  const [crop, setCrop] = useState('Tomato');
  const [weather, setWeather] = useState(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [placeQuery, setPlaceQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const candidates = useMemo(() => {
    if (!weather) return [];
    const start = Date.now();
    const end = start + diseaseData.assessment_window_hours * 60 * 60 * 1000;
    const hours = weather.hourly.time.map((time, i) => ({
      timestamp: new Date(`${time}:00Z`).getTime(),
      temperature_2m: weather.hourly.temperature_2m[i],
      relative_humidity_2m: weather.hourly.relative_humidity_2m[i],
      precipitation: weather.hourly.precipitation[i] || 0,
      rain: weather.hourly.rain?.[i] || 0,
    })).filter(hour => hour.timestamp >= start && hour.timestamp < end);

    return diseaseData.classes
      .filter(row => row.crop === crop && row.assessment === 'weather_supported')
      .map(row => ({ ...row, result: assessProfile(diseaseData.profiles[row.profile], hours) }))
      .filter(row => row.result)
      .sort((a, b) => b.result.score - a.result.score);
  }, [crop, weather]);

  const unassessed = diseaseData.classes.filter(row => row.crop === crop && row.assessment === 'not_assessed');
  const loadWeatherAt = async (latitude, longitude, label) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        latitude: String(latitude), longitude: String(longitude),
        hourly: 'temperature_2m,relative_humidity_2m,precipitation,rain',
        current: 'temperature_2m,relative_humidity_2m,precipitation',
        past_days: '1', forecast_days: '2', timezone: 'UTC',
      });
      const response = await fetch(`${API}?${params}`);
      if (!response.ok) throw new Error('Weather service could not return local conditions.');
      const data = await response.json();
      if (!data.hourly?.time?.length) throw new Error('Weather service returned incomplete hourly data.');
      setWeather(data);
      setLocationLabel(label);
    } catch (e) {
      setError(e.message || 'Could not retrieve local weather.');
    } finally {
      setLoading(false);
    }
  };

  const loadWeather = () => {
    setError('');
    if (!navigator.geolocation) {
      setError('Location is not available in this browser. Search for a town or district below.');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => loadWeatherAt(coords.latitude, coords.longitude, `${coords.latitude.toFixed(2)}, ${coords.longitude.toFixed(2)}`),
      e => {
        setLoading(false);
        setError(e.code === 1
          ? 'Location permission was denied. Search for a town or district below.'
          : 'Your browser could not determine your location. Search for a town or district below.');
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
    );
  };

  const searchPlace = async event => {
    event.preventDefault();
    const query = placeQuery.trim();
    if (!query) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ name: query, count: '1', language: 'en', format: 'json' });
      const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`);
      if (!response.ok) throw new Error('Place search is unavailable. Try again in a moment.');
      const result = await response.json();
      const place = result.results?.[0];
      if (!place) throw new Error('No matching place found. Try a nearby town or district.');
      await loadWeatherAt(place.latitude, place.longitude, [place.name, place.admin1, place.country].filter(Boolean).join(', '));
    } catch (e) {
      setLoading(false);
      setError(e.message || 'Could not find that place.');
    }
  };

  return <section className="outbreak-card" aria-labelledby="outbreak-title">
    <div className="outbreak-heading">
      <span className="outbreak-icon"><CloudRain size={19}/></span>
      <div><span className="eyebrow">LOCAL WEATHER ADVISORY</span><h2 id="outbreak-title">Outbreak risk watch</h2><p>Weather conditions that may favor diseases in your selected crop.</p></div>
    </div>
    <div className="outbreak-controls">
      <label>Selected crop<select value={crop} onChange={e => setCrop(e.target.value)}>{crops.map(name => <option key={name}>{name}</option>)}</select></label>
      <button type="button" className="primary-action" onClick={loadWeather} disabled={loading}><Crosshair size={16}/>{loading ? 'Checking weather…' : weather ? 'Refresh local weather' : 'Use my location'}</button>
    </div>
    <form className="outbreak-place-search" onSubmit={searchPlace}>
      <label htmlFor="outbreak-place">Or enter your town or district</label>
      <div><input id="outbreak-place" value={placeQuery} onChange={event => setPlaceQuery(event.target.value)} placeholder="e.g. Nashik"/><button type="submit" disabled={loading || !placeQuery.trim()}><Search size={14}/>{loading ? 'Searching…' : 'Find place'}</button></div>
    </form>
    {error && <p className="outbreak-error" role="alert">{error}</p>}
    {weather && <div className="outbreak-weather"><span><MapPin size={14}/> {locationLabel}</span><span><Sun size={14}/> Now {Math.round(weather.current.temperature_2m)}°C</span><span>Humidity {weather.current.relative_humidity_2m}%</span><small>Next 24 hours · {weather.timezone || 'UTC'}</small></div>}
    {!weather && <div className="outbreak-placeholder"><MapPin size={17}/><span>Share your location to compare the next 24 hours of local weather with published disease-favorable conditions.</span></div>}
    {weather && candidates.length > 0 && <div className="outbreak-results"><h3>Weather-favorable conditions for {crop}</h3>{candidates.map(row => <article className="outbreak-result" key={row.class}>
      <div className={`risk-dot ${row.result.levelKey}`}><ShieldAlert size={16}/></div><div className="outbreak-result-copy"><strong>{row.disease}</strong><span>{row.result.level} · {row.result.matchedHours} matching forecast hours</span><p>{row.result.profile.description}</p><a href={row.result.profile.source} target="_blank" rel="noreferrer">Source <ExternalLink size={12}/></a></div><span className={`risk-badge ${row.result.levelKey}`}>{row.result.levelKey === 'high' ? 'HIGH' : 'WATCH'}</span>
    </article>)}</div>}
    {weather && candidates.length === 0 && <div className="outbreak-placeholder"><Sun size={17}/><span>No listed disease weather profile currently matches this forecast for {crop}.</span></div>}
    {weather && unassessed.length > 0 && <p className="outbreak-note">Not assessed by this weather-only check: {unassessed.map(row => row.disease).join(', ')}. Weather alone is not a reliable predictor for these conditions.</p>}
    <p className="outbreak-disclaimer">This is a weather-based watchlist, not a diagnosis or a probability of infection. The coordinates from your location or place search are sent to Open-Meteo for weather data. Humidity and rain are imperfect proxies for leaf wetness; risk also depends on crop stage, pathogen presence and field conditions. <a href="https://open-meteo.com/en/docs" target="_blank" rel="noreferrer">Weather data: Open-Meteo <ExternalLink size={11}/></a></p>
  </section>;
}
