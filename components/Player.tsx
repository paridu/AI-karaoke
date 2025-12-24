import React, { useEffect, useRef, useState } from 'react';
import { Song } from '../types';

interface PlayerProps {
  currentSong: Song | null;
  isPlaying: boolean;
  volume: number;
  onEnded: () => void;
  onTogglePlay: () => void;
  onSkip: () => void;
  showControls: boolean;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

const Player: React.FC<PlayerProps> = ({ 
  currentSong, 
  isPlaying, 
  volume, 
  onEnded, 
  onTogglePlay, 
  onSkip, 
  showControls 
}) => {
  const playerRef = useRef<any>(null);
  const isReadyRef = useRef(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load YouTube API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Initialize or Update Player when currentSong changes
  useEffect(() => {
    // Reset error on new song
    setErrorMsg(null);

    if (!currentSong) {
        if (playerRef.current) {
            try {
                playerRef.current.destroy();
            } catch (e) {
                console.warn("Error destroying player", e);
            }
            playerRef.current = null;
        }
        return;
    }

    const initPlayer = () => {
      // If player exists, just load the new video
      if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
        playerRef.current.loadVideoById(currentSong.videoId);
        return;
      }

      // Initialize new player
      if (window.YT && window.YT.Player) {
        playerRef.current = new window.YT.Player('youtube-player', {
          height: '100%',
          width: '100%',
          videoId: currentSong.videoId,
          host: 'https://www.youtube.com', // Explicit host
          playerVars: {
            autoplay: 1,
            controls: 0,
            modestbranding: 1,
            rel: 0,
            enablejsapi: 1,
            fs: 0, 
            iv_load_policy: 3, 
            disablekb: 1,
            origin: window.location.origin
          },
          events: {
            onReady: (event: any) => {
              isReadyRef.current = true;
              event.target.setVolume(volume);
              if (isPlaying) {
                  event.target.playVideo();
              }
            },
            onStateChange: (event: any) => {
              // YT.PlayerState.ENDED is 0
              if (event.data === 0) {
                onEnded();
              }
            },
            onError: (event: any) => {
              console.error("YouTube Player Error:", event.data);
              let msg = "Playback Error.";
              const code = event.data;
              
              // 150/153: Restricted from embedded playback
              // 5: HTML5 Player error
              // 100: Video not found
              // 101: Same as 150
              if ([5, 100, 101, 150, 153].includes(code)) {
                 msg = `Video Unavailable (${code}). Skipping...`;
              }
              
              setErrorMsg(msg);
              
              // Graceful skip
              setTimeout(() => {
                 onEnded();
                 setErrorMsg(null);
              }, 2000);
            }
          }
        });
      }
    };

    // Check availability
    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      // Poll for API
      const interval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          initPlayer();
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [currentSong?.videoId, onEnded]); 

  // Sync Play/Pause state
  useEffect(() => {
    if (playerRef.current && isReadyRef.current && typeof playerRef.current.playVideo === 'function' && !errorMsg) {
      if (isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    }
  }, [isPlaying, errorMsg]);

  // Sync Volume
  useEffect(() => {
    if (playerRef.current && isReadyRef.current && typeof playerRef.current.setVolume === 'function') {
      playerRef.current.setVolume(volume);
    }
  }, [volume]);

  const renderVideoContent = () => {
    if (errorMsg) {
      return (
        <div className="relative w-full aspect-video bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border-2 border-red-500/30 flex items-center justify-center">
             <div className="text-center p-6 animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                <h3 className="text-2xl font-bold text-red-100">{errorMsg}</h3>
                <p className="text-red-300 mt-2">กำลังเปลี่ยนเพลงถัดไป...</p>
             </div>
        </div>
      );
    }

    if (!currentSong) {
      return (
        <div className="aspect-video w-full bg-slate-900 rounded-2xl border-2 border-slate-700 flex flex-col items-center justify-center text-slate-500 shadow-2xl">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <p className="text-xl font-medium">ไม่มีเพลงที่กำลังเล่น</p>
          <p className="text-sm mt-2">ลองสั่งว่า "เปิดเพลง คุกเข่า ของ Cocktail"</p>
        </div>
      );
    }

    return (
      <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700 ring-4 ring-purple-500/20">
        <div id="youtube-player" className="w-full h-full"></div>
        <div className="absolute inset-0 pointer-events-none"></div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* Video Area */}
      {renderVideoContent()}

      {/* Controls & Info Area (Visible only if showControls is true and song exists) */}
      {showControls && currentSong && !errorMsg && (
        <div className="flex items-center justify-between px-2">
          <div className="flex-1 min-w-0 mr-4">
            <h2 className="text-2xl font-bold truncate text-white brand-font">
              {currentSong.title}
            </h2>
            <p className="text-lg text-purple-300 truncate">
              {currentSong.artist}
            </p>
            {/* Duration Display */}
            <div className="flex items-center gap-2 mt-1 text-slate-400 font-mono text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{currentSong.duration}</span>
            </div>
          </div>

          <div className="flex gap-3 items-center shrink-0">
            <button 
              onClick={onTogglePlay} 
              className="p-4 rounded-full bg-slate-800 hover:bg-slate-700 hover:text-purple-400 transition-all border border-slate-700 shadow-lg"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            <button 
              onClick={onSkip} 
              className="p-4 rounded-full bg-slate-800 hover:bg-slate-700 hover:text-purple-400 transition-all border border-slate-700 shadow-lg"
              aria-label="Skip"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798l-5.445-3.63z" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      {/* Placeholder for controls when no song or error to keep layout stable, or custom message */}
      {showControls && (!currentSong || errorMsg) && (
        <div className="h-[88px] flex items-center justify-center text-slate-600">
           <span className="text-sm">Ready to play</span>
        </div>
      )}
    </div>
  );
};

export default Player;