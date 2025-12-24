import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  isPlaying: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const bars = 30;
    const barWidth = canvas.width / bars;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#a78bfa'); // purple-400
      gradient.addColorStop(1, '#ec4899'); // pink-500

      ctx.fillStyle = gradient;

      for (let i = 0; i < bars; i++) {
        // Simulate frequency data
        const height = isPlaying 
          ? Math.random() * canvas.height * 0.8 + 10 
          : 5;
        
        const x = i * barWidth;
        const y = canvas.height - height;
        
        // Rounded tops
        ctx.beginPath();
        ctx.roundRect(x + 2, y, barWidth - 4, height, [4, 4, 0, 0]);
        ctx.fill();
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, [isPlaying]);

  return (
    <div className="w-full h-32 bg-slate-900/50 rounded-xl overflow-hidden border border-slate-700 backdrop-blur-sm">
      <canvas 
        ref={canvasRef} 
        width={600} 
        height={128} 
        className="w-full h-full"
      />
    </div>
  );
};

export default Visualizer;
