import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  Camera,
  Image as ImageIcon,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Layers,
  Clock,
  FileText,
  MessageSquare,
  RefreshCw,
  X,
  Eye,
  Info,
  ChevronRight,
  ExternalLink,
  Sliders
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { predictImage, getVlmReport, askScanQuestion } from '../api/client';

const isCompleteScan = scan => Boolean(
  scan?.scan_id && scan?.image_url && scan?.confidence != null && Number.isFinite(Number(scan.confidence)) && scan?.predicted_class
);

export default function DiseaseScanner({ onDiagnosisComplete, preloadedDiagnosis, onNavigateAssistant, isActive = true }) {
  const { isDark } = useTheme();
  const { addToast } = useToast();

  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  // Diagnosis State
  const [diagnosis, setDiagnosis] = useState(isCompleteScan(preloadedDiagnosis) ? preloadedDiagnosis : null);
  const [showGradCam, setShowGradCam] = useState(true);
  const [camOpacity, setCamOpacity] = useState(0.65);
  const [vlmReport, setVlmReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Webcam State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Sample Images for 1-Click Evaluation
  const testSamples = [
    {
      name: "Tomato Late Blight",
      crop: "Tomato",
      url: "/reference-leaves/tomato-late-blight.jpg",
      filename: "Tomato___Late_blight.jpg"
    },
    {
      name: "Apple Scab",
      crop: "Apple",
      url: "/reference-leaves/apple-scab.jpg",
      filename: "Apple___Apple_scab.jpg"
    },
    {
      name: "Healthy Potato",
      crop: "Potato",
      url: "/reference-leaves/healthy-potato.jpg",
      filename: "Potato___healthy.jpg"
    },
    {
      name: "Citrus Greening",
      crop: "Orange",
      url: "/reference-leaves/citrus-greening.jpg",
      filename: "Orange___Haunglongbing_(Citrus_greening).jpg"
    }
  ];

  // Stop camera when unmounting
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleFileSelect = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast('Please upload a valid image file (JPG, PNG)', 'error');
      return;
    }
    setSelectedFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setDiagnosis(null);
    setVlmReport(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSelectSample = async (sample) => {
    try {
      addToast(`Loading sample: ${sample.name}...`, 'info', 2000);
      const res = await fetch(sample.url);
      const blob = await res.blob();
      const file = new File([blob], sample.filename, { type: 'image/jpeg' });
      handleFileSelect(file);
    } catch (e) {
      addToast('Failed to load sample image', 'error');
    }
  };

  // Webcam Capture
  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      addToast("Camera permission denied or camera unavailable", "error");
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `live_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
        handleFileSelect(file);
        stopCamera();
      }
    }, 'image/jpeg', 0.95);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (!isActive) stopCamera();
  }, [isActive]);

  // Run AI Inference
  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setAnalysisProgress(20);

    const progressTimer = setInterval(() => {
      setAnalysisProgress((prev) => (prev < 90 ? prev + 15 : prev));
    }, 200);

    try {
      const result = await predictImage(selectedFile);
      clearInterval(progressTimer);
      setAnalysisProgress(100);
      setDiagnosis(result);
      if (onDiagnosisComplete) onDiagnosisComplete(result);
      addToast(`Diagnosis complete: ${result.predicted_class}`, 'success');
    } catch (err) {
      clearInterval(progressTimer);
      addToast(`Inference failed: ${err.message}`, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Generate VLM Grounded Repor
  const handleGenerateReport = async () => {
    if (!diagnosis) return;
    setLoadingReport(true);
    try {
      const text = await getVlmReport(
        diagnosis.scan_id,
        diagnosis.predicted_class,
        diagnosis.severity,
        diagnosis.confidence
      );
      setVlmReport(text);
      addToast("Visual Diagnosis Report generated", "success");
    } catch (e) {
      addToast("Failed to generate report", "error");
    } finally {
      setLoadingReport(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setDiagnosis(null);
    onDiagnosisComplete?.(null);
    setVlmReport(null);
    stopCamera();
  };

  const isHealthy = diagnosis?.is_healthy;
  const isUncertain = diagnosis?.confidence < 0.60;
  const completeDiagnosis = isCompleteScan(diagnosis);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
              Vision Core
            </span>
            <span className={`text-xs ${isDark ? 'text-[#929C95]' : 'text-slate-400'}`}>•</span>
            <span className={`text-xs ${isDark ? 'text-[#929C95]' : 'text-slate-500'}`}>EfficientNet-B0 Backbone (5.3M Parameters)</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">AI Crop Disease Scanner</h1>
          <p className={`text-xs mt-1 ${isDark ? 'text-[#929C95]' : 'text-slate-600'}`}>
            Upload or capture high-resolution leaf imagery for automated pathological diagnosis, Grad-CAM attention heatmaps, and CIB&RC regulatory advisories.
          </p>
        </div>

        {completeDiagnosis && (
          <button
            onClick={handleReset}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition ${
              isDark ? 'border-[#1F2E25] hover:bg-[#151E19]' : 'border-slate-200 hover:bg-slate-100'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>New Scan</span>
          </button>
        )}
      </div>

      {/* Upload & Scanner Section (If not diagnosed yet or previewing) */}
      {!completeDiagnosis && (
        <div className="space-y-6">
          {/* Main Upload Box */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`relative rounded-3xl border-2 border-dashed transition-all duration-300 p-8 sm:p-12 text-center overflow-hidden ${
              isDragging
                ? 'border-emerald-500 bg-emerald-500/5 scale-[0.99]'
                : isDark
                ? 'border-[#1F2E25] bg-[#151E19]/60 hover:border-emerald-500/40'
                : 'border-slate-300 bg-white hover:border-emerald-500/50 shadow-sm'
            }`}
          >
            {/* Live Camera Viewfinder */}
            {isCameraActive ? (
              <div className="max-w-md mx-auto space-y-4">
                <div className="relative rounded-2xl overflow-hidden border border-emerald-500/50 aspect-square bg-black shadow-2xl">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <div className="absolute inset-0 border-2 border-dashed border-emerald-400/50 rounded-2xl pointer-events-none m-6"></div>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] font-mono px-2.5 py-1 rounded-full bg-black/70 text-emerald-400 backdrop-blur-md">
                    Align leaf inside targe
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={capturePhoto}
                    className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg"
                  >
                    Capture Photo
                  </button>
                  <button
                    onClick={stopCamera}
                    className={`px-4 py-2.5 rounded-xl border text-xs font-semibold ${
                      isDark ? 'border-[#1F2E25] text-slate-300' : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : imagePreview ? (
              /* Selected Image Preview */
              <div className="max-w-md mx-auto space-y-4">
                <div className="relative rounded-2xl overflow-hidden border border-inherit aspect-square bg-black/20 group">
                  <img src={imagePreview} alt="Selected Leaf" className="w-full h-full object-contain" />
                  <button
                    onClick={handleReset}
                    className="absolute top-3 right-3 p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white transition backdrop-blur-md"
                    title="Remove Image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs px-2">
                  <span className="truncate max-w-[200px] font-medium">{selectedFile?.name || "Leaf Specimen"}</span>
                  <span className={`font-mono ${isDark ? 'text-[#929C95]' : 'text-slate-500'}`}>
                    {(selectedFile?.size / 1024).toFixed(1)} KB
                  </span>
                </div>

                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition shadow-xl shadow-emerald-950/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                      <span>Analyzing Cellular Morphology ({analysisProgress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Analyze Image (Run AI Diagnostic)</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* Standard Upload Prompt */
              <div className="max-w-md mx-auto space-y-4">
                <div className={`w-16 h-16 mx-auto rounded-2xl border flex items-center justify-center ${
                  isDark ? 'bg-[#101713] border-[#1F2E25] text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                }`}>
                  <UploadCloud className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="text-base font-bold tracking-tight">Drag and drop leaf imagery here</h3>
                  <p className={`text-xs mt-1 max-w-sm mx-auto leading-relaxed ${isDark ? 'text-[#929C95]' : 'text-slate-500'}`}>
                    Supports high-resolution JPG, JPEG, and PNG. For optimal accuracy, fill 70%+ of the frame with a single leaf against natural or neutral backdrop.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-md"
                  >
                    Browse Files
                  </button>
                  <button
                    onClick={startCamera}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold transition ${
                      isDark ? 'border-[#1F2E25] hover:bg-[#1A2620] text-slate-200' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Use Camera</span>
                  </button>
                </div>

                <inpu
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {/* Quick-Test 1-Click Samples */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold tracking-tight">Try a held-out PlantVillage test image:</span>
              <span className={`text-[10px] font-mono ${isDark ? 'text-[#929C95]' : 'text-slate-500'}`}>PlantVillage test split</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {testSamples.map((sample, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectSample(sample)}
                  className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center gap-3 group ${
                    isDark
                      ? 'bg-[#151E19] border-[#1F2E25] hover:border-emerald-500/40 hover:bg-[#1A2620]'
                      : 'bg-white border-slate-200 hover:border-emerald-500/40 hover:bg-slate-50'
                  }`}
                >
                  <img
                    src={sample.url}
                    alt={sample.name}
                    className="w-10 h-10 rounded-lg object-cover border border-inherit shrink-0 group-hover:scale-105 transition"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate leading-tight">{sample.name}</p>
                    <p className={`text-[10px] font-mono mt-0.5 ${isDark ? 'text-[#929C95]' : 'text-slate-500'}`}>
                      {sample.crop} Specimen
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Diagnosis Results Section */}
      {completeDiagnosis && (
        <div className="space-y-6 animate-slide-in">

          {/* Top Result Banner */}
          <div className={`p-6 rounded-2xl border transition relative overflow-hidden ${
            isHealthy
              ? isDark ? 'bg-[#0E2018] border-emerald-900/60' : 'bg-emerald-50/70 border-emerald-200'
              : isDark ? 'bg-[#1F1416] border-rose-900/60' : 'bg-rose-50/70 border-rose-200'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                  isHealthy
                    ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/20 border-rose-500/30 text-rose-400'
                }`}>
                  {isHealthy ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                      isHealthy
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}>
                      {isHealthy ? 'Healthy Plant Tissue' : `Infected: ${diagnosis.severity} Severity`}
                    </span>
                    <span className={`text-xs ${isDark ? 'text-[#929C95]' : 'text-slate-400'}`}>•</span>
                    <span className="text-xs font-mono font-semibold">{diagnosis.crop} ({diagnosis.category})</span>
                  </div>

                  <h2 className="text-2xl font-bold tracking-tight mt-1">
                    {diagnosis.predicted_class.replace(/___/g, ' — ').replace(/_/g, ' ')}
                  </h2>

                  <p className={`text-xs mt-1 max-w-xl ${isDark ? 'text-[#929C95]' : 'text-slate-600'}`}>
                    {diagnosis.treatment?.recommendation_text}
                  </p>
                </div>
              </div>

              {/* Confidence Score Pill */}
              <div className={`px-5 py-3 rounded-2xl border text-center shrink-0 ${
                isDark ? 'bg-[#101713]/80 border-[#1F2E25]' : 'bg-white/80 border-slate-200 shadow-sm'
              }`}>
                <div className="text-2xl font-extrabold font-mono text-emerald-400">
                  {(diagnosis.confidence * 100).toFixed(1)}%
                </div>
                <div className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-[#929C95]' : 'text-slate-500'}`}>
                  Model Certainty
                </div>
                {isUncertain && (
                  <span className="mt-1 inline-block text-[9px] font-mono text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
                    Flagged for Review
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Dual Column: Explainability & Treatment */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left: Grad-CAM Explainability (6 cols) */}
            <div className={`lg:col-span-6 p-6 rounded-2xl border space-y-4 ${
              isDark ? 'bg-[#151E19] border-[#1F2E25]' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <span>Grad-CAM Explainability</span>
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-[#929C95]' : 'text-slate-500'}`}>
                    Gradient-weighted Class Activation Mapping (Layer: features[-1])
                  </p>
                </div>

                <button
                  onClick={() => setShowGradCam(!showGradCam)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                    showGradCam
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : isDark ? 'border-[#1F2E25] text-slate-400' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{showGradCam ? "Heatmap Active" : "Original Only"}</span>
                </button>
              </div>

              {/* Viewport Box */}
              <div className="relative rounded-2xl overflow-hidden aspect-square border border-inherit bg-black/30 flex items-center justify-center">
                {/* Base uploaded image */}
                {(imagePreview || diagnosis.image_url) && (
                  <img
                    src={imagePreview || diagnosis.image_url}
                    alt="Original Leaf"
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                )}

                {/* Grad-CAM Heatmap Overlay */}
                {diagnosis.gradcam_url && showGradCam && (
                  <img
                    src={diagnosis.gradcam_url}
                    alt="Grad-CAM Overlay"
                    style={{ opacity: camOpacity }}
                    className="absolute inset-0 w-full h-full object-contain mix-blend-screen transition-opacity"
                  />
                )}

                {/* Heatmap Legend Badge */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between p-2.5 rounded-xl bg-black/75 backdrop-blur-md text-[11px] text-white">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                    <span>High Attention (Lesion Core)</span>
                  </div>
                  <span className="font-mono text-emerald-400">
                    Surface Damage: {diagnosis.damage_percentage?.toFixed(1) || '0.0'}%
                  </span>
                </div>
              </div>

              {/* Opacity Controller Slider */}
              {showGradCam && diagnosis.gradcam_url && (
                <div className={`p-3 rounded-xl border flex items-center justify-between gap-4 text-xs ${
                  isDark ? 'bg-[#101713] border-[#1F2E25]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="font-medium shrink-0 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                    Heatmap Intensity:
                  </span>
                  <inpu
                    type="range"
                    min="0.2"
                    max="1.0"
                    step="0.05"
                    value={camOpacity}
                    onChange={(e) => setCamOpacity(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <span className="font-mono text-emerald-400 w-10 text-right">
                    {Math.round(camOpacity * 100)}%
                  </span>
                </div>
              )}

              <p className={`text-[11px] leading-relaxed ${isDark ? 'text-[#929C95]' : 'text-slate-500'}`}>
                <strong>How to interpret:</strong> Jet-colormapped regions (red/yellow) indicate the specific morphological cell structures, necrotic lesions, or chlorotic halos that drove EfficientNet-B0's diagnostic classification.
              </p>
            </div>

            {/* Right: CIB&RC Regulatory Treatment Advisory (6 cols) */}
            <div className={`lg:col-span-6 p-6 rounded-2xl border space-y-4 ${
              isDark ? 'bg-[#151E19] border-[#1F2E25]' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>CIB&RC Regulatory Treatment Advisory</span>
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-[#929C95]' : 'text-slate-500'}`}>
                    Govt. of India Registered Pesticides (Insecticides Act, 1968)
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase font-bold">
                  Verified Entry
                </span>
              </div>

              {/* Pathogen Taxonomy Card */}
              <div className={`p-4 rounded-xl border ${
                isDark ? 'bg-[#101713] border-[#1F2E25]' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-500 font-mono mb-1">
                  Causal Pathogen Taxonomy
                </div>
                <div className="text-base font-bold italic tracking-tight">
                  {diagnosis.treatment?.causal_microbe || "Phytopathogenic Agent"}
                </div>
                <div className={`text-xs mt-0.5 ${isDark ? 'text-[#929C95]' : 'text-slate-500'}`}>
                  Taxon Classification: <strong className="text-inherit">{diagnosis.treatment?.pathogen_type || "Pathogen"}</strong>
                </div>
              </div>

              {/* Approved Formulations */}
              <div className="space-y-2 text-xs">
                <span className="font-semibold block text-inherit">Approved Chemical Formulations:</span>
                {diagnosis.treatment?.cibrc_approved_pesticides?.length > 0 ? (
                  <ul className="space-y-1.5">
                    {diagnosis.treatment.cibrc_approved_pesticides.map((pest, i) => (
                      <li
                        key={i}
                        className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                          isDark ? 'bg-[#101713] border-[#1F2E25]' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="font-medium text-inherit">{pest}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={`text-xs italic ${isDark ? 'text-[#929C95]' : 'text-slate-500'}`}>
                    No chemical sprays required for healthy tissue.
                  </p>
                )}
              </div>

              {/* Field Dosage & Waiting Period (PHI) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className={`p-3 rounded-xl border ${
                  isDark ? 'bg-[#101713] border-[#1F2E25]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className={`text-[10px] uppercase font-mono font-bold block ${
                    isDark ? 'text-[#929C95]' : 'text-slate-500'
                  }`}>
                    Recommended Dosage
                  </span>
                  <span className="font-semibold text-inherit mt-0.5 block">
                    {diagnosis.treatment?.recommended_dosage || "Per local agronomist advisory"}
                  </span>
                </div>

                <div className={`p-3 rounded-xl border ${
                  isDark ? 'bg-[#101713] border-blue-900/40 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-900'
                }`}>
                  <span className="text-[10px] uppercase font-mono font-bold block flex items-center gap-1">
                    <Clock className="w-3 h-3 text-blue-400" />
                    Waiting Period (PHI)
                  </span>
                  <span className="font-bold text-inherit mt-0.5 block text-sm">
                    {diagnosis.treatment?.phi_waiting_period_days ?? 14} Days before Harves
                  </span>
                </div>
              </div>

              {/* Biological / Organic Alternative */}
              {diagnosis.treatment?.bio_alternative && (
                <div className={`p-3.5 rounded-xl border ${
                  isDark ? 'bg-[#101713] border-[#1F2E25]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 font-mono tracking-wider block mb-1">
                    Certified Organic & Bio-Alternative
                  </span>
                  <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    {diagnosis.treatment.bio_alternative}
                  </p>
                </div>
              )}

              {/* Actions Footer */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={handleGenerateReport}
                  disabled={loadingReport}
                  className={`flex-1 w-full py-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition ${
                    isDark ? 'border-[#1F2E25] hover:bg-[#101713]' : 'border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{loadingReport ? "Generating VLM Report..." : "Generate Diagnosis Report"}</span>
                </button>

                <button
                  onClick={() => {
                    if (onNavigateAssistant) onNavigateAssistant(diagnosis);
                  }}
                  className="flex-1 w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-md"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Ask Agronomy Assistant</span>
                </button>
              </div>

              {/* VLM Report Output Modal/Box */}
              {vlmReport && (
                <div className={`p-4 rounded-xl border text-xs leading-relaxed animate-slide-in ${
                  isDark ? 'bg-[#101713] border-emerald-900/60 text-slate-200' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}>
                  <div className="font-bold text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1.5 text-emerald-400">
                    <Sparkles className="w-3 h-3" />
                    <span>Visual Language Model Diagnosis</span>
                  </div>
                  <p>{vlmReport}</p>
                </div>
              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
