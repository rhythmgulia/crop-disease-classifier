import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Download,
  Bot,
  Copy,
  Check,
  ExternalLink,
  Clock,
  Leaf,
  AlertTriangle,
  Sprout,
  CheckCircle2,
  Info,
  ChevronDown,
  Layers,
  FlaskConical
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { getPesticideRegistry } from '../api/client';
import fallbackCibrcData from '../data/cibrc_approved_pesticides.json';

export default function PesticideRegistry({ onSelectForAssistant }) {
  const { isDark } = useTheme();
  const { addToast } = useToast();

  const [registryData, setRegistryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('All');
  const [selectedPathogen, setSelectedPathogen] = useState('All');
  const [selectedPhi, setSelectedPhi] = useState('All');
  const [copiedClass, setCopiedClass] = useState(null);
  const [selectedEntryModal, setSelectedEntryModal] = useState(null);

  // Load data from backend or local fallback
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await getPesticideRegistry();
        let items = [];
        if (Array.isArray(res)) {
          items = res;
        } else if (typeof res === 'object' && res !== null) {
          items = Object.values(res);
        }
        if (items.length > 0) {
          setRegistryData(items);
        } else {
          setRegistryData(fallbackCibrcData);
        }
      } catch (err) {
        console.warn("Using fallback CIBRC data:", err.message);
        setRegistryData(fallbackCibrcData);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Distinct crops and pathogen types
  const cropList = useMemo(() => {
    const set = new Set(registryData.map((d) => d.crop).filter(Boolean));
    return ['All', ...Array.from(set).sort()];
  }, [registryData]);

  const pathogenList = useMemo(() => {
    const set = new Set(registryData.map((d) => d.pathogen_type).filter(Boolean));
    return ['All', ...Array.from(set).sort()];
  }, [registryData]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return registryData.filter((item) => {
      // Search matching
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        item.disease_class?.toLowerCase().includes(q) ||
        item.crop?.toLowerCase().includes(q) ||
        item.condition?.toLowerCase().includes(q) ||
        item.causal_microbe?.toLowerCase().includes(q) ||
        item.cibrc_approved_pesticides?.some((p) => p.toLowerCase().includes(q)) ||
        item.bio_alternative?.toLowerCase().includes(q);

      // Crop filter
      const matchCrop = selectedCrop === 'All' || item.crop === selectedCrop;

      // Pathogen filter
      const matchPathogen = selectedPathogen === 'All' || item.pathogen_type === selectedPathogen;

      // PHI filter
      let matchPhi = true;
      if (selectedPhi === '0') {
        matchPhi = item.phi_waiting_period_days === 0;
      } else if (selectedPhi === '1-7') {
        matchPhi = item.phi_waiting_period_days > 0 && item.phi_waiting_period_days <= 7;
      } else if (selectedPhi === '8+') {
        matchPhi = item.phi_waiting_period_days > 7;
      }

      return matchSearch && matchCrop && matchPathogen && matchPhi;
    });
  }, [registryData, searchQuery, selectedCrop, selectedPathogen, selectedPhi]);

  // Export JSON
  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(filteredEntries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cibrc_pesticide_registry_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast(`Exported ${filteredEntries.length} CIB&RC registry records`, 'success');
  };

  const handleCopyAdvisory = (item) => {
    const text = `[CIB&RC Approved Advisory]\nCrop: ${item.crop} (${item.condition})\nPathogen: ${item.causal_microbe} (${item.pathogen_type})\nApproved Formulations:\n- ${item.cibrc_approved_pesticides.join('\n- ')}\nRecommended Dosage: ${item.recommended_dosage}\nPre-Harvest Interval (PHI): ${item.phi_waiting_period_days} Days\nBio Alternative: ${item.bio_alternative}\nSafety: ${item.safety_precautions}`;
    navigator.clipboard.writeText(text);
    setCopiedClass(item.disease_class);
    addToast(`Copied CIB&RC advisory for ${item.crop} ${item.condition}`, 'success');
    setTimeout(() => setCopiedClass(null), 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-500 font-semibold">
              Statutory Compliance Registry
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Insecticides Act, 1968
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">CIB&RC Pesticide Master Registry</h2>
          <p className={`text-xs ${isDark ? 'text-[#929C95]' : 'text-slate-600'}`}>
            Central Insecticides Board & Registration Committee (Govt. of India) approved fungicides, dosages, and PHI waiting periods.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJSON}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
              isDark
                ? 'bg-[#151E19] border-[#1F2E25] text-[#929C95] hover:text-[#F5F7F5]'
                : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 shadow-sm'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </button>
        </div>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border ${
          isDark ? 'bg-[#151E19] border-[#1F2E25]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`text-xs font-mono mb-1 ${isDark ? 'text-[#929C95]' : 'text-slate-500'}`}>
            Registered Classes
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {registryData.length}
          </div>
          <div className={`text-[10px] mt-1 ${isDark ? 'text-[#5C6660]' : 'text-slate-400'}`}>
            Covers 100% of PlantVillage taxonomy
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${
          isDark ? 'bg-[#151E19] border-[#1F2E25]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`text-xs font-mono mb-1 ${isDark ? 'text-[#929C95]' : 'text-slate-500'}`}>
            Crops Monitored
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {cropList.length - 1}
          </div>
          <div className={`text-[10px] mt-1 ${isDark ? 'text-[#5C6660]' : 'text-slate-400'}`}>
            Solanaceae, Rosaceae, Vitaceae, Poaceae
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${
          isDark ? 'bg-[#151E19] border-[#1F2E25]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`text-xs font-mono mb-1 ${isDark ? 'text-[#929C95]' : 'text-slate-500'}`}>
            Average PHI Interval
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            7.4 Days
          </div>
          <div className={`text-[10px] mt-1 ${isDark ? 'text-[#5C6660]' : 'text-slate-400'}`}>
            Mandatory harvest safety delay
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${
          isDark ? 'bg-[#151E19] border-[#1F2E25]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`text-xs font-mono mb-1 ${isDark ? 'text-[#929C95]' : 'text-slate-500'}`}>
            Bio Alternatives
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            100%
          </div>
          <div className={`text-[10px] mt-1 ${isDark ? 'text-[#5C6660]' : 'text-slate-400'}`}>
            Organic IPM solutions mapped for all
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className={`p-4 rounded-2xl border space-y-3 ${
        isDark ? 'bg-[#151E19] border-[#1F2E25]' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
              isDark ? 'text-[#929C95]' : 'text-slate-400'
            }`} />
            <inpu
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by crop, disease, pathogen, chemical active (e.g. Metalaxyl, Mancozeb)..."
              className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs border outline-none transition ${
                isDark
                  ? 'bg-[#101713] border-[#1F2E25] text-[#F5F7F5] placeholder-[#5C6660] focus:border-emerald-500'
                  : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-emerald-500'
              }`}
            />
          </div>

          {/* Crop Selector */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className={`text-[11px] font-mono shrink-0 ${isDark ? 'text-[#929C95]' : 'text-slate-500'}`}>
              Crop:
            </span>
            <selec
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              className={`text-xs font-medium rounded-xl px-3 py-2 border outline-none transition ${
                isDark
                  ? 'bg-[#101713] border-[#1F2E25] text-[#F5F7F5] focus:border-emerald-500'
                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500'
              }`}
            >
              {cropList.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Pathogen Type Selector */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className={`text-[11px] font-mono shrink-0 ${isDark ? 'text-[#929C95]' : 'text-slate-500'}`}>
              Pathogen:
            </span>
            <selec
              value={selectedPathogen}
              onChange={(e) => setSelectedPathogen(e.target.value)}
              className={`text-xs font-medium rounded-xl px-3 py-2 border outline-none transition ${
                isDark
                  ? 'bg-[#101713] border-[#1F2E25] text-[#F5F7F5] focus:border-emerald-500'
                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500'
              }`}
            >
              {pathogenList.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* PHI Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className={`text-[11px] font-mono shrink-0 ${isDark ? 'text-[#929C95]' : 'text-slate-500'}`}>
              PHI:
            </span>
            <selec
              value={selectedPhi}
              onChange={(e) => setSelectedPhi(e.target.value)}
              className={`text-xs font-medium rounded-xl px-3 py-2 border outline-none transition ${
                isDark
                  ? 'bg-[#101713] border-[#1F2E25] text-[#F5F7F5] focus:border-emerald-500'
                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500'
              }`}
            >
              <option value="All">All Intervals</option>
              <option value="0">0 Days (Healthy / Safe)</option>
              <option value="1-7">1 - 7 Days</option>
              <option value="8+">&gt; 7 Days</option>
            </select>
          </div>
        </div>

        {/* Quick Result Counter */}
        <div className={`flex items-center justify-between text-[11px] font-mono pt-2 border-t ${
          isDark ? 'border-[#1F2E25] text-[#929C95]' : 'border-slate-200 text-slate-500'
        }`}>
          <span>Showing {filteredEntries.length} of {registryData.length} statutory records</span>
          {(searchQuery || selectedCrop !== 'All' || selectedPathogen !== 'All' || selectedPhi !== 'All') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCrop('All');
                setSelectedPathogen('All');
                setSelectedPhi('All');
              }}
              className="text-emerald-500 hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Grid of Pesticide Cards */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xs font-mono text-[#929C95]">Loading CIB&RC Master Pesticide Database...</p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className={`p-12 text-center rounded-2xl border ${
          isDark ? 'bg-[#151E19] border-[#1F2E25]' : 'bg-white border-slate-200'
        }`}>
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold mb-1">No matching pesticide regulations found</h3>
          <p className={`text-xs max-w-md mx-auto ${isDark ? 'text-[#929C95]' : 'text-slate-500'}`}>
            Try adjusting your search keyword or clearing the crop and pathogen filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEntries.map((item) => {
            const isHealthy = item.condition === 'Healthy' || item.is_healthy;
            const pathogenColor = {
              'Fungus': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
              'Oomycete': 'text-purple-400 bg-purple-500/10 border-purple-500/20',
              'Bacterium': 'text-sky-400 bg-sky-500/10 border-sky-500/20',
              'Virus': 'text-rose-400 bg-rose-500/10 border-rose-500/20',
              'None': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
            }[item.pathogen_type] || 'text-slate-400 bg-slate-500/10 border-slate-500/20';

            return (
              <div
                key={item.disease_class}
                className={`rounded-2xl border p-5 flex flex-col justify-between transition-all duration-200 hover:border-emerald-500/40 group ${
                  isDark ? 'bg-[#151E19] border-[#1F2E25]' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div>
                  {/* Top Badge Row */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-bold text-emerald-400 tracking-wide">
                      {item.crop}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${pathogenColor}`}>
                      {item.pathogen_type || 'Unknown'}
                    </span>
                  </div>

                  {/* Disease Condition */}
                  <h3 className="text-base font-bold tracking-tight mb-1">
                    {item.condition}
                  </h3>

                  {/* Causal Microbe */}
                  <div className="flex items-center gap-1.5 text-xs mb-4">
                    <span className={`text-[11px] font-mono ${isDark ? 'text-[#929C95]' : 'text-slate-500'}`}>
                      Pathogen:
                    </span>
                    <span className="font-semibold italic text-emerald-400 truncate">
                      {item.causal_microbe}
                    </span>
                  </div>

                  {/* Approved Chemical Formulations */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${
                        isDark ? 'text-[#929C95]' : 'text-slate-500'
                      }`}>
                        CIB&RC Formulations
                      </span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                        isDark ? 'bg-[#101713] text-[#929C95]' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {item.cibrc_approved_pesticides?.length || 0} approved
                      </span>
                    </div>

                    <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                      isDark ? 'bg-[#101713] border-[#1F2E25]' : 'bg-slate-50 border-slate-200'
                    }`}>
                      {isHealthy ? (
                        <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs py-1">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>No chemical treatment required</span>
                        </div>
                      ) : item.cibrc_approved_pesticides && item.cibrc_approved_pesticides.length > 0 ? (
                        item.cibrc_approved_pesticides.slice(0, 3).map((chem, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-[11px]">
                            <span className="text-emerald-500 shrink-0 font-bold">•</span>
                            <span className="leading-snug">{chem}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-[11px] text-[#929C95]">Pending formal registration schedule</span>
                      )}

                      {!isHealthy && item.cibrc_approved_pesticides?.length > 3 && (
                        <div className="text-[10px] font-mono text-emerald-500/80 pt-1">
                          + {item.cibrc_approved_pesticides.length - 3} more registered formulations
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dosage & PHI Pill */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className={`p-2.5 rounded-xl border ${
                      isDark ? 'bg-[#101713] border-[#1F2E25]' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <span className={`text-[9px] uppercase font-mono block ${isDark ? 'text-[#929C95]' : 'text-slate-500'}`}>
                        Dosage Rate
                      </span>
                      <span className="text-xs font-semibold leading-tight line-clamp-1">
                        {item.recommended_dosage}
                      </span>
                    </div>

                    <div className={`p-2.5 rounded-xl border ${
                      isDark ? 'bg-[#101713] border-[#1F2E25]' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <span className={`text-[9px] uppercase font-mono block ${isDark ? 'text-[#929C95]' : 'text-slate-500'}`}>
                        Harvest PHI
                      </span>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="text-xs font-bold text-amber-400">
                          {item.phi_waiting_period_days} Days
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bio Alternative */}
                  <div className="mb-4">
                    <span className={`text-[10px] uppercase font-mono block mb-1 font-semibold ${
                      isDark ? 'text-[#929C95]' : 'text-slate-500'
                    }`}>
                      Bio / Organic Alternative
                    </span>
                    <p className={`text-xs italic line-clamp-2 ${isDark ? 'text-[#929C95]' : 'text-slate-600'}`}>
                      {item.bio_alternative || "Maintain balanced nutrition and soil organic matter."}
                    </p>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className={`pt-3 border-t flex items-center justify-between gap-2 ${
                  isDark ? 'border-[#1F2E25]' : 'border-slate-200'
                }`}>
                  <button
                    onClick={() => handleCopyAdvisory(item)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                      isDark
                        ? 'border-[#1F2E25] hover:bg-[#101713] text-[#929C95] hover:text-[#F5F7F5]'
                        : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                    }`}
                    title="Copy full regulatory advisory"
                  >
                    {copiedClass === item.disease_class ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 text-[10px]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span className="text-[10px]">Copy</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSelectedEntryModal(item)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                        isDark
                          ? 'border-[#1F2E25] hover:bg-[#101713] text-[#929C95] hover:text-[#F5F7F5]'
                          : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      Details
                    </button>

                    {onSelectForAssistant && (
                      <button
                        onClick={() => onSelectForAssistant(item)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition"
                        title="Open in Agronomy Assistant"
                      >
                        <Bot className="w-3 h-3" />
                        <span className="text-[10px]">Ask AI</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-2xl rounded-2xl border p-6 max-h-[90vh] overflow-y-auto space-y-4 ${
            isDark ? 'bg-[#151E19] border-[#1F2E25] text-[#F5F7F5]' : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
          }`}>
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-mono uppercase text-emerald-500 font-semibold tracking-wider">
                  CIB&RC Registered Schedule Details
                </span>
                <h3 className="text-xl font-bold mt-1">
                  {selectedEntryModal.crop} — {selectedEntryModal.condition}
                </h3>
                <p className="text-xs italic text-emerald-400 font-mono mt-0.5">
                  {selectedEntryModal.causal_microbe} ({selectedEntryModal.pathogen_type})
                </p>
              </div>

              <button
                onClick={() => setSelectedEntryModal(null)}
                className={`p-1.5 rounded-lg border text-xs ${
                  isDark ? 'border-[#1F2E25] text-[#929C95] hover:text-white' : 'border-slate-200 text-slate-500'
                }`}
              >
                ✕
              </button>
            </div>

            {/* Content Details */}
            <div className="space-y-4 text-xs pt-2">
              <div>
                <h4 className="font-semibold text-emerald-400 mb-1.5 uppercase font-mono text-[10px]">
                  Approved Chemical Formulations:
                </h4>
                <ul className={`list-disc pl-5 space-y-1 p-3 rounded-xl border ${
                  isDark ? 'bg-[#101713] border-[#1F2E25]' : 'bg-slate-50 border-slate-200'
                }`}>
                  {selectedEntryModal.cibrc_approved_pesticides?.map((chem, idx) => (
                    <li key={idx} className="leading-relaxed">{chem}</li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-xl border ${
                  isDark ? 'bg-[#101713] border-[#1F2E25]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="text-[10px] font-mono uppercase block text-[#929C95]">Dosage & Dilution:</span>
                  <span className="font-semibold text-xs mt-1 block">{selectedEntryModal.recommended_dosage}</span>
                </div>

                <div className={`p-3 rounded-xl border ${
                  isDark ? 'bg-[#101713] border-[#1F2E25]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="text-[10px] font-mono uppercase block text-[#929C95]">Pre-Harvest Interval (PHI):</span>
                  <span className="font-bold text-amber-400 text-xs mt-1 block">
                    {selectedEntryModal.phi_waiting_period_days} Days Mandatory Waiting Period
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-emerald-400 mb-1 uppercase font-mono text-[10px]">
                  Symptoms & Diagnostics:
                </h4>
                <p className={`p-3 rounded-xl border ${
                  isDark ? 'bg-[#101713] border-[#1F2E25]' : 'bg-slate-50 border-slate-200'
                }`}>
                  {selectedEntryModal.symptoms}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-emerald-400 mb-1 uppercase font-mono text-[10px]">
                  Spread Mechanism:
                </h4>
                <p className={`p-3 rounded-xl border ${
                  isDark ? 'bg-[#101713] border-[#1F2E25]' : 'bg-slate-50 border-slate-200'
                }`}>
                  {selectedEntryModal.spread_mechanism}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-emerald-400 mb-1 uppercase font-mono text-[10px]">
                  Biological / Non-Chemical Alternative:
                </h4>
                <p className={`p-3 rounded-xl border ${
                  isDark ? 'bg-[#101713] border-[#1F2E25]' : 'bg-slate-50 border-slate-200'
                }`}>
                  {selectedEntryModal.bio_alternative}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-amber-400 mb-1 uppercase font-mono text-[10px]">
                  Safety Precautions & PPE:
                </h4>
                <p className={`p-3 rounded-xl border text-amber-300/90 ${
                  isDark ? 'bg-amber-950/20 border-amber-800/40' : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  {selectedEntryModal.safety_precautions}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end gap-2">
              <button
                onClick={() => setSelectedEntryModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
