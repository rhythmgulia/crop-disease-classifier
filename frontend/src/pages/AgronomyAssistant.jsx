import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  User,
  Sparkles,
  ShieldCheck,
  BookOpen,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Sprout,
  Volume2,
  VolumeX,
  Pause,
  Image as ImageIcon,
  X,
  Languages,
  Radio,
  AlertTriangle,
  Eye,
  Square,
  Mic,
  MicOff
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import {
  askScanQuestion,
  predictImage,
  transcribeAudio,
  synthesizeSpeech,
  getSupportedLanguages,
  getVoiceStatus,
  FALLBACK_LANGUAGES,
} from '../api/client';

const LANGUAGE_GREETINGS = {
  'hi-IN': {
    confirmText: 'भाषा हिन्दी चुनी गई। अब आप माइक दबाकर हिन्दी में बोल सकते हैं, फसल सुरक्षा का सवाल पूछ सकते हैं या पौधे की तस्वीर भेज सकते हैं।',
    name: 'Hindi',
    native: 'हिन्दी'
  },
  'ta-IN': {
    confirmText: 'தமிழ் மொழி தேர்ந்தெடுக்கப்பட்டது. இப்போது நீங்கள் மைக்ரோஃபோனில் பேசி உங்கள் பயிர் கேள்விகளைக் கேட்கலாம் அல்லது இலையின் புகைப்படத்தைப் பதிவேற்றலாம்.',
    name: 'Tamil',
    native: 'தமிழ்'
  },
  'te-IN': {
    confirmText: 'తెలుగు భాష ఎంపిక చేయబడింది. ఇప్పుడు మీరు మాట్లాడవచ్చు లేదా పంట సంరక్షణ ప్రశ్నలను అడగవచ్చు లేదా ఆకు ఫోటోను అప్‌లోడ్ చేయవచ్చు.',
    name: 'Telugu',
    native: 'తెలుగు'
  },
  'kn-IN': {
    confirmText: 'ಕನ್ನಡ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆ ಮಾಡಲಾಗಿದೆ. ಈಗ ನೀವು ಮೈಕ್ರೊಫೋನ್‌ನಲ್ಲಿ ಮಾತನಾಡಬಹುದು ಅಥವಾ ಬೆಳೆ ರೋಗಗಳ ಬಗ್ಗೆ ಕೇಳಬಹುದು.',
    name: 'Kannada',
    native: 'ಕನ್ನಡ'
  },
  'bn-IN': {
    confirmText: 'বাংলা ভাষা নির্বাচন করা হয়েছে। এখন আপনি মাইকে কথা বলে আপনার ফসলের রোগ এবং চিকিৎসার বিষয়ে জানতে পারেন।',
    name: 'Bengali',
    native: 'বাংলা'
  },
  'mr-IN': {
    confirmText: 'मराठी भाषा निवडली गेली आहे. आता आपण माइकवर बोलून आपल्या पिकाच्या रोगांबद्दल आणि औषधांबद्दल विचारू शकता.',
    name: 'Marathi',
    native: 'मराठी'
  },
  'gu-IN': {
    confirmText: 'ગુજરાતી ભાષા પસંદ કરવામાં આવી છે. હવે તમે માઇક્રોફોન દ્વારા બોલીને તમારા પાક વિશે પ્રશ્નો પૂછી શકો છો.',
    name: 'Gujarati',
    native: 'ગુજરાતી'
  },
  'pa-IN': {
    confirmText: 'ਪੰਜਾਬੀ ਭਾਸ਼ਾ ਚੁਣੀ ਗਈ ਹੈ। ਹੁਣ ਤੁਸੀਂ ਮਾਈਕ ਰਾਹੀਂ ਬੋਲ ਕੇ ਆਪਣੀ ਫਸਲ ਦੀ ਬਿਮਾਰੀ ਅਤੇ ਸਪਰੇਅ ਬਾਰੇ ਪੁੱਛ ਸਕਦੇ ਹੋ।',
    name: 'Punjabi',
    native: 'ਪੰਜਾਬੀ'
  },
  'en-IN': {
    confirmText: 'Language set to English. You can now speak into your microphone, type your plant questions, or upload a leaf photo for instant AI diagnosis.',
    name: 'English',
    native: 'English'
  }
};

export default function AgronomyAssistant({ initialScan = null, initialContext = null, storageKey = 'agrovision_assistant_messages' }) {
  const { isDark } = useTheme();
  const { addToast } = useToast();
  const messagesEndRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const [savedContext] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`${storageKey}_context`) || '{}'); }
    catch { return {}; }
  });
  const contextClass = typeof initialContext === 'string'
    ? initialContex
    : initialContext?.disease_class || initialContext?.predicted_class || null;

  const [selectedClass, setSelectedClass] = useState(
    initialScan?.predicted_class || initialScan?.disease_class || contextClass || savedContext.selectedClass || null
  );
  const [scanId, setScanId] = useState(
    initialScan?.scan_id || savedContext.scanId || null
  );

  useEffect(() => {
    if (contextClass) {
      setSelectedClass(contextClass);
      setScanId(null);
    } else if (initialScan?.predicted_class || initialScan?.disease_class) {
      setSelectedClass(initialScan.predicted_class || initialScan.disease_class);
      setScanId(initialScan.scan_id || null);
    }
  }, [contextClass, initialScan?.predicted_class, initialScan?.disease_class, initialScan?.scan_id]);

  useEffect(() => {
    localStorage.setItem(`${storageKey}_context`, JSON.stringify({ selectedClass, scanId }));
  }, [selectedClass, scanId, storageKey]);

  // Multilingual state (persisted in localStorage)
  const [languages, setLanguages] = useState(FALLBACK_LANGUAGES);
  const [selectedLanguage, setSelectedLanguage] = useState(
    () => localStorage.getItem('agrovision_preferred_lang') || 'en-IN'
  );
  const [voiceStatus, setVoiceStatus] = useState({ sarvam_configured: false });

  // Voice Interaction & Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [autoPlayVoice, setAutoPlayVoice] = useState(true);
  const [playingMessageId, setPlayingMessageId] = useState(null);
  const [audioLoadingId, setAudioLoadingId] = useState(null);

  // Image Attachment State
  const [attachedImage, setAttachedImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [isClassifyingImage, setIsClassifyingImage] = useState(false);

  // Chat message state: prompts for language if not yet chosen by user
  const [messages, setMessages] = useState(() => {
    try {
      const savedMessages = localStorage.getItem(storageKey);
      if (savedMessages) return JSON.parse(savedMessages);
    } catch (error) {
      console.warn('Could not restore assistant conversation:', error);
    }
    const savedLang = localStorage.getItem('agrovision_preferred_lang');
    if (!savedLang) {
      return [
        {
          id: 'welcome-lang-prompt',
          sender: 'assistant',
          text: `🌱 **Welcome to Wisteria AI Plant Doctor!**\n\nChoose your language from the selector above, then ask about crop symptoms, treatment, dosage, or harvest safety.`,
          citation: `Multilingual Voice System [9 Indian Languages]`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ];
    }
    return [
      {
        id: 'welcome',
        sender: 'assistant',
        text: "I’m Wisteria’s crop-care assistant. Ask about symptoms, approved treatments, dosage, or harvest safety. Type or speak in your preferred language.",
        isLanguagePrompt: true,
        citation: "Wisteria Crop Health Assistant",
        language_code: savedLang,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });
  useEffect(() => {
    try {
      const conversation = messages.map(({ audio_base64, imageUrl, ...message }) => message);
      localStorage.setItem(storageKey, JSON.stringify(conversation));
    } catch (error) {
      console.warn('Could not save assistant conversation:', error);
    }
  }, [messages, storageKey]);
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Load languages & Sarvam voice capability on moun
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [langs, vStatus] = await Promise.all([
          getSupportedLanguages(),
          getVoiceStatus()
        ]);
        if (langs && langs.length > 0) setLanguages(langs);
        if (vStatus) {
          setVoiceStatus(vStatus);
          if (!vStatus.sarvam_configured) {
            setAutoPlayVoice(false);
          }
        }
      } catch (err) {
        console.warn("Failed to load voice/language status:", err);
      }
    }
    loadMetadata();
  }, []);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, isRecording, isTranscribing, isClassifyingImage]);

  // Clean up audio playback on unmoun
  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Language Change Handler
  const handleLanguageChange = async (newLangCode, speakGreeting = true) => {
    setSelectedLanguage(newLangCode);
    localStorage.setItem('agrovision_preferred_lang', newLangCode);
    const langObj = languages.find((l) => l.code === newLangCode) || { name: newLangCode, native: '' };
    addToast(`Switched conversation language to ${langObj.name} (${langObj.native})`, 'info');

    const greeting = LANGUAGE_GREETINGS[newLangCode]?.confirmText ||
      `Language set to ${langObj.name}. How can I assist you with your plants today?`;

    const confirmMsgId = `asst-lang-${Date.now()}`;
    const confirmMsg = {
      id: confirmMsgId,
      sender: 'assistant',
      text: greeting,
      citation: `Language [${langObj.name} - ${langObj.native || newLangCode}]`,
      language_code: newLangCode,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, confirmMsg]);

    if (speakGreeting && autoPlayVoice && voiceStatus?.sarvam_configured) {
      try {
        const res = await synthesizeSpeech(greeting, newLangCode);
        if (res.audio_base64) {
          setMessages((prev) =>
            prev.map((m) => (m.id === confirmMsgId ? { ...m, audio_base64: res.audio_base64 } : m))
          );
          playAudioBase64(res.audio_base64, confirmMsgId);
        }
      } catch (e) {
        console.warn("Greeting speech synthesis note:", e);
      }
    }
  };

  // Audio Playback Helpers
  const playAudioBase64 = (base64Audio, messageId) => {
    if (!base64Audio) return;

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      if (playingMessageId === messageId) {
        setPlayingMessageId(null);
        return;
      }
    }

    const audioUrl = `data:audio/wav;base64,${base64Audio}`;
    const player = new Audio(audioUrl);
    audioPlayerRef.current = player;
    setPlayingMessageId(messageId);

    player.onended = () => {
      setPlayingMessageId(null);
    };

    player.onerror = (e) => {
      console.warn("Audio playback error:", e);
      setPlayingMessageId(null);
      addToast("Audio playback failed", "error");
    };

    player.play().catch((err) => {
      console.warn("Autoplay blocked or playback error:", err);
      setPlayingMessageId(null);
    });
  };

  const handleSynthesizeAndPlay = async (msg) => {
    if (playingMessageId === msg.id && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setPlayingMessageId(null);
      return;
    }

    if (msg.audio_base64) {
      playAudioBase64(msg.audio_base64, msg.id);
      return;
    }

    if (!voiceStatus?.sarvam_configured) {
      addToast("Sarvam AI key not configured. Add SARVAM_API_KEY to your .env file to enable speech synthesis.", "warning");
      return;
    }

    setAudioLoadingId(msg.id);
    try {
      const res = await synthesizeSpeech(msg.text, msg.language_code || selectedLanguage);
      if (res.audio_base64) {
        // Cache audio base64 in message
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, audio_base64: res.audio_base64 } : m))
        );
        playAudioBase64(res.audio_base64, msg.id);
      } else {
        addToast("Voice response unavailable", "error");
      }
    } catch (err) {
      addToast(err.response?.data?.detail || "Voice synthesis failed", "error");
    } finally {
      setAudioLoadingId(null);
    }
  };

  const handleStopAllAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setPlayingMessageId(null);
  };

  // Microphone Push-to-Talk Handling
  const startRecording = async () => {
    if (!voiceStatus?.sarvam_configured) {
      addToast("Sarvam AI key not configured. Add SARVAM_API_KEY to your .env file to enable voice recognition.", "warning");
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      addToast("Microphone recording is not supported in this browser.", "error");
      return;
    }

    handleStopAllAudio();
    audioChunksRef.current = [];
    setRecordingSeconds(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        clearInterval(recordingTimerRef.current);
        setIsRecording(false);

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        if (audioBlob.size < 100) {
          addToast("Recording was too short or empty. Please try speaking again.", "warning");
          return;
        }

        await processSpokenAudio(audioBlob);
      };

      mediaRecorder.start(250);
      setIsRecording(true);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 29) {
            // Sarvam Saaras 30s limi
            stopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);

      addToast("Listening... Speak now in your selected language.", "info");
    } catch (err) {
      console.error("Microphone access error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        addToast("Microphone access denied. Please grant permission in your browser settings.", "error");
      } else {
        addToast(`Microphone error: ${err.message}`, "error");
      }
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    clearInterval(recordingTimerRef.current);
  };

  const processSpokenAudio = async (audioBlob) => {
    setIsTranscribing(true);
    try {
      const transcribeRes = await transcribeAudio(audioBlob, selectedLanguage);
      const transcribedText = transcribeRes.transcript?.trim();

      if (!transcribedText) {
        addToast("Could not recognize any speech. Please try speaking again.", "warning");
        setIsTranscribing(false);
        return;
      }

      // Automatically send the transcribed question into RAG
      await handleSendMessage(transcribedText);
    } catch (err) {
      console.error("Speech-to-Text error:", err);
      addToast(err.response?.data?.detail || "Voice transcription failed. Try typing your question.", "error");
    } finally {
      setIsTranscribing(false);
    }
  };

  // Image Upload Handling
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast("Please upload an image file (PNG, JPG, JPEG, WEBP)", "error");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      addToast("Image exceeds 15MB limit", "error");
      return;
    }

    setAttachedImage(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const removeAttachedImage = () => {
    setAttachedImage(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Send Message (Text, Voice, or Image Diagnosis)
  const handleSendMessage = async (textToSend = null) => {
    const query = (textToSend !== null ? textToSend : inputQuery).trim();
    const hasImage = !!attachedImage;

    if (!query && !hasImage) return;
    if (isTyping || isClassifyingImage) return;

    const userMessageId = `user-${Date.now()}`;
    const imagePreviewToKeep = imagePreviewUrl;
    const fileToUpload = attachedImage;

    // Reset inputs
    setInputQuery('');
    setAttachedImage(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    // Append user message
    const userMsg = {
      id: userMessageId,
      sender: 'user',
      text: query || (hasImage ? "Uploaded leaf photo for AI diagnosis." : ""),
      imageUrl: imagePreviewToKeep,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    let activeContextClass = selectedClass;
    let activeScanId = scanId;
    let diagnosisResult = null;

    // Step A: If an image is attached, invoke EfficientNet-B0 classifier firs
    if (hasImage && fileToUpload) {
      setIsClassifyingImage(true);
      try {
        diagnosisResult = await predictImage(fileToUpload);
        if (diagnosisResult && diagnosisResult.predicted_class) {
          activeContextClass = diagnosisResult.predicted_class;
          activeScanId = diagnosisResult.scan_id || activeScanId;
          setSelectedClass(activeContextClass);
          setScanId(activeScanId);
        }
      } catch (err) {
        console.warn("Image classification error:", err);
        addToast("EfficientNet-B0 inference error, using knowledge base context", "warning");
      } finally {
        setIsClassifyingImage(false);
      }
    }

    // Step B: Formulate RAG query
    let ragPrompt = query;
    if (!ragPrompt && diagnosisResult) {
      ragPrompt = `What disease is this ${diagnosisResult.crop} suffering from, what is the cause, and how do I treat it safely under CIB&RC regulations?`;
    }

    try {
      const response = await askScanQuestion(
        activeScanId,
        ragPrompt,
        activeContextClass,
        selectedLanguage,
        autoPlayVoice
      );

      // Automatically sync UI context if user question was about a specific crop/disease
      if (response.detected_disease_class && response.detected_disease_class !== selectedClass) {
        setSelectedClass(response.detected_disease_class);
      }

      const assistantMessageId = `asst-${Date.now()}`;
      const effectiveClass = response.detected_disease_class || activeContextClass;
      const assistantMsg = {
        id: assistantMessageId,
        sender: 'assistant',
        text: response.answer || "No response received from agronomy engine.",
        citation: response.kb_entry_used || `CIB&RC Registry [${effectiveClass}]`,
        language_code: selectedLanguage,
        audio_base64: response.audio_base64 || null,
        diagnosis: diagnosisResult,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // If autoPlayVoice is enabled and audio is present, play i
      if (autoPlayVoice && response.audio_base64) {
        playAudioBase64(response.audio_base64, assistantMessageId);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: "I encountered an error retrieving the agronomic recommendation. Please verify your connection or try again.",
          citation: "Offline Advisory Fallback",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      addToast("Failed to connect to Agronomy Assistant backend", "error");
    } finally {
      setIsTyping(false);
    }
  };

  const handleCopyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    addToast("Response copied to clipboard", "success");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    handleStopAllAudio();
    removeAttachedImage();
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'assistant',
        text: "Chat cleared. Ask about crop symptoms, treatment, dosage, or harvest safety.",
        citation: "Wisteria Crop Health Assistant",
        language_code: selectedLanguage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    addToast("Chat history cleared", "info");
  };

  const suggestedQuestions = [
    "What caused this disease?",
    "Which CIB&RC approved pesticide is recommended?",
    "What is the recommended dosage and dilution?",
    "How long is the Pre-Harvest Interval (PHI)?",
    "Are there organic or bio-pesticide alternatives?",
    "What are the typical symptoms and spread mechanism?"
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-500 font-semibold">
              AGRONOMY · MULTILINGUAL
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Sarvam Saaras & Bulbul
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
              EfficientNet-B0
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
              CIB&RC Grounded
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Crop-care assistant</h2>
          <p className={`text-xs ${isDark ? 'text-[#929C95]' : 'text-slate-600'}`}>
            Ask about symptoms, treatment, dosage, or harvest safety in nine Indian languages. Upload a leaf for an AI diagnosis.
          </p>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Global Stop Audio Button (visible if audio is currently playing) */}
          {playingMessageId && (
            <button
              onClick={handleStopAllAudio}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition animate-pulse"
              title="Stop audio playback"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Stop Voice
            </button>
          )}

          {/* Auto-Play Toggle */}
          <button
            onClick={() => setAutoPlayVoice(!autoPlayVoice)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
              autoPlayVoice
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : isDark
                ? 'bg-[#151E19] border-[#1F2E25] text-[#929C95]'
                : 'bg-white border-slate-200 text-slate-500'
            }`}
            title="Toggle automatic speech playback"
          >
            {autoPlayVoice ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            Auto-Speak: {autoPlayVoice ? 'On' : 'Off'}
          </button>

          {/* Clear Chat */}
          <button
            onClick={handleClearChat}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
              isDark
                ? 'bg-[#151E19] border-[#1F2E25] text-[#929C95] hover:text-[#F5F7F5]'
                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* Main Chat Grid */}
      <div className="grid grid-cols-1 gap-4">

        {/* Right Column: Chat Window & Input Bar */}
        <div className={`rounded-2xl border flex flex-col h-[700px] ${
          isDark ? 'bg-[#151E19] border-[#1F2E25]' : 'bg-white border-slate-200 shadow-sm'
        }`}>

          {/* Chat Header */}
          <div className={`px-5 py-3.5 border-b flex items-center justify-between shrink-0 ${
            isDark ? 'border-[#1F2E25] bg-[#101713]/50' : 'border-slate-200 bg-slate-50/50'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold tracking-tight">Wisteria Assistant</h3>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className={`text-[10px] font-mono ${isDark ? 'text-[#929C95]' : 'text-slate-500'}`}>
                    Crop health guidance &bull; {selectedLanguage}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full border ${
                isDark ? 'bg-[#101713] border-[#1F2E25] text-emerald-400' : 'bg-white border-slate-200 text-emerald-600'
              }`}>
                Multilingual Voice & RAG
              </span>
            </div>
          </div>

          {/* Quick Language Selector Bar */}
          <div className={`px-4 py-2 border-b flex items-center gap-3 shrink-0 ${
            isDark ? 'bg-[#101713]/90 border-[#1F2E25]' : 'bg-slate-100/70 border-slate-200'
          }`}>
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold shrink-0">
              <Languages className="w-3.5 h-3.5" />
              <span className="font-mono text-[11px] uppercase tracking-wider">Language</span>
            </div>
            <select aria-label="Preferred language" value={selectedLanguage} onChange={e => handleLanguageChange(e.target.value, true)}
              className={`min-w-44 max-w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 ${isDark ? 'bg-[#151E19] border-[#1F2E25] text-[#F5F7F5]' : 'bg-white border-slate-200 text-slate-800'}`}>
              {languages.map(lang => <option key={lang.code} value={lang.code}>{lang.native || lang.name} ({lang.name})</option>)}
            </select>
          </div>

          {/* Notice banner if Sarvam AI is not configured */}
          {!voiceStatus?.sarvam_configured && (
            <div className="mx-4 mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-300 shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-semibold text-amber-200">Sarvam Voice API Key Not Detected: </span>
                Plant diagnosis and CIB&RC knowledge Q&A are fully operational in text mode. To enable Indic voice push-to-talk (Saaras v4) and natural speech synthesis (Bulbul v4-flash), set <code className="bg-black/40 px-1.5 py-0.5 rounded text-amber-200 font-mono">SARVAM_API_KEY=your_key</code> in your <code className="bg-black/40 px-1.5 py-0.5 rounded text-amber-200 font-mono">.env</code> file.
              </div>
            </div>
          )}

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => {
              if (msg.sender === 'system') {
                return (
                  <div key={msg.id} className="flex justify-center my-2">
                    <span className={`text-[11px] font-mono px-3 py-1 rounded-full border ${
                      isDark ? 'bg-[#101713] border-[#1F2E25] text-[#929C95]' : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}>
                      {msg.text}
                    </span>
                  </div>
                );
              }

              const isAssistant = msg.sender === 'assistant';
              const isPlayingThis = playingMessageId === msg.id;
              const isLoadingAudioThis = audioLoadingId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-[88%] ${
                    isAssistant ? 'self-start' : 'self-end ml-auto flex-row-reverse'
                  }`}
                >
                  {/* Avatar */}
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    isAssistan
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                      : 'bg-emerald-600 text-white'
                  }`}>
                    {isAssistant ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                  </div>

                  {/* Bubble Content */}
                  <div className="space-y-1 w-full">
                    <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                      isAssistan
                        ? isDark
                          ? 'bg-[#101713] border border-[#1F2E25] text-[#F5F7F5]'
                          : 'bg-slate-100 text-slate-800 border border-slate-200'
                        : 'bg-emerald-600 text-white rounded-tr-sm'
                    }`}>
                      {/* Attached Image Thumbnail (for User Message) */}
                      {msg.imageUrl && (
                        <div className="mb-2 rounded-xl overflow-hidden border border-emerald-400/30 max-w-[220px]">
                          <img
                            src={msg.imageUrl}
                            alt="Uploaded Leaf Scan"
                            className="w-full h-32 object-cover"
                          />
                        </div>
                      )}

                      {/* Diagnostic Result Card (if Assistant Diagnosed an Image) */}
                      {msg.diagnosis && (
                        <div className={`mb-3 p-3 rounded-xl border ${
                          msg.diagnosis.is_uncertain
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        }`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-mono uppercase tracking-wider font-bold">
                              EfficientNet-B0 AI Diagnosis
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/30 font-semibold">
                              {(msg.diagnosis.confidence * 100).toFixed(1)}% Confidence
                            </span>
                          </div>

                          <div className="text-sm font-bold text-white mb-1">
                            {msg.diagnosis.crop} — {msg.diagnosis.predicted_class.split('___')[1]?.replace(/_/g, ' ') || 'Condition'}
                          </div>

                          {msg.diagnosis.is_uncertain && (
                            <div className="flex items-center gap-1.5 text-[11px] text-amber-400 mt-1">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>Low confidence (&lt;60%). Please confirm with a field agronomist.</span>
                            </div>
                          )}

                          {msg.diagnosis.gradcam_url && (
                            <div className="mt-2 pt-2 border-t border-emerald-500/20 flex items-center justify-between">
                              <span className="text-[10px] font-mono text-emerald-400">Grad-CAM Heatmap:</span>
                              <a
                                href={msg.diagnosis.gradcam_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] font-mono flex items-center gap-1 underline text-emerald-300 hover:text-emerald-200"
                              >
                                <Eye className="w-3 h-3" />
                                View Attention Map
                              </a>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Main Message Text */}
                      <div className="whitespace-pre-line">
                        {msg.text}
                      </div>

                      {/* Assistant Actions Bar: Voice Playback, Citation, Copy */}
                      {isAssistant && (
                        <div className={`mt-3 pt-2.5 border-t flex items-center justify-between gap-2 text-[10px] font-mono flex-wrap ${
                          isDark ? 'border-[#1F2E25] text-[#929C95]' : 'border-slate-200 text-slate-500'
                        }`}>
                          {/* Citation */}
                          <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                            <BookOpen className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="truncate">Ref: {msg.citation}</span>
                          </div>

                          {/* Controls: Audio Play/Pause + Copy */}
                          <div className="flex items-center gap-2">
                            {/* Voice Button */}
                            <button
                              onClick={() => handleSynthesizeAndPlay(msg)}
                              disabled={isLoadingAudioThis}
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition ${
                                isPlayingThis
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse'
                                  : isDark
                                  ? 'bg-[#151E19] hover:bg-[#1C2820] text-[#929C95] hover:text-[#F5F7F5] border-[#1F2E25]'
                                  : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border-slate-200'
                              }`}
                              title={isPlayingThis ? 'Pause Voice' : 'Listen to Spoken Voice'}
                            >
                              {isLoadingAudioThis ? (
                                <span className="animate-spin text-xs">⏳</span>
                              ) : isPlayingThis ? (
                                <>
                                  <Pause className="w-3 h-3 text-emerald-400" />
                                  <span>Playing</span>
                                </>
                              ) : (
                                <>
                                  <Volume2 className="w-3 h-3 text-emerald-400" />
                                  <span>{msg.audio_base64 ? 'Replay' : 'Listen'}</span>
                                </>
                              )}
                            </button>

                            {/* Copy Button */}
                            <button
                              onClick={() => handleCopyText(msg.text, msg.id)}
                              className="p-1 hover:text-emerald-400 transition"
                              title="Copy response"
                            >
                              {copiedId === msg.id ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className={`text-[9px] font-mono px-1 ${
                      isAssistant ? 'text-left' : 'text-right'
                    } ${isDark ? 'text-[#5C6660]' : 'text-slate-400'}`}>
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Active Speech Transcription Indicator */}
            {isTranscribing && (
              <div className="flex gap-3 max-w-[80%] self-start animate-pulse">
                <div className="w-7 h-7 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 text-blue-400">
                  <Mic className="w-3.5 h-3.5 animate-bounce" />
                </div>
                <div className={`p-3 rounded-2xl border text-xs flex items-center gap-2 ${
                  isDark ? 'bg-[#101713] border-[#1F2E25] text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-800'
                }`}>
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
                  <span className="font-mono text-[11px]">Transcribing your speech via Saaras v4...</span>
                </div>
              </div>
            )}

            {/* Vision Classifier Indicator */}
            {isClassifyingImage && (
              <div className="flex gap-3 max-w-[80%] self-start animate-pulse">
                <div className="w-7 h-7 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 text-purple-400">
                  <Sprout className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className={`p-3 rounded-2xl border text-xs flex items-center gap-2 ${
                  isDark ? 'bg-[#101713] border-[#1F2E25] text-purple-300' : 'bg-purple-50 border-purple-200 text-purple-800'
                }`}>
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping"></span>
                  <span className="font-mono text-[11px]">Running EfficientNet-B0 plant disease diagnosis...</span>
                </div>
              </div>
            )}

            {/* Typing Indicator */}
            {isTyping && !isClassifyingImage && (
              <div className="flex gap-3 max-w-[80%] self-start">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className={`p-3 rounded-2xl border text-xs flex items-center gap-1.5 ${
                  isDark ? 'bg-[#101713] border-[#1F2E25] text-[#929C95]' : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]"></span>
                  <span className="text-[10px] font-mono ml-2">Searching CIB&RC knowledge base & generating advisory...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Query Chips */}
          <div className={`px-4 py-2 border-t flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 ${
            isDark ? 'border-[#1F2E25] bg-[#101713]/30' : 'border-slate-200 bg-slate-50/50'
          }`}>
            <span className={`text-[10px] uppercase font-mono tracking-wider shrink-0 mr-1 ${
              isDark ? 'text-[#5C6660]' : 'text-slate-400'
            }`}>
              Suggested:
            </span>
            {suggestedQuestions.map((chip, idx) => (
              <button
                key={idx}
                disabled={isTyping || isRecording || isTranscribing}
                onClick={() => handleSendMessage(chip)}
                className={`text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full border transition shrink-0 ${
                  isDark
                    ? 'bg-[#151E19] border-[#1F2E25] text-[#929C95] hover:text-[#F5F7F5] hover:border-emerald-500/40'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-emerald-500'
                }`}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Attached Image Preview Ribbon (if selected before sending) */}
          {attachedImage && imagePreviewUrl && (
            <div className={`px-4 py-2.5 border-t flex items-center justify-between shrink-0 ${
              isDark ? 'bg-[#101713] border-[#1F2E25]' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                <img
                  src={imagePreviewUrl}
                  alt="Upload preview"
                  className="w-10 h-10 rounded-lg object-cover border border-emerald-500/40"
                />
                <div>
                  <div className="text-xs font-semibold truncate max-w-[200px]">
                    {attachedImage.name}
                  </div>
                  <div className={`text-[10px] font-mono ${isDark ? 'text-[#929C95]' : 'text-slate-500'}`}>
                    {(attachedImage.size / 1024).toFixed(0)} KB &bull; Leaf Photo Ready for Diagnosis
                  </div>
                </div>
              </div>

              <button
                onClick={removeAttachedImage}
                className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 transition"
                title="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Active Voice Recording Ribbon */}
          {isRecording && (
            <div className="px-4 py-3 border-t bg-rose-500/10 border-rose-500/30 flex items-center justify-between shrink-0 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping"></div>
                <div>
                  <div className="text-xs font-bold text-rose-400">
                    Recording Voice ({recordingSeconds}s / 30s)
                  </div>
                  <div className="text-[10px] text-rose-300 font-mono">
                    Speak clearly in {languages.find((l) => l.code === selectedLanguage)?.name || selectedLanguage}. Click Stop when finished.
                  </div>
                </div>
              </div>

              <button
                onClick={stopRecording}
                className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs flex items-center gap-1.5 transition shadow"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop & Transcribe</span>
              </button>
            </div>
          )}

          {/* Input Bar */}
          <div className={`p-4 border-t shrink-0 ${
            isDark ? 'border-[#1F2E25] bg-[#101713]/80' : 'border-slate-200 bg-white'
          }`}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              {/* Image Upload Button */}
              <inpu
                type="file"
                ref={fileInputRef}
                onChange={handleImageFileChange}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isTyping || isRecording}
                className={`p-2.5 rounded-xl border transition shrink-0 ${
                  attachedImage
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : isDark
                    ? 'bg-[#151E19] border-[#1F2E25] text-[#929C95] hover:text-[#F5F7F5] hover:border-emerald-500/40'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-emerald-500'
                }`}
                title="Attach plant or leaf image for EfficientNet-B0 diagnosis"
              >
                <ImageIcon className="w-4 h-4" />
              </button>

              {/* Text Input */}
              <inpu
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder={
                  attachedImage
                    ? "Add a question about this plant photo, or press Send for diagnosis..."
                    : `Ask about symptoms, treatment, dosage, or harvest safety...`
                }
                disabled={isTyping || isRecording || isTranscribing}
                className={`flex-1 text-xs px-4 py-2.5 rounded-xl border outline-none transition ${
                  isDark
                    ? 'bg-[#151E19] border-[#1F2E25] text-[#F5F7F5] placeholder-[#5C6660] focus:border-emerald-500'
                    : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-emerald-500'
                }`}
              />

              {/* Push-to-Talk Microphone Button */}
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={isTyping || isTranscribing}
                  className={`p-2.5 rounded-xl border transition shrink-0 ${
                    isDark
                      ? 'bg-[#151E19] border-[#1F2E25] text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30'
                      : 'bg-slate-50 border-slate-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-400'
                  }`}
                  title="Speak your question (Saaras v4 Speech-to-Text)"
                >
                  <Mic className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="p-2.5 rounded-xl bg-rose-500 text-white transition shrink-0 animate-pulse"
                  title="Stop recording"
                >
                  <MicOff className="w-4 h-4" />
                </button>
              )}

              {/* Send Button */}
              <button
                type="submit"
                disabled={(!inputQuery.trim() && !attachedImage) || isTyping || isRecording || isTranscribing}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow-sm shrink-0"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
