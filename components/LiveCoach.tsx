import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../utils/audioUtils';
import { Mic, MicOff, Activity, X } from 'lucide-react';

export const LiveCoach: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<string>('Listo para conectar');
  
  // Audio Contexts
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  
  // Stream & Processor
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  // Playback
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Session
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

  const startSession = async () => {
    try {
      setStatus('Conectando...');
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Initialize Audio Contexts
      inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      // Get Mic Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const connectPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setStatus('Conectado - Escuchando...');
            setIsActive(true);
            
            // Setup Input Processing
            if (!inputContextRef.current) return;
            const source = inputContextRef.current.createMediaStreamSource(stream);
            const scriptProcessor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              
              if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then(session => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              }
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputContextRef.current.destination);
            
            sourceRef.current = source;
            processorRef.current = scriptProcessor;
          },
          onmessage: async (msg: LiveServerMessage) => {
            const outputCtx = outputContextRef.current;
            if (!outputCtx) return;

            // Handle Audio Output
            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              const uint8Array = base64ToUint8Array(base64Audio);
              const audioBuffer = await decodeAudioData(uint8Array, outputCtx, 24000);
              
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              
              // Schedule playback
              const currentTime = outputCtx.currentTime;
              if (nextStartTimeRef.current < currentTime) {
                nextStartTimeRef.current = currentTime;
              }
              
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            // Handle Interruptions
            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(src => src.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
            setStatus('Desconectado');
            setIsActive(false);
          },
          onerror: (err) => {
            console.error(err);
            setStatus('Ocurrió un error');
            setIsActive(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          systemInstruction: "Eres un entrenador experto en contenido viral muy energético. Ayudas al usuario a hacer lluvia de ideas para TikToks y Reels. Mantén las respuestas cortas, contundentes y en Español. Haz preguntas para sacar las mejores ideas."
        }
      });

      sessionPromiseRef.current = connectPromise;

    } catch (e) {
      console.error(e);
      setStatus('Error al conectar');
    }
  };

  const stopSession = () => {
    // Close session if possible (method depends on library version, assuming callback handles disconnect logic mostly)
    // Clean up Audio
    streamRef.current?.getTracks().forEach(t => t.stop());
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    inputContextRef.current?.close();
    outputContextRef.current?.close();
    sourcesRef.current.forEach(s => s.stop());
    
    // Reset state
    setIsActive(false);
    setStatus('Sesión Finalizada');
    sessionPromiseRef.current = null;
    
    // Force reload to clear socket fully if no close method exposed easily
    // In a real app we'd maintain the socket ref to call close(), but for this demo pattern:
    // We rely on track stopping to kill input.
  };

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-[60vh] space-y-8">
      <div className={`relative flex items-center justify-center w-48 h-48 rounded-full transition-all duration-500 ${isActive ? 'bg-indigo-500/20' : 'bg-slate-800'}`}>
         {isActive && (
             <div className="absolute w-full h-full rounded-full border-4 border-indigo-500 animate-ping opacity-20"></div>
         )}
         {isActive && (
             <div className="absolute w-40 h-40 rounded-full border-2 border-purple-500 animate-pulse"></div>
         )}
         <Activity className={`w-20 h-20 ${isActive ? 'text-indigo-400' : 'text-slate-600'}`} />
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Coach en Vivo</h2>
        <p className="text-slate-400 font-mono">{status}</p>
      </div>

      <button
        onClick={isActive ? stopSession : startSession}
        className={`px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 transition-all transform hover:scale-105 ${
            isActive 
            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50' 
            : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/30'
        }`}
      >
        {isActive ? (
            <>
                <MicOff className="w-6 h-6" /> Detener Sesión
            </>
        ) : (
            <>
                <Mic className="w-6 h-6" /> Iniciar Lluvia de Ideas
            </>
        )}
      </button>
      
      <p className="text-sm text-slate-500 max-w-md text-center">
        ¡Habla libremente! El coach de IA escuchará tus ideas y te ayudará a refinarlas en tiempo real para hacerlas virales.
      </p>
    </div>
  );
};