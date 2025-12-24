import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { AiIntent, IntentType } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const intentSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    intent: {
      type: Type.STRING,
      enum: [
        IntentType.PLAY,
        IntentType.QUEUE,
        IntentType.SKIP,
        IntentType.PAUSE,
        IntentType.RESUME,
        IntentType.RECOMMEND,
        IntentType.UNKNOWN
      ],
      description: "The action the user wants to perform."
    },
    song: {
      type: Type.STRING,
      description: "The name of the song mentioned."
    },
    artist: {
      type: Type.STRING,
      description: "The name of the artist mentioned."
    },
    mood: {
      type: Type.STRING,
      description: "The mood requested."
    }
  },
  required: ["intent"]
};

// 1. Parse Command (Reasoning)
export const parseVoiceCommand = async (transcript: string): Promise<AiIntent> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: transcript,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: intentSchema,
        thinkingConfig: { thinkingBudget: 0 } 
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as AiIntent;
  } catch (error: any) {
    console.error("Error parsing voice command:", error);
    // Handle Quota/Server errors gracefully
    if (error.message?.includes('429') || error.message?.includes('500')) {
      console.warn("AI Service Unavailable (Quota/Net)");
    }
    return { intent: IntentType.UNKNOWN };
  }
};

// 2. Search Logic (Grounding)
export const searchSongWithAI = async (query: string, artist?: string): Promise<{ title: string, artist: string, videoId: string, thumbnail: string, duration: string }> => {
  try {
    // We use Google Search to find the ACTUAL video ID
    // UPDATED PROMPT: Aggressively avoid Error 150/153 by filtering official videos
    const searchPrompt = `
      Find a YouTube video for the **KARAOKE** version of the song "${query}" ${artist ? `by ${artist}` : ''}.
      
      CRITICAL RULE: You MUST AVOID "Official Music Videos" (MV), "VEVO", "Topic" channels because they block embedding (Error 150).
      
      SEARCH STRATEGY:
      - Search for: "${query} ${artist || ''} karaoke lyrics -official -mv -vevo"
      - Search for: "${query} ${artist || ''} backing track -official"
      
      SELECTION CRITERIA:
      1. **SAFE CHANNELS** (Prioritize these): "KaraFun", "Sing King", "Clean Karaoke", "GMM Karaoke", "RS Karaoke", "Preecha P.", "Theneung", "Acoustic Karaoke".
      2. **BAD CHANNELS** (Strictly Reject): "VEVO", "Official", "ArtistNameVEVO", "Warner Music", "Sony Music", "Topic".
      3. **CONTENT**: Must be a lyric video or instrumental. 
      
      Return a JSON object:
      {
        "title": "Song Title (Karaoke Version)",
        "artist": "Artist Name",
        "videoId": "The extracted 11-character YouTube ID",
        "duration": "mm:ss"
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: searchPrompt,
      config: {
        tools: [{ googleSearch: {} }], // Enable Google Search
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            artist: { type: Type.STRING },
            videoId: { type: Type.STRING },
            duration: { type: Type.STRING }
          }
        }
      }
    });

    const text = response.text;
    if (text) {
      const data = JSON.parse(text);
      
      // Basic validation of videoId length (YouTube IDs are 11 chars)
      const validId = data.videoId && data.videoId.length === 11 ? data.videoId : "dQw4w9WgXcQ";

      return {
        title: data.title || query,
        artist: data.artist || artist || "Unknown Artist",
        videoId: validId,
        thumbnail: `https://img.youtube.com/vi/${validId}/mqdefault.jpg`,
        duration: data.duration || "3:30"
      };
    }
  } catch (error: any) {
    console.error("Search Grounding failed", error);
    if (error.message?.includes('429') || error.message?.includes('500') || error.status === 'RESOURCE_EXHAUSTED') {
       // Return specific error ID to be handled by UI
       return {
         title: "AI Service Busy",
         artist: "Please try again",
         videoId: "ERROR_QUOTA",
         thumbnail: "",
         duration: "0:00"
       };
    }
  }

  // Fallback if search fails completely
  return {
    title: query || "Unknown Song",
    artist: artist || "Unknown Artist",
    videoId: "dQw4w9WgXcQ", 
    thumbnail: `https://picsum.photos/seed/${query}/300/200`,
    duration: "0:00"
  };
};

// 3. Recommendation Logic
export const getRecommendation = async (mood: string): Promise<{ title: string, artist: string }> => {
   try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Recommend a very popular karaoke song in Thailand for the mood: "${mood}". Return JSON {title, artist}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
             title: { type: Type.STRING },
             artist: { type: Type.STRING }
          }
        }
      }
    });
    
    const text = response.text;
    if(!text) return { title: "Bohemian Rhapsody", artist: "Queen" };
    return JSON.parse(text);

   } catch (e) {
     return { title: "Lao Duang Duen", artist: "Thai Classic" };
   }
};

// 4. TTS Logic (DJ Announcer)
export const announceWithAI = async (text: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: {
        parts: [{ text: text }]
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' } // 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
          }
        }
      }
    });

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (audioData) {
      playAudio(audioData);
    }
  } catch (error: any) {
    // Fail silently for TTS to avoid disrupting user experience
    console.warn("TTS Failed (likely quota/net)", error.message || error);
  }
};

// Helper to decode and play raw PCM audio from Gemini
const playAudio = async (base64String: string) => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    // Decode base64 to binary
    const binaryString = atob(base64String);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Convert to Int16 PCM (Gemini format) -> Float32 for AudioContext
    const dataInt16 = new Int16Array(bytes.buffer);
    const float32Data = new Float32Array(dataInt16.length);
    for (let i = 0; i < dataInt16.length; i++) {
      float32Data[i] = dataInt16[i] / 32768.0;
    }

    const buffer = audioContext.createBuffer(1, float32Data.length, 24000);
    buffer.copyToChannel(float32Data, 0);

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
  } catch (e) {
    console.error("Audio Playback Error", e);
  }
};