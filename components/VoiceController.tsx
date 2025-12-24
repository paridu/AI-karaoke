import React, { useState, useEffect, useCallback, useRef } from 'react';
import { IWindow } from '../types';
import { WAKE_WORD } from '../constants';

interface VoiceControllerProps {
  onCommand: (text: string) => void;
  isProcessing: boolean;
}

const VoiceController: React.FC<VoiceControllerProps> = ({ onCommand, isProcessing }) => {
  const [isListening, setIsListening] = useState(false); // Hardware microphone state
  const [isAwake, setIsAwake] = useState(false);       // Logic state (Wake word detected)
  const [transcript, setTranscript] = useState('');
  
  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);
  const awakeTimeoutRef = useRef<any>(null);

  const resetAwakeTimer = useCallback(() => {
    if (awakeTimeoutRef.current) clearTimeout(awakeTimeoutRef.current);
    // Go back to sleep after 8 seconds of silence
    awakeTimeoutRef.current = setTimeout(() => {
      setIsAwake(false);
      setTranscript('');
    }, 8000);
  }, []);

  const handleResult = useCallback((text: string, isFinal: boolean) => {
    const cleanText = text.trim();
    if (!cleanText) return;

    // Regex to find Wake Word (handles accidental spaces like "บัก หล่า")
    const wakeWordRegex = new RegExp(`${WAKE_WORD.replace(/\s+/g, '\\s*')}`, 'i');
    
    // CASE 1: NOT AWAKE (Standby Mode)
    if (!shouldListenRef.current && !isAwake) { // Check !isAwake from state implies using Ref or current logic scope
       // We need to check the 'cleanText' for the wake word
       if (wakeWordRegex.test(cleanText)) {
          console.log("Wake word detected!");
          setIsAwake(true);
          resetAwakeTimer();

          // Remove wake word from text to see if there is a command immediately following
          // e.g., "บักหล่าขอเพลง..."
          const commandPart = cleanText.replace(wakeWordRegex, '').trim();
          
          if (commandPart.length > 2 && isFinal) {
             // Command came in the same breath
             onCommand(commandPart);
             // We stay awake briefly in case they add more, or we can choose to sleep. 
             // Let's keep awake for follow-up or auto-sleep via timer.
             setTranscript(`(รับคำสั่ง: ${commandPart})`);
          } else {
             // Just woke up
             setTranscript('ครับ?');
          }
       }
    } 
    // CASE 2: AWAKE (Active Mode)
    else if (isAwake) {
      resetAwakeTimer(); // Keep awake while talking

      // Check if user said wake word AGAIN, just ignore it or treat as start of new command
      const commandPart = cleanText.replace(wakeWordRegex, '').trim();

      if (isFinal && commandPart.length > 0) {
        onCommand(commandPart);
        // Optional: Go back to sleep immediately after a successful command?
        // Or stay awake for multi-turn? Let's stay awake until timeout.
        setTranscript(''); 
      } else {
        setTranscript(commandPart);
      }
    }
  }, [isAwake, onCommand, resetAwakeTimer]);

  // Sync ref with state for use inside closure if needed (though we use functional updates mostly)
  // We use a separate useEffect for the recognition setup to avoid restarting on every state change

  useEffect(() => {
    const win = window as unknown as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (SpeechRecognition) {
      const reco = new SpeechRecognition();
      reco.continuous = true;
      reco.interimResults = true;
      reco.lang = 'th-TH';

      reco.onstart = () => setIsListening(true);
      
      reco.onend = () => {
        setIsListening(false);
        // Always restart to keep "Standby" active
        if (shouldListenRef.current) {
           setTimeout(() => {
               try {
                 reco.start();
               } catch (e) {
                 console.warn("Speech recognition restart failed", e);
               }
           }, 500);
        }
      };

      reco.onresult = (event: any) => {
        // We only care about the *latest* result in continuous mode
        const resultIndex = event.resultIndex;
        const result = event.results[resultIndex];
        const text = result[0].transcript;
        const isFinal = result.isFinal;
        
        // We need to pass the current 'isAwake' state into the handler.
        // Since this closure is created once, we need a way to access current state.
        // Best way inside this complex useEffect is to rely on the Ref or update logic.
        // BUT, to keep it simple, we will move the logic *inside* here using the setState callback 
        // or just let the component re-render.
        // Actually, re-binding 'onresult' is expensive. 
        // Let's dispatch a custom event or use a ref for 'isAwake'.
      };

      recognitionRef.current = reco;
    }
  }, []); // Empty dependency to init once

  // We need to update the onresult handler when isAwake changes, 
  // OR use a Ref for isAwake so the closure always sees current value.
  const isAwakeRef = useRef(isAwake);
  useEffect(() => { isAwakeRef.current = isAwake; }, [isAwake]);

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onresult = (event: any) => {
        const resultIndex = event.resultIndex;
        const result = event.results[resultIndex];
        const text = result[0].transcript;
        const isFinal = result.isFinal;

        const cleanText = text.trim();
        const wakeWordRegex = new RegExp(`${WAKE_WORD.replace(/\s+/g, '\\s*')}`, 'i');
        
        // LOGIC USING REF
        if (!isAwakeRef.current) {
            // STANDBY MODE
            if (wakeWordRegex.test(cleanText)) {
                setIsAwake(true);
                resetAwakeTimer();
                
                // Check if command is included
                const commandPart = cleanText.replace(wakeWordRegex, '').trim();
                if (isFinal && commandPart.length > 1) {
                    onCommand(commandPart);
                } else {
                    setTranscript('ครับ?'); // Acknowledge wake word
                }
            } else {
                // Ignore text, maybe show dim debug text
                // setTranscript(cleanText); // Optional: show what is being ignored
            }
        } else {
            // AWAKE MODE
            resetAwakeTimer();
            // If user says wake word again, just strip it
            const commandPart = cleanText.replace(wakeWordRegex, '').trim();
            
            if (isFinal && commandPart.length > 0) {
                onCommand(commandPart);
                setTranscript('');
            } else {
                setTranscript(commandPart);
            }
        }
      };
    }
  }, [onCommand, resetAwakeTimer]); // Update handler when dependencies change

  const toggleSystem = useCallback(() => {
    if (!recognitionRef.current) return;
    
    if (shouldListenRef.current) {
      // Turn off completely
      shouldListenRef.current = false;
      recognitionRef.current.stop();
      setIsAwake(false);
      if (awakeTimeoutRef.current) clearTimeout(awakeTimeoutRef.current);
    } else {
      // Turn on (Enter Standby)
      shouldListenRef.current = true;
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Start error", e);
      }
    }
  }, []);

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4 pointer-events-none">
      <div className="pointer-events-auto">
        
        {/* Transcript / Status Bubble */}
        {(transcript || isProcessing || isAwake) && (
            <div className="mb-4 text-center">
                <div className={`inline-block px-6 py-3 rounded-2xl border shadow-2xl transition-all duration-300 max-w-[90vw] truncate ${
                    isProcessing 
                        ? 'bg-purple-900/90 border-purple-400 text-white' 
                        : isAwake 
                            ? 'bg-green-900/90 border-green-400 text-green-100' 
                            : 'bg-black/60 border-slate-600 text-slate-400'
                }`}>
                    <p className="text-lg font-medium">
                        {isProcessing 
                            ? "กำลังประมวลผล..." 
                            : transcript || (isAwake ? "รับฟังคำสั่ง..." : "...")}
                    </p>
                </div>
            </div>
        )}

        {/* Main Button (Toggle System On/Off) */}
        <button
            onClick={toggleSystem}
            className={`w-full h-16 rounded-full flex items-center justify-center gap-4 transition-all duration-500 shadow-2xl backdrop-blur-md border-2 ${
            shouldListenRef.current
                ? isAwake 
                    ? 'bg-green-600/90 shadow-[0_0_40px_rgba(34,197,94,0.6)] border-green-400 scale-105' // Awake
                    : 'bg-yellow-600/80 shadow-[0_0_20px_rgba(202,138,4,0.4)] border-yellow-400'    // Standby
                : 'bg-slate-800/90 border-slate-600 hover:bg-slate-700'                              // Off
            }`}
        >
            {isProcessing ? (
                <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : (
                <>
                    <div className={`p-3 rounded-full transition-all duration-500 ${
                        shouldListenRef.current 
                            ? isAwake ? 'bg-white/20 animate-pulse' : 'bg-black/20'
                            : 'bg-white/5'
                    }`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                    </div>
                    <span className="font-bold text-xl tracking-wide text-white">
                        {shouldListenRef.current 
                            ? (isAwake ? "พูดได้เลย!" : `เรียก "${WAKE_WORD}"...`) 
                            : "แตะเพื่อเปิดระบบ"}
                    </span>
                </>
            )}
        </button>

      </div>
    </div>
  );
};

export default VoiceController;