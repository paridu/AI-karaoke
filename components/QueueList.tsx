import React from 'react';
import { Song } from '../types';

interface QueueListProps {
  queue: Song[];
  onRemove: (id: string) => void;
}

const QueueList: React.FC<QueueListProps> = ({ queue, onRemove }) => {
  return (
    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 backdrop-blur-md h-full flex flex-col">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-pink-400 brand-font">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
        </svg>
        คิวเพลงถัดไป
        <span className="bg-slate-700 text-xs px-2 py-0.5 rounded-full text-white ml-auto">
            {queue.length}
        </span>
      </h3>
      
      <div className="space-y-3 overflow-y-auto flex-1 pr-2 max-h-[400px]">
        {queue.length === 0 ? (
          <div className="text-center text-slate-500 py-10">
            <p>คิวว่างเปล่า</p>
            <p className="text-sm mt-2">ลองพูดว่า "จองเพลง ศรัทธา หิน เหล็ก ไฟ"</p>
          </div>
        ) : (
          queue.map((song, index) => (
            <div 
              key={song.id} 
              className="group flex items-center gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-700 hover:border-purple-500/50 transition-colors"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-400">
                {index + 1}
              </div>
              <img src={song.thumbnailUrl} alt={song.title} className="w-12 h-9 object-cover rounded shadow-sm opacity-80" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate text-white">{song.title}</p>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="truncate max-w-[120px]">{song.artist}</span>
                  <span className="text-slate-600">•</span>
                  <span className="font-mono opacity-70">{song.duration}</span>
                </div>
              </div>
              <button 
                onClick={() => onRemove(song.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-red-400 transition-opacity"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default QueueList;