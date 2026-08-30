import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Chunk, SourceCitation, QueryRecord } from '../types';
import { queryOfflineKnowledgeBase } from '../utils/offlineRAG';
import { 
  Sparkles, 
  Search, 
  Send, 
  BookOpen, 
  ShieldCheck, 
  FileText, 
  Copy, 
  Check, 
  Layers, 
  Building2, 
  AlertCircle, 
  HelpCircle, 
  ArrowRight, 
  History, 
  Bookmark,
  Share2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Compass,
  WifiOff,
  HardDrive,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Square,
  Globe,
  CheckCircle2,
} from 'lucide-react';

const SUBSIDIARY_PRESETS: Record<string, string[]> = {
  ALL: [
    "What is the certified proved reserve and ash percentage for Seam IV/V in Korba Sector C?",
    "What is the liquid nitrogen infusion rate mandated by DGMS for Jharia coalfield fire sealing?",
    "What is the 240T dumper availability and specific diesel consumption in NCL Singrauli projects?",
    "What are the statutory ventilation and methane cutoff standards mandated by DGMS?",
    "Compare slope stability standards between NCL and SECL opencast operations."
  ],
  NCL: [
    "What is the fleet availability and specific diesel consumption for 240T dumpers in Jayant OCP?",
    "What is the total overburden (OB) handled and shovel energy rate across NCL projects in Q1?",
    "Compare HEMM availability and utilization between Jayant and Nigahi opencast projects."
  ],
  SECL: [
    "What is the certified proved reserve and ash percentage for Seam IV/V in Korba Sector C?",
    "What is the overall pit slope angle and factor of safety (FoS) mandated for Gevra OC expansion?",
    "What are the groundwater recharge setback constraints for Korba West opencast block?"
  ],
  BCCL: [
    "What is the liquid nitrogen infusion rate mandated by DGMS for Jharia coalfield fire sealing?",
    "What are the subsurface temperature thresholds and drone survey frequencies for Jharia fire zones?"
  ],
  CCL: [
    "What is the clean coal yield and ash reduction achieved by Piprawar Coal Preparation Plant?",
    "What is the specific magnetite consumption benchmark at Piprawar Washery?"
  ],
  'CMPDI HQ': [
    "What are the statutory ventilation and methane cutoff standards mandated by DGMS?",
    "What is the minimum air quantity and inundation barrier distance mandated by safety guidelines?"
  ]
};

export const AiAssistant: React.FC = () => {
  const { 
    chunks, 
    documents,
    currentUser,
    addQueryRecord, 
    setActiveCitationForModal, 
    selectedSubsidiary, 
    setSelectedSubsidiary,
    similarCases, 
    setReportDraftFromAi, 
    setActiveView,
    setToastMessage,
    isUndergroundModeActive,
    cachedDocumentIds
  } = useApp();

  const [question, setQuestion] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isOfflineResult, setIsOfflineResult] = useState<boolean>(false);
  const [activeResult, setActiveResult] = useState<{
    foundInKnowledgeBase: boolean;
    answer: string;
    aiSummary?: string;
    citations: SourceCitation[];
    confidence: number;
    draftOfficialReply?: string;
    requiresClarification?: boolean;
  } | null>(null);

  const [showDraftReply, setShowDraftReply] = useState<boolean>(false);
  const [copiedAnswer, setCopiedAnswer] = useState<boolean>(false);
  const [copiedDraft, setCopiedDraft] = useState<boolean>(false);

  // Typewriter streaming effect state
  const [displayedAnswer, setDisplayedAnswer] = useState<string>('');

  // Voice Interaction States (STT & TTS)
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [autoSpeakAnswer, setAutoSpeakAnswer] = useState<boolean>(false);
  const [voiceSupported, setVoiceSupported] = useState<boolean>(true);
  const [speechStatusText, setSpeechStatusText] = useState<string>('');
  const recognitionRef = useRef<any>(null);

  const retrievableChunks = chunks.filter(chunk => {
    if (chunk.isApproved) return true;
    const sourceVersion = documents
      .find(document => document.id === chunk.documentId)
      ?.versions.find(version => version.id === chunk.documentVersionId);
    return sourceVersion?.uploadedBy.id === currentUser.id;
  }).map(chunk => ({ ...chunk, isApproved: true }));

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognizer = new SpeechRecognition();
      recognizer.continuous = false;
      recognizer.interimResults = true;
      recognizer.lang = 'en-IN'; // Optimized for Indian English mining terminology

      recognizer.onstart = () => {
        setIsListening(true);
        setSpeechStatusText('Listening... Speak your technical inquiry now');
      };

      recognizer.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const currentText = finalTranscript || interimTranscript;
        if (currentText) {
          setQuestion(currentText);
        }
      };

      recognizer.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        setSpeechStatusText(event.error === 'not-allowed' ? 'Microphone permission denied' : 'Voice input cancelled');
        setTimeout(() => setSpeechStatusText(''), 3000);
      };

      recognizer.onend = () => {
        setIsListening(false);
        setSpeechStatusText('');
      };

      recognitionRef.current = recognizer;
    } else {
      setVoiceSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      setToastMessage({
        type: 'warning',
        text: 'Speech recognition is not supported in this browser. Please type your query.',
      });
      return;
    }

    // Stop speaking if currently reading an answer
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setSpeechStatusText('');
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn('Recognition start exception:', e);
        recognitionRef.current.stop();
        setTimeout(() => recognitionRef.current.start(), 200);
      }
    }
  };

  // Text-To-Speech function to speak answer aloud
  const speakAnswerAloud = (textToSpeak?: string) => {
    if (!('speechSynthesis' in window)) {
      setToastMessage({
        type: 'warning',
        text: 'Text-to-speech is not supported on this device/browser.',
      });
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const rawText = textToSpeak || activeResult?.answer || displayedAnswer;
    if (!rawText) return;

    // Clean text from markdown formatting, asterisks, brackets for natural voice synthesis
    const cleanText = rawText
      .replace(/[*_~`#\[\]\(\)]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.96; // Slightly steady pace for technical & geological metrics
    utterance.pitch = 1.0;

    // Prefer English voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.includes('en-IN') || v.lang.includes('en-GB') || v.lang.includes('en-US'));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const handleAsk = async (queryText?: string, selectedDocumentId?: string) => {
    const q = queryText || question;
    if (!q.trim()) return;

    setIsSearching(true);
    setActiveResult(null);
    setDisplayedAnswer('');
    setShowDraftReply(false);

    // If Underground / Offline Mode is active, bypass cloud and query local offline cache directly
    if (isUndergroundModeActive) {
      setTimeout(() => {
        const offlineData = queryOfflineKnowledgeBase(
          q,
          retrievableChunks,
          selectedSubsidiary
        );

        setIsOfflineResult(true);
        setActiveResult(offlineData);
        addQueryRecord({
          questionText: q,
          foundInKnowledgeBase: offlineData.foundInKnowledgeBase,
          answerText: offlineData.answer,
          aiSummary: offlineData.aiSummary,
          confidence: offlineData.confidence,
          citations: offlineData.citations,
          draftOfficialReply: offlineData.draftOfficialReply,
        });

        // Typewriter effect
        let i = 0;
        const text = offlineData.answer;
        const interval = setInterval(() => {
          setDisplayedAnswer(text.slice(0, i + 8));
          i += 8;
          if (i > text.length) {
            clearInterval(interval);
            setDisplayedAnswer(text);
          }
        }, 12);

        setIsSearching(false);
      }, 350);
      return;
    }

    try {
      console.log('[AiAssistant] Dispatching query to backend /api/ai/ask (xAI Grok API endpoint)...', {
        question: q,
        subsidiary: selectedSubsidiary,
      });

      // Call full-stack server endpoint /api/ai/ask
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          approvedChunks: retrievableChunks,
          subsidiaryFilter: selectedSubsidiary,
          selectedDocumentId,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      console.log('[AiAssistant] Received response from /api/ai/ask:', {
        foundInKnowledgeBase: data.foundInKnowledgeBase,
        provider: data.provider || 'xai-grok',
        modelUsed: data.modelUsed,
        confidence: data.confidence,
        citationsCount: data.citations?.length || 0,
      });

      setIsOfflineResult(false);
      setActiveResult(data);
      addQueryRecord({
        questionText: q,
        foundInKnowledgeBase: data.foundInKnowledgeBase,
        answerText: data.answer,
        aiSummary: data.aiSummary,
        confidence: data.confidence,
        citations: data.citations || [],
        draftOfficialReply: data.draftOfficialReply,
      });

      // Stream / Reveal animation
      if (data.answer) {
        let i = 0;
        const text = data.answer;
        const interval = setInterval(() => {
          setDisplayedAnswer(text.slice(0, i + 8));
          i += 8;
          if (i > text.length) {
            clearInterval(interval);
            setDisplayedAnswer(text);
            if (autoSpeakAnswer && data.foundInKnowledgeBase) {
              speakAnswerAloud(text);
            }
          }
        }, 15);
      }
    } catch (err) {
      console.warn('Online AI ask failed; falling back to offline underground RAG:', err);
      const offlineFallback = queryOfflineKnowledgeBase(
        q,
        retrievableChunks,
        selectedSubsidiary
      );

      setIsOfflineResult(true);
      setActiveResult(offlineFallback);
      addQueryRecord({
        questionText: q,
        foundInKnowledgeBase: offlineFallback.foundInKnowledgeBase,
        answerText: offlineFallback.answer,
        aiSummary: offlineFallback.aiSummary,
        confidence: offlineFallback.confidence,
        citations: offlineFallback.citations,
        draftOfficialReply: offlineFallback.draftOfficialReply,
      });
      setDisplayedAnswer(offlineFallback.answer);
      if (autoSpeakAnswer && offlineFallback.foundInKnowledgeBase) {
        speakAnswerAloud(offlineFallback.answer);
      }
    } finally {
      setIsSearching(false);
    }
  };


  const handleCopyToReport = () => {
    if (!activeResult) return;
    setReportDraftFromAi({
      text: activeResult.answer,
      citations: activeResult.citations,
    });
    setToastMessage({
      type: 'success',
      text: 'Findings & citations copied to Report Generator wizard!'
    });
    setActiveView('reports');
  };

  const handleCopyText = (text: string, isDraft = false) => {
    navigator.clipboard.writeText(text);
    if (isDraft) {
      setCopiedDraft(true);
      setTimeout(() => setCopiedDraft(false), 2000);
    } else {
      setCopiedAnswer(true);
      setTimeout(() => setCopiedAnswer(false), 2000);
    }
  };

  return (
    <div id="ai-assistant-view" className="p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-7 max-w-7xl mx-auto">
      {/* Top Banner: Strict Grounding Directives */}
      <div className="bg-[#141C2B] text-white border border-[#1E293B] rounded-xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif font-bold text-lg sm:text-xl text-white">
            Ask Governed CMPDI & CIL Records
          </h2>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Every sentence and metric is linked to approved repository chunks. Unverifiable questions explicitly return "Not Found".
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-[#CBD5E1] bg-[#192234] px-3 py-1.5 rounded-lg border border-[#334155]">
            <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
            <span>Document Ingestion Pipeline Active</span>
          </div>
        </div>
      </div>

      {/* Main Search Input & Presets */}
      <div className="bg-white border border-[#E4E0D6] rounded-xl p-4 sm:p-6 shadow-xs space-y-4">
        {/* Voice Input Status Banner if Active */}
        {isListening && (
          <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-4 py-2.5 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#DC2626]">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
              </span>
              <span>VOICE COMMAND ACTIVE: Listening to your mining technical query...</span>
            </div>
            <button
              type="button"
              onClick={toggleVoiceInput}
              className="text-xs text-[#DC2626] font-bold underline hover:text-[#B91C1C] cursor-pointer"
            >
              Cancel / Stop Mic
            </button>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleAsk(); }} className="relative">
          <textarea
            id="input-ai-question"
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Type or click the microphone to speak technical inquiry (e.g. reserve figures, borehole depths, DGMS setback rules, coal grades)..."
            className="w-full p-3 sm:p-4 pb-14 sm:pb-4 pr-3 sm:pr-36 text-sm bg-[#FAF8F3] border border-[#E4E0D6] rounded-xl focus:outline-none focus:border-[#C8892E] text-[#141C2B] placeholder:text-[#94A3B8] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAsk();
              }
            }}
          />

          <div className="absolute right-3 bottom-3 flex items-center gap-1.5">
            {/* Voice Command Microphone Button */}
            <button
              type="button"
              id="btn-voice-input"
              onClick={toggleVoiceInput}
              title={isListening ? 'Click to stop listening' : 'Click to speak technical query using voice command'}
              className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer ${
                isListening
                  ? 'bg-[#DC2626] text-white animate-pulse border border-[#B91C1C]'
                  : 'bg-[#FAF8F3] hover:bg-[#EFEBE2] text-[#141C2B] border border-[#E4E0D6]'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4 text-white" />
                  <span className="hidden sm:inline text-[11px]">Listening...</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 text-[#C8892E]" />
                  <span className="hidden sm:inline text-[11px]">Voice</span>
                </>
              )}
            </button>

            {/* Ask Grounded Submit Button */}
            <button
              type="submit"
              id="btn-submit-ai-question"
              disabled={isSearching || !question.trim()}
              className="px-3.5 py-2 bg-[#141C2B] hover:bg-[#1E293B] disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              {isSearching ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-[#C8892E] animate-spin" />
                  <span>Retrieving...</span>
                </>
              ) : (
                <>
                  <span>Ask</span>
                  <Send className="w-3.5 h-3.5 text-[#C8892E]" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Audio & Voice Preferences Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#EFEBE2]">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#141C2B] cursor-pointer">
              <input
                type="checkbox"
                id="checkbox-auto-speak"
                checked={autoSpeakAnswer}
                onChange={(e) => setAutoSpeakAnswer(e.target.checked)}
                className="rounded text-[#C8892E] focus:ring-0 cursor-pointer"
              />
              <span className="font-mono text-[11px]">Auto-read answers aloud (Voice synthesis)</span>
            </label>
          </div>

          {isSpeaking && (
            <div className="flex items-center gap-2 text-xs font-mono text-[#C8892E] bg-[#FEF3C7] border border-[#FDE68A] px-2.5 py-0.5 rounded-full animate-pulse">
              <Volume2 className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Speaking answer aloud...</span>
              <button
                onClick={stopSpeaking}
                className="text-[10px] underline font-bold text-[#92400E] hover:text-black ml-1 cursor-pointer"
              >
                Stop
              </button>
            </div>
          )}
        </div>

        {/* Preset Query Chips (Section 5.5 Spec) */}
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#64748B] mb-2 font-semibold flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-[#C8892E]" />
              <span>Preset Technical Inquiries ({selectedSubsidiary === 'ALL' ? 'All Subsidiaries' : `${selectedSubsidiary} Scope`}):</span>
            </div>
            {selectedSubsidiary !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedSubsidiary('ALL')}
                className="text-[10px] text-[#C8892E] hover:underline font-mono cursor-pointer"
              >
                Reset to All CIL Subsidiaries
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {(SUBSIDIARY_PRESETS[selectedSubsidiary] || SUBSIDIARY_PRESETS.ALL).map((pq, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuestion(pq);
                  handleAsk(pq);
                }}
                className="text-left text-xs bg-[#FAF8F3] hover:bg-[#FDFBF7] text-[#334155] hover:text-[#141C2B] px-3 py-1.5 rounded-lg border border-[#E4E0D6] hover:border-[#C8892E] transition-all font-medium cursor-pointer"
              >
                {pq}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Answer & Citations Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Answer Main Panel: 8 Cols */}
        <div className="lg:col-span-8 space-y-6">
          {isSearching && (
            <div className="bg-white border border-[#E4E0D6] rounded-xl p-8 text-center space-y-3">
              <Sparkles className="w-8 h-8 text-[#C8892E] animate-spin mx-auto" />
              <h3 className="font-serif font-bold text-base text-[#141C2B]">
                Cross-Referencing Approved Chunks...
              </h3>
              <p className="text-xs text-[#64748B] font-mono">
                Scanning {chunks.filter(c => c.isApproved).length} approved vector records for {selectedSubsidiary === 'ALL' ? 'all CIL subsidiaries' : selectedSubsidiary}
              </p>
            </div>
          )}

          {activeResult && !isSearching && (
            <div className="bg-white border border-[#E4E0D6] rounded-xl p-6 shadow-xs space-y-5">
              {/* Status Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#EFEBE2]">
                <div className="flex flex-wrap items-center gap-2">
                  {activeResult.requiresClarification ? (
                    <span className="flex items-center gap-1 text-xs font-mono font-bold text-[#92400E] bg-[#FEF3C7] px-2.5 py-1 rounded-md border border-[#FDE68A]">
                      <HelpCircle className="w-4 h-4" />
                      <span>Source Selection Required</span>
                    </span>
                  ) : activeResult.foundInKnowledgeBase ? (
                    <span className="flex items-center gap-1 text-xs font-mono font-bold text-[#16A34A] bg-[#F0FDF4] px-2.5 py-1 rounded-md border border-[#BBF7D0]">
                      <ShieldCheck className="w-4 h-4" />
                      <span>{activeResult.confidence.toFixed(1)}% Grounded Confidence</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-mono font-bold text-[#DC2626] bg-[#FEF2F2] px-2.5 py-1 rounded-md border border-[#FECACA]">
                      <AlertCircle className="w-4 h-4" />
                      <span>Zero Supporting Records Found</span>
                    </span>
                  )}
                  
                  {isOfflineResult && (
                    <span className="flex items-center gap-1 text-xs font-mono font-bold text-[#92400E] bg-[#FEF3C7] px-2.5 py-1 rounded-md border border-[#FDE68A]">
                      <HardDrive className="w-3.5 h-3.5 text-[#D97706]" />
                      <span>Underground Cache (Offline RAG)</span>
                    </span>
                  )}

                  <span className="text-xs font-mono text-[#64748B]">
                    Strict Source Grounding Enforced
                  </span>
                </div>

                {/* Top Action Buttons */}
                {activeResult.foundInKnowledgeBase && (
                  <div className="flex items-center gap-2">
                    {/* Voice Read Aloud Button */}
                    <button
                      id="btn-voice-readout"
                      onClick={() => speakAnswerAloud()}
                      className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                        isSpeaking
                          ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A] hover:bg-[#FDE68A]'
                          : 'bg-[#FAF8F3] hover:bg-[#EFEBE2] text-[#141C2B] border-[#E4E0D6]'
                      }`}
                      title={isSpeaking ? 'Stop speaking answer' : 'Listen to answer via voice synthesizer'}
                    >
                      {isSpeaking ? (
                        <>
                          <Square className="w-3.5 h-3.5 text-[#D97706] fill-[#D97706]" />
                          <span>Stop Voice</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-[#C8892E]" />
                          <span>Listen Aloud</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleCopyText(activeResult.answer)}
                      className="px-2.5 py-1 bg-[#FAF8F3] hover:bg-[#EFEBE2] border border-[#E4E0D6] rounded text-xs font-semibold text-[#141C2B] flex items-center gap-1 transition-colors cursor-pointer"
                      title="Copy plain answer text"
                    >
                      {copiedAnswer ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5 text-[#64748B]" />}
                      <span>{copiedAnswer ? 'Copied' : 'Copy'}</span>
                    </button>

                    <button
                      onClick={handleCopyToReport}
                      className="px-3 py-1 bg-[#141C2B] hover:bg-[#1E293B] text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                      title="Send findings and citations directly into the Report Generator"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#C8892E]" />
                      <span>Copy to Report</span>
                    </button>
                  </div>
                )}
              </div>

              {/* AI Summary One-Liner (Section 5.5 Spec) */}
              {activeResult.foundInKnowledgeBase && activeResult.aiSummary && (
                <div className="bg-[#FAF8F3] border-l-4 border-[#C8892E] p-3 rounded-r-lg">
                  <div className="text-[10px] font-mono uppercase font-bold text-[#C8892E] tracking-wider mb-0.5">
                    AI Verified Summary Line:
                  </div>
                  <p className="text-xs font-semibold text-[#141C2B]">
                    {activeResult.aiSummary}
                  </p>
                </div>
              )}

              {/* Spoken Audio Playback Active Bar */}
              {isSpeaking && (
                <div className="bg-[#FAF8F3] border border-[#FDE68A] rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-4 bg-[#C8892E] animate-pulse rounded-full"></span>
                      <span className="w-1.5 h-6 bg-[#C8892E] animate-pulse delay-75 rounded-full"></span>
                      <span className="w-1.5 h-3 bg-[#C8892E] animate-pulse delay-150 rounded-full"></span>
                      <span className="w-1.5 h-5 bg-[#C8892E] animate-pulse delay-100 rounded-full"></span>
                    </div>
                    <span className="text-xs font-mono font-medium text-[#141C2B]">
                      Voice synthesizer is reading technical findings & citations aloud...
                    </span>
                  </div>

                  <button
                    onClick={stopSpeaking}
                    className="px-2.5 py-1 bg-[#141C2B] text-white hover:bg-[#1E293B] rounded text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Square className="w-3 h-3 text-[#C8892E] fill-[#C8892E]" />
                    <span>Stop Audio</span>
                  </button>
                </div>
              )}

              {/* Generated Answer / Explicit Empty State */}
              <div className="text-sm sm:text-[15px] leading-relaxed sm:leading-7 text-[#141C2B] font-sans">
                {activeResult.requiresClarification ? (
                  <div className="py-4 text-center bg-[#FEF3C7] rounded-lg border border-[#FDE68A] p-6 space-y-3">
                    <HelpCircle className="w-8 h-8 text-[#C8892E] mx-auto" />
                    <p className="font-serif font-bold text-base text-[#141C2B]">{activeResult.answer}</p>
                    <p className="text-xs text-[#64748B] max-w-md mx-auto">
                      Select one matching document below. The answer will be generated only from that document's approved chunks.
                    </p>
                    <div className="max-w-2xl mx-auto grid gap-2 text-left">
                      {activeResult.citations.map((citation) => (
                        <button
                          key={citation.documentId}
                          type="button"
                          onClick={() => handleAsk(question, citation.documentId)}
                          className="w-full bg-white border border-[#E4E0D6] hover:border-[#C8892E] rounded-lg p-3 flex items-center justify-between gap-3 text-left transition-colors"
                        >
                          <span className="min-w-0">
                            <span className="block font-semibold text-[#141C2B] truncate">{citation.documentTitle}</span>
                            <span className="block text-[11px] font-mono text-[#64748B] mt-0.5">{citation.documentCode} v{citation.versionNumber}.0 · {citation.pageOrSheetRef}</span>
                          </span>
                          <ArrowRight className="w-4 h-4 text-[#C8892E] flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : activeResult.foundInKnowledgeBase ? (
                  <div className="space-y-3 whitespace-pre-line font-normal text-[#1E293B]">
                    {displayedAnswer}
                  </div>
                ) : (
                  <div className="py-8 text-center bg-[#FAF8F3] rounded-lg border border-dashed border-[#E4E0D6] p-6 space-y-4">
                    <AlertCircle className="w-8 h-8 text-[#DC2626] mx-auto" />
                    <div>
                      <p className="font-serif font-bold text-base text-[#141C2B]">
                        No supporting information was found in the available organizational documents.
                      </p>
                      <p className="text-xs text-[#64748B] max-w-md mx-auto mt-1">
                        MineMind AI enforces strict source-grounding and will not fabricate answers without verified records.
                      </p>
                    </div>

                    {/* Helpful Resolution Box if Subsidiary Filter is active */}
                    {selectedSubsidiary !== 'ALL' && (
                      <div className="bg-[#FFFFFF] border border-[#E4E0D6] rounded-lg p-4 max-w-lg mx-auto text-left space-y-3 shadow-2xs">
                        <div className="flex items-start gap-2.5">
                          <HelpCircle className="w-4 h-4 text-[#C8892E] flex-shrink-0 mt-0.5" />
                          <div className="text-xs text-[#334155]">
                            <span className="font-semibold text-[#141C2B]">Active Subsidiary Scope: {selectedSubsidiary}</span>
                            <p className="text-[11px] text-[#64748B] mt-0.5">
                              Your search is restricted strictly to {selectedSubsidiary} records. If your query refers to another subsidiary (e.g. Korba in SECL or Jharia in BCCL), broaden your scope to All Subsidiaries.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSubsidiary('ALL');
                              // Automatically re-run query across all subsidiaries
                              if (question.trim()) {
                                handleAsk(question);
                              }
                            }}
                            className="px-3.5 py-1.5 bg-[#141C2B] hover:bg-[#1E293B] text-white text-xs font-bold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Globe className="w-3.5 h-3.5 text-[#C8892E]" />
                            <span>Search Across All Subsidiaries (Switch Scope to ALL)</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Subsidiary-Specific Suggested Queries */}
                    {SUBSIDIARY_PRESETS[selectedSubsidiary] && selectedSubsidiary !== 'ALL' && (
                      <div className="text-left max-w-lg mx-auto pt-2">
                        <span className="text-[11px] font-mono font-bold text-[#64748B] uppercase tracking-wider block mb-1.5">
                          Try these approved queries for {selectedSubsidiary}:
                        </span>
                        <div className="flex flex-col gap-1.5">
                          {SUBSIDIARY_PRESETS[selectedSubsidiary].map((sq, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setQuestion(sq);
                                handleAsk(sq);
                              }}
                              className="text-left text-xs bg-white hover:bg-[#FAF8F3] text-[#141C2B] p-2 rounded border border-[#E4E0D6] hover:border-[#C8892E] transition-colors cursor-pointer"
                            >
                              • {sq}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Source Citation Chips (Section 5.5 Spec) */}
              {activeResult.citations.length > 0 && (
                <div className="pt-5 border-t border-[#EFEBE2] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-mono uppercase tracking-wider text-[#64748B] font-bold flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-[#C8892E]" />
                      <span>Governed Source Citations ({activeResult.citations.length}):</span>
                    </div>
                    <span className="text-[11px] font-mono text-[#64748B]">
                      Click card to inspect full audit chunk & verification hash
                    </span>
                  </div>

                  <div className={`grid grid-cols-1 ${activeResult.citations.length > 1 ? 'xl:grid-cols-2' : ''} gap-4`}>
                    {activeResult.citations.map((citation, idx) => (
                      <div
                        key={idx}
                        onClick={() => setActiveCitationForModal(citation)}
                        className="p-4 sm:p-5 bg-[#FAF8F3] hover:bg-[#FDFBF7] border border-[#E4E0D6] hover:border-[#C8892E] rounded-xl cursor-pointer transition-all shadow-2xs group space-y-3"
                      >
                        {/* Citation Badges Row */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold bg-[#EFEBE2] text-[#141C2B] px-2.5 py-1 rounded-md border border-[#DCD6C8]">
                              {citation.documentCode} v{citation.versionNumber}.0
                            </span>
                            {citation.subsidiary && (
                              <span className="font-mono text-[11px] font-semibold bg-white text-[#64748B] px-2 py-0.5 rounded border border-[#E4E0D6]">
                                {citation.subsidiary}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-mono font-medium text-[#92400E] bg-[#FEF3C7] border border-[#FDE68A] px-2.5 py-1 rounded-md flex items-center gap-1.5">
                            <span>{citation.pageOrSheetRef}</span>
                            <ExternalLink className="w-3.5 h-3.5 text-[#C8892E] group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </div>

                        {/* Document Title */}
                        <h4 className="font-serif font-bold text-sm sm:text-base text-[#141C2B] leading-snug group-hover:text-[#C8892E] transition-colors">
                          {citation.documentTitle}
                        </h4>

                        {/* Verified Excerpt Box */}
                        <div className="bg-white p-3.5 rounded-lg border border-[#E4E0D6] group-hover:border-[#D4CEBF] transition-colors">
                          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#64748B] mb-1">
                            Verified Source Excerpt:
                          </div>
                          <p className="text-xs sm:text-[13px] text-[#334155] leading-relaxed italic font-serif">
                            "{citation.excerpt}"
                          </p>
                        </div>

                        {/* Card Action Link */}
                        <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-[#C8892E] group-hover:text-[#92400E]">
                          <span className="font-medium">Direct Grounding Vector Chunk</span>
                          <span className="font-bold flex items-center gap-1 group-hover:underline">
                            Inspect Verified Chunk & Hash →
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Draft for Parliamentary / Ministry Official Reply Toggle (Section 5.5 Spec) */}
              {activeResult.foundInKnowledgeBase && (
                <div className="pt-3 border-t border-[#EFEBE2]">
                  <button
                    onClick={() => setShowDraftReply(!showDraftReply)}
                    className="text-xs font-semibold text-[#141C2B] hover:text-[#C8892E] flex items-center gap-2 py-1"
                  >
                    <span>Draft for Parliamentary / Ministry Official Reply</span>
                    {showDraftReply ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showDraftReply && (
                    <div className="mt-3 p-4 bg-[#141C2B] text-white rounded-lg border border-[#1E293B] space-y-3 font-mono text-xs">
                      <div className="flex items-center justify-between text-[#C8892E]">
                        <span className="font-bold uppercase tracking-wider text-[11px]">
                          Formal Legislative / Parliamentary Format (Lok Sabha / Rajya Sabha Reference)
                        </span>
                        <button
                          onClick={() => handleCopyText(activeResult.draftOfficialReply || activeResult.answer, true)}
                          className="px-2 py-1 bg-[#243147] hover:bg-[#334155] text-white rounded text-[10px] flex items-center gap-1"
                        >
                          {copiedDraft ? <Check className="w-3 h-3 text-[#22C55E]" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedDraft ? 'Copied Draft' : 'Copy Official Text'}</span>
                        </button>
                      </div>
                      <p className="text-[#E2E8F0] leading-relaxed whitespace-pre-line font-sans text-xs bg-[#0E1522] p-3 rounded border border-[#1E293B]">
                        {activeResult.draftOfficialReply || `In response to the inquiry regarding "${question}", according to approved technical records maintained at ${activeResult.citations[0]?.subsidiary || 'CMPDI'}: ${activeResult.answer}`}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
