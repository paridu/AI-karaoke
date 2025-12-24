import React from 'react';

interface MarqueeProps {
  text: string;
}

const Marquee: React.FC<MarqueeProps> = ({ text }) => {
  return (
    <div className="w-full bg-black/90 border-t border-purple-500/50 overflow-hidden py-3 absolute bottom-0 left-0 z-40 backdrop-blur-xl shadow-[0_-5px_20px_rgba(168,85,247,0.2)]">
      <div className="whitespace-nowrap animate-marquee inline-block text-purple-100 font-mono text-xl tracking-wider">
        {text}
      </div>
    </div>
  );
};

export default Marquee;