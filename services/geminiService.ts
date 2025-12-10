import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { HookOption, ScriptContent, ScriptDuration, ScriptTone } from '../types';

const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Schema for Hooks only
const hooksSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    hooks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, description: "Type of hook (Promesa, Miedo, Curiosidad)" },
          text: { type: Type.STRING, description: "The hook text. Must be short, punchy and viral." },
          visual: { type: Type.STRING, description: "Visual suggestion for the hook" }
        }
      }
    }
  },
  required: ["hooks"]
};

// Schema for Body content only - Updated to include visuals for all sections
const bodySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    relevanceOptions: { 
      type: Type.ARRAY, 
      description: "Generar 5 opciones de relevancia, cada una con texto y sugerencia visual.",
      items: { 
        type: Type.OBJECT,
        properties: {
            text: { type: Type.STRING },
            visual: { type: Type.STRING, description: "Descripción visual de la escena (B-Roll, Cámara, Acción)" }
        },
        required: ["text", "visual"]
      } 
    },
    bodyOptions: {
      type: Type.ARRAY,
      description: "Generar 5 variaciones del cuerpo. Cada paso debe tener instrucción y visual.",
      items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            instruction: { type: Type.STRING, description: "Direct instruction or point" },
            visual: { type: Type.STRING, description: "Descripción visual específica para este paso" },
            reset: { type: Type.STRING, description: "Attention reset (visual/audio change)" }
          },
          required: ["instruction", "visual"]
        }
      }
    },
    ctaOptions: { 
      type: Type.ARRAY, 
      description: "Generar 5 opciones de CTA, cada una con texto y sugerencia visual.",
      items: { 
        type: Type.OBJECT,
        properties: {
            text: { type: Type.STRING },
            visual: { type: Type.STRING, description: "Acción visual para el llamado a la acción" }
        },
        required: ["text", "visual"]
      } 
    }
  },
  required: ["relevanceOptions", "bodyOptions", "ctaOptions"]
};

// Helper to clean potential markdown from JSON response
const parseJSON = (text: string) => {
  try {
    // Remove code blocks if present
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Failed to parse JSON:", text);
    throw new Error("Invalid JSON response from model");
  }
};

const getToneDescription = (tone: ScriptTone): string => {
  switch (tone) {
    case 'high_ticket': 
      return "High Ticket / Lujo. Español de México Premium. Dirigido a un público de alto poder adquisitivo o empresarial. Lenguaje exclusivo, persuasivo, autoritario y de alto valor. Usa gatillos de escasez y exclusividad.";
    case 'formal_elegant': 
      return "Formal Elegante. Español de México Culto y Sofisticado. Uso de 'usted' (o un 'tú' muy respetuoso), vocabulario impecable, tono profesional, serio y con mucha clase.";
    case 'medium': 
      return "Medio / Estándar. Español de México Neutro. Accesible para la mayoría, ni muy técnico ni muy callejero. Balanceado, claro y educado.";
    case 'informal': 
    default: 
      return "Informal / Casual. Español de México Relajado. Uso de 'tú', lenguaje cercano, amigable, como una conversación entre amigos. Puede usar modismos ligeros.";
  }
};

export const generateViralHooks = async (idea: string, duration: ScriptDuration, tone: ScriptTone, useSearch: boolean): Promise<HookOption[]> => {
  const ai = getClient();
  const toneDesc = getToneDescription(tone);
  
  let systemPrompt = `
    Eres un Experto en Guiones Virales especializado en audiencias de MÉXICO. Tu única misión ahora es generar 5 GANCHOS (Hooks) extremadamente impactantes.
    
    Contexto:
    - Duración objetivo del video: ${duration} (Ajusta la longitud del gancho acorde).
    - Tono/Nivel Social: ${toneDesc}. ES CRUCIAL QUE EL LENGUAJE SE SIENTA 100% MEXICANO según este tono.
    
    Reglas:
    1. Deben detener el scroll inmediatamente.
    2. Usa psicología (Miedo a perder, Promesa exagerada pero real, Curiosidad intensa).
    3. Tipos: Promesa, Miedo/Error, Curiosidad (Mezcla los tipos en las 5 opciones).
    4. Idioma: Español de México.
    5. CANTIDAD: Genera EXACTAMENTE 5 opciones.
  `;

  const tools = useSearch ? [{ googleSearch: {} }] : undefined;
  
  // Configuration depends on whether tools are used
  const config: any = {
    tools: tools,
  };

  if (useSearch) {
    systemPrompt += `\n\nIMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido. No incluyas texto antes ni después. La estructura debe ser:
    {
      "hooks": [
        { "type": "string", "text": "string", "visual": "string" },
        ... (5 items total)
      ]
    }`;
    config.systemInstruction = systemPrompt;
  } else {
    config.systemInstruction = systemPrompt;
    config.responseMimeType = "application/json";
    config.responseSchema = hooksSchema;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Idea: ${idea}`,
      config: config,
    });

    if (response.text) {
      const parsed = parseJSON(response.text);
      return parsed.hooks as HookOption[];
    }
    throw new Error("No hooks generated");
  } catch (error) {
    console.error("Error generating hooks:", error);
    throw error;
  }
};

export const generateScriptContent = async (idea: string, selectedHook: HookOption, duration: ScriptDuration, tone: ScriptTone, useSearch: boolean): Promise<ScriptContent> => {
  const ai = getClient();
  const toneDesc = getToneDescription(tone);

  let systemPrompt = `
    Eres un Experto en Guiones Virales para audiencia MEXICANA. 
    El usuario ha seleccionado este GANCHO específico: "${selectedHook.text}".
    
    Contexto:
    - Duración: ${duration}. (Ajusta la cantidad de contenido para que quepa en este tiempo).
    - Tono: ${toneDesc}. USA VOCABULARIO Y EXPRESIONES DE MÉXICO ADECUADAS AL TONO.
    
    Tu tarea es generar OPCIONES MÚLTIPLES para completar el guion.
    Para cada sección (Relevancia, Cuerpo, CTA) debes generar 5 propuestas distintas.
    
    IMPORTANTE: Para CADA opción, debes incluir una sugerencia VISUAL detallada (B-Roll, acción en cámara, texto en pantalla).
    
    Estructura obligatoria:
    - FASE B: LA RELEVANCIA. 5 Variaciones (Texto + Visual). Fórmula: "El problema es que la mayoría cree [X], pero..." (Adaptado al tono mexicano).
    - FASE C: EL VALOR. 5 Variaciones del cuerpo del guion. Cada variación tiene varios pasos. Cada paso tiene instrucción y VISUAL.
    - FASE D: EL CTA. 5 Variaciones de llamada a la acción (Texto + Visual).
    
    Tono: ${toneDesc}.
  `;

  const tools = useSearch ? [{ googleSearch: {} }] : undefined;

  const config: any = {
    tools: tools,
  };

  if (useSearch) {
     systemPrompt += `\n\nIMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido. No incluyas texto antes ni después. La estructura debe ser:
    {
      "relevanceOptions": [{ "text": "string", "visual": "string" }, ...],
      "bodyOptions": [
        [ { "instruction": "string", "visual": "string", "reset": "string" }, ... ], 
        ... (5 variaciones de cuerpos)
      ],
      "ctaOptions": [{ "text": "string", "visual": "string" }, ...]
    }`;
    config.systemInstruction = systemPrompt;
  } else {
    config.systemInstruction = systemPrompt;
    config.responseMimeType = "application/json";
    config.responseSchema = bodySchema;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Idea Original: ${idea}. Gancho Seleccionado: ${selectedHook.text} (${selectedHook.type})`,
      config: config,
    });

    if (response.text) {
      return parseJSON(response.text) as ScriptContent;
    }
    throw new Error("No script body generated");
  } catch (error) {
    console.error("Error generating script body:", error);
    throw error;
  }
};

export const transcribeAudio = async (audioBase64: string): Promise<string> => {
  const ai = getClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'audio/wav', data: audioBase64 } },
          { text: "Transcribe el audio exactamente como se habla (probablemente en Español de México)." }
        ]
      }
    });
    return response.text || "";
  } catch (error) {
    console.error("Transcription error:", error);
    return "";
  }
};

export const generateSpeech = async (text: string): Promise<AudioBuffer | null> => {
    const ai = getClient();
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) return null;

        const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
             bytes[i] = binaryString.charCodeAt(i);
        }
        
        return await outputAudioContext.decodeAudioData(bytes.buffer);

    } catch (error) {
        console.error("TTS Error:", error);
        return null;
    }
};

export const sendChatMessage = async (history: {role: string, parts: {text: string}[]}[], message: string) => {
    const ai = getClient();
    const chat = ai.chats.create({
        model: 'gemini-3-pro-preview',
        history: history,
        config: {
            systemInstruction: "Eres un asistente creativo útil que ayuda a un creador de contenido a refinar sus guiones de video. Habla siempre en Español de México."
        }
    });
    
    const result = await chat.sendMessage({ message });
    return result.text;
}