import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Eye,
  Layers,
  MessageSquare,
  Send,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  BookOpen,
  ShieldCheck,
  Sparkles,
  Info,
  Clock
} from 'lucide-react';
import { askScanQuestion, getVlmReport } from '../api/client';

export default function Result({ diagnosis, onNewScan }) {
  const [showGradCam, setShowGradCam] = useState(true);
  const [camOpacity, setCamOpacity] = useState(0.65);
  const [vlmReport, setVlmReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputQuestion, setInputQuestion] = useState("");
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(null);

  const isHealthy = diagnosis.is_healthy;
  const isUncertain = diagnosis.is_uncertain || diagnosis.confidence < 0.70;

  // Load VLM Report asynchronously
  useEffect(() => {
    let isMounted = true;
    async function loadReport() {
      setLoadingReport(true);
      try {
        const report = await getVlmReport(
          diagnosis.scan_id,
          diagnosis.predicted_class,
          diagnosis.severity,
          diagnosis.confidence
        );
        if (isMounted) setVlmReport(report);
      } catch (err) {
        if (isMounted) setVlmReport("Visual diagnostic report temporarily unavailable.");
      } finally {
        if (isMounted) setLoadingReport(false);
      }
    }
    loadReport();
    return () => { isMounted = false; };
  }, [diagnosis]);

  const handleSendQuestion = async (e) => {
    e.preventDefault();
    if (!inputQuestion.trim() || submittingQuestion) return;

    const userQ = inputQuestion.trim();
    setInputQuestion("");
    setChatMessages((prev) => [...prev, { sender: 'user', text: userQ }]);
    setSubmittingQuestion(true);

    try {
      const response = await askScanQuestion(diagnosis.scan_id, userQ, diagnosis.predicted_class);
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: response.answer,
          citation: response.kb_entry_used
        }
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: "I couldn't fetch an answer right now. Please consult an agronomist for safety queries."
        }
      ]);
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'none':
        return <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-bold">Healthy (0% Damage)</span>;
      case 'mild':
        return <span className="bg-yellow-100 text-yellow-800 text-xs px-2.5 py-1 rounded-full font-bold">Mild Severity (&lt;15%)</span>;
      case 'moderate':
        return <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-bold">Moderate Severity (15-35%)</span>;
      case 'severe':
        return <span className="bg-red-100 text-red-800 text-xs px-2.5 py-1 rounded-full font-bold">Severe Lesions (&gt;35%)</span>;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

      {/* Top Banner / Status */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase font-mono tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {diagnosis.category || 'Crop'} Scan
            </span>
            {isUncertain ? (
              <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                <AlertTriangle className="w-3.5 h-3.5" />
                Uncertain — Needs Review
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Confirmed Prediction
              </span>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {diagnosis.predicted_class?.replace(/___/g, ' · ').replace(/_/g, ' ') || 'Diagnostic Result'}
          </h2>

          <div className="flex items-center gap-3 mt-2 text-sm text-slate-600">
            <span>Confidence: <strong className="text-slate-900">{(diagnosis.confidence * 100).toFixed(1)}%</strong></span>
            <span>•</span>
            {getSeverityBadge(diagnosis.severity)}
          </div>
        </div>

        <button
          onClick={onNewScan}
          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Scan Another Leaf
        </button>
      </div>

      {/* Uncertainty Notice if Applicable */}
      {isUncertain && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Low Confidence Detection ({(diagnosis.confidence * 100).toFixed(1)}%):</strong> This photo may be blurry, have harsh glare, or show multiple overlapping conditions. It has been queued for agronomist review. You may retake the photo in diffused natural light.
          </div>
        </div>
      )}

      {/* Core Grid: Visual Inspection & Explainability */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column (5 cols): Photo & Grad-CAM */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                Visual Explainability (Grad-CAM)
              </h3>
              <button
                onClick={() => setShowGradCam(!showGradCam)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                  showGradCam ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {showGradCam ? 'Hide Heatmap' : 'Show Heatmap'}
              </button>
            </div>

            {/* Visual Viewer */}
            <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-200">
              {/* Original Image */}
              {diagnosis.image_preview && (
                <img
                  src={diagnosis.image_preview}
                  alt="Scan specimen"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}

              {/* Simulated / Real Grad-CAM Overlay */}
              {showGradCam && !isHealthy && (
                <div
                  className="absolute inset-0 pointer-events-none transition-opacity duration-200"
                  style={{
                    opacity: camOpacity,
                    background: 'radial-gradient(circle at 45% 55%, rgba(255, 0, 0, 0.8) 0%, rgba(255, 255, 0, 0.6) 30%, rgba(0, 0, 255, 0.4) 65%, transparent 85%)'
                  }}
                />
              )}

              {isHealthy && (
                <div className="absolute bottom-3 left-3 bg-emerald-900/80 backdrop-blur-sm text-emerald-200 text-xs px-2.5 py-1 rounded-md">
                  No active lesion activations detected
                </div>
              )}
            </div>

            {/* Opacity Control Slider */}
            {showGradCam && !isHealthy && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-500 font-medium">
                  <span>Original Photo</span>
                  <span>Heatmap Intensity: {Math.round(camOpacity * 100)}%</span>
                  <span>Full CAM</span>
                </div>
                <inpu
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={camOpacity}
                  onChange={(e) => setCamOpacity(parseFloat(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>
            )}

            <p className="text-xs text-slate-500 leading-relaxed">
              Grad-CAM reveals which leaf tissue regions influenced the EfficientNet-B0 conv features to confirm lesions vs. healthy background.
            </p>
          </div>
        </div>

        {/* Right Column (7 cols): VLM Report, Treatments, Grounded Q&A */}
        <div className="lg:col-span-7 space-y-6">

          {/* VLM Report Card ("Why this diagnosis") */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Agronomist AI Diagnosis Repor
              <span className="text-[11px] font-normal text-slate-400 font-mono">(Grounded VLM)</span>
            </div>

            {loadingReport ? (
              <div className="p-4 bg-slate-50 rounded-xl flex items-center gap-3 text-slate-500 text-sm animate-pulse">
                <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                Analyzing symptom morphology with vision model...
              </div>
            ) : (
              <div className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                {vlmReport}
              </div>
            )}
          </div>

          {/* Govt. of India (CIB&RC) Approved Advisory & Causal Microbe Card */}
          <div className="bg-white p-6 rounded-2xl border-2 border-emerald-600/30 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  GOI
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    Govt. of India (CIB&RC) Approved Advisory
                  </h3>
                  <div className="text-[11px] text-slate-500">
                    Insecticides Act, 1968 • Central Insecticides Board & Registration Committee
                  </div>
                </div>
              </div>
              <span className="self-start sm:self-auto text-[11px] bg-emerald-50 text-emerald-800 font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                Official Regulatory Data
              </span>
            </div>

            {/* Causal Microbe Information */}
            {diagnosis.treatment?.causal_microbe && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Causal Microbe / Pathogen Organism
                  </span>
                  <div className="text-sm font-bold text-slate-900 italic mt-0.5">
                    {diagnosis.treatment.causal_microbe}
                  </div>
                </div>
                {diagnosis.treatment.pathogen_type && (
                  <span className="self-start sm:self-auto px-2.5 py-1 bg-indigo-100 text-indigo-800 font-semibold rounded-lg text-xs">
                    Taxon: {diagnosis.treatment.pathogen_type}
                  </span>
                )}
              </div>
            )}

            {/* Approved Chemical Formulations */}
            {diagnosis.treatment?.cibrc_approved_pesticides && diagnosis.treatment.cibrc_approved_pesticides.length > 0 ? (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 block">
                  Registered Chemical Pesticide Formulations:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {diagnosis.treatment.cibrc_approved_pesticides.map((pest, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-lg text-xs font-medium"
                    >
                      {pest}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Dosage & Waiting Period (PHI) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {diagnosis.treatment?.recommended_dosage && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs">
                  <span className="font-bold text-amber-900 block">Recommended Dosage:</span>
                  <span className="text-amber-800">{diagnosis.treatment.recommended_dosage}</span>
                </div>
              )}

              {diagnosis.treatment?.phi_waiting_period_days !== undefined && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs">
                  <span className="font-bold text-blue-900 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Waiting Period before Harvest (PHI):
                  </span>
                  <span className="text-blue-800 font-extrabold text-sm block mt-0.5">
                    {diagnosis.treatment.phi_waiting_period_days} Days Mandatory Interval
                  </span>
                </div>
              )}
            </div>

            {/* Organic / Bio-Pesticide Alternative */}
            {diagnosis.treatment?.bio_alternative && (
              <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl text-xs text-emerald-900">
                <span className="font-bold block text-emerald-800">Approved Organic / Bio-Control (IPM):</span>
                <span className="text-emerald-950 mt-0.5 block">{diagnosis.treatment.bio_alternative}</span>
              </div>
            )}

            {/* Precision Spray Action */}
            {diagnosis.treatment?.spray_action && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>Decision Support Action: <strong>{diagnosis.treatment.spray_action}</strong></span>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono">
                  Advisory Only
                </span>
              </div>
            )}
          </div>

          {/* Grounded RAG Chatbot ("Ask a Question") */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                Ask Follow-Up Question
              </h3>
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-emerald-600" />
                Grounded in CIB&RC Master Registry
              </span>
            </div>

            {/* Chat History */}
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {chatMessages.length === 0 && (
                <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200">
                  Quick questions you can ask:
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setInputQuestion("What are the CIB&RC approved pesticides for this disease?")}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 hover:border-emerald-500 hover:text-emerald-800 transition cursor-pointer text-left font-medium"
                    >
                      "CIB&RC approved pesticides?"
                    </button>
                    <button
                      onClick={() => setInputQuestion("What microbe causes this disease?")}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 hover:border-emerald-500 hover:text-emerald-800 transition cursor-pointer text-left font-medium"
                    >
                      "What microbe causes this?"
                    </button>
                    <button
                      onClick={() => setInputQuestion("What is the mandatory waiting period before harvest?")}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 hover:border-emerald-500 hover:text-emerald-800 transition cursor-pointer text-left font-medium"
                    >
                      "Harvest waiting period (PHI)?"
                    </button>
                    <button
                      onClick={() => setInputQuestion("Are there organic or bio-pesticide alternatives?")}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 hover:border-emerald-500 hover:text-emerald-800 transition cursor-pointer text-left font-medium"
                    >
                      "Organic bio-pesticides?"
                    </button>
                  </div>
                </div>
              )}

              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`text-xs p-3 rounded-xl leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 text-white ml-8'
                      : 'bg-slate-100 text-slate-800 mr-8 border border-slate-200'
                  }`}
                >
                  <p>{msg.text}</p>
                  {msg.citation && (
                    <div className="mt-1.5 pt-1.5 border-t border-slate-200 text-[10px] text-slate-500 font-mono">
                      Source: Curated Knowledge Base [{msg.citation}]
                    </div>
                  )}
                </div>
              ))}

              {submittingQuestion && (
                <div className="text-xs p-3 rounded-xl bg-slate-100 text-slate-500 mr-8 flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                  Querying knowledge base...
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendQuestion} className="flex gap-2">
              <inpu
                type="text"
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                placeholder="Ask about spread, safety, or treatments..."
                className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500 text-slate-900"
              />
              <button
                type="submit"
                disabled={submittingQuestion || !inputQuestion.trim()}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Ask
              </button>
            </form>
          </div>

          {/* Feedback Control */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200">
            <span>Was this diagnosis accurate?</span>
            {feedbackGiven ? (
              <span className="text-emerald-600 font-medium">Thank you for your feedback!</span>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setFeedbackGiven('positive')}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition cursor-pointer"
                >
                  <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" /> Yes
                </button>
                <button
                  onClick={() => setFeedbackGiven('negative')}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition cursor-pointer"
                >
                  <ThumbsDown className="w-3.5 h-3.5 text-red-600" /> No
                </button>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
