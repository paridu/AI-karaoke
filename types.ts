export interface Song {
  id: string;
  title: string;
  artist: string;
  thumbnailUrl: string;
  videoId: string; // YouTube Video ID
  duration: string;
  addedBy: string;
}

export enum IntentType {
  PLAY = 'PLAY',
  QUEUE = 'QUEUE',
  SKIP = 'SKIP',
  PAUSE = 'PAUSE',
  RESUME = 'RESUME',
  UNKNOWN = 'UNKNOWN',
  RECOMMEND = 'RECOMMEND'
}

export interface AiIntent {
  intent: IntentType;
  song?: string;
  artist?: string;
  mood?: string;
  genre?: string;
  confidence?: number;
}

export interface PlayerState {
  isPlaying: boolean;
  currentSong: Song | null;
  volume: number;
}

// Type definition for Web Speech API which is not always present in default TS lib
export interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}
