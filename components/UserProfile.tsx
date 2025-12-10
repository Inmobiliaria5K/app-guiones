import React, { useState, useEffect, useRef } from 'react';
import { analyzeUserStyle, transcribeAudio } from '../services/geminiService';
import { Sparkles, Save, User, FileText, Fingerprint, Mic, StopCircle, Loader2, Trash2 } from 'lucide-react';

export const UserProfile: React.FC = () => {
  const [sampleText, setSampleText] = useState('');
  const [analyzedStyle, setAnalyzedStyle] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [savedStyle, setSavedStyle] = useState('');

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('userVoiceStyle');
    if (stored) {
      setSavedStyle(stored);
      setAnalyzedStyle(stored);
    }
  }, []);

  const handleAnalyze = async () => {
    if (!sampleText.trim()) return;
    
    setIsAnalyzing(true);
    try {
      const style = await analyzeUserStyle(sampleText);
      setAnalyzedStyle(style);
    } catch (e) {
      alert("Error analizando el estilo. Intenta de nuevo.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = () => {
    if (analyzedStyle) {
      localStorage.setItem('userVoiceStyle', analyzedStyle);
      setSavedStyle(analyzedStyle);
      alert("¡Estilo guardado! Los próximos guiones intentarán imitarte.");
    }
  };

  const handleClear = () => {
    localStorage.removeItem('userVoiceStyle');
    setSavedStyle('');
    setAnalyzedStyle('');
    setSampleText('');
  };

  // Recording Logic
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
        setIsTranscribing(true);
        // Default to webm/opus usually, but we try to detect or fallback
        const mimeType = mediaRecorder.mimeType || 'audio/webm'; 
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          try {
             const text = await transcribeAudio(base64Audio, mimeType);
             setSampleText(prev => (prev ? prev + '\n\n' : '') + text);
          } catch(e) {
             alert("Error en la transcripción");
          } finally {
             setIsTranscribing(false);
          }
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

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <Fingerprint className="w-8 h-8 text-indigo-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">Mi Identidad Verbal</h2>
            <p className="text-sm text-slate-400">La IA aprenderá a hablar como tú.</p>
          </div>
        </div>
        
        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700/50 mb-8 text-center space-y-4">
            <h3 className="text-lg font-semibold text-white">Opción 1: Graba tu voz</h3>
            <p className="text-slate-400 text-sm max-w-lg mx-auto">
               Activa el micrófono y simula que estás grabando un Reel, o ten una conversación natural. 
               Cuanto más hables, mejor captaremos tu estilo.
            </p>
            
            <div className="flex justify-center pt-2">
                {isTranscribing ? (
                     <div className="flex items-center gap-2 px-8 py-4 bg-slate-700 rounded-full text-slate-300">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Transcribiendo audio...</span>
                     </div>
                ) : (
                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`
                            relative px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 transition-all transform hover:scale-105
                            ${isRecording 
                                ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse' 
                                : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/30'
                            }
                        `}
                    >
                        {isRecording ? (
                            <>
                                <StopCircle className="w-6 h-6" /> Detener Grabación
                            </>
                        ) : (
                            <>
                                <Mic className="w-6 h-6" /> {sampleText ? 'Grabar más audio' : 'Activar Micrófono'}
                            </>
                        )}
                    </button>
                )}
            </div>
            {isRecording && <p className="text-xs text-red-400 font-mono animate-pulse">Grabando... (Habla con naturalidad)</p>}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2 flex justify-between">
               <span>Opción 2: Texto de Muestra (o resultado de la grabación)</span>
               {sampleText && <span className="text-xs text-slate-500">{sampleText.length} caracteres</span>}
            </label>
            <textarea
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              placeholder="Aquí aparecerá lo que grabes. También puedes pegar guiones antiguos, correos o transcripciones manualmente..."
              className="w-full h-48 bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none font-mono text-sm leading-relaxed"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
             {sampleText && (
                <button
                    onClick={() => setSampleText('')}
                    className="px-4 py-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2"
                >
                    <Trash2 className="w-4 h-4" /> Limpiar texto
                </button>
             )}
             {savedStyle && (
                <button
                  onClick={handleClear}
                  className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Olvidar mi estilo
                </button>
             )}
             <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !sampleText.trim() || isTranscribing}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
            >
              {isAnalyzing ? (
                 <>Analizando...</>
              ) : (
                 <><Sparkles className="w-4 h-4" /> Analizar mi Estilo</>
              )}
            </button>
          </div>
        </div>
      </div>

      {analyzedStyle && (
        <div className="bg-indigo-900/20 p-6 rounded-2xl border border-indigo-500/30 animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
             <Fingerprint className="w-32 h-32 text-indigo-500" />
          </div>
          
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-indigo-300 flex items-center gap-2">
                    <User className="w-5 h-5" /> Resultado del Análisis
                </h3>
                {savedStyle === analyzedStyle && (
                    <span className="bg-green-500/20 text-green-400 text-xs px-3 py-1 rounded-full border border-green-500/30 font-bold flex items-center gap-1 shadow-sm">
                        <Save className="w-3 h-3" /> ESTILO ACTIVO
                    </span>
                )}
            </div>
            
            <div className="bg-slate-900/80 backdrop-blur p-5 rounded-xl border border-slate-700 mb-6 shadow-inner">
                <p className="text-slate-200 italic leading-relaxed text-lg">"{analyzedStyle}"</p>
            </div>

            {savedStyle !== analyzedStyle && (
                <button
                    onClick={handleSave}
                    className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 transform hover:scale-[1.01]"
                >
                    <Save className="w-5 h-5" /> Confirmar y Guardar este Estilo
                </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};