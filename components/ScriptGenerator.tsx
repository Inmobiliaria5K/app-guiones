import React, { useState, useRef, useEffect } from 'react';
import { generateViralHooks, generateScriptContent, transcribeAudio, generateSpeech } from '../services/geminiService';
import { HookOption, ScriptContent, ScriptDuration, ScriptTone, ScriptBodyPoint, ScriptSectionOption } from '../types';
import { Mic, Search, Sparkles, Play, StopCircle, Video, ArrowRight, RotateCcw, CheckCircle2, ChevronLeft, ChevronRight, Clock, Users, Copy, FileText, Edit3, Plus, Minus, Trash2, Fingerprint } from 'lucide-react';

type Step = 'INPUT' | 'HOOKS' | 'SELECTION' | 'FINAL';

export const ScriptGenerator: React.FC = () => {
  const [step, setStep] = useState<Step>('INPUT');
  const [idea, setIdea] = useState('');
  const [duration, setDuration] = useState<ScriptDuration>('60s');
  const [tone, setTone] = useState<ScriptTone>('medium');
  const [isProcessing, setIsProcessing] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const [userStyle, setUserStyle] = useState<string>('');
  
  // Data State
  const [generatedHooks, setGeneratedHooks] = useState<HookOption[]>([]);
  const [selectedHook, setSelectedHook] = useState<HookOption | null>(null);
  const [scriptContent, setScriptContent] = useState<ScriptContent | null>(null);

  // Final Selections (The actual script components)
  const [finalRelevance, setFinalRelevance] = useState<ScriptSectionOption | null>(null);
  const [finalBodySteps, setFinalBodySteps] = useState<ScriptBodyPoint[]>([]);
  const [finalCta, setFinalCta] = useState<ScriptSectionOption | null>(null);

  // Carousel View Indices (Just for viewing options)
  const [relevanceIdx, setRelevanceIdx] = useState(0);
  const [bodyIdx, setBodyIdx] = useState(0);
  const [ctaIdx, setCtaIdx] = useState(0);

  // Audio State
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    // Load user style preference on mount
    const style = localStorage.getItem('userVoiceStyle');
    if (style) setUserStyle(style);
  }, []);

  const resetState = () => {
    setStep('INPUT');
    setIdea('');
    setGeneratedHooks([]);
    setSelectedHook(null);
    setScriptContent(null);
    setFinalRelevance(null);
    setFinalBodySteps([]);
    setFinalCta(null);
    setRelevanceIdx(0);
    setBodyIdx(0);
    setCtaIdx(0);
    setIsProcessing(false);
  };

  const handleGenerateHooks = async () => {
    if (!idea.trim()) return;
    setIsProcessing(true);
    try {
      const hooks = await generateViralHooks(idea, duration, tone, useSearch, userStyle);
      setGeneratedHooks(hooks);
      setStep('HOOKS');
    } catch (e) {
      alert("Error generando los ganchos. Por favor intenta de nuevo.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectHookAndGenerate = async (hook: HookOption) => {
    setSelectedHook(hook);
    setIsProcessing(true);
    try {
      const content = await generateScriptContent(idea, hook, duration, tone, useSearch, userStyle);
      setScriptContent(content);
      // Pre-select first options to allow easy generation, or leave empty for manual?
      // Leaving empty to force user interaction as requested ("button to select")
      setStep('SELECTION');
    } catch (e) {
      alert("Error generando el guion completo. Por favor intenta de nuevo.");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleBodyStep = (stepPoint: ScriptBodyPoint) => {
    setFinalBodySteps(prev => {
      const exists = prev.some(p => p.instruction === stepPoint.instruction);
      if (exists) {
        return prev.filter(p => p.instruction !== stepPoint.instruction);
      } else {
        return [...prev, stepPoint];
      }
    });
  };

  const copyToClipboard = () => {
    if (!selectedHook) return;
    
    const bodyText = finalBodySteps.map((p, i) => `${i+1}. ${p.instruction}\n   [VISUAL: ${p.visual}]${p.reset ? `\n   [RESET: ${p.reset}]` : ''}`).join('\n');
    
    const fullText = `
TITULO: ${idea}
DURACIÓN: ${duration}

GANCHO:
${selectedHook.text}
(Visual: ${selectedHook.visual})

RELEVANCIA:
${finalRelevance?.text || '(No seleccionada)'}
(Visual: ${finalRelevance?.visual || 'N/A'})

CUERPO:
${bodyText || '(Sin pasos seleccionados)'}

CTA:
${finalCta?.text || '(No seleccionado)'}
(Visual: ${finalCta?.visual || 'N/A'})
    `.trim();

    navigator.clipboard.writeText(fullText);
    alert("¡Guion copiado al portapapeles!");
  };

  // Helper for Carousels
  const nextOption = (current: number, total: number, setter: (n: number) => void) => {
    setter((current + 1) % total);
  };
  const prevOption = (current: number, total: number, setter: (n: number) => void) => {
    setter((current - 1 + total) % total);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          setIsProcessing(true);
          const text = await transcribeAudio(base64Audio);
          setIdea(prev => prev + (prev ? ' ' : '') + text);
          setIsProcessing(false);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Acceso al micrófono denegado", err);
      alert("No se pudo acceder al micrófono.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playTTS = async (text: string, id: string) => {
    if (isPlaying) {
      currentSourceRef.current?.stop();
      if (isPlaying === id) {
        setIsPlaying(null);
        return;
      }
    }

    setIsPlaying(id);
    const buffer = await generateSpeech(text);
    if (buffer) {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => setIsPlaying(null);
      source.start();
      currentSourceRef.current = source;
    } else {
        setIsPlaying(null);
    }
  };

  const getToneLabel = (t: ScriptTone) => {
    switch (t) {
      case 'high_ticket': return 'High Ticket';
      case 'formal_elegant': return 'Formal Elegante';
      case 'medium': return 'Medio';
      case 'informal': return 'Informal';
      default: return 'Medio';
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-8 pb-24">
      
      {/* Step 1: Input Idea */}
      {step === 'INPUT' && (
        <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700 animate-fade-in space-y-6">
          <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2 text-indigo-400">
                    <Sparkles className="w-5 h-5" /> Configura tu Video Viral
                </h2>
                {userStyle && (
                    <div className="flex items-center gap-2 text-xs font-bold text-green-400 bg-green-900/30 px-3 py-1.5 rounded-full border border-green-500/30" title="Usando tu estilo personalizado">
                        <Fingerprint className="w-3 h-3" /> Estilo Personalizado Activo
                    </div>
                )}
              </div>
              
              {/* Controls Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-400 flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Duración
                    </label>
                    <div className="flex bg-slate-800 p-1 rounded-lg">
                        {(['30s', '45s', '60s', '90s'] as ScriptDuration[]).map((d) => (
                            <button
                                key={d}
                                onClick={() => setDuration(d)}
                                className={`flex-1 py-1.5 text-sm rounded-md transition-all ${
                                    duration === d 
                                    ? 'bg-indigo-600 text-white shadow-sm' 
                                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                }`}
                            >
                                {d}
                            </button>
                        ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-400 flex items-center gap-2">
                        <Users className="w-4 h-4" /> Tono / Nivel (México 🇲🇽)
                    </label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-800 p-2 rounded-lg">
                        <button
                            onClick={() => setTone('high_ticket')}
                            className={`py-1.5 text-xs font-medium rounded-md transition-all ${tone === 'high_ticket' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                        >
                            High Ticket
                        </button>
                        <button
                            onClick={() => setTone('formal_elegant')}
                            className={`py-1.5 text-xs font-medium rounded-md transition-all ${tone === 'formal_elegant' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                        >
                            Formal Elegante
                        </button>
                        <button
                            onClick={() => setTone('medium')}
                            className={`py-1.5 text-xs font-medium rounded-md transition-all ${tone === 'medium' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                        >
                            Medio
                        </button>
                        <button
                            onClick={() => setTone('informal')}
                            className={`py-1.5 text-xs font-medium rounded-md transition-all ${tone === 'informal' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                        >
                            Informal
                        </button>
                    </div>
                  </div>
              </div>
          </div>

          <div className="relative">
            <label className="block text-sm text-slate-400 mb-2">Tu Idea:</label>
            <textarea
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-4 text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none h-32 pr-12"
              placeholder="Ej: Trucos psicológicos para vender más..."
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
            />
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`absolute right-3 bottom-3 p-2 rounded-full transition-all ${
                isRecording ? 'bg-red-500 animate-pulse text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {isRecording ? <StopCircle className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer hover:text-slate-200">
              <input
                type="checkbox"
                checked={useSearch}
                onChange={(e) => setUseSearch(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500"
              />
              <span className="flex items-center gap-1"><Search className="w-3 h-3"/> Investigar tendencias en Google</span>
            </label>
            <button
              onClick={handleGenerateHooks}
              disabled={isProcessing || !idea}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 px-8 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-indigo-500/20"
            >
              {isProcessing ? 'Generando...' : 'Crear Ganchos'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Select Hook */}
      {step === 'HOOKS' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-center">
             <div className="space-y-1">
                <h2 className="text-2xl font-bold text-white">Elige tu Gancho</h2>
                <p className="text-sm text-slate-400">Se generaron 5 propuestas basadas en tono {getToneLabel(tone)} ({duration})</p>
             </div>
             <button onClick={resetState} className="text-sm text-slate-400 hover:text-white flex items-center gap-1">
                <RotateCcw className="w-3 h-3" /> Reiniciar
             </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {generatedHooks.map((hook, idx) => (
              <div 
                key={idx} 
                onClick={() => !isProcessing && handleSelectHookAndGenerate(hook)}
                className={`
                   relative p-5 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between
                   ${isProcessing ? 'opacity-50 cursor-wait' : 'hover:scale-[1.02]'}
                   bg-slate-800 border-slate-600 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20
                `}
              >
                <div>
                    <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-400/10 px-2 py-1 rounded">
                        {hook.type}
                    </span>
                    <button 
                        onClick={(e) => { e.stopPropagation(); playTTS(hook.text, `hook-${idx}`); }} 
                        className="text-slate-400 hover:text-white p-1 hover:bg-slate-700 rounded-full"
                    >
                        {isPlaying === `hook-${idx}` ? <StopCircle className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    </div>
                    <p className="font-bold text-lg text-white mb-4 leading-tight">"{hook.text}"</p>
                </div>
                <div className="text-xs text-slate-400 flex items-start gap-1 bg-slate-900/50 p-2 rounded mt-auto">
                  <Video className="w-3 h-3 mt-0.5 flex-shrink-0 text-slate-500" />
                  <span className="italic">{hook.visual}</span>
                </div>
              </div>
            ))}
          </div>
          
          {isProcessing && (
             <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-indigo-300 animate-pulse">Diseñando 5 variaciones para el resto del guion...</p>
             </div>
          )}
        </div>
      )}

      {/* Step 3: Selection (Build Script) */}
      {step === 'SELECTION' && scriptContent && selectedHook && (
        <div className="space-y-8 animate-fade-in pb-12">
          
          <div className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-md">
             <div className="flex items-center gap-2">
                <Edit3 className="text-indigo-400 w-6 h-6" />
                <div>
                    <h2 className="text-xl font-bold text-white">Construye tu Guion</h2>
                    <p className="text-xs text-slate-400">Navega y selecciona las partes que más te gusten para armar el guion final.</p>
                </div>
             </div>
             <button 
                onClick={resetState}
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-semibold"
             >
                <RotateCcw className="w-4 h-4" /> Empezar de cero
             </button>
          </div>

          {/* Phase A: Selected Hook (Static) */}
          <div className="bg-slate-900/50 rounded-xl overflow-hidden border border-indigo-500/30 opacity-75 grayscale hover:grayscale-0 transition-all">
            <div className="bg-slate-900 p-2 border-b border-indigo-500/20 px-4">
              <h3 className="font-bold text-xs tracking-wide text-indigo-400 uppercase">Fase A: Gancho (Ya Seleccionado)</h3>
            </div>
            <div className="p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <p className="text-lg font-bold text-white">"{selectedHook.text}"</p>
                    <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                   <Video className="w-3 h-3 text-indigo-400" />
                   <span>{selectedHook.visual}</span>
                </div>
            </div>
          </div>

          {/* Phase B: Relevance (Carousel Selection) */}
          <div className={`bg-slate-800 rounded-xl overflow-hidden border transition-all ${finalRelevance?.text === scriptContent.relevanceOptions[relevanceIdx].text ? 'border-blue-500 shadow-lg shadow-blue-500/10' : 'border-slate-600'}`}>
            <div className="bg-slate-900/50 p-3 border-b border-slate-700 flex justify-between items-center">
              <h3 className="font-bold text-sm tracking-wide text-blue-400 uppercase">Fase B: Relevancia</h3>
              <div className="flex items-center gap-3">
                 <span className="text-xs font-bold text-blue-400 bg-blue-900/30 px-2 py-1 rounded">
                    Opción {relevanceIdx + 1} de 5
                 </span>
                 <div className="flex bg-slate-800 rounded-md">
                    <button onClick={() => prevOption(relevanceIdx, 5, setRelevanceIdx)} className="p-1 hover:bg-slate-700 rounded-l text-slate-300"><ChevronLeft className="w-4 h-4" /></button>
                    <div className="w-px bg-slate-700"></div>
                    <button onClick={() => nextOption(relevanceIdx, 5, setRelevanceIdx)} className="p-1 hover:bg-slate-700 rounded-r text-slate-300"><ChevronRight className="w-4 h-4" /></button>
                 </div>
              </div>
            </div>
            <div className="p-6 relative min-h-[140px] flex flex-col bg-blue-900/5">
               <div className="flex-1 pr-12">
                   <p className="text-lg text-slate-200 leading-relaxed animate-fade-in mb-3">
                     {scriptContent.relevanceOptions[relevanceIdx].text}
                   </p>
                   <div className="flex items-start gap-2 text-xs text-slate-400 bg-slate-900/30 p-2 rounded">
                      <Video className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                      <span className="italic">{scriptContent.relevanceOptions[relevanceIdx].visual}</span>
                   </div>
               </div>
               
               <button onClick={() => playTTS(scriptContent.relevanceOptions[relevanceIdx].text, 'relevance')} className="absolute top-6 right-6 text-slate-400 hover:text-white">
                  {isPlaying === 'relevance' ? <StopCircle className="w-5 h-5" /> : <Play className="w-5 h-5" />}
               </button>

               <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-end">
                  <button 
                    onClick={() => setFinalRelevance(scriptContent.relevanceOptions[relevanceIdx])}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        finalRelevance?.text === scriptContent.relevanceOptions[relevanceIdx].text
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {finalRelevance?.text === scriptContent.relevanceOptions[relevanceIdx].text ? (
                        <><CheckCircle2 className="w-4 h-4" /> Seleccionado</>
                    ) : (
                        <><Plus className="w-4 h-4" /> Seleccionar esta opción</>
                    )}
                  </button>
               </div>
            </div>
          </div>

          {/* Phase C: The Value (Carousel Selection with Independent Steps) */}
          <div className={`bg-slate-800 rounded-xl overflow-hidden border transition-all ${finalBodySteps.length > 0 ? 'border-green-500 shadow-lg shadow-green-500/10' : 'border-slate-600'}`}>
            <div className="bg-slate-900/50 p-3 border-b border-slate-700 flex justify-between items-center">
              <h3 className="font-bold text-sm tracking-wide text-green-400 uppercase">Fase C: Contenido (Selecciona Pasos)</h3>
              <div className="flex items-center gap-3">
                 <span className="text-xs font-bold text-green-400 bg-green-900/30 px-2 py-1 rounded">
                    Variación {bodyIdx + 1} de 5
                 </span>
                 <div className="flex bg-slate-800 rounded-md">
                    <button onClick={() => prevOption(bodyIdx, 5, setBodyIdx)} className="p-1 hover:bg-slate-700 rounded-l text-slate-300"><ChevronLeft className="w-4 h-4" /></button>
                    <div className="w-px bg-slate-700"></div>
                    <button onClick={() => nextOption(bodyIdx, 5, setBodyIdx)} className="p-1 hover:bg-slate-700 rounded-r text-slate-300"><ChevronRight className="w-4 h-4" /></button>
                 </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4 animate-fade-in bg-green-900/5">
              <p className="text-xs text-slate-400 mb-2">Puedes seleccionar pasos de diferentes variaciones.</p>
              {scriptContent.bodyOptions[bodyIdx]?.map((step, idx) => {
                const isSelected = finalBodySteps.some(s => s.instruction === step.instruction);
                return (
                    <div key={idx} className={`relative p-4 rounded-lg border transition-all ${isSelected ? 'bg-green-900/20 border-green-500/50' : 'bg-slate-800/50 border-slate-700'}`}>
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-slate-500 uppercase">Paso {idx + 1}</span>
                              {step.reset && <span className="text-[10px] bg-purple-900/50 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30">Reset: {step.reset}</span>}
                          </div>
                          <p className="text-white text-base leading-snug mb-2">{step.instruction}</p>
                          <div className="flex items-start gap-2 text-xs text-slate-400 bg-slate-900/30 p-2 rounded">
                             <Video className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                             <span className="italic">{step.visual}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                             <button onClick={() => playTTS(step.instruction, `step-${idx}`)} className="p-2 text-slate-400 hover:text-white bg-slate-900 rounded hover:bg-slate-700">
                                {isPlaying === `step-${idx}` ? <StopCircle className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </button>
                            <button 
                                onClick={() => toggleBodyStep(step)}
                                className={`p-2 rounded transition-all flex items-center justify-center ${isSelected ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                                title={isSelected ? "Quitar del guion" : "Agregar al guion"}
                            >
                                {isSelected ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            </button>
                        </div>
                      </div>
                    </div>
                );
              })}
               
               <div className="flex justify-end pt-2 border-t border-slate-700/30 mt-4">
                   <div className="flex items-center gap-2 text-sm text-green-400">
                      <span className="font-bold">{finalBodySteps.length}</span> pasos seleccionados en total
                   </div>
               </div>
            </div>
          </div>

          {/* Phase D: CTA (Carousel Selection) */}
          <div className={`rounded-xl overflow-hidden border transition-all ${finalCta?.text === scriptContent.ctaOptions[ctaIdx].text ? 'border-red-500 shadow-lg shadow-red-500/10' : 'border-slate-600'} bg-gradient-to-r from-slate-800 to-slate-800`}>
            <div className="bg-black/20 p-3 flex justify-between items-center border-b border-slate-700">
                 <h3 className="font-bold text-sm tracking-wide text-red-300 uppercase">Fase D: Llamada a la Acción</h3>
                 <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-red-300 bg-red-900/30 px-2 py-1 rounded">
                        Opción {ctaIdx + 1} de 5
                    </span>
                    <div className="flex bg-black/30 rounded-md">
                        <button onClick={() => prevOption(ctaIdx, 5, setCtaIdx)} className="p-1 hover:bg-red-900/50 rounded-l text-red-200"><ChevronLeft className="w-4 h-4" /></button>
                        <div className="w-px bg-red-500/20"></div>
                        <button onClick={() => nextOption(ctaIdx, 5, setCtaIdx)} className="p-1 hover:bg-red-900/50 rounded-r text-red-200"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                 </div>
            </div>
            <div className="p-6 flex flex-col gap-4 animate-fade-in bg-red-900/5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                    <p className="text-xl font-bold text-white md:text-left mb-2">"{scriptContent.ctaOptions[ctaIdx].text}"</p>
                    <div className="flex items-start gap-2 text-xs text-slate-400 bg-slate-900/30 p-2 rounded max-w-xl">
                        <Video className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                        <span className="italic">{scriptContent.ctaOptions[ctaIdx].visual}</span>
                    </div>
                </div>
                <button onClick={() => playTTS(scriptContent.ctaOptions[ctaIdx].text, 'cta')} className="bg-slate-800 p-3 rounded-full hover:bg-slate-700 text-white transition-colors flex-shrink-0">
                    {isPlaying === 'cta' ? <StopCircle className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                </button>
              </div>

               <div className="mt-2 pt-4 border-t border-slate-700/50 flex justify-end">
                  <button 
                    onClick={() => setFinalCta(scriptContent.ctaOptions[ctaIdx])}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        finalCta?.text === scriptContent.ctaOptions[ctaIdx].text
                        ? 'bg-red-600 text-white shadow-lg'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {finalCta?.text === scriptContent.ctaOptions[ctaIdx].text ? (
                        <><CheckCircle2 className="w-4 h-4" /> Seleccionado</>
                    ) : (
                        <><Plus className="w-4 h-4" /> Seleccionar este cierre</>
                    )}
                  </button>
               </div>
            </div>
          </div>
          
          <div className="sticky bottom-4 flex justify-center pt-4 z-10">
             <button 
                onClick={() => setStep('FINAL')}
                disabled={!finalRelevance && finalBodySteps.length === 0 && !finalCta}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white px-10 py-4 rounded-full font-bold shadow-2xl shadow-indigo-500/40 transform hover:scale-105 transition-all flex items-center gap-3 border border-indigo-400"
             >
                <FileText className="w-6 h-6" /> GENERAR GUION FINAL
             </button>
          </div>
        </div>
      )}

      {/* Step 4: Final Compiled View */}
      {step === 'FINAL' && scriptContent && selectedHook && (
          <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
             <div className="text-center space-y-2">
                 <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 text-green-400 mb-4">
                    <CheckCircle2 className="w-10 h-10" />
                 </div>
                 <h2 className="text-3xl font-bold text-white">¡Tu Guion Viral está Listo!</h2>
                 <p className="text-slate-400">Personalizado a tu gusto para {duration} en tono {getToneLabel(tone)}.</p>
             </div>

             <div className="bg-white text-slate-900 rounded-lg p-8 shadow-2xl relative font-mono text-sm leading-relaxed">
                 <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-t-lg"></div>
                 
                 {/* Header Info */}
                 <div className="border-b-2 border-slate-200 pb-4 mb-6 flex justify-between items-start">
                    <div>
                        <p className="font-bold uppercase text-slate-500 text-xs">Proyecto</p>
                        <p className="font-bold text-lg">{idea.substring(0, 40)}{idea.length > 40 ? '...' : ''}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold uppercase text-slate-500 text-xs">Duración</p>
                        <p className="font-bold">{duration}</p>
                    </div>
                 </div>

                 {/* Script Body */}
                 <div className="space-y-6">
                    <div>
                        <span className="inline-block bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded font-bold mb-2">GANCHO</span>
                        <p className="text-lg font-bold">{selectedHook.text}</p>
                        <p className="text-slate-500 italic text-xs mt-1">Visual: {selectedHook.visual}</p>
                    </div>

                    <div>
                        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-bold mb-2">RELEVANCIA</span>
                        {finalRelevance ? (
                           <>
                             <p>{finalRelevance.text}</p>
                             <p className="text-slate-500 italic text-xs mt-1">Visual: {finalRelevance.visual}</p>
                           </>
                        ) : (
                           <p className="text-slate-400 italic">(No seleccionaste texto de relevancia)</p>
                        )}
                    </div>

                    <div>
                        <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-bold mb-2">CUERPO / VALOR</span>
                        {finalBodySteps.length > 0 ? (
                            <ul className="space-y-4 mt-2">
                                {finalBodySteps.map((point, i) => (
                                    <li key={i} className="flex gap-3">
                                        <span className="font-bold text-slate-400">{i+1}.</span>
                                        <div>
                                            <p>{point.instruction}</p>
                                            <p className="text-slate-500 italic text-xs mt-1">Visual: {point.visual}</p>
                                            {point.reset && <p className="text-purple-600 text-xs font-bold mt-1">[Reset: {point.reset}]</p>}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-slate-400 italic mt-2">(No seleccionaste ningún paso del cuerpo)</p>
                        )}
                    </div>

                    <div>
                        <span className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded font-bold mb-2">CTA</span>
                        {finalCta ? (
                           <>
                             <p className="font-bold text-lg">{finalCta.text}</p>
                             <p className="text-slate-500 italic text-xs mt-1">Visual: {finalCta.visual}</p>
                           </>
                        ) : (
                           <p className="text-slate-400 italic">(No seleccionaste llamada a la acción)</p>
                        )}
                    </div>
                 </div>
             </div>

             <div className="flex flex-col sm:flex-row justify-center gap-4">
                 <button 
                    onClick={() => setStep('SELECTION')}
                    className="px-6 py-3 rounded-lg border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                 >
                    <Edit3 className="w-4 h-4" /> Editar Selección
                 </button>
                 <button 
                    onClick={copyToClipboard}
                    className="px-8 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                 >
                    <Copy className="w-4 h-4" /> Copiar Guion Completo
                 </button>
                 <button 
                    onClick={resetState}
                    className="px-6 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-all flex items-center justify-center gap-2"
                 >
                    <RotateCcw className="w-4 h-4" /> Nueva Idea
                 </button>
             </div>
          </div>
      )}
    </div>
  );
};