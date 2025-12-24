import React, { useState, useEffect, useCallback } from 'react';
import { Song, IntentType, AiIntent } from './types';
import { MOCK_SONGS, APP_NAME, WAKE_WORD } from './constants';
import { parseVoiceCommand, searchSongWithAI, getRecommendation, announceWithAI } from './services/geminiService';
import Player from './components/Player';
import QueueList from './components/QueueList';
import VoiceController from './components/VoiceController';
import Visualizer from './components/Visualizer';
import Marquee from './components/Marquee';

const App: React.FC = () => {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [queue, setQueue] = useState<Song[]>(MOCK_SONGS);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastAction, setLastAction] = useState<string>("พร้อมร้องคาราโอเกะแล้ว!");
  
  // Options / Settings
  const [volume, setVolume] = useState(100);
  const [cinemaMode, setCinemaMode] = useState(false);
  const [showQr, setShowQr] = useState(false);

  // Queue Management
  const addToQueue = useCallback((song: Song) => {
    setQueue((prev) => [...prev, song]);
    setLastAction(`เพิ่ม ${song.title} ลงคิวแล้ว`);
    // Removed announceWithAI to save quota (Fix 429)
  }, []);

  const playNow = useCallback((song: Song) => {
    setCurrentSong(song);
    setIsPlaying(true);
    setLastAction(`กำลังเล่น ${song.title}`);
    // Removed announceWithAI to save quota (Fix 429)
  }, []);

  const playNext = useCallback(() => {
    if (queue.length > 0) {
      const nextSong = queue[0];
      setQueue((prev) => prev.slice(1));
      setCurrentSong(nextSong);
      setIsPlaying(true);
      setLastAction("กำลังเล่นเพลงถัดไป");
      // Removed announceWithAI to save quota (Fix 429)
    } else {
      setIsPlaying(false);
      setCurrentSong(null);
      setLastAction("หมดคิวแล้ว");
      // Removed announceWithAI to save quota (Fix 429)
    }
  }, [queue]);

  const removeFromQueue = useCallback((id: string) => {
    setQueue((prev) => prev.filter(s => s.id !== id));
  }, []);

  // AI Command Handler
  const handleVoiceCommand = async (text: string) => {
    setIsProcessing(true);
    setLastAction(`กำลังประมวลผล: "${text}"`);
    
    try {
      const result: AiIntent = await parseVoiceCommand(text);
      console.log("AI Intent:", result);

      switch (result.intent) {
        case IntentType.PLAY:
        case IntentType.QUEUE:
          if (result.song) {
            // Find song data
            const songData = await searchSongWithAI(result.song, result.artist);
            
            // Check for search errors (Quota or Not Found)
            if (songData.videoId === "ERROR_QUOTA") {
               setLastAction("ระบบ AI ไม่ว่าง (Quota Exceeded)");
               break;
            }
            if (songData.videoId === "dQw4w9WgXcQ" && songData.title === "Unknown Song") {
               setLastAction("หาเพลงไม่เจอครับ");
               break;
            }

            const newSong: Song = {
              id: Date.now().toString(),
              title: songData.title,
              artist: songData.artist,
              thumbnailUrl: songData.thumbnail,
              videoId: songData.videoId,
              duration: songData.duration, // Fetched duration
              addedBy: "ผู้ใช้งาน"
            };

            if (result.intent === IntentType.PLAY || (!currentSong && queue.length === 0)) {
              playNow(newSong);
            } else {
              addToQueue(newSong);
            }
          } else {
             // Optional: Lightweight text response instead of Audio
             setLastAction("ขอชื่อเพลงอีกครั้งครับ");
          }
          break;

        case IntentType.SKIP:
          playNext();
          setLastAction("กำลังข้ามเพลง...");
          break;

        case IntentType.PAUSE:
          setIsPlaying(false);
          setLastAction("หยุดชั่วคราว");
          break;

        case IntentType.RESUME:
          if (currentSong) setIsPlaying(true);
          setLastAction("เล่นต่อ");
          break;
        
        case IntentType.RECOMMEND:
          if (result.mood) {
             const rec = await getRecommendation(result.mood);
             const songData = await searchSongWithAI(rec.title, rec.artist);
             if (songData.videoId !== "ERROR_QUOTA") {
                const newSong: Song = {
                  id: Date.now().toString(),
                  title: songData.title,
                  artist: songData.artist,
                  thumbnailUrl: songData.thumbnail,
                  videoId: songData.videoId,
                  duration: songData.duration,
                  addedBy: "AI แนะนำ"
                };
                addToQueue(newSong);
                setLastAction(`AI แนะนำ: ${rec.title}`);
             } else {
                setLastAction("AI ไม่สามารถแนะนำได้ขณะนี้");
             }
          }
          break;

        default:
          setLastAction("ฟังไม่ทัน ลองใหม่อีกครั้งนะ");
      }
    } catch (error) {
      setLastAction("เกิดข้อผิดพลาดในการประมวลผลคำสั่ง");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate Marquee Text
  const marqueeText = `🎵 Now Playing: ${currentSong ? currentSong.title + " - " + currentSong.artist : "Waiting for song..."}   |   Next: ${queue.length > 0 ? queue[0].title : "-"}   |   🎤 Commands: "เปิดเพลง [ชื่อเพลง]", "ต่อคิว", "ข้าม", "ขอเพลง [อารมณ์]"   |   🔊 Wake Word: "${WAKE_WORD}" 🎵`.repeat(3);

  return (
    <div className={`min-h-screen bg-slate-900 text-white overflow-hidden relative selection:bg-pink-500 selection:text-white ${cinemaMode ? 'cursor-none' : ''}`}>
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-600/20 rounded-full blur-[120px]"></div>
      </div>

      {/* QR Code Modal (Simulated Mobile Remote) */}
      {showQr && (
          <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowQr(false)}>
              <div className="bg-slate-800 p-8 rounded-3xl border border-purple-500/50 shadow-[0_0_50px_rgba(168,85,247,0.4)] text-center max-w-sm w-full animate-fade-in-up" onClick={e => e.stopPropagation()}>
                  <h3 className="text-2xl font-bold mb-2 brand-font text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Join Party</h3>
                  <p className="text-slate-400 mb-6">Scan to control via Mobile</p>
                  <div className="relative w-48 h-48 mx-auto mb-6 bg-white p-2 rounded-xl overflow-hidden">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.href)}`} 
                        alt="QR Code" 
                        className="w-full h-full object-contain"
                      />
                      <div className="scanline pointer-events-none"></div>
                  </div>
                  <button onClick={() => setShowQr(false)} className="w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 transition-colors font-semibold">
                      Close
                  </button>
              </div>
          </div>
      )}

      {/* Main Container */}
      <div className={`relative z-10 transition-all duration-500 ease-in-out h-screen flex flex-col ${cinemaMode ? 'p-0' : 'max-w-7xl mx-auto px-4 py-6 gap-6'}`}>
        
        {/* Header (Hidden in Cinema Mode) */}
        {!cinemaMode && (
          <header className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg neon-glow">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
               </div>
               <div>
                 <h1 className="text-2xl font-bold tracking-tight brand-font">{APP_NAME}</h1>
               </div>
            </div>
            
            {/* Top Toolbar */}
            <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-2 bg-slate-800/50 p-2 rounded-lg border border-slate-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                    <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={volume} 
                        onChange={(e) => setVolume(Number(e.target.value))}
                        className="w-24 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                </div>

                <button 
                    onClick={() => setShowQr(true)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 transition-colors text-sm"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4h2v-4zM6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="hidden sm:inline">Remote</span>
                </button>

                <button 
                    onClick={() => setCinemaMode(true)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 transition-colors text-sm font-semibold shadow-lg shadow-purple-900/50"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                    <span>Cinema Mode</span>
                </button>
            </div>
          </header>
        )}

        {/* Main Content */}
        <main className={`flex-1 grid gap-6 min-h-0 ${cinemaMode ? 'grid-cols-1 h-full' : 'grid-cols-1 lg:grid-cols-3'}`}>
          
          {/* Player Section */}
          <section className={`flex flex-col gap-4 ${cinemaMode ? 'h-full justify-center relative' : 'lg:col-span-2'}`}>
            <div className={`${cinemaMode ? 'absolute inset-0 z-0' : ''}`}>
                <Player 
                  currentSong={currentSong} 
                  isPlaying={isPlaying} 
                  volume={volume}
                  onEnded={playNext} 
                  onTogglePlay={() => setIsPlaying(!isPlaying)}
                  onSkip={playNext}
                  showControls={!cinemaMode}
                />
            </div>

            {/* Cinema Exit Button (Only visible in Cinema Mode on Hover) */}
            {cinemaMode && (
                <button 
                    onClick={() => setCinemaMode(false)}
                    className="absolute top-4 right-4 z-50 p-2 bg-black/50 text-white rounded-full hover:bg-white/20 transition-colors opacity-0 hover:opacity-100"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
            
            {/* Visualizer (Hidden in Cinema Mode) */}
            {!cinemaMode && (
                <Visualizer isPlaying={isPlaying} />
            )}
          </section>

          {/* Queue Section (Hidden in Cinema Mode) */}
          {!cinemaMode && (
            <section className="lg:col-span-1 min-h-[300px]">
                <QueueList queue={queue} onRemove={removeFromQueue} />
            </section>
          )}

        </main>
      </div>

      {/* Marquee (Always Visible at bottom) */}
      <Marquee text={marqueeText} />

      {/* Floating Voice Control */}
      <div className={`transition-all duration-300 ${cinemaMode ? 'opacity-50 hover:opacity-100' : ''}`}>
         <VoiceController onCommand={handleVoiceCommand} isProcessing={isProcessing} />
      </div>
      
    </div>
  );
};

export default App;